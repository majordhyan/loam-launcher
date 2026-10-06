import os
import shutil
import json

SRC_DIR = r"c:\Users\Dhyan\Documents\LOAM"
DST_DIR = r"c:\Users\Dhyan\Documents\loam-public"

if os.path.exists(DST_DIR):
    shutil.rmtree(DST_DIR)
os.makedirs(DST_DIR, exist_ok=True)

# 1. Directories to copy recursively
DIRS_TO_COPY = [
    ("src", "src"),
    (os.path.join("src-tauri", "src"), os.path.join("src-tauri", "src")),
    (os.path.join("src-tauri", "capabilities"), os.path.join("src-tauri", "capabilities")),
    (os.path.join("src-tauri", "icons"), os.path.join("src-tauri", "icons")),
    (os.path.join("src-tauri", "installer"), os.path.join("src-tauri", "installer")),
    (os.path.join("src-tauri", "tests"), os.path.join("src-tauri", "tests")),
    ("tests", "tests"),
]

for src_sub, dst_sub in DIRS_TO_COPY:
    s = os.path.join(SRC_DIR, src_sub)
    d = os.path.join(DST_DIR, dst_sub)
    if os.path.exists(s):
        shutil.copytree(s, d, dirs_exist_ok=True)
        print(f"Copied directory: {src_sub} -> {dst_sub}")

# 2. Public folder (safe assets only)
pub_src = os.path.join(SRC_DIR, "public")
pub_dst = os.path.join(DST_DIR, "public")
os.makedirs(pub_dst, exist_ok=True)
for item in os.listdir(pub_src):
    s_item = os.path.join(pub_src, item)
    d_item = os.path.join(pub_dst, item)
    if os.path.isdir(s_item):
        shutil.copytree(s_item, d_item, dirs_exist_ok=True)
    else:
        shutil.copy2(s_item, d_item)
print("Copied public assets.")

# 3. Scripts folder (core scripts only)
scripts_src = os.path.join(SRC_DIR, "scripts")
scripts_dst = os.path.join(DST_DIR, "scripts")
os.makedirs(scripts_dst, exist_ok=True)

ALLOWED_SCRIPTS = [
    "brand.mjs",
    "package-export.py",
    "package-source.py",
    "release-check.mjs",
    "forbidden-strings.ps1",
    "verify-signatures.ps1",
    "verify.ps1",
]

for sc in ALLOWED_SCRIPTS:
    s_sc = os.path.join(scripts_src, sc)
    if os.path.exists(s_sc):
        shutil.copy2(s_sc, os.path.join(scripts_dst, sc))
        print(f"Copied script: {sc}")

# 4. Root & src-tauri files
FILES_TO_COPY = [
    ("package.json", "package.json"),
    ("package-lock.json", "package-lock.json"),
    ("tsconfig.json", "tsconfig.json"),
    ("vite.config.ts", "vite.config.ts"),
    ("index.html", "index.html"),
    ("release.config.json", "release.config.json"),
    (os.path.join("src-tauri", "installer-hooks.nsh"), os.path.join("src-tauri", "installer-hooks.nsh")),
    (os.path.join("src-tauri", "tauri.conf.json"), os.path.join("src-tauri", "tauri.conf.json")),
    (os.path.join("src-tauri", "build.rs"), os.path.join("src-tauri", "build.rs")),
    (os.path.join("src-tauri", "Cargo.toml"), os.path.join("src-tauri", "Cargo.toml")),
    (os.path.join("src-tauri", "Cargo.lock"), os.path.join("src-tauri", "Cargo.lock")),
]

for src_f, dst_f in FILES_TO_COPY:
    s = os.path.join(SRC_DIR, src_f)
    d = os.path.join(DST_DIR, dst_f)
    if os.path.exists(s):
        os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copy2(s, d)
        print(f"Copied file: {src_f}")

# 5. loam.config.json with public client ID
with open(os.path.join(SRC_DIR, "loam.config.json"), "r", encoding="utf-8") as f:
    cfg = json.load(f)

# Ensure public client ID is set for Microsoft PKCE login
cfg["microsoftClientId"] = "fef7a470-7d7e-4c33-92aa-33d13270c3e9"
with open(os.path.join(DST_DIR, "loam.config.json"), "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
print("Configured public loam.config.json")

print("\nBase repository structure successfully populated at:", DST_DIR)
