//! One-off: pings candidate public servers so only live ones get listed.
fn main() {
    let list: Vec<String> = std::env::args().skip(1).collect();
    let r = loam_core::servers::ping_all(&list);
    for a in &list {
        let s = &r[a.as_str()];
        if s["online"] == true {
            println!("ONLINE  {a:32} {:>6} players  {:>5} ms  {}  icon:{}", s["players"], s["latency"], s["version"], s["favicon"].is_string());
        } else {
            println!("DOWN    {a:32} {}", s["error"]);
        }
    }
}
