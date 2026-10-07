//! Live check of the Minecraft news feed: fetches Mojang's official feeds and prints the merge.
fn main() {
    let news = loam_core::network::json("https://launchercontent.mojang.com/v2/news.json").expect("news feed");
    let notes = loam_core::network::json("https://launchercontent.mojang.com/v2/javaPatchNotes.json").expect("patch notes");
    let items = loam_core::news::merge(&news, &notes, 24);
    let list = items.as_array().unwrap();
    for i in list.iter().take(10) {
        println!("{:10} {:9} {}  img:{}", &i["date"].as_str().unwrap_or("")[..10.min(i["date"].as_str().unwrap_or("").len())], i["kind"].as_str().unwrap_or(""), i["title"].as_str().unwrap_or(""), i["image"].is_string());
    }
    let kinds = |k: &str| list.iter().filter(|i| i["kind"] == k).count();
    println!("{} items: {} news, {} releases, {} snapshots", list.len(), kinds("news"), kinds("release"), kinds("snapshot"));
    assert!(list.len() >= 10 && kinds("news") > 0 && kinds("snapshot") + kinds("release") > 0, "feed looks wrong");
    let first_note = list.iter().find(|i| i["contentPath"].is_string()).unwrap();
    let body = loam_core::network::json(&format!("https://launchercontent.mojang.com/v2/{}", first_note["contentPath"].as_str().unwrap())).expect("patch body");
    println!("patch notes for {}: {} characters of body", first_note["title"], body["body"].as_str().unwrap_or("").len());
    println!("News QA passed.");
}
