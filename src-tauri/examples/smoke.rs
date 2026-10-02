use loam_core::{commands, engine, model::*};
use serde_json::json;
use std::sync::{atomic::AtomicBool, Arc, Mutex};
fn main() {
    if let Err(e) = run() {
        eprintln!("FAILED: {e}");
        std::process::exit(1)
    }
}
fn run() -> Result<()> {
    let args: Vec<_> = std::env::args().collect();
    let version = args.get(1).ok_or(
        "Usage: cargo run --example smoke -- <version> <isolated test directory> [loader] [launch]",
    )?;
    let root = std::path::PathBuf::from(args.get(2).ok_or("Test directory required")?);
    if !root.is_absolute() {
        return Err("Use an absolute isolated test directory.".into());
    }
    std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let data: Data = std::fs::read(root.join("state.json"))
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default();
    let c = Arc::new(Core {
        root,
        data: Mutex::new(data),
        progress: Mutex::new(None),
        cancel: AtomicBool::new(false),
        busy: AtomicBool::new(false),
        running: Mutex::new(Default::default()),
        pending: Mutex::new(Default::default()),
        app: None,
    });
    let loader = args.get(3).filter(|s| s.as_str() != "vanilla").cloned();
    let existing = c
        .data
        .lock()
        .unwrap()
        .games
        .iter()
        .find(|g| g.version == *version && g.loader == loader)
        .cloned();
    let game = if let Some(g) = existing {
        g
    } else {
        serde_json::from_value(commands::execute(
            &c,
            "createGame",
            json!({"name":format!("QA {version}"),"version":version,"loader":loader,"memory":2048}),
        )?)
        .map_err(|e| e.to_string())?
    };
    if c.data.lock().unwrap().accounts.is_empty() {
        loam_core::accounts::add_offline(&c, "LoamTest")?;
    }
    let done = Arc::new(AtomicBool::new(false));
    let monitor = c.clone();
    let stop = done.clone();
    std::thread::spawn(move || {
        while !stop.load(std::sync::atomic::Ordering::Relaxed) {
            if let Some(p) = monitor.progress.lock().unwrap().as_ref() {
                println!("{}: {} / {} — {}", p.phase, p.done, p.total, p.message)
            }
            std::thread::sleep(std::time::Duration::from_secs(10))
        }
    });
    engine::install(&c, &game.id)?;
    println!("INSTALL PASS: {} ({})", game.version, game.id);
    if let Some(url) = args.get(5) {
        let review = loam_core::imports::modrinth(&c, &game.id, url)?;
        println!("IMPORT REVIEW: {} ({})", review["filename"], review["kind"]);
        loam_core::imports::apply(&c, review["token"].as_str().ok_or("Missing review token")?)?;
        println!("IMPORT PASS");
    }
    if args.get(4).map(String::as_str) == Some("launch") {
        engine::launch(&c, &game.id)?;
        println!("LAUNCHED: waiting up to 180 seconds for visual verification");
        for _ in 0..180 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if !c.running.lock().unwrap().contains_key(&game.id) {
                let p = c.progress.lock().unwrap().clone();
                if p.as_ref().map(|p| p.phase.as_str()) == Some("failed") {
                    return Err(p.unwrap().message);
                }
                break;
            }
        }
        if c.running.lock().unwrap().contains_key(&game.id) {
            engine::stop(&c, &game.id)?;
        }
        println!("PROCESS SMOKE PASS (visual title-screen confirmation recorded separately)");
    }
    done.store(true, std::sync::atomic::Ordering::Relaxed);
    Ok(())
}
