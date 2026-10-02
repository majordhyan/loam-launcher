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
        .user_agent("LOAM/0.1.0")
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
    let clean = json!({"skin":data(&bytes),"variant":variant,"cape":value["cape"]=="loam","name":"Saved look"});
    storage::atomic_write(
        &core.root.join("skin-studio.json"),
        &serde_json::to_vec(&clean).map_err(|e| e.to_string())?,
    )?;
    Ok(clean)
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
}
