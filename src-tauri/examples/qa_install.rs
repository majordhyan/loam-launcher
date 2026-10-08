//! End-to-end QA for Discover installs (1.9): plan preview, destinations, shader → Iris,
//! version/loader filters, cancel and rollback, against the real Modrinth API in an isolated
//! data folder. Usage: cargo run --example qa_install -- <absolute empty test dir>
use loam_core::{commands, model::*};
use serde_json::{json, Value};
use std::{
    fs,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
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

/// Files directly inside a folder (empty when it doesn't exist).
fn names(dir: &std::path::Path) -> Vec<String> {
    fs::read_dir(dir).map(|rd| rd.flatten().map(|e| e.file_name().to_string_lossy().into_owned()).collect()).unwrap_or_default()
}

fn run() -> Result<()> {
    let root = std::path::PathBuf::from(std::env::args().nth(1).ok_or("Usage: qa_install <absolute test dir>")?);
    if !root.is_absolute() {
        return Err("Use an absolute test directory.".into());
    }
    let loam = root.join("install data");
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
    let game = x("createGame", json!({"name":"Install QA","version":"1.21.4","loader":"0.16.9","memory":2048}))?;
    let gid = game["id"].as_str().unwrap().to_owned();
    let dir = c.game_dir(&gid)?;
    let staging = loam.join("cache/content");

    println!("1. Search filters (Modrinth, documented facets)");
    let r = x("discoverSearch", json!({"provider":"modrinth","kind":"mod","query":"","compatible":false,"version":"1.20.1","loader":"forge","sort":"downloads"}))?;
    check(r["hits"].as_array().is_some_and(|h| !h.is_empty()), "explicit Minecraft 1.20.1 + Forge filter returns mods")?;
    let shaders = x("discoverCategories", json!({"provider":"modrinth","kind":"shader"}))?;
    check(shaders.as_array().is_some_and(|l| l.iter().any(|c| c["group"] == "features" || c["group"] == "categories")), "shader categories come from Modrinth's tag list")?;
    let rp = x("discoverSearch", json!({"provider":"modrinth","kind":"resourcepack","query":"","gameId":gid}))?;
    check(rp["hits"].as_array().is_some_and(|h| h.iter().all(|x| x["kind"] == "resourcepack")), "resource & texture pack search returns only resource packs")?;

    println!("2. Plan preview for a shader pack on a game without Iris");
    let shader = x("discoverSearch", json!({"provider":"modrinth","kind":"shader","query":"complementary reimagined","gameId":gid}))?;
    let sid = shader["hits"].as_array().and_then(|h| h.first()).and_then(|h| h["id"].as_str()).ok_or("no shader hit")?.to_owned();
    let plan = x("discoverPlan", json!({"provider":"modrinth","kind":"shader","id":sid,"gameId":gid}))?;
    let files = plan["files"].as_array().cloned().unwrap_or_default();
    for f in &files {
        println!("        {} → {} ({} bytes{})", f["title"].as_str().unwrap_or(""), f["destination"].as_str().unwrap_or(""), f["size"], if f["dependency"] == true { ", required" } else { "" });
    }
    check(files.first().is_some_and(|f| f["destination"].as_str().is_some_and(|d| d.starts_with("shaderpacks/"))), "the shader pack goes to shaderpacks/")?;
    check(files.iter().any(|f| f["title"].as_str().is_some_and(|t| t.contains("Iris")) && f["destination"].as_str().is_some_and(|d| d.starts_with("mods/"))), "Iris is added to mods/ because the game has none")?;
    check(files.iter().any(|f| f["title"].as_str().is_some_and(|t| t.contains("Sodium"))), "Sodium comes along as Iris's required mod")?;
    check(names(&dir.join("mods")).is_empty() && names(&dir.join("shaderpacks")).is_empty(), "a plan downloads and changes nothing")?;

    println!("3. Rollback when moving files into the game fails part-way");
    let last = files.last().and_then(|f| f["destination"].as_str()).ok_or("no files")?.to_owned();
    // A folder squatting on the last file's name makes that move fail after the others succeeded.
    fs::create_dir_all(dir.join(&last)).map_err(|e| e.to_string())?;
    let r = x("discoverInstall", json!({"provider":"modrinth","kind":"shader","id":sid,"gameId":gid}));
    println!("        {}", r.as_ref().err().map(String::as_str).unwrap_or("(installed)"));
    check(r.as_ref().is_err_and(|e| e.contains("Nothing was changed")), "the install reports that nothing was changed")?;
    let mods: Vec<String> = names(&dir.join("mods")).into_iter().filter(|n| !dir.join("mods").join(n).is_dir()).collect();
    check(mods.is_empty() && names(&dir.join("shaderpacks")).iter().all(|n| dir.join("shaderpacks").join(n).is_dir()), "files moved before the failure were taken back out")?;
    check(names(&staging).is_empty(), "the staging folder is gone")?;
    fs::remove_dir_all(dir.join(&last)).map_err(|e| e.to_string())?;

    println!("4. Cancel mid-install");
    let flag = Arc::clone(&c);
    let stopper = std::thread::spawn(move || {
        // Cancel as soon as the first download is under way.
        for _ in 0..400 {
            if flag.busy.load(Ordering::SeqCst) {
                std::thread::sleep(Duration::from_millis(150));
                flag.cancel.store(true, Ordering::SeqCst);
                return;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
    });
    let r = x("discoverInstall", json!({"provider":"modrinth","kind":"shader","id":sid,"gameId":gid}));
    stopper.join().ok();
    println!("        {}", r.as_ref().err().map(String::as_str).unwrap_or("(finished before the cancel landed)"));
    if r.is_err() {
        check(r.as_ref().is_err_and(|e| e.starts_with("Cancelled")), "cancel stops the install")?;
        check(names(&dir.join("mods")).is_empty() && names(&dir.join("shaderpacks")).is_empty(), "nothing reached the game after cancelling")?;
    } else {
        println!("  NOTE  the downloads finished before the cancel; the install completed normally");
    }
    check(names(&staging).is_empty(), "no partial downloads are left in the staging folder")?;
    c.cancel.store(false, Ordering::SeqCst);

    println!("5. Full install lands in the right folders");
    if names(&dir.join("shaderpacks")).is_empty() {
        let r = x("discoverInstall", json!({"provider":"modrinth","kind":"shader","id":sid,"gameId":gid}))?;
        println!("        {}", r["message"].as_str().unwrap_or(""));
    }
    let mods = names(&dir.join("mods"));
    check(names(&dir.join("shaderpacks")).iter().any(|n| n.to_ascii_lowercase().ends_with(".zip")), "the shader pack is in shaderpacks/")?;
    check(mods.iter().any(|n| n.to_ascii_lowercase().starts_with("iris")), "Iris is in mods/")?;
    check(mods.iter().any(|n| n.to_ascii_lowercase().starts_with("sodium")), "Sodium is in mods/")?;
    let installed = x("discoverInstalled", json!({"gameId":gid}))?;
    check(installed.as_array().is_some_and(|l| l.len() >= 3), "all three are recorded as installed by LOAM")?;
    let again = x("discoverPlan", json!({"provider":"modrinth","kind":"shader","id":sid,"gameId":gid}));
    check(again.is_err_and(|e| e.contains("already in this game")), "planning it again says it's already installed")?;
    check(names(&staging).is_empty(), "staging is clean after a successful install")?;

    println!("QA PASSED");
    Ok(())
}
