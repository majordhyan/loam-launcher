# LOAM 1.5.0 — build handoff

Date: 2026-10-05. Windows 10/11 x64, Tauri 2 / React / Rust, branded NSIS installer. Non-RC version number; **unsigned**, not fully public-release certified.

## Installer

- File: `LOAM Setup 1.5.0.exe`
- Bytes: 4,714,633 (approximately 4.50 MiB)
- SHA-256: `824DFCF164DCC0CE0C9D1EF80BA11A45DF7922F18BF6E4056DB9DD99E1CD6D24`
- Authenticode: `NotSigned`, verified with Get-AuthenticodeSignature. Windows may show an unknown-publisher warning.
- Canonical bundle: `src-tauri/target/release/bundle/nsis/LOAM_1.5.0_x64-setup.exe`

## Checks completed

- Frontend: 15 tests passed; TypeScript and production Vite build passed.
- Rust: 25 unit + 14 integration tests passed; Clippy all targets with warnings denied passed.
- Native installer: silent install returned exit 0 on this laptop, reusing its registered test installation at `C:\Users\Dhyan\Documents\ChatGPT\LOAM LAUNCHER\artifacts\install-test`.
- Installed executable reports ProductVersion/FileVersion 1.5.0 and launches successfully.
- Live catalog displayed in the installed app with the repaired full-width version rows. Official news displayed an actual feed headline.
- F12 and right-click on app chrome did not open developer tools or a browser menu in the installed build.
- Installed executable SHA-256: `7CB249E8592B966DC5B399270D7BDB2E246BBC2E327932EC6BDA352921746AC2`.
  The build-directory executable differs in exactly three bundle-marker bytes (`UNK` vs installed `NSS`), as expected from Tauri's NSIS bundle tagging; use the installer checksum for distribution.
- After native startup, both existing profiles have persisted readable folder mappings and both game directories exist.
- Native visual evidence: `motion/install-1.5.0.jpg`.

## Changes

See CHANGELOG.md and MOTION_REPORT.md for version-picker styling, safe profile folder naming, official cached news, motion settings/navigation, Skin Studio navigation, updated supplied logos and production devtools controls.

## External gates and unverified work

The public configuration check still fails because the HTTPS known-issues feed and signed updater endpoint/key are absent. No signing certificate was provided. These checks were not removed or weakened. Minecraft app approval, real-account sign-in/multiplayer launch, clean-machine install/uninstall, full accessibility matrix and before/after native CPU/RAM/FPS are not verified in this pass. The full motion wish list is not complete; exact implemented scope and remaining presentation items are listed in MOTION_REPORT.md.

Nothing was published or pushed. All existing changes were retained on branch `polish/motion`; no commits were made because the initial working tree contained unrelated changes.
