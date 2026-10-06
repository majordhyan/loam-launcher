use crate::{accounts, catalog, diagnostics, engine, imports, model::*, network, storage};
use serde_json::{json, Value};
use std::{
    fs,
    sync::{atomic::Ordering, Arc},
};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
fn s<'a>(a: &'a Value, key: &str) -> Result<&'a str> {
    a[key].as_str().ok_or_else(|| format!("Missing {key}."))
}
fn snapshot(c: &Core) -> Value {
    let mut sys = sysinfo::System::new();
    sys.refresh_memory();
    json!({"data":*c.data.lock().unwrap(),"operation":*c.progress.lock().unwrap(),"running":*c.running.lock().unwrap(),"root":c.root,"ramMB":sys.total_memory()/1048576,"freeDisk":storage::free_space(&c.root),"version":env!("CARGO_PKG_VERSION"),"capabilities":{"offline":accounts::capabilities("offline"),"microsoft":accounts::capabilities("microsoft")},"configuration":{"microsoft":!accounts::config()["microsoftClientId"].as_str().unwrap_or("").is_empty(),"discord":!accounts::config()["support"]["discordInviteUrl"].as_str().unwrap_or("").contains("REPLACE_ME"),"updates":!accounts::config()["updates"]["endpoint"].as_str().unwrap_or("").is_empty()}})
}
fn start(
    c: &Shared,
    id: &str,
    task: impl FnOnce(&Shared, &str) -> Result<()> + Send + 'static,
) -> Result<Value> {
    if c.busy.swap(true, Ordering::SeqCst) {
        return Err("Another operation is in progress. Wait or cancel it first.".into());
    }
    c.cancel.store(false, Ordering::SeqCst);
    c.step(id, "planning", "Preparing operation");
    let core = c.clone();
    let id = id.to_owned();
    std::thread::spawn(move || {
        let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| task(&core, &id)));
        let err = match outcome {
            Ok(Ok(())) => None,
            Ok(Err(e)) => Some(e),
            Err(_) => Some(
                "An internal operation failed. Your files were retained; report this problem."
                    .into(),
            ),
        };
        if let Some(e) = err {
            let cancelled = core.cancel.load(Ordering::Relaxed);
            core.emit(Progress {
                id: id.clone(),
                game_id: id,
                phase: if cancelled { "cancelled" } else { "failed" }.into(),
                message: e.clone(),
                done: 0,
                total: 0,
                files: 0,
                speed: 0,
                error: if cancelled { None } else { Some(e) },
            })
        }
        core.busy.store(false, Ordering::SeqCst);
        if let Some(app) = &core.app {
            use tauri::Emitter;
            let _ = app.emit("state-changed", ());
        }
    });
    Ok(json!({"started":true}))
}
pub fn execute(c: &Shared, op: &str, a: Value) -> Result<Value> {
    if let Some(app) = &c.app {
        let bootstrap = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
        let next = crate::maintenance::data_root(&bootstrap)?;
        if fs::canonicalize(&next).ok() != fs::canonicalize(&c.root).ok()
            && !matches!(
                op,
                "snapshot"
                    | "restart"
                    | "reportPreview"
                    | "exportReport"
                    | "reports"
                    | "knownIssues"
                    | "matchIssue"
                    | "openFolder"
                    | "openLink"
                    | "storageUsage"
            )
        {
            return Err(
                "Storage migration is complete. Restart LOAM before making more changes.".into(),
            );
        }
    }
    if matches!(
        op,
        "gameSettings" | "toggleContent" | "deleteGame" | "removeAccount"
    ) && c.busy.load(Ordering::SeqCst)
    {
        return Err("Wait for the current operation before making changes.".into());
    }
    if op == "matchIssue" {
        return Ok(
            crate::updates::match_issue(&crate::updates::issues(c)?, s(&a, "message")?)
                .unwrap_or(Value::Null),
        );
    }
    if matches!(op, "plan" | "modrinth" | "inspectImport") {
        if c.busy.load(Ordering::SeqCst) {
            return Err("Wait for the current operation before reviewing content.".into());
        }
        c.cancel.store(false, Ordering::SeqCst);
    }
    match op {
        "launcherMinimize" | "launcherRestore" => {
            let app = c.app.as_ref().ok_or("Desktop required")?;
            let window = app.get_webview_window("main").ok_or("Launcher window unavailable")?;
            if op == "launcherMinimize" { window.minimize().map_err(|e| e.to_string())?; }
            else { window.show().map_err(|e| e.to_string())?; window.unminimize().map_err(|e| e.to_string())?; }
            Ok(json!(true))
        }
        "verifyApp" => crate::trust::verify_app(),
        "doctor" => {
            if c.busy.load(Ordering::SeqCst) { return Err("Finish the current operation before checking files.".into()); }
            serde_json::to_value(crate::doctor::inspect(c, s(&a, "id")?)?).map_err(|e| e.to_string())
        }
        "skinStudio" => crate::skins::saved(c),
        "skinImport" => crate::skins::import_local(s(&a, "path")?),
        "skinOnline" => crate::skins::import_online(s(&a, "input")?),
        "skinSave" => crate::skins::save(c, &a),
        "skinSync" => {
            crate::skins::sync_to_all_games(c)?;
            Ok(json!(true))
        },
        "skinWardrobe" => crate::skins::wardrobe(c),
        "skinApply" => crate::skins::apply(c, &a),
        "capeApply" => crate::skins::apply_cape(c, s(&a, "id")?),
        "storageUsage" => crate::maintenance::usage(&c.root),
        "restart" => {
            if c.busy.load(Ordering::Relaxed) || !c.running.lock().unwrap().is_empty() {
                return Err("Finish operations and stop games before restarting.".into());
            }
            c.app.as_ref().ok_or("Desktop required")?.restart()
        }
        "cleanCache" => start(c, "", |c, _| {
            let size = crate::maintenance::clean_cache(c)?;
            c.step(
                "",
                "ready",
                &format!(
                    "Cleared {} MB of cached downloads. Installed games are retained.",
                    size / 1048576
                ),
            );
            Ok(())
        }),
        "migrateStorage" => {
            let target = std::path::PathBuf::from(s(&a, "destination")?);
            let bootstrap = c
                .app
                .as_ref()
                .ok_or("Desktop required")?
                .path()
                .app_local_data_dir()
                .map_err(|e| e.to_string())?;
            start(c, "", move |c, _| {
                crate::maintenance::migrate(c, &target, &bootstrap)
            })
        }
        "snapshot" => Ok(snapshot(c)),
        "versions" => catalog::versions(c),
        "news" => crate::news::get(c),
        "fabric" => catalog::fabric(s(&a, "version")?),
        "quilt" => catalog::quilt(s(&a, "version")?),
        "fabricGames" => {
            let list = catalog::fabric_games(c)?;
            Ok(json!(list))
        }
        "quiltGames" => {
            let list = catalog::quilt_games(c)?;
            Ok(json!(list))
        }
        "fabricLoaders" => {
            let v = network::json("https://meta.fabricmc.net/v2/versions/loader")?;
            Ok(v)
        }
        "quiltLoaders" => {
            let v = network::json("https://meta.quiltmc.org/v3/versions/loader")?;
            Ok(v)
        }
        "plan" => {
            let p = catalog::plan(c, s(&a, "version")?, a["loader"].as_str())?;
            Ok(
                json!({"bytes":p.bytes,"disk":p.disk,"java":p.java,"files":p.artifacts.len(),"free":storage::free_space(&c.root)}),
            )
        }
        "createGame" => {
            if c.busy.load(Ordering::Relaxed) {
                return Err("Wait for the current operation to finish.".into());
            }
            let name = s(&a, "name")?.trim();
            if name.is_empty() || name.len() > 64 {
                return Err("Use a game name between 1 and 64 characters.".into());
            }
            let version = s(&a, "version")?;
            let versions = catalog::versions(c)?;
            if !versions["versions"]
                .as_array()
                .unwrap()
                .iter()
                .any(|v| v["id"] == version)
            {
                return Err("Choose a supported version.".into());
            }
            let mut sys = sysinfo::System::new();
            sys.refresh_memory();
            let memory = a["memory"].as_u64().unwrap_or(4096) as u32;
            if memory < 512 || memory as u64 > sys.total_memory() / 1048576 {
                return Err("Memory must fit the available system RAM.".into());
            }
            let game = Game {
                id: uuid::Uuid::new_v4().to_string(),
                folder: Some(crate::game_folders::available(&c.root, name, version)?),
                name: name.into(),
                version: version.into(),
                loader: a["loader"].as_str().map(str::to_owned),
                memory,
                width: None,
                height: None,
                jvm_args: vec![],
                installed: false,
                verified: None,
                created: chrono::Utc::now().to_rfc3339(),
            };
            crate::maintenance::prepare_game(&c.root.join("games").join(game.folder.as_deref().unwrap_or(&game.id)))?;
            {
                let mut d = c.data.lock().unwrap();
                d.games.push(game.clone());
                d.selected_game = Some(game.id.clone());
                d.preferences.setup_done = true;
            }
            c.save()?;
            Ok(json!(game))
        }
        "selectGame" => {
            let id = s(&a, "id")?;
            c.game(id)?;
            c.data.lock().unwrap().selected_game = Some(id.into());
            c.save()?;
            Ok(snapshot(c))
        }
        "selectAccount" => {
            let id = s(&a, "id")?;
            let mut d = c.data.lock().unwrap();
            if !d.accounts.iter().any(|a| a.id == id) {
                return Err("Account not found.".into());
            }
            d.selected_account = Some(id.into());
            drop(d);
            c.save()?;
            Ok(snapshot(c))
        }
        "offlineAccount" => {
            accounts::add_offline(c, s(&a, "name")?)?;
            Ok(snapshot(c))
        }
        "removeAccount" => {
            accounts::remove(c, s(&a, "id")?)?;
            Ok(snapshot(c))
        }
        "signIn" => start(c, "", |c, _| {
            match accounts::sign_in(c)? {
                Some(_) => c.step("", "ready", "Minecraft Java account verified."),
                None => c.step("", "cancelled", "Sign-in cancelled."),
            }
            Ok(())
        }),
        "install" => {
            let id = s(&a, "id")?;
            c.game(id)?;
            start(c, id, engine::install)
        }
        "launch" => {
            let id = s(&a, "id")?;
            c.game(id)?;
            start(c, id, engine::launch)
        }
        "stop" => {
            engine::stop(c, s(&a, "id")?)?;
            Ok(json!(true))
        }
        "cancel" => {
            c.cancel.store(true, Ordering::SeqCst);
            Ok(json!(true))
        }
        "preferences" => {
            let mut d = c.data.lock().unwrap();
            if let Some(v) = a["reducedMotion"].as_bool() {
                d.preferences.reduced_motion = v;
            }
            if let Some(v) = a["snapshots"].as_bool() {
                d.preferences.snapshots = v
            }
            if let Some(v) = a["setupDone"].as_bool() {
                d.preferences.setup_done = v
            }
            drop(d);
            c.save()?;
            Ok(snapshot(c))
        }
        "gameSettings" => {
            let id = s(&a, "id")?;
            c.ensure_idle(id)?;
            if c.busy.load(Ordering::Relaxed) { return Err("Wait for the current operation to finish.".into()); }
            let name = s(&a, "name")?.trim();
            if name.is_empty() || name.len() > 64 {
                return Err("Use 1–64 characters for the name.".into());
            }
            let memory = a["memory"].as_u64().ok_or("Memory missing")?;
            let mut sys = sysinfo::System::new();
            sys.refresh_memory();
            if memory < 512 || memory > sys.total_memory() / 1048576 {
                return Err("Invalid memory allocation.".into());
            }
            let mut d = c.data.lock().unwrap();
            let g = d
                .games
                .iter_mut()
                .find(|g| g.id == id)
                .ok_or("Game missing")?;
            let original = g.clone();
            g.name = name.into();
            g.memory = memory as u32;
            if let (Some(width), Some(height)) = (a["width"].as_u64(), a["height"].as_u64()) {
                if !(640..=7680).contains(&width) || !(360..=4320).contains(&height) {
                    *g = original;
                    return Err("Resolution must be between 640×360 and 7680×4320.".into());
                }
                g.width = Some(width as u32);
                g.height = Some(height as u32);
            }
            if let Some(args) = a["jvmArgs"].as_array() {
                let args: Vec<String> = args
                    .iter()
                    .map(|v| v.as_str().unwrap_or("").to_owned())
                    .filter(|v| !v.trim().is_empty())
                    .collect();
                if let Err(e) = crate::engine::validate_jvm_args(&args) {
                    *g = original;
                    return Err(e);
                }
                g.jvm_args = args;
            }
            drop(d);
            c.save()?;
            crate::game_folders::sync(c, id)?;
            Ok(snapshot(c))
        }
        "openFolder" => {
            let path = if let Some(id) = a["id"].as_str() {
                c.game_dir(id)?
            } else {
                c.root.clone()
            };
            c.app
                .as_ref()
                .ok_or("No desktop window")?
                .opener()
                .open_path(path.to_string_lossy(), None::<&str>)
                .map_err(|e| e.to_string())?;
            Ok(json!(true))
        }
        "log" => {
            let path = c.game_dir(s(&a, "id")?)?.join("logs/loam-latest.log");
            let b = fs::read(path).unwrap_or_default();
            Ok(json!(String::from_utf8_lossy(&b)
                .chars()
                .rev()
                .take(100000)
                .collect::<String>()
                .chars()
                .rev()
                .collect::<String>()))
        }
        "inspectImport" => imports::inspect(c, s(&a, "id")?, s(&a, "source")?),
        "classifyDrop" => imports::classify(c, s(&a, "source")?),
        "migrationScan" => crate::launchers::scan(a["folder"].as_str()),
        "migrateInstance" => {
            let path = s(&a, "path")?.to_owned();
            let worlds_only = a["worldsOnly"].as_bool().unwrap_or(false);
            let mut sys = sysinfo::System::new();
            sys.refresh_memory();
            let cap = sys.total_memory() / 1048576 / 2;
            start(c, "", move |c, _| {
                let id = crate::launchers::import(c, &path, worlds_only, cap)?;
                let name = c.game(&id)?.name;
                c.step(&id, "ready", &format!("{name} is in your library. Press Install to download its Minecraft files."));
                Ok(())
            })
        }
        "crashDiagnosis" => {
            let path = c.game_dir(s(&a, "id")?)?.join("logs/loam-crash.json");
            Ok(fs::read(path).ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok()).unwrap_or(Value::Null))
        }
        "dismissCrash" => {
            let _ = fs::remove_file(c.game_dir(s(&a, "id")?)?.join("logs/loam-crash.json"));
            Ok(json!(true))
        }
        "accountSkin" => crate::skins::account_skin(c, s(&a, "id")?),
        "modrinth" => imports::modrinth(c, s(&a, "id")?, s(&a, "url")?),
        "applyImport" => {
            let token = s(&a, "token")?.to_owned();
            let id = c
                .pending
                .lock()
                .unwrap()
                .get(&token)
                .and_then(|p| p["gameId"].as_str())
                .ok_or("Review expired")?
                .to_owned();
            start(c, &id, move |c, _| imports::apply(c, &token))
        }
        "backup" => {
            let id = s(&a, "id")?;
            start(c, id, |c, id| {
                c.step(id, "backup", "Creating a verified content backup");
                imports::backup(c, id)?;
                c.step(id, "ready", "Backup saved.");
                Ok(())
            })
        }
        "backups" => {
            let id = s(&a, "id")?;
            c.game(id)?;
            let dir = c.root.join("backups").join(id);
            let mut items = vec![];
            if let Ok(entries) = fs::read_dir(dir) {
                for e in entries.flatten() {
                    if let Ok(b) = fs::read(e.path().join("backup.json")) {
                        if let Ok(v) = serde_json::from_slice::<Value>(&b) {
                            items.push(v)
                        }
                    }
                }
            }
            items.sort_by(|a, b| b["created"].as_str().cmp(&a["created"].as_str()));
            Ok(json!(items))
        }
        "restore" => {
            let id = s(&a, "id")?;
            let key = s(&a, "backup")?.to_string();
            start(c, id, move |c, id| {
                c.step(
                    id,
                    "backup",
                    "Restoring backup; preserving current content first",
                );
                imports::restore(c, id, &key)?;
                c.step(id, "ready", "Backup restored.");
                Ok(())
            })
        }
        "duplicate" => {
            let id = s(&a, "id")?;
            start(c, id, |c, id| {
                c.ensure_idle(id)?;
                let mut game = c.game(id)?;
                let new = uuid::Uuid::new_v4().to_string();
                c.step(id, "copying", "Creating a verified copy of this game");
                let source = c.game_dir(id)?;
                game.id = new.clone();
                game.name = format!("{} copy", game.name);
                game.folder = Some(crate::game_folders::available(&c.root, &game.name, &game.version)?);
                storage::copy_tree(&source, &c.root.join("games").join(game.folder.as_ref().unwrap()))?;
                {
                    let mut d = c.data.lock().unwrap();
                    d.games.push(game);
                    d.selected_game = Some(new);
                }
                c.save()?;
                c.step(id, "ready", "Game duplicated.");
                Ok(())
            })
        }
        "deleteGame" => {
            let id = s(&a, "id")?;
            c.ensure_idle(id)?;
            if c.busy.load(Ordering::Relaxed) {
                return Err("Wait for the current operation to finish.".into());
            }
            let game = c.game(id)?;
            if s(&a, "name")? != game.name {
                return Err("Type the exact game name to confirm.".into());
            }
            let src = c.game_dir(id)?;
            let trash = c.root.join("trash").join(id);
            fs::create_dir_all(trash.parent().unwrap()).map_err(|e| e.to_string())?;
            fs::rename(src, trash).map_err(|e| e.to_string())?;
            {
                let mut d = c.data.lock().unwrap();
                d.games.retain(|g| g.id != id);
                if d.selected_game.as_deref() == Some(id) {
                    d.selected_game = d.games.first().map(|g| g.id.clone())
                }
            }
            c.save()?;
            Ok(snapshot(c))
        }
        "content" => {
            let dir = c.game_dir(s(&a, "id")?)?;
            let mut items = vec![];
            for folder in ["mods", "resourcepacks", "shaderpacks", "saves"] {
                if let Ok(entries) = fs::read_dir(dir.join(folder)) {
                    for e in entries.flatten() {
                        items.push(json!({"path":format!("{folder}/{}",e.file_name().to_string_lossy()),"name":e.file_name().to_string_lossy(),"kind":folder,"enabled":!e.file_name().to_string_lossy().ends_with(".disabled")}))
                    }
                }
            }
            Ok(json!(items))
        }
        "toggleContent" => {
            let id = s(&a, "id")?;
            c.ensure_idle(id)?;
            if c.busy.load(Ordering::Relaxed) {
                return Err("Wait for the current operation.".into());
            }
            let rel = storage::safe_relative(s(&a, "path")?)?;
            if rel.components().count() != 2
                || !["mods", "resourcepacks", "shaderpacks"].contains(
                    &rel.components()
                        .next()
                        .unwrap()
                        .as_os_str()
                        .to_string_lossy()
                        .as_ref(),
                )
            {
                return Err("Only mods and packs can be disabled.".into());
            }
            let p = c.game_dir(id)?.join(rel);
            storage::no_links(&p)?;
            let raw = p.to_string_lossy();
            let dst = if raw.ends_with(".disabled") {
                PathBuf::from(raw.trim_end_matches(".disabled"))
            } else {
                PathBuf::from(format!("{raw}.disabled"))
            };
            if dst.exists() {
                return Err("A file with the target name already exists.".into());
            }
            imports::backup(c, id)?;
            fs::rename(p, dst).map_err(|e| e.to_string())?;
            Ok(json!(true))
        }
        "removeContent" => {
            let id = s(&a, "id")?;
            let raw = s(&a, "path")?.to_owned();
            let rel = storage::safe_relative(&raw)?;
            if rel.components().count() != 2
                || !["mods", "resourcepacks", "shaderpacks", "saves"].contains(
                    &rel.components()
                        .next()
                        .unwrap()
                        .as_os_str()
                        .to_string_lossy()
                        .as_ref(),
                )
            {
                return Err("Select one content item.".into());
            }
            start(c, id, move |c, id| {
                c.ensure_idle(id)?;
                let source = c.game_dir(id)?.join(&rel);
                storage::no_links(&source)?;
                imports::backup(c, id)?;
                let target = c
                    .root
                    .join("trash/content")
                    .join(id)
                    .join(uuid::Uuid::new_v4().to_string())
                    .join(rel.file_name().unwrap());
                fs::create_dir_all(target.parent().unwrap()).map_err(|e| e.to_string())?;
                fs::rename(source, target).map_err(|e| e.to_string())?;
                c.step(
                    id,
                    "ready",
                    "Content removed from this game. A backup and retained copy are available.",
                );
                Ok(())
            })
        }
        "reportPreview" => {
            let report = diagnostics::report(c, &a)?;
            c.pending.lock().unwrap().insert(
                format!("report:{}", report["id"].as_str().unwrap()),
                report.clone(),
            );
            Ok(report)
        }
        "exportReport" => {
            let report = c
                .pending
                .lock()
                .unwrap()
                .get(&format!("report:{}", s(&a, "id")?))
                .cloned()
                .ok_or("Preview the report before saving it.")?;
            let p = diagnostics::export_snapshot(c, &report)?;
            c.app
                .as_ref()
                .ok_or("No desktop window")?
                .opener()
                .reveal_item_in_dir(&p)
                .map_err(|e| e.to_string())?;
            Ok(json!(p))
        }
        "reports" => {
            let dir = c.root.join("reports");
            let mut list = vec![];
            if let Ok(entries) = fs::read_dir(dir) {
                for e in entries.flatten() {
                    if e.path().extension().and_then(|s| s.to_str()) == Some("json") {
                        if let Ok(b) = fs::read(e.path()) {
                            if let Ok(v) = serde_json::from_slice::<Value>(&b) {
                                list.push(v)
                            }
                        }
                    }
                }
            }
            Ok(json!(list))
        }
        "openLink" => {
            let kind = s(&a, "kind")?;
            let url = match kind {
                "discord" => {
                    let s = accounts::config()["support"]["discordInviteUrl"]
                        .as_str()
                        .unwrap_or("")
                        .to_string();
                    if s.contains("REPLACE_ME") {
                        return Err("The LOAM community invite has not been configured yet.".into());
                    }
                    let u = url::Url::parse(&s).map_err(|_| "Invalid Discord invite")?;
                    if u.scheme() != "https"
                        || !matches!(u.host_str(), Some("discord.gg" | "discord.com"))
                        || !u.username().is_empty()
                        || u.port().is_some()
                    {
                        return Err("Invalid Discord invite host.".into());
                    }
                    s
                }
                "email" => {
                    let cfg = accounts::config();
                    let email = cfg["support"]["email"]
                        .as_str()
                        .unwrap_or("loamlauncher@gmail.com");
                    let subject = a["subject"].as_str().unwrap_or("LOAM Launcher Support");
                    let query = if let Some(body) = a["body"].as_str() {
                        format!(
                            "?subject={}&body={}",
                            url::form_urlencoded::byte_serialize(subject.as_bytes()).collect::<String>(),
                            url::form_urlencoded::byte_serialize(body.as_bytes()).collect::<String>()
                        )
                    } else {
                        format!(
                            "?subject={}",
                            url::form_urlencoded::byte_serialize(subject.as_bytes()).collect::<String>()
                        )
                    };
                    format!("mailto:{email}{query}")
                }
                "minecraft" => {
                    "https://www.minecraft.net/store/minecraft-java-bedrock-edition-pc".into()
                }
                "news" => {
                    let link = s(&a, "url")?;
                    if !crate::news::valid_link(link) { return Err("News link is not allowed.".into()); }
                    link.into()
                },
                _ => return Err("Link is not allowed.".into()),
            };
            c.app
                .as_ref()
                .ok_or("No desktop window")?
                .opener()
                .open_url(url, None::<&str>)
                .map_err(|e| e.to_string())?;
            Ok(json!(true))
        }
        "setTheme" => {
            let dark = a["dark"].as_bool().unwrap_or(false);
            #[cfg(windows)]
            if let Some(ref app) = c.app {
                if let Some(w) = app.get_webview_window("main") {
                    crate::windows_perf::apply_dwm_window_theme(&w, dark);
                }
            }
            Ok(json!(true))
        }
        "knownIssues" => crate::updates::issues(c),
        _ => Err("Unknown launcher command.".into()),
    }
}
use std::path::PathBuf;
#[tauri::command]
pub async fn dispatch(
    core: tauri::State<'_, Shared>,
    op: String,
    args: Option<Value>,
) -> Result<Value> {
    let c = Arc::clone(core.inner());
    tauri::async_runtime::spawn_blocking(move || execute(&c, &op, args.unwrap_or(json!({}))))
        .await
        .map_err(|_| "Operation worker failed.".to_string())?
}
