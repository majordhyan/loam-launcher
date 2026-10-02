"""Create a reproducible source handoff without game caches, credentials or build outputs."""
from pathlib import Path
import zipfile, hashlib, json
root = Path(__file__).resolve().parent.parent
roots = ['src', 'public', 'scripts', 'docs', '.github', 'src-tauri/src', 'src-tauri/tests', 'src-tauri/examples', 'src-tauri/icons', 'src-tauri/capabilities', 'tests']
files = ['README.md', 'package.json', 'package-lock.json', 'loam.config.json', 'index.html', 'tsconfig.json', 'vite.config.ts', '.gitignore', 'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src-tauri/build.rs', 'src-tauri/tauri.conf.json']
paths = {root / f for f in files if (root / f).is_file()}
for folder in roots:
    paths.update(p for p in (root / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
output = root / 'artifacts/LOAM Source 0.1.0.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(paths):
        name = path.relative_to(root).as_posix()
        archive.writestr('LOAM/' + name, path.read_bytes())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert not any('/target/' in n or '/node_modules/' in n or '/artifacts/' in n or n.endswith('/state.json') for n in archive.namelist())
print(json.dumps({'path':str(output),'files':len(paths),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()},indent=2))
