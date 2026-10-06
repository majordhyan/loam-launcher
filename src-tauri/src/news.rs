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
}
