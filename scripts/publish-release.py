"""Publish a LOAM release to the public GitHub repo.

Usage (PowerShell):
    $env:GITHUB_TOKEN = "<token for majordhyan with Contents: read and write>"
    python scripts/publish-release.py 1.7.1
    Remove-Item Env:GITHUB_TOKEN

Uploads artifacts/release-<version>/LOAM-Setup-Windows-x64.exe, its updater signature
(.exe.sig), SHA256SUMS.txt and latest.json (the in-app update feed) to a new release tagged
v<version> on main, with RELEASE-NOTES.md as the body, and marks it latest. LOAM's Settings ›
Updates reads releases/latest/download/latest.json and installs only a correctly signed setup.
Checks the checksum and the feed before uploading. The token is read from the environment only
and is never printed or written anywhere.
"""
import hashlib, json, os, pathlib, sys, urllib.request, urllib.error

REPO = "majordhyan/loam-launcher"
version = sys.argv[1] if len(sys.argv) > 1 else sys.exit("usage: publish-release.py <version>")
token = os.environ.get("GITHUB_TOKEN") or sys.exit("Set GITHUB_TOKEN first.")
folder = pathlib.Path(__file__).resolve().parent.parent / "artifacts" / f"release-{version}"
exe, sums, notes = folder / "LOAM-Setup-Windows-x64.exe", folder / "SHA256SUMS.txt", folder / "RELEASE-NOTES.md"
sig, feed = folder / "LOAM-Setup-Windows-x64.exe.sig", folder / "latest.json"
for f in (exe, sums, notes, sig, feed):
    if not f.is_file():
        sys.exit(f"Missing {f.name}; build with the updater key and run scripts/make-update-feed.py first.")
latest = json.loads(feed.read_text(encoding="utf-8"))
entry = latest["platforms"]["windows-x86_64"]
if latest["version"] != version or entry["signature"] != sig.read_text().strip() or not entry["url"].endswith(f"/v{version}/LOAM-Setup-Windows-x64.exe"):
    sys.exit("latest.json doesn't match this version, its signature or its download URL.")

expected = sums.read_text().split()[0].lower()
actual = hashlib.sha256(exe.read_bytes()).hexdigest()
if actual != expected:
    sys.exit(f"Checksum mismatch: {actual} != {expected}")

def call(method, url, body=None, content_type="application/json"):
    data = json.dumps(body).encode() if isinstance(body, dict) else body
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
        "User-Agent": "loam-publish", "Content-Type": content_type})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"GitHub {method} {url.split('?')[0]} failed: HTTP {e.code} {e.read()[:300]!r}")

tag = f"v{version}"
existing = [r for r in call("GET", f"https://api.github.com/repos/{REPO}/releases?per_page=30") if r["tag_name"] == tag]
if existing:
    sys.exit(f"{tag} already exists: {existing[0]['html_url']}")
release = call("POST", f"https://api.github.com/repos/{REPO}/releases", {
    "tag_name": tag, "target_commitish": "main", "name": f"LOAM {version}",
    "body": notes.read_text(encoding="utf-8"), "draft": False, "prerelease": False, "make_latest": "true"})
upload = release["upload_url"].split("{")[0]
for f, ctype in [(exe, "application/vnd.microsoft.portable-executable"), (sig, "text/plain"), (sums, "text/plain"), (feed, "application/json")]:
    asset = call("POST", f"{upload}?name={f.name}", f.read_bytes(), ctype)
    print("uploaded", asset["name"], asset["size"], "bytes")
print("published", release["html_url"])
