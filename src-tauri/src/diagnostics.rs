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
    let selected = d
        .games
        .iter()
        .find(|g| Some(&g.id) == d.selected_game.as_ref());
    let account = d
        .accounts
        .iter()
        .find(|a| Some(&a.id) == d.selected_account.as_ref());
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
        .and_then(|g| fs::read(core.root.join("games").join(&g.id).join("install.json")).ok())
        .and_then(|b| serde_json::from_slice::<Value>(&b).ok())
        .and_then(|p| p["java"].as_u64());
    let meta = json!({"schema":1,"id":id,"loam":env!("CARGO_PKG_VERSION"),"os":sysinfo::System::long_os_version(),"architecture":"x64","ramMB":sys.total_memory()/1048576,"freeDiskMB":storage::free_space(&core.root)/1048576,"java":java,"game":selected.map(|g|json!({"version":g.version,"loader":g.loader,"memory":g.memory})),"accountType":account.map(|a|&a.kind)});
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
    let summary=format!("**LOAM report** {id}\n**Type:** {}\n**LOAM:** {} · Windows x64\n**Game:** {} · {}\n**Account type:** {}\n**Happened:** {}\n**Expected:** {}\n**Steps:** {}\n**Diagnostics:** Save the ZIP and attach it manually.",field("type"),env!("CARGO_PKG_VERSION"),selected.map(|g|g.version.as_str()).unwrap_or("None"),selected.and_then(|g|g.loader.as_deref()).unwrap_or("Vanilla"),account.map(|a|a.kind.as_str()).unwrap_or("None"),field("happened"),field("expected"),field("steps"));
    let summary = summary.replace(
        "Windows x64",
        &format!(
            "{} x64 · {} MB RAM",
            sysinfo::System::long_os_version().unwrap_or_else(|| "Windows".into()),
            sys.total_memory() / 1048576
        ),
    );
    let summary = summary.replace(
        "**Account type:**",
        &format!(
            "**Runtime:** Java {} · {} MB\n**Account type:**",
            java.map(|v| v.to_string())
                .unwrap_or_else(|| "not installed".into()),
            selected.map(|g| g.memory).unwrap_or(0)
        ),
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
    files.insert("report.json".into(),json!(serde_json::to_string_pretty(&json!({"schema":1,"id":id,"type":field("type"),"happened":field("happened"),"expected":field("expected"),"steps":field("steps"),"accountType":account.map(|a|&a.kind)})).unwrap()));
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
