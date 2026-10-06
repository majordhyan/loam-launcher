//! Local crash decoder. Reads the game log and newest crash report after a failed
//! launch and turns known failure signatures into one plain-language card.
//! Rules are conservative: an unknown crash returns `None` and the UI falls back
//! to the generic message. Nothing is uploaded.
use crate::{model::*, storage};
use serde::Serialize;
use serde_json::Value;
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
};

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Action {
    /// `disable` (mod file), `memory` (MB), `settings`, `modrinth` (URL), `log`.
    pub kind: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Diagnosis {
    pub code: String,
    pub title: String,
    pub summary: String,
    pub evidence: Vec<String>,
    pub actions: Vec<Action>,
}

/// One installed mod: file path relative to the game folder, id and display name.
#[derive(Clone, Debug)]
pub struct ModFile {
    pub path: String,
    pub id: String,
    pub name: String,
    pub enabled: bool,
}

const MAX_TEXT: u64 = 4 * 1024 * 1024;

fn read_tail(path: &Path) -> String {
    let Ok(mut f) = fs::File::open(path) else { return String::new() };
    let len = f.metadata().map(|m| m.len()).unwrap_or(0);
    if len > MAX_TEXT {
        use std::io::{Seek, SeekFrom};
        let _ = f.seek(SeekFrom::Start(len - MAX_TEXT));
    }
    let mut b = Vec::new();
    let _ = f.take(MAX_TEXT).read_to_end(&mut b);
    String::from_utf8_lossy(&b).into_owned()
}

/// Reads `fabric.mod.json` / `quilt.mod.json` ids from every jar in `mods/`.
pub fn installed_mods(game_dir: &Path) -> Vec<ModFile> {
    let mut out = vec![];
    let Ok(entries) = fs::read_dir(game_dir.join("mods")) else { return out };
    for e in entries.flatten().take(2000) {
        let file = e.file_name().to_string_lossy().into_owned();
        let enabled = file.ends_with(".jar");
        if !enabled && !file.ends_with(".jar.disabled") {
            continue;
        }
        if storage::no_links(&e.path()).is_err() {
            continue;
        }
        let stem = file.trim_end_matches(".disabled").trim_end_matches(".jar").to_owned();
        let (id, name) = jar_identity(&e.path()).unwrap_or_else(|| (stem.to_lowercase(), stem.clone()));
        out.push(ModFile { path: format!("mods/{file}"), id, name, enabled });
    }
    out
}

fn jar_identity(path: &Path) -> Option<(String, String)> {
    let mut zip = zip::ZipArchive::new(fs::File::open(path).ok()?).ok()?;
    for meta in ["fabric.mod.json", "quilt.mod.json"] {
        let Ok(f) = zip.by_name(meta) else { continue };
        if f.size() > 1024 * 1024 {
            return None;
        }
        let mut s = String::new();
        f.take(1024 * 1024).read_to_string(&mut s).ok()?;
        // Some mods ship JSON with raw newlines in strings; tolerate by stripping controls.
        let s: String = s.chars().map(|c| if c.is_control() && c != '\n' { ' ' } else { c }).collect();
        let v: Value = serde_json::from_str(&s).ok()?;
        let (id, name) = if meta == "quilt.mod.json" {
            (v["quilt_loader"]["id"].as_str()?, v["quilt_loader"]["metadata"]["name"].as_str())
        } else {
            (v["id"].as_str()?, v["name"].as_str())
        };
        return Some((id.to_owned(), name.unwrap_or(id).to_owned()));
    }
    // OptiFine is distributed as a plain jar without Fabric metadata.
    if zip.by_name("optifine/Config.class").is_ok() || zip.by_name("net/optifine/Config.class").is_ok() {
        return Some(("optifine".into(), "OptiFine".into()));
    }
    None
}

/// "fabric-api" → "Fabric API" for ids Fabric reports without a display name.
fn display_id(id: &str) -> String {
    id.split(['-', '_'])
        .map(|w| {
            if w == "api" {
                "API".to_owned()
            } else {
                let mut c = w.chars();
                c.next().map(|f| f.to_uppercase().collect::<String>() + c.as_str()).unwrap_or_default()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}
fn find_mod<'a>(mods: &'a [ModFile], id: &str) -> Option<&'a ModFile> {
    let id = id.to_ascii_lowercase();
    mods.iter().filter(|m| m.enabled).find(|m| m.id.eq_ignore_ascii_case(&id))
}

fn disable(m: &ModFile) -> Action {
    Action { kind: "disable".into(), label: format!("Disable {} and play", m.name), path: Some(m.path.clone()), value: None, url: None }
}

fn evidence(text: &str, needle: &str, max: usize) -> Vec<String> {
    text.lines()
        .filter(|l| l.contains(needle))
        .take(max)
        .map(|l| l.trim().chars().take(240).collect())
        .collect()
}

fn java_for_class_version(major: u32) -> Option<u32> {
    // Class file 52 = Java 8; each Java release adds one.
    (major >= 52).then(|| major - 44)
}

/// Known pairs where the first mod replaces the renderer the second also replaces.
const CONFLICTS: &[(&str, &[&str])] = &[
    ("optifine", &["sodium", "iris", "indium", "embeddium", "rubidium", "lithium"]),
    ("optifabric", &["sodium", "iris", "indium", "lithium"]),
];

pub fn decode(log: &str, report: &str, mods: &[ModFile], memory_mb: u64, ram_mb: u64) -> Option<Diagnosis> {
    let all = format!("{log}\n{report}");

    // 1. Java rejected a launch option (exits before Minecraft starts).
    if let Some(line) = all.lines().find(|l| l.contains("Unrecognized VM option") || l.contains("must be enabled via -XX:+UnlockExperimentalVMOptions") || l.contains("Improperly specified VM option")) {
        return Some(Diagnosis {
            code: "LOAM-CRASH-JVM-OPTION".into(),
            title: "Java rejected a launch option".into(),
            summary: "Java stopped before Minecraft could start because one of the JVM options is not valid for this Java version. Remove custom JVM options in Game settings and try again.".into(),
            evidence: vec![line.trim().chars().take(240).collect()],
            actions: vec![Action { kind: "settings".into(), label: "Open game settings".into(), path: None, value: None, url: None }],
        });
    }

    // 2. Heap could not be reserved: memory set higher than Windows can give.
    if all.contains("Could not reserve enough space for") || all.contains("Invalid maximum heap size") || (all.contains("Could not create the Java Virtual Machine") && all.contains("heap")) {
        let suggested = (memory_mb / 2).max(2048).min(ram_mb / 2).max(1024) / 512 * 512;
        return Some(Diagnosis {
            code: "LOAM-CRASH-HEAP-RESERVE".into(),
            title: "Not enough free memory to start".into(),
            summary: format!("Windows could not give Java the {} GB this game asks for. Lower the game's memory, or close other programs, then play again.", memory_mb as f64 / 1024.0),
            evidence: evidence(&all, "reserve enough space", 1),
            actions: vec![Action { kind: "memory".into(), label: format!("Use {} GB and play", suggested as f64 / 1024.0), path: None, value: Some(suggested), url: None }],
        });
    }

    // 3. Two enabled jars declare the same mod id; Fabric and Quilt refuse to start.
    let mut seen = std::collections::HashMap::<&str, &ModFile>::new();
    for m in mods.iter().filter(|m| m.enabled) {
        if let Some(first) = seen.insert(m.id.as_str(), m) {
            return Some(Diagnosis {
                code: "LOAM-CRASH-DUPLICATE".into(),
                title: "The same mod is installed twice".into(),
                summary: format!("Two files provide {}. Keep one copy and disable the other.", m.name),
                evidence: vec![format!("{} and {} both declare the mod id \"{}\"", first.path, m.path, m.id)],
                actions: vec![Action { kind: "disable".into(), label: format!("Disable {} and play", m.path.trim_start_matches("mods/")), path: Some(m.path.clone()), value: None, url: None }],
            });
        }
    }

    // 4. Fabric/Quilt loader refused the mod set: missing or conflicting dependencies.
    if all.contains("Incompatible mods found") || all.contains("Incompatible mod set") || all.contains("Mod resolution failed") {
        // Fabric names the other mod as `mod 'Name' (id)` when it is installed and as a bare
        // id when it is missing: "requires any 0.6.x version of sodium, which is missing!".
        let other = r"(?:mod '([^']+)' \(([a-z0-9_\-]+)\)|([a-z0-9_\-]+))";
        let re_missing = regex::Regex::new(&format!(r"Mod '([^']+)' \(([a-z0-9_\-]+)\)[^\n]*? requires ([^\n]*?) of {other},? (which is missing|but only the wrong version)")).ok()?;
        let re_conflict = regex::Regex::new(&format!(r"Mod '([^']+)' \(([a-z0-9_\-]+)\)[^\n]*? is incompatible with [^\n]*?of {other}")).ok()?;
        let other_mod = |c: &regex::Captures, first: usize| -> (String, String) {
            match (c.get(first), c.get(first + 1), c.get(first + 2)) {
                (Some(name), Some(id), _) => (name.as_str().to_owned(), id.as_str().to_owned()),
                (_, _, Some(id)) => (
                    find_mod(mods, id.as_str()).map(|m| m.name.clone()).unwrap_or_else(|| display_id(id.as_str())),
                    id.as_str().to_owned(),
                ),
                _ => ("another mod".into(), String::new()),
            }
        };
        if let Some(c) = re_conflict.captures(&all) {
            let (a_name, a_id) = (&c[1], &c[2]);
            let (b_name, b_id) = other_mod(&c, 3);
            let (b_name, b_id) = (b_name.as_str(), b_id.as_str());
            let mut actions = vec![];
            if let Some(m) = find_mod(mods, b_id) { actions.push(disable(m)); }
            if let Some(m) = find_mod(mods, a_id) { actions.push(disable(m)); }
            return Some(Diagnosis {
                code: "LOAM-CRASH-MOD-CONFLICT".into(),
                title: "Mod conflict detected".into(),
                summary: format!("{a_name} is incompatible with {b_name}. Disable one of them to play."),
                evidence: vec![c[0].chars().take(240).collect()],
                actions,
            });
        }
        if let Some(c) = re_missing.captures(&all) {
            let (a_name, a_id) = (&c[1], &c[2]);
            let wanted = c[3].trim_start_matches("any ").trim_end_matches("version").trim().to_owned();
            let (b_name, b_id) = other_mod(&c, 4);
            let (b_name, b_id) = (b_name.as_str(), b_id.as_str());
            let wrong = &c[7] != "which is missing";
            let wanted = if wanted.is_empty() { String::new() } else { format!(" ({wanted})") };
            let mut actions = vec![];
            if !wrong {
                actions.push(Action { kind: "modrinth".into(), label: format!("Find {b_name} on Modrinth"), path: None, value: None, url: Some(format!("https://modrinth.com/mod/{b_id}")) });
            }
            if let Some(m) = find_mod(mods, a_id) { actions.push(disable(m)); }
            return Some(Diagnosis {
                code: if wrong { "LOAM-CRASH-MOD-VERSION" } else { "LOAM-CRASH-MOD-MISSING" }.into(),
                title: if wrong { "A mod needs a different version of another mod" } else { "A required mod is missing" }.into(),
                summary: if wrong {
                    format!("{a_name} needs a different version of {b_name} than the one installed. Update {b_name}, or disable {a_name}.")
                } else {
                    format!("{a_name} needs {b_name}{wanted}, which isn't installed in this game. Add {b_name}, or disable {a_name}.")
                },
                evidence: vec![c[0].chars().take(240).collect()],
                actions,
            });
        }
        return Some(Diagnosis {
            code: "LOAM-CRASH-MOD-SET".into(),
            title: "The mod loader rejected this mod list".into(),
            summary: "Fabric found mods that cannot run together or are missing dependencies. Open the log for the exact list, or restore a backup from before the last change.".into(),
            evidence: all.lines().filter(|l| l.trim_start().starts_with("- Mod")).take(4).map(|l| l.trim().chars().take(240).collect()).collect(),
            actions: vec![Action { kind: "log".into(), label: "View log".into(), path: None, value: None, url: None }],
        });
    }

    // 5. Known renderer conflicts present together (OptiFine with Sodium/Iris, …).
    for (first, others) in CONFLICTS {
        if let Some(a) = find_mod(mods, first) {
            if let Some(b) = others.iter().find_map(|o| find_mod(mods, o)) {
                return Some(Diagnosis {
                    code: "LOAM-CRASH-RENDERER-CONFLICT".into(),
                    title: "Mod conflict detected".into(),
                    summary: format!("{} is incompatible with {}. Both change how Minecraft renders. Disable {} to play safely.", a.name, b.name, a.name),
                    evidence: vec![format!("{} and {} are both enabled in mods/", a.path, b.path)],
                    actions: vec![disable(a), disable(b)],
                });
            }
        }
    }

    // 6. Mixin failure naming a mod.
    let mixin = regex::Regex::new(r"(?:Mixin apply for mod ([a-z0-9_\-]+) failed|from mod ([a-z0-9_\-]+)\][^\n]*?(?:failed|InvalidInjectionException|MixinApplyError))").ok()?;
    if let Some(c) = mixin.captures(&all) {
        let id = c.get(1).or(c.get(2)).map(|m| m.as_str()).unwrap_or("");
        let m = find_mod(mods, id);
        return Some(Diagnosis {
            code: "LOAM-CRASH-MIXIN".into(),
            title: "A mod is not compatible with this game version".into(),
            summary: format!("{} failed while changing Minecraft's code. It is usually built for a different Minecraft version. Disable it or install a version made for this game.", m.map(|m| m.name.as_str()).unwrap_or(id)),
            evidence: vec![c[0].chars().take(240).collect()],
            actions: m.map(disable).into_iter().collect(),
        });
    }

    // 7. Built for a newer Java.
    if let Some(c) = regex::Regex::new(r"UnsupportedClassVersionError: ([^\s]+)[^\n]*?class file version (\d+)").ok()?.captures(&all) {
        let java = c[2].parse::<f64>().ok().and_then(|v| java_for_class_version(v as u32));
        return Some(Diagnosis {
            code: "LOAM-CRASH-JAVA-VERSION".into(),
            title: "A mod needs a newer Java".into(),
            summary: format!("{} was built for Java {}, newer than the Java this Minecraft version uses. Use a version of that mod made for this game.", c[1].split('/').next().unwrap_or("A mod"), java.map(|j| j.to_string()).unwrap_or_else(|| "?".into())),
            evidence: vec![c[0].chars().take(240).collect()],
            actions: vec![Action { kind: "log".into(), label: "View log".into(), path: None, value: None, url: None }],
        });
    }

    // 8. Out of memory during play.
    if all.contains("java.lang.OutOfMemoryError") {
        let more = (memory_mb + 2048).min(ram_mb * 3 / 4) / 512 * 512;
        let actions = if more > memory_mb {
            vec![Action { kind: "memory".into(), label: format!("Use {} GB and play", more as f64 / 1024.0), path: None, value: Some(more), url: None }]
        } else {
            vec![Action { kind: "settings".into(), label: "Open game settings".into(), path: None, value: None, url: None }]
        };
        return Some(Diagnosis {
            code: "LOAM-CRASH-OUT-OF-MEMORY".into(),
            title: "Minecraft ran out of memory".into(),
            summary: format!("The game used all {} GB it was given. Give it more memory, or remove heavy mods or shaders.", memory_mb as f64 / 1024.0),
            evidence: evidence(&all, "OutOfMemoryError", 1),
            actions,
        });
    }

    // 9. Graphics driver / OpenGL.
    let gl = ["WGL: The driver does not appear to support OpenGL", "Pixel format not accelerated", "GLFW error 65542", "GLFW error 65543"];
    let driver_dll = ["atio6axx.dll", "nvoglv64.dll", "ig9icd64.dll", "ig75icd64.dll", "ig7icd64.dll"];
    let native_crash = all.contains("EXCEPTION_ACCESS_VIOLATION");
    if let Some(n) = gl.iter().find(|n| all.contains(**n)).or_else(|| driver_dll.iter().find(|n| native_crash && all.contains(**n))) {
        return Some(Diagnosis {
            code: "LOAM-CRASH-GRAPHICS".into(),
            title: "Graphics driver problem".into(),
            summary: "Minecraft could not use your graphics card correctly. Update the graphics driver from your GPU maker (NVIDIA, AMD or Intel), then play again. Shader packs can also trigger this.".into(),
            evidence: evidence(&all, n, 1),
            actions: vec![Action { kind: "log".into(), label: "View log".into(), path: None, value: None, url: None }],
        });
    }
    None
}

/// Collects inputs for one failed run and decodes them. `since` filters out old crash reports.
pub fn diagnose(core: &Core, game_id: &str, since: std::time::SystemTime) -> Option<Diagnosis> {
    let game = core.game(game_id).ok()?;
    let dir = core.game_dir(game_id).ok()?;
    let log = read_tail(&dir.join("logs/loam-latest.log"));
    let report = newest_report(&dir.join("crash-reports"), since).map(|p| read_tail(&p)).unwrap_or_default();
    let mods = installed_mods(&dir);
    let mut sys = sysinfo::System::new();
    sys.refresh_memory();
    let mut d = decode(&log, &report, &mods, game.memory as u64, sys.total_memory() / 1048576)?;
    let names: Vec<String> = core.data.lock().ok()?.accounts.iter().map(|a| a.name.clone()).collect();
    let names: Vec<&str> = names.iter().map(String::as_str).collect();
    d.evidence = d.evidence.iter().map(|e| crate::diagnostics::redact(e, &names)).collect();
    Some(d)
}

fn newest_report(dir: &Path, since: std::time::SystemTime) -> Option<PathBuf> {
    fs::read_dir(dir).ok()?.flatten()
        .filter_map(|e| Some((e.metadata().ok()?.modified().ok()?, e.path())))
        .filter(|(t, p)| *t >= since && p.extension().is_some_and(|x| x == "txt"))
        .max_by_key(|(t, _)| *t)
        .map(|(_, p)| p)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn m(id: &str, name: &str) -> ModFile {
        ModFile { path: format!("mods/{id}.jar"), id: id.into(), name: name.into(), enabled: true }
    }
    #[test]
    fn optifine_with_sodium_suggests_disabling_optifine_first() {
        let d = decode("", "", &[m("sodium", "Sodium"), m("optifine", "OptiFine")], 4096, 16384).unwrap();
        assert_eq!(d.code, "LOAM-CRASH-RENDERER-CONFLICT");
        assert_eq!(d.summary, "OptiFine is incompatible with Sodium. Both change how Minecraft renders. Disable OptiFine to play safely.");
        assert_eq!(d.actions[0].path.as_deref(), Some("mods/optifine.jar"));
    }
    #[test]
    fn fabric_missing_dependency_names_both_mods() {
        let log = "[main/ERROR]: Incompatible mods found!\n - Mod 'Mod Menu' (modmenu) 11.0.1 requires any version of mod 'Fabric API' (fabric-api), which is missing!";
        let d = decode(log, "", &[m("modmenu", "Mod Menu")], 4096, 16384).unwrap();
        assert_eq!(d.code, "LOAM-CRASH-MOD-MISSING");
        assert!(d.summary.contains("Mod Menu needs Fabric API"));
        assert_eq!(d.actions[0].url.as_deref(), Some("https://modrinth.com/mod/fabric-api"));
        assert_eq!(d.actions[1].kind, "disable");
    }
    #[test]
    fn real_fabric_0_16_missing_dependency_line() {
        // Captured from a real Fabric 0.16.9 / Minecraft 1.21.4 launch of Iris without Sodium.
        let log = "Incompatible mods found!\n - Mod 'Iris' (iris) 1.8.8+mc1.21.4 requires any 0.6.x version of sodium, which is missing!\n\t - You must install any 0.6.x version of sodium.";
        let d = decode(log, "", &[m("iris", "Iris")], 4096, 16384).unwrap();
        assert_eq!(d.code, "LOAM-CRASH-MOD-MISSING");
        assert_eq!(d.summary, "Iris needs Sodium (0.6.x), which isn't installed in this game. Add Sodium, or disable Iris.");
        assert_eq!(d.actions[0].url.as_deref(), Some("https://modrinth.com/mod/sodium"));
        assert_eq!(d.actions[1].path.as_deref(), Some("mods/iris.jar"));
        assert_eq!(display_id("fabric-api"), "Fabric API");
    }
    #[test]
    fn fabric_conflict_line_is_decoded() {
        let log = "Incompatible mods found!\n - Mod 'Sodium' (sodium) 0.5.8 is incompatible with any version of mod 'OptiFabric' (optifabric), but a matching version is present: 1.14.3!";
        let d = decode(log, "", &[m("sodium", "Sodium"), m("optifabric", "OptiFabric")], 4096, 16384).unwrap();
        assert_eq!(d.code, "LOAM-CRASH-MOD-CONFLICT");
        assert_eq!(d.actions[0].path.as_deref(), Some("mods/optifabric.jar"));
    }
    #[test]
    fn jvm_option_heap_oom_and_java_version() {
        assert_eq!(decode("Error: VM option 'G1NewSizePercent' is experimental and must be enabled via -XX:+UnlockExperimentalVMOptions.", "", &[], 4096, 16384).unwrap().code, "LOAM-CRASH-JVM-OPTION");
        let heap = decode("Error occurred during initialization of VM\nCould not reserve enough space for 8388608KB object heap", "", &[], 8192, 8192).unwrap();
        assert_eq!(heap.actions[0].value, Some(4096));
        let oom = decode("java.lang.OutOfMemoryError: Java heap space", "", &[], 2048, 16384).unwrap();
        assert_eq!(oom.actions[0].value, Some(4096));
        let j = decode("java.lang.UnsupportedClassVersionError: me/mod/Main has been compiled by a more recent version of the Java Runtime (class file version 65.0)", "", &[], 2048, 16384).unwrap();
        assert!(j.summary.contains("Java 21"), "{}", j.summary);
    }
    #[test]
    fn mixin_failure_points_at_mod_and_unknown_is_none() {
        let d = decode("Mixin apply for mod lithium failed lithium.mixins.json:ai.Foo", "", &[m("lithium", "Lithium")], 4096, 16384).unwrap();
        assert_eq!(d.code, "LOAM-CRASH-MIXIN");
        assert!(d.summary.starts_with("Lithium failed"));
        assert!(decode("Stopping!\n[Render thread/INFO]: Goodbye", "", &[m("sodium", "Sodium")], 4096, 16384).is_none());
    }
}
