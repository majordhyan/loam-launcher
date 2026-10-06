use crate::{model::*, storage};
use reqwest::blocking::Client;
use serde_json::Value;
use std::{
    fs,
    io::{Read, Write},
    path::Path,
    time::Duration,
};
pub fn allowed(raw: &str) -> bool {
    let Ok(u) = url::Url::parse(raw) else {
        return false;
    };
    u.scheme() == "https"
        && u.username().is_empty()
        && u.password().is_none()
        && u.port().is_none()
        && matches!(
            u.host_str(),
            Some(
                "piston-meta.mojang.com"
                    | "piston-data.mojang.com"
                    | "launchermeta.mojang.com"
                    | "launcher.mojang.com"
                    | "launchercontent.mojang.com"
                    | "resources.download.minecraft.net"
                    | "libraries.minecraft.net"
                    | "meta.fabricmc.net"
                    | "maven.fabricmc.net"
                    | "meta.quiltmc.org"
                    | "maven.quiltmc.org"
                    | "repo1.maven.org"
                    | "repo.maven.apache.org"
                    | "maven.neoforged.net"
                    | "maven.minecraftforge.net"
                    | "files.minecraftforge.net"
                    | "api.modrinth.com"
                    | "cdn.modrinth.com"
                    | "api.curseforge.com"
                    | "edge.forgecdn.net"
                    | "mediafilez.forgecdn.net"
                    | "api.adoptium.net"
                    | "github.com"
                    | "release-assets.githubusercontent.com"
                    | "objects.githubusercontent.com"
            )
        )
}
pub fn client() -> Result<Client> {
    static CLIENT: std::sync::OnceLock<Client> = std::sync::OnceLock::new();
    if let Some(c) = CLIENT.get() {
        return Ok(c.clone());
    }
    let c = Client::builder()
        .user_agent(concat!("LOAM/", env!("CARGO_PKG_VERSION"), " (Minecraft Java launcher)"))
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(180))
        .redirect(reqwest::redirect::Policy::custom(|a| {
            if a.previous().len() > 5 || !allowed(a.url().as_str()) {
                a.error("Disallowed redirect")
            } else {
                a.follow()
            }
        }))
        .build()
        .map_err(|_| "Could not initialize HTTPS.".to_string())?;
    let _ = CLIENT.set(c.clone());
    Ok(c)
}
pub fn json(raw: &str) -> Result<Value> {
    request(raw, None, &[])
}
/// GET (or POST with `body`) JSON from an allowed host with extra request headers.
pub fn request(raw: &str, body: Option<&Value>, headers: &[(&str, &str)]) -> Result<Value> {
    if !allowed(raw) {
        return Err("This download host is not allowed.".into());
    }
    let mut req = match body {
        Some(b) => client()?.post(raw).json(b),
        None => client()?.get(raw),
    };
    for (k, v) in headers {
        req = req.header(*k, *v);
    }
    let mut r = req
        .send()
        .map_err(|_| {
            "You're offline, or the service is unavailable. Retry when connected.".to_string()
        })?
        .error_for_status()
        .map_err(|e| {
            format!(
                "Metadata service returned {}.",
                e.status().map(|s| s.as_u16()).unwrap_or(0)
            )
        })?;
    let mut b = Vec::new();
    r.by_ref()
        .take(32 * 1024 * 1024 + 1)
        .read_to_end(&mut b)
        .map_err(|e| e.to_string())?;
    if b.len() > 32 * 1024 * 1024 {
        return Err("Metadata exceeds size limit.".into());
    }
    serde_json::from_slice(&b).map_err(|_| "Invalid service metadata.".into())
}
pub fn text(raw: &str) -> Result<String> {
    if !allowed(raw) {
        return Err("Host not allowed.".into());
    }
    let r = client()?
        .get(raw)
        .send()
        .map_err(|_| "Network unavailable.".to_string())?
        .error_for_status()
        .map_err(|_| "Checksum unavailable.".to_string())?;
    if r.content_length().unwrap_or(0) > 4096 {
        return Err("Oversized checksum.".into());
    }
    let mut b = String::new();
    r.take(4097)
        .read_to_string(&mut b)
        .map_err(|e| e.to_string())?;
    if b.len() > 4096 {
        return Err("Oversized checksum.".into());
    }
    Ok(b)
}
pub fn download(
    raw: &str,
    path: &Path,
    expected: &str,
    kind: &str,
    size: u64,
    core: &Core,
    on_bytes: &mut dyn FnMut(u64),
) -> Result<()> {
    let trusted = allowed(raw);
    #[cfg(test)]
    let trusted = trusted || raw.starts_with("http://127.0.0.1:");
    if !trusted || expected.is_empty() {
        return Err("Download has no trusted origin or checksum.".into());
    }
    storage::no_links(path)?;
    if path.exists()
        && (size == 0 || fs::metadata(path).map_err(|e| e.to_string())?.len() == size)
        && storage::hash(path, kind)? == expected.to_lowercase()
    {
        on_bytes(size);
        return Ok(());
    }
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let partial = path.with_extension("loam-part");
    storage::no_links(&partial)?;
    if let Ok(metadata) = fs::metadata(&partial) {
        if (size == 0 || metadata.len() == size)
            && storage::hash(&partial, kind)? == expected.to_lowercase()
        {
            core.cancelled()?;
            fs::rename(&partial, path).map_err(|e| e.to_string())?;
            on_bytes(metadata.len());
            return Ok(());
        }
        if size > 0 && metadata.len() >= size {
            fs::remove_file(&partial).map_err(|e| e.to_string())?;
        }
    }
    for attempt in 0..3 {
        core.cancelled()?;
        let offset = fs::metadata(&partial).map(|m| m.len()).unwrap_or(0);
        let mut request = client()?.get(raw);
        if offset > 0 {
            request = request.header("Range", format!("bytes={offset}-"));
        }
        let res = (|| -> Result<()> {
            let response = request
                .send()
                .map_err(|_| "Download connection failed.".to_string())?;
            if response.status() == reqwest::StatusCode::RANGE_NOT_SATISFIABLE {
                if partial.exists() {
                    fs::remove_file(&partial).map_err(|e| e.to_string())?;
                }
                return Err(
                    "The saved resume point expired. Retrying this file from the beginning.".into(),
                );
            }
            let mut response=response
                .error_for_status()
                .map_err(|e| format!("Download server rejected the request (HTTP {}). Retry when the service is available.",e.status().map(|s|s.as_u16()).unwrap_or(0)))?;
            let append = offset > 0
                && response.status() == reqwest::StatusCode::PARTIAL_CONTENT
                && response
                    .headers()
                    .get("content-range")
                    .and_then(|v| v.to_str().ok())
                    .map(|v| v.starts_with(&format!("bytes {offset}-")))
                    .unwrap_or(false);
            let mut file = fs::OpenOptions::new()
                .create(true)
                .write(true)
                .append(append)
                .truncate(!append)
                .open(&partial)
                .map_err(|e| e.to_string())?;
            let mut total = if append { offset } else { 0 };
            if append {
                on_bytes(offset)
            }
            let mut buf = [0u8; 65536];
            loop {
                core.cancelled()?;
                let n = response
                    .read(&mut buf)
                    .map_err(|_| "Download interrupted; retry to resume.".to_string())?;
                if n == 0 {
                    break;
                }
                total += n as u64;
                if total > 4 * 1024 * 1024 * 1024 || (size > 0 && total > size) {
                    return Err("Downloaded size exceeds metadata.".into());
                }
                file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
                on_bytes(n as u64)
            }
            file.sync_all().map_err(|e| e.to_string())?;
            drop(file);
            if (size > 0 && total != size)
                || storage::hash(&partial, kind)? != expected.to_lowercase()
            {
                let _ = fs::remove_file(&partial);
                return Err("File verification failed. The corrupt download was discarded.".into());
            }
            fs::rename(&partial, path).map_err(|e| e.to_string())?;
            Ok(())
        })();
        match res {
            Ok(()) => return Ok(()),
            Err(e) => {
                if attempt == 2 || core.cancelled().is_err() {
                    return Err(e);
                }
                std::thread::sleep(Duration::from_millis(400 * (attempt + 1)));
            }
        }
    }
    Err("Download failed.".into())
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{atomic::AtomicBool, Mutex};
    fn core(root: std::path::PathBuf) -> Core {
        Core {
            root,
            data: Mutex::new(Data::default()),
            progress: Mutex::new(None),
            cancel: AtomicBool::new(false),
            busy: AtomicBool::new(false),
            running: Mutex::new(Default::default()),
            pending: Mutex::new(Default::default()),
            app: None,
        }
    }
    #[test]
    fn interrupted_download_resumes_and_verifies() {
        let t = tempfile::tempdir().unwrap();
        let c = core(t.path().into());
        let bytes = vec![42u8; 160000];
        let original = t.path().join("original");
        fs::write(&original, &bytes).unwrap();
        let digest = storage::hash(&original, "sha256").unwrap();
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/fixture", listener.local_addr().unwrap());
        let server = std::thread::spawn(move || {
            for attempt in 0..2 {
                let (mut socket, _) = listener.accept().unwrap();
                socket
                    .set_read_timeout(Some(Duration::from_secs(5)))
                    .unwrap();
                let mut req = vec![0; 4096];
                let n = socket.read(&mut req).unwrap();
                let request = String::from_utf8_lossy(&req[..n]).to_lowercase();
                if attempt == 0 {
                    write!(
                        socket,
                        "HTTP/1.1 200 OK\r\nContent-Length: 160000\r\nConnection: close\r\n\r\n"
                    )
                    .unwrap();
                    socket.write_all(&bytes[..80000]).unwrap();
                } else {
                    assert!(request.contains("range: bytes=80000-"), "{request}");
                    write!(socket,"HTTP/1.1 206 Partial Content\r\nContent-Length: 80000\r\nContent-Range: bytes 80000-159999/160000\r\nConnection: close\r\n\r\n").unwrap();
                    socket.write_all(&bytes[80000..]).unwrap();
                }
            }
        });
        let dest = t.path().join("file.jar");
        download(&url, &dest, &digest, "sha256", 160000, &c, &mut |_| {}).unwrap();
        server.join().unwrap();
        assert_eq!(storage::hash(&dest, "sha256").unwrap(), digest);
        assert!(!dest.with_extension("loam-part").exists());
    }
    #[test]
    fn corrupt_download_never_becomes_final_file() {
        let t = tempfile::tempdir().unwrap();
        let c = core(t.path().into());
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/fixture", listener.local_addr().unwrap());
        let server = std::thread::spawn(move || {
            for _ in 0..3 {
                let (mut socket, _) = listener.accept().unwrap();
                let mut req = [0; 2048];
                assert!(socket.read(&mut req).unwrap() > 0);
                socket
                    .write_all(
                        b"HTTP/1.1 200 OK\r\nContent-Length: 3\r\nConnection: close\r\n\r\nbad",
                    )
                    .unwrap();
            }
        });
        let dest = t.path().join("file.jar");
        assert!(download(&url, &dest, &"0".repeat(64), "sha256", 3, &c, &mut |_| {}).is_err());
        server.join().unwrap();
        assert!(!dest.exists());
        assert!(!dest.with_extension("loam-part").exists());
    }
    #[test]
    fn completed_partial_is_verified_before_range_request() {
        let t = tempfile::tempdir().unwrap();
        let c = core(t.path().into());
        let dest = t.path().join("file.jar");
        let partial = dest.with_extension("loam-part");
        fs::write(&partial, b"completed before cancellation").unwrap();
        let hash = storage::hash(&partial, "sha256").unwrap();
        let size = fs::metadata(&partial).unwrap().len();
        let mut done = 0;
        download(
            "https://libraries.minecraft.net/no-network-needed",
            &dest,
            &hash,
            "sha256",
            size,
            &c,
            &mut |n| done += n,
        )
        .unwrap();
        assert_eq!(done, size);
        assert_eq!(storage::hash(&dest, "sha256").unwrap(), hash);
        assert!(!partial.exists());
    }
    #[test]
    fn hosts_are_exact() {
        for u in [
            "http://libraries.minecraft.net/x",
            "https://cdn.modrinth.com.evil.test/x",
            "https://cdn.modrinth.com@evil.test/x",
            "https://127.0.0.1/x",
        ] {
            assert!(!allowed(u))
        }
        assert!(allowed("https://cdn.modrinth.com/data/x.jar"));
    }
}
