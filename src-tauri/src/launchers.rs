//! Migration Hub: find instances made by Prism Launcher, MultiMC and CurseForge and
//! copy one into a new isolated LOAM game. Sources are only read, never changed.
//! Account files, logs and launcher settings are never opened or copied.
use crate::{model::*, storage};
use serde::Serialize;
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
};

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Candidate {
    pub source: String,
    pub name: String,
    pub version: String,
    /// `vanilla`, `fabric`, `quilt`, `forge`, `neoforge` or `unknown`.
    pub loader_kind: String,
    pub loader_version: Option<String>,
    /// Instance folder (what the user picks); `game_dir` is where saves and mods live.
    pub path: String,
    pub game_dir: String,
    pub worlds: usize,
    pub mods: usize,
    pub bytes: u64,
    pub memory: Option<u32>,
    pub supported: bool,
    pub note: String,
}

/// Items copied into the new game. `true` = also copied by a worlds-only import.
const ITEMS: &[(&str, bool)] = &[
    ("saves", true),
    ("resourcepacks", true),
    ("shaderpacks", true),
    ("screenshots", true),
    ("options.txt", true),
    ("servers.dat", true),
    ("mods", false),
    ("config", false),
];

fn ini_value(text: &str, key: &str) -> Option<String> {
    text.lines().find_map(|l| {
        let (k, v) = l.split_once('=')?;
        (k.trim() == key).then(|| v.trim().trim_matches('"').to_owned())
    })
}

fn read_small(path: &Path) -> Option<String> {
    storage::no_links(path).ok()?;
    let meta = fs::metadata(path).ok()?;
    if !meta.is_file() || meta.len() > 1024 * 1024 {
        return None;
    }
    fs::read_to_string(path).ok()
}

fn count(dir: &Path, filter: impl Fn(&str) -> bool) -> usize {
    fs::read_dir(dir).map(|e| e.flatten().filter(|e| filter(&e.file_name().to_string_lossy())).count()).unwrap_or(0)
}

fn size_of(game_dir: &Path, worlds_only: bool) -> u64 {
    let mut total = 0u64;
    for (item, in_worlds) in ITEMS {
        if worlds_only && !in_worlds {
            continue;
        }
        let p = game_dir.join(item);
        for e in walkdir::WalkDir::new(&p).follow_links(false).into_iter().flatten() {
            if e.file_type().is_file() {
                total = total.saturating_add(e.metadata().map(|m| m.len()).unwrap_or(0));
            }
        }
    }
    total
}

fn mmc_instance(dir: &Path, source: &str) -> Option<Candidate> {
    let cfg = read_small(&dir.join("instance.cfg"))?;
    let pack: Value = serde_json::from_str(&read_small(&dir.join("mmc-pack.json"))?).ok()?;
    let components = pack["components"].as_array()?;
    let version_of = |uid: &str| components.iter().find(|c| c["uid"] == uid).and_then(|c| c["version"].as_str().map(str::to_owned));
    let version = version_of("net.minecraft")?;
    let (kind, loader_version) = if let Some(v) = version_of("net.fabricmc.fabric-loader") {
        ("fabric", Some(v))
    } else if let Some(v) = version_of("org.quiltmc.quilt-loader") {
        ("quilt", Some(v))
    } else if let Some(v) = version_of("net.neoforged") {
        ("neoforge", Some(v))
    } else if let Some(v) = version_of("net.minecraftforge") {
        ("forge", Some(v))
    } else {
        ("vanilla", None)
    };
    let game_dir = ["minecraft", ".minecraft"].iter().map(|d| dir.join(d)).find(|p| p.is_dir())?;
    let memory = if ini_value(&cfg, "OverrideMemory").as_deref() == Some("true") {
        ini_value(&cfg, "MaxMemAlloc").and_then(|m| m.parse().ok())
    } else {
        None
    };
    Some(candidate(source, ini_value(&cfg, "name").unwrap_or_else(|| dir.file_name().unwrap_or_default().to_string_lossy().into()), version, kind, loader_version, dir, &game_dir, memory))
}

fn curseforge_instance(dir: &Path) -> Option<Candidate> {
    let v: Value = serde_json::from_str(&read_small(&dir.join("minecraftinstance.json"))?).ok()?;
    let version = v["gameVersion"].as_str()?.to_owned();
    let loader = &v["baseModLoader"];
    let name = loader["name"].as_str().unwrap_or("");
    let (kind, loader_version) = if loader.is_null() || name.is_empty() {
        ("vanilla", None)
    } else {
        let kind = match loader["type"].as_u64() {
            Some(4) => "fabric",
            Some(5) => "quilt",
            Some(6) => "neoforge",
            Some(1) => "forge",
            _ => name.split('-').next().unwrap_or("unknown"),
        };
        // Names look like "fabric-0.16.9-1.21.4", "quilt-0.26.4-1.21.1", "forge-47.2.0".
        let rest = name.split_once('-').map(|x| x.1).unwrap_or("");
        let ver = rest.strip_suffix(&format!("-{version}")).unwrap_or(rest);
        (kind, (!ver.is_empty()).then(|| ver.to_owned()))
    };
    let kind = match kind { "fabric" | "quilt" | "forge" | "neoforge" | "vanilla" => kind, _ => "unknown" };
    Some(candidate("CurseForge", v["name"].as_str().unwrap_or("CurseForge instance").to_owned(), version, kind, loader_version, dir, dir, None))
}

#[allow(clippy::too_many_arguments)]
fn candidate(source: &str, name: String, version: String, kind: &str, loader_version: Option<String>, dir: &Path, game_dir: &Path, memory: Option<u32>) -> Candidate {
    let supported = matches!(kind, "vanilla" | "fabric" | "quilt");
    let note = match kind {
        "vanilla" => "Worlds, packs and settings are copied.".to_owned(),
        "fabric" | "quilt" => "Worlds, mods, configs, packs and settings are copied.".to_owned(),
        "forge" | "neoforge" => format!("{} isn't supported by LOAM. You can bring the worlds, packs and settings into a vanilla game; the mods stay behind.", if kind == "forge" { "Forge" } else { "NeoForge" }),
        _ => "This mod loader isn't recognised. You can bring the worlds, packs and settings into a vanilla game.".to_owned(),
    };
    Candidate {
        source: source.into(),
        name: name.chars().filter(|c| !c.is_control()).take(64).collect::<String>().trim().to_owned(),
        version,
        loader_kind: kind.into(),
        loader_version,
        path: dir.to_string_lossy().into_owned(),
        game_dir: game_dir.to_string_lossy().into_owned(),
        worlds: count(&game_dir.join("saves"), |_| true),
        mods: count(&game_dir.join("mods"), |n| n.ends_with(".jar")),
        bytes: size_of(game_dir, !supported),
        memory,
        supported,
        note,
    }
}

/// Recognises one instance folder of any supported launcher.
pub fn detect(dir: &Path) -> Option<Candidate> {
    storage::no_links(dir).ok()?;
    if !dir.is_dir() {
        return None;
    }
    if dir.join("minecraftinstance.json").is_file() {
        return curseforge_instance(dir);
    }
    if dir.join("instance.cfg").is_file() {
        let source = if dir.ancestors().any(|a| a.file_name().is_some_and(|n| n.to_string_lossy().to_lowercase().contains("multimc"))) { "MultiMC" } else { "Prism Launcher" };
        return mmc_instance(dir, source);
    }
    None
}

fn instances_in(root: &Path, limit: usize) -> Vec<Candidate> {
    let mut out = vec![];
    if storage::no_links(root).is_err() {
        return out;
    }
    if let Ok(entries) = fs::read_dir(root) {
        for e in entries.flatten().take(limit) {
            if let Some(c) = detect(&e.path()) {
                out.push(c);
            }
        }
    }
    out
}

/// Instance folders for an MMC-style launcher root, honouring a custom `InstanceDir`.
fn mmc_root(root: &Path, cfg: &str) -> PathBuf {
    let custom = read_small(&root.join(cfg)).and_then(|t| ini_value(&t, "InstanceDir")).unwrap_or_else(|| "instances".into());
    let p = PathBuf::from(&custom);
    if p.is_absolute() { p } else { root.join(custom) }
}

/// Default install locations. MultiMC is portable, so only common folders are checked;
/// any other location can be chosen with the folder picker.
pub fn known_roots() -> Vec<PathBuf> {
    let env = |k: &str| std::env::var_os(k).map(PathBuf::from);
    let mut roots = vec![];
    if let Some(appdata) = env("APPDATA") {
        roots.push(mmc_root(&appdata.join("PrismLauncher"), "prismlauncher.cfg"));
        roots.push(mmc_root(&appdata.join("MultiMC"), "multimc.cfg"));
    }
    if let Some(home) = env("USERPROFILE") {
        roots.push(home.join("curseforge/minecraft/Instances"));
        for d in ["MultiMC", "Desktop/MultiMC", "Downloads/MultiMC", "Documents/MultiMC"] {
            roots.push(mmc_root(&home.join(d), "multimc.cfg"));
        }
    }
    if let Some(local) = env("LOCALAPPDATA") {
        roots.push(mmc_root(&local.join("Programs/MultiMC"), "multimc.cfg"));
    }
    roots
}

pub fn scan_roots(roots: &[PathBuf]) -> Vec<Candidate> {
    let mut seen = std::collections::HashSet::new();
    let mut out: Vec<Candidate> = roots
        .iter()
        .flat_map(|r| instances_in(r, 500))
        .filter(|c| seen.insert(c.path.to_lowercase()))
        .collect();
    out.sort_by(|a, b| (a.source.as_str(), a.name.to_lowercase()).cmp(&(b.source.as_str(), b.name.to_lowercase())));
    out
}

/// Scans default locations, or one folder the user chose (a launcher root, an
/// `instances` folder, or a single instance).
pub fn scan(folder: Option<&str>) -> Result<Value> {
    let found = match folder {
        None => scan_roots(&known_roots()),
        Some(f) => {
            let p = PathBuf::from(f);
            storage::no_links(&p)?;
            if let Some(c) = detect(&p) {
                vec![c]
            } else {
                let mut roots = vec![p.clone(), mmc_root(&p, "prismlauncher.cfg"), mmc_root(&p, "multimc.cfg"), p.join("Instances")];
                roots.dedup();
                scan_roots(&roots)
            }
        }
    };
    Ok(json!({"instances": found}))
}

fn loader_string(c: &Candidate) -> Option<String> {
    match (c.loader_kind.as_str(), &c.loader_version) {
        ("fabric", Some(v)) => Some(v.clone()),
        ("quilt", Some(v)) => Some(format!("quilt:{v}")),
        _ => None,
    }
}

fn copy_items(core: &Core, from: &Path, to: &Path, worlds_only: bool, total: u64, game_id: &str) -> Result<u64> {
    let mut done = 0u64;
    let mut files = 0u64;
    let mut last = std::time::Instant::now();
    for (item, in_worlds) in ITEMS {
        if worlds_only && !in_worlds {
            continue;
        }
        let src = from.join(item);
        if !src.exists() {
            continue;
        }
        for e in walkdir::WalkDir::new(&src).follow_links(false) {
            core.cancelled()?;
            let e = e.map_err(|e| e.to_string())?;
            if e.path_is_symlink() || storage::no_links(e.path()).is_err() {
                return Err(format!("{} contains a link or junction. LOAM copies only real files; remove the link and try again.", e.path().display()));
            }
            let rel = e.path().strip_prefix(from).map_err(|e| e.to_string())?;
            let out = to.join(rel);
            if e.file_type().is_dir() {
                fs::create_dir_all(&out).map_err(|e| e.to_string())?;
            } else if e.file_type().is_file() {
                if let Some(p) = out.parent() {
                    fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
                let n = fs::copy(e.path(), &out).map_err(|err| format!("Could not copy {}: {err}", rel.display()))?;
                if fs::metadata(&out).map(|m| m.len()).unwrap_or(u64::MAX) != n {
                    return Err(format!("Copy check failed for {}.", rel.display()));
                }
                done += n;
                files += 1;
                if last.elapsed().as_millis() > 150 {
                    last = std::time::Instant::now();
                    core.emit(Progress {
                        id: game_id.into(),
                        game_id: game_id.into(),
                        phase: "copying".into(),
                        message: format!("Copying {} · {files} files", rel.display()),
                        done,
                        total,
                        files,
                        speed: 0,
                        error: None,
                    });
                }
            }
        }
    }
    Ok(done)
}

/// Creates a new game from an instance folder. The game is only added to the library
/// after every file was copied; on failure the partial copy is removed.
pub fn import(core: &Core, instance: &str, worlds_only: bool, memory_cap_mb: u64) -> Result<String> {
    let c = detect(Path::new(instance)).ok_or("This folder is no longer a Prism, MultiMC or CurseForge instance.")?;
    let worlds_only = worlds_only || !c.supported;
    let versions = crate::catalog::versions(core)?;
    if !versions["versions"].as_array().is_some_and(|v| v.iter().any(|v| v["id"] == c.version.as_str())) {
        return Err(format!("Minecraft {} is outside LOAM's supported range (1.16.1 and newer releases).", c.version));
    }
    let loader = if worlds_only { None } else { loader_string(&c) };
    let bytes = size_of(Path::new(&c.game_dir), worlds_only);
    if storage::free_space(&core.root) < bytes.saturating_add(256 * 1024 * 1024) {
        return Err(format!("Not enough disk space. Copying this instance needs about {} MB.", bytes / 1048576 + 256));
    }
    let name = if c.name.is_empty() { format!("{} {}", c.source, c.version) } else { c.name.clone() };
    let folder = crate::game_folders::available(&core.root, &name, &c.version)?;
    let dir = core.root.join("games").join(&folder);
    let memory = c.memory.map(u64::from).unwrap_or(4096).clamp(1024, memory_cap_mb.max(1024)) as u32 / 512 * 512;
    let game = Game {
        id: uuid::Uuid::new_v4().to_string(),
        folder: Some(folder),
        name,
        version: c.version.clone(),
        loader,
        memory,
        width: None,
        height: None,
        jvm_args: vec![],
        installed: false,
        verified: None,
        created: chrono::Utc::now().to_rfc3339(),
    };
    core.step(&game.id, "copying", &format!("Copying {} from {}", game.name, c.source));
    let copied = (|| {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        copy_items(core, Path::new(&c.game_dir), &dir, worlds_only, bytes, &game.id)?;
        crate::maintenance::prepare_game(&dir)?;
        storage::write_json(&dir.join("imported-from.json"), &json!({"schema":1,"source":c.source,"instance":c.name,"version":c.version,"loader":c.loader_kind,"loaderVersion":c.loader_version,"worldsOnly":worlds_only,"date":chrono::Utc::now().to_rfc3339()}))
    })();
    if let Err(e) = copied {
        // Only LOAM's new, unregistered copy is removed; the source is untouched.
        let _ = fs::remove_dir_all(&dir);
        return Err(e);
    }
    {
        let mut d = core.data.lock().unwrap();
        d.games.push(game.clone());
        d.selected_game = Some(game.id.clone());
        d.preferences.setup_done = true;
    }
    core.save()?;
    Ok(game.id)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn write(p: &Path, s: &str) {
        fs::create_dir_all(p.parent().unwrap()).unwrap();
        fs::write(p, s).unwrap();
    }
    #[test]
    fn prism_fabric_instance_is_detected_with_memory_and_content() {
        let t = tempfile::tempdir().unwrap();
        let inst = t.path().join("PrismLauncher/instances/Fabulous");
        write(&inst.join("instance.cfg"), "[General]\nname=Fabulously Optimized\nOverrideMemory=true\nMaxMemAlloc=6144\n");
        write(&inst.join("mmc-pack.json"), r#"{"components":[{"uid":"net.minecraft","version":"1.21.4"},{"uid":"net.fabricmc.fabric-loader","version":"0.16.9"}]}"#);
        write(&inst.join("minecraft/mods/sodium.jar"), "jar");
        write(&inst.join("minecraft/saves/World/level.dat"), "dat");
        let c = detect(&inst).unwrap();
        assert_eq!((c.source.as_str(), c.name.as_str(), c.version.as_str(), c.loader_kind.as_str()), ("Prism Launcher", "Fabulously Optimized", "1.21.4", "fabric"));
        assert_eq!(loader_string(&c).as_deref(), Some("0.16.9"));
        assert_eq!((c.mods, c.worlds, c.memory, c.supported), (1, 1, Some(6144), true));
    }
    #[test]
    fn curseforge_forge_is_worlds_only_and_quilt_maps_to_loam_loader() {
        let t = tempfile::tempdir().unwrap();
        let forge = t.path().join("Instances/All the Mods");
        write(&forge.join("minecraftinstance.json"), r#"{"name":"All the Mods","gameVersion":"1.20.1","baseModLoader":{"name":"forge-47.2.0","type":1}}"#);
        write(&forge.join("mods/a.jar"), "x");
        let quilt = t.path().join("Instances/Q");
        write(&quilt.join("minecraftinstance.json"), r#"{"name":"Q","gameVersion":"1.21.1","baseModLoader":{"name":"quilt-0.26.4-1.21.1","type":5}}"#);
        let found = scan_roots(&[t.path().join("Instances")]);
        assert_eq!(found.len(), 2);
        let f = found.iter().find(|c| c.name == "All the Mods").unwrap();
        assert!(!f.supported && f.loader_kind == "forge" && f.bytes == 0, "mods are excluded from worlds-only size");
        let q = found.iter().find(|c| c.name == "Q").unwrap();
        assert_eq!(loader_string(q).as_deref(), Some("quilt:0.26.4"));
    }
    #[test]
    fn copy_skips_accounts_and_logs_and_respects_worlds_only() {
        let t = tempfile::tempdir().unwrap();
        let from = t.path().join("src");
        for f in ["saves/W/level.dat", "mods/m.jar", "config/c.json", "options.txt", "logs/latest.log", "launcher_accounts.json"] {
            write(&from.join(f), "data");
        }
        let core = Core { root: t.path().join("loam"), data: Default::default(), progress: Default::default(), cancel: Default::default(), busy: Default::default(), running: Default::default(), pending: Default::default(), app: None };
        let to = t.path().join("dst");
        copy_items(&core, &from, &to, true, 0, "x").unwrap();
        assert!(to.join("saves/W/level.dat").exists() && to.join("options.txt").exists());
        assert!(!to.join("mods").exists() && !to.join("config").exists());
        assert!(!to.join("logs").exists() && !to.join("launcher_accounts.json").exists());
        copy_items(&core, &from, &t.path().join("full"), false, 0, "x").unwrap();
        assert!(t.path().join("full/mods/m.jar").exists());
    }
}
