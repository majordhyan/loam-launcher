"""Create a reproducible source handoff without game caches, credentials or build outputs."""
from pathlib import Path
import zipfile, hashlib, json
root = Path(__file__).resolve().parent.parent
roots = ['src', 'public', 'scripts', 'docs', '.github', 'src-tauri/src', 'src-tauri/tests', 'src-tauri/examples', 'src-tauri/icons', 'src-tauri/capabilities', 'tests']
files = ['README.md', 'package.json', 'package-lock.json', 'loam.config.json', 'release.config.json', 'CHANGELOG.md', 'index.html', 'tsconfig.json', 'vite.config.ts', '.gitignore', 'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src-tauri/build.rs', 'src-tauri/tauri.conf.json']
paths = {root / f for f in files if (root / f).is_file()}
paths.add(root / 'src-tauri/installer-hooks.nsh')
paths.update(p for p in (root / 'src-tauri/installer').rglob('*') if p.is_file())
for folder in roots:
    paths.update(p for p in (root / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
# Administrative registration helpers are not launcher runtime/build sources.
admin_helpers = {'Create-LOAMLauncherApp.ps1', 'Create-MinecraftLauncherApp.ps1', 'Rotate-LOAMSecret.ps1', 'create_loam_launcher_app.py'}
paths = {p for p in paths if p.name not in admin_helpers}
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
output = root / f'artifacts/LOAM Source {version}.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(paths):
        name = path.relative_to(root).as_posix()
        archive.writestr('LOAM/' + name, path.read_bytes())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert not any('/target/' in n or '/node_modules/' in n or '/artifacts/' in n or n.endswith('/state.json') for n in archive.namelist())
print(json.dumps({'path':str(output),'files':len(paths),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()},indent=2))
