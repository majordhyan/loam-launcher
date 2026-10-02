# LOAM 0.1.0 — Windows export

Your worlds, ready.

## Install

Run **LOAM Setup 0.1.0.exe** on Windows 10/11 x64. It is a per-user NSIS installer with LOAM's icon, paper/terracotta branding and custom installer bitmaps. This development installer is **unsigned**. WebView2 is required; setup can obtain the Microsoft runtime if missing.

The installer contains the launcher and its local UI assets. Minecraft, mods and Java are downloaded separately from their permitted sources only when you choose to install a game.

## Start playing

1. Choose Later or create an **OFFLINE PROFILE** during first run. Microsoft sign-in currently needs an approved app registration.
2. Press INSTALL, choose a Minecraft release and Vanilla or an available Fabric loader, review the plan and confirm INSTALL.
3. Select a profile and press PLAY. Offline Profiles are for local/offline-capable play and do not authenticate to online-mode servers or Realms.
4. Use the shirt icon to preview skins/capes. Upload a PNG or look up a public Minecraft player's skin. Save the look locally. The LOAM cape is preview-only; official skins and owned capes need configured Microsoft authentication.
5. Use Support & Feedback to open the configured LOAM Discord, preview a redacted report, copy it or save a diagnostics ZIP.

## Source files

Extract **LOAM Source 0.1.0.zip**. Its `LOAM` folder includes the React/TypeScript UI, Rust core, original icons and textures, local dependency notices, lockfiles, tests, documentation and build scripts. Read `README.md` to build. Downloaded games, Java runtime caches, credentials and user profiles are intentionally excluded.

## Validation and limits

- 25 Rust tests, clippy with warnings denied, TypeScript check, production frontend build and 6 contrast tests passed.
- Vanilla 1.16.1, Vanilla 26.3 and Fabric 26.3 were launched during development. Cancel/resume recovery and live public skin lookup/save/reload were checked.
- The final NSIS package installed, launched, uninstalled and reinstalled on the Windows 11 development host. Existing state and saved skin were retained.
- Microsoft account login/official skin writes, signed updates, known-issues hosting, clean Windows 10/11 installation, full native DPI matrix and Narrator acceptance remain blocked or unverified. This is not a certified public release.

See `docs/acceptance.md`, `docs/artifact.json` and `CHECKSUMS.sha256` for exact evidence and artifact checksums.

Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
