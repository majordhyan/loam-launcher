# Acceptance record — 2026-09-30

**Development build, not public-release acceptance.** Tests below run on this Windows 11 Pro x64 development host. A clean Windows 10/11 VM has not been provided or tested. Screenshots and logs are evidence only for the particular scenarios recorded.

| Gate | Implemented and observed | Status / remaining evidence |
|---|---|---|
| A — Desktop | Native Tauri window, local fonts, design tokens, first run, game/settings/account/import/support screens, keyboard shortcuts, command palette and persisted state. Native Offline Profile creation observed. | Partial validation: full keyboard/Narrator and every state at every Windows DPI remain unverified. |
| B — Vanilla | Live official discovery, inherited manifests/rules, Java, client/libraries/assets, hash verification and argument-vector process launch. | 1.16.1 and 26.3 launched on Windows with Offline Profile. 1.16.1 title and 26.3 first-run screen visually observed. These do not certify every intermediate version or multiplayer/world gameplay. |
| C — Accounts | Offline UUID/name checks, shared capability matrix, PKCE system-browser path, Credential Manager, entitlement/profile chain, sign-out. | Offline tests pass. Microsoft live flow BLOCKED: no approved client ID or consenting owning test account. Xbox numeric failure-code mappings unverified. |
| D — Games/import | Separate games, live Fabric metadata, archive limits, reviewed imports, SHA-bound folder/file review, source-version mismatch rejection, backups/rollback, content enable/disable/remove. | Fabric 26.3 / loader 0.19.5 / Fabric API 0.161.0+26.3 reached the modded title screen. Log confirms 49 loaded components. Other-launcher credential exclusion and source retention tested. Wider pack/world corpus remains unverified. |
| E — Reliability | Download retry/resume/cancel paths, disk checks, cache verification, transaction recovery, backup restore, storage migration. | Local HTTP fixture proves interrupted transfer resumes at byte 80,000 and verifies final SHA-256; corrupted data never becomes a final file. Backup and migration fixtures pass. Power-loss and full-disk fault injection remain unverified. |
| F — Windows release | Original ICO and NSIS assets; Windows x64 setup produced. | Exact final artifact recorded in `artifact.json`. Unsigned. Local installation lifecycle evidence is recorded below; clean-machine matrix remains unverified. |
| G — Support | Three cards, report IDs, exact redacted preview/export, <1,800 UTF-16-unit summary, local ZIP, allowlisted opener, cached known issues and fingerprint matching. User-supplied Discord invite is configured. | Canary test inspects ZIP members. Known-issues feed hosting is still missing. No automated posting/upload. |
| H — Updates | Startup check, release notes, user-initiated signed install and pre-update state/report backup. | UNVERIFIED: no hosting or signing key. Tamper/install/rollback scenarios not established. Public release check deliberately fails. |

## Support matrix

| Feature | Support |
|---|---|
| OS | Windows 10/11 x64 implementation; this host is Windows 11. ARM/macOS/Linux not advertised. |
| Vanilla | Live manifest versions from 1.16.1 onward; releases default, snapshots opt-in. Two endpoints of the range smoke-tested. |
| Fabric | Only versions/loaders present in live Fabric metadata. 26.3/0.19.5 tested with actual Fabric API. |
| Offline Profile | Local play, LAN, offline-mode servers; no ownership, online authentication, Realms or personal skin claim. |
| Microsoft | Implemented but BLOCKED pending app registration/approval and live test account. |
| Import | Fabric JAR, resource ZIP, shader ZIP, one-world ZIP, Modrinth mrpack/URLs, selected launcher game-data folder. Reviews cannot guarantee a mod is safe code; LOAM does not execute it during import. |
| mrpack | Fabric/Vanilla only; CDN-hosted downloads only; optional client files skipped; client overrides applied last. Unsupported hosts/loaders are rejected. |
| Java | Managed Temurin x64 chosen from version metadata and checked before launch. No custom Java executable selector in this build. |
| Storage | Per-user data, shared verified cache, isolated games, verified migration to an empty folder, download-cache cleaning. No per-game external folder picker. |
| Appearance | Light theme; reduced-motion/forced-colors CSS. Dark theme intentionally deferred as allowed by the brief. English only. |

## Known limitations

- Not ready for public distribution: external identity, known-issues/update hosting and signing are absent. The Discord invite is configured.
- Full Microsoft/Xbox error-code behavior is not certified. Offline profiles never silently replace a failed Microsoft identity.
- No clean Windows VM, Windows 10, full Windows DPI matrix, Narrator pass, or comprehensive keyboard journey evidence yet. Browser viewport checks do not substitute for native DPI tests.
- Resource pack format checks use installed official-client metadata when available; otherwise review explicitly marks compatibility unverified. Nested embedded mod dependency resolution is not implemented; uncertain dependencies remain listed as missing/unverified.
- Storage migration preserves the original and needs restart. Cleanup intentionally only removes cached import downloads and runtime archives. Manual removal of retained trash/original migration copies is outside automatic cleanup.
- Full signed-update rollback is unverified. State/report backup alone is not proof of rollback-safe installation.
- No Forge, NeoForge, CurseForge, third-party auth server, TLauncher account login, mod search, dependency installation, telemetry or automatic uploads.

## Evidence

- `evidence/minecraft-1.16.1.png`: original vanilla title.
- `evidence/minecraft-26.3-fabric.png`: actual Fabric modded title.
- `evidence/native-first-run.png`: native first-run UI at the host's current scaling (not a DPI-matrix claim).
- Ignored local logs: `artifacts-smoke-old.log`, `artifacts-smoke-new.log`, `artifacts-smoke-fabric.log`, `artifacts-test.log`, `artifacts-clippy.log`, `artifacts-frontend.log`, `artifacts-bundle-final.log`.

## Remaster handoff

- Implemented the September 30 visual references with a thin geometric wordmark, large centered version home, full-page games/accounts/install/import layouts, split skin studio, terracotta actions and restrained transitions. `tokens.css` centralizes the locked palette and motion values. The persisted animation preference and system reduced-motion setting are respected.
- Added locally bundled skinview3d 3.4.2: interactive rotation/zoom, front/back views, idle/walk pose, Classic/Slim models, original LOAM Field skin and LOAM Signature preview cape. PNG decoding limits, origin restrictions and offline capability checks are implemented in Rust. Official skin uploads and owned-cape changes have a review/confirmation step but remain UNVERIFIED/BLOCKED with Microsoft setup.
- Live public Mojang lookup, texture download, PNG validation, atomic local save and reload passed (`skin-smoke.log`). No account appearance was modified during testing.
- Native interrupted Minecraft 26.3 installation resumed and reached installed/verified state after the completed-partial fix (`resume-remaster.json`). This final recovery check ran in the native development executable; previous installer cancellation and reinstall checks used the prior packaged build.
- Final source checks: **25 Rust tests passed** (16 unit + 9 integration), clippy with warnings denied passed, TypeScript and frontend production build passed, **6 contrast tests passed**. Browser axe reported no violations on the corrected skin studio, first-run and accounts states checked. This is not a full accessibility certification.
- Final remastered NSIS package built successfully. Exact path, size, SHA-256 and unsigned status are in `artifact.json`. On October 1 (Asia/Calcutta), the final package installed, launched from bundled `tauri.localhost` assets, loaded the existing saved skin in the 3D studio, uninstalled successfully, preserved the state and saved skin hashes, and reinstalled successfully on this Windows 11 development host. Evidence is in `remaster-install.json`, `remaster-uninstall.json`, `remaster-reinstall.json` and native screenshots. No clean VM or native DPI/Narrator matrix is claimed.
- Screenshots labeled 960×600 are browser viewport checks. They are not Windows DPI scaling evidence. Browser preview intentionally has no native accounts or file operations.
- Source handoff excludes downloaded game/runtime/mod files, per-user profiles, credentials, caches, dependency directories and compiler outputs. Lockfiles, assets, implementation, build scripts, tests, licenses and evidence are included.
