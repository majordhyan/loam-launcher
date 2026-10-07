//! Saved music links (1.9). Checks a pasted link against an exact list of music hosts, follows
//! Spotify short links (at most five hops, each hop checked), and reads the public title and
//! artwork through the services' oEmbed endpoints. Apple Music has no public oEmbed, so its links
//! get no metadata here. Nothing is played or downloaded: LOAM only stores the link.
use crate::model::Result;
use serde_json::{json, Value};
use std::{io::Read, time::Duration};
use url::Url;

/// Hosts a saved link may finally point at.
fn music_host(h: &str) -> bool {
    matches!(
        h,
        "youtube.com" | "www.youtube.com" | "m.youtube.com" | "music.youtube.com" | "youtu.be" | "open.spotify.com" | "music.apple.com"
    )
}
/// Spotify's share links, which redirect to open.spotify.com.
fn short_host(h: &str) -> bool { matches!(h, "spotify.link" | "spoti.fi") }

fn parse(raw: &str) -> Result<Url> {
    let mut u = Url::parse(raw.trim()).map_err(|_| "That isn't a link.".to_string())?;
    if u.scheme() == "http" {
        let _ = u.set_scheme("https");
    }
    if u.scheme() != "https" || !u.username().is_empty() || u.password().is_some() || u.port().is_some() {
        return Err("Only plain https links are supported.".into());
    }
    Ok(u)
}

fn client() -> Result<reqwest::blocking::Client> {
    reqwest::blocking::Client::builder()
        .user_agent(concat!("LOAM/", env!("CARGO_PKG_VERSION"), " (Minecraft Java launcher)"))
        .connect_timeout(Duration::from_secs(6))
        .timeout(Duration::from_secs(8))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "Could not initialize HTTPS.".to_string())
}

/// Reads at most `cap` bytes of a response body.
fn body(r: reqwest::blocking::Response, cap: u64) -> String {
    let mut s = String::new();
    let _ = r.take(cap).read_to_string(&mut s);
    s
}

/// Follows a short link to its music page. Each hop must stay on a short-link or music host.
fn resolve(c: &reqwest::blocking::Client, mut u: Url) -> Result<Url> {
    for _ in 0..5 {
        let host = u.host_str().unwrap_or("");
        if music_host(host) {
            return Ok(u);
        }
        if !short_host(host) {
            return Err("That short link leads somewhere LOAM doesn't support.".into());
        }
        let r = c.get(u.as_str()).send().map_err(|_| "Couldn't reach the link. Check your connection and try again.".to_string())?;
        if r.status().is_redirection() {
            let loc = r.headers().get("location").and_then(|v| v.to_str().ok()).unwrap_or("");
            u = u.join(loc).map_err(|_| "That short link didn't lead anywhere.".to_string())?;
            continue;
        }
        // Some share links answer with a page that points onward instead of a redirect.
        let page = body(r, 128 * 1024);
        let at = page.find("https://open.spotify.com/").ok_or("That short link didn't lead to a Spotify page.")?;
        let end = page[at..].find(|ch: char| ch == '"' || ch == '\'' || ch == '<' || ch.is_whitespace()).map_or(page.len(), |n| at + n);
        u = parse(&page[at..end].replace("&amp;", "&"))?;
    }
    Err("That short link redirects too many times.".into())
}

/// Public title and artwork for YouTube and Spotify links. Missing metadata is not an error.
fn oembed(c: &reqwest::blocking::Client, u: &Url) -> Value {
    let host = u.host_str().unwrap_or("");
    let endpoint = match host {
        "open.spotify.com" => "https://open.spotify.com/oembed",
        "music.apple.com" => return Value::Null,
        _ => "https://www.youtube.com/oembed",
    };
    // YouTube's oEmbed only knows www.youtube.com addresses; YouTube Music uses the same IDs.
    let mut target = u.clone();
    if host == "music.youtube.com" || host == "m.youtube.com" || host == "youtube.com" {
        let _ = target.set_host(Some("www.youtube.com"));
    }
    let Ok(mut q) = Url::parse(endpoint) else { return Value::Null };
    q.query_pairs_mut().append_pair("format", "json").append_pair("url", target.as_str());
    let Ok(r) = c.get(q.as_str()).send() else { return Value::Null };
    if !r.status().is_success() {
        return Value::Null;
    }
    let v: Value = serde_json::from_str(&body(r, 256 * 1024)).unwrap_or(Value::Null);
    let text = |k: &str| v[k].as_str().map(|s| s.chars().take(200).collect::<String>());
    json!({ "title": text("title"), "author": text("author_name"), "thumb": text("thumbnail_url") })
}

/// `musicLink`: the final address of a pasted link and whatever public metadata exists.
pub fn inspect(raw: &str) -> Result<Value> {
    let u = parse(raw)?;
    let host = u.host_str().unwrap_or("").to_string();
    if !music_host(&host) && !short_host(&host) {
        return Err("LOAM saves links from YouTube, YouTube Music, Spotify and Apple Music.".into());
    }
    let c = client()?;
    let u = resolve(&c, u)?;
    let meta = oembed(&c, &u);
    Ok(json!({ "url": u.as_str(), "meta": meta }))
}

/// `openMusicLink`: opens a saved link in its app or the default browser. Spotify links try the
/// Spotify app first.
pub fn open(app: &tauri::AppHandle, raw: &str) -> Result<Value> {
    use tauri_plugin_opener::OpenerExt;
    let u = parse(raw)?;
    let host = u.host_str().unwrap_or("");
    if !music_host(host) {
        return Err("LOAM only opens links from YouTube, YouTube Music, Spotify and Apple Music.".into());
    }
    if host == "open.spotify.com" {
        let parts: Vec<&str> = u.path_segments().map(|s| s.filter(|p| !p.is_empty() && !p.starts_with("intl-")).collect()).unwrap_or_default();
        if let [kind @ ("track" | "album" | "playlist" | "artist" | "episode" | "show"), id] = parts.as_slice() {
            if id.len() == 22 && id.chars().all(|ch| ch.is_ascii_alphanumeric()) && spotify_installed() && app.opener().open_url(format!("spotify:{kind}:{id}"), None::<&str>).is_ok() {
                return Ok(json!({ "opened": "app" }));
            }
        }
    }
    app.opener().open_url(u.as_str(), None::<&str>).map_err(|_| "Couldn't open your browser.".to_string())?;
    Ok(json!({ "opened": "browser" }))
}

/// Whether the Spotify app registered its `spotify:` links. Without it Windows would offer the
/// Store instead of opening anything, so LOAM opens the web player.
fn spotify_installed() -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("reg")
            .args(["query", r"HKCU\Software\Classes\spotify\shell\open\command"])
            .creation_flags(0x08000000)
            .output()
            .is_ok_and(|o| o.status.success())
            || std::process::Command::new("reg")
                .args(["query", r"HKCR\spotify\shell\open\command"])
                .creation_flags(0x08000000)
                .output()
                .is_ok_and(|o| o.status.success())
    }
    #[cfg(not(windows))]
    {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn hosts_match_exactly() {
        assert!(music_host("open.spotify.com"));
        assert!(!music_host("open.spotify.com.evil.example"));
        assert!(!music_host("evilyoutube.com"));
        assert!(short_host("spoti.fi"));
        assert!(parse("https://user:pw@open.spotify.com/track/x").is_err());
        assert!(parse("https://open.spotify.com:444/track/x").is_err());
        assert!(inspect("https://example.com/watch?v=dQw4w9WgXcQ").is_err());
        assert!(inspect("javascript:alert(1)").is_err());
    }
}
