use loam_core::{accounts, catalog, diagnostics, imports, model::*, storage};
use serde_json::json;
use std::{
    fs,
    io::{Read, Write},
    sync::{atomic::AtomicBool, Mutex},
};
fn core(root: std::path::PathBuf) -> Core {
    Core {
        root,
        data: Mutex::new(Data::default()),
        progress: Mutex::new(None),
        cancel: AtomicBool::new(false),
        busy: AtomicBool::new(false),
        running: Mutex::new(Default::default()),
        pending: Mutex::new(Default::default()),
        app: None,
    }
}
fn game(c: &Core) -> String {
    let id = uuid::Uuid::new_v4().to_string();
    c.data.lock().unwrap().games.push(Game {
        folder: None,
        id: id.clone(),
        name: "Test world".into(),
        version: "1.16.1".into(),
        loader: None,
        memory: 2048,
        width: None,
        height: None,
        jvm_args: vec![],
        installed: false,
        verified: None,
        created: "2026-09-30".into(),
        ..Default::default()
    });
    c.data.lock().unwrap().selected_game = Some(id.clone());
    fs::create_dir_all(c.game_dir(&id).unwrap()).unwrap();
    id
}
#[test]
fn atomic_state_replacement() {
    let t = tempfile::tempdir().unwrap();
    let p = t.path().join("state.json");
    storage::write_json(&p, &json!({"schema":1,"value":1})).unwrap();
    storage::write_json(&p, &json!({"schema":1,"value":2})).unwrap();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&fs::read(p).unwrap()).unwrap()["value"],
        2
    );
}
#[test]
fn readable_folder_migration_preserves_worlds_and_stable_identity() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().into());
    let id = game(&c);
    let old = c.game_dir(&id).unwrap();
    fs::create_dir_all(old.join("saves/World")).unwrap();
    fs::write(old.join("saves/World/level.dat"), b"world-canary").unwrap();
    loam_core::game_folders::sync(&c, &id).unwrap();
    let new = c.game_dir(&id).unwrap();
    assert!(new.ends_with("Test world - 1.16.1"));
    assert!(!old.exists());
    assert_eq!(fs::read(new.join("saves/World/level.dat")).unwrap(), b"world-canary");
    assert_eq!(c.game(&id).unwrap().id, id);
    loam_core::game_folders::sync(&c, &id).unwrap();
    assert_eq!(new, c.game_dir(&id).unwrap());
    c.data.lock().unwrap().games[0].name = "Renamed".into();
    loam_core::game_folders::sync(&c, &id).unwrap();
    assert_eq!(fs::read(c.game_dir(&id).unwrap().join("saves/World/level.dat")).unwrap(), b"world-canary");
}
#[test]
fn readable_folder_migration_rolls_back_on_state_write_failure() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().into());
    let id = game(&c);
    let old = c.game_dir(&id).unwrap();
    fs::write(old.join("options.txt"), b"canary").unwrap();
    fs::create_dir(t.path().join("state.json")).unwrap();
    assert!(loam_core::game_folders::sync(&c, &id).is_err());
    assert_eq!(old, c.game_dir(&id).unwrap());
    assert_eq!(fs::read(old.join("options.txt")).unwrap(), b"canary");
}
#[test]
fn readable_folders_reject_tampering_and_running_game_rename() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().into());
    let id = game(&c);
    c.running.lock().unwrap().insert(id.clone(), 123);
    assert!(loam_core::game_folders::sync(&c, &id).is_err());
    c.data.lock().unwrap().games[0].folder = Some("../outside".into());
    assert!(c.game_dir(&id).is_err());
}
#[test]
fn skin_studio_saves_locally_but_offline_cannot_change_official_appearance() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().into());
    accounts::add_offline(&c, "SkinTest").unwrap();
    let path = t.path().join("skin.png");
    fs::write(
        &path,
        include_bytes!("../../public/wardrobe/loam-field.png"),
    )
    .unwrap();
    let mut look = loam_core::skins::import_local(path.to_str().unwrap()).unwrap();
    look["cape"] = json!("loam");
    look["untrustedField"] = json!("do not persist");
    let saved = loam_core::skins::save(&c, &look).unwrap();
    assert_eq!(saved, loam_core::skins::saved(&c).unwrap());
    assert!(saved.get("untrustedField").is_none());
    assert_eq!(saved["cape"], true);
    assert!(loam_core::skins::apply(&c, &look)
        .unwrap_err()
        .contains("OFFLINE PROFILE"));
    assert!(loam_core::skins::apply_cape(&c, "invented-cape")
        .unwrap_err()
        .contains("OFFLINE PROFILE"));
}
#[test]
fn migration_switches_only_after_verified_copy() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().join("original"));
    let id = game(&c);
    let dir = c.game_dir(&id).unwrap();
    fs::create_dir_all(dir.join("saves")).unwrap();
    fs::write(dir.join("saves/fixture.dat"), b"world stays safe").unwrap();
    let target = t.path().join("destination");
    let bootstrap = t.path().join("bootstrap");
    loam_core::maintenance::migrate(&c, &target, &bootstrap).unwrap();
    assert_eq!(
        fs::read(target.join("games").join(&id).join("saves/fixture.dat")).unwrap(),
        b"world stays safe"
    );
    assert!(dir.join("saves/fixture.dat").exists());
    assert_eq!(
        loam_core::maintenance::data_root(&bootstrap).unwrap(),
        fs::canonicalize(target).unwrap()
    );
}
#[test]
fn migration_rejects_nested_and_occupied_destination() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().join("original"));
    game(&c);
    let bootstrap = t.path().join("bootstrap");
    assert!(loam_core::maintenance::migrate(&c, &c.root.join("nested"), &bootstrap).is_err());
    let target = t.path().join("occupied");
    fs::create_dir_all(&target).unwrap();
    fs::write(target.join("keep.txt"), b"keep").unwrap();
    assert!(loam_core::maintenance::migrate(&c, &target, &bootstrap).is_err());
    assert!(!bootstrap.join("storage-location.json").exists());
}
#[test]
fn report_export_contains_no_canary() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().into());
    let id = game(&c);
    accounts::add_offline(&c, "CanaryProfile").unwrap();
    let d = c.game_dir(&id).unwrap();
    fs::create_dir_all(d.join("logs")).unwrap();
    fs::write(d.join("logs/loam-latest.log"),"access_token=CANARY_ACCESS refresh_token=CANARY_REFRESH C:\\Users\\CanaryUser\\game canary@example.com CanaryProfile").unwrap();
    fs::write(
        d.join("launch-plan.json"),
        "{\"accessToken\":\"CANARY_LAUNCH\"}",
    )
    .unwrap();
    let input = json!({"happened":"CANARY user canary@example.com","steps":"a".repeat(5000)});
    let preview = diagnostics::report(&c, &input).unwrap();
    assert!(preview["summary"].as_str().unwrap().chars().count() < 1800);
    let p = diagnostics::export(&c, &input).unwrap();
    let mut zip = zip::ZipArchive::new(fs::File::open(p).unwrap()).unwrap();
    for i in 0..zip.len() {
        let mut s = String::new();
        zip.by_index(i).unwrap().read_to_string(&mut s).unwrap();
        for secret in [
            "CANARY_ACCESS",
            "CANARY_REFRESH",
            "CANARY_LAUNCH",
            "CanaryUser",
            "canary@example.com",
            "CanaryProfile",
        ] {
            assert!(!s.contains(secret), "{secret} leaked in {s}")
        }
    }
}
#[test]
fn import_never_copies_launcher_credentials() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().join("loam"));
    let id = game(&c);
    let src = t.path().join("source");
    fs::create_dir_all(src.join("saves/World")).unwrap();
    fs::write(src.join("saves/World/level.dat"), b"world fixture").unwrap();
    fs::write(src.join("launcher_accounts.json"), b"SECRET_NOT_TO_READ").unwrap();
    let p = imports::inspect(&c, &id, src.to_str().unwrap()).unwrap();
    imports::apply(&c, p["token"].as_str().unwrap()).unwrap();
    let dst = c.game_dir(&id).unwrap();
    assert!(!dst.join("launcher_accounts.json").exists());
    assert_eq!(
        fs::read(dst.join("saves/World/level.dat")).unwrap(),
        b"world fixture"
    );
    assert!(src.join("saves/World/level.dat").exists());
}
#[test]
fn backup_restore_preserves_current_world() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().into());
    let id = game(&c);
    let d = c.game_dir(&id).unwrap();
    fs::create_dir_all(d.join("saves/World")).unwrap();
    fs::write(d.join("saves/World/level.dat"), b"before").unwrap();
    let key = imports::backup(&c, &id).unwrap();
    fs::write(d.join("saves/World/level.dat"), b"after").unwrap();
    imports::restore(&c, &id, &key).unwrap();
    assert_eq!(
        fs::read(d.join("saves/World/level.dat")).unwrap(),
        b"before"
    );
    let versions = fs::read_dir(c.root.join("backups").join(id))
        .unwrap()
        .count();
    assert_eq!(versions, 2);
}
#[test]
fn traversal_archive_is_rejected_before_writing() {
    let t = tempfile::tempdir().unwrap();
    let p = t.path().join("bad.zip");
    let mut z = zip::ZipWriter::new(fs::File::create(&p).unwrap());
    z.start_file("../escape.txt", zip::write::SimpleFileOptions::default())
        .unwrap();
    z.write_all(b"bad").unwrap();
    z.finish().unwrap();
    assert!(storage::extract_zip(&p, &t.path().join("out"), 1024).is_err());
    assert!(!t.path().join("escape.txt").exists());
}
#[test]
fn invalid_profiles_are_rejected() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().into());
    for s in [
        "a",
        "two words",
        "../../x",
        "profile@name",
        "12345678901234567",
    ] {
        assert!(accounts::add_offline(&c, s).is_err())
    }
    accounts::add_offline(&c, "ValidName").unwrap();
    assert!(accounts::add_offline(&c, "validname").is_err());
}

#[test]
fn loader_specifiers_are_safe_and_not_treated_as_relative_paths() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().into());
    assert!(catalog::plan(&c, "1.20.1", Some("../fabric:0.15.0")).is_err());
    assert!(catalog::plan(&c, "1.20.1", Some("fabric:../../../evil")).is_err());
}

#[test]
fn fabric_plan_resolves_without_unsafe_path_error() {
    let t = tempfile::tempdir().unwrap();
    let c = core(t.path().into());
    let plan = catalog::plan(&c, "26.3", Some("fabric:0.19.5")).unwrap();
    assert!(!plan.artifacts.is_empty());
    assert!(!plan.classpath.is_empty());
}




#[test]
fn minecraft_layout_is_idempotent_and_preserves_worlds() {
    let t = tempfile::tempdir().unwrap();
    loam_core::maintenance::prepare_layout(t.path()).unwrap();
    let game = t.path().join("games/Survival - 1.21.4");
    loam_core::maintenance::prepare_game(&game).unwrap();
    fs::write(game.join("saves/world.dat"), b"preserve world").unwrap();
    loam_core::maintenance::prepare_game(&game).unwrap();
    assert_eq!(fs::read(game.join("saves/world.dat")).unwrap(), b"preserve world");
    for folder in ["mods", "saves", "screenshots", "resourcepacks", "shaderpacks", "config", "datapacks", "server-resource-packs"] {
        assert!(game.join(folder).is_dir());
    }
    assert!(t.path().join("cache/assets").is_dir());
}

#[test]
fn existing_storage_and_custom_location_take_priority() {
    let t = tempfile::tempdir().unwrap();
    fs::write(t.path().join("state.json"), b"{}").unwrap();
    assert_eq!(loam_core::maintenance::data_root(t.path()).unwrap(), t.path());
    let custom = tempfile::tempdir().unwrap();
    fs::write(custom.path().join("state.json"), b"{}").unwrap();
    storage::write_json(&t.path().join("storage-location.json"), &json!({"schema":1,"path":custom.path()})).unwrap();
    assert_eq!(loam_core::maintenance::data_root(t.path()).unwrap(), custom.path());
}

#[test]
fn fresh_storage_defaults_to_roaming_loam_launcher() {
    let t = tempfile::tempdir().unwrap();
    let expected = std::env::var_os("APPDATA").map(std::path::PathBuf::from)
        .map(|p| p.join("LoamLauncher")).unwrap_or_else(|| t.path().to_owned());
    assert_eq!(loam_core::maintenance::data_root(t.path()).unwrap(), expected);
}
