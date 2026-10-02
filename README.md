# LOAM

**Your worlds, ready.** A Windows x64 Minecraft Java launcher built with Tauri 2, React, TypeScript and Rust.

This repository is a **0.1.0 development build**, not a certified public release. The remastered UI and local skin studio are implemented, and [LOAM Discord](https://discord.gg/Bay9dMmTZ) is configured. Microsoft sign-in and live updates still require owner configuration. See [acceptance status](docs/acceptance.md) for tested behavior and remaining gates.

## Run and build

Requires Windows 10/11 x64, Node 24, Rust stable MSVC, Visual Studio C++ build tools, Windows SDK and WebView2.

```powershell
npm ci
& .\scripts\dev-shell.ps1
```

```powershell
npm test
npm run build
& .\scripts\dev-shell.ps1 @('cargo','test','--manifest-path','src-tauri/Cargo.toml')
& .\scripts\dev-shell.ps1 @('cargo','clippy','--manifest-path','src-tauri/Cargo.toml','--all-targets','--','-D','warnings')
& .\scripts\dev-shell.ps1 @('npm.cmd','run','bundle')
```

NSIS output: `src-tauri/target/release/bundle/nsis/`. The final review artifact and checksum are recorded in `docs/artifact.json` when produced. Do not distribute earlier intermediate installers.

## Use

1. Add a Microsoft account when configured, create an explicitly labeled Offline Profile, or choose Later.
2. Choose INSTALL, a release from the official live manifest, and Vanilla or an available Fabric loader. Review required space and press INSTALL.
3. Select an account and PLAY. Each game has separate saves, mods and settings.
4. Drop one supported file or choose a folder to inspect it. Review dependencies and compatibility before applying. LOAM backs up existing content and preserves the source.
5. Open Support & Feedback with F1. Reports stay local; preview, copy and export them yourself. Nothing is uploaded automatically.
6. Open the shirt icon for the [3D skin studio](docs/skin-studio.md). Upload a PNG or look up a public player's skin, preview the original LOAM cape and save the look locally. Official skin changes and owned capes require a configured Microsoft account; the custom cape is preview only.

Offline Profiles do not prove ownership and cannot authenticate to online-mode servers or Realms. Minecraft files are fetched from official sources; the installer contains no Minecraft binaries, mods or Java runtime.

## Data and recovery

Default data: `%LOCALAPPDATA%\app.loam.launcher`. Storage migration copies and verifies data into an empty chosen folder and switches after restart. The original remains intact. Back up `state.json`, `games` and `backups` together. Credentials are in Windows Credential Manager and are never included in migration exports or reports.

An interrupted install reuses verified cache entries and resumes partial downloads where the server supports Range. Repair re-verifies/reinstalls official files without deleting saves. Interrupted content transactions block launch until a backup is restored. Deleted games are retained under `trash`; restore manually while LOAM is closed if needed.

## Documentation

- [Architecture and security](docs/architecture.md)
- [Microsoft registration](docs/microsoft-setup.md)
- [Release and update setup](docs/release.md)
- [Acceptance evidence and support matrix](docs/acceptance.md)
- [Sources, versions and licensing](docs/third-party-notices.md)
- [Skin and cape studio](docs/skin-studio.md)

Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
