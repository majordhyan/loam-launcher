use crate::{model::*, storage};
use std::fs;

pub fn label(name: &str, version: &str) -> String {
    let clean = |s: &str| -> String {
        s.chars().map(|c| if c.is_control() || "<>:\"/\\|?*".contains(c) { '-' } else { c })
            .take(70).collect::<String>().trim_matches([' ', '.']).to_owned()
    };
    let name = clean(name);
    let version = clean(version);
    let mut result = if name.ends_with(&version) { name } else { format!("{name} - {version}") };
    if result.is_empty() || storage::safe_relative(&result).is_err() { result = format!("Game - {version}"); }
    result
}

pub fn available(root: &std::path::Path, name: &str, version: &str) -> Result<String> {
    let base = label(name, version);
    for n in 1..10000 {
        let candidate = if n == 1 { base.clone() } else { format!("{base} ({n})") };
        let path = root.join("games").join(&candidate);
        storage::no_links(&path)?;
        if !path.exists() { return Ok(candidate); }
    }
    Err("Too many game folders with this name.".into())
}

// Store the path separately from display names. Rename only when idle, and roll
// back the filesystem if persisting the new mapping fails.
pub fn sync(core: &Core, id: &str) -> Result<()> {
    core.ensure_idle(id)?;
    let game = core.game(id)?;
    let base = label(&game.name, &game.version);
    if game.folder.as_ref().is_some_and(|f| f == &base || f.starts_with(&format!("{base} ("))) { return Ok(()); }
    let old = core.game_dir(id)?;
    let folder = available(&core.root, &game.name, &game.version)?;
    let new = core.root.join("games").join(&folder);
    storage::no_links(&old)?;
    storage::no_links(&new)?;
    let moved = old.exists();
    if moved { fs::rename(&old, &new).map_err(|_| "Close Explorer or Minecraft files and retry the folder rename.")?; }
    else { fs::create_dir_all(&new).map_err(|e| e.to_string())?; }
    core.data.lock().unwrap().games.iter_mut().find(|g| g.id == id).ok_or("Game missing")?.folder = Some(folder);
    if let Err(e) = core.save() {
        core.data.lock().unwrap().games.iter_mut().find(|g| g.id == id).unwrap().folder = game.folder;
        if moved { fs::rename(&new, &old).map_err(|_| "Could not roll back game folder; preserve both folders for recovery.")?; }
        return Err(e);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn names_are_safe_readable_and_versioned() {
        assert_eq!(label("Survival", "1.21.4"), "Survival - 1.21.4");
        assert_eq!(label("Vanilla 1.21.4", "1.21.4"), "Vanilla 1.21.4");
        for name in ["../escape", "CON", "a:b", "world. ", "世界"] {
            let result = label(name, "1.21.4");
            assert_eq!(storage::safe_relative(&result).unwrap().components().count(), 1);
        }
    }
    #[test] fn collisions_never_replace_existing_folders() {
        let root = tempfile::tempdir().unwrap();
        fs::create_dir_all(root.path().join("games/Survival - 1.21.4")).unwrap();
        assert_eq!(available(root.path(), "Survival", "1.21.4").unwrap(), "Survival - 1.21.4 (2)");
    }
}
