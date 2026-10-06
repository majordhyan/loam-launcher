use crate::{model::*, network, storage};
use serde_json::{json, Value};
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
};
const MAX: u64 = 8 * 1024 * 1024 * 1024;
const LAUNCHER_DATA: [&str; 6] = [
    "saves",
    "mods",
    "resourcepacks",
    "shaderpacks",
    "options.txt",
    "servers.dat",
];
fn folder_inventory(path: &Path) -> Result<(String, u64, usize)> {
    use sha2::{Digest, Sha256};
    let mut rows = Vec::new();
    let mut total = 0u64;
    for name in LAUNCHER_DATA {
        let root = path.join(name);
        if !root.exists() {
            continue;
        }
        storage::no_links(&root)?;
        for e in walkdir::WalkDir::new(&root).follow_links(false) {
            let e = e.map_err(|e| e.to_string())?;
            storage::no_links(e.path())?;
            if e.file_type().is_file() {
                let size = e.metadata().map_err(|e| e.to_string())?.len();
                total = total.checked_add(size).ok_or("Import size overflow")?;
                if total > MAX || rows.len() >= 50000 {
                    return Err(
                        "Folder import exceeds 8 GB or 50,000 files. Import smaller groups.".into(),
                    );
                }
                rows.push(format!(
                    "{}:{}:{}",
                    e.path()
                        .strip_prefix(path)
                        .map_err(|e| e.to_string())?
                        .display(),
                    size,
                    storage::hash(e.path(), "sha256")?
                ));
            }
        }
    }
    rows.sort();
    Ok((
        hex::encode(Sha256::digest(rows.join("\n").as_bytes())),
        total,
        rows.len(),
    ))
}
fn dependency_matches(spec: &Value, version: &str) -> bool {
    if let Some(s) = spec.as_str() {
        compatible(s, version)
    } else {
        spec.as_array()
            .is_some_and(|a| a.iter().any(|s| dependency_matches(s, version)))
    }
}
fn dependency_status(
    core: &Core,
    game: &Game,
    declared: &serde_json::Map<String, Value>,
) -> Result<Vec<String>> {
    let mut installed = std::collections::HashMap::<String, String>::new();
    installed.insert("minecraft".into(), game.version.clone());
    let quilt = game.loader.as_deref().is_some_and(|l| l.starts_with("quilt:"));
    if let Some(loader) = game.loader.as_deref().filter(|_| !quilt) {
        installed.insert("fabricloader".into(), loader.to_owned());
    }
    if let Ok(b) = fs::read(core.game_dir(&game.id)?.join("install.json")) {
        if let Ok(p) = serde_json::from_slice::<Value>(&b) {
            if let Some(java) = p["java"].as_u64() {
                installed.insert("java".into(), format!("{java}.0.0"));
            }
        }
    }
    if let Ok(entries) = fs::read_dir(core.game_dir(&game.id)?.join("mods")) {
        for e in entries {
            let e = e.map_err(|e| e.to_string())?;
            if e.path().extension().is_some_and(|x| x == "jar") {
                storage::no_links(&e.path())?;
                if let Ok((_, m)) = archive_meta(&e.path()) {
                    if let (Some(id), Some(version)) = (
                        m["fabric.mod.json"]["id"].as_str(),
                        m["fabric.mod.json"]["version"].as_str(),
                    ) {
                        installed.insert(id.into(), version.into());
                    }
                }
            }
        }
    }
    Ok(declared
        .iter()
        .map(|(id, spec)| match installed.get(id) {
            Some(version) if dependency_matches(spec, version) => {
                format!("PRESENT · {id} {version} (requires {spec})")
            }
            Some(version) => format!("CHECK REQUIRED · {id} {version} does not satisfy {spec}"),
            None if quilt && id == "fabricloader" => format!("PROVIDED BY QUILT · fabricloader {spec} (checked by Quilt at launch)"),
            None => format!("MISSING / UNVERIFIED · {id} requires {spec}"),
        })
        .collect())
}
pub(crate) fn archive_meta(path: &Path) -> Result<(Vec<String>, Value)> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    if file.metadata().map_err(|e| e.to_string())?.len() > MAX {
        return Err("Archive exceeds the 8 GB import limit.".into());
    }
    let mut zip =
        zip::ZipArchive::new(file).map_err(|_| "This is not a valid ZIP or JAR archive.")?;
    if zip.len() > 50000 {
        return Err("Too many archive entries.".into());
    }
    let mut names = vec![];
    let mut seen = std::collections::HashSet::new();
    let mut total = 0u64;
    let mut meta = json!({});
    for i in 0..zip.len() {
        let mut f = zip.by_index(i).map_err(|e| e.to_string())?;
        storage::safe_relative(f.name())?;
        if !seen.insert(
            storage::safe_relative(f.name())?
                .to_string_lossy()
                .to_lowercase(),
        ) {
            return Err("Archive contains duplicate paths.".into());
        }
        if f.unix_mode()
            .map(|m| m & 0o170000 == 0o120000)
            .unwrap_or(false)
        {
            return Err("Archive contains a symbolic link.".into());
        }
        total = total.checked_add(f.size()).ok_or("Archive size overflow")?;
        if total > MAX
            || f.size() > 2 * 1024 * 1024 * 1024
            || (f.compressed_size() > 0 && f.size() / f.compressed_size() > 1000)
        {
            return Err("Archive exceeds safety limits.".into());
        }
        names.push(f.name().replace('\\', "/"));
        if ["fabric.mod.json", "quilt.mod.json", "modrinth.index.json", "pack.mcmeta"].contains(&f.name()) {
            if f.size() > 1024 * 1024 {
                return Err("Archive metadata exceeds size limit.".into());
            }
            let name = f.name().to_owned();
            let mut s = String::new();
            f.by_ref()
                .take(1024 * 1024 + 1)
                .read_to_string(&mut s)
                .map_err(|e| e.to_string())?;
            if s.len() > 1024 * 1024 {
                return Err("Archive metadata exceeds size limit.".into());
            }
            meta[name] = serde_json::from_str::<Value>(&s)
                .map_err(|_| "Archive metadata is invalid JSON.")?;
        }
    }
    meta["expandedBytes"] = json!(total);
    Ok((names, meta))
}
pub fn inspect(core: &Core, id: &str, source: &str) -> Result<Value> {
    core.ensure_idle(id)?;
    let game = core.game(id)?;
    let p = PathBuf::from(source);
    storage::no_links(&p)?;
    if !p.exists() {
        return Err("The selected source no longer exists.".into());
    }
    let mut notes = vec![];
    let mut deps = vec![];
    let kind;
    let mut meta = json!({});
    let fingerprint;
    let import_bytes;
    let file_count;
    if p.is_dir() {
        kind = "launcher";
        let count = [
            "saves",
            "mods",
            "resourcepacks",
            "shaderpacks",
            "options.txt",
            "servers.dat",
        ]
        .iter()
        .filter(|name| p.join(name).exists())
        .count();
        if count == 0 {
            return Err("No supported game data was found in this folder.".into());
        }
        notes.push("Only saves, mods, resourcepacks, shaderpacks, options.txt and servers.dat are copied. Account and session files are never opened.".to_string());
        let mut source_versions = vec![];
        if let Ok(versions) = fs::read_dir(p.join("versions")) {
            for entry in versions.take(256).flatten() {
                let name = entry.file_name().to_string_lossy().into_owned();
                if storage::safe_relative(&name).is_err() {
                    continue;
                }
                let metadata = entry.path().join(format!("{name}.json"));
                storage::no_links(&metadata)?;
                if fs::metadata(&metadata)
                    .map(|m| m.len() <= 1024 * 1024)
                    .unwrap_or(false)
                {
                    if let Ok(b) = fs::read(metadata) {
                        if let Ok(v) = serde_json::from_slice::<Value>(&b) {
                            if v["id"] == name {
                                source_versions.push(name);
                            }
                        }
                    }
                }
            }
        }
        if source_versions.len() == 1 && source_versions[0] != game.version {
            return Err(format!("Source version {} differs from target {}. Create or choose a matching game before importing.",source_versions[0],game.version));
        }
        notes.push(if source_versions.len()==1 {format!("Version metadata matches {}.",game.version)}else{"Source game version could not be established uniquely. Confirm the selected game matches before importing worlds.".into()});
        let inventory = folder_inventory(&p)?;
        fingerprint = inventory.0;
        import_bytes = inventory.1;
        file_count = inventory.2;
    } else {
        let (names, m) = archive_meta(&p)?;
        file_count = names.len();
        import_bytes = m["expandedBytes"].as_u64().unwrap_or(0);
        meta = m;
        fingerprint = storage::hash(&p, "sha256")?;
        let detected = classify_names(&names, &meta)?;
        let fabric = detected == "mod";
        let pack = detected == "mrpack";
        let resource = detected == "resource";
        let shader = detected == "shader";
        let worlds: Vec<_> = names
            .iter()
            .filter(|n| n.as_str() == "level.dat" || n.ends_with("/level.dat"))
            .collect();
        if fabric {
            kind = "mod";
            if let Some(e) = target_error(&game, &meta, "mod") {
                return Err(format!("{e} Choose another game."));
            }
            if meta["fabric.mod.json"].is_null() {
                notes.push("Quilt mod. Quilt checks its dependencies when the game starts.".to_string());
            }
            if let Some(d) = meta["fabric.mod.json"]["depends"].as_object() {
                deps = dependency_status(core, &game, d)?;
                if let Some(v) = d.get("minecraft") {
                    if !dependency_matches(v, &game.version) {
                        return Err(format!(
                            "This mod requires Minecraft {v}; the selected game uses {}.",
                            game.version
                        ));
                    }
                }
            }
            notes.push("Declared dependencies are listed below. Missing mod dependencies are not installed automatically.".into());
        } else if pack {
            kind = "mrpack";
            let m = &meta["modrinth.index.json"];
            if m["formatVersion"] != 1 || m["game"] != "minecraft" {
                return Err("Unsupported Modrinth pack format.".into());
            }
            if m["dependencies"]["minecraft"] != game.version {
                return Err(
                    "Create a game with the Minecraft version declared by this pack.".into(),
                );
            }
            let d = m["dependencies"]
                .as_object()
                .ok_or("Pack dependencies are missing")?;
            if d.keys()
                .any(|k| !["minecraft", "fabric-loader"].contains(&k.as_str()))
            {
                return Err("This pack uses an unsupported loader.".into());
            }
            if m["dependencies"]["fabric-loader"].as_str() != game.loader.as_deref() {
                return Err("The pack's Fabric loader must exactly match the target game.".into());
            }
            for f in m["files"].as_array().ok_or("Pack file list missing")? {
                storage::safe_relative(f["path"].as_str().ok_or("Pack path missing")?)?;
                if !content_path(f["path"].as_str().unwrap()) {
                    return Err("Pack contains a path outside supported game content.".into());
                }
                if !f["downloads"]
                    .as_array()
                    .map(|a| a.iter().any(|v| v.as_str().map(pack_url).unwrap_or(false)))
                    .unwrap_or(false)
                {
                    return Err(
                        "Pack uses a download host outside the allowed Modrinth CDN.".into(),
                    );
                }
            }
            notes.push("Client-supported pack files and overrides will be copied. Optional client files are skipped.".into());
        } else if resource {
            kind = "resource";
            let client = core
                .root
                .join("cache/versions")
                .join(storage::safe_relative(&game.version)?)
                .join("client.jar");
            let target = (|| -> Option<u64> {
                let mut jar = zip::ZipArchive::new(fs::File::open(client).ok()?).ok()?;
                let f = jar.by_name("version.json").ok()?;
                let mut b = Vec::new();
                f.take(65537).read_to_end(&mut b).ok()?;
                if b.len() > 65536 {
                    return None;
                }
                let v: Value = serde_json::from_slice(&b).ok()?;
                v["pack_version"]["resource"]
                    .as_u64()
                    .or_else(|| v["pack_version"]["resource"]["major"].as_u64())
            })();
            let pack = &meta["pack.mcmeta"]["pack"];
            if let (Some(target), Some(format)) = (target, pack["pack_format"].as_u64()) {
                let range = &pack["supported_formats"];
                let min = range["min_inclusive"]
                    .as_u64()
                    .or_else(|| range[0].as_u64())
                    .or_else(|| range.as_u64())
                    .unwrap_or(format);
                let max = range["max_inclusive"]
                    .as_u64()
                    .or_else(|| range[1].as_u64())
                    .or_else(|| range.as_u64())
                    .unwrap_or(format);
                if target < min || target > max {
                    return Err(format!("Resource pack supports formats {min}–{max}; this game's official client requires {target}. Choose a compatible pack."));
                }
                notes.push(format!(
                    "Resource format {target} matches the installed official client."
                ));
            } else {
                notes.push("Resource-pack format compatibility is unverified for this metadata. Review its supported Minecraft versions before applying.".into());
            }
        } else if shader {
            kind = "shader";
            notes.push("A compatible shader renderer is required. Importing a shader does not install a renderer.".into());
        } else {
            kind = "world";
            if worlds.len() != 1 {
                return Err("Archive contains multiple worlds.".into());
            }
            meta["worldRoot"] = json!(worlds[0]
                .trim_end_matches("level.dat")
                .trim_end_matches('/'));
            notes.push("A copy is imported. Minecraft may upgrade the copied world when opened; the source stays untouched.".into());
        }
    }
    let current_bytes = content_bytes(&core.game_dir(id)?);
    let needed = import_bytes
        .saturating_mul(2)
        .saturating_add(current_bytes)
        .saturating_add(64 * 1024 * 1024);
    if storage::free_space(&core.root) < needed {
        return Err(format!(
            "Not enough disk space for staging and backup. Need {} MB.",
            needed / 1048576
        ));
    }
    let token = uuid::Uuid::new_v4().to_string();
    let plan = json!({"token":token,"gameId":id,"source":source,"filename":p.file_name().unwrap_or_default().to_string_lossy(),"kind":kind,"notes":notes,"dependencies":deps,"fingerprint":fingerprint,"meta":meta,"expandedBytes":import_bytes,"fileCount":file_count,"backup":"A verified backup of existing content is made before changes.","version":game.version,"loader":game.loader});
    core.pending.lock().unwrap().insert(token, plan.clone());
    Ok(plan)
}
/// Folder-safe world name; names like "Spawn: v2" no longer fail after review.
fn clean_name(raw: &str) -> String {
    let s: String = raw
        .chars()
        .map(|c| if c.is_control() || "<>:\"/\\|?*".contains(c) { '-' } else { c })
        .take(64)
        .collect();
    let s = s.trim_matches([' ', '.']).to_owned();
    if s.is_empty() || storage::safe_relative(&s).is_err() {
        "Imported world".into()
    } else {
        s
    }
}
fn content_bytes(dir: &Path) -> u64 {
    LAUNCHER_DATA
        .iter()
        .flat_map(|n| walkdir::WalkDir::new(dir.join(n)).follow_links(false).into_iter().flatten())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| m.len()).unwrap_or(0))
        .sum()
}
/// One content kind per archive. Mod metadata wins: many Fabric mods also ship a
/// `pack.mcmeta` for their bundled assets, which does not make them resource packs.
fn classify_names(names: &[String], meta: &Value) -> Result<&'static str> {
    if !meta["fabric.mod.json"].is_null() || !meta["quilt.mod.json"].is_null() {
        return Ok("mod");
    }
    if !meta["modrinth.index.json"].is_null() {
        return Ok("mrpack");
    }
    let worlds = names.iter().any(|n| n.as_str() == "level.dat" || n.ends_with("/level.dat"));
    let shader = names.iter().any(|n| n.starts_with("shaders/"));
    let resource = !meta["pack.mcmeta"].is_null();
    match (worlds, shader, resource) {
        (true, false, false) => Ok("world"),
        (false, true, false) => Ok("shader"),
        (false, false, true) => Ok("resource"),
        (false, false, false)
            if names.iter().any(|n| {
                n == "META-INF/mods.toml" || n == "META-INF/neoforge.mods.toml" || n == "mcmod.info"
            }) =>
        {
            Err("This is a Forge or NeoForge mod. LOAM games run Vanilla, Fabric or Quilt.".into())
        }
        _ => Err("This archive is ambiguous or unsupported. Use a Fabric or Quilt mod, resource pack, shader pack, one world, or Modrinth pack.".into()),
    }
}
pub(crate) fn loader_kind(game: &Game) -> &'static str {
    match game.loader.as_deref() {
        None => "vanilla",
        Some(l) if l.starts_with("quilt:") => "quilt",
        Some(_) => "fabric",
    }
}
/// Why `game` cannot take this content, or `None` when it can. Mirrors the gating
/// checks in `inspect` without hashing, so a drop can be matched against every game.
fn target_error(game: &Game, meta: &Value, kind: &str) -> Option<String> {
    match kind {
        "mod" => {
            let quilt_only = meta["fabric.mod.json"].is_null();
            let loader = loader_kind(game);
            if loader == "vanilla" || (quilt_only && loader != "quilt") {
                return Some(if quilt_only { "Needs a Quilt game." } else { "Needs a Fabric or Quilt game." }.into());
            }
            let spec = if quilt_only {
                meta["quilt.mod.json"]["quilt_loader"]["depends"]
                    .as_array()
                    .and_then(|a| a.iter().find(|d| d["id"] == "minecraft"))
                    .map(|d| d["versions"].clone())
            } else {
                meta["fabric.mod.json"]["depends"].get("minecraft").cloned()
            };
            match spec {
                Some(v) if (v.is_string() || v.is_array()) && !dependency_matches(&v, &game.version) => {
                    Some(format!("Made for Minecraft {}.", v.as_str().map(str::to_owned).unwrap_or_else(|| v.to_string())))
                }
                _ => None,
            }
        }
        "mrpack" => {
            let d = &meta["modrinth.index.json"]["dependencies"];
            if d["minecraft"] != game.version.as_str() {
                return Some(format!("Pack needs Minecraft {}.", d["minecraft"].as_str().unwrap_or("?")));
            }
            if d["fabric-loader"].as_str() != game.loader.as_deref() {
                return Some(match d["fabric-loader"].as_str() {
                    Some(l) => format!("Pack needs Fabric {l}."),
                    None => "Pack needs a Vanilla game.".into(),
                });
            }
            None
        }
        _ => None,
    }
}
/// Smart Drop: identify a dropped item once and rank every game as a destination.
pub fn classify(core: &Core, source: &str) -> Result<Value> {
    let p = PathBuf::from(source);
    storage::no_links(&p)?;
    if p.is_dir() {
        if let Some(c) = crate::launchers::detect(&p) {
            return Ok(json!({"kind":"instance","instance":c}));
        }
        return Ok(json!({"kind":"launcher","title":p.file_name().unwrap_or_default().to_string_lossy()}));
    }
    if !p.is_file() {
        return Err("The dropped item no longer exists.".into());
    }
    let ext = p.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
    if !["jar", "zip", "mrpack"].contains(&ext.as_str()) {
        return Err("Drop a .jar mod, a .zip pack or world, a .mrpack, or a launcher folder.".into());
    }
    let (names, meta) = archive_meta(&p)?;
    let kind = classify_names(&names, &meta)?;
    let title = match kind {
        "mod" => meta["fabric.mod.json"]["name"]
            .as_str()
            .or(meta["quilt.mod.json"]["quilt_loader"]["metadata"]["name"].as_str()),
        "mrpack" => meta["modrinth.index.json"]["name"].as_str(),
        _ => None,
    }
    .map(str::to_owned)
    .unwrap_or_else(|| p.file_name().unwrap_or_default().to_string_lossy().into_owned());
    let d = core.data.lock().unwrap().clone();
    let mut targets: Vec<Value> = d
        .games
        .iter()
        .map(|g| {
            let reason = target_error(g, &meta, kind);
            json!({"id":g.id,"name":g.name,"version":g.version,"loader":g.loader,"compatible":reason.is_none(),"reason":reason})
        })
        .collect();
    // Compatible games first; within them the selected game first.
    let selected = d.selected_game.clone();
    targets.sort_by_key(|v| (v["compatible"] != true, v["id"].as_str() != selected.as_deref()));
    let suggested = targets.first().filter(|t| t["compatible"] == true).map(|t| t["id"].clone());
    let new_game = (kind == "mrpack").then(|| {
        let m = &meta["modrinth.index.json"];
        json!({"name":m["name"].as_str().unwrap_or("Modrinth pack").chars().take(64).collect::<String>(),"version":m["dependencies"]["minecraft"],"loader":m["dependencies"]["fabric-loader"]})
    });
    Ok(json!({"kind":kind,"title":title,"source":source,"targets":targets,"suggested":suggested,"newGame":new_game}))
}
fn compatible(spec: &str, version: &str) -> bool {
    fn parse(raw: &str) -> Option<semver::Version> {
        let (base, pre) = raw
            .split_once('-')
            .map(|(a, b)| (a, Some(b)))
            .unwrap_or((raw, None));
        let mut base = base.to_owned();
        while base.matches('.').count() < 2 {
            base.push_str(".0");
        }
        if let Some(pre) = pre {
            base.push('-');
            base.push_str(if pre.is_empty() { "0" } else { pre });
        }
        semver::Version::parse(&base).ok()
    }
    spec.split_whitespace().all(|term| {
        if term == "*" {
            return true;
        }
        let (op, raw) = [">=", "<=", ">", "<", "=", "~", "^"]
            .iter()
            .find_map(|op| term.strip_prefix(op).map(|r| (*op, r)))
            .unwrap_or(("=", term));
        if raw.contains('*') || raw.split('.').any(|p| p.eq_ignore_ascii_case("x")) {
            if op != "=" {
                return false;
            }
            let Some(v) = parse(version) else {
                return false;
            };
            let components = [v.major, v.minor, v.patch];
            return raw.split('.').enumerate().all(|(i, p)| {
                p == "*"
                    || p.eq_ignore_ascii_case("x")
                    || p.parse::<u64>().ok() == components.get(i).copied()
            });
        }
        let (Some(v), Some(want)) = (parse(version), parse(raw)) else {
            return matches!(op, "=" | ">=" | "<=") && raw == version;
        };
        match op {
            ">=" => v >= want,
            "<=" => v <= want,
            ">" => v > want,
            "<" => v < want,
            "~" => v >= want && v.major == want.major && v.minor == want.minor,
            "^" => v >= want && v.major == want.major,
            _ => v == want,
        }
    })
}
fn pack_url(s: &str) -> bool {
    url::Url::parse(s)
        .map(|u| {
            u.scheme() == "https"
                && u.host_str() == Some("cdn.modrinth.com")
                && u.username().is_empty()
                && u.password().is_none()
                && u.port().is_none()
        })
        .unwrap_or(false)
}
fn content_path(s: &str) -> bool {
    let s = s.replace('\\', "/");
    let first = s.split('/').next().unwrap_or("");
    [
        "mods",
        "config",
        "resourcepacks",
        "shaderpacks",
        "saves",
        "options.txt",
        "servers.dat",
    ]
    .contains(&first)
}
pub fn backup(core: &Core, id: &str) -> Result<String> {
    core.ensure_idle(id)?;
    let src = core.game_dir(id)?;
    let key = format!(
        "{}-{}",
        chrono::Utc::now().format("%Y%m%d-%H%M%S"),
        &uuid::Uuid::new_v4().simple().to_string()[..8]
    );
    let dst = core.root.join("backups").join(id).join(&key);
    fs::create_dir_all(&dst).map_err(|e| e.to_string())?;
    for name in [
        "saves",
        "mods",
        "config",
        "resourcepacks",
        "shaderpacks",
        "options.txt",
        "servers.dat",
    ] {
        let p = src.join(name);
        if p.is_dir() {
            storage::copy_tree(&p, &dst.join(name))?;
        } else if p.is_file() {
            storage::no_links(&p)?;
            fs::copy(p, dst.join(name)).map_err(|e| e.to_string())?;
        }
    }
    storage::write_json(
        &dst.join("backup.json"),
        &json!({"schema":1,"id":key,"game":id,"created":chrono::Utc::now().to_rfc3339()}),
    )?;
    Ok(key)
}
pub fn apply(core: &Core, token: &str) -> Result<()> {
    let game_id = core.pending.lock().unwrap().get(token).and_then(|p| p["gameId"].as_str().map(str::to_owned));
    let result = apply_staged(core, token);
    // The staging folder only ever holds LOAM's own copies; remove it on success and failure.
    if let Some(dir) = game_id.and_then(|id| core.game_dir(&id).ok()) {
        let stage = dir.join(format!(".import-{token}"));
        if storage::no_links(&stage).is_ok() && stage.is_dir() {
            let _ = fs::remove_dir_all(&stage);
        }
    }
    result
}
fn apply_staged(core: &Core, token: &str) -> Result<()> {
    let p = core
        .pending
        .lock()
        .unwrap()
        .remove(token)
        .ok_or("Import review expired. Inspect the source again.")?;
    let id = p["gameId"].as_str().unwrap();
    core.ensure_idle(id)?;
    let src = PathBuf::from(p["source"].as_str().unwrap());
    storage::no_links(&src)?;
    if src.is_file() && storage::hash(&src, "sha256")? != p["fingerprint"].as_str().unwrap() {
        return Err("The source changed since review. Inspect it again.".into());
    }
    if src.is_dir() && folder_inventory(&src)?.0 != p["fingerprint"].as_str().unwrap_or("") {
        return Err("The source folder changed since review. Inspect it again.".into());
    }
    let game = core.game_dir(id)?;
    let stage = game.join(format!(".import-{token}"));
    fs::create_dir_all(&stage).map_err(|e| e.to_string())?;
    core.step(id, "importing", "Inspecting and staging content");
    match p["kind"].as_str().unwrap() {
        "launcher" => {
            for name in [
                "saves",
                "mods",
                "resourcepacks",
                "shaderpacks",
                "options.txt",
                "servers.dat",
            ] {
                let from = src.join(name);
                if name == "saves" && from.is_dir() {
                    // Never merge two worlds that share a folder name: rename the incoming copy.
                    for w in fs::read_dir(&from).map_err(|e| e.to_string())?.flatten() {
                        if !w.path().is_dir() {
                            continue;
                        }
                        let original = w.file_name().to_string_lossy().into_owned();
                        let mut target = original.clone();
                        let mut n = 2;
                        while game.join("saves").join(&target).exists() {
                            target = format!("{original} (imported {n})");
                            n += 1;
                        }
                        storage::copy_tree(&w.path(), &stage.join("saves").join(target))?
                    }
                } else if from.is_dir() {
                    storage::copy_tree(&from, &stage.join(name))?
                } else if from.is_file() {
                    storage::no_links(&from)?;
                    fs::copy(from, stage.join(name)).map_err(|e| e.to_string())?;
                }
            }
        }
        "mod" | "resource" | "shader" => {
            let folder = match p["kind"].as_str().unwrap() {
                "mod" => "mods",
                "resource" => "resourcepacks",
                _ => "shaderpacks",
            };
            fs::create_dir_all(stage.join(folder)).map_err(|e| e.to_string())?;
            fs::copy(&src, stage.join(folder).join(src.file_name().unwrap()))
                .map_err(|e| e.to_string())?;
        }
        "world" => {
            let extract = stage.join(".extract");
            storage::extract_zip(&src, &extract, MAX)?;
            let root = p["meta"]["worldRoot"].as_str().unwrap_or("");
            let from = if root.is_empty() {
                extract.clone()
            } else {
                extract.join(storage::safe_relative(root)?)
            };
            let name = clean_name(&src.file_stem().unwrap_or_default().to_string_lossy());
            storage::copy_tree(
                &from,
                &stage
                    .join("saves")
                    .join(format!("{}-{}", name, &token[..6])),
            )?;
        }
        "mrpack" => {
            let extract = stage.join(".extract");
            storage::extract_zip(&src, &extract, MAX)?;
            for folder in ["overrides", "client-overrides"] {
                let from = extract.join(folder);
                if from.exists() {
                    for e in fs::read_dir(&from).map_err(|e| e.to_string())? {
                        let e = e.map_err(|e| e.to_string())?;
                        if !content_path(&e.file_name().to_string_lossy()) {
                            return Err("Unsupported override path.".into());
                        }
                    }
                }
            }
            for f in p["meta"]["modrinth.index.json"]["files"]
                .as_array()
                .unwrap()
            {
                if matches!(
                    f["env"]["client"].as_str(),
                    Some("unsupported" | "optional")
                ) {
                    continue;
                }
                core.cancelled()?;
                let url = f["downloads"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .filter_map(Value::as_str)
                    .find(|u| pack_url(u))
                    .ok_or("No allowed file download")?;
                network::download(
                    url,
                    &stage.join(storage::safe_relative(f["path"].as_str().unwrap())?),
                    f["hashes"]["sha512"]
                        .as_str()
                        .ok_or("Pack SHA-512 missing")?,
                    "sha512",
                    f["fileSize"].as_u64().unwrap_or(0),
                    core,
                    &mut |_| {},
                )?;
            }
            // Overrides take precedence over downloaded pack files.
            for folder in ["overrides", "client-overrides"] {
                let from = extract.join(folder);
                if from.exists() {
                    storage::copy_tree(&from, &stage)?;
                }
            }
        }
        _ => return Err("Unsupported import.".into()),
    }
    core.cancelled()?;
    let backup_id = backup(core, id)?;
    storage::write_json(
        &game.join("transaction.json"),
        &json!({"schema":1,"backup":backup_id,"stage":stage,"state":"applying"}),
    )?;
    // Persist the recovery point before the first rename. Never launch a partially applied transaction.
    let apply_result = (|| -> Result<()> {
        for e in walkdir::WalkDir::new(&stage)
            .into_iter()
            .filter_entry(|e| e.file_name() != ".extract")
        {
            let e = e.map_err(|e| e.to_string())?;
            if e.file_type().is_file() {
                let rel = e.path().strip_prefix(&stage).map_err(|e| e.to_string())?;
                let dst = game.join(rel);
                storage::no_links(&dst)?;
                fs::create_dir_all(dst.parent().unwrap()).map_err(|e| e.to_string())?;
                fs::rename(e.path(), dst).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    })();
    if let Err(e) = apply_result {
        match restore(core, id, &backup_id) {
            Ok(()) => return Err(format!("Import failed; original content restored. {e}")),
            Err(_) => {
                return Err(format!(
                    "Import interrupted. Restore backup {backup_id} before playing. {e}"
                ))
            }
        }
    }
    storage::write_json(
        &game.join("transaction.json"),
        &json!({"schema":1,"backup":backup_id,"state":"complete"}),
    )?;
    core.step(
        id,
        "ready",
        "Import complete. Your original source is unchanged.",
    );
    Ok(())
}
pub fn restore(core: &Core, id: &str, key: &str) -> Result<()> {
    core.ensure_idle(id)?;
    let rel = storage::safe_relative(key)?;
    if rel.components().count() != 1 {
        return Err("Invalid backup ID.".into());
    }
    let src = core.root.join("backups").join(id).join(rel);
    if !src.join("backup.json").exists() {
        return Err("Backup receipt is missing.".into());
    }
    let dst = core.game_dir(id)?;
    let safety = backup(core, id)?;
    for name in [
        "saves",
        "mods",
        "config",
        "resourcepacks",
        "shaderpacks",
        "options.txt",
        "servers.dat",
    ] {
        let target = dst.join(name);
        if target.exists() {
            let displaced = dst.join(format!(".before-restore-{safety}"));
            fs::create_dir_all(&displaced).map_err(|e| e.to_string())?;
            fs::rename(&target, displaced.join(name)).map_err(|e| e.to_string())?;
        }
        if src.join(name).is_dir() {
            storage::copy_tree(&src.join(name), &target)?
        } else if src.join(name).is_file() {
            fs::copy(src.join(name), target).map_err(|e| e.to_string())?;
        }
    }
    storage::write_json(
        &dst.join("transaction.json"),
        &json!({"schema":1,"state":"complete","restoredFrom":key}),
    )?;
    Ok(())
}
pub fn modrinth(core: &Core, id: &str, url: &str) -> Result<Value> {
    let u = url::Url::parse(url).map_err(|_| "Enter a Modrinth project or version URL.")?;
    if u.scheme() != "https"
        || u.host_str() != Some("modrinth.com")
        || !u.username().is_empty()
        || u.port().is_some()
    {
        return Err("Only HTTPS modrinth.com project/version links are accepted.".into());
    }
    let parts: Vec<_> = u
        .path_segments()
        .unwrap()
        .filter(|s| !s.is_empty())
        .collect();
    if !(parts.len() == 2 || (parts.len() == 4 && parts[2] == "version"))
        || !["mod", "modpack", "resourcepack", "shader"].contains(&parts[0])
    {
        return Err("Use a Modrinth content URL.".into());
    }
    let g = core.game(id)?;
    let mut query = url::Url::parse(&format!(
        "https://api.modrinth.com/v2/project/{}/version",
        parts[1]
    ))
    .unwrap();
    query
        .query_pairs_mut()
        .append_pair("game_versions", &json!([g.version]).to_string());
    if parts[0] == "mod" && g.loader.is_some() {
        query
            .query_pairs_mut()
            .append_pair("loaders", &json!(["fabric"]).to_string());
    }
    let v = if parts.len() == 4 && parts[2] == "version" {
        network::json(&format!(
            "https://api.modrinth.com/v2/project/{}/version/{}",
            parts[1], parts[3]
        ))?
    } else {
        network::json(query.as_str())?
            .as_array()
            .and_then(|a| a.first())
            .cloned()
            .ok_or("No compatible version was found.")?
    };
    if !v["game_versions"]
        .as_array()
        .is_some_and(|a| a.iter().any(|x| x == &g.version))
    {
        return Err("This Modrinth version does not list the selected Minecraft version.".into());
    }
    let f = v["files"]
        .as_array()
        .ok_or("No downloadable files")?
        .iter()
        .find(|f| f["primary"] == true)
        .or_else(|| v["files"].as_array().unwrap().first())
        .ok_or("No files")?;
    let download = f["url"].as_str().ok_or("No file URL")?;
    if !pack_url(download) {
        return Err("Download URL is outside the Modrinth CDN.".into());
    }
    let path = core
        .root
        .join("cache/imports")
        .join(uuid::Uuid::new_v4().to_string())
        .join(storage::safe_relative(
            f["filename"].as_str().ok_or("No filename")?,
        )?);
    network::download(
        download,
        &path,
        f["hashes"]["sha512"].as_str().ok_or("Missing checksum")?,
        "sha512",
        f["size"].as_u64().unwrap_or(0),
        core,
        &mut |_| {},
    )?;
    inspect(core, id, &path.to_string_lossy())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn dependency_ranges() {
        assert!(compatible(">=1.20 <1.21", "1.20.4"));
        assert!(!compatible("1.19.4", "1.20.4"));
        assert!(compatible("~26.3-", "26.3"));
        assert!(compatible("~26.3-", "26.3-rc.1"));
        assert!(!compatible("~26.3-", "26.4"));
        assert!(compatible("^0.12.0", "0.19.5"));
        assert!(!compatible("1.20.x", "1.21"));
    }
    #[test]
    fn fabric_mod_with_pack_mcmeta_is_a_mod_and_forge_is_named() {
        let meta = json!({"fabric.mod.json":{"id":"x"},"pack.mcmeta":{"pack":{}}});
        assert_eq!(classify_names(&["fabric.mod.json".into(), "pack.mcmeta".into()], &meta).unwrap(), "mod");
        assert!(classify_names(&["META-INF/mods.toml".into()], &json!({})).unwrap_err().contains("Forge"));
        assert_eq!(classify_names(&["W/level.dat".into()], &json!({})).unwrap(), "world");
        assert!(classify_names(&["W/level.dat".into(), "shaders/a.fsh".into()], &json!({})).is_err());
        assert_eq!(clean_name("Spawn: v2."), "Spawn- v2");
    }
    #[test]
    fn targets_explain_incompatibility() {
        let g = |loader: Option<&str>, version: &str| Game { id: "x".into(), folder: None, name: "G".into(), version: version.into(), loader: loader.map(str::to_owned), memory: 2048, width: None, height: None, jvm_args: vec![], installed: true, verified: None, created: String::new() };
        let m = json!({"fabric.mod.json":{"depends":{"minecraft":"~1.21.4"}}});
        assert_eq!(target_error(&g(None, "1.21.4"), &m, "mod").unwrap(), "Needs a Fabric or Quilt game.");
        assert!(target_error(&g(Some("0.16.9"), "1.21.4"), &m, "mod").is_none());
        assert!(target_error(&g(Some("quilt:0.26.4"), "1.21.4"), &m, "mod").is_none());
        assert_eq!(target_error(&g(Some("0.16.9"), "1.20.1"), &m, "mod").unwrap(), "Made for Minecraft ~1.21.4.");
        let pack = json!({"modrinth.index.json":{"dependencies":{"minecraft":"1.21.4","fabric-loader":"0.16.9"}}});
        assert!(target_error(&g(Some("0.16.9"), "1.21.4"), &pack, "mrpack").is_none());
        assert_eq!(target_error(&g(None, "1.21.4"), &pack, "mrpack").unwrap(), "Pack needs Fabric 0.16.9.");
    }
    #[test]
    fn pack_paths() {
        assert!(!content_path("launcher_accounts.json"));
        assert!(content_path("mods/test.jar"));
    }
}
