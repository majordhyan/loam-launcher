# LOAM installer template

`loam.nsi` is based on Tauri's MIT-licensed upstream NSIS template, retrieved 2026-10-04:
https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-bundler/src/bundle/windows/nsis/installer.nsi

Upstream file SHA-256 before modifications:
`DABED59013B1D78B879A1A85BC7F2EED2993B33A9A90CDABE5946DE3D3950597`

The local copy is pinned in this source handoff. `TAURI-LICENSE-MIT.txt` preserves the license.
Changes add LoamPageTheme callbacks to directory, install-files and start-menu pages,
and the existing maintenance dialog. Colors, text and artwork are defined by
`../installer-hooks.nsh` and `../../scripts/brand.mjs`. Installation, upgrade and uninstall
logic is retained. Review upstream template changes when upgrading Tauri.

This is a native multipage NSIS wizard inspired by the supplied reference, not a pixel-identical
single-page replacement. Native Windows button rendering is retained. Progress is produced by
NSIS; the artwork contains no simulated controls or progress values.
