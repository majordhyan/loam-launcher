//! Bounded texture import and authenticated official profile changes. No game patching.
use crate::{accounts, model::*, storage};
use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::blocking::{Client, Response};
use serde_json::{json, Value};
use std::{
    fs,
    io::{Cursor, Read},
    path::Path,
    time::Duration,
};
const LIMIT: u64 = 1024 * 1024;
const PROFILE: &str = "https://api.minecraftservices.com/minecraft/profile";
fn client() -> Result<Client> {
    Client::builder()
        .https_only(true)
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(30))
        .user_agent(concat!("LOAM/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|_| "Could not start the skin service.".into())
}
fn bounded(mut r: impl Read) -> Result<Vec<u8>> {
    let mut bytes = vec![];
    r.by_ref()
        .take(LIMIT + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "Could not read the texture.")?;
    if bytes.len() as u64 > LIMIT {
        return Err("Texture exceeds the 1 MB limit.".into());
    }
    Ok(bytes)
}
fn response(r: Response) -> Result<Vec<u8>> {
    if !r.status().is_success() {
        return Err(match r.status().as_u16() {
            401 | 403 => "Minecraft rejected this session. Sign in again with an account that owns Java Edition.",
            404 => "No Minecraft profile or texture was found.",
            429 => "The skin service is busy. Wait a little and try again.",
            _ => "The skin service could not complete this request. Try again.",
        }.into());
    }
    bounded(r)
}
fn get_json(url: &str) -> Result<Value> {
    serde_json::from_slice(&response(
        client()?
            .get(url)
            .send()
            .map_err(|_| "Could not reach the skin service.")?,
    )?)
    .map_err(|_| "The skin service returned invalid metadata.".into())
}
pub fn sanitize_png(bytes: &[u8], cape: bool) -> Result<Vec<u8>> {
    if bytes.len() as u64 > LIMIT {
        return Err("Texture exceeds the 1 MB limit.".into());
    }
    let mut decoder = png::Decoder::new(Cursor::new(bytes));
    decoder.set_limits(png::Limits {
        bytes: 2 * LIMIT as usize,
    });
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut reader = decoder
        .read_info()
        .map_err(|_| "Choose a valid PNG image.")?;
    let info = reader.info();
    if info.width != 64
        || (info.height != 32 && (cape || info.height != 64))
        || info.animation_control.is_some()
    {
        return Err(if cape {
            "Capes must be a static 64 × 32 PNG."
        } else {
            "Skins must be a static 64 × 64 or 64 × 32 PNG."
        }
        .into());
    }
    let mut buffer = vec![0; reader.output_buffer_size()];
    let frame = reader
        .next_frame(&mut buffer)
        .map_err(|_| "This PNG is corrupt or incomplete.")?;
    let mut out = vec![];
    {
        let mut encoder = png::Encoder::new(&mut out, frame.width, frame.height);
        encoder.set_color(frame.color_type);
        encoder.set_depth(frame.bit_depth);
        encoder
            .write_header()
            .map_err(|_| "Could not prepare texture.")?
            .write_image_data(&buffer[..frame.buffer_size()])
            .map_err(|_| "Could not prepare texture.")?;
    }
    Ok(out)
}
fn data(bytes: &[u8]) -> String {
    format!("data:image/png;base64,{}", STANDARD.encode(bytes))
}
fn decode(value: &str) -> Result<Vec<u8>> {
    if value.len() > 2 * LIMIT as usize {
        return Err("Texture exceeds the size limit.".into());
    }
    STANDARD
        .decode(
            value
                .strip_prefix("data:image/png;base64,")
                .ok_or("Choose a PNG skin first.")?,
        )
        .map_err(|_| "Invalid PNG encoding.".into())
}
fn texture_url(raw: &str) -> Result<String> {
    let mut url = url::Url::parse(raw).map_err(|_| "Invalid texture URL.")?;
    // Mojang's profile metadata can still contain http texture URLs; upgrade before fetching.
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str() != Some("textures.minecraft.net")
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("Use an official textures.minecraft.net texture URL or a player name.".into());
    }
    let hash = url
        .path()
        .strip_prefix("/texture/")
        .ok_or("Invalid texture path.")?;
    if hash.len() < 32 || hash.len() > 64 || !hash.bytes().all(|c| c.is_ascii_hexdigit()) {
        return Err("Invalid texture identifier.".into());
    }
    url.set_scheme("https")
        .map_err(|_| "Invalid texture protocol.")?;
    Ok(url.into())
}
fn texture(raw: &str, cape: bool) -> Result<String> {
    let bytes = response(
        client()?
            .get(texture_url(raw)?)
            .send()
            .map_err(|_| "Texture download failed. Check your connection.")?,
    )?;
    Ok(data(&sanitize_png(&bytes, cape)?))
}
fn avatar_path(core: &Core, uuid: &str) -> Result<std::path::PathBuf> {
    let id = uuid::Uuid::parse_str(uuid).map_err(|_| "Invalid profile ID.")?.simple().to_string();
    Ok(core.root.join("cache/avatars").join(format!("{id}.json")))
}
/// Stores the active profile skin (sanitized PNG) for the account head. The texture is
/// only downloaded again when its URL changes.
pub fn cache_account_skin(core: &Core, profile: &Value) -> Result<()> {
    let uuid = profile["id"].as_str().ok_or("Profile ID missing")?;
    let path = avatar_path(core, uuid)?;
    let skin = profile["skins"].as_array().and_then(|v| v.iter().find(|v| v["state"] == "ACTIVE"));
    let Some(skin) = skin else {
        let _ = fs::remove_file(&path);
        return Ok(());
    };
    let url = skin["url"].as_str().ok_or("Skin has no texture.")?;
    if let Ok(b) = fs::read(&path) {
        if serde_json::from_slice::<Value>(&b).is_ok_and(|v| v["url"] == url) {
            return Ok(());
        }
    }
    let variant = if skin["variant"] == "SLIM" { "slim" } else { "classic" };
    storage::write_json(&path, &json!({"url":url,"skin":texture(url, false)?,"variant":variant}))
}
/// Skin used for an account's head: the cached profile skin for Microsoft accounts,
/// the saved studio look for Offline Profiles, otherwise `null` (the UI shows initials).
pub fn account_skin(core: &Core, id: &str) -> Result<Value> {
    let account = core.data.lock().unwrap().accounts.iter().find(|a| a.id == id).cloned().ok_or("Account not found.")?;
    if account.kind == "microsoft" {
        let path = avatar_path(core, &account.uuid)?;
        return Ok(fs::read(path).ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok()).map(|v| v["skin"].clone()).unwrap_or(Value::Null));
    }
    Ok(saved(core).ok().map(|v| v["skin"].clone()).filter(|s| s.is_string()).unwrap_or(Value::Null))
}
pub fn import_local(path: &str) -> Result<Value> {
    let p = Path::new(path);
    if !p.extension().is_some_and(|v| v.eq_ignore_ascii_case("png")) {
        return Err("Choose a PNG skin image.".into());
    }
    let bytes = bounded(fs::File::open(p).map_err(|_| "Could not open this skin image.")?)?;
    Ok(
        json!({"skin":data(&sanitize_png(&bytes, false)?),"variant":"classic","name":"Imported skin"}),
    )
}
pub fn import_online(input: &str) -> Result<Value> {
    let input = input.trim();
    if input.starts_with("https://") {
        return Ok(
            json!({"skin":texture(input,false)?,"variant":"classic","name":"Online texture"}),
        );
    }
    if !(3..=16).contains(&input.len())
        || !input
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_')
    {
        return Err(
            "Enter a 3–16 character Minecraft player name or an official texture URL.".into(),
        );
    }
    let user = get_json(&format!(
        "https://api.mojang.com/users/profiles/minecraft/{input}"
    ))?;
    let id = user["id"].as_str().ok_or("Player not found.")?;
    uuid::Uuid::parse_str(id).map_err(|_| "Invalid profile identifier.")?;
    let profile = get_json(&format!(
        "https://sessionserver.mojang.com/session/minecraft/profile/{id}"
    ))?;
    let encoded = profile["properties"]
        .as_array()
        .and_then(|p| p.iter().find(|p| p["name"] == "textures"))
        .and_then(|p| p["value"].as_str())
        .ok_or("This player has no skin texture.")?;
    let decoded = STANDARD
        .decode(encoded)
        .map_err(|_| "Invalid texture metadata.")?;
    let textures: Value =
        serde_json::from_slice(&decoded).map_err(|_| "Invalid texture metadata.")?;
    let skin = &textures["textures"]["SKIN"];
    Ok(
        json!({"skin":texture(skin["url"].as_str().ok_or("No skin found.")?,false)?,
        "variant":if skin["metadata"]["model"]=="slim" {"slim"} else {"classic"},"name":input}),
    )
}
pub fn saved(core: &Core) -> Result<Value> {
    let p = core.root.join("skin-studio.json");
    if !p.exists() {
        return Ok(Value::Null);
    }
    serde_json::from_slice(&bounded(
        fs::File::open(p).map_err(|_| "Could not read saved look.")?,
    )?)
    .map_err(|_| "The saved look is damaged. Choose a skin again.".into())
}
pub fn save(core: &Core, value: &Value) -> Result<Value> {
    let bytes = sanitize_png(
        &decode(value["skin"].as_str().ok_or("Choose a skin.")?)?,
        false,
    )?;
    let variant = variant(value)?;
    let clean = json!({"skin":data(&bytes),"variant":variant,"cape":value["cape"]=="loam" || value["cape"]==true,"name":"Saved look"});
    storage::atomic_write(
        &core.root.join("skin-studio.json"),
        &serde_json::to_vec(&clean).map_err(|e| e.to_string())?,
    )?;
    let _ = sync_to_all_games(core);
    Ok(clean)
}
pub fn sync_to_all_games(core: &Core) -> Result<()> {
    let game_ids: Vec<String> = {
        let d = core.data.lock().unwrap();
        d.games.iter().map(|g| g.id.clone()).collect()
    };
    for id in game_ids {
        let _ = sync_to_game(core, &id);
    }
    Ok(())
}
pub fn pack_format_for_version(version: &str) -> (u32, u32) {
    if version.starts_with("26.3") {
        (97, 1)
    } else if version.starts_with("26.2") {
        (88, 0)
    } else if version.starts_with("26.1") {
        (84, 0)
    } else if version.starts_with("1.21.11") {
        (75, 0)
    } else if version.starts_with("1.21.9") || version.starts_with("1.21.10") {
        (69, 0)
    } else if version.starts_with("1.21.7") || version.starts_with("1.21.8") {
        (64, 0)
    } else if version.starts_with("1.21.6") {
        (63, 0)
    } else if version.starts_with("1.21.5") {
        (55, 0)
    } else if version.starts_with("1.21.4") {
        (46, 0)
    } else if version.starts_with("1.21.2") || version.starts_with("1.21.3") {
        (42, 0)
    } else if version.starts_with("1.21") {
        (34, 0)
    } else if version.starts_with("1.20.5") || version.starts_with("1.20.6") {
        (32, 0)
    } else if version.starts_with("1.20.3") || version.starts_with("1.20.4") {
        (22, 0)
    } else if version.starts_with("1.20.2") {
        (18, 0)
    } else if version.starts_with("1.20") {
        (15, 0)
    } else if version.starts_with("1.19.4") {
        (13, 0)
    } else if version.starts_with("1.19.3") {
        (12, 0)
    } else if version.starts_with("1.19") {
        (9, 0)
    } else if version.starts_with("1.18") {
        (8, 0)
    } else if version.starts_with("1.17") {
        (7, 0)
    } else if version.starts_with("1.16.2")
        || version.starts_with("1.16.3")
        || version.starts_with("1.16.4")
        || version.starts_with("1.16.5")
    {
        (6, 0)
    } else if version.starts_with("1.15") || version.starts_with("1.16") {
        (5, 0)
    } else if version.starts_with("1.13") || version.starts_with("1.14") {
        (4, 0)
    } else if version.starts_with("1.11") || version.starts_with("1.12") {
        (3, 0)
    } else if version.starts_with("1.9") || version.starts_with("1.10") {
        (2, 0)
    } else {
        (1, 0)
    }
}

fn detect_pack_format(core: &Core, version: &str) -> (u32, u32) {
    if !version.is_empty() {
        let client_jar = core
            .root
            .join("cache")
            .join("versions")
            .join(version)
            .join("client.jar");
        if let Ok(file) = fs::File::open(&client_jar) {
            if let Ok(mut archive) = zip::ZipArchive::new(file) {
                if let Ok(mut entry) = archive.by_name("version.json") {
                    let mut content = String::new();
                    use std::io::Read;
                    if entry.read_to_string(&mut content).is_ok() {
                        if let Ok(v) = serde_json::from_str::<Value>(&content) {
                            if let Some(maj) = v["pack_version"]["resource_major"].as_u64() {
                                let min = v["pack_version"]["resource_minor"].as_u64().unwrap_or(0);
                                return (maj as u32, min as u32);
                            }
                        }
                    }
                }
            }
        }
    }
    pack_format_for_version(version)
}

pub fn sync_to_game(core: &Core, game_id: &str) -> Result<()> {
    let saved_look = match saved(core)? {
        Value::Null => return Ok(()),
        v => v,
    };
    let skin_b64 = match saved_look["skin"].as_str() {
        Some(s) => s,
        None => return Ok(()),
    };
    let skin_bytes = decode(skin_b64)?;
    let game_dir = core.game_dir(game_id)?;
    let pack_dir = game_dir.join("resourcepacks").join("LOAM_Skin");

    let entity_dir = pack_dir.join("assets").join("minecraft").join("textures").join("entity");
    let wide_dir = entity_dir.join("player").join("wide");
    let slim_dir = entity_dir.join("player").join("slim");
    let _ = fs::create_dir_all(&wide_dir);
    let _ = fs::create_dir_all(&slim_dir);

    let version = core
        .game(game_id)
        .ok()
        .map(|g| g.version)
        .unwrap_or_default();

    let (major_format, _minor_format) = detect_pack_format(core, &version);

    let mcmeta = if major_format > 64 {
        // Modern Minecraft (25w31a+, 1.21.9+, 26.x):
        // IntermediaryFormat mandates min_format and max_format when declaring format > 64.
        // Providing pack_format, min_format, max_format, and supported_formats delivers
        // 100% full compatibility without any warnings or error logs.
        json!({
            "pack": {
                "description": "LOAM Custom Appearance",
                "pack_format": major_format,
                "min_format": 1,
                "max_format": 999,
                "supported_formats": [1, 999]
            }
        })
    } else if major_format >= 15 {
        // Minecraft 1.20.2 through 1.21.8:
        // pack_format plus supported_formats range.
        json!({
            "pack": {
                "description": "LOAM Custom Appearance",
                "pack_format": major_format,
                "supported_formats": [1, 999]
            }
        })
    } else {
        // Legacy Minecraft (1.6.1 through 1.20.1):
        // Standard single pack_format integer.
        json!({
            "pack": {
                "description": "LOAM Custom Appearance",
                "pack_format": major_format
            }
        })
    };

    let _ = fs::write(
        pack_dir.join("pack.mcmeta"),
        serde_json::to_vec_pretty(&mcmeta).unwrap_or_default(),
    );
    let _ = fs::write(pack_dir.join("pack.png"), &skin_bytes);

    let _ = fs::write(entity_dir.join("steve.png"), &skin_bytes);
    let _ = fs::write(entity_dir.join("alex.png"), &skin_bytes);

    for name in [
        "steve", "alex", "ari", "chris", "efan", "kai", "makena", "noor", "sunny", "zuri",
    ] {
        let _ = fs::write(wide_dir.join(format!("{name}.png")), &skin_bytes);
        let _ = fs::write(slim_dir.join(format!("{name}.png")), &skin_bytes);
    }

    if saved_look["cape"].as_bool().unwrap_or(false) {
        let cape_bytes = include_bytes!("../../public/wardrobe/loam-cape.png");
        let _ = fs::write(entity_dir.join("elytra.png"), cape_bytes);
        let _ = fs::write(entity_dir.join("cape.png"), cape_bytes);
    }

    update_options_resource_pack(&game_dir, &version);

    Ok(())
}
pub fn update_options_resource_pack(game_dir: &Path, version: &str) {
    let options_path = game_dir.join("options.txt");
    let is_legacy = version.starts_with("1.8")
        || version.starts_with("1.9")
        || version.starts_with("1.10")
        || version.starts_with("1.11")
        || version.starts_with("1.12");
    let pack_entry = if is_legacy {
        "LOAM_Skin"
    } else {
        "file/LOAM_Skin"
    };

    if !options_path.exists() {
        let default_content = if is_legacy {
            format!("resourcePacks:[\"{pack_entry}\"]\r\n")
        } else {
            format!("resourcePacks:[\"vanilla\",\"{pack_entry}\"]\r\n")
        };
        let _ = fs::write(options_path, default_content);
        return;
    }

    let content = match fs::read_to_string(&options_path) {
        Ok(c) => c,
        Err(_) => return,
    };

    let mut lines: Vec<String> = content.lines().map(String::from).collect();
    let mut found = false;

    for line in &mut lines {
        if line.starts_with("resourcePacks:") {
            found = true;
            let raw_val = line.strip_prefix("resourcePacks:").unwrap_or("[]").trim();
            let mut packs: Vec<String> = serde_json::from_str(raw_val).unwrap_or_default();
            if !packs.iter().any(|p| p.contains("LOAM_Skin")) {
                packs.push(pack_entry.to_string());
            }
            *line = format!(
                "resourcePacks:{}",
                serde_json::to_string(&packs)
                    .unwrap_or_else(|_| format!("[\"{pack_entry}\"]"))
            );
        } else if line.starts_with("incompatibleResourcePacks:") {
            // Scrub LOAM_Skin from incompatible list if marked incompatible by older runs
            let raw_val = line.strip_prefix("incompatibleResourcePacks:").unwrap_or("[]").trim();
            let mut incomp: Vec<String> = serde_json::from_str(raw_val).unwrap_or_default();
            incomp.retain(|p| !p.contains("LOAM_Skin"));
            *line = format!(
                "incompatibleResourcePacks:{}",
                serde_json::to_string(&incomp).unwrap_or_else(|_| "[]".to_string())
            );
        }
    }

    if !found {
        if is_legacy {
            lines.push(format!("resourcePacks:[\"{pack_entry}\"]"));
        } else {
            lines.push(format!("resourcePacks:[\"vanilla\",\"{pack_entry}\"]"));
        }
    }

    let _ = fs::write(options_path, lines.join("\r\n") + "\r\n");
}
fn variant(value: &Value) -> Result<&str> {
    match value["variant"].as_str() {
        Some(v @ ("classic" | "slim")) => Ok(v),
        _ => Err("Choose Classic or Slim arms.".into()),
    }
}
fn session(core: &Core) -> Result<String> {
    let d = core.data.lock().unwrap();
    let a = d
        .accounts
        .iter()
        .find(|a| Some(&a.id) == d.selected_account.as_ref())
        .cloned()
        .ok_or("Choose a Microsoft account first.")?;
    drop(d);
    if a.kind != "microsoft" {
        return Err("OFFLINE PROFILE: skins and capes are preview-only. Sign in with Microsoft to change your official appearance.".into());
    }
    accounts::launch_token(core, &a)
}
fn profile(token: &str) -> Result<Value> {
    serde_json::from_slice(&response(
        client()?
            .get(PROFILE)
            .bearer_auth(token)
            .send()
            .map_err(|_| "Could not load your Minecraft wardrobe.")?,
    )?)
    .map_err(|_| "Invalid wardrobe response.".into())
}
pub fn wardrobe(core: &Core) -> Result<Value> {
    let p = profile(&session(core)?)?;
    let mut capes = vec![];
    for cape in p["capes"].as_array().into_iter().flatten().take(100) {
        capes.push(
            json!({"id":cape["id"],"name":cape["alias"],"active":cape["state"]=="ACTIVE",
            "texture":texture(cape["url"].as_str().ok_or("Cape has no texture.")?,true)?}),
        );
    }
    let skin = p["skins"]
        .as_array()
        .and_then(|v| v.iter().find(|v| v["state"] == "ACTIVE"));
    Ok(
        json!({"capes":capes,"skin":match skin { Some(s) => Some(texture(s["url"].as_str().ok_or("Skin has no texture.")?,false)?),None=>None },
        "variant": if skin.is_some_and(|s|s["variant"]=="SLIM") {"slim"} else {"classic"}}),
    )
}
pub fn apply(core: &Core, value: &Value) -> Result<Value> {
    let bytes = sanitize_png(
        &decode(value["skin"].as_str().ok_or("Choose a skin.")?)?,
        false,
    )?;
    let variant = variant(value)?;
    let token = session(core)?;
    let form = reqwest::blocking::multipart::Form::new()
        .text("variant", variant.to_owned())
        .part(
            "file",
            reqwest::blocking::multipart::Part::bytes(bytes)
                .file_name("loam-skin.png")
                .mime_str("image/png")
                .map_err(|_| "Could not prepare upload.")?,
        );
    response(
        client()?
            .post(format!("{PROFILE}/skins"))
            .bearer_auth(token)
            .multipart(form)
            .send()
            .map_err(|_| "Skin upload failed. Check your connection.")?,
    )?;
    Ok(json!(true))
}
pub fn apply_cape(core: &Core, id: &str) -> Result<Value> {
    let token = session(core)?;
    let c = client()?;
    let request = if id.is_empty() {
        c.delete(format!("{PROFILE}/capes/active"))
    } else {
        let p = profile(&token)?;
        if !p["capes"]
            .as_array()
            .is_some_and(|v| v.iter().any(|v| v["id"] == id))
        {
            return Err("This cape is not owned by your selected account.".into());
        }
        c.put(format!("{PROFILE}/capes/active"))
            .json(&json!({"capeId":id}))
    };
    response(
        request
            .bearer_auth(token)
            .send()
            .map_err(|_| "Cape update failed. Check your connection.")?,
    )?;
    Ok(json!(true))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn texture_origin_is_strict() {
        for u in [
            "https://evil.test/a.png",
            "https://textures.minecraft.net.evil.test/texture/abc",
            "file:///a.png",
            "http://127.0.0.1/a",
            "https://textures.minecraft.net/texture/../../a",
        ] {
            assert!(texture_url(u).is_err());
        }
        assert!(texture_url(&format!(
            "http://textures.minecraft.net/texture/{}",
            "a".repeat(64)
        ))
        .unwrap()
        .starts_with("https://"));
    }
    #[test]
    fn png_dimensions_and_corruption_are_rejected() {
        assert!(sanitize_png(b"not a png", false).is_err());
        for (w, h, expected) in [
            (64, 64, true),
            (64, 32, true),
            (128, 128, false),
            (64, 16, false),
        ] {
            let mut b = vec![];
            {
                let mut e = png::Encoder::new(&mut b, w, h);
                e.set_color(png::ColorType::Rgba);
                e.set_depth(png::BitDepth::Eight);
                e.write_header()
                    .unwrap()
                    .write_image_data(&vec![255; (w * h * 4) as usize])
                    .unwrap();
            }
            assert_eq!(sanitize_png(&b, false).is_ok(), expected);
            if expected {
                b.truncate(b.len() / 2);
                assert!(sanitize_png(&b, false).is_err());
            }
        }
    }
    #[test]
    fn pack_format_compliance_across_eras() {
        assert_eq!(pack_format_for_version("26.3"), (97, 1));
        assert_eq!(pack_format_for_version("26.2"), (88, 0));
        assert_eq!(pack_format_for_version("26.1"), (84, 0));
        assert_eq!(pack_format_for_version("1.21.4"), (46, 0));
        assert_eq!(pack_format_for_version("1.21.1"), (34, 0));
        assert_eq!(pack_format_for_version("1.20.4"), (22, 0));
        assert_eq!(pack_format_for_version("1.20.1"), (15, 0));
        assert_eq!(pack_format_for_version("1.19.4"), (13, 0));
        assert_eq!(pack_format_for_version("1.16.5"), (6, 0));
        assert_eq!(pack_format_for_version("1.12.2"), (3, 0));
        assert_eq!(pack_format_for_version("1.8.9"), (1, 0));
    }
}

