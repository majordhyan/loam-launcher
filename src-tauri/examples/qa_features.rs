//! End-to-end QA for 1.6.1 features against real services, in an isolated data folder.
//! Usage: cargo run --example qa_features -- <absolute empty test dir> [launch]
//! 1. Migration Hub: builds Prism and CurseForge fixture instances, scans and imports them,
//!    and checks the copies and that the sources are byte-for-byte unchanged.
//! 2. Smart Drop: downloads real Modrinth files and ranks the imported games for each.
//! 3. Crash decoder (with `launch`): installs Fabric, imports Mod Menu without Fabric API,
//!    launches the real game and expects LOAM-CRASH-MOD-MISSING.
use loam_core::{commands, engine, imports, launchers, model::*, storage};
use serde_json::json;
use std::{
    fs,
    path::Path,
    sync::{atomic::AtomicBool, Arc, Mutex},
};

fn main() {
    if let Err(e) = run() {
        eprintln!("QA FAILED: {e}");
        std::process::exit(1)
    }
}

fn write(p: &Path, b: &[u8]) -> Result<()> {
    fs::create_dir_all(p.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::write(p, b).map_err(|e| e.to_string())
}

fn tree_hash(dir: &Path) -> Result<String> {
    let mut rows = vec![];
    for e in walkdir::WalkDir::new(dir).sort_by_file_name() {
        let e = e.map_err(|e| e.to_string())?;
        if e.file_type().is_file() {
            rows.push(format!("{}:{}", e.path().strip_prefix(dir).unwrap().display(), storage::hash(e.path(), "sha256")?));
        }
    }
    Ok(rows.join("\n"))
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
    let args: Vec<String> = std::env::args().collect();
    let root = std::path::PathBuf::from(args.get(1).ok_or("Usage: qa_features <absolute test dir> [launch]")?);
    if !root.is_absolute() {
        return Err("Use an absolute test directory.".into());
    }
    let loam = root.join("loam data with spaces ü");
    // Keep the verified download cache between runs; start each run with an empty library.
    let _ = fs::remove_file(loam.join("state.json"));
    let _ = fs::remove_dir_all(loam.join("games"));
    let _ = fs::remove_dir_all(root.join("fixtures"));
    fs::create_dir_all(&loam).map_err(|e| e.to_string())?;
    let c = Arc::new(Core {
        root: loam.clone(),
        data: Mutex::new(Data::default()),
        progress: Mutex::new(None),
        cancel: AtomicBool::new(false),
        busy: AtomicBool::new(false),
        running: Mutex::new(Default::default()),
        pending: Mutex::new(Default::default()),
        app: None,
    });

    println!("1. Migration Hub");
    let launchers_root = root.join("fixtures");
    let prism = launchers_root.join("PrismLauncher/instances/Fabulous 1.21.4");
    write(&prism.join("instance.cfg"), b"[General]\nname=Fabulous QA\nOverrideMemory=true\nMaxMemAlloc=3072\n")?;
    write(&prism.join("mmc-pack.json"), br#"{"formatVersion":1,"components":[{"uid":"org.lwjgl3","version":"3.3.3"},{"uid":"net.minecraft","version":"1.21.4"},{"uid":"net.fabricmc.intermediary","version":"1.21.4"},{"uid":"net.fabricmc.fabric-loader","version":"0.16.9"}]}"#)?;
    let mc = prism.join("minecraft");
    write(&mc.join("saves/Survival Island/level.dat"), &[10u8; 2048])?;
    write(&mc.join("saves/Survival Island/region/r.0.0.mca"), &vec![7u8; 300_000])?;
    write(&mc.join("options.txt"), b"version:3953\nlang:en_us\n")?;
    write(&mc.join("servers.dat"), &[1, 2, 3])?;
    write(&mc.join("config/sodium-options.json"), b"{}")?;
    write(&mc.join("logs/latest.log"), b"must not be copied")?;
    write(&prism.join("accounts.json"), b"SECRET must not be copied")?;
    let forge = launchers_root.join("curseforge/Instances/All the Forge");
    write(&forge.join("minecraftinstance.json"), br#"{"name":"All the Forge","gameVersion":"1.20.1","baseModLoader":{"name":"forge-47.2.0","type":1}}"#)?;
    write(&forge.join("mods/forge-only.jar"), b"jar")?;
    write(&forge.join("saves/Forge World/level.dat"), &[4u8; 1024])?;
    let before_prism = tree_hash(&prism)?;
    let before_forge = tree_hash(&forge)?;

    let found = launchers::scan_roots(&[launchers_root.join("PrismLauncher/instances"), launchers_root.join("curseforge/Instances")]);
    check(found.len() == 2, "scan finds the Prism and CurseForge instances")?;
    let p = found.iter().find(|i| i.source == "Prism Launcher").ok_or("Prism instance missing")?;
    check(p.name == "Fabulous QA" && p.version == "1.21.4" && p.loader_kind == "fabric" && p.worlds == 1, "Prism name, version, Fabric loader and world count parsed")?;
    let f = found.iter().find(|i| i.source == "CurseForge").ok_or("CurseForge instance missing")?;
    check(!f.supported && f.loader_kind == "forge", "Forge instance flagged as worlds-only")?;

    let fabric_id = launchers::import(&c, &p.path, false, 8192)?;
    let g = c.game(&fabric_id)?;
    let dir = c.game_dir(&fabric_id)?;
    check(g.loader.as_deref() == Some("0.16.9") && g.memory == 3072 && !g.installed, "Fabric game created with loader 0.16.9, 3 GB, not yet installed")?;
    check(fs::read(dir.join("saves/Survival Island/region/r.0.0.mca")).map(|b| b.len()).unwrap_or(0) == 300_000, "world region file copied intact")?;
    check(dir.join("config/sodium-options.json").exists() && dir.join("servers.dat").exists(), "config and servers.dat copied")?;
    check(!dir.join("logs/latest.log").exists() && !dir.join("accounts.json").exists(), "logs and account files not copied")?;
    let forge_id = launchers::import(&c, &f.path, false, 8192)?;
    let fd = c.game_dir(&forge_id)?;
    check(c.game(&forge_id)?.loader.is_none() && fd.join("saves/Forge World/level.dat").exists() && !fd.join("mods").join("forge-only.jar").exists(), "Forge instance imported as vanilla with worlds only")?;
    check(tree_hash(&prism)? == before_prism && tree_hash(&forge)? == before_forge, "source instances are byte-for-byte unchanged")?;
    let state: serde_json::Value = serde_json::from_slice(&fs::read(loam.join("state.json")).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    check(state["games"].as_array().map(|a| a.len()) == Some(2), "state.json lists both imported games")?;

    println!("2. Smart Drop");
    let drop_dir = root.join("drops");
    for (name, url) in [
        ("iris.jar", "https://modrinth.com/mod/iris"),
        ("sodium.jar", "https://modrinth.com/mod/sodium"),
    ] {
        let review = imports::modrinth(&c, &fabric_id, url)?;
        let path = c.pending.lock().unwrap().get(review["token"].as_str().unwrap()).unwrap()["source"].as_str().unwrap().to_owned();
        fs::create_dir_all(&drop_dir).map_err(|e| e.to_string())?;
        fs::copy(&path, drop_dir.join(name)).map_err(|e| e.to_string())?;
    }
    let cls = imports::classify(&c, &drop_dir.join("sodium.jar").to_string_lossy())?;
    let t = cls["targets"].as_array().unwrap();
    check(cls["kind"] == "mod" && cls["suggested"] == fabric_id.as_str(), &format!("Sodium jar is a mod and suggests the Fabric game ({})", cls["title"]))?;
    check(t.iter().any(|x| x["id"] == forge_id.as_str() && x["compatible"] == false && x["reason"].as_str().is_some()), "vanilla game listed as incompatible with a reason")?;
    let inst = imports::classify(&c, &prism.to_string_lossy())?;
    check(inst["kind"] == "instance", "dropping a Prism instance folder routes to the Migration Hub")?;

    if args.get(2).map(String::as_str) != Some("launch") {
        println!("QA PASS (launch phase skipped)");
        return Ok(());
    }
    println!("3. Crash decoder with a real Fabric launch");
    loam_core::accounts::add_offline(&c, "LoamQA")?;
    engine::install(&c, &fabric_id)?;
    println!("  install complete");
    let launch_and_wait = |label: &str| -> Result<serde_json::Value> {
        engine::launch(&c, &fabric_id)?;
        for _ in 0..240 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if !c.running.lock().unwrap().contains_key(&fabric_id) {
                break;
            }
        }
        if c.running.lock().unwrap().contains_key(&fabric_id) {
            engine::stop(&c, &fabric_id)?;
            return Err(format!("{label}: game kept running; expected a crash."));
        }
        std::thread::sleep(std::time::Duration::from_secs(1));
        let p = c.progress.lock().unwrap().clone().ok_or("no progress")?;
        println!("  {label}: final message: {}", p.message);
        let d: serde_json::Value = serde_json::from_slice(&fs::read(dir.join("logs/loam-crash.json")).map_err(|_| format!("{label}: no loam-crash.json written"))?).map_err(|e| e.to_string())?;
        println!("  {label}: diagnosis {}", serde_json::to_string(&d).unwrap());
        check(p.phase == "failed", &format!("{label}: launch reported as failed"))?;
        Ok(d)
    };
    // a) Invalid JVM option: Java exits before Minecraft starts.
    commands::execute(&c, "gameSettings", json!({"id":fabric_id,"name":"Fabulous QA","memory":3072,"jvmArgs":["-XX:+LoamQaUnknownOption"]}))?;
    let d = launch_and_wait("invalid JVM option")?;
    check(d["code"] == "LOAM-CRASH-JVM-OPTION", "real JVM rejection decoded")?;
    // b) Iris without Sodium. Headless keeps Fabric's own error window from blocking exit.
    commands::execute(&c, "gameSettings", json!({"id":fabric_id,"name":"Fabulous QA","memory":3072,"jvmArgs":["-Djava.awt.headless=true"]}))?;
    let review = imports::inspect(&c, &fabric_id, &drop_dir.join("iris.jar").to_string_lossy())?;
    println!("  review dependencies: {}", review["dependencies"]);
    check(review["dependencies"].as_array().is_some_and(|d| d.iter().any(|x| x.as_str().unwrap_or("").contains("sodium"))), "review lists Iris's declared Sodium dependency")?;
    imports::apply(&c, review["token"].as_str().unwrap())?;
    check(!fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten().any(|e| e.file_name().to_string_lossy().starts_with(".import-")), "import staging folder removed after apply")?;
    let d = launch_and_wait("Iris without Sodium")?;
    check(d["code"] == "LOAM-CRASH-MOD-MISSING" || d["code"] == "LOAM-CRASH-MOD-VERSION", "real Fabric dependency failure decoded")?;
    check(d["actions"].as_array().is_some_and(|a| a.iter().any(|x| x["kind"] == "disable" && x["path"].as_str().unwrap_or("").starts_with("mods/"))), "decoder offers to disable the dependent mod")?;
    // c) The card's fix: disable the mod it named, launch again, the game must keep running.
    let keeps_running = |id: &str, label: &str| -> Result<()> {
        engine::launch(&c, id)?;
        let mut window = false;
        for _ in 0..90 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if !c.running.lock().unwrap().contains_key(id) {
                return Err(format!("{label}: game exited early: {:?}", c.progress.lock().unwrap().as_ref().map(|p| p.message.clone())));
            }
            let log = fs::read_to_string(c.game_dir(id)?.join("logs/loam-latest.log")).unwrap_or_default();
            if log.contains("Created: ") && log.contains("atlas") {
                window = true;
                break;
            }
        }
        engine::stop(&c, id)?;
        check(window, &format!("{label}: game reached texture loading (window open) and was stopped"))
    };
    commands::execute(&c, "toggleContent", json!({"id":fabric_id,"path":"mods/iris.jar"}))?;
    check(dir.join("mods/iris.jar.disabled").exists(), "Disable action renamed iris.jar to iris.jar.disabled")?;
    keeps_running(&fabric_id, "Fabric 1.21.4 after the fix")?;

    println!("4. Java 17 regression (Minecraft 1.20.1 failed to start in 1.5.1)");
    let v: Game = serde_json::from_value(commands::execute(&c, "createGame", json!({"name":"Java 17 check","version":"1.20.1","loader":null,"memory":2048}))?).map_err(|e| e.to_string())?;
    engine::install(&c, &v.id)?;
    let plan: serde_json::Value = serde_json::from_slice(&fs::read(c.game_dir(&v.id)?.join("install.json")).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    check(plan["java"] == 17, "1.20.1 selects Java 17 from version metadata")?;
    keeps_running(&v.id, "Vanilla 1.20.1 on Java 17")?;
    println!("QA PASS");
    Ok(())
}
