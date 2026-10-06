"""Bundle the built installer, source ZIP and handoff documentation, then verify it."""
from pathlib import Path
import hashlib, json, subprocess, sys, zipfile
root = Path(__file__).resolve().parent.parent
artifacts = root / 'artifacts'
subprocess.run([sys.executable, str(root / 'scripts/package-source.py')], check=True)
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
installer = artifacts / f'LOAM Setup {version}.exe'
source = artifacts / f'LOAM Source {version}.zip'
report_dir = root / 'docs/v1.5.0'
metadata = json.loads((report_dir / 'artifact-rc4.json').read_text(encoding='utf-8-sig'))
assert installer.stat().st_size == metadata['bytes']
assert hashlib.sha256(installer.read_bytes()).hexdigest().upper() == metadata['sha256']
checksums = ''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in [installer, source])
(artifacts / 'CHECKSUMS.sha256').write_text(checksums, encoding='utf-8')
output = artifacts / f'LOAM Export {version}.zip'
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for p in [installer, source, artifacts / 'CHECKSUMS.sha256']:
        archive.write(p, p.name)
    archive.write(report_dir / 'START-HERE.md', 'START HERE.md')
    archive.write(report_dir / 'artifact-rc4.json', 'installer-metadata.json')
    archive.write(report_dir / 'packaged-checks.md', 'packaged-checks.md')
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
result = {'path':str(output),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(), 'installer':metadata}
(artifacts / 'export-manifest.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
