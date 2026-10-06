use crate::{
    catalog::{self, Plan},
    model::*,
    network, storage,
};
use serde_json::{json, Value};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
    time::Instant,
};
pub fn install(core: &Shared, game_id: &str) -> Result<()> {
    let game = core.game(game_id)?;
    core.ensure_idle(game_id)?;
    core.step(
        game_id,
        "planning",
        "Step 1 of 4 · Resolving official metadata",
    );
    let plan = catalog::plan(core, &game.version, game.loader.as_deref())?;
    if storage::free_space(&core.root) < plan.disk {
        return Err(format!(
            "Not enough space. Need approximately {} MB of working space.",
            plan.disk / 1048576
        ));
    }
    let total = plan.artifacts.iter().map(|a| a.size).sum::<u64>();
    let done = AtomicU64::new(0);
    let files = AtomicU64::new(0);
    let start = Instant::now();
    let last = std::sync::Mutex::new(Instant::now());
    let index = std::sync::atomic::AtomicUsize::new(0);
    let error = std::sync::Mutex::new(None::<String>);
    core.step(
        game_id,
        "downloading",
        "Step 2 of 4 · Downloading and verifying files",
    );
    std::thread::scope(|scope| {
        for _ in 0..6 {
            let plan = &plan;
            let done = &done;
            let files = &files;
            let last = &last;
            let index = &index;
            let error = &error;
            scope.spawn(move || loop {
                let i = index.fetch_add(1, Ordering::Relaxed);
                if i >= plan.artifacts.len() || error.lock().unwrap().is_some() {
                    break;
                }
                let a = &plan.artifacts[i];
                let mut per_file = 0u64;
                let r = network::download(
                    &a.url,
                    &core.root.join(&a.path),
                    &a.hash,
                    &a.kind,
                    a.size,
                    core,
                    &mut |n| {
                        let delta = n.min(a.size.saturating_sub(per_file));
                        per_file += delta;
                        let d = done.fetch_add(delta, Ordering::Relaxed) + delta;
                        let mut l = last.lock().unwrap();
                        if l.elapsed().as_millis() > 150 {
                            *l = Instant::now();
                            core.emit(Progress {
                                id: game_id.into(),
                                game_id: game_id.into(),
                                phase: "downloading".into(),
                                message: format!(
                                    "{} of {} files · {}",
                                    files.load(Ordering::Relaxed),
                                    plan.artifacts.len(),
                                    a.path.rsplit('/').next().unwrap_or("file")
                                ),
                                done: d,
                                total,
                                files: files.load(Ordering::Relaxed),
                                speed: (d as f64 / start.elapsed().as_secs_f64().max(1.0)) as u64,
                                error: None,
                            });
                        }
                    },
                );
                if let Err(e) = r {
                    *error.lock().unwrap() = Some(e);
                    break;
                }
                files.fetch_add(1, Ordering::Relaxed);
            });
        }
    });
    if let Some(e) = error.into_inner().unwrap() {
        return Err(e);
    }
    core.cancelled()?;
    core.step(
        game_id,
        "runtime",
        &format!("Step 3 of 4 · Preparing Java {}", plan.java),
    );
    ensure_runtime(core, &plan, game_id)?;
    core.cancelled()?;
    core.step(
        game_id,
        "verifying",
        "Step 4 of 4 · Preparing natives and installation receipt",
    );
    let dir = core.game_dir(game_id)?;
    fs::create_dir_all(dir.join("natives")).map_err(|e| e.to_string())?;
    for a in plan.artifacts.iter().filter(|a| a.native) {
        core.cancelled()?;
        storage::extract_zip(
            &core.root.join(&a.path),
            &dir.join("natives"),
            512 * 1024 * 1024,
        )?;
    }
    let mut final_plan = plan.clone();
    for a in &mut final_plan.artifacts {
        if a.size == 0 {
            if let Ok(m) = fs::metadata(core.root.join(&a.path)) {
                a.size = m.len();
            }
        }
    }
    storage::write_json(&dir.join("install.json"), &final_plan)?;
    crate::doctor::validate_classpath(&core.root, &final_plan)?;
    {
        let mut data = core.data.lock().unwrap();
        let g = data
            .games
            .iter_mut()
            .find(|g| g.id == game_id)
            .ok_or("Game removed")?;
        g.installed = true;
        g.verified = Some(chrono::Utc::now().to_rfc3339());
    }
    core.save()?;
    core.step(
        game_id,
        "ready",
        "Installation verified. Your world is ready.",
    );
    Ok(())
}
fn ensure_runtime(core: &Core, plan: &Plan, game_id: &str) -> Result<()> {
    if catalog::runtime_ready(&core.root, plan.java).is_some() {
        return Ok(());
    }
    let dir = core.root.join(format!("cache/runtimes/java-{}", plan.java));
    let archive = dir.join("runtime.zip");
    let r = &plan.runtime;
    let size = r["size"].as_u64().ok_or("Missing runtime size")?;
    let mut done = 0;
    network::download(
        r["link"].as_str().ok_or("Runtime URL missing")?,
        &archive,
        r["checksum"].as_str().ok_or("Runtime checksum missing")?,
        "sha256",
        size,
        core,
        &mut |n| {
            done = (done + n).min(size);
            core.emit(Progress {
                id: game_id.into(),
                game_id: game_id.into(),
                phase: "runtime".into(),
                message: format!("Downloading verified Eclipse Temurin Java {}", plan.java),
                done,
                total: size,
                files: 0,
                speed: 0,
                error: None,
            });
        },
    )?;
    storage::extract_zip(&archive, &dir.join("extracted"), 1024 * 1024 * 1024)?;
    storage::atomic_write(&dir.join("extracted/.verified"), b"sha256 verified")?;
    Ok(())
}
fn arguments(value: &Value) -> Vec<String> {
    let mut out = vec![];
    for v in value.as_array().into_iter().flatten() {
        if let Some(s) = v.as_str() {
            out.push(s.to_owned())
        } else if catalog::rules(&v["rules"]) {
            if let Some(s) = v["value"].as_str() {
                out.push(s.into())
            } else {
                out.extend(
                    v["value"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(|v| v.as_str().map(str::to_owned)),
                )
            }
        }
    }
    out
}
pub fn validate_jvm_args(args: &[String]) -> Result<()> {
    if args.len() > 32
        || args.iter().any(|s| {
            s.len() > 512
                || s.contains(['\n', '\r', '\0'])
                || !(s.starts_with("-XX:") || s.starts_with("-D"))
                || s.to_ascii_lowercase().contains("java.class.path")
                || s.to_ascii_lowercase().contains("java.library.path")
        })
    {
        return Err("Advanced arguments accept up to 32 -XX: or -D options, one per line. Memory, classpath, agents, and launch identity are managed by LOAM.".into());
    }
    Ok(())
}
/// G1 settings per Java major. Experimental flags must follow the unlock flag, or Java
/// refuses to start (1.5.1 passed G1NewSizePercent to Java 16-20 without it).
/// AlwaysPreTouch was removed: it commits the whole heap before the title screen,
/// which slows startup and starves low-memory PCs.
pub fn jvm_tuning(java: u64) -> Vec<String> {
    let mut args: Vec<String> = vec!["-XX:+UseG1GC".into()];
    if java >= 16 {
        args.extend([
            "-XX:+UnlockExperimentalVMOptions".into(),
            format!("-XX:MaxGCPauseMillis={}", if java >= 21 { 20 } else { 30 }),
            "-XX:G1NewSizePercent=20".into(),
            "-XX:G1ReservePercent=20".into(),
        ]);
        if java >= 21 {
            args.push("-XX:SurvivorRatio=32".into());
        }
    } else {
        args.push("-XX:MaxGCPauseMillis=50".into());
    }
    args.extend(["-XX:-UsePerfData".into(), "-Dlog4j2.formatMsgNoLookups=true".into()]);
    args
}
pub fn launch(core: &Shared, id: &str) -> Result<()> {
    core.ensure_idle(id)?;
    let game = core.game(id)?;
    if !game.installed {
        return Err("Install this game before playing.".into());
    }
    let account = {
        let d = core.data.lock().unwrap();
        d.accounts
            .iter()
            .find(|a| Some(&a.id) == d.selected_account.as_ref())
            .cloned()
            .ok_or("Choose who's playing. Add or select an account.")?
    };
    core.step(id, "launching", "Step 1 of 4 · Checking account and Java");
    let token = crate::accounts::launch_token(core, &account)?;
    let dir = core.game_dir(id)?;
    if let Ok(b) = fs::read(dir.join("transaction.json")) {
        if let Ok(v) = serde_json::from_slice::<Value>(&b) {
            if v["state"] == "applying" {
                return Err("An interrupted import needs recovery. Restore the pre-import backup before playing.".into());
            }
        }
    }
    let plan: Plan = serde_json::from_slice(
        &fs::read(dir.join("install.json"))
            .map_err(|_| "Installation receipt is missing. Reinstall to repair.".to_string())?,
    )
    .map_err(|_| "Installation receipt is invalid.".to_string())?;
    let java = if let Some(j) = catalog::runtime_ready(&core.root, plan.java) {
        j
    } else {
        core.step(id, "launching", &format!("Preparing Java {}", plan.java));
        ensure_runtime(core, &plan, id)?;
        catalog::runtime_ready(&core.root, plan.java)
            .ok_or_else(|| format!("Java {} is required to run this game.", plan.java))?
    };
    // Fast verification: Check existence and exact size of each artifact without slow rehashing.
    // Full SHA checksums are performed during install and repair.
    core.step(
        id,
        "launching",
        "Step 2 of 4 · Verifying libraries and client",
    );
    let repairs = crate::doctor::repair_candidates(&core.root, &plan)?;
    for (position, index) in repairs.iter().enumerate() {
        let artifact = &plan.artifacts[*index];
        core.cancelled()?;
        core.step(id, "launching", &format!("Repairing required file {} of {} · verified download", position + 1, repairs.len()));
        network::download(&artifact.url, &core.root.join(&artifact.path), &artifact.hash,
            &artifact.kind, artifact.size, core, &mut |_| {})?;
        if artifact.native {
            storage::extract_zip(&core.root.join(&artifact.path), &dir.join("natives"), 512 * 1024 * 1024)?;
        }
    }
    if !repairs.is_empty() { crate::doctor::validate_classpath(&core.root, &plan)?; }
    for a in &plan.artifacts {
        core.cancelled()?;
        crate::doctor::check_artifact(&core.root, &a.path, a.size)
            .map_err(|e| format!("{e}. Use Verify / reinstall to repair."))?;
    }
    // Synchronize custom skin & appearance to this game instance
    let _ = crate::skins::sync_to_game(core, id);

    // High performance GPU preference on Windows hybrid systems
    crate::windows_perf::set_high_performance_gpu(&java);

    core.step(id, "launching", "Step 3 of 4 · Building launch arguments");
    let v = &plan.version;
    let cp = plan
        .classpath
        .iter()
        .map(|p| core.root.join(p).to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join(";");

    // Determine arm model parity for offline profile
    let is_slim = crate::skins::saved(core)
        .ok()
        .and_then(|s| s["variant"].as_str().map(|var| var == "slim"))
        .unwrap_or(false);
    let effective_uuid = if account.kind == "offline" {
        crate::accounts::adjust_uuid_for_variant(&account.uuid, is_slim)
    } else {
        account.uuid.clone()
    };

    let mut vars = std::collections::HashMap::<String, String>::new();
    for (k, val) in [
        ("auth_player_name", account.name.clone()),
        ("version_name", game.version.clone()),
        ("game_directory", dir.to_string_lossy().into_owned()),
        (
            "assets_root",
            core.root
                .join("cache/assets")
                .to_string_lossy()
                .into_owned(),
        ),
        (
            "assets_index_name",
            v["assetIndex"]["id"].as_str().unwrap_or("").into(),
        ),
        ("auth_uuid", effective_uuid.replace('-', "")),
        ("auth_access_token", token.clone()),
        ("auth_session", token.clone()),
        (
            "user_type",
            if account.kind == "microsoft" {
                "msa"
            } else {
                "legacy"
            }
            .into(),
        ),
        ("version_type", "release".into()),
        ("user_properties", "{}".into()),
        (
            "natives_directory",
            dir.join("natives").to_string_lossy().into_owned(),
        ),
        ("launcher_name", "LOAM".into()),
        ("launcher_version", env!("CARGO_PKG_VERSION").into()),
        ("classpath", cp.clone()),
        ("classpath_separator", ";".into()),
        (
            "library_directory",
            core.root
                .join("cache/libraries")
                .to_string_lossy()
                .into_owned(),
        ),
        ("clientid", String::new()),
        ("auth_xuid", String::new()),
    ] {
        vars.insert(k.into(), val);
    }
    let expand = |s: String| -> Result<String> {
        let mut s = s;
        for (k, v) in &vars {
            s = s.replace(&format!("${{{k}}}"), v)
        }
        if s.contains("${") {
            return Err(format!(
                "Unresolved launch argument: {}",
                crate::diagnostics::redact(&s, &[&token, &account.name])
            ));
        }
        Ok(s)
    };
    // Fixed heap (-Xms = -Xmx) to eliminate runtime resize stutter
    let mut args = vec![
        format!("-Xmx{}M", game.memory),
        format!("-Xms{}M", game.memory),
    ];
    args.extend(jvm_tuning(plan.java));
    validate_jvm_args(&game.jvm_args)?;
    args.extend(game.jvm_args.clone());
    let jvm = arguments(&v["arguments"]["jvm"]);
    if jvm.is_empty() {
        args.extend([
            format!("-Djava.library.path={}", dir.join("natives").display()),
            "-cp".into(),
            cp.clone(),
        ]);
    } else {
        for s in jvm {
            args.push(expand(s)?);
        }
        if !args.iter().any(|a| a == "-cp") {
            args.extend(["-cp".into(), cp.clone()]);
        }
        if !args.iter().any(|a| a.starts_with("-Djava.library.path=")) {
            args.push(format!("-Djava.library.path={}", dir.join("natives").display()));
        }
    }
    if let Some(a) = v["logging"]["client"]["argument"].as_str() {
        let f = v["logging"]["client"]["file"]["id"]
            .as_str()
            .ok_or("Missing logging file")?;
        args.push(a.replace(
            "${path}",
            &core.root.join("cache/logging").join(f).to_string_lossy(),
        ));
    }
    args.push(v["mainClass"].as_str().ok_or("Missing main class")?.into());
    let mut game_args = arguments(&v["arguments"]["game"]);
    if game_args.is_empty() {
        game_args = v["minecraftArguments"]
            .as_str()
            .ok_or("Missing game arguments")?
            .split_whitespace()
            .map(str::to_owned)
            .collect();
    }
    for s in game_args {
        args.push(expand(s)?)
    }
    if let (Some(w), Some(h)) = (game.width, game.height) {
        args.extend([
            "--width".into(),
            w.to_string(),
            "--height".into(),
            h.to_string(),
        ]);
    }
    let redacted = crate::diagnostics::redact(
        &serde_json::to_string_pretty(
            &json!({"java":java,"arguments":args,"accountType":account.kind,"game":game.version}),
        )
        .unwrap(),
        &[&token, &account.name],
    );
    storage::atomic_write(&dir.join("launch-plan.json"), redacted.as_bytes())?;
    core.cancelled()?;
    core.step(id, "launching", "Step 4 of 4 · Starting Minecraft");
    fs::create_dir_all(dir.join("logs")).map_err(|e| e.to_string())?;
    let mut command = Command::new(java);
    command
        .args(args)
        .current_dir(&dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env_remove("JAVA_TOOL_OPTIONS")
        .env_remove("_JAVA_OPTIONS")
        .env_remove("JDK_JAVA_OPTIONS");
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    let mut child = command
        .spawn()
        .map_err(|e| format!("Minecraft could not start: {e}"))?;
    let child_pid = child.id();
    core.running.lock().unwrap().insert(id.into(), child_pid);
    crate::windows_perf::optimize_game_process(child_pid);

    let app_handle = core.app.clone();
    let monitor_id = id.to_string();
    std::thread::spawn(move || {
        for _ in 0..150 {
            std::thread::sleep(std::time::Duration::from_millis(100));
            if crate::windows_perf::find_game_window(child_pid).is_some() {
                if let Some(app) = &app_handle {
                    use tauri::Emitter;
                    let _ = app.emit("window-shown", &monitor_id);
                }
                break;
            }
        }
    });

    let _ = fs::remove_file(dir.join("logs/loam-crash.json"));
    let log = Arc::new(std::sync::Mutex::new(
        fs::File::create(dir.join("logs/loam-latest.log")).map_err(|e| e.to_string())?,
    ));
    let streams: Vec<Box<dyn std::io::Read + Send>> = vec![
        Box::new(child.stdout.take().unwrap()),
        Box::new(child.stderr.take().unwrap()),
    ];
    for stream in streams {
        let log = log.clone();
        let token = token.clone();
        let name = account.name.clone();
        std::thread::spawn(move || {
            let mut written = 0usize;
            for line in BufReader::new(stream)
                .lines()
                .map_while(std::result::Result::ok)
            {
                if written > 8 * 1024 * 1024 {
                    continue;
                }
                let clean = crate::diagnostics::redact(&line, &[&token, &name]);
                written += clean.len();
                let _ = writeln!(log.lock().unwrap(), "{clean}");
            }
        });
    }
    core.step(
        id,
        "running",
        &format!(
            "Playing since {} · {}",
            chrono::Local::now().format("%H:%M"),
            if account.kind == "offline" {
                "OFFLINE PROFILE"
            } else {
                "MICROSOFT"
            }
        ),
    );
    let c = core.clone();
    let id = id.to_string();
    let started_at = std::time::SystemTime::now();
    std::thread::spawn(move || {
        let status = child.wait();
        if let Some(app) = &c.app {
            use tauri::Emitter;
            let _ = app.emit("game-exited", &id);
        }
        let was_running = c.running.lock().unwrap().remove(&id).is_some();
        let failed_code = match &status {
            Ok(s) if s.success() || !was_running => None,
            Ok(s) => Some(s.code().unwrap_or(-1)),
            Err(_) => Some(-1),
        };
        let error = failed_code.map(|code| {
            // Give the log readers a moment to flush the final lines before decoding.
            std::thread::sleep(std::time::Duration::from_millis(300));
            let diagnosis = crate::crash::diagnose(&c, &id, started_at);
            match &diagnosis {
                Some(d) => {
                    let _ = storage::write_json(&dir.join("logs/loam-crash.json"), d);
                    if let Some(app) = &c.app {
                        use tauri::Emitter;
                        let _ = app.emit("crash-diagnosis", serde_json::json!({"gameId": id, "diagnosis": d}));
                    }
                    format!("{}. {}", d.title, d.summary)
                }
                None => format!(
                    "The game closed unexpectedly (exit code {code}). LOAM did not recognise this crash; view the log or create a report."
                ),
            }
        });
        if c.busy.load(Ordering::Relaxed)
            && c.progress
                .lock()
                .unwrap()
                .as_ref()
                .is_some_and(|p| p.game_id != id)
        {
            if let Some(app) = &c.app {
                use tauri::Emitter;
                if let Some(e) = error {
                    let _ = app.emit("game-failure", e);
                }
                let _ = app.emit("state-changed", ());
            }
            return;
        }
        match error {
            None => c.step(&id, "ready", "Game closed. Ready to play."),
            Some(msg) => c.emit(Progress {
                id: id.clone(),
                game_id: id,
                phase: "failed".into(),
                message: msg.clone(),
                error: Some(msg),
                done: 0,
                total: 0,
                files: 0,
                speed: 0,
            }),
        }
    });
    Ok(())
}
pub fn stop(core: &Core, id: &str) -> Result<()> {
    let pid = core
        .running
        .lock()
        .unwrap()
        .get(id)
        .copied()
        .ok_or("Game is not running")?;

    // Attempt graceful shutdown via WM_CLOSE first so worlds and inventories save cleanly
    if crate::windows_perf::post_graceful_close(pid) {
        for _ in 0..30 {
            std::thread::sleep(std::time::Duration::from_millis(100));
            if !core.running.lock().unwrap().contains_key(id) {
                return Ok(());
            }
        }
    }

    core.running.lock().unwrap().remove(id);
    if !crate::windows_perf::terminate_process(pid) {
        core.running.lock().unwrap().insert(id.into(), pid);
        return Err("Could not stop Minecraft.".into());
    }
    core.running.lock().unwrap().remove(id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn experimental_flags_always_follow_unlock() {
        for java in [8, 16, 17, 21, 25] {
            let args = jvm_tuning(java);
            let unlock = args.iter().position(|a| a == "-XX:+UnlockExperimentalVMOptions");
            for (i, a) in args.iter().enumerate() {
                if a.starts_with("-XX:G1NewSizePercent") || a.starts_with("-XX:G1MaxNewSizePercent") {
                    assert!(unlock.is_some_and(|u| u < i), "Java {java}: {a} before unlock");
                }
            }
            assert!(!args.iter().any(|a| a.contains("AlwaysPreTouch")));
        }
    }
    /// Runs real JVMs when `LOAM_TEST_JAVA` lists `major=path` pairs separated by `;`.
    #[test]
    fn tuning_is_accepted_by_real_java_when_available() {
        let Ok(list) = std::env::var("LOAM_TEST_JAVA") else { return };
        for pair in list.split(';').filter(|p| !p.is_empty()) {
            let (major, path) = pair.split_once('=').unwrap();
            let out = Command::new(path).args(jvm_tuning(major.parse().unwrap())).arg("-Xmx256M").arg("-version").output().unwrap();
            assert!(out.status.success(), "Java {major} rejected tuning: {}", String::from_utf8_lossy(&out.stderr));
        }
    }
}
