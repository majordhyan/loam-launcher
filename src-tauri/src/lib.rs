pub mod accounts;
pub mod catalog;
pub mod commands;
pub mod diagnostics;
pub mod engine;
pub mod imports;
pub mod maintenance;
pub mod model;
pub mod network;
pub mod skins;
pub mod storage;
pub mod updates;
use tauri::Manager;
pub fn run() {
    tauri::Builder::default()
 .plugin(tauri_plugin_single_instance::init(|app,_,_|{if let Some(w)=app.get_webview_window("main"){let _=w.show();let _=w.set_focus();}}))
 .plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_opener::init()).plugin(tauri_plugin_updater::Builder::new().build())
 .setup(|app|{let bootstrap=app.path().app_local_data_dir()?;let root=maintenance::data_root(&bootstrap)?;std::fs::create_dir_all(&root)?;let path=root.join("state.json");let data=if path.exists(){let bytes=std::fs::read(&path)?;let data:model::Data=serde_json::from_slice(&bytes)?;if data.schema!=1{return Err("This data schema requires a newer LOAM version.".into())}data}else{model::Data::default()};let c=std::sync::Arc::new(model::Core{root,data:std::sync::Mutex::new(data),progress:std::sync::Mutex::new(None),cancel:std::sync::atomic::AtomicBool::new(false),busy:std::sync::atomic::AtomicBool::new(false),running:std::sync::Mutex::new(std::collections::HashMap::new()),pending:std::sync::Mutex::new(std::collections::HashMap::new()),app:Some(app.handle().clone())});app.manage(c);Ok(())})
 .invoke_handler(tauri::generate_handler![commands::dispatch,updates::check_update,updates::install_update])
 .on_window_event(|window,event|{if let tauri::WindowEvent::CloseRequested{api,..}=event{let c=window.state::<model::Shared>();if c.busy.load(std::sync::atomic::Ordering::Relaxed)||!c.running.lock().unwrap().is_empty(){api.prevent_close();use tauri::Emitter;let _=window.emit("close-blocked","Finish or cancel the current operation and stop Minecraft before closing LOAM.");}}})
 .run(tauri::generate_context!()).expect("LOAM desktop runtime failed");
}
