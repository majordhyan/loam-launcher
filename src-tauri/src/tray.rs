//! System tray: hover for the selected game's status, right-click for quick actions, left-click
//! to open LOAM. With "Keep running in the tray" on, closing the window hides it instead.
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Wry,
};

pub struct Tray {
    pub close_to_tray: AtomicBool,
    play: MenuItem<Wry>,
    stop: MenuItem<Wry>,
}

pub fn show(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Quit from the tray. Like the window's close button, refuses while a game or download runs.
fn quit(app: &AppHandle) {
    let c = app.state::<crate::model::Shared>();
    if c.busy.load(Ordering::Relaxed) || !c.running.lock().unwrap().is_empty() {
        show(app);
        let _ = app.emit("close-blocked", "Stop Minecraft and wait for downloads to finish before quitting LOAM.");
        return;
    }
    app.exit(0);
}

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    let item = |id: &str, text: &str, enabled: bool| MenuItem::with_id(app, id, text, enabled, None::<&str>);
    let open = item("open", "Open LOAM", true)?;
    let play = item("play", "Play", true)?;
    let stop = item("stop", "Stop Minecraft", false)?;
    let library = item("library", "Library", true)?;
    let discover = item("discover", "Discover mods", true)?;
    let servers = item("servers", "Servers", true)?;
    let skins = item("skins", "Skins", true)?;
    let settings = item("settings", "Settings", true)?;
    let quit_item = item("quit", "Quit LOAM", true)?;
    let menu = Menu::with_items(app, &[
        &open,
        &PredefinedMenuItem::separator(app)?,
        &play,
        &stop,
        &PredefinedMenuItem::separator(app)?,
        &library,
        &discover,
        &servers,
        &skins,
        &settings,
        &PredefinedMenuItem::separator(app)?,
        &quit_item,
    ])?;
    let mut tray = TrayIconBuilder::with_id("loam")
        .tooltip("LOAM")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, e| match e.id().as_ref() {
            "open" => show(app),
            "quit" => quit(app),
            // The window's own logic handles these (account checks, crash cards, confirmations).
            "play" | "stop" => {
                let _ = app.emit("tray-action", e.id().as_ref());
            }
            page => {
                show(app);
                let _ = app.emit("tray-navigate", page);
            }
        })
        .on_tray_icon_event(|tray, e| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                show(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    app.manage(Tray { close_to_tray: AtomicBool::new(false), play, stop });
    Ok(())
}

/// Updates the hover text and the Play/Stop items from the window's current state.
pub fn status(app: &AppHandle, tooltip: &str, play: &str, can_play: bool, running: bool) -> crate::model::Result<()> {
    // Windows shows at most 127 characters of tray hover text.
    let text: String = tooltip.chars().take(127).collect();
    if let Some(t) = app.tray_by_id("loam") {
        t.set_tooltip(Some(text)).map_err(|e| e.to_string())?;
    }
    let tray = app.state::<Tray>();
    tray.play.set_text(play).map_err(|e| e.to_string())?;
    tray.play.set_enabled(can_play && !running).map_err(|e| e.to_string())?;
    tray.stop.set_enabled(running).map_err(|e| e.to_string())?;
    Ok(())
}
