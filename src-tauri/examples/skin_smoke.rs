//! Read-only online texture lookup and isolated local persistence smoke check.
use loam_core::{model::*, skins};
use std::sync::{atomic::AtomicBool, Mutex};
fn main() -> std::result::Result<(), String> {
    let root = std::path::PathBuf::from(
        std::env::args()
            .nth(1)
            .ok_or("Supply an isolated absolute test directory")?,
    );
    if !root.is_absolute() {
        return Err("Use an absolute test directory".into());
    }
    std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let c = Core {
        root,
        data: Mutex::new(Data::default()),
        progress: Mutex::new(None),
        cancel: AtomicBool::new(false),
        busy: AtomicBool::new(false),
        running: Mutex::new(Default::default()),
        pending: Mutex::new(Default::default()),
        app: None,
    };
    let look = skins::import_online("Notch")?;
    let saved = skins::save(&c, &look)?;
    if saved != skins::saved(&c)? {
        return Err("Saved look differs after reload".into());
    }
    println!("PASS: live Mojang name lookup, texture fetch, PNG decoding, atomic save and reload. Variant: {}. No account changed.",look["variant"]);
    Ok(())
}
