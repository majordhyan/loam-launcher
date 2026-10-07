use crate::model::*;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    io::{Read, Write},
    net::TcpListener,
    time::{Duration, Instant},
};
pub fn config() -> Value {
    serde_json::from_str(include_str!("../../loam.config.json")).expect("valid build configuration")
}
pub fn capabilities(kind: &str) -> Value {
    let ms = kind == "microsoft";
    json!({"ownership":ms,"singleplayer":true,"lan":true,"onlineServers":ms,"offlineServers":true,"realms":ms,"personalSkin":ms})
}
pub fn offline_uuid(name: &str) -> String {
    let mut hash = md5::compute(format!("OfflinePlayer:{name}")).0;
    hash[6] = (hash[6] & 0x0f) | 0x30;
    hash[8] = (hash[8] & 0x3f) | 0x80;
    uuid::Uuid::from_bytes(hash).to_string()
}
pub fn adjust_uuid_for_variant(uuid_str: &str, is_slim: bool) -> String {
    if let Ok(mut parsed) = uuid::Uuid::parse_str(uuid_str) {
        let bytes = parsed.as_bytes();
        let most_sig = u64::from_be_bytes(bytes[0..8].try_into().unwrap());
        let least_sig = u64::from_be_bytes(bytes[8..16].try_into().unwrap());
        let hilo = most_sig ^ least_sig;
        let hash = ((hilo >> 32) as i32) ^ (hilo as i32);
        let current_is_slim = (hash & 1) != 0;
        if current_is_slim != is_slim {
            let mut new_bytes = *bytes;
            new_bytes[15] ^= 1;
            parsed = uuid::Uuid::from_bytes(new_bytes);
        }
        parsed.to_string()
    } else {
        uuid_str.to_string()
    }
}
pub fn add_offline(core: &Core, name: &str) -> Result<Account> {
    if !(3..=16).contains(&name.len())
        || !name.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
    {
        return Err("Use 3–16 letters, numbers or underscores.".into());
    }
    let a = Account {
        id: uuid::Uuid::new_v4().to_string(),
        name: name.into(),
        uuid: offline_uuid(name),
        kind: "offline".into(),
        verified: None,
        access: None,
        capes: Vec::new(),
    };
    {
        let mut d = core.data.lock().unwrap();
        if d.accounts.iter().any(|a| a.name.eq_ignore_ascii_case(name)) {
            return Err("That profile name already exists.".into());
        }
        d.accounts.push(a.clone());
        d.selected_account = Some(a.id.clone());
    }
    core.save()?;
    Ok(a)
}
fn client() -> Result<reqwest::blocking::Client> {
    reqwest::blocking::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| "Cannot initialize sign-in.".into())
}
fn checked(r: reqwest::blocking::Response, stage: &str) -> Result<Value> {
    let status = r.status().as_u16();
    // Error bodies carry the real reason (Xbox XErr codes, OAuth error names), so read them first.
    let body: Value = r.text().ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or(Value::Null);
    if !(200..300).contains(&status) {
        return Err(failure(stage, status, &body));
    }
    if body.is_null() { Err(format!("Invalid {stage} sign-in response.")) } else { Ok(body) }
}
/// Plain-language reason for a failed sign-in step, from the HTTP status and the service's error body.
fn failure(stage: &str, status: u16, body: &Value) -> String {
    if status == 429 {
        return format!("{stage} is limiting sign-in attempts right now. Wait a minute, then try again. [RATE_LIMITED]");
    }
    match stage {
        "XSTS" => xsts_message(body).into(),
        "Microsoft" => {
            let desc = body["error_description"].as_str().unwrap_or("");
            match body["error"].as_str().unwrap_or("") {
                "invalid_grant" if desc.contains("AADSTS70000") || desc.contains("AADSTS54005") =>
                    "That sign-in link was already used or timed out. Start sign-in again. [MICROSOFT_CODE_EXPIRED]".into(),
                "invalid_grant" => "Your Microsoft session expired or was signed out elsewhere. Sign in again. [MICROSOFT_SESSION_EXPIRED]".into(),
                "interaction_required" | "consent_required" => "Microsoft needs you to approve LOAM again. Sign in again. [MICROSOFT_CONSENT]".into(),
                "unauthorized_client" | "invalid_client" | "invalid_request" =>
                    "Microsoft rejected LOAM's app registration for this request. Update LOAM; if it keeps happening, report it from Help. [MICROSOFT_APP_REJECTED]".into(),
                _ => format!("Microsoft sign-in returned HTTP {status}. Sign in again; if it keeps happening, report it from Help. [MICROSOFT_TOKEN_REJECTED]"),
            }
        }
        "Minecraft" if matches!(status, 401 | 403) => {
            let msg = body["errorMessage"].as_str().or(body["error"].as_str()).unwrap_or("");
            if msg.to_ascii_lowercase().contains("app registration") {
                "Minecraft's login service hasn't approved this LOAM build yet. Update LOAM to the latest version. [MINECRAFT_APP_NOT_APPROVED]".into()
            } else {
                format!("Microsoft and Xbox accepted your account, but Minecraft's login service refused it (HTTP {status}). Wait a few minutes and sign in again; if it keeps happening, report it from Help. [MINECRAFT_LOGIN_REJECTED]")
            }
        }
        _ => format!("{stage} service returned HTTP {status}. Check your connection and try again later."),
    }
}
/// Xbox (XSTS) refusals come with an `XErr` code; each has one specific fix.
fn xsts_message(body: &Value) -> &'static str {
    let code = body["XErr"].as_u64().or_else(|| body["XErr"].as_str().and_then(|s| s.parse().ok())).unwrap_or(0);
    match code {
        2148916227 => "This account is banned from Xbox services, so it can't sign in to Minecraft. [XSTS_BANNED]",
        2148916229 => "Online play is turned off for this account in Microsoft Family settings. A parent can allow it at account.microsoft.com/family. [XSTS_FAMILY_BLOCKED]",
        2148916233 => "This Microsoft account has no Xbox profile yet. Sign in once at xbox.com to create one (it's free), then try again. [XSTS_NO_XBOX_PROFILE]",
        2148916234 => "Xbox needs you to accept its terms first. Sign in once at xbox.com, then try again. [XSTS_TERMS]",
        2148916235 => "Xbox Live isn't available in this account's country or region. [XSTS_REGION]",
        2148916236 | 2148916237 => "This account needs adult verification on the Xbox page. Complete it at xbox.com, then sign in again. [XSTS_ADULT_VERIFICATION]",
        2148916238 => "This is a child account. An adult must add it to a Microsoft family at account.microsoft.com/family before it can play. [XSTS_CHILD_ACCOUNT]",
        _ => "Xbox authorization was declined. Check your Xbox profile, region and Microsoft family settings. [XSTS_REJECTED]",
    }
}
/// How Java access is confirmed. A store entitlement is the usual proof; Xbox Game Pass accounts can
/// show an empty store list, so a live Java profile (what the game itself checks) also counts.
fn java_access(ent: &Value, profile_found: bool) -> Result<&'static str> {
    let names: Vec<&str> = ent["items"].as_array().map(|v| v.iter().filter_map(|i| i["name"].as_str()).collect()).unwrap_or_default();
    let owns = names.iter().any(|n| matches!(*n, "game_minecraft" | "product_minecraft"));
    let pass = names.iter().any(|n| n.contains("game_pass"));
    match (profile_found, owns, pass) {
        (true, true, _) => Ok("Java Edition"),
        (true, false, true) => Ok("Xbox Game Pass"),
        (true, false, false) => Ok("Java profile"),
        (false, true, _) | (false, false, true) => Err("Minecraft access was found, but no Java profile exists. Set up your Java username at minecraft.net (or open the official launcher once), then sign in again. [JAVA_PROFILE_MISSING]".into()),
        (false, false, false) => Err("Minecraft Java Edition wasn't found on this account. Use the Microsoft account that owns Java Edition or has Xbox Game Pass. [MINECRAFT_ACCESS_MISSING]".into()),
    }
}
/// Cape names from a Minecraft profile, the active one first.
fn profile_capes(profile: &Value) -> Vec<String> {
    let mut capes: Vec<(bool, String)> = profile["capes"].as_array().map(|v| v.iter().filter_map(|c| {
        c["alias"].as_str().map(|a| (c["state"] == "ACTIVE", a.replace('_', " ")))
    }).collect()).unwrap_or_default();
    capes.sort_by_key(|(active, _)| !*active);
    capes.into_iter().map(|(_, a)| a).take(32).collect()
}
fn parse_callback(target: &str, state: &str) -> Result<Option<String>> {
    if !target.starts_with("/?") || target.len() > 8192 { return Err("Invalid callback path.".into()); }
    let url = url::Url::parse(&format!("http://localhost{target}")).map_err(|_| "Invalid callback.")?;
    let mut q = std::collections::HashMap::new();
    for (key, value) in url.query_pairs() {
        if q.insert(key.into_owned(), value.into_owned()).is_some() { return Err("Duplicate callback parameter.".into()); }
    }
    if q.get("state").map(String::as_str) != Some(state) { return Err("Invalid sign-in state.".into()); }
    if q.get("error").map(String::as_str) == Some("access_denied") { return Ok(None); }
    if q.contains_key("error") { return Err("Microsoft did not authorize this request.".into()); }
    q.get("code").filter(|c| !c.is_empty()).cloned().map(Some).ok_or("Authorization code missing.".into())
}
fn exchange(core: &Core, ms_token: &str) -> Result<(Value, String, &'static str)> {
    core.cancelled()?;
    core.step("", "authenticating", "Connecting to Xbox");
    let c = client()?;
    let x=checked(c.post("https://user.auth.xboxlive.com/user/authenticate").json(&json!({"Properties":{"AuthMethod":"RPS","SiteName":"user.auth.xboxlive.com","RpsTicket":format!("d={ms_token}")},"RelyingParty":"http://auth.xboxlive.com","TokenType":"JWT"})).send().map_err(|_|"Xbox service is unavailable.")?,"Xbox")?;
    let xt = x["Token"].as_str().ok_or("Xbox token missing")?;
    let xs=checked(c.post("https://xsts.auth.xboxlive.com/xsts/authorize").json(&json!({"Properties":{"SandboxId":"RETAIL","UserTokens":[xt]},"RelyingParty":"rp://api.minecraftservices.com/","TokenType":"JWT"})).send().map_err(|_|"Xbox authorization service is unavailable.")?,"XSTS")?;
    let uhs = xs["DisplayClaims"]["xui"][0]["uhs"]
        .as_str()
        .ok_or("Xbox profile missing. Create a profile at xbox.com and try again.")?;
    let t = xs["Token"]
        .as_str()
        .ok_or("Xbox authorization token missing")?;
    core.cancelled()?;
    core.step("", "authenticating", "Checking Minecraft access");
    let mc = checked(
        c.post("https://api.minecraftservices.com/authentication/login_with_xbox")
            .json(&json!({"identityToken":format!("XBL3.0 x={uhs};{t}")}))
            .send()
            .map_err(|_| "Minecraft sign-in service is unavailable.")?,
        "Minecraft",
    )?;
    let token = mc["access_token"]
        .as_str()
        .ok_or("Minecraft token missing")?
        .to_string();
    core.cancelled()?;
    // The store list is advisory (it can be empty for Game Pass); the profile decides.
    let ent = c.get("https://api.minecraftservices.com/entitlements/mcstore")
        .bearer_auth(&token).send().ok().and_then(|r| checked(r, "Entitlements").ok()).unwrap_or(Value::Null);
    let profile_resp = c.get("https://api.minecraftservices.com/minecraft/profile")
        .bearer_auth(&token).send().map_err(|_| "Could not fetch Minecraft profile.")?;
    if profile_resp.status() == reqwest::StatusCode::NOT_FOUND {
        java_access(&ent, false)?;
    }
    let profile = checked(profile_resp, "Profile")?;
    let access = java_access(&ent, true)?;
    // Best effort: keep the profile skin locally so the head renders instantly next start.
    let _ = crate::skins::cache_account_skin(core, &profile);
    core.cancelled()?;
    Ok((profile, token, access))
}
/// Static callback page in LOAM colours. No scripts and no external resources.
fn callback_page(title: &str, body: &str) -> String {
    format!("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>LOAM</title><style>body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4F3EE;color:#171715;font:16px/1.5 system-ui,'Segoe UI',sans-serif}}main{{max-width:28rem;padding:2rem}}b{{display:block;letter-spacing:.3em;font-size:.8rem;color:#C15F3C;margin-bottom:1.5rem}}h1{{font-weight:500;font-size:2rem;margin:0 0 .5rem}}p{{color:#5f5c55;margin:0}}</style><main><b>LOAM</b><h1>{title}</h1><p>{body}</p></main></html>")
}
/// Brings LOAM back to the front after the browser step so sign-in feels like one flow.
fn focus_main(core: &Core) {
    use tauri::Manager;
    if let Some(w) = core.app.as_ref().and_then(|a| a.get_webview_window("main")) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}
pub fn sign_in(core: &Core) -> Result<Option<Account>> {
    let client_id = config()["microsoftClientId"]
        .as_str()
        .unwrap_or("")
        .to_string();
    if client_id.is_empty() {
        return Err("Microsoft sign-in isn't configured in this build. You can use an Offline Profile meanwhile.".into());
    }
    core.step("", "authenticating", "Opening browser");
    let listener = TcpListener::bind("127.0.0.1:8400").or_else(|_| TcpListener::bind("127.0.0.1:0"))
        .map_err(|_| "Could not create the secure sign-in callback.")?;
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let redirect = format!(
        "http://localhost:{}/",
        listener.local_addr().map_err(|e| e.to_string())?.port()
    );
    let state = uuid::Uuid::new_v4().simple().to_string();
    let verifier = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let mut url =
        url::Url::parse("https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize")
            .unwrap();
    url.query_pairs_mut().extend_pairs([
        ("client_id", client_id.as_str()),
        ("response_type", "code"),
        ("redirect_uri", &redirect),
        ("response_mode", "query"),
        ("scope", "XboxLive.signin offline_access"),
        ("state", &state),
        ("code_challenge", &challenge),
        ("code_challenge_method", "S256"),
        ("prompt", "select_account"),
    ]);
    use tauri_plugin_opener::OpenerExt;
    core.app
        .as_ref()
        .ok_or("No desktop browser available")?
        .opener()
        .open_url(url.as_str(), None::<&str>)
        .map_err(|_| "Could not open your browser.")?;
    core.step("", "authenticating", "Waiting for Microsoft sign-in");
    let started = Instant::now();
    let code = loop {
        if core.cancelled().is_err() {
            return Ok(None);
        }
        if started.elapsed() > Duration::from_secs(300) {
            return Err("Sign-in timed out. Try again.".into());
        }
        match listener.accept() {
            Ok((mut socket, _)) => {
                socket
                    .set_read_timeout(Some(Duration::from_secs(2)))
                    .map_err(|e| e.to_string())?;
                let _ = socket.set_write_timeout(Some(Duration::from_secs(2)));
                let callback_started = Instant::now();
                let mut bytes = Vec::new();
                let mut chunk = [0; 1024];
                while bytes.len() < 8192 && callback_started.elapsed() < Duration::from_secs(2) && !bytes.windows(4).any(|w| w == b"\r\n\r\n") {
                    core.cancelled()?;
                    match socket.read(&mut chunk) {
                        Ok(0) | Err(_) => break,
                        Ok(n) => bytes.extend_from_slice(&chunk[..n]),
                    }
                }
                let raw = String::from_utf8_lossy(&bytes);
                let request = raw.lines().next().unwrap_or("");
                let mut parts = request.split_whitespace();
                if parts.next() != Some("GET") { continue; }
                let target = parts.next().unwrap_or("");
                let outcome = parse_callback(target, &state);
                let (status, body) = match &outcome {
                    Ok(Some(_)) => ("200 OK", callback_page("You're signed in.", "LOAM is checking your Minecraft profile. You can close this tab.")),
                    Ok(None) => ("200 OK", callback_page("Sign-in cancelled.", "Nothing was changed. You can close this tab.")),
                    Err(_) => ("400 Bad Request", callback_page("This sign-in link wasn't accepted.", "Return to LOAM and choose Sign in with Microsoft again.")),
                };
                let response = format!("HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Security-Policy: default-src 'none'; style-src 'unsafe-inline'\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{body}", body.len());
                let _ = socket.write_all(response.as_bytes());
                match outcome {
                    Ok(Some(code)) => break code,
                    Ok(None) => return Ok(None),
                    Err(e) if e == "Microsoft did not authorize this request." => return Err(e),
                    Err(_) => continue,
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(100))
            }
            Err(_) => return Err("Sign-in callback failed.".into()),
        }
    };
    drop(listener);
    focus_main(core);
    core.cancelled()?;
    let ms = checked(
        client()?
            .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
            .form(&[
                ("client_id", client_id.as_str()),
                ("grant_type", "authorization_code"),
                ("code", &code),
                ("redirect_uri", &redirect),
                ("code_verifier", &verifier),
            ])
            .send()
            .map_err(|_| "Microsoft token service is unavailable.")?,
        "Microsoft",
    )?;
    let (profile, _, access) = exchange(
        core,
        ms["access_token"]
            .as_str()
            .ok_or("Microsoft token missing")?,
    )?;
    let uuid = profile["id"]
        .as_str()
        .ok_or("Profile ID missing")?
        .to_string();
    uuid::Uuid::parse_str(&uuid).map_err(|_| "Invalid profile ID")?;
    let a = Account {
        id: uuid.clone(),
        uuid,
        name: profile["name"]
            .as_str()
            .ok_or("Profile name missing")?
            .into(),
        kind: "microsoft".into(),
        verified: Some(chrono::Utc::now().to_rfc3339()),
        access: Some(access.into()),
        capes: profile_capes(&profile),
    };
    core.cancelled()?;
    let refresh = ms["refresh_token"]
        .as_str()
        .ok_or("No refresh token received")?;
    keyring::Entry::new("LOAM", &a.id)
        .map_err(|_| "Credential Manager is unavailable.")?
        .set_password(refresh)
        .map_err(|_| "Could not securely save this session.")?;
    {
        let mut d = core.data.lock().unwrap();
        d.accounts.retain(|x| x.id != a.id);
        d.accounts.push(a.clone());
        d.selected_account = Some(a.id.clone());
    }
    core.save()?;
    Ok(Some(a))
}
pub fn launch_token(core: &Core, a: &Account) -> Result<String> {
    if a.kind == "offline" {
        return Ok("0".into());
    }
    if a.kind != "microsoft" { return Err("Unsupported account type.".into()); }
    let entry = keyring::Entry::new("LOAM", &a.id).map_err(|_| "Credential Manager unavailable")?;
    let refresh = entry
        .get_password()
        .map_err(|_| "Authentication expired. Sign in again.")?;
    let id = config()["microsoftClientId"]
        .as_str()
        .unwrap_or("")
        .to_string();
    let ms=checked(client()?.post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token").form(&[("client_id",id.as_str()),("grant_type","refresh_token"),("refresh_token",&refresh),("scope","XboxLive.signin offline_access")]).send().map_err(|_|"Cannot refresh while offline. Connect and sign in again, or explicitly choose an Offline Profile.")?,"Microsoft")?;
    if let Some(r) = ms["refresh_token"].as_str() {
        entry
            .set_password(r)
            .map_err(|_| "Could not securely refresh this session")?
    }
    let (p, t, access) = exchange(
        core,
        ms["access_token"]
            .as_str()
            .ok_or("Authentication expired. Sign in again.")?,
    )?;
    if p["id"] != a.uuid {
        return Err("Account identity changed. Sign in again.".into());
    }
    {
        let mut d = core.data.lock().unwrap();
        if let Some(acc) = d.accounts.iter_mut().find(|x| x.id == a.id) {
            acc.verified = Some(chrono::Utc::now().to_rfc3339());
            acc.access = Some(access.into());
            acc.capes = profile_capes(&p);
            if let Some(name) = p["name"].as_str() {
                acc.name = name.to_owned();
            }
        }
    }
    let _ = core.save();
    Ok(t)
}
pub fn remove(core: &Core, id: &str) -> Result<()> {
    let a = core
        .data
        .lock()
        .unwrap()
        .accounts
        .iter()
        .find(|a| a.id == id)
        .cloned()
        .ok_or("Account not found")?;
    if a.kind == "microsoft" {
        let entry =
            keyring::Entry::new("LOAM", id).map_err(|_| "Credential Manager unavailable")?;
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => {}
            Err(_) => return Err("Could not delete the saved session. Please retry.".into()),
        }
    }
    {
        let mut d = core.data.lock().unwrap();
        d.accounts.retain(|a| a.id != id);
        if d.selected_account.as_deref() == Some(id) {
            d.selected_account = None
        }
    }
    core.save()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn callback_rejects_mismatched_state_duplicates_and_wrong_paths() {
        assert!(parse_callback("/?code=test&state=wrong", "expected").is_err());
        assert!(parse_callback("/?code=test&state=expected&state=expected", "expected").is_err());
        assert!(parse_callback("/other?code=test&state=expected", "expected").is_err());
        assert!(parse_callback("/?state=expected", "expected").is_err());
        assert_eq!(parse_callback("/?code=test&state=expected", "expected").unwrap(), Some("test".into()));
    }
    #[test]
    fn callback_cancel_and_entitlement_checks() {
        assert_eq!(parse_callback("/?error=access_denied&state=s", "s").unwrap(), None);
        assert!(parse_callback("/?error=access_denied&state=wrong", "s").is_err());
        assert!(java_access(&json!({"items":[]}), false).unwrap_err().contains("MINECRAFT_ACCESS_MISSING"));
        assert!(java_access(&json!({"items":[{"name":"unrelated"}]}), false).is_err());
        assert!(java_access(&json!({"items":[{"name":"game_minecraft"}]}), false).unwrap_err().contains("JAVA_PROFILE_MISSING"));
        assert_eq!(java_access(&json!({"items":[{"name":"product_minecraft"},{"name":"game_minecraft"}]}), true).unwrap(), "Java Edition");
        assert_eq!(java_access(&json!({"items":[{"name":"product_game_pass_pc"}]}), true).unwrap(), "Xbox Game Pass");
        // Game Pass accounts can have an empty store list; a live Java profile is enough.
        assert_eq!(java_access(&json!({"items":[]}), true).unwrap(), "Java profile");
        assert_eq!(java_access(&Value::Null, true).unwrap(), "Java profile");
    }
    /// Error bodies recorded from Microsoft, Xbox and Minecraft services.
    #[test]
    fn sign_in_failures_explain_the_fix() {
        let xsts = |code: u64| failure("XSTS", 401, &json!({"Identity":"0","XErr":code,"Message":"","Redirect":"https://start.ui.xboxlive.com/AddChildToFamily"}));
        assert!(xsts(2148916233).contains("XSTS_NO_XBOX_PROFILE"));
        assert!(xsts(2148916235).contains("XSTS_REGION"));
        assert!(xsts(2148916236).contains("XSTS_ADULT_VERIFICATION"));
        assert!(xsts(2148916237).contains("XSTS_ADULT_VERIFICATION"));
        assert!(xsts(2148916238).contains("XSTS_CHILD_ACCOUNT"));
        assert!(xsts(2148916227).contains("XSTS_BANNED"));
        assert!(xsts(1).contains("XSTS_REJECTED"));
        assert!(failure("XSTS", 401, &json!({"XErr":"2148916233"})).contains("XSTS_NO_XBOX_PROFILE"));
        assert!(failure("XSTS", 401, &Value::Null).contains("XSTS_REJECTED"));
        let ms = |e: &str, d: &str| failure("Microsoft", 400, &json!({"error": e, "error_description": d}));
        assert!(ms("invalid_grant", "AADSTS70000: The provided value for the 'code' parameter is not valid.").contains("MICROSOFT_CODE_EXPIRED"));
        assert!(ms("invalid_grant", "AADSTS700082: The refresh token has expired due to inactivity.").contains("MICROSOFT_SESSION_EXPIRED"));
        assert!(ms("unauthorized_client", "AADSTS700016: Application not found").contains("MICROSOFT_APP_REJECTED"));
        assert!(ms("interaction_required", "").contains("MICROSOFT_CONSENT"));
        assert!(failure("Minecraft", 403, &json!({"path":"/authentication/login_with_xbox","errorMessage":"Invalid app registration, see https://aka.ms/AppRegInfo for more information"})).contains("MINECRAFT_APP_NOT_APPROVED"));
        assert!(failure("Minecraft", 401, &json!({})).contains("MINECRAFT_LOGIN_REJECTED"));
        assert!(failure("Minecraft", 429, &Value::Null).contains("RATE_LIMITED"));
        assert!(failure("Profile", 500, &Value::Null).contains("HTTP 500"));
    }
    #[test]
    fn capes_sync_with_active_first() {
        let p = json!({"id":"x","name":"Steve","capes":[
            {"id":"1","state":"INACTIVE","alias":"Migrator"},
            {"id":"2","state":"ACTIVE","alias":"Pan"},
            {"id":"3","state":"INACTIVE","alias":"Common_Cape"}]});
        assert_eq!(profile_capes(&p), vec!["Pan", "Migrator", "Common Cape"]);
        assert!(profile_capes(&json!({"id":"x"})).is_empty());
    }
    #[test]
    fn vanilla_offline_id() {
        assert_eq!(
            offline_uuid("Notch"),
            "b50ad385-829d-3141-a216-7e7d7539ba7f"
        );
    }
    #[test]
    fn capabilities_are_honest() {
        assert_eq!(capabilities("offline")["ownership"], false);
        assert_eq!(capabilities("offline")["realms"], false);
    }
}
