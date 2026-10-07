//! "Now playing" for the music mini-player: reads and controls whatever the player is listening
//! to through Windows' media sessions (Spotify, a browser, any media app). No Spotify account,
//! API key or login is involved; LOAM only sees what Windows shows in its own media flyout.
use crate::model::Result;
use serde_json::{json, Value};

#[cfg(windows)]
mod imp {
    use super::*;
    use base64::{engine::general_purpose::STANDARD, Engine};
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSession as Session, GlobalSystemMediaTransportControlsSessionManager as Manager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
    };
    use windows::Storage::Streams::DataReader;

    fn session(prefer: &str) -> Result<Option<Session>> {
        let m = Manager::RequestAsync().and_then(|op| op.get()).map_err(|_| "Windows media controls are unavailable.")?;
        let sessions = m.GetSessions().map_err(|e| e.to_string())?;
        let want = prefer.to_ascii_lowercase();
        for s in sessions {
            let app = s.SourceAppUserModelId().map(|h| h.to_string().to_ascii_lowercase()).unwrap_or_default();
            if !want.is_empty() && app.contains(&want) {
                return Ok(Some(s));
            }
        }
        if !want.is_empty() {
            return Ok(None);
        }
        Ok(m.GetCurrentSession().ok())
    }

    pub fn now(prefer: &str) -> Result<Value> {
        let Some(s) = session(prefer)? else {
            return Ok(json!({"active": false}));
        };
        let app = s.SourceAppUserModelId().map(|h| h.to_string()).unwrap_or_default();
        let props = s.TryGetMediaPropertiesAsync().and_then(|op| op.get()).map_err(|e| e.to_string())?;
        let playing = s.GetPlaybackInfo().and_then(|i| i.PlaybackStatus()).map(|st| st == Status::Playing).unwrap_or(false);
        // Album art, if the app shares it, as a small data URL (capped at 512 KB).
        let art = (|| -> Option<String> {
            let thumb = props.Thumbnail().ok()?;
            let stream = thumb.OpenReadAsync().ok()?.get().ok()?;
            let size = stream.Size().ok()?.min(512 * 1024) as u32;
            let reader = DataReader::CreateDataReader(&stream).ok()?;
            reader.LoadAsync(size).ok()?.get().ok()?;
            let mut bytes = vec![0u8; size as usize];
            reader.ReadBytes(&mut bytes).ok()?;
            let mime = if bytes.starts_with(&[0x89, b'P', b'N', b'G']) { "image/png" } else { "image/jpeg" };
            Some(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
        })();
        Ok(json!({
            "active": true,
            "app": app,
            "spotify": app.to_ascii_lowercase().contains("spotify"),
            "title": props.Title().map(|h| h.to_string()).unwrap_or_default(),
            "artist": props.Artist().map(|h| h.to_string()).unwrap_or_default(),
            "album": props.AlbumTitle().map(|h| h.to_string()).unwrap_or_default(),
            "playing": playing,
            "art": art,
        }))
    }

    pub fn control(prefer: &str, action: &str) -> Result<Value> {
        let s = session(prefer)?.ok_or("Nothing is playing. Open Spotify (or any music app) and start a song.")?;
        let ok = match action {
            "toggle" => s.TryTogglePlayPauseAsync(),
            "next" => s.TrySkipNextAsync(),
            "previous" => s.TrySkipPreviousAsync(),
            _ => return Err("Unknown media action.".into()),
        }
        .and_then(|op| op.get())
        .map_err(|e| e.to_string())?;
        Ok(json!({"ok": ok}))
    }
}

#[cfg(windows)]
pub use imp::{control, now};

#[cfg(not(windows))]
pub fn now(_prefer: &str) -> Result<Value> {
    Ok(json!({"active": false}))
}
#[cfg(not(windows))]
pub fn control(_prefer: &str, _action: &str) -> Result<Value> {
    Err("Media controls need Windows.".into())
}
