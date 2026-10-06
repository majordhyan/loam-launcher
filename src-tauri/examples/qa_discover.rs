//! End-to-end QA for Discover (1.7.0) against the real Modrinth API, in an isolated data folder.
//! Usage: cargo run --example qa_discover -- <absolute empty test dir>
//! Creates Fabric, Quilt and Vanilla games, searches, installs a mod with a required dependency,
//! a resource pack and a shader, checks every file on disk, downloads a modpack, and runs the
//! update check after planting an older Sodium.
use loam_core::{commands, model::*, storage};
use serde_json::{json, Value};
use std::{
    fs,
    sync::{atomic::AtomicBool, Arc, Mutex},
};

fn main() {
    if let Err(e) = run() {
        eprintln!("QA FAILED: {e}");
        std::process::exit(1)
    }
}

fn check(ok: bool, what: &str) -> Result<()> {
    if ok {
        println!("  PASS  {what}");
        Ok(())
    } else {
        Err(format!("check failed: {what}"))
    }
}

fn run() -> Result<()> {
    let root = std::path::PathBuf::from(std::env::args().nth(1).ok_or("Usage: qa_discover <absolute test dir>")?);
    if !root.is_absolute() {
        return Err("Use an absolute test directory.".into());
    }
    let loam = root.join("discover data ü");
    let _ = fs::remove_dir_all(&loam);
    fs::create_dir_all(&loam).map_err(|e| e.to_string())?;
    let c: Shared = Arc::new(Core {
        root: loam.clone(),
        data: Mutex::new(Data::default()),
        progress: Mutex::new(None),
        cancel: AtomicBool::new(false),
        busy: AtomicBool::new(false),
        running: Mutex::new(Default::default()),
        pending: Mutex::new(Default::default()),
        app: None,
    });
    let x = |op: &str, a: Value| commands::execute(&c, op, a);
    let fabric = x("createGame", json!({"name":"Fabric QA","version":"1.21.4","loader":"0.16.9","memory":2048}))?;
    let quilt = x("createGame", json!({"name":"Quilt QA","version":"1.21.1","loader":"quilt:0.26.4","memory":2048}))?;
    let vanilla = x("createGame", json!({"name":"Vanilla QA","version":"1.21.4","loader":null,"memory":2048}))?;
    let (fid, qid, vid) = (fabric["id"].as_str().unwrap(), quilt["id"].as_str().unwrap(), vanilla["id"].as_str().unwrap());

    println!("1. Search");
    let r = x("discoverSearch", json!({"provider":"modrinth","kind":"mod","query":"iris","gameId":fid}))?;
    let hits = r["hits"].as_array().cloned().unwrap_or_default();
    check(!hits.is_empty() && r["total"].as_u64().unwrap_or(0) > 0, "Modrinth mod search returns hits for a Fabric 1.21.4 game")?;
    let iris = hits.iter().find(|h| h["slug"] == "iris").ok_or("Iris not in results")?;
    check(iris["icon"].as_str().is_some_and(|u| u.starts_with("https://cdn.modrinth.com/")), "hit has a Modrinth CDN icon")?;
    let packs = x("discoverSearch", json!({"provider":"modrinth","kind":"modpack","query":"","sort":"downloads"}))?;
    check(packs["hits"].as_array().is_some_and(|h| h.len() == 24), "modpack search pages 24 results")?;
    let err = x("discoverSearch", json!({"provider":"curseforge","kind":"mod","query":"sodium","gameId":fid}));
    check(err.as_ref().err().is_some_and(|e| e.contains("Settings")), "CurseForge without a key explains how to connect it")?;

    println!("2. Install with dependencies");
    let res = x("discoverInstall", json!({"provider":"modrinth","kind":"mod","id":iris["id"],"gameId":fid}))?;
    println!("        {}", res["message"]);
    let added = res["installed"].as_array().cloned().unwrap_or_default();
    check(added.iter().any(|a| a["title"] == "Iris Shaders"), "Iris installed")?;
    check(added.iter().any(|a| a["title"] == "Sodium" && a["dependency"] == true), "Sodium added as Iris's required dependency")?;
    let dir = c.game_dir(fid)?;
    for a in &added {
        let p = dir.join(a["path"].as_str().unwrap());
        check(p.is_file() && fs::metadata(&p).map(|m| m.len()).unwrap_or(0) > 10_000, &format!("{} is on disk", a["path"]))?;
    }
    check(x("discoverInstall", json!({"provider":"modrinth","kind":"mod","id":iris["id"],"gameId":fid})).err().is_some_and(|e| e.contains("already")), "installing again says it's already there")?;
    let installed = x("discoverInstalled", json!({"gameId":fid}))?;
    check(installed.as_array().map(|a| a.len()) == Some(added.len()), "installed list matches the manifest")?;
    let cache_left = loam.join("cache/content");
    check(!cache_left.exists() || fs::read_dir(&cache_left).map(|d| d.count()).unwrap_or(0) == 0, "staging folder cleaned up")?;
    check(!c.busy.load(std::sync::atomic::Ordering::SeqCst), "busy flag released")?;

    println!("3. Resource pack and shader");
    let rp = x("discoverSearch", json!({"provider":"modrinth","kind":"resourcepack","query":"fresh animations","gameId":fid}))?;
    let rp0 = rp["hits"][0].clone();
    let r = x("discoverInstall", json!({"provider":"modrinth","kind":"resourcepack","id":rp0["id"],"gameId":fid}))?;
    check(r["installed"][0]["path"].as_str().is_some_and(|p| p.starts_with("resourcepacks/")), &format!("resource pack '{}' installed into resourcepacks/", rp0["title"].as_str().unwrap_or("?")))?;
    let sh = x("discoverSearch", json!({"provider":"modrinth","kind":"shader","query":"complementary","gameId":fid}))?;
    let sh0 = sh["hits"][0].clone();
    let r = x("discoverInstall", json!({"provider":"modrinth","kind":"shader","id":sh0["id"],"gameId":fid}))?;
    check(r["installed"][0]["path"].as_str().is_some_and(|p| p.starts_with("shaderpacks/")), &format!("shader '{}' installed into shaderpacks/", sh0["title"].as_str().unwrap_or("?")))?;
    check(x("discoverInstall", json!({"provider":"modrinth","kind":"mod","id":iris["id"],"gameId":vid})).err().is_some_and(|e| e.contains("Fabric or Quilt")), "mods are refused for a Vanilla game")?;

    println!("4. Quilt game takes Fabric mods");
    let lithium = x("discoverSearch", json!({"provider":"modrinth","kind":"mod","query":"lithium","gameId":qid}))?;
    let l0 = lithium["hits"].as_array().and_then(|h| h.iter().find(|h| h["slug"] == "lithium").cloned()).ok_or("Lithium not found for Quilt")?;
    let r = x("discoverInstall", json!({"provider":"modrinth","kind":"mod","id":l0["id"],"gameId":qid}))?;
    check(r["installed"][0]["path"].as_str().is_some_and(|p| p.starts_with("mods/lithium")), "Lithium installed into the Quilt 1.21.1 game")?;

    println!("5. Updates");
    let versions = x("discoverVersions", json!({"provider":"modrinth","kind":"mod","id":"AANobbMI","gameId":fid}))?;
    let list = versions.as_array().cloned().unwrap_or_default();
    check(list.len() >= 2, "Sodium lists several versions for Fabric 1.21.4")?;
    // Replace the installed Sodium with an older one, then expect an update.
    let sodium_path = added.iter().find(|a| a["title"] == "Sodium").and_then(|a| a["path"].as_str()).unwrap().to_owned();
    fs::remove_file(dir.join(&sodium_path)).map_err(|e| e.to_string())?;
    let older = list.last().unwrap();
    let v = loam_core::network::json(&format!("https://api.modrinth.com/v2/version/{}", older["id"].as_str().unwrap()))?;
    let f = &v["files"][0];
    let old_path = dir.join("mods").join(f["filename"].as_str().unwrap());
    loam_core::network::download(f["url"].as_str().unwrap(), &old_path, f["hashes"]["sha512"].as_str().unwrap(), "sha512", f["size"].as_u64().unwrap(), &c, &mut |_| {})?;
    let ups = x("discoverUpdates", json!({"gameId":fid}))?;
    let up = ups.as_array().and_then(|a| a.iter().find(|u| u["title"] == "Sodium").cloned()).ok_or("no Sodium update found")?;
    println!("        Sodium {} -> {}", up["current"], up["latest"]);
    check(up["current"] == older["number"] && up["latest"] != older["number"], "update check finds the newer Sodium")?;
    let r = x("discoverUpdate", json!({"gameId":fid,"path":up["path"],"versionId":up["versionId"],"title":"Sodium"}))?;
    let new_path = dir.join(r["path"].as_str().unwrap());
    check(new_path.is_file() && !old_path.exists(), "update replaced the old file")?;
    check(fs::read_dir(loam.join("cache/replaced")).map(|d| d.count()).unwrap_or(0) == 1, "old file kept in cache/replaced")?;
    let after = x("discoverUpdates", json!({"gameId":fid}))?;
    check(!after.as_array().unwrap().iter().any(|u| u["title"] == "Sodium"), "no Sodium update after updating")?;

    println!("6. Modpack download");
    let pack = x("discoverSearch", json!({"provider":"modrinth","kind":"modpack","query":"fabulously optimized"}))?;
    let p0 = pack["hits"].as_array().and_then(|h| h.iter().find(|h| h["slug"] == "fabulously-optimized").cloned()).ok_or("FO not found")?;
    let r = x("discoverModpack", json!({"provider":"modrinth","id":p0["id"]}))?;
    let path = r["path"].as_str().unwrap();
    check(path.ends_with(".mrpack") && std::path::Path::new(path).is_file(), "modpack .mrpack downloaded for Smart Drop")?;
    let cls = x("classifyDrop", json!({"source":path}))?;
    check(cls["kind"] == "mrpack" && !cls["newGame"].is_null(), "Smart Drop recognises the pack and offers a matching new game")?;

    println!("7. Project details");
    let p = x("discoverProject", json!({"provider":"modrinth","id":"AANobbMI"}))?;
    check(p["title"] == "Sodium" && p["body"].as_str().is_some_and(|b| b.len() > 100) && p["url"] == "https://modrinth.com/mod/sodium", "project page has title, body and link")?;

    let _ = storage::hash(&new_path, "sha1")?;
    println!("Discover QA passed.");
    Ok(())
}
