//! Servers: a short list of popular public Java servers plus the player's own, each pinged with
//! Minecraft's Server List Ping (status only; no login) for icon, message, players, version and
//! latency. Joining launches the selected game straight into the server.
use crate::{model::*, storage};
use serde_json::{json, Value};
use std::{
    io::{Read, Write},
    net::{TcpStream, ToSocketAddrs},
    time::{Duration, Instant},
};

/// Popular public servers, listed for convenience. Not run by, affiliated with or endorsed by LOAM.
const FEATURED: &[(&str, &str, &str, &[&str])] = &[
    ("Hypixel", "mc.hypixel.net", "The biggest minigame network: SkyBlock, Bed Wars, SkyWars and more.", &["Minigames", "SkyBlock"]),
    ("CubeCraft", "play.cubecraft.net", "Minigames like EggWars, SkyWars and Parkour.", &["Minigames"]),
    ("Wynncraft", "play.wynncraft.com", "A full MMORPG with quests, classes and dungeons.", &["RPG"]),
    ("MCC Island", "play.mccisland.net", "Games from the team behind Minecraft Championship.", &["Minigames", "Events"]),
    ("ManaCube", "play.manacube.com", "Skyblock, Parkour, Survival and more.", &["Skyblock", "Parkour"]),
    ("Minehut", "minehut.com", "Thousands of community-run servers, one address.", &["Community"]),
    ("Origin Realms", "play.originrealms.com", "Survival with custom creatures, items and worlds.", &["Survival", "Custom"]),
    ("PikaNetwork", "play.pika-network.net", "Survival, Skyblock, Bed Wars and Practice.", &["Survival", "PvP"]),
];

fn store(core: &Core) -> std::path::PathBuf {
    core.root.join("servers.json")
}

fn custom(core: &Core) -> Vec<Value> {
    std::fs::read(store(core)).ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok())
        .and_then(|v| v["servers"].as_array().cloned()).unwrap_or_default()
}

/// "host" or "host:port" with a plain DNS name or IPv4 address.
pub fn parse_address(raw: &str) -> Result<(String, u16)> {
    let raw = raw.trim();
    let (host, port) = match raw.rsplit_once(':') {
        Some((h, p)) => (h, p.parse::<u16>().map_err(|_| "The port must be a number from 1 to 65535.")?),
        None => (raw, 25565),
    };
    let ok = !host.is_empty() && host.len() <= 253 && port != 0
        && host.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
        && !host.starts_with(['.', '-']) && !host.ends_with(['.', '-']);
    if !ok {
        return Err("Enter a server address like play.example.net or play.example.net:25565.".into());
    }
    Ok((host.to_ascii_lowercase(), port))
}

pub fn list(core: &Core) -> Result<Value> {
    let featured: Vec<Value> = FEATURED.iter().map(|(name, address, about, tags)| json!({
        "name": name, "address": address, "about": about, "tags": tags, "featured": true,
    })).collect();
    Ok(json!({"featured": featured, "custom": custom(core)}))
}

pub fn add(core: &Core, name: &str, address: &str) -> Result<Value> {
    let (host, port) = parse_address(address)?;
    let address = if port == 25565 { host } else { format!("{host}:{port}") };
    let name: String = name.trim().chars().take(40).collect();
    let mut list = custom(core);
    if list.iter().any(|s| s["address"] == address.as_str()) {
        return Err("That server is already in your list.".into());
    }
    if list.len() >= 50 {
        return Err("Your list holds up to 50 servers.".into());
    }
    list.push(json!({"name": if name.is_empty() { address.clone() } else { name }, "address": address, "added": chrono::Utc::now().to_rfc3339()}));
    storage::write_json(&store(core), &json!({"schema": 1, "servers": list}))?;
    list_out(core)
}

pub fn remove(core: &Core, address: &str) -> Result<Value> {
    let list: Vec<Value> = custom(core).into_iter().filter(|s| s["address"] != address).collect();
    storage::write_json(&store(core), &json!({"schema": 1, "servers": list}))?;
    list_out(core)
}

fn list_out(core: &Core) -> Result<Value> {
    list(core)
}

fn write_varint(out: &mut Vec<u8>, mut v: u32) {
    loop {
        if v & !0x7f == 0 {
            out.push(v as u8);
            return;
        }
        out.push((v as u8 & 0x7f) | 0x80);
        v >>= 7;
    }
}

fn read_varint(r: &mut impl Read) -> Result<u32> {
    let mut value = 0u32;
    for i in 0..5 {
        let mut b = [0u8];
        r.read_exact(&mut b).map_err(|_| "The server closed the connection.")?;
        value |= ((b[0] & 0x7f) as u32) << (7 * i);
        if b[0] & 0x80 == 0 {
            return Ok(value);
        }
    }
    Err("The server sent an invalid reply.".into())
}

/// The `_minecraft._tcp` SRV record many servers publish (as Minecraft itself checks first).
#[cfg(windows)]
fn srv(host: &str) -> Option<(String, u16)> {
    use std::{ffi::c_void, os::windows::ffi::OsStrExt};
    #[repr(C)]
    struct Record { next: *mut Record, name: *mut u16, kind: u16, len: u16, flags: u32, ttl: u32, reserved: u32, target: *mut u16, priority: u16, weight: u16, port: u16, pad: u16 }
    #[link(name = "dnsapi")]
    extern "system" {
        fn DnsQuery_W(name: *const u16, kind: u16, options: u32, extra: *mut c_void, results: *mut *mut Record, reserved: *mut c_void) -> i32;
        fn DnsRecordListFree(list: *mut Record, free_type: u32);
    }
    let q: Vec<u16> = std::ffi::OsStr::new(&format!("_minecraft._tcp.{host}")).encode_wide().chain(Some(0)).collect();
    let mut list: *mut Record = std::ptr::null_mut();
    // DNS_TYPE_SRV = 33, DNS_QUERY_STANDARD = 0.
    if unsafe { DnsQuery_W(q.as_ptr(), 33, 0, std::ptr::null_mut(), &mut list, std::ptr::null_mut()) } != 0 || list.is_null() {
        return None;
    }
    let mut out = None;
    let mut cur = list;
    while !cur.is_null() {
        let r = unsafe { &*cur };
        if r.kind == 33 && !r.target.is_null() {
            let len = (0..).take_while(|&i| unsafe { *r.target.add(i) } != 0).count();
            let target = String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(r.target, len) });
            out = Some((target.trim_end_matches('.').to_ascii_lowercase(), r.port));
            break;
        }
        cur = r.next;
    }
    unsafe { DnsRecordListFree(list, 1) };
    out
}
#[cfg(not(windows))]
fn srv(_host: &str) -> Option<(String, u16)> { None }

/// Server List Ping (Java 1.7+): handshake, status request, JSON reply; latency is the round trip
/// of the status exchange. Never logs in and never sends account data.
pub fn ping(address: &str) -> Result<Value> {
    let (host, port) = parse_address(address)?;
    let (host, port) = if address.contains(':') { (host, port) } else { srv(&host).unwrap_or((host, port)) };
    let addr = (host.as_str(), port).to_socket_addrs().map_err(|_| "Couldn't find that server.")?
        .next().ok_or("Couldn't find that server.")?;
    let start = Instant::now();
    let mut s = TcpStream::connect_timeout(&addr, Duration::from_secs(4)).map_err(|_| "The server didn't answer.")?;
    s.set_read_timeout(Some(Duration::from_secs(4))).ok();
    s.set_write_timeout(Some(Duration::from_secs(4))).ok();
    let mut body = vec![0x00];
    write_varint(&mut body, 767); // any modern protocol works for a status request
    write_varint(&mut body, host.len() as u32);
    body.extend_from_slice(host.as_bytes());
    body.extend_from_slice(&port.to_be_bytes());
    write_varint(&mut body, 1); // next state: status
    let mut packet = vec![];
    write_varint(&mut packet, body.len() as u32);
    packet.extend(body);
    packet.extend([0x01, 0x00]); // status request
    s.write_all(&packet).map_err(|_| "The server didn't answer.")?;
    let len = read_varint(&mut s)? as usize;
    if !(1..=2 * 1024 * 1024).contains(&len) {
        return Err("The server sent an invalid reply.".into());
    }
    let mut buf = vec![0u8; len];
    s.read_exact(&mut buf).map_err(|_| "The server closed the connection.")?;
    let latency = start.elapsed().as_millis() as u64;
    let mut cur = std::io::Cursor::new(buf);
    if read_varint(&mut cur)? != 0 {
        return Err("The server sent an invalid reply.".into());
    }
    let n = read_varint(&mut cur)? as usize;
    let pos = cur.position() as usize;
    let raw = cur.into_inner();
    let text = raw.get(pos..pos + n).ok_or("The server sent an invalid reply.")?;
    let v: Value = serde_json::from_slice(text).map_err(|_| "The server sent an invalid reply.")?;
    let favicon = v["favicon"].as_str().filter(|f| f.starts_with("data:image/png;base64,") && f.len() < 200_000);
    Ok(json!({
        "online": true,
        "players": v["players"]["online"], "max": v["players"]["max"],
        "version": v["version"]["name"], "protocol": v["version"]["protocol"],
        "motd": motd_text(&v["description"]),
        "favicon": favicon, "latency": latency,
    }))
}

/// Plain text of a message of the day (string or chat component), without § formatting codes.
fn motd_text(d: &Value) -> String {
    fn walk(v: &Value, out: &mut String) {
        match v {
            Value::String(s) => out.push_str(s),
            Value::Object(o) => {
                if let Some(t) = o.get("text") { walk(t, out) }
                if let Some(Value::Array(extra)) = o.get("extra") { for e in extra { walk(e, out) } }
            }
            Value::Array(a) => for e in a { walk(e, out) },
            _ => {}
        }
    }
    let mut s = String::new();
    walk(d, &mut s);
    let mut clean = String::new();
    let mut skip = false;
    for c in s.chars() {
        if skip { skip = false; continue; }
        if c == '§' { skip = true; continue; }
        clean.push(c);
    }
    clean.lines().map(str::trim).filter(|l| !l.is_empty()).take(2).collect::<Vec<_>>().join("\n").chars().take(160).collect()
}

/// Pings many servers at once (each on its own thread, 4 s timeout each).
pub fn ping_all(addresses: &[String]) -> Value {
    let handles: Vec<_> = addresses.iter().take(60).cloned().map(|a| std::thread::spawn(move || {
        let r = ping(&a).unwrap_or_else(|e| json!({"online": false, "error": e}));
        (a, r)
    })).collect();
    let mut out = serde_json::Map::new();
    for h in handles {
        if let Ok((a, r)) = h.join() {
            out.insert(a, r);
        }
    }
    Value::Object(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn addresses() {
        assert_eq!(parse_address("Play.Example.net").unwrap(), ("play.example.net".into(), 25565));
        assert_eq!(parse_address("mc.example.net:25570").unwrap().1, 25570);
        assert!(parse_address("http://x").is_err());
        assert!(parse_address("a b").is_err());
        assert!(parse_address("x:0").is_err());
        assert!(parse_address("x:99999").is_err());
    }
    #[test]
    fn varints_roundtrip() {
        for v in [0u32, 1, 127, 128, 255, 25565, 767, 2_097_151] {
            let mut b = vec![];
            write_varint(&mut b, v);
            assert_eq!(read_varint(&mut std::io::Cursor::new(b)).unwrap(), v);
        }
    }
    #[test]
    fn motd_strips_formatting() {
        let d = json!({"text":"","extra":[{"text":"§aHypixel Network "},{"text":"[1.8-1.21]\n§bSKYBLOCK"}]});
        assert_eq!(motd_text(&d), "Hypixel Network [1.8-1.21]\nSKYBLOCK");
    }
    #[test]
    fn ping_against_a_local_fake_server() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        std::thread::spawn(move || {
            let (mut s, _) = listener.accept().unwrap();
            let len = read_varint(&mut s).unwrap() as usize;
            let mut skip = vec![0u8; len + 2];
            s.read_exact(&mut skip).unwrap();
            let json = br#"{"version":{"name":"1.21.4","protocol":769},"players":{"max":100,"online":7},"description":"Hello"}"#;
            let mut body = vec![0x00];
            write_varint(&mut body, json.len() as u32);
            body.extend_from_slice(json);
            let mut out = vec![];
            write_varint(&mut out, body.len() as u32);
            out.extend(body);
            s.write_all(&out).unwrap();
        });
        let r = ping(&format!("127.0.0.1:{port}")).unwrap();
        assert_eq!(r["players"], 7);
        assert_eq!(r["version"], "1.21.4");
        assert_eq!(r["motd"], "Hello");
    }
}
