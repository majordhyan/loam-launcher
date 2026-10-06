# Windows packaged checks — 2026-10-04

## RC.3 local-profile update

Microsoft OAuth, browser callback and refresh implementation removed. Sign-in IPC and UI
entry points removed; no Microsoft client ID remains in the build configuration. Online
accounts cannot be selected or launched. Credential deletion for retired accounts retains
disabled entries on failure, with a manual remove action. Local UUIDs are not migrated.

Passed: 12 frontend tests, 19 Rust unit tests, 12 integration tests (43 total), frontend
typecheck/build and strict Clippy. New integration coverage rejects an online account before
credential access and checks local profile preservation. Evidence: verify-rc3.log.
Build evidence: bundle-rc3.log. Artifact metadata: artifact-rc3.json.
The earlier RC.2 native smoke results below do not certify RC.3 or all game versions.

Windows Authenticode remains unsigned by owner choice. Changing launcher login does not
remove Windows publisher warnings. The complete v1.5 acceptance matrix remains unfinished.

## Previous RC.2 evidence

This is a development candidate, not public-release certification.

- Native NSIS welcome and maintenance pages inspected on this laptop: original LOAM L-mark,
  paper background, matching header/sidebar artwork, native title bar and readable content.
  Not a pixel-identical recreation of the supplied single-page concept.
- RC.1 to RC.2 upgrade: installer `/S` exit 0; uninstall registry reports 1.5.0-rc.2.
- Final button-style rebuild reinstalled: `/S` exit 0. Installer bytes and hash are recorded
  in artifact-rc2.json. The root LOAM_Installer.exe is updated; previous v1.4 kept in artifacts/previous.
- Installed app opens and shows 1.5.0-rc.2. Existing profile/game state remains available.
- Verify this app: native command returned NotSigned, no publisher, no certificate and a hash
  matching Get-FileHash on the installed executable. This functional smoke check preceded the final
  button-class-only rebuild. Install source is explicitly unknown, not guessed.
- Selected-game read-only check: 4,132 files passed size/path checks; classpath JAR directories
  readable; managed Java 21 marker present; free-space threshold passed. This is not a full hash
  sweep or proof of game launch. No worlds modified by this check.
- Tauri's raw build executable and installed executable differ in the expected three-byte
  BUNDLE_TYPE_VAR marker (UNK versus NSS). Their hashes are therefore not interchangeable.
- Automated checks: 12 frontend tests, 19 Rust unit tests, 11 integration tests passed;
  TypeScript typecheck, frontend build and Clippy with warnings denied passed. Build reran
  typecheck/frontend compilation after final button styling. Web Audio/performance tests are mocked;
  Fabric planning integration uses live upstream metadata. See verify-rc2.log and bundle-rc2.log.

Not run: clean Windows 10/11 install/uninstall matrix, all DPI/accessibility states, real-game
launch/minimize/restore, Microsoft sign-in/refresh, long-duration performance and antivirus
certification. No claim of zero bugs, SmartScreen reputation, or Microsoft app approval.
The wardrobe chunk still triggers Vite's >500 kB warning. Signing and unfinished v1.5 features
remain blocked as recorded in LEDGER.md.

RC.3 native check: installer upgrade exited 0; installed app opened with existing Offline Profile and games. Microsoft Defender custom scan of RC.3 installer returned no threats (exit 0). Full clean-machine/game-launch matrix not run.

## RC.4 Microsoft restoration
- 12 frontend, 21 Rust unit and 11 integration tests passed (44 total), strict Clippy passed.
- Final frontend build/typecheck includes non-selectable/non-draggable app chrome; fields remain editable.
- Windows installer upgrade exited 0; packaged app opened and Microsoft sign-in button was exercised.
- System-browser authentication started for owner completion. Live service success is not yet verified.
- Defender custom installer scan: no threats, exit 0. Artifact remains unsigned.
- Evidence: verify-rc4.log, bundle-rc4.log, artifact-rc4.json, docs/microsoft-setup.md.

RC.4 live authentication result: owner completed browser login. Packaged app confirmed
Microsoft/Xbox stages, then Minecraft login HTTP 403. No Java account saved. Ownership,
profile, official skins, refresh and server join remain unverified. No repeated retry.
