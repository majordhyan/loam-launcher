use crate::model::*;
use serde::Serialize;
use sha1::{Digest, Sha1};
use sha2::Sha256;
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};

pub fn write_json(path: &Path, value: &impl Serialize) -> Result<()> {
    let bytes = serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?;
    atomic_write(path, &bytes)
}
pub fn atomic_write(path: &Path, bytes: &[u8]) -> Result<()> {
    no_links(path)?;
    fs::create_dir_all(path.parent().ok_or("No parent directory")?).map_err(|e| e.to_string())?;
    let temp = path.with_extension(format!("{}.tmp", uuid::Uuid::new_v4()));
    let mut f = fs::File::create(&temp).map_err(|e| e.to_string())?;
    f.write_all(bytes).map_err(|e| e.to_string())?;
    f.sync_all().map_err(|e| e.to_string())?;
    drop(f);
    // Windows rename replaces regular destination files; no delete-before-write window.
    fs::rename(&temp, path).map_err(|e| e.to_string())
}
pub fn safe_relative(raw: &str) -> Result<PathBuf> {
    let raw = raw.replace('\\', "/");
    if raw.is_empty() || raw.starts_with('/') || raw.contains(':') || raw.contains('\0') {
        return Err("Unsafe file path.".into());
    }
    let mut out = PathBuf::new();
    for part in raw.split('/') {
        if part.is_empty() {
            continue;
        }
        if part == "."
            || part == ".."
            || part.ends_with('.')
            || part.ends_with(' ')
            || part.chars().any(|c| c < ' ' || "<>\"|?*".contains(c))
        {
            return Err("Unsafe archive path.".into());
        }
        let stem = part.split('.').next().unwrap_or("").to_ascii_uppercase();
        if ["CON", "PRN", "AUX", "NUL"].contains(&stem.as_str())
            || (stem.len() == 4
                && (stem.starts_with("COM") || stem.starts_with("LPT"))
                && stem.as_bytes()[3].is_ascii_digit())
        {
            return Err("Reserved Windows filename.".into());
        }
        out.push(part);
    }
    Ok(out)
}
pub fn no_links(path: &Path) -> Result<()> {
    let mut p = Some(path);
    while let Some(item) = p {
        if let Ok(m) = fs::symlink_metadata(item) {
            #[cfg(windows)]
            {
                use std::os::windows::fs::MetadataExt;
                if m.file_attributes() & 0x400 != 0 {
                    return Err("Links and junctions are not permitted here.".into());
                }
            }
            if m.file_type().is_symlink() {
                return Err("Symbolic links are not permitted.".into());
            }
        }
        p = item.parent();
    }
    Ok(())
}
pub fn hash(path: &Path, kind: &str) -> Result<String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut buf = [0u8; 65536];
    let mut a = Sha1::new();
    let mut b = Sha256::new();
    let mut c = sha2::Sha512::new();
    loop {
        let n = file.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        match kind {
            "sha256" => b.update(&buf[..n]),
            "sha512" => c.update(&buf[..n]),
            _ => a.update(&buf[..n]),
        }
    }
    Ok(match kind {
        "sha256" => hex::encode(b.finalize()),
        "sha512" => hex::encode(c.finalize()),
        _ => hex::encode(a.finalize()),
    })
}
pub fn extract_zip(path: &Path, dest: &Path, limit: u64) -> Result<()> {
    no_links(dest)?;
    let mut z = zip::ZipArchive::new(fs::File::open(path).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    if z.len() > 50000 {
        return Err("Archive has too many entries.".into());
    }
    let mut total = 0u64;
    let mut seen = std::collections::HashSet::new();
    for i in 0..z.len() {
        let f = z.by_index(i).map_err(|e| e.to_string())?;
        let rel = safe_relative(f.name())?;
        let target = dest.join(&rel);
        no_links(&target)?;
        if !seen.insert(rel.to_string_lossy().to_lowercase()) {
            return Err("Archive contains colliding paths.".into());
        }
        if f.unix_mode()
            .map(|m| m & 0o170000 == 0o120000)
            .unwrap_or(false)
        {
            return Err("Archive contains a link.".into());
        }
        total = total.checked_add(f.size()).ok_or("Archive size overflow")?;
        if total > limit
            || f.size() > 2 * 1024 * 1024 * 1024
            || (f.compressed_size() > 0 && f.size() / f.compressed_size() > 1000)
        {
            return Err("Archive exceeds extraction limits.".into());
        }
        if f.is_dir() {
            fs::create_dir_all(&target).map_err(|e| e.to_string())?
        } else {
            fs::create_dir_all(target.parent().unwrap()).map_err(|e| e.to_string())?;
            let mut w = fs::File::create(target).map_err(|e| e.to_string())?;
            let expected = f.size();
            let copied =
                std::io::copy(&mut f.take(expected + 1), &mut w).map_err(|e| e.to_string())?;
            if copied != expected {
                return Err("Archive entry size does not match its metadata.".into());
            }
        }
    }
    Ok(())
}
pub fn copy_tree(src: &Path, dst: &Path) -> Result<()> {
    no_links(src)?;
    no_links(dst)?;
    for entry in walkdir::WalkDir::new(src).follow_links(false) {
        let e = entry.map_err(|e| e.to_string())?;
        no_links(e.path())?;
        let out = dst.join(e.path().strip_prefix(src).map_err(|e| e.to_string())?);
        no_links(&out)?;
        if e.file_type().is_dir() {
            fs::create_dir_all(out).map_err(|e| e.to_string())?;
        } else if e.file_type().is_file() {
            if let Some(p) = out.parent() {
                fs::create_dir_all(p).map_err(|e| e.to_string())?;
            }
            fs::copy(e.path(), &out).map_err(|e| e.to_string())?;
            if hash(e.path(), "sha256")? != hash(&out, "sha256")? {
                return Err("Copy verification failed.".into());
            }
        } else {
            return Err("Unsupported file type.".into());
        }
    }
    Ok(())
}
pub fn free_space(path: &Path) -> u64 {
    let disks = sysinfo::Disks::new_with_refreshed_list();
    disks
        .iter()
        .filter(|d| path.starts_with(d.mount_point()))
        .max_by_key(|d| d.mount_point().as_os_str().len())
        .map(|d| d.available_space())
        .unwrap_or(0)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_windows_escapes() {
        for p in [
            "../saves",
            "C:\\x",
            "a/../../b",
            "/etc",
            "a:stream",
            "CON.txt",
            "a. /x",
            "COM1/x",
        ] {
            assert!(safe_relative(p).is_err(), "{p}")
        }
    }
    #[test]
    fn accepts_relative() {
        assert_eq!(
            safe_relative("assets/a.png").unwrap(),
            PathBuf::from("assets/a.png")
        );
    }
}
