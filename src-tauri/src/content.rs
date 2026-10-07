//! Discover: search, inspect and install mods, resource packs, shaders and modpacks from
//! Modrinth and CurseForge into one game, with required dependencies; Modrinth update checks.
//! Every download is checksum-verified and every mod is opened before it reaches the game.
use crate::{imports, model::*, network, storage};
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

const MODRINTH: &str = "https://api.modrinth.com/v2";
const CURSEFORGE: &str = "https://api.curseforge.com/v1";
const MINECRAFT: u32 = 432;
const MANIFEST: &str = "loam-content.json";
const PAGE: u64 = 24;

/// A file chosen for installation.
#[derive(Clone, Debug)]
struct Resolved {
    provider: &'static str,
    project: String,
    version: String,
    version_name: String,
    title: String,
    icon: Option<String>,
    kind: String,
    url: String,
    filename: String,
    hash: String,
    algo: &'static str,
    size: u64,
    dependency: bool,
}

fn folder(kind: &str) -> Result<&'static str> {
    match kind {
        "mod" => Ok("mods"),
        "resourcepack" => Ok("resourcepacks"),
        "shader" => Ok("shaderpacks"),
        _ => Err("Choose mods, resource packs or shaders.".into()),
    }
}

fn id_ok(id: &str) -> Result<&str> {
    if !id.is_empty() && id.len() <= 64 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        Ok(id)
    } else {
        Err("Invalid project ID.".into())
    }
}

/// Modrinth loader names a game accepts for `kind`.
fn loaders(game: &Game, kind: &str) -> Vec<&'static str> {
    match (kind, imports::loader_kind(game)) {
        ("mod", "quilt") => vec!["quilt", "fabric"],
        ("mod", "fabric") => vec!["fabric"],
        ("resourcepack", _) => vec!["minecraft"],
        // Iris runs both Iris and OptiFine-format shader packs.
        ("shader", "fabric" | "quilt") => vec!["iris", "optifine"],
        _ => vec![],
    }
}

/// Why `game` cannot take `kind`, if it cannot.
fn unsupported(game: &Game, kind: &str) -> Option<&'static str> {
    match (kind, imports::loader_kind(game)) {
        ("mod", "vanilla") => Some("Mods need a Fabric or Quilt game. Create one, or pick it above."),
        ("shader", "vanilla") => Some("Shaders need a Fabric or Quilt game with Iris."),
        _ => None,
    }
}

// ---------------------------------------------------------------- CurseForge key

const CF_ENTRY: &str = "curseforge-api-key";

pub fn cf_key() -> Option<String> {
    let built = crate::accounts::config()["curseforgeApiKey"].as_str().unwrap_or("").trim().to_owned();
    if !built.is_empty() {
        return Some(built);
    }
    keyring::Entry::new("LOAM", CF_ENTRY).ok()?.get_password().ok().filter(|k| !k.trim().is_empty())
}

/// Stores (or with an empty key, removes) a CurseForge API key after checking it works.
pub fn set_cf_key(key: &str) -> Result<Value> {
    let entry = keyring::Entry::new("LOAM", CF_ENTRY).map_err(|_| "Credential Manager unavailable")?;
    let key = key.trim();
    if key.is_empty() {
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => return Ok(json!({"curseforge": cf_key().is_some()})),
            Err(_) => return Err("Could not remove the CurseForge key.".into()),
        }
    }
    if key.len() > 200 || !key.chars().all(|c| c.is_ascii_graphic()) {
        return Err("That doesn't look like a CurseForge API key.".into());
    }
    network::request(&format!("{CURSEFORGE}/games/{MINECRAFT}"), None, &[("x-api-key", key)])
        .map_err(|_| "CurseForge didn't accept this key. Check it at console.curseforge.com.".to_string())?;
    entry.set_password(key).map_err(|_| "Could not save the key in Credential Manager.")?;
    Ok(json!({"curseforge": true}))
}

fn cf(path: &str) -> Result<Value> {
    let key = cf_key().ok_or("CurseForge isn't connected. Add an API key in Settings â€º Integrations.")?;
    network::request(&format!("{CURSEFORGE}{path}"), None, &[("x-api-key", &key), ("Accept", "application/json")])
}

pub fn providers() -> Value {
    json!({"modrinth": true, "curseforge": cf_key().is_some()})
}

// ---------------------------------------------------------------- search

pub fn search(core: &Core, a: &Value) -> Result<Value> {
    let kind = a["kind"].as_str().unwrap_or("mod");
    if !["mod", "modpack", "resourcepack", "shader"].contains(&kind) {
        return Err("Unknown content type.".into());
    }
    let query: String = a["query"].as_str().unwrap_or("").trim().chars().take(100).collect();
    let offset = a["offset"].as_u64().unwrap_or(0).min(9_000);
    let sort = a["sort"].as_str().unwrap_or("relevance");
    // `compatible: false` shows everything; installing still checks the game.
    let game = match a["gameId"].as_str() {
        Some(id) if !id.is_empty() && kind != "modpack" && a["compatible"].as_bool() != Some(false) => Some(core.game(id)?),
        _ => None,
    };
    // Category filters: Modrinth tag names, or one CurseForge category ID.
    let categories: Vec<String> = a["categories"]
        .as_array()
        .map(|c| c.iter().filter_map(|v| v.as_str()).filter(|s| category_ok(s)).take(8).map(String::from).collect())
        .unwrap_or_default();
    match a["provider"].as_str().unwrap_or("modrinth") {
        "modrinth" => modrinth_search(&query, kind, game.as_ref(), sort, offset, &categories),
        "curseforge" => cf_search(&query, kind, game.as_ref(), sort, offset, categories.first().map(String::as_str)),
        _ => Err("Unknown content source.".into()),
    }
}

fn category_ok(s: &str) -> bool {
    !s.is_empty() && s.len() <= 40 && s.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '_' || c == '+')
}

/// `discoverCategories`: the categories a source offers for `kind`, cached for an hour.
pub fn categories(a: &Value) -> Result<Value> {
    use std::sync::Mutex;
    use std::time::Instant;
    static CACHE: Mutex<Vec<(String, Instant, Value)>> = Mutex::new(Vec::new());
    let kind = a["kind"].as_str().unwrap_or("mod");
    if !["mod", "modpack", "resourcepack", "shader"].contains(&kind) {
        return Err("Unknown content type.".into());
    }
    let provider = a["provider"].as_str().unwrap_or("modrinth");
    let key = format!("{provider}:{kind}");
    if let Some((_, at, v)) = CACHE.lock().unwrap().iter().find(|(k, _, _)| *k == key) {
        if at.elapsed().as_secs() < 3600 {
            return Ok(v.clone());
        }
    }
    let list: Vec<Value> = match provider {
        "modrinth" => {
            let tags = network::json(&format!("{MODRINTH}/tag/category"))?;
            let mut out: Vec<Value> = tags
                .as_array()
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter(|t| t["project_type"].as_str() == Some(kind))
                .filter_map(|t| {
                    let name = t["name"].as_str().filter(|n| category_ok(n))?.to_owned();
                    let group = t["header"].as_str().unwrap_or("categories").to_owned();
                    Some(json!({"id": name, "label": title_case(&name), "group": group}))
                })
                .collect();
            out.sort_by(|x, y| (x["group"].as_str() != Some("categories"), x["label"].as_str()).cmp(&(y["group"].as_str() != Some("categories"), y["label"].as_str())));
            out
        }
        "curseforge" => {
            let r = cf(&format!("/categories?gameId={MINECRAFT}&classId={}", cf_class(kind)))?;
            let mut out: Vec<Value> = r["data"]
                .as_array()
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter_map(|c| Some(json!({"id": c["id"].as_u64()?.to_string(), "label": c["name"].as_str()?, "group": "categories"})))
                .collect();
            out.sort_by(|x, y| x["label"].as_str().cmp(&y["label"].as_str()));
            out
        }
        _ => return Err("Unknown content source.".into()),
    };
    let v = json!(list);
    let mut cache = CACHE.lock().unwrap();
    cache.retain(|(k, _, _)| *k != key);
    cache.push((key, Instant::now(), v.clone()));
    Ok(v)
}

fn title_case(s: &str) -> String {
    s.split(['-', '_'])
        .filter(|w| !w.is_empty())
        .map(|w| {
            let mut c = w.chars();
            c.next().map(|f| f.to_uppercase().chain(c).collect::<String>()).unwrap_or_default()
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn modrinth_search(query: &str, kind: &str, game: Option<&Game>, sort: &str, offset: u64, categories: &[String]) -> Result<Value> {
    let mut facets: Vec<Vec<String>> = vec![vec![format!("project_type:{kind}")]];
    // Each chosen category must match (one facet group each = AND).
    for c in categories {
        facets.push(vec![format!("categories:{c}")]);
    }
    if let Some(g) = game {
        facets.push(vec![format!("versions:{}", g.version)]);
        let l = loaders(g, kind);
        if kind == "mod" && !l.is_empty() {
            facets.push(l.iter().map(|l| format!("categories:{l}")).collect());
        }
    }
    if kind == "modpack" {
        // LOAM runs Fabric and Quilt packs.
        facets.push(vec!["categories:fabric".into(), "categories:quilt".into()]);
    }
    let index = match sort {
        "downloads" | "follows" | "newest" | "updated" => sort,
        _ => "relevance",
    };
    let mut u = url::Url::parse(&format!("{MODRINTH}/search")).unwrap();
    u.query_pairs_mut()
        .append_pair("query", query)
        .append_pair("facets", &json!(facets).to_string())
        .append_pair("index", index)
        .append_pair("offset", &offset.to_string())
        .append_pair("limit", &PAGE.to_string());
    let r = network::json(u.as_str())?;
    let hits: Vec<Value> = r["hits"].as_array().cloned().unwrap_or_default().iter().map(|h| {
        let slug = h["slug"].as_str().unwrap_or("");
        json!({
            "provider": "modrinth",
            "id": h["project_id"],
            "slug": slug,
            "kind": h["project_type"],
            "title": h["title"],
            "author": h["author"],
            "description": h["description"],
            "icon": h["icon_url"].as_str().filter(|s| !s.is_empty()),
            "image": h["featured_gallery"].as_str().or_else(|| h["gallery"][0].as_str()),
            "downloads": h["downloads"],
            "follows": h["follows"],
            "categories": h["display_categories"].as_array().or_else(|| h["categories"].as_array()).cloned().unwrap_or_default(),
            "updated": h["date_modified"],
            "url": format!("https://modrinth.com/{}/{}", h["project_type"].as_str().unwrap_or("mod"), slug),
        })
    }).collect();
    Ok(json!({"hits": hits, "total": r["total_hits"], "offset": offset, "provider": "modrinth"}))
}

fn cf_class(kind: &str) -> u32 {
    match kind {
        "modpack" => 4471,
        "resourcepack" => 12,
        "shader" => 6552,
        _ => 6,
    }
}

fn cf_search(query: &str, kind: &str, game: Option<&Game>, sort: &str, offset: u64, category: Option<&str>) -> Result<Value> {
    if kind == "modpack" {
        return Err("CurseForge modpacks can't be installed by LOAM yet. Use a Modrinth modpack, or bring an existing CurseForge instance with Migration Hub.".into());
    }
    let field = match sort {
        "downloads" => 6,
        "updated" => 3,
        "newest" => 11,
        "follows" => 12,
        _ => 2,
    };
    let mut path = format!(
        "/mods/search?gameId={MINECRAFT}&classId={}&sortField={field}&sortOrder=desc&index={offset}&pageSize={PAGE}",
        cf_class(kind)
    );
    if let Some(c) = category.filter(|c| c.chars().all(|ch| ch.is_ascii_digit())) {
        path.push_str(&format!("&categoryId={c}"));
    }
    if !query.is_empty() {
        path.push_str("&searchFilter=");
        path.push_str(&url::form_urlencoded::byte_serialize(query.as_bytes()).collect::<String>());
    }
    if let Some(g) = game {
        path.push_str(&format!("&gameVersion={}", g.version));
        // Quilt runs Fabric mods; CurseForge lists most of them as Fabric (4).
        if kind == "mod" && imports::loader_kind(g) != "vanilla" {
            path.push_str("&modLoaderType=4");
        }
    }
    let r = cf(&path)?;
    let hits: Vec<Value> = r["data"].as_array().cloned().unwrap_or_default().iter().map(|m| json!({
        "provider": "curseforge",
        "id": m["id"].as_u64().map(|i| i.to_string()),
        "slug": m["slug"],
        "kind": kind,
        "title": m["name"],
        "author": m["authors"][0]["name"],
        "description": m["summary"],
        "icon": m["logo"]["thumbnailUrl"],
        "image": m["screenshots"][0]["thumbnailUrl"],
        "downloads": m["downloadCount"],
        "follows": m["thumbsUpCount"],
        "categories": m["categories"].as_array().map(|c| c.iter().filter_map(|x| x["name"].as_str()).map(Value::from).collect::<Vec<_>>()).unwrap_or_default(),
        "updated": m["dateModified"],
        "url": m["links"]["websiteUrl"],
    })).collect();
    Ok(json!({"hits": hits, "total": r["pagination"]["totalCount"], "offset": offset, "provider": "curseforge"}))
}

// ---------------------------------------------------------------- project details

pub fn project(a: &Value) -> Result<Value> {
    let id = id_ok(a["id"].as_str().unwrap_or(""))?;
    match a["provider"].as_str().unwrap_or("modrinth") {
        "modrinth" => {
            let p = network::json(&format!("{MODRINTH}/project/{id}"))?;
            let body: String = p["body"].as_str().unwrap_or("").chars().take(30_000).collect();
            Ok(json!({
                "provider": "modrinth", "id": p["id"], "slug": p["slug"], "kind": p["project_type"],
                "title": p["title"], "description": p["description"], "body": body,
                "icon": p["icon_url"], "downloads": p["downloads"], "follows": p["followers"],
                "categories": p["categories"], "license": p["license"]["id"], "updated": p["updated"],
                "gallery": p["gallery"].as_array().map(|g| g.iter().map(|i| json!({"url": i["url"], "title": i["title"]})).collect::<Vec<_>>()).unwrap_or_default(),
                "links": {"source": p["source_url"], "issues": p["issues_url"], "wiki": p["wiki_url"], "discord": p["discord_url"]},
                "url": format!("https://modrinth.com/{}/{}", p["project_type"].as_str().unwrap_or("mod"), p["slug"].as_str().unwrap_or(id)),
            }))
        }
        "curseforge" => {
            let m = cf(&format!("/mods/{id}"))?["data"].clone();
            Ok(json!({
                "provider": "curseforge", "id": id, "slug": m["slug"], "kind": a["kind"],
                "title": m["name"], "description": m["summary"], "body": "",
                "icon": m["logo"]["thumbnailUrl"], "downloads": m["downloadCount"], "follows": m["thumbsUpCount"],
                "categories": m["categories"].as_array().map(|c| c.iter().filter_map(|x| x["name"].as_str()).map(Value::from).collect::<Vec<_>>()).unwrap_or_default(),
                "license": Value::Null, "updated": m["dateModified"],
                "gallery": m["screenshots"].as_array().map(|g| g.iter().map(|i| json!({"url": i["url"], "title": i["title"]})).collect::<Vec<_>>()).unwrap_or_default(),
                "links": {"source": m["links"]["sourceUrl"], "issues": m["links"]["issuesUrl"], "wiki": m["links"]["wikiUrl"], "discord": Value::Null},
                "url": m["links"]["websiteUrl"],
            }))
        }
        _ => Err("Unknown content source.".into()),
    }
}

/// Versions of a project that fit the game, newest first.
pub fn versions(core: &Core, a: &Value) -> Result<Value> {
    let id = id_ok(a["id"].as_str().unwrap_or(""))?;
    let kind = a["kind"].as_str().unwrap_or("mod");
    let game = match a["gameId"].as_str() {
        Some(g) if !g.is_empty() && kind != "modpack" => Some(core.game(g)?),
        _ => None,
    };
    match a["provider"].as_str().unwrap_or("modrinth") {
        "modrinth" => {
            let list = mr_versions(id, game.as_ref(), kind)?;
            Ok(json!(list.iter().take(30).map(|v| json!({
                "id": v["id"], "name": v["name"], "number": v["version_number"], "type": v["version_type"],
                "date": v["date_published"], "downloads": v["downloads"], "loaders": v["loaders"],
                "gameVersions": v["game_versions"],
            })).collect::<Vec<_>>()))
        }
        "curseforge" => {
            let game = game.ok_or("Choose a game first.")?;
            let list = cf_files(id, &game, kind)?;
            Ok(json!(list.iter().take(30).map(|f| json!({
                "id": f["id"].as_u64().map(|i| i.to_string()), "name": f["displayName"], "number": f["fileName"],
                "type": match f["releaseType"].as_u64() { Some(2) => "beta", Some(3) => "alpha", _ => "release" },
                "date": f["fileDate"], "downloads": f["downloadCount"], "loaders": [], "gameVersions": f["gameVersions"],
                "blocked": f["downloadUrl"].is_null(),
            })).collect::<Vec<_>>()))
        }
        _ => Err("Unknown content source.".into()),
    }
}

fn mr_versions(id: &str, game: Option<&Game>, kind: &str) -> Result<Vec<Value>> {
    let mut u = url::Url::parse(&format!("{MODRINTH}/project/{id}/version")).unwrap();
    if let Some(g) = game {
        u.query_pairs_mut().append_pair("game_versions", &json!([g.version]).to_string());
        let l = loaders(g, kind);
        if !l.is_empty() {
            u.query_pairs_mut().append_pair("loaders", &json!(l).to_string());
        }
    } else if kind == "modpack" {
        u.query_pairs_mut().append_pair("loaders", &json!(["fabric", "quilt"]).to_string());
    }
    Ok(network::json(u.as_str())?.as_array().cloned().unwrap_or_default())
}

/// Prefer the newest release; fall back to the newest beta or alpha.
fn newest(list: &[Value], is_release: impl Fn(&Value) -> bool) -> Option<Value> {
    list.iter().find(|v| is_release(v)).or_else(|| list.first()).cloned()
}

fn cf_files(id: &str, game: &Game, kind: &str) -> Result<Vec<Value>> {
    let mut path = format!("/mods/{id}/files?gameVersion={}&pageSize=50", game.version);
    if kind == "mod" {
        path.push_str("&modLoaderType=4");
    }
    let mut list = cf(&path)?["data"].as_array().cloned().unwrap_or_default();
    let quilt = imports::loader_kind(game) == "quilt";
    list.retain(|f| {
        let gv = f["gameVersions"].as_array().cloned().unwrap_or_default();
        gv.iter().any(|v| v == game.version.as_str())
            && (kind != "mod" || gv.iter().any(|v| v == "Fabric" || (quilt && v == "Quilt")))
    });
    list.sort_by(|a, b| b["fileDate"].as_str().cmp(&a["fileDate"].as_str()));
    Ok(list)
}

// ---------------------------------------------------------------- manifest

fn manifest(dir: &Path) -> Value {
    fs::read(dir.join(MANIFEST))
        .ok()
        .and_then(|b| serde_json::from_slice::<Value>(&b).ok())
        .filter(|v| v["items"].is_object())
        .unwrap_or_else(|| json!({"schema": 1, "items": {}}))
}

fn present(dir: &Path, rel: &str) -> bool {
    dir.join(rel).is_file() || dir.join(format!("{rel}.disabled")).is_file()
}

fn installed_project(dir: &Path, m: &Value, provider: &str, project: &str) -> Option<String> {
    m["items"].as_object()?.iter().find_map(|(rel, v)| {
        (v["provider"] == provider && v["project"] == project && present(dir, rel)).then(|| rel.clone())
    })
}

/// Content LOAM installed into a game from Discover that is still on disk.
pub fn installed(core: &Core, game_id: &str) -> Result<Value> {
    let dir = core.game_dir(game_id)?;
    let m = manifest(&dir);
    let items: Vec<Value> = m["items"].as_object().map(|o| o.iter().filter(|(rel, _)| present(&dir, rel)).map(|(rel, v)| {
        let mut v = v.clone();
        v["path"] = json!(rel);
        v["enabled"] = json!(dir.join(rel).is_file());
        v
    }).collect()).unwrap_or_default();
    Ok(json!(items))
}

// ---------------------------------------------------------------- resolve

struct Plan<'a> {
    game: &'a Game,
    dir: &'a Path,
    manifest: &'a Value,
    files: Vec<Resolved>,
    seen: HashSet<String>,
    notes: Vec<String>,
}

fn mr_resolve(p: &mut Plan, project: &str, version: Option<&str>, kind_hint: &str, depth: u8) -> Result<()> {
    let project = id_ok(project)?;
    if !p.seen.insert(format!("modrinth:{project}")) {
        return Ok(());
    }
    let info = network::json(&format!("{MODRINTH}/project/{project}"))?;
    let title = info["title"].as_str().unwrap_or(project).to_owned();
    let kind = info["project_type"].as_str().unwrap_or(kind_hint).to_owned();
    let pid = info["id"].as_str().unwrap_or(project).to_owned();
    if installed_project(p.dir, p.manifest, "modrinth", &pid).is_some() {
        return if depth == 0 { Err(format!("{title} is already in this game.")) } else { Ok(()) };
    }
    if let Some(why) = unsupported(p.game, &kind) {
        return Err(why.into());
    }
    folder(&kind)?;
    let pinned = match version {
        Some(v) => Some(network::json(&format!("{MODRINTH}/version/{}", id_ok(v)?))?),
        None => None,
    };
    // A pinned dependency for another Minecraft version falls back to a compatible one.
    let v = match pinned.filter(|v| fits_mr(v, p.game, &kind)) {
        Some(v) => v,
        None => newest(&mr_versions(&pid, Some(p.game), &kind)?, |v| v["version_type"] == "release").ok_or_else(|| {
            format!("{title} has no version for Minecraft {}{}.", p.game.version, loader_suffix(p.game, &kind))
        })?,
    };
    let files = v["files"].as_array().cloned().unwrap_or_default();
    let f = files.iter().find(|f| f["primary"] == true).or_else(|| files.first()).ok_or(format!("{title} has no downloadable file."))?;
    let url = f["url"].as_str().ok_or("No file URL")?;
    if url::Url::parse(url).ok().and_then(|u| u.host_str().map(str::to_owned)).as_deref() != Some("cdn.modrinth.com") {
        return Err(format!("{title}'s file is outside the Modrinth CDN."));
    }
    p.files.push(Resolved {
        provider: "modrinth",
        project: pid,
        version: v["id"].as_str().unwrap_or("").into(),
        version_name: v["version_number"].as_str().unwrap_or("").into(),
        title: title.clone(),
        icon: info["icon_url"].as_str().map(str::to_owned),
        kind: kind.clone(),
        url: url.into(),
        filename: f["filename"].as_str().ok_or("No filename")?.into(),
        hash: f["hashes"]["sha512"].as_str().ok_or("Missing checksum")?.into(),
        algo: "sha512",
        size: f["size"].as_u64().unwrap_or(0),
        dependency: depth > 0,
    });
    if depth >= 6 {
        return Ok(());
    }
    for d in v["dependencies"].as_array().cloned().unwrap_or_default() {
        let Some(dep) = d["project_id"].as_str() else { continue };
        match d["dependency_type"].as_str() {
            Some("required") => {
                if let Err(e) = mr_resolve(p, dep, d["version_id"].as_str(), "mod", depth + 1) {
                    p.notes.push(format!("{title} needs another mod that couldn't be added: {e}"));
                }
            }
            Some("incompatible") if installed_project(p.dir, p.manifest, "modrinth", dep).is_some() => {
                p.notes.push(format!("{title} is marked incompatible with a mod already in this game."));
            }
            _ => {}
        }
    }
    Ok(())
}

fn fits_mr(v: &Value, game: &Game, kind: &str) -> bool {
    let gv = v["game_versions"].as_array().is_some_and(|a| a.iter().any(|x| x == game.version.as_str()));
    let l = loaders(game, kind);
    let lv = l.is_empty() || v["loaders"].as_array().is_some_and(|a| a.iter().any(|x| l.iter().any(|w| x == *w)));
    gv && lv
}

fn loader_suffix(game: &Game, kind: &str) -> &'static str {
    match (kind, imports::loader_kind(game)) {
        ("mod", "quilt") => " with Quilt",
        ("mod", "fabric") => " with Fabric",
        _ => "",
    }
}

fn cf_resolve(p: &mut Plan, project: &str, file: Option<&str>, kind_hint: &str, depth: u8) -> Result<()> {
    let project = id_ok(project)?;
    if !p.seen.insert(format!("curseforge:{project}")) {
        return Ok(());
    }
    let info = cf(&format!("/mods/{project}"))?["data"].clone();
    let title = info["name"].as_str().unwrap_or(project).to_owned();
    let kind = match info["classId"].as_u64() {
        Some(12) => "resourcepack",
        Some(6552) => "shader",
        Some(6) => "mod",
        Some(4471) => return Err("CurseForge modpacks can't be installed by LOAM yet.".into()),
        _ => kind_hint,
    }
    .to_owned();
    if installed_project(p.dir, p.manifest, "curseforge", project).is_some() {
        return if depth == 0 { Err(format!("{title} is already in this game.")) } else { Ok(()) };
    }
    if let Some(why) = unsupported(p.game, &kind) {
        return Err(why.into());
    }
    let f = match file {
        Some(fid) => cf(&format!("/mods/{project}/files/{}", id_ok(fid)?))?["data"].clone(),
        None => newest(&cf_files(project, p.game, &kind)?, |f| f["releaseType"] == 1)
            .ok_or_else(|| format!("{title} has no file for Minecraft {}{}.", p.game.version, loader_suffix(p.game, &kind)))?,
    };
    let url = f["downloadUrl"].as_str().ok_or_else(|| {
        format!("{title}'s author only allows downloads from the CurseForge website.")
    })?;
    let host = url::Url::parse(url).ok().and_then(|u| u.host_str().map(str::to_owned)).unwrap_or_default();
    if !matches!(host.as_str(), "edge.forgecdn.net" | "mediafilez.forgecdn.net") {
        return Err(format!("{title}'s file is outside the CurseForge CDN."));
    }
    let sha1 = f["hashes"].as_array().and_then(|h| h.iter().find(|x| x["algo"] == 1)).and_then(|x| x["value"].as_str())
        .ok_or(format!("{title} has no checksum on CurseForge."))?;
    p.files.push(Resolved {
        provider: "curseforge",
        project: project.into(),
        version: f["id"].as_u64().map(|i| i.to_string()).unwrap_or_default(),
        version_name: f["displayName"].as_str().unwrap_or("").into(),
        title: title.clone(),
        icon: info["logo"]["thumbnailUrl"].as_str().map(str::to_owned),
        kind: kind.clone(),
        url: url.into(),
        filename: f["fileName"].as_str().ok_or("No filename")?.into(),
        hash: sha1.into(),
        algo: "sha1",
        size: f["fileLength"].as_u64().unwrap_or(0),
        dependency: depth > 0,
    });
    if depth >= 6 {
        return Ok(());
    }
    for d in f["dependencies"].as_array().cloned().unwrap_or_default() {
        // relationType 3 = required dependency.
        if d["relationType"] == 3 {
            if let Some(dep) = d["modId"].as_u64() {
                if let Err(e) = cf_resolve(p, &dep.to_string(), None, "mod", depth + 1) {
                    p.notes.push(format!("{title} needs another mod that couldn't be added: {e}"));
                }
            }
        }
    }
    Ok(())
}

// ---------------------------------------------------------------- install

/// Opens a downloaded file and checks it is the kind of content it claims to be.
fn verify_file(path: &Path, kind: &str, game: &Game) -> Result<()> {
    let (names, meta) = imports::archive_meta(path)?;
    match kind {
        "mod" => {
            let quilt = imports::loader_kind(game) == "quilt";
            if meta["fabric.mod.json"].is_null() && !(quilt && !meta["quilt.mod.json"].is_null()) {
                return Err("isn't a Fabric or Quilt mod".into());
            }
        }
        "resourcepack" if meta["pack.mcmeta"].is_null() => return Err("isn't a resource pack".into()),
        "shader" if !names.iter().any(|n| n.starts_with("shaders/")) => return Err("isn't a shader pack".into()),
        _ => {}
    }
    Ok(())
}

pub fn install(core: &Core, a: &Value) -> Result<Value> {
    let game_id = a["gameId"].as_str().ok_or("Choose a game first.")?;
    core.ensure_idle(game_id)?;
    let game = core.game(game_id)?;
    let dir = core.game_dir(game_id)?;
    let provider = a["provider"].as_str().unwrap_or("modrinth");
    let kind = a["kind"].as_str().unwrap_or("mod");
    let m = manifest(&dir);
    let mut plan = Plan { game: &game, dir: &dir, manifest: &m, files: vec![], seen: HashSet::new(), notes: vec![] };
    core.step(game_id, "planning", "Finding compatible files");
    let project = a["id"].as_str().unwrap_or("");
    match provider {
        "modrinth" => mr_resolve(&mut plan, project, a["versionId"].as_str(), kind, 0)?,
        "curseforge" => cf_resolve(&mut plan, project, a["versionId"].as_str(), kind, 0)?,
        _ => return Err("Unknown content source.".into()),
    }
    let Plan { files, mut notes, .. } = plan;
    let total: u64 = files.iter().map(|f| f.size).sum();
    let stage = core.root.join("cache/content").join(uuid::Uuid::new_v4().to_string());
    let mut done = 0u64;
    let mut placed: Vec<(PathBuf, Resolved)> = vec![];
    for f in &files {
        core.cancelled()?;
        core.emit(Progress {
            id: uuid::Uuid::new_v4().to_string(), game_id: game_id.into(), phase: "downloading".into(),
            message: format!("Downloading {}", f.title), done, total, files: placed.len() as u64, speed: 0, error: None,
        });
        let name = storage::safe_relative(&f.filename)?;
        if name.components().count() != 1 {
            return Err(format!("{} has an unsafe file name.", f.title));
        }
        let path = stage.join(&name);
        network::download(&f.url, &path, &f.hash, f.algo, f.size, core, &mut |_| {})?;
        if let Err(why) = verify_file(&path, &f.kind, &game) {
            let _ = fs::remove_dir_all(&stage);
            return Err(format!("{} {why}; nothing was installed.", f.title));
        }
        done += f.size;
        placed.push((path, f.clone()));
    }
    // Every file is verified before any of them reaches the game folder.
    let mut m = manifest(&dir);
    let mut added = vec![];
    for (path, f) in placed {
        let rel = format!("{}/{}", folder(&f.kind)?, f.filename);
        let target = dir.join(&rel);
        if present(&dir, &rel) {
            notes.push(format!("{} was already in {}.", f.filename, folder(&f.kind)?));
            continue;
        }
        fs::create_dir_all(target.parent().unwrap()).map_err(|e| e.to_string())?;
        storage::no_links(&target)?;
        if fs::rename(&path, &target).is_err() {
            fs::copy(&path, &target).map_err(|e| e.to_string())?;
        }
        m["items"][&rel] = json!({
            "provider": f.provider, "project": f.project, "version": f.version, "versionName": f.version_name,
            "title": f.title, "icon": f.icon, "kind": f.kind, "dependency": f.dependency,
            "sha1": storage::hash(&target, "sha1")?, "installed": chrono::Utc::now().to_rfc3339(),
        });
        added.push(json!({"title": f.title, "path": rel, "dependency": f.dependency}));
    }
    storage::write_json(&dir.join(MANIFEST), &m)?;
    let _ = fs::remove_dir_all(&stage);
    let main = files.first().map(|f| f.title.clone()).unwrap_or_default();
    let deps = added.iter().filter(|a| a["dependency"] == true).count();
    let message = match deps {
        0 => format!("{main} added to {}.", game.name),
        1 => format!("{main} and 1 required mod added to {}.", game.name),
        n => format!("{main} and {n} required mods added to {}.", game.name),
    };
    core.step(game_id, "ready", &message);
    Ok(json!({"installed": added, "notes": notes, "message": message}))
}

/// Downloads a Modrinth modpack so Smart Drop can create a game from it.
pub fn modpack(core: &Core, a: &Value) -> Result<Value> {
    if a["provider"].as_str().unwrap_or("modrinth") != "modrinth" {
        return Err("CurseForge modpacks can't be installed by LOAM yet.".into());
    }
    let id = id_ok(a["id"].as_str().unwrap_or(""))?;
    let v = match a["versionId"].as_str() {
        Some(v) => network::json(&format!("{MODRINTH}/version/{}", id_ok(v)?))?,
        None => newest(&mr_versions(id, None, "modpack")?, |v| v["version_type"] == "release")
            .ok_or("This modpack has no Fabric or Quilt version LOAM can run.")?,
    };
    let files = v["files"].as_array().cloned().unwrap_or_default();
    let f = files.iter().find(|f| f["primary"] == true).or_else(|| files.first()).ok_or("No pack file.")?;
    let name = f["filename"].as_str().ok_or("No filename")?;
    if !name.ends_with(".mrpack") {
        return Err("This modpack version isn't a Modrinth pack file.".into());
    }
    let url = f["url"].as_str().ok_or("No file URL")?;
    if url::Url::parse(url).ok().and_then(|u| u.host_str().map(str::to_owned)).as_deref() != Some("cdn.modrinth.com") {
        return Err("The pack file is outside the Modrinth CDN.".into());
    }
    let path = core.root.join("cache/imports").join(uuid::Uuid::new_v4().to_string()).join(storage::safe_relative(name)?);
    network::download(url, &path, f["hashes"]["sha512"].as_str().ok_or("Missing checksum")?, "sha512", f["size"].as_u64().unwrap_or(0), core, &mut |_| {})?;
    Ok(json!({"path": path}))
}

// ---------------------------------------------------------------- updates

fn content_files(dir: &Path) -> Vec<(String, &'static str)> {
    let mut out = vec![];
    for (folder, kind, ext) in [("mods", "mod", "jar"), ("resourcepacks", "resourcepack", "zip"), ("shaderpacks", "shader", "zip")] {
        if let Ok(entries) = fs::read_dir(dir.join(folder)) {
            for e in entries.flatten() {
                let name = e.file_name().to_string_lossy().into_owned();
                if e.path().is_file() && name.to_lowercase().ends_with(ext) {
                    out.push((format!("{folder}/{name}"), kind));
                }
            }
        }
    }
    out
}

/// Files with a newer Modrinth version for this game (works for any file Modrinth knows).
pub fn updates(core: &Core, game_id: &str) -> Result<Value> {
    let game = core.game(game_id)?;
    let dir = core.game_dir(game_id)?;
    let mut found = vec![];
    for kind in ["mod", "resourcepack", "shader"] {
        let files: Vec<(String, String)> = content_files(&dir).into_iter().filter(|(_, k)| *k == kind)
            .filter_map(|(rel, _)| storage::hash(&dir.join(&rel), "sha1").ok().map(|h| (rel, h))).collect();
        let l = loaders(&game, kind);
        if files.is_empty() || (kind != "resourcepack" && l.is_empty()) {
            continue;
        }
        let hashes: Vec<&str> = files.iter().map(|(_, h)| h.as_str()).collect();
        let latest = network::request(&format!("{MODRINTH}/version_files/update"), Some(&json!({
            "hashes": hashes, "algorithm": "sha1", "loaders": l, "game_versions": [game.version],
        })), &[])?;
        let current = network::request(&format!("{MODRINTH}/version_files"), Some(&json!({"hashes": hashes, "algorithm": "sha1"})), &[])?;
        for (rel, hash) in &files {
            let new = &latest[hash.as_str()];
            let Some(files) = new["files"].as_array() else { continue };
            if files.iter().any(|f| f["hashes"]["sha1"] == hash.as_str()) {
                continue;
            }
            found.push(json!({
                "path": rel, "kind": kind, "project": new["project_id"],
                "current": current[hash.as_str()]["version_number"], "latest": new["version_number"],
                "versionId": new["id"], "name": new["name"],
            }));
        }
    }
    let ids: Vec<&str> = found.iter().filter_map(|f| f["project"].as_str()).collect();
    if !ids.is_empty() {
        let mut u = url::Url::parse(&format!("{MODRINTH}/projects")).unwrap();
        u.query_pairs_mut().append_pair("ids", &json!(ids).to_string());
        let projects = network::json(u.as_str())?;
        for f in &mut found {
            if let Some(p) = projects.as_array().and_then(|a| a.iter().find(|p| p["id"] == f["project"])) {
                f["title"] = p["title"].clone();
                f["icon"] = p["icon_url"].clone();
            }
        }
    }
    Ok(json!(found))
}

/// Replaces one file with the given Modrinth version. The old file is kept in the cache.
pub fn update(core: &Core, a: &Value) -> Result<Value> {
    let game_id = a["gameId"].as_str().ok_or("Choose a game first.")?;
    core.ensure_idle(game_id)?;
    let game = core.game(game_id)?;
    let dir = core.game_dir(game_id)?;
    let rel = storage::safe_relative(a["path"].as_str().ok_or("Missing path")?)?;
    let first = rel.components().next().map(|c| c.as_os_str().to_string_lossy().into_owned()).unwrap_or_default();
    let kind = match first.as_str() {
        "mods" => "mod",
        "resourcepacks" => "resourcepack",
        "shaderpacks" => "shader",
        _ => return Err("Only mods, resource packs and shaders can be updated.".into()),
    };
    if rel.components().count() != 2 || !dir.join(&rel).is_file() {
        return Err("That file is no longer in this game.".into());
    }
    let v = network::json(&format!("{MODRINTH}/version/{}", id_ok(a["versionId"].as_str().unwrap_or(""))?))?;
    if !fits_mr(&v, &game, kind) {
        return Err("That version doesn't fit this game.".into());
    }
    let files = v["files"].as_array().cloned().unwrap_or_default();
    let f = files.iter().find(|f| f["primary"] == true).or_else(|| files.first()).ok_or("No file.")?;
    let url = f["url"].as_str().ok_or("No file URL")?;
    if url::Url::parse(url).ok().and_then(|u| u.host_str().map(str::to_owned)).as_deref() != Some("cdn.modrinth.com") {
        return Err("The file is outside the Modrinth CDN.".into());
    }
    let name = storage::safe_relative(f["filename"].as_str().ok_or("No filename")?)?;
    if name.components().count() != 1 {
        return Err("Unsafe file name.".into());
    }
    let stage = core.root.join("cache/content").join(uuid::Uuid::new_v4().to_string());
    let staged = stage.join(&name);
    core.step(game_id, "downloading", "Downloading update");
    network::download(url, &staged, f["hashes"]["sha512"].as_str().ok_or("Missing checksum")?, "sha512", f["size"].as_u64().unwrap_or(0), core, &mut |_| {})?;
    verify_file(&staged, kind, &game).map_err(|why| format!("The update {why}; nothing changed."))?;
    let old = dir.join(&rel);
    let new_rel = format!("{first}/{}", name.to_string_lossy());
    let same = new_rel == rel.to_string_lossy().replace('\\', "/");
    if !same && present(&dir, &new_rel) {
        return Err("A file with the new name is already in this game.".into());
    }
    // The new version goes in first; the old one is deleted only once it's in place, so a
    // failure never leaves the game without the mod.
    let target = dir.join(&new_rel);
    if same {
        fs::remove_file(&old).map_err(|e| e.to_string())?;
    }
    if fs::rename(&staged, &target).is_err() {
        fs::copy(&staged, &target).map_err(|e| e.to_string())?;
    }
    if !same {
        fs::remove_file(&old).map_err(|e| format!("Updated, but the old version couldn't be removed: {e}"))?;
    }
    let _ = fs::remove_dir_all(&stage);
    let mut m = manifest(&dir);
    let old_key = rel.to_string_lossy().replace('\\', "/");
    let mut entry = m["items"].as_object_mut().and_then(|o| o.remove(&old_key)).unwrap_or_else(|| json!({
        "provider": "modrinth", "project": v["project_id"], "kind": kind, "title": a["title"], "icon": a["icon"],
    }));
    entry["version"] = v["id"].clone();
    entry["versionName"] = v["version_number"].clone();
    entry["sha1"] = json!(storage::hash(&target, "sha1")?);
    entry["installed"] = json!(chrono::Utc::now().to_rfc3339());
    m["items"][&new_rel] = entry;
    storage::write_json(&dir.join(MANIFEST), &m)?;
    let message = format!("Updated to {}.", v["version_number"].as_str().unwrap_or("the latest version"));
    core.step(game_id, "ready", &message);
    Ok(json!({"path": new_rel, "message": message}))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn game(loader: Option<&str>) -> Game {
        let mut g: Game = serde_json::from_value(json!({
            "id": "00000000-0000-4000-8000-000000000001", "name": "T", "version": "1.21.4",
            "memory": 2048, "installed": true, "created": "2026-10-06"
        })).unwrap();
        g.loader = loader.map(str::to_owned);
        g
    }
    #[test]
    fn loader_rules() {
        assert_eq!(loaders(&game(Some("0.16.9")), "mod"), vec!["fabric"]);
        assert_eq!(loaders(&game(Some("quilt:0.26.4")), "mod"), vec!["quilt", "fabric"]);
        assert!(loaders(&game(None), "mod").is_empty());
        assert_eq!(loaders(&game(None), "resourcepack"), vec!["minecraft"]);
        assert!(unsupported(&game(None), "mod").is_some());
        assert!(unsupported(&game(None), "shader").is_some());
        assert!(unsupported(&game(Some("0.16.9")), "shader").is_none());
    }
    #[test]
    fn ids_are_restricted() {
        assert!(id_ok("AANobbMI").is_ok());
        assert!(id_ok("394468").is_ok());
        assert!(id_ok("../x").is_err());
        assert!(id_ok("a/b").is_err());
        assert!(id_ok("").is_err());
    }
    #[test]
    fn newest_prefers_release() {
        let list = vec![json!({"id":"b","version_type":"beta"}), json!({"id":"r","version_type":"release"})];
        assert_eq!(newest(&list, |v| v["version_type"] == "release").unwrap()["id"], "r");
        let betas = vec![json!({"id":"b","version_type":"beta"})];
        assert_eq!(newest(&betas, |v| v["version_type"] == "release").unwrap()["id"], "b");
    }
    #[test]
    fn version_fit() {
        let g = game(Some("quilt:0.26.4"));
        assert!(fits_mr(&json!({"game_versions":["1.21.4"],"loaders":["fabric"]}), &g, "mod"));
        assert!(!fits_mr(&json!({"game_versions":["1.21.1"],"loaders":["fabric"]}), &g, "mod"));
        assert!(!fits_mr(&json!({"game_versions":["1.21.4"],"loaders":["forge"]}), &g, "mod"));
    }
    #[test]
    fn manifest_tracks_disabled_files() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir_all(dir.path().join("mods")).unwrap();
        fs::write(dir.path().join("mods/a.jar.disabled"), b"x").unwrap();
        let m = json!({"items":{"mods/a.jar":{"provider":"modrinth","project":"P"},"mods/gone.jar":{"provider":"modrinth","project":"Q"}}});
        assert_eq!(installed_project(dir.path(), &m, "modrinth", "P").as_deref(), Some("mods/a.jar"));
        assert!(installed_project(dir.path(), &m, "modrinth", "Q").is_none());
    }
}
