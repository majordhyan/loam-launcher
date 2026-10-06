use crate::{model::*, storage};
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
};

pub fn usage(root: &Path) -> Result<Value> {
    let mut totals = serde_json::Map::new();
    for folder in ["games", "cache", "backups", "reports", "trash"] {
        let mut total = 0u64;
        if root.join(folder).exists() {
            for e in walkdir::WalkDir::new(root.join(folder)).follow_links(false) {
                let e = e.map_err(|e| e.to_string())?;
                if e.file_type().is_file() {
                    total = total.saturating_add(e.metadata().map_err(|e| e.to_string())?.len());
                }
            }
        }
        totals.insert(folder.into(), json!(total));
    }
    Ok(json!(totals))
}
pub fn clean_cache(c: &Core) -> Result<u64> {
    if !c.running.lock().unwrap().is_empty() {
        return Err("Stop Minecraft before cleaning cached downloads.".into());
    }
    let root = c.root.join("cache");
    storage::no_links(&root)?;
    let mut reclaimed = 0;
    if !root.exists() {
        return Ok(0);
    }
    for e in walkdir::WalkDir::new(&root).follow_links(false) {
        let e = e.map_err(|e| e.to_string())?;
        let path = e.path();
        storage::no_links(path)?;
        if e.file_type().is_file()
            && (path.starts_with(root.join("imports"))
                || (path.starts_with(root.join("runtimes")) && e.file_name() == "runtime.zip"))
        {
            reclaimed += e.metadata().map_err(|e| e.to_string())?.len();
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    c.pending.lock().unwrap().clear();
    Ok(reclaimed)
}
pub fn migrate(c: &Core, destination: &Path, bootstrap: &Path) -> Result<()> {
    if !c.running.lock().unwrap().is_empty() {
        return Err("Stop every game before migrating storage.".into());
    }
    storage::no_links(destination)?;
    storage::no_links(&c.root)?;
    if !destination.is_absolute() {
        return Err("Choose an absolute destination folder.".into());
    }
    fs::create_dir_all(destination).map_err(|e| e.to_string())?;
    let target = fs::canonicalize(destination).map_err(|e| e.to_string())?;
    let source = fs::canonicalize(&c.root).map_err(|e| e.to_string())?;
    if target.starts_with(&source) || source.starts_with(&target) {
        return Err("Choose an empty folder outside the current data folder.".into());
    }
    if fs::read_dir(&target)
        .map_err(|e| e.to_string())?
        .next()
        .is_some()
    {
        return Err("Migration needs an empty destination folder.".into());
    }
    c.save()?;
    let mut files = Vec::<(PathBuf, u64)>::new();
    let mut total = 0u64;
    for e in walkdir::WalkDir::new(&source).follow_links(false) {
        let e = e.map_err(|e| e.to_string())?;
        storage::no_links(e.path())?;
        if e.file_type().is_file() {
            let size = e.metadata().map_err(|e| e.to_string())?.len();
            total += size;
            files.push((e.path().to_owned(), size));
        }
    }
    if storage::free_space(destination) < total + 64 * 1024 * 1024 {
        return Err(
            "Not enough disk space for a verified copy. The source has not changed.".into(),
        );
    }
    let mut done = 0;
    for (i, (path, size)) in files.iter().enumerate() {
        c.cancelled()?;
        let out = target.join(path.strip_prefix(&source).map_err(|e| e.to_string())?);
        storage::no_links(&out)?;
        fs::create_dir_all(out.parent().unwrap()).map_err(|e| e.to_string())?;
        fs::copy(path, &out).map_err(|e| e.to_string())?;
        if storage::hash(path, "sha256")? != storage::hash(&out, "sha256")? {
            return Err("Migration verification failed. The original data remains active.".into());
        }
        done += size;
        c.emit(Progress {
            id: "migration".into(),
            game_id: "".into(),
            phase: "copying".into(),
            message: format!("Verified {} of {} files", i + 1, files.len()),
            done,
            total,
            files: i as u64 + 1,
            speed: 0,
            error: None,
        });
    }
    storage::write_json(
        &bootstrap.join("storage-location.json"),
        &json!({"schema":1,"path":target}),
    )?;
    c.step("","ready","Storage copied and verified. Restart LOAM to use the new location. The original remains intact.");
    Ok(())
}
pub fn data_root(bootstrap: &Path) -> Result<PathBuf> {
    let p = bootstrap.join("storage-location.json");
    if !p.exists() {
        // Keep existing installations in place until the user requests a verified move.
        if bootstrap.join("state.json").exists() { return Ok(bootstrap.to_owned()); }
        let root = std::env::var_os("APPDATA").map(PathBuf::from)
            .map(|p| p.join("LoamLauncher")).unwrap_or_else(|| bootstrap.to_owned());
        storage::no_links(&root)?;
        return Ok(root);
    }
    let v: Value = serde_json::from_slice(&fs::read(p).map_err(|e| e.to_string())?)
        .map_err(|_| "Invalid storage location file")?;
    if v["schema"] != 1 {
        return Err("Unsupported storage configuration.".into());
    }
    let root = PathBuf::from(v["path"].as_str().ok_or("Storage path missing")?);
    storage::no_links(&root)?;
    if !root.is_absolute() || !root.join("state.json").is_file() {
        return Err(
            "Migrated storage is unavailable. Reconnect its drive before opening LOAM.".into(),
        );
    }
    Ok(root)
}

/// Prepare only directories. Game-generated files must come from Minecraft itself.
pub fn prepare_layout(root: &Path) -> Result<()> {
    for folder in ["games", "cache/assets", "cache/libraries", "cache/versions", "cache/runtimes", "downloads", "backups", "logs", "reports", "trash"] {
        let path = root.join(folder);
        storage::no_links(&path)?;
        fs::create_dir_all(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
pub fn prepare_game(dir: &Path) -> Result<()> {
    for folder in ["mods", "resourcepacks", "shaderpacks", "saves", "screenshots", "logs", "config", "defaultconfigs", "datapacks", "server-resource-packs"] {
        let path = dir.join(folder);
        storage::no_links(&path)?;
        fs::create_dir_all(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
