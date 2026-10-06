use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    path::PathBuf,
    sync::{atomic::AtomicBool, Arc, Mutex},
};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub id: String,
    #[serde(default)]
    pub folder: Option<String>,
    pub name: String,
    pub version: String,
    pub loader: Option<String>,
    pub memory: u32,
    #[serde(default)]
    pub width: Option<u32>,
    #[serde(default)]
    pub height: Option<u32>,
    #[serde(default)]
    pub jvm_args: Vec<String>,
    pub installed: bool,
    pub verified: Option<String>,
    pub created: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub uuid: String,
}
#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
    pub snapshots: bool,
    pub setup_done: bool,
    #[serde(default)]
    pub reduced_motion: bool,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Data {
    pub schema: u32,
    pub games: Vec<Game>,
    pub accounts: Vec<Account>,
    pub selected_game: Option<String>,
    pub selected_account: Option<String>,
    pub preferences: Preferences,
}
impl Default for Data {
    fn default() -> Self {
        Self {
            schema: 1,
            games: vec![],
            accounts: vec![],
            selected_game: None,
            selected_account: None,
            preferences: Preferences::default(),
        }
    }
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub id: String,
    pub game_id: String,
    pub phase: String,
    pub message: String,
    pub done: u64,
    pub total: u64,
    pub files: u64,
    pub speed: u64,
    pub error: Option<String>,
}
pub struct Core {
    pub root: PathBuf,
    pub data: Mutex<Data>,
    pub progress: Mutex<Option<Progress>>,
    pub cancel: AtomicBool,
    pub busy: AtomicBool,
    pub running: Mutex<std::collections::HashMap<String, u32>>,
    pub pending: Mutex<std::collections::HashMap<String, Value>>,
    pub app: Option<tauri::AppHandle>,
}
pub type Shared = Arc<Core>;
pub type Result<T> = std::result::Result<T, String>;
impl Core {
    pub fn game(&self, id: &str) -> Result<Game> {
        uuid::Uuid::parse_str(id).map_err(|_| "Invalid game ID.".to_string())?;
        self.data
            .lock()
            .unwrap()
            .games
            .iter()
            .find(|g| g.id == id)
            .cloned()
            .ok_or("Game no longer exists.".into())
    }
    pub fn game_dir(&self, id: &str) -> Result<PathBuf> {
        let game = self.game(id)?;
        let folder = game.folder.as_deref().unwrap_or(id);
        let relative = crate::storage::safe_relative(folder)?;
        if relative.components().count() != 1 { return Err("Invalid game folder.".into()); }
        let path = self.root.join("games").join(relative);
        crate::storage::no_links(&path)?;
        Ok(path)
    }
    pub fn ensure_idle(&self, id: &str) -> Result<()> {
        if self.running.lock().unwrap().contains_key(id) {
            Err("Stop this game before changing its files.".into())
        } else {
            Ok(())
        }
    }
    pub fn save(&self) -> Result<()> {
        crate::storage::write_json(&self.root.join("state.json"), &*self.data.lock().unwrap())
    }
    pub fn emit(&self, p: Progress) {
        *self.progress.lock().unwrap() = Some(p.clone());
        if let Some(app) = &self.app {
            use tauri::Emitter;
            let _ = app.emit("operation", p);
        }
    }
    pub fn step(&self, game: &str, phase: &str, msg: &str) {
        let current = self.progress.lock().unwrap().clone();
        self.emit(Progress {
            id: current
                .map(|p| p.id)
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
            game_id: game.into(),
            phase: phase.into(),
            message: msg.into(),
            done: 0,
            total: 0,
            files: 0,
            speed: 0,
            error: None,
        });
    }
    pub fn cancelled(&self) -> Result<()> {
        if self.cancel.load(std::sync::atomic::Ordering::Relaxed) {
            Err("Cancelled. Verified files are kept for the next attempt.".into())
        } else {
            Ok(())
        }
    }
}
