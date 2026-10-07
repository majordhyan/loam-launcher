use crate::{accounts, model::*, storage};
use serde_json::{json, Value};
use tauri_plugin_updater::UpdaterExt;
/// Stable, deliberately conservative fingerprints; arbitrary log text never becomes a feed key.
pub fn fingerprint(message: &str) -> &'static str {
    let m = message.to_ascii_lowercase();
    if m.contains("unsupportedclassversionerror") {
        "launch.java.unsupported_class_version"
    } else if m.contains("hash") || m.contains("checksum") || m.contains("verification failed") {
        "install.integrity.hash_mismatch"
    } else if m.contains("disk space") || m.contains("not enough space") {
        "install.disk.insufficient"
    } else if m.contains("authentication expired") {
        "account.microsoft.expired"
    } else if m.contains("configuration") || m.contains("not configured") {
        "configuration.missing"
    } else if m.contains("archive") {
        "import.archive.invalid"
    } else {
        "unknown"
    }
}
pub fn match_issue(feed: &Value, message: &str) -> Option<Value> {
    let key = fingerprint(message);
    if key == "unknown" {
        return None;
    }
    feed["issues"]
        .as_array()?
        .iter()
        .find(|issue| issue["fingerprint"] == key)
        .cloned()
}
fn feed_url(raw: &str) -> Result<url::Url> {
    let u = url::Url::parse(raw).map_err(|_| "Feed URL is not configured.")?;
    if u.scheme() != "https" || !u.username().is_empty() || u.password().is_some() {
        return Err("Feed must use HTTPS.".into());
    }
    Ok(u)
}
pub fn issues(c: &Core) -> Result<Value> {
    let cache = c.root.join("cache/known-issues.json");
    let fetch = (|| -> Result<Value> {
        let cfg = accounts::config();
        let u = feed_url(cfg["support"]["knownIssuesUrl"].as_str().unwrap_or(""))?;
        let host = u.host_str().unwrap_or("").to_owned();
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .redirect(reqwest::redirect::Policy::custom(move |a| {
                if a.url().scheme() == "https"
                    && a.url().host_str() == Some(&host)
                    && a.previous().len() < 3
                {
                    a.follow()
                } else {
                    a.error("Disallowed feed redirect")
                }
            }))
            .build()
            .map_err(|e| e.to_string())?;
        let mut r = client
            .get(u)
            .send()
            .map_err(|_| "Feed unavailable")?
            .error_for_status()
            .map_err(|_| "Feed unavailable")?;
        use std::io::Read;
        let mut b = Vec::new();
        r.by_ref()
            .take(1024 * 1024)
            .read_to_end(&mut b)
            .map_err(|e| e.to_string())?;
        let v: Value = serde_json::from_slice(&b).map_err(|_| "Invalid feed")?;
        if v["schema"] != 1 || !v["issues"].is_array() {
            return Err("Unsupported feed schema.".into());
        }
        for item in v["issues"].as_array().unwrap() {
            if !item["id"].is_string()
                || !item["fingerprint"].is_string()
                || !item["title"].is_string()
                || !matches!(
                    item["status"].as_str(),
                    Some("investigating" | "workaround" | "fixed")
                )
            {
                return Err("Invalid issue entry.".into());
            }
        }
        storage::write_json(&cache, &v)?;
        Ok(v)
    })();
    Ok(fetch.unwrap_or_else(|_| {
        std::fs::read(cache)
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .unwrap_or(json!({"schema":1,"issues":[]}))
    }))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn matches_only_known_fingerprints() {
        let feed = json!({"issues":[{"fingerprint":"launch.java.unsupported_class_version","fixedIn":"1.0.3"},{"fingerprint":"unknown"}]});
        assert_eq!(
            match_issue(&feed, "java.lang.UnsupportedClassVersionError: Foo").unwrap()["fixedIn"],
            "1.0.3"
        );
        assert!(match_issue(&feed, "Unexpected failure").is_none());
    }
}
#[tauri::command]
pub async fn check_update(app: tauri::AppHandle) -> Result<Value> {
    let cfg = accounts::config();
    let endpoint = cfg["updates"]["endpoint"].as_str().unwrap_or("");
    let key = cfg["updates"]["publicKey"].as_str().unwrap_or("");
    if endpoint.is_empty() || key.is_empty() {
        return Err("Updates are not configured for this development build. A signed release feed is required.".into());
    }
    let u = feed_url(endpoint)?;
    let updater = app
        .updater_builder()
        .endpoints(vec![u])
        .map_err(|e| e.to_string())?
        .pubkey(key)
        .build()
        .map_err(|e| e.to_string())?;
    match updater
        .check()
        .await
        .map_err(|_| "Couldn't reach LOAM's update feed. Check your connection and try again.".to_string())?
    {
        Some(u) => Ok(json!({"available":true,"version":u.version,"notes":u.body,"date":u.date.map(|d| d.to_string()),"current":env!("CARGO_PKG_VERSION")})),
        None => Ok(json!({"available":false,"current":env!("CARGO_PKG_VERSION")})),
    }
}
#[tauri::command]
pub async fn install_update(app: tauri::AppHandle, core: tauri::State<'_, Shared>) -> Result<()> {
    if core.busy.load(std::sync::atomic::Ordering::Relaxed)
        || !core.running.lock().unwrap().is_empty()
    {
        return Err("Finish current operations and close Minecraft before updating.".into());
    }
    let cfg = accounts::config();
    let key = cfg["updates"]["publicKey"]
        .as_str()
        .ok_or("Signing key not configured")?;
    if key.is_empty() {
        return Err("Signing key not configured.".into());
    }
    let updater = app
        .updater_builder()
        .endpoints(vec![feed_url(
            cfg["updates"]["endpoint"].as_str().unwrap_or(""),
        )?])
        .map_err(|e| e.to_string())?
        .pubkey(key)
        .build()
        .map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("No update available")?;
    core.save()?;
    storage::copy_tree(
        &core.root.join("reports"),
        &core.root.join("update-recovery/reports"),
    )
    .ok();
    storage::write_json(
        &core.root.join("update-recovery/state.json"),
        &*core.data.lock().unwrap(),
    )?;
    // Progress for the Settings panel; the installer then replaces LOAM and restarts it.
    let mut got = 0u64;
    let progress = app.clone();
    let done = app.clone();
    update
        .download_and_install(
            move |chunk, total| {
                use tauri::Emitter;
                got += chunk as u64;
                let _ = progress.emit("update-progress", json!({"downloaded": got, "total": total}));
            },
            move || {
                use tauri::Emitter;
                let _ = done.emit("update-progress", json!({"installing": true}));
            },
        )
        .await
        .map_err(|e| format!("Update was not installed: {e}"))?;
    Ok(())
}
