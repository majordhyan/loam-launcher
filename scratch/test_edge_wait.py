import os
import subprocess

edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
out_path = os.path.abspath("showcase/assets_realtime/realtime_skins_waited_4k.png")

cmd = [
    edge,
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1920,1080",
    "--virtual-time-budget=4000",
    f"--screenshot={out_path}",
    "http://127.0.0.1:1420/?demo=1&theme=light&page=skins"
]

subprocess.run(cmd, capture_output=True, timeout=15)
if os.path.exists(out_path):
    print("Saved:", os.path.getsize(out_path))
else:
    print("Failed")
