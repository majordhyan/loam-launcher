//! Live check of the server browser: pings every featured server.
//! Usage: cargo run --example qa_servers
fn main() {
    let addrs: Vec<String> = ["mc.hypixel.net", "play.cubecraft.net", "play.wynncraft.com", "play.mccisland.net", "play.manacube.com", "minehut.com", "play.originrealms.com", "play.pika-network.net"]
        .iter().map(|s| s.to_string()).collect();
    let r = loam_core::servers::ping_all(&addrs);
    let mut online = 0;
    for a in &addrs {
        let v = &r[a.as_str()];
        if v["online"] == true {
            online += 1;
            println!("  ONLINE  {a:<24} {:>6} players  {:>4} ms  {}  icon:{}", v["players"], v["latency"], v["version"], v["favicon"].is_string());
        } else {
            println!("  DOWN    {a:<24} {}", v["error"]);
        }
    }
    println!("{online}/{} featured servers answered", addrs.len());
}
