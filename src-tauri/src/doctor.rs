//! Read-only local installation checks. No downloads or game execution.
use crate::{catalog::Plan, model::*, storage};
use serde::Serialize;
use std::{fs, path::Path};

#[derive(Serialize)]
pub struct Check {
    pub code: &'static str,
    pub ok: bool,
    pub message: String,
}

pub fn check_artifact(root: &Path, relative: &str, size: u64) -> Result<()> {
    let path = root.join(storage::safe_relative(relative)?);
    storage::no_links(&path)?;
    let meta = fs::metadata(&path).map_err(|_| format!("LOAM-INS-MISSING: {relative}"))?;
    if !meta.is_file() || meta.len() == 0 || (size > 0 && meta.len() != size) {
        return Err(format!("LOAM-INS-INCOMPLETE: {relative}"));
    }
    Ok(())
}

pub fn validate_classpath(root: &Path, plan: &Plan) -> Result<()> {
    for relative in &plan.classpath {
        let path = root.join(storage::safe_relative(relative)?);
        storage::no_links(&path)?;
        let file = fs::File::open(&path).map_err(|_| format!("LOAM-INS-CLASSPATH: {relative}"))?;
        zip::ZipArchive::new(file).map_err(|_| format!("LOAM-INS-JAR: {relative}"))?;
    }
    if plan.classpath.is_empty() { return Err("LOAM-INS-CLASSPATH: No game libraries found.".into()); }
    Ok(())
}

/// Automatic repair is limited to measured cache files; unknown-size or large repairs
/// require the existing explicit Verify / reinstall action.
pub fn repair_candidates(root: &Path, plan: &Plan) -> Result<Vec<usize>> {
    let mut candidates = Vec::new();
    let mut bytes = 0u64;
    for (index, artifact) in plan.artifacts.iter().enumerate() {
        let relative = storage::safe_relative(&artifact.path)?;
        if !relative.starts_with("cache") { return Err("LOAM-INS-REPAIR: Automatic repair is limited to cached game files.".into()); }
        storage::no_links(&root.join(&relative))?;
        if check_artifact(root, &artifact.path, artifact.size).is_err() {
            bytes = bytes.saturating_add(artifact.size);
            candidates.push(index);
            if artifact.size == 0 || bytes > 256 * 1024 * 1024 || candidates.len() > 32 {
                return Err("LOAM-INS-REPAIR: This installation needs a larger repair. Use Verify / reinstall to review it.".into());
            }
        }
    }
    Ok(candidates)
}

pub fn inspect(core: &Core, id: &str) -> Result<Vec<Check>> {
    core.ensure_idle(id)?;
    let dir = core.game_dir(id)?;
    let plan: Plan = serde_json::from_slice(&fs::read(dir.join("install.json"))
        .map_err(|_| "Install this game before checking its environment.")?)
        .map_err(|_| "LOAM-INS-RECEIPT: Installation receipt could not be read.")?;
    let missing = plan.artifacts.iter().filter(|a| check_artifact(&core.root, &a.path, a.size).is_err()).count();
    let classpath = validate_classpath(&core.root, &plan);
    let java = crate::catalog::runtime_ready(&core.root, plan.java).is_some();
    Ok(vec![
        Check { code: "files", ok: missing == 0, message: if missing == 0 { format!("{} files passed size and path checks. Hashes are checked during repair.", plan.artifacts.len()) } else { format!("{missing} files need repair. Use Verify / reinstall.") } },
        Check { code: "classpath", ok: classpath.is_ok(), message: classpath.err().unwrap_or("Classpath JAR directories are readable.".into()) },
        Check { code: "java", ok: java, message: if java { format!("Managed Java {} is present with a verified-install marker.", plan.java) } else { format!("Managed Java {} needs provisioning.", plan.java) } },
        Check { code: "disk", ok: storage::free_space(&core.root) > 512 * 1024 * 1024, message: "At least 512 MiB free is recommended; a full install may require more.".into() },
    ])
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unknown_size_still_rejects_empty_and_paths_cannot_escape() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("lib.jar"), b"abc").unwrap();
        assert!(check_artifact(dir.path(), "lib.jar", 0).is_ok());
        assert!(check_artifact(dir.path(), "lib.jar", 4).is_err());
        assert!(check_artifact(dir.path(), "../lib.jar", 0).is_err());
        fs::write(dir.path().join("lib.jar"), b"").unwrap();
        assert!(check_artifact(dir.path(), "lib.jar", 0).is_err());
    }
    #[test]
    fn repair_is_bounded_and_never_targets_worlds() {
        use crate::catalog::Artifact;
        let dir = tempfile::tempdir().unwrap();
        let mut plan = Plan { version: serde_json::json!({}), artifacts: vec![Artifact {
            url: "https://libraries.minecraft.net/a.jar".into(), path: "cache/libraries/a.jar".into(), hash: "00".into(), kind: "sha1".into(), size: 3, native: false,
        }], classpath: vec![], java: 8, runtime: serde_json::json!({}), bytes: 3, disk: 3 };
        assert_eq!(repair_candidates(dir.path(), &plan).unwrap(), vec![0]);
        plan.artifacts[0].size = 0;
        assert!(repair_candidates(dir.path(), &plan).is_err());
        plan.artifacts[0].size = 257 * 1024 * 1024;
        assert!(repair_candidates(dir.path(), &plan).is_err());
        plan.artifacts[0].size = 3;
        plan.artifacts[0].path = "games/world/level.dat".into();
        assert!(repair_candidates(dir.path(), &plan).is_err());
    }
}
