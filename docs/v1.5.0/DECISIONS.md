# Decisions — 2026-10-03

- Preserve the current implementation's UI. Do not turn the generated image concepts into a new redesign.
- Work in C:/Users/Dhyan/Documents/LOAM; retain pre-existing uncommitted changes and installer.
- v1.4's installer hash matches the supplied changelog, but its Authenticode status is NotSigned.
- Prefer measured code/resource fixes before a lifecycle rewrite. Keep performance recording opt-in
  so measurement overhead never silently becomes part of normal app operation.
- A single HTTP client / Trust Ledger requires migration of every direct network consumer;
  no incomplete ledger is presented as a complete account of traffic.
- No new hosted authentication code before the threat model is reviewed and a provider is selected.
- Preserve existing offline UUIDs; changing identity to affect arm geometry needs a separate migration
  and world-inventory compatibility investigation, not a silent polish change.
- Tauri documents bundle.windows certificateThumbprint, digestAlgorithm, timestampUrl and signCommand:
  https://tauri.app/distribute/sign/windows/ (checked 2026-10-03).
- Microsoft says EV no longer grants automatic positive SmartScreen reputation:
  https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation
  (checked 2026-10-03). Signing and reputation remain external release gates.

No package dependency versions changed in this pass. Existing skinview3d 3.4.2 source/types confirm
renderPaused and image-source loading; decoded images retain anonymous CORS like its image loader.

## Installer skin — 2026-10-04

Use NSIS installerHooks for MUI colors/fonts and native control colors, with source-generated
bitmap artwork based on the existing L logo. Vendor Tauri's installer template with page-show
theme callbacks (see src-tauri/installer/README.md), preserving its installer engine, upgrade
handling, per-user permissions, real progress, disk checks and uninstall behavior.
Do not replace the wizard with a screenshot, fake progress or an external binary skin plugin.
Sources: https://tauri.app/distribute/windows-installer/ and
https://nsis.sourceforge.io/Docs/Modern%20UI%202/Readme.html (checked 2026-10-04).
