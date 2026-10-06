use crate::{model::*, network, storage};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs, path::Path};
pub const MANIFEST: &str = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
pub fn manifest(core: &Core) -> Result<Value> {
    let p = core.root.join("cache/manifest.json");
    match network::json(MANIFEST) {
        Ok(m) => {
            storage::write_json(&p, &m)?;
            Ok(m)
        }
        Err(e) => fs::read(&p)
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .ok_or(e),
    }
}
pub fn fabric_games(core: &Core) -> Result<Vec<String>> {
    let p = core.root.join("cache/fabric-games.json");
    let val: Value = match network::json("https://meta.fabricmc.net/v2/versions/game") {
        Ok(v) => {
            let _ = storage::write_json(&p, &v);
            v
        }
        Err(e) => fs::read(&p)
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .ok_or(e)?,
    };
    Ok(val
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|item| item["version"].as_str().map(str::to_owned))
        .collect())
}
pub fn quilt_games(core: &Core) -> Result<Vec<String>> {
    let p = core.root.join("cache/quilt-games.json");
    let val: Value = match network::json("https://meta.quiltmc.org/v3/versions/game") {
        Ok(v) => {
            let _ = storage::write_json(&p, &v);
            v
        }
        Err(e) => fs::read(&p)
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .ok_or(e)?,
    };
    Ok(val
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|item| item["version"].as_str().map(str::to_owned))
        .collect())
}
pub fn versions(core: &Core) -> Result<Value> {
    let m = manifest(core)?;
    let all = m["versions"].as_array().ok_or("Invalid version manifest")?;
    let fabric_set: std::collections::HashSet<String> = fabric_games(core)
        .unwrap_or_default()
        .into_iter()
        .collect();
    let quilt_set: std::collections::HashSet<String> = quilt_games(core)
        .unwrap_or_default()
        .into_iter()
        .collect();
    let cutoff = all
        .iter()
        .find(|v| v["id"] == "1.0")
        .and_then(|v| v["releaseTime"].as_str())
        .unwrap_or("2011-11-18T00:00:00+00:00");
    let list = all
        .iter()
        .filter(|v| {
            v["releaseTime"].as_str().unwrap_or("") >= cutoff
                && matches!(v["type"].as_str(), Some("release" | "snapshot"))
        })
        .map(|v| {
            let id = v["id"].as_str().unwrap_or("");
            json!({
                "id": id,
                "type": v["type"],
                "releaseTime": v["releaseTime"],
                "fabric": fabric_set.contains(id),
                "quilt": quilt_set.contains(id)
            })
        })
        .collect::<Vec<_>>();
    Ok(json!({
        "latest": m["latest"],
        "versions": list,
        "fabricGames": fabric_set.into_iter().collect::<Vec<_>>(),
        "quiltGames": quilt_set.into_iter().collect::<Vec<_>>()
    }))
}
pub fn rules(v: &Value) -> bool {
    let Some(r) = v.as_array() else { return true };
    let mut allow = false;
    for rule in r {
        let os = &rule["os"];
        let name = os["name"].as_str().map(|n| n == "windows").unwrap_or(true);
        let arch = os["arch"]
            .as_str()
            .map(|a| a == "x86_64" || a == "amd64")
            .unwrap_or(true);
        let version = os["version"]
            .as_str()
            .map(|p| {
                regex::Regex::new(p)
                    .map(|r| r.is_match("10.0"))
                    .unwrap_or(false)
            })
            .unwrap_or(true);
        let features = rule["features"]
            .as_object()
            .map(|f| f.values().all(|v| v == false))
            .unwrap_or(true);
        if name && arch && version && features {
            allow = rule["action"] == "allow"
        }
    }
    allow
}
pub fn merge(mut parent: Value, child: Value) -> Value {
    if let (Some(p), Some(c)) = (parent.as_object_mut(), child.as_object()) {
        for (k, v) in c {
            match k.as_str() {
                "arguments" => {
                    let a = p.entry(k).or_insert(json!({}));
                    for kind in ["jvm", "game"] {
                        let mut list = a[kind].as_array().cloned().unwrap_or_default();
                        list.extend(v[kind].as_array().cloned().unwrap_or_default());
                        a[kind] = json!(list);
                    }
                }
                "libraries" => {
                    let mut list = p[k].as_array().cloned().unwrap_or_default();
                    for lib in v.as_array().into_iter().flatten() {
                        let name = lib["name"].as_str().unwrap_or("");
                        let key = name.rsplit_once(':').map(|x| x.0).unwrap_or(name);
                        list.retain(|x| {
                            x["name"]
                                .as_str()
                                .unwrap_or("")
                                .rsplit_once(':')
                                .map(|x| x.0)
                                .unwrap_or("")
                                != key
                        });
                        list.push(lib.clone())
                    }
                    p.insert(k.clone(), json!(list));
                }
                _ => {
                    p.insert(k.clone(), v.clone());
                }
            }
        }
    }
    parent
}
fn version_meta(core: &Core, id: &str, depth: usize) -> Result<Value> {
    if depth > 8 {
        return Err("Version inheritance is too deep.".into());
    }
    let m = manifest(core)?;
    let item = m["versions"]
        .as_array()
        .ok_or("Invalid manifest")?
        .iter()
        .find(|v| v["id"] == id)
        .ok_or("Version is not in the official manifest")?;
    let hash = item["sha1"].as_str().ok_or("Missing metadata checksum")?;
    let path = core
        .root
        .join("cache/versions")
        .join(storage::safe_relative(id)?)
        .join("version.json");
    network::download(
        item["url"].as_str().ok_or("Missing metadata URL")?,
        &path,
        hash,
        "sha1",
        0,
        core,
        &mut |_| {},
    )?;
    let v: Value = serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    if let Some(p) = v["inheritsFrom"].as_str() {
        Ok(merge(version_meta(core, p, depth + 1)?, v))
    } else {
        Ok(v)
    }
}
pub fn fabric(version: &str) -> Result<Value> {
    storage::safe_relative(version)?;
    let v = network::json(&format!(
        "https://meta.fabricmc.net/v2/versions/loader/{version}"
    ))?;
    Ok(json!(v
        .as_array()
        .ok_or("Invalid Fabric metadata")?
        .iter()
        .map(|v| v["loader"].clone())
        .collect::<Vec<_>>()))
}
pub fn quilt(version: &str) -> Result<Value> {
    storage::safe_relative(version)?;
    let v = network::json(&format!(
        "https://meta.quiltmc.org/v3/versions/loader/{version}"
    ))?;
    Ok(json!(v
        .as_array()
        .ok_or("Invalid Quilt metadata")?
        .iter()
        .map(|v| v["loader"].clone())
        .collect::<Vec<_>>()))
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Artifact {
    pub url: String,
    pub path: String,
    pub hash: String,
    pub kind: String,
    pub size: u64,
    pub native: bool,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Plan {
    pub version: Value,
    pub artifacts: Vec<Artifact>,
    pub classpath: Vec<String>,
    pub java: u64,
    pub runtime: Value,
    pub bytes: u64,
    pub disk: u64,
}
fn artifact(d: &Value, path: String, native: bool) -> Result<Artifact> {
    Ok(Artifact {
        url: d["url"].as_str().ok_or("Missing artifact URL")?.into(),
        path,
        hash: d["sha1"].as_str().ok_or("Missing SHA-1")?.into(),
        kind: "sha1".into(),
        size: d["size"].as_u64().unwrap_or(0),
        native,
    })
}
pub fn plan(core: &Core, version: &str, loader: Option<&str>) -> Result<Plan> {
    let supported = versions(core)?;
    if !supported["versions"]
        .as_array()
        .unwrap()
        .iter()
        .any(|v| v["id"] == version)
    {
        return Err("Version is outside the supported range.".into());
    }
    let mut v = version_meta(core, version, 0)?;
    if let Some(l) = loader {
        if l != "vanilla" && !l.is_empty() {
            let (kind, ver) = if let Some(stripped) = l.strip_prefix("quilt:") {
                ("quilt", stripped)
            } else if let Some(stripped) = l.strip_prefix("fabric:") {
                ("fabric", stripped)
            } else {
                ("fabric", l)
            };
            if ver.is_empty()
                || !ver.chars().all(|c| {
                    c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' || c == '+'
                })
            {
                return Err("Invalid loader version identifier.".into());
            }
            if kind == "quilt" {
                v = merge(
                    v,
                    network::json(&format!(
                        "https://meta.quiltmc.org/v3/versions/loader/{version}/{ver}/profile/json"
                    ))?,
                );
            } else {
                v = merge(
                    v,
                    network::json(&format!(
                        "https://meta.fabricmc.net/v2/versions/loader/{version}/{ver}/profile/json"
                    ))?,
                );
            }
        }
    }
    let mut artifacts = vec![];
    let mut cp = vec![];
    for lib in v["libraries"].as_array().ok_or("No library metadata")? {
        if !rules(&lib["rules"]) {
            continue;
        }
        let d = &lib["downloads"]["artifact"];
        if !d.is_null() {
            let p = format!(
                "cache/libraries/{}",
                d["path"].as_str().ok_or("Missing library path")?
            );
            storage::safe_relative(&p)?;
            cp.push(p.clone());
            artifacts.push(artifact(d, p, false)?);
        } else if let Some(name) = lib["name"].as_str() {
            let name_clean = name.strip_suffix("@jar").unwrap_or(name);
            let parts: Vec<_> = name_clean.split(':').collect();
            let p = if parts.len() == 3 {
                format!(
                    "{}/{}/{}/{}-{}.jar",
                    parts[0].replace('.', "/"),
                    parts[1],
                    parts[2],
                    parts[1],
                    parts[2]
                )
            } else if parts.len() == 4 {
                format!(
                    "{}/{}/{}/{}-{}-{}.jar",
                    parts[0].replace('.', "/"),
                    parts[1],
                    parts[2],
                    parts[1],
                    parts[2],
                    parts[3]
                )
            } else {
                return Err("Unsupported library coordinate.".into());
            };
            let base_raw = lib["url"]
                .as_str()
                .unwrap_or("https://libraries.minecraft.net/");
            let base = if base_raw.ends_with('/') {
                base_raw.to_string()
            } else {
                format!("{base_raw}/")
            };
            let url = format!("{base}{p}");
            let (checksum, kind) = if let Some(sha1) = lib["sha1"].as_str() {
                (sha1.to_string(), "sha1")
            } else if let Some(sha256) = lib["sha256"].as_str() {
                (sha256.to_string(), "sha256")
            } else {
                let cs = match network::text(&format!("{url}.sha1")) {
                    Ok(t) => t.split_whitespace().next().unwrap_or("").to_string(),
                    Err(_) => {
                        let text = network::text(&format!("{url}.sha256"))?;
                        text.split_whitespace().next().unwrap_or("").to_string()
                    },
                };
                if cs.is_empty() {
                    return Err("Empty checksum".into());
                }
                let kind = if cs.len() == 64 { "sha256" } else { "sha1" };
                (cs, kind)
            };
            let path = format!("cache/libraries/{p}");
            storage::safe_relative(&path)?;
            cp.push(path.clone());
            let size = lib["size"]
                .as_u64()
                .or_else(|| fs::metadata(core.root.join(&path)).ok().map(|m| m.len()))
                .unwrap_or_else(|| {
                    network::client()
                        .ok()
                        .and_then(|c| c.head(&url).send().ok())
                        .and_then(|r| r.content_length())
                        .unwrap_or(0)
                });
            artifacts.push(Artifact {
                url,
                path,
                hash: checksum,
                kind: kind.into(),
                size,
                native: false,
            });
        }
        if let Some(n) = lib["natives"]["windows"].as_str() {
            let key = n.replace("${arch}", "64");
            let d = if !lib["downloads"]["classifiers"][&key].is_null() {
                &lib["downloads"]["classifiers"][&key]
            } else if !lib["downloads"]["classifiers"]["natives-windows"].is_null() {
                &lib["downloads"]["classifiers"]["natives-windows"]
            } else if !lib["downloads"]["classifiers"]["natives-windows-64"].is_null() {
                &lib["downloads"]["classifiers"]["natives-windows-64"]
            } else {
                &Value::Null
            };
            if !d.is_null() {
                let p = format!(
                    "cache/libraries/{}",
                    d["path"].as_str().ok_or("Missing native library")?
                );
                storage::safe_relative(&p)?;
                artifacts.push(artifact(d, p, true)?);
            }
        }
    }
    let client_path = format!("cache/versions/{version}/client.jar");
    artifacts.push(artifact(
        &v["downloads"]["client"],
        client_path.clone(),
        false,
    )?);
    cp.push(client_path);
    let ai = &v["assetIndex"];
    let ai_id = ai["id"].as_str().ok_or("Missing asset index")?;
    storage::safe_relative(ai_id)?;
    let ai_path = format!("cache/assets/indexes/{ai_id}.json");
    let a = artifact(ai, ai_path.clone(), false)?;
    network::download(
        &a.url,
        &core.root.join(&ai_path),
        &a.hash,
        &a.kind,
        a.size,
        core,
        &mut |_| {},
    )?;
    let index: Value =
        serde_json::from_slice(&fs::read(core.root.join(ai_path)).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
    for obj in index["objects"]
        .as_object()
        .ok_or("Invalid asset index")?
        .values()
    {
        let hash = obj["hash"].as_str().ok_or("Missing asset hash")?;
        if hash.len() != 40 || !hash.bytes().all(|b| b.is_ascii_hexdigit()) {
            return Err("Invalid asset hash.".into());
        }
        let key = format!("{}/{hash}", &hash[..2]);
        artifacts.push(Artifact {
            url: format!("https://resources.download.minecraft.net/{key}"),
            path: format!("cache/assets/objects/{key}"),
            hash: hash.into(),
            kind: "sha1".into(),
            size: obj["size"].as_u64().ok_or("Missing asset size")?,
            native: false,
        });
    }
    if let Some(id) = v["logging"]["client"]["file"]["id"].as_str() {
        storage::safe_relative(id)?;
        artifacts.push(artifact(
            &v["logging"]["client"]["file"],
            format!("cache/logging/{id}"),
            false,
        )?);
    }
    let java = v["javaVersion"]["majorVersion"]
        .as_u64()
        .unwrap_or(8);
    let runtime_path = core
        .root
        .join(format!("cache/runtimes/java-{java}/runtime.json"));
    let runtime: Value = match adoptium_package(java) {
        Ok(r) => {
            storage::write_json(&runtime_path, &r)?;
            r
        }
        Err(e) => fs::read(runtime_path)
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .ok_or(e)?,
    };
    let mut seen = std::collections::HashSet::new();
    artifacts.retain(|a| seen.insert(a.path.clone()));
    let bytes = artifacts
        .iter()
        .filter(|a| !core.root.join(&a.path).exists())
        .map(|a| a.size)
        .sum::<u64>()
        + if runtime_ready(&core.root, java).is_none() {
            runtime["size"].as_u64().unwrap_or(0)
        } else {
            0
        };
    Ok(Plan {
        version: v,
        artifacts,
        classpath: cp,
        java,
        runtime,
        bytes,
        disk: bytes.saturating_mul(2) + 512 * 1024 * 1024,
    })
}
pub fn system_java() -> Option<std::path::PathBuf> {
    if let Ok(jh) = std::env::var("JAVA_HOME") {
        let p = std::path::PathBuf::from(jh).join("bin").join("java.exe");
        if p.exists() {
            return Some(p);
        }
    }
    if let Ok(path) = std::env::var("PATH") {
        for entry in std::env::split_paths(&path) {
            let p = entry.join("java.exe");
            if p.exists() {
                return Some(p);
            }
        }
    }
    None
}
/// Prefers the smaller JRE image; falls back to the JDK of the same major when Temurin
/// publishes no JRE (Java 16, required by Minecraft 1.17 and 1.17.1).
fn adoptium_package(java: u64) -> Result<Value> {
    let mut last = String::from("No supported Java runtime is available.");
    for image in ["jre", "jdk"] {
        let r = network::json(&format!("https://api.adoptium.net/v3/assets/latest/{java}/hotspot?architecture=x64&image_type={image}&os=windows&vendor=eclipse"))?;
        if let Some(p) = r.as_array().and_then(|a| a.first()).map(|a| a["binary"]["package"].clone()) {
            if p["link"].is_string() && p["checksum"].is_string() {
                return Ok(p);
            }
        }
        last = format!("Eclipse Temurin publishes no Java {java} {image} for Windows x64.");
    }
    Err(last)
}
pub fn runtime_ready(root: &Path, major: u64) -> Option<std::path::PathBuf> {
    let dir = root.join(format!("cache/runtimes/java-{major}/extracted"));
    if dir.join(".verified").is_file() {
        if let Some(exe) = walkdir::WalkDir::new(&dir)
            .max_depth(8)
            .into_iter()
            .filter_map(|e| e.ok())
            .find(|e| e.file_name() == "java.exe")
            .map(|e| e.into_path())
        {
            return Some(exe);
        }
    }
    None
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rule_order_and_features() {
        assert!(rules(&json!([{"action":"allow"}])));
        assert!(!rules(
            &json!([{"action":"allow"},{"action":"disallow","os":{"name":"windows"}}])
        ));
        assert!(!rules(
            &json!([{"action":"allow","features":{"is_demo_user":true}}])
        ));
        assert!(!rules(&json!([{"action":"allow","os":{"arch":"x86"}}])));
    }
    #[test]
    fn inherits_arguments() {
        let m = merge(
            json!({"arguments":{"game":["a"]},"mainClass":"a"}),
            json!({"arguments":{"game":["b"]},"mainClass":"b"}),
        );
        assert_eq!(m["arguments"]["game"], json!(["a", "b"]));
        assert_eq!(m["mainClass"], "b");
    }
}
