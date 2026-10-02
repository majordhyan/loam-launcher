"""Bundle the built installer, source ZIP and handoff documentation, then verify it."""
from pathlib import Path
import hashlib, json, subprocess, sys, zipfile
root = Path(__file__).resolve().parent.parent
artifacts = root / 'artifacts'
subprocess.run([sys.executable, str(root / 'scripts/package-source.py')], check=True)
installer = artifacts / 'LOAM Setup 0.1.0.exe'
source = artifacts / 'LOAM Source 0.1.0.zip'
metadata = json.loads((root / 'docs/artifact.json').read_text(encoding='utf-8-sig'))
assert installer.stat().st_size == metadata['bytes']
assert hashlib.sha256(installer.read_bytes()).hexdigest().upper() == metadata['sha256']
checksums = ''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in [installer, source])
(artifacts / 'CHECKSUMS.sha256').write_text(checksums, encoding='utf-8')
output = artifacts / 'LOAM Final Export 0.1.0.zip'
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for p in [installer, source, artifacts / 'CHECKSUMS.sha256']:
        archive.write(p, p.name)
    archive.write(root / 'docs/START-HERE.md', 'START HERE.md')
    archive.write(root / 'docs/artifact.json', 'installer-metadata.json')
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
result = {'path':str(output),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(), 'installer':metadata}
(artifacts / 'export-manifest.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
