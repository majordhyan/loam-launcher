"""Generate the dependency inventory and locally bundled license notices from installed packages."""
import json, pathlib, tomllib
root=pathlib.Path(__file__).resolve().parent.parent
rows=[]; texts=[]; seen=set()
def record(kind,name,version,license_name,path):
    rows.append({'ecosystem':kind,'name':name,'version':version,'license':license_name})
    for p in sorted(path.iterdir()) if path.exists() else []:
        if p.is_file() and (p.name.upper().startswith(('LICENSE','COPYING','COPYRIGHT','NOTICE')) or p.name.upper()=='OFL.TXT'):
            try: body=p.read_text(encoding='utf-8')
            except (UnicodeError,OSError): continue
            key=(name,version,p.name)
            if key not in seen: texts.append(f'\n\n{name} {version} — {p.name}\n'+('='*60)+'\n'+body);seen.add(key)
lock=json.loads((root/'package-lock.json').read_text())
for location,info in lock['packages'].items():
    if not location: continue
    path=root/location
    try: meta=json.loads((path/'package.json').read_text(encoding='utf-8'))
    except (FileNotFoundError,UnicodeError): continue
    record('npm',meta.get('name',location),meta.get('version',''),meta.get('license','UNSPECIFIED'),path)
registry=pathlib.Path.home()/'.cargo/registry/src'
for package in tomllib.loads((root/'src-tauri/Cargo.lock').read_text())['package']:
    if 'source' not in package: continue
    candidates=list(registry.glob(f"*/{package['name']}-{package['version']}"))
    if not candidates: continue
    path=candidates[0];meta=tomllib.loads((path/'Cargo.toml').read_text(encoding='utf-8'))['package']
    record('cargo',package['name'],package['version'],meta.get('license',meta.get('license-file','UNSPECIFIED')),path)
(root/'docs/dependency-inventory.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
(root/'public/third-party-notices.txt').write_text('LOAM third-party notices\n\nGenerated from the installed locked development dependency graph. Includes build-only dependencies. Minecraft, Java and mods are downloaded separately and retain upstream licenses.\n'+''.join(texts),encoding='utf-8')
print(f'{len(rows)} dependency records; {len(texts)} license/notice files bundled.')
