pub mod accounts;
pub mod catalog;
pub mod commands;
pub mod content;
pub mod crash;
pub mod diagnostics;
pub mod doctor;
pub mod trust;
pub mod tray;
pub mod servers;
pub mod media;
pub mod audioviz;
pub mod engine;
pub mod imports;
pub mod launchers;
pub mod maintenance;
pub mod model;
pub mod game_folders;
pub mod news;
pub mod network;
pub mod skins;
pub mod storage;
pub mod updates;
pub mod windows_perf;
use tauri::Manager;
pub fn run() {
    tauri::Builder::default()
 .plugin(tauri_plugin_notification::init()).plugin(tauri_plugin_single_instance::init(|app,_,_|{tray::show(app);}))
 .plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_opener::init()).plugin(tauri_plugin_updater::Builder::new().build())
 .setup(|app|{let bootstrap=app.path().app_local_data_dir()?;let root=maintenance::data_root(&bootstrap)?;maintenance::prepare_layout(&root)?;let path=root.join("state.json");let mut data=if path.exists(){let bytes=std::fs::read(&path)?;let data:model::Data=serde_json::from_slice(&bytes)?;if data.schema!=1{return Err("This data schema requires a newer LOAM version.".into())}data}else{model::Data::default()};if let Some(id)=&data.selected_game{if !data.games.iter().any(|g|&g.id==id){data.selected_game=data.games.first().map(|g|g.id.clone());}}else if !data.games.is_empty(){data.selected_game=Some(data.games[0].id.clone());}
 if let Some(id)=&data.selected_account{if !data.accounts.iter().any(|a|&a.id==id){data.selected_account=data.accounts.first().map(|a|a.id.clone());}}else if !data.accounts.is_empty(){data.selected_account=Some(data.accounts[0].id.clone());}let c=std::sync::Arc::new(model::Core{root,data:std::sync::Mutex::new(data),progress:std::sync::Mutex::new(None),cancel:std::sync::atomic::AtomicBool::new(false),busy:std::sync::atomic::AtomicBool::new(false),running:std::sync::Mutex::new(std::collections::HashMap::new()),pending:std::sync::Mutex::new(std::collections::HashMap::new()),app:Some(app.handle().clone())});let ids: Vec<String> = c.data.lock().unwrap().games.iter().filter(|g| g.folder.is_none()).map(|g| g.id.clone()).collect(); for id in ids { let _ = game_folders::sync(&c, &id); } let game_ids: Vec<String> = c.data.lock().unwrap().games.iter().map(|g|g.id.clone()).collect(); for id in game_ids { maintenance::prepare_game(&c.game_dir(&id)?)?; } app.manage(c);tray::build(app.handle())?;app.manage(audioviz::Viz::default());Ok(())})
 .invoke_handler(tauri::generate_handler![commands::dispatch,updates::check_update,updates::install_update])
 .on_window_event(|window,event|{if let tauri::WindowEvent::CloseRequested{api,..}=event{if window.state::<tray::Tray>().close_to_tray.load(std::sync::atomic::Ordering::Relaxed){api.prevent_close();tray::hide(window.app_handle());return;}let c=window.state::<model::Shared>();if c.busy.load(std::sync::atomic::Ordering::Relaxed)||!c.running.lock().unwrap().is_empty(){api.prevent_close();use tauri::Emitter;let _=window.emit("close-blocked","Finish or cancel the current operation and stop Minecraft before closing LOAM.");}}})
 .run(tauri::generate_context!()).expect("LOAM desktop runtime failed");
}
