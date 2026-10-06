import os
import time
import subprocess

edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
out_dir = os.path.abspath("showcase/assets_realtime")
os.makedirs(out_dir, exist_ok=True)

targets = [
    ("realtime_home_4k.png", "http://127.0.0.1:1420/?demo=1&theme=light&page=home"),
    ("realtime_settings_4k.png", "http://127.0.0.1:1420/?demo=1&theme=light&page=settings"),
    ("realtime_skins_4k.png", "http://127.0.0.1:1420/?demo=1&theme=light&page=skins"),
    ("realtime_dev_4k.png", "http://127.0.0.1:1420/?demo=1&theme=light&page=dev"),
]

for filename, url in targets:
    out_path = os.path.join(out_dir, filename)
    cmd = [
        edge,
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1920,1080",
        "--device-scale-factor=2",
        f"--screenshot={out_path}",
        url
    ]
    print(f"Capturing: {url} -> {filename}...")
    subprocess.run(cmd, capture_output=True, timeout=15)
    if os.path.exists(out_path):
        size_kb = os.path.getsize(out_path) / 1024
        print(f"  [OK] Saved {filename} ({size_kb:.1f} KB)")
    else:
        print(f"  [FAIL] Could not capture {filename}")

print("All realtime captures completed!")
