# Build progress

## 2026-09-30

- Implementation authorized. Source brief sections 1–9 are the acceptance baseline.
- Plan: native foundation → verified vanilla launch → identity → Fabric and reviewed imports → resilience and diagnostics → accessibility and Windows packaging → signed update validation.
- Confirmed Windows x64, Visual Studio C++ tools, Node and WebView2; installing Rust MSVC toolchain.
- Public Microsoft client configuration, Discord invite and update/feed hosting requested. Independent implementation continues.
- Public distribution remains gated by live identity, support configuration, signed updates and clean-machine test evidence.

- Built the Tauri/Rust core and React desktop UI with original vector branding, local Geist fonts, live official metadata, managed Temurin runtimes, verified downloads, isolated games and reviewed imports.
- Confirmed actual Windows launches: vanilla 1.16.1 and 26.3; Fabric 26.3 with loader 0.19.5 and Fabric API 0.161.0+26.3. Saved title-screen evidence for 1.16.1 and Fabric.
- Fixed Fabric's empty-prerelease version predicate handling using upstream semantics. Added source-change detection, bounded archive streaming, transaction recovery, backup restore and verified storage migration.
- Implemented local support report preview/ZIP, redaction canaries, cached fingerprint matching, signed-update code path and explicit missing-configuration states. Owner confirmed no public service values are available.
- Windows manifests now apply consistently to app, examples and unit/integration test executables. Latest validation: 21 Rust tests, clippy with warnings denied, TypeScript/frontend production build and 6 contrast checks passed.
- Built and silently installed the branded NSIS setup to the isolated `artifacts/install-test` directory. Installed release loads bundled assets from `tauri.localhost` and preserves the previously created Offline Profile. Final installer metadata is in `artifact.json`; it is unsigned.
- Native packaged-app installation/cancel/resume and installation lifecycle checks are in progress. Full clean-machine/DPI/Narrator and live Microsoft/Discord/signed-update gates remain unverified or blocked as recorded in `acceptance.md`.

## Updated references and skin studio

- Added the supplied Discord invite and remastered the home, games, accounts, install/import and settings presentation around the new references. Added larger typography, a new geometric wordmark, split layouts and a saved motion preference.
- Built an actual 3D skin/cape studio, original pixel assets, validated local PNG import, live Mojang player lookup and local look persistence. Official skin upload and owned-cape requests are implemented with explicit confirmation; Microsoft configuration still blocks live account testing. The LOAM cape is clearly preview-only.
- Native 26.3 resume now completes successfully after fixing verified full-size partial files and HTTP 416 recovery.
- Final validation: 25 Rust tests, clippy with warnings denied, frontend typecheck/production build and 6 contrast checks passed. Live public skin lookup/save/reload passed. Corrected a preview-panel contrast issue and checked 960×600 layouts.
- Remastered unsigned NSIS setup built; exact metadata in `artifact.json`. Preparing the source archive and handoff. Public identity, feed/update hosting, signing, clean-machine lifecycle and full DPI/Narrator acceptance remain outstanding.

## 2026-10-01 — export

- Final packaged app loads bundled assets and the existing saved skin correctly. NSIS install, uninstall and reinstall all returned 0 on this Windows 11 development host. Uninstall removed the app binary while preserving state and saved-skin hashes.
- Discord's public invite API confirmed the supplied invite resolves to the LOAM server. No join or message was sent.
- Export contains the custom branded Windows x64 installer, complete source archive, original assets, lockfiles, notices, test evidence, setup instructions and SHA-256 checksums. Installer remains unsigned; external identity/signing and clean-machine certification are not claimed.

## 2026-10-03 — v1.5 foundation and targeted polish

- Audited current v1.4 source and supplied release history; preserved existing changes and UI styles.
- Matched the old installer hash and confirmed NotSigned; no replacement installer produced.
- Fixed skin blob cleanup/stale load application, hidden preview rendering and reduced motion.
- Bounded/cleaned audio voices; contained audio setup errors; centralized truthful finite byte formatting.
- Added local opt-in performance capture, focused mocked/differential tests, verify entry point,
  honest-copy scan and fail-closed signature checks. Fixed pre-existing strict Clippy failures.
- Passed 12 frontend and 28 Rust tests, typecheck/build, Clippy -D warnings and copy scan.
- Full status, measured evidence and carry-over gaps: docs/v1.5.0/RELEASE_REPORT.md and LEDGER.md.

## 2026-10-04 — 1.5.0-rc.2 installer handoff
- Added local app verification, selected-game checks, bounded repair and stricter runtime/classpath readiness.
- Retained existing page design; fixed verification button styles, skin preview and audio lifecycles.
- Branded native NSIS wizard with original LOAM logo and paper/terracotta assets.
- 42 tests passed plus typecheck/build and strict Clippy. Windows update/reinstall exit 0.
- Root installer updated; v1.4 preserved under artifacts/previous. RC2 installer: 4,602,825 bytes,
  SHA-256 1DB786C53E7842AE730FEE9676C90DB37EF6797D9C6A995F300C6C74EBFD379C, NotSigned.
- Public release remains blocked; see docs/v1.5.0/LEDGER.md and packaged-checks.md. Nothing uploaded.
