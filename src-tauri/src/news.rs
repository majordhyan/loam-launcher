use crate::{model::*, network, storage};
use serde_json::{json, Value};
use std::{fs, time::Duration};

pub fn valid_link(raw: &str) -> bool {
    url::Url::parse(raw).is_ok_and(|u| u.scheme() == "https" && u.username().is_empty()
        && u.password().is_none() && u.port().is_none()
        && matches!(u.host_str(), Some("www.minecraft.net" | "minecraft.net"))
        && (u.path().starts_with("/article/") || u.path().contains("/article/")))
}

pub fn latest(feed: &Value) -> Result<Value> {
    let entries = feed["entries"].as_array().ok_or("Official news is unavailable.")?;
    let entry = entries.iter().filter(|v| {
        v["title"].as_str().is_some_and(|s| !s.trim().is_empty() && s.len() < 500)
            && v["readMoreLink"].as_str().is_some_and(valid_link)
            && v["date"].as_str().is_some_and(|d| chrono::NaiveDate::parse_from_str(d.get(..10).unwrap_or(""), "%Y-%m-%d").is_ok())
            && v["newsType"].as_array().is_some_and(|tags| tags.iter().any(|t| t == "Java"))
    }).max_by_key(|v| v["date"].as_str().unwrap_or("")).ok_or("No Java news available.")?;
    Ok(json!({"title":entry["title"], "date":entry["date"], "link":entry["readMoreLink"], "cached":false}))
}

pub fn get(core: &Core) -> Result<Value> {
    let path = core.root.join("cache/official-news.json");
    let cached = fs::read(&path).ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok()).filter(|v| latest(v).is_ok());
    let fresh = fs::metadata(&path).and_then(|m| m.modified()).ok().and_then(|t| t.elapsed().ok()).is_some_and(|age| age < Duration::from_secs(900));
    if fresh { if let Some(ref v) = cached { return latest(v); } }
    if let Ok(feed) = network::json("https://launchercontent.mojang.com/v2/news.json") {
        if let Ok(item) = latest(&feed) { let _ = storage::write_json(&path, &feed); return Ok(item); }
    }
    if let Some(v) = cached { let mut item = latest(&v)?; item["cached"] = json!(true); return Ok(item); }
    Err("Official news is unavailable while offline.".into())
}

const CONTENT: &str = "https://launchercontent.mojang.com";

/// An image path from Mojang's launcher content, as a full URL (only that host, only /v2/images/).
fn image(path: &Value) -> Value {
    match path.as_str() {
        Some(p) if p.starts_with("/v2/images/") && !p.contains("..") && p.len() < 200 => json!(format!("{CONTENT}{p}")),
        _ => Value::Null,
    }
}

/// Merges Java news and Java patch notes (releases and snapshots) into one list, newest first.
pub fn merge(news: &Value, notes: &Value, limit: usize) -> Value {
    let mut items: Vec<Value> = Vec::new();
    for v in news["entries"].as_array().into_iter().flatten() {
        let ok = v["title"].as_str().is_some_and(|s| !s.trim().is_empty() && s.len() < 500)
            && v["readMoreLink"].as_str().is_some_and(valid_link)
            && v["newsType"].as_array().is_some_and(|t| t.iter().any(|t| t == "Java"));
        if !ok { continue; }
        items.push(json!({
            "id": v["id"], "kind": "news", "title": v["title"], "date": v["date"],
            "text": v["text"].as_str().unwrap_or("").chars().take(300).collect::<String>(),
            "image": Some(image(&v["newsPageImage"]["url"])).filter(|i| !i.is_null()).unwrap_or_else(|| image(&v["playPageImage"]["url"])),
            "link": v["readMoreLink"],
        }));
    }
    for v in notes["entries"].as_array().into_iter().flatten() {
        let kind = match v["type"].as_str() { Some("release") => "release", Some("snapshot") => "snapshot", _ => continue };
        let path = v["contentPath"].as_str().unwrap_or("");
        if v["title"].as_str().is_none() || !valid_content_path(path) { continue; }
        items.push(json!({
            "id": v["id"], "kind": kind, "title": v["title"], "date": v["date"], "version": v["version"],
            "text": v["shortText"].as_str().unwrap_or("").chars().take(300).collect::<String>(),
            "image": image(&v["image"]["url"]), "contentPath": path,
        }));
    }
    items.sort_by(|a, b| b["date"].as_str().unwrap_or("").cmp(a["date"].as_str().unwrap_or("")));
    items.truncate(limit);
    json!(items)
}

/// Mojang's patch-note paths look like `javaPatchNotes/26-3.json`: that one folder, one plain name.
fn valid_content_path(p: &str) -> bool {
    let name = p.strip_prefix("javaPatchNotes/").unwrap_or(p);
    p.len() < 160 && name.ends_with(".json") && !name.contains("..")
        && name.bytes().all(|b| b.is_ascii_alphanumeric() || b"-_.".contains(&b))
}

fn cached_or_fetch(core: &Core, name: &str, url: &str, max_age: Duration) -> (Option<Value>, bool) {
    let path = core.root.join("cache").join(name);
    let cached = fs::read(&path).ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok());
    let fresh = fs::metadata(&path).and_then(|m| m.modified()).ok().and_then(|t| t.elapsed().ok()).is_some_and(|age| age < max_age);
    if fresh && cached.is_some() { return (cached, false); }
    match network::json(url) {
        Ok(v) if v["entries"].is_array() => { let _ = storage::write_json(&path, &v); (Some(v), false) }
        _ => { let stale = cached.is_some(); (cached, stale) }
    }
}

/// Live news for Home and the News sheet: refreshed at most every 10 minutes, cached for offline.
pub fn feed(core: &Core) -> Result<Value> {
    let age = Duration::from_secs(600);
    let (news, a) = cached_or_fetch(core, "official-news.json", "https://launchercontent.mojang.com/v2/news.json", age);
    let (notes, b) = cached_or_fetch(core, "java-patch-notes.json", "https://launchercontent.mojang.com/v2/javaPatchNotes.json", age);
    if news.is_none() && notes.is_none() { return Err("Minecraft news is unavailable while offline.".into()); }
    let items = merge(&news.unwrap_or(Value::Null), &notes.unwrap_or(Value::Null), 40);
    Ok(json!({"items": items, "cached": a || b, "fetched": chrono::Utc::now().to_rfc3339()}))
}

/// Full patch notes for one release or snapshot (Mojang's HTML body; the window shows it as text).
pub fn patch_notes(core: &Core, content_path: &str) -> Result<Value> {
    if !valid_content_path(content_path) { return Err("Patch notes link is not allowed.".into()); }
    let name = format!("patch-{}", content_path.replace('/', "_"));
    let (v, _) = cached_or_fetch_any(core, &name, &format!("{CONTENT}/v2/{content_path}"));
    let v = v.ok_or("Patch notes are unavailable while offline.")?;
    Ok(json!({"title": v["title"], "version": v["version"], "body": v["body"], "image": image(&v["image"]["url"])}))
}

fn cached_or_fetch_any(core: &Core, name: &str, url: &str) -> (Option<Value>, bool) {
    let path = core.root.join("cache/patch-notes").join(name);
    if let Some(v) = fs::read(&path).ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok()) { return (Some(v), false); }
    match network::json(url) {
        Ok(v) if v["body"].is_string() => { let _ = fs::create_dir_all(core.root.join("cache/patch-notes")); let _ = storage::write_json(&path, &v); (Some(v), false) }
        _ => (None, true),
    }
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn links_are_first_party_only() {
        assert!(valid_link("https://www.minecraft.net/en-us/article/release"));
        for bad in ["http://www.minecraft.net/article/x", "https://www.minecraft.net.evil.test/article/x", "https://user@www.minecraft.net/article/x", "https://www.minecraft.net:444/article/x"] { assert!(!valid_link(bad)); }
    }
    #[test] fn newest_java_title_is_preserved() {
        let f = json!({"entries":[
            {"title":"Actual title", "date":"2026-10-01", "newsType":["Java"], "readMoreLink":"https://www.minecraft.net/article/a"},
            {"title":"Older", "date":"2026-09-01", "newsType":["Java"], "readMoreLink":"https://www.minecraft.net/article/b"},
            {"title":"Other game", "date":"2026-10-02", "newsType":["Dungeons"], "readMoreLink":"https://www.minecraft.net/article/c"}
        ]});
        assert_eq!(latest(&f).unwrap()["title"], "Actual title");
    }
    #[test] fn feed_merges_news_and_patch_notes() {
        let news = serde_json::json!({"entries":[
            {"id":"a","title":"Realms","date":"2026-09-28","newsType":["Java"],"readMoreLink":"https://www.minecraft.net/article/a","text":"t","newsPageImage":{"url":"/v2/images/a.jpg"}},
            {"id":"b","title":"Bedrock only","date":"2026-10-01","newsType":["Bedrock"],"readMoreLink":"https://www.minecraft.net/article/b"},
            {"id":"c","title":"Bad link","date":"2026-10-02","newsType":["Java"],"readMoreLink":"https://evil.test/article/c"}]});
        let notes = serde_json::json!({"entries":[
            {"id":"s","title":"Snapshot 3","type":"snapshot","version":"26.4-snapshot-3","date":"2026-10-06T12:54:26.000Z","contentPath":"javaPatchNotes/26-4-snapshot-3.json","image":{"url":"/v2/images/s.jpg"}},
            {"id":"x","title":"Odd","type":"other","date":"2026-10-07","contentPath":"x.json"},
            {"id":"y","title":"Escape","type":"release","date":"2026-10-05","contentPath":"../y.json"}]});
        let v = merge(&news, &notes, 10);
        let items = v.as_array().unwrap();
        assert_eq!(items.len(), 2, "{v}");
        assert_eq!(items[0]["kind"], "snapshot");
        assert_eq!(items[0]["image"], "https://launchercontent.mojang.com/v2/images/s.jpg");
        assert_eq!(items[1]["link"], "https://www.minecraft.net/article/a");
        assert!(!valid_content_path("a/b.json") && !valid_content_path("javaPatchNotes/../x.json") && valid_content_path("javaPatchNotes/26-4-snapshot-3.json"));
    }
}
