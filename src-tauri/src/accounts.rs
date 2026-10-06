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
    let status = r.status();
    if !status.is_success() {
        return Err(if stage == "Minecraft" && matches!(status.as_u16(), 401 | 403) {
            format!("Microsoft and Xbox completed, but Minecraft rejected this app/session (HTTP {}). App-ID review may be required; approval is not confirmed. See docs/microsoft-setup.md. [MINECRAFT_LOGIN_REJECTED]", status.as_u16())
        } else if stage == "XSTS" {
            "Xbox authorization was declined. Check your Xbox profile, region and Microsoft family settings. [XSTS_REJECTED]".into()
        } else if stage == "Microsoft" && status.as_u16() == 400 {
            "Microsoft consent or session expired, or app configuration was rejected. Sign in again; check the desktop redirect if this persists. [MICROSOFT_TOKEN_REJECTED]".into()
        } else { format!("{stage} service returned HTTP {}. Check your connection and try again later.", status.as_u16()) });
    }
    r.json().map_err(|_| format!("Invalid {stage} sign-in response."))
}
fn validate_entitlements(ent: &Value) -> Result<()> {
    if ent["items"].as_array().is_some_and(|items| items.iter().any(|i| matches!(i["name"].as_str(), Some("game_minecraft" | "product_minecraft")))) {
        Ok(())
    } else { Err("Minecraft Java access was not found on this account. Use an account with Java access. [MINECRAFT_ACCESS_MISSING]".into()) }
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
fn exchange(core: &Core, ms_token: &str) -> Result<(Value, String)> {
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
    let ent = checked(c.get("https://api.minecraftservices.com/entitlements/mcstore")
        .bearer_auth(&token).send().map_err(|_| "Could not check Minecraft access. Check your connection and retry.")?, "Entitlements")?;
    validate_entitlements(&ent)?;
    let profile_resp = c.get("https://api.minecraftservices.com/minecraft/profile")
        .bearer_auth(&token).send().map_err(|_| "Could not fetch Minecraft profile.")?;
    if profile_resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err("Minecraft access was found, but no Java profile exists. Set up your Java username at minecraft.net, then sign in again. [JAVA_PROFILE_MISSING]".into());
    }
    let profile = checked(profile_resp, "Profile")?;
    core.cancelled()?;
    Ok((profile, token))
}
pub fn sign_in(core: &Core) -> Result<Option<Account>> {
    let client_id = config()["microsoftClientId"]
        .as_str()
        .unwrap_or("")
        .to_string();
    if client_id.is_empty() {
        return Err("Microsoft sign-in needs an approved public-client app registration. See docs/microsoft-setup.md. You can use an Offline Profile meanwhile.".into());
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
                    Ok(_) => ("200 OK", "Return to LOAM. The launcher will verify Minecraft access. You can close this tab."),
                    Err(_) => ("400 Bad Request", "This callback was not accepted. Return to LOAM and try signing in again."),
                };
                let response = format!("HTTP/1.1 {status}\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nContent-Security-Policy: default-src 'none'\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{body}", body.len());
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
    let (profile, _) = exchange(
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
    let (p, t) = exchange(
        core,
        ms["access_token"]
            .as_str()
            .ok_or("Authentication expired. Sign in again.")?,
    )?;
    if p["id"] != a.uuid {
        return Err("Account identity changed. Sign in again.".into());
    }
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
        assert!(validate_entitlements(&json!({"items":[]})).is_err());
        assert!(validate_entitlements(&json!({"items":[{"name":"unrelated"}]})).is_err());
        assert!(validate_entitlements(&json!({"items":[{"name":"game_minecraft"}]})).is_ok());
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
