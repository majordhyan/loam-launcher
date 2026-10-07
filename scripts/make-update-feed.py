"""Prepare artifacts/release-<version>/ for publishing, including the in-app update feed.

Usage:
    python scripts/make-update-feed.py 1.8.0

Copies the NSIS setup and its updater signature (built with TAURI_SIGNING_PRIVATE_KEY set) from
src-tauri/target/release/bundle/nsis/, writes SHA256SUMS.txt, RELEASE-NOTES.md (this version's
CHANGELOG section) and latest.json, the feed LOAM reads from
https://github.com/majordhyan/loam-launcher/releases/latest/download/latest.json.
"""
import datetime, hashlib, json, pathlib, re, shutil, sys

REPO = "majordhyan/loam-launcher"
version = sys.argv[1] if len(sys.argv) > 1 else sys.exit("usage: make-update-feed.py <version>")
root = pathlib.Path(__file__).resolve().parent.parent
nsis = root / "src-tauri/target/release/bundle/nsis"
setup, sig = nsis / f"LOAM_{version}_x64-setup.exe", nsis / f"LOAM_{version}_x64-setup.exe.sig"
for f in (setup, sig):
    if not f.is_file():
        sys.exit(f"Missing {f}. Build with the updater signing key (see docs/release.md).")

out = root / "artifacts" / f"release-{version}"
out.mkdir(parents=True, exist_ok=True)
exe = out / "LOAM-Setup-Windows-x64.exe"
shutil.copyfile(setup, exe)
shutil.copyfile(sig, out / "LOAM-Setup-Windows-x64.exe.sig")
digest = hashlib.sha256(exe.read_bytes()).hexdigest().upper()
(out / "SHA256SUMS.txt").write_text(f"{digest}  LOAM-Setup-Windows-x64.exe\n", encoding="utf-8")

changelog = (root / "CHANGELOG.md").read_text(encoding="utf-8")
m = re.search(rf"^## {re.escape(version)}\b.*?$(.*?)(?=^## |\Z)", changelog, re.S | re.M)
notes = m.group(1).strip() if m else f"LOAM {version}"
(out / "RELEASE-NOTES.md").write_text(notes + f"\n\nSHA-256: `{digest}`\n", encoding="utf-8")

# Short notes for the in-app panel: the bold lead of each top-level bullet.
def lead(line: str) -> str:
    bold = re.match(r"\*\*(.+?)\*\*", line)
    text = bold.group(1) if bold else re.sub(r"\*\*|`", "", line).split(". ")[0]
    text = text.strip(" .:")
    return text if len(text) <= 90 else text[:87].rstrip() + "…"
leads = [lead(l[2:]) for l in notes.splitlines() if l.startswith("- ")]
summary = "\n".join(f"• {l}" for l in leads[:12])
feed = {
    "version": version,
    "notes": summary,
    "pub_date": datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    "platforms": {"windows-x86_64": {
        "signature": sig.read_text(encoding="utf-8").strip(),
        "url": f"https://github.com/{REPO}/releases/download/v{version}/LOAM-Setup-Windows-x64.exe",
    }},
}
(out / "latest.json").write_text(json.dumps(feed, indent=2) + "\n", encoding="utf-8")
print(f"release-{version}: setup {exe.stat().st_size} bytes, SHA-256 {digest}")
print(summary)
