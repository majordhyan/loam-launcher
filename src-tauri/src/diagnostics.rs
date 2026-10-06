use crate::{model::*, storage};
use serde_json::{json, Value};
use std::{fs, io::Write};
pub fn redact(text: &str, secrets: &[&str]) -> String {
    let mut s = text.to_owned();
    for secret in secrets.iter().filter(|s| s.len() > 2) {
        s = s.replace(secret, "[REDACTED]")
    }
    for (p, r) in [
        (
            r"(?i)(access[_-]?token|refresh[_-]?token|authorization|identityToken|RpsTicket|client_secret)([\s\x22:=]+)(?:Bearer\s+)?[^\s\x22,}]+",
            "$1$2[REDACTED]",
        ),
        (r"(?i)(--accessToken\s+)[^\s]+", "$1[REDACTED]"),
        (
            r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+",
            "[TOKEN]",
        ),
        (r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[EMAIL]"),
        (r"(?i)([A-Z]:[/\\]+Users[/\\]+)[^/\\\s\x22]+", "$1[USER]"),
    ] {
        s = regex::Regex::new(p)
            .unwrap()
            .replace_all(&s, r)
            .into_owned()
    }
    s
}
pub fn report(core: &Core, input: &Value) -> Result<Value> {
    let d = core.data.lock().unwrap().clone();
    let names: Vec<&str> = if input["includeName"] == true {
        vec![]
    } else {
        d.accounts.iter().map(|a| a.name.as_str()).collect()
    };
    let selected_id = input["gameId"]
        .as_str()
        .filter(|s| !s.is_empty())
        .map(str::to_owned)
        .or_else(|| d.selected_game.clone())
        .or_else(|| d.games.first().map(|g| g.id.clone()));
    let selected = selected_id
        .as_ref()
        .and_then(|id| d.games.iter().find(|g| &g.id == id))
        .or_else(|| d.games.first());
    let account = d
        .accounts
        .iter()
        .find(|a| Some(&a.id) == d.selected_account.as_ref())
        .or_else(|| d.accounts.first());
    let id = input["id"]
        .as_str()
        .filter(|id| {
            regex::Regex::new(r"^LOAM-[A-Z0-9]{4}-[A-Z0-9]{2}$")
                .unwrap()
                .is_match(id)
        })
        .map(str::to_owned)
        .unwrap_or_else(|| {
            let s = uuid::Uuid::new_v4().simple().to_string().to_uppercase();
            format!("LOAM-{}-{}", &s[..4], &s[4..6])
        });
    let mut sys = sysinfo::System::new();
    sys.refresh_memory();
    let java = selected
        .and_then(|g| core.game_dir(&g.id).ok().and_then(|p| fs::read(p.join("install.json")).ok()))
        .and_then(|b| serde_json::from_slice::<Value>(&b).ok())
        .and_then(|p| p["java"].as_u64())
        .or_else(|| {
            let ver_opt = selected
                .map(|g| g.version.as_str())
                .or_else(|| input["version"].as_str().filter(|v| !v.is_empty()));
            ver_opt.map(|v| {
                if v.starts_with("1.8")
                    || v.starts_with("1.9")
                    || v.starts_with("1.10")
                    || v.starts_with("1.11")
                    || v.starts_with("1.12")
                    || v.starts_with("1.13")
                    || v.starts_with("1.14")
                    || v.starts_with("1.15")
                    || v.starts_with("1.16")
                {
                    8
                } else if v.starts_with("1.17") {
                    16
                } else if v.starts_with("1.18")
                    || v.starts_with("1.19")
                    || v.starts_with("1.20.0")
                    || v.starts_with("1.20.1")
                    || v.starts_with("1.20.2")
                    || v.starts_with("1.20.3")
                    || v.starts_with("1.20.4")
                {
                    17
                } else if v.starts_with("26.") {
                    25
                } else {
                    21
                }
            })
        });
    let default_account_kind = "offline".to_string();
    let account_kind = account.map(|a| &a.kind).unwrap_or(&default_account_kind);
    let raw_happened = input["happened"].as_str().unwrap_or("").trim();
    let happened_val = if !raw_happened.is_empty() {
        redact(raw_happened, &names)
    } else if selected.is_none() {
        "LOAM opened. No game instance created yet.".to_string()
    } else if !selected.map(|g| g.installed).unwrap_or(false) {
        format!(
            "Game {} ({}) is created but not yet installed.",
            selected.map(|g| g.name.as_str()).unwrap_or("Minecraft"),
            selected.map(|g| g.version.as_str()).unwrap_or("Unknown")
        )
    } else {
        "Manual report generated from LOAM.".to_string()
    };
    let os_name = sysinfo::System::long_os_version().unwrap_or_else(|| "Windows 11".into());
    let raw_expected = input["expected"].as_str().unwrap_or("").trim();
    let expected_val = if !raw_expected.is_empty() {
        redact(raw_expected, &names)
    } else if selected.is_none() {
        "Create and play Minecraft without issues.".to_string()
    } else {
        format!(
            "Minecraft {} ({}) should launch and run normally.",
            selected.map(|g| g.version.as_str()).unwrap_or(""),
            selected.and_then(|g| g.loader.as_deref()).unwrap_or("Vanilla")
        )
    };
    let raw_steps = input["steps"].as_str().unwrap_or("").trim();
    let steps_val = if !raw_steps.is_empty() {
        redact(raw_steps, &names)
    } else if selected.is_none() {
        "1. Open LOAM Launcher.\n2. Click Install to create a game.".to_string()
    } else {
        format!(
            "1. Select {}.\n2. Click PLAY.",
            selected.map(|g| g.name.as_str()).unwrap_or("game")
        )
    };
    let meta = json!({
        "schema": 1,
        "id": id,
        "loam": env!("CARGO_PKG_VERSION"),
        "os": os_name.clone(),
        "architecture": "x64",
        "ramMB": sys.total_memory() / 1048576,
        "freeDiskMB": storage::free_space(&core.root) / 1048576,
        "java": java.map(|j| json!(format!("Java {j} (Managed)"))).unwrap_or_else(|| json!("Managed on launch (Eclipse Temurin JRE)")),
        "game": selected.map(|g| json!({"name": g.name, "version": g.version, "loader": g.loader.as_deref().unwrap_or("Vanilla"), "memory": g.memory})).or_else(|| input["version"].as_str().filter(|v| !v.is_empty()).map(|v| json!({"name": v, "version": v, "loader": input["loader"].as_str().unwrap_or("Vanilla"), "status": "configured"}))).unwrap_or_else(|| json!({"status": "none_created", "loader": "Vanilla"})),
        "accountType": account_kind
    });
    let field = |key: &str| {
        redact(
            &input[key]
                .as_str()
                .unwrap_or("")
                .chars()
                .take(350)
                .collect::<String>(),
            &names,
        )
    };
    let game_str = selected
        .map(|g| format!("{} · {}", g.version, g.loader.as_deref().unwrap_or("Vanilla")))
        .or_else(|| {
            input["version"].as_str().filter(|v| !v.is_empty()).map(|v| {
                format!(
                    "{} · {}",
                    v,
                    input["loader"].as_str().unwrap_or("Vanilla")
                )
            })
        })
        .unwrap_or_else(|| "None created yet · Vanilla".into());
    let runtime_str = match java {
        Some(j) => {
            if crate::catalog::runtime_ready(&core.root, j).is_some() {
                format!("{j} (LOAM managed)")
            } else if crate::catalog::system_java().is_some() {
                format!("{j} (System)")
            } else {
                format!("{j} (Managed on launch)")
            }
        }
        None => "Managed on launch (Eclipse Temurin JRE)".to_string(),
    };
    let memory_str = if let Some(g) = selected {
        format!("{} MB", g.memory)
    } else if let Some(m) = input["memory"].as_u64().filter(|&m| m > 0) {
        format!("{m} MB")
    } else {
        format!("{} MB RAM", sys.total_memory() / 1048576)
    };
    let summary = format!(
        "**LOAM report** {id}\n**Type:** {}\n**LOAM:** {} · {} x64 · {} MB RAM\n**Game:** {}\n**Runtime:** Java {} · {}\n**Account type:** {}\n**Happened:** {}\n**Expected:** {}\n**Steps:** {}\n**Diagnostics:** Save the ZIP and attach it manually.",
        field("type"),
        env!("CARGO_PKG_VERSION"),
        os_name,
        sys.total_memory() / 1048576,
        game_str,
        runtime_str,
        memory_str,
        account_kind,
        happened_val,
        expected_val,
        steps_val
    );
    let mut count = 0;
    let summary = summary
        .chars()
        .take_while(|c| {
            count += c.len_utf16();
            count < 1800
        })
        .collect::<String>();
    let mut files = serde_json::Map::new();
    files.insert("summary.md".into(), json!(summary));
    if input["system"] != false {
        files.insert(
            "system.json".into(),
            json!(serde_json::to_string_pretty(&meta).unwrap()),
        );
    }
    if let Some(g) = selected {
        let path = core.game_dir(&g.id)?;
        for (key, filename, out) in [
            ("log", "logs/loam-latest.log", "latest.log"),
            ("launchPlan", "launch-plan.json", "launch-plan.json"),
        ] {
            if input[key] != false {
                if let Ok(bytes) = fs::read(path.join(filename)) {
                    files.insert(
                        out.into(),
                        json!(redact(
                            &String::from_utf8_lossy(&bytes[..bytes.len().min(2 * 1024 * 1024)]),
                            &names
                        )),
                    );
                }
            }
        }
    }
    files.insert(
        "report.json".into(),
        json!(serde_json::to_string_pretty(&json!({
            "schema": 1,
            "loam": env!("CARGO_PKG_VERSION"),
            "id": id,
            "type": field("type"),
            "happened": happened_val,
            "expected": expected_val,
            "steps": steps_val,
            "accountType": account_kind
        }))
        .unwrap()),
    );
    Ok(json!({"id":id,"summary":summary,"files":files}))
}
pub fn export(core: &Core, input: &Value) -> Result<String> {
    let r = report(core, input)?;
    export_snapshot(core, &r)
}
pub fn export_snapshot(core: &Core, r: &Value) -> Result<String> {
    let id = r["id"].as_str().unwrap();
    let path = core.root.join("reports").join(format!("{id}.zip"));
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let mut z = zip::ZipWriter::new(fs::File::create(&path).map_err(|e| e.to_string())?);
    for (name, body) in r["files"].as_object().unwrap() {
        z.start_file(
            name,
            zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated),
        )
        .map_err(|e| e.to_string())?;
        z.write_all(body.as_str().unwrap().as_bytes())
            .map_err(|e| e.to_string())?;
    }
    z.finish().map_err(|e| e.to_string())?;
    storage::write_json(
        &path.with_extension("json"),
        &json!({"id":id,"type":r["files"]["report.json"].as_str().and_then(|s|serde_json::from_str::<Value>(s).ok()).map(|v|v["type"].clone()),"date":chrono::Utc::now().to_rfc3339()}),
    )?;
    Ok(path.to_string_lossy().into_owned())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn canary_redaction() {
        let s = redact(
            r#"access_token=CANARY_A refresh_token: CANARY_R Authorization: Bearer CANARY_B --accessToken CANARY_C C:\Users\Alice\x alice@example.org AliceProfile"#,
            &["AliceProfile"],
        );
        for secret in [
            "CANARY_A",
            "CANARY_R",
            "CANARY_B",
            "CANARY_C",
            "Alice\\",
            "alice@example.org",
            "AliceProfile",
        ] {
            assert!(!s.contains(secret), "{secret}: {s}")
        }
    }
}
