import ctypes,re,pathlib
dll=None
for line in pathlib.Path('artifacts-imports.log').read_text(encoding='utf-8-sig').splitlines():
    m=re.match(r'^    ([\w.-]+\.dll)\s*$',line,re.I)
    if m:
        try: dll=ctypes.WinDLL(m[1]);name=m[1]
        except OSError as e: print('LOAD FAILURE',m[1],str(e));dll=None
        continue
    m=re.match(r'^\s+[0-9A-F]+\s+([\w?@$]+)\s*$',line)
    if m and dll:
        try: getattr(dll,m[1])
        except AttributeError: print('MISSING',name,m[1])
