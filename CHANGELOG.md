## 1.5.1 — Settings, confirmation and Minecraft folders

- Create the Roaming/LoamLauncher data scaffold during installation; fresh installations use it by default.
- Preserve existing/custom data locations and expose Change data folder for verified migration.
- Prepare standard Minecraft directories inside every isolated profile without overwriting files.

- Removed the Verify this app panel and its hanging signature-check action. Game checks remain.
- Hide unavailable update checks and developer configuration messaging; show a manual-update explanation.
- Removal confirmation tolerates case and surrounding whitespace while still requiring the complete name.
- Interface size now scales pixel-sized controls too.
- Motion explains Windows reduced-motion and running-game limits. Choosing a mode resets the session safeguard; Full is not silently downgraded for slow frames.
- Clear stale transition names on rapid navigation; enable the fallback when no snapshot transition is active.

# Changelog

## 1.5.0 — 2026-10-05 (unsigned build)

- Polish: motion system, tab transitions, reduced-motion setting; System/Full/Reduced/Off now persist correctly.
- Fixed crowded, unstyled version rows and added keyboard navigation.
- Named game folders now include profile names and versions, retaining stable internal IDs; legacy folders migrate with rollback protection.
- Official Minecraft Java news now uses real feed titles, dates and article links, with offline cache.
- Updated app wordmark, multi-size icon and installer branding from supplied LOAM assets.
- Fixed Skin Studio header navigation; static preview by default and pause handling reduce unnecessary rendering.
- Non-modal game inspector restores focus on close; progress fills animate with transforms.
- Disabled production developer tools and inspect shortcuts; input copy/paste remains available.
- Verification: 15 frontend tests and 39 Rust tests pass. See docs/MOTION_REPORT.md for checks and limitations.
- Unsigned. Known-issues hosting, signed updater configuration and full public-release certification remain incomplete.

## 1.5.0-rc.2 — 2026-10-04 (unsigned development candidate)

- Custom native NSIS theme: paper surfaces, terracotta accent controls and progress,
  LOAM L-mark icon, reference-inspired sidebar and matching header.
- Installer copy accurately describes the Lite download model and pending public-release gates.
- Home shows the recorded installation-check date rather than incorrectly saying "today".
- In-app release notes describe implemented features and remaining certification honestly.

The installer preserves Tauri's native destination, upgrade, shortcut and uninstall workflow.
Its disk requirements and extraction progress are real NSIS values, not the reference image's samples.

## 1.5.0-rc.1 — 2026-10-03 (unsigned development candidate)

- Retains the existing LOAM visual design, fonts, palette, game layout and wardrobe.
- Settings / About: reads the running binary's Authenticode status, publisher, certificate
  thumbprint and SHA-256; copy-hash action. Source and missing checksum website are labeled honestly.
- Settings / About: read-only selected-game checks for cached files, JAR directories,
  managed Java and working space; reports untested GPU/network conditions separately.
- Missing/incomplete cached files get one bounded repair pass before launch (32 files,
  256 MiB maximum; larger/unknown repairs require Verify / reinstall). Download hashes verified.
- Installs check classpath ZIP directories before marking the game ready.
- Incomplete Java extraction no longer counts as ready without the verified-install marker;
  launch no longer falls back to an arbitrary, potentially incompatible PATH Java.
- Game Mode now minimizes on a detected game window and restores on process exit.
  Unsupported tray mode is disabled. Unmeasured hardware and timing claims removed.
- Skin preview cleans up temporary URLs, rejects stale loads, pauses when hidden, and honors
  reduced-motion changes. Sound playback is bounded, cleaned up and resilient to unavailable devices.
- Correct binary-unit labels and finite numeric formatting; local opt-in performance capture.
- Development verification, signature gate and prohibited product-copy scan added.

Not a completed v1.5 release: signed Full Edition/seed, complete Doctor/Launch Insurance,
hosted LOAM accounts/sync, Trust Ledger and other carry-over gates remain unfinished.
Optional services stay disabled. Microsoft game access remains subject to app approval and entitlement.
No clean-VM, SmartScreen reputation, multi-hardware or real-game performance certification claimed.

## 1.4.0 — existing artifact

Resource-pack metadata, game-settings drawer and editable-field context-menu changes.
Historical details supplied by the owner are audited in docs/v1.5.0/LEDGER.md.
# 1.5.0-rc.3 — Local profiles

- Removed Microsoft OAuth sign-in and refresh implementation and all sign-in entry buttons.
- Only Offline Profiles can be selected or launched; retired accounts cannot obtain sessions.
- Remove retired saved account credentials on startup, retaining disabled entries if deletion fails.
- Preserved local profile identities, existing UI and native branded installer.
- Distribution remains unsigned by owner choice; no change to Windows security warnings.

# 1.5.0-rc.4 — Microsoft account restoration

- Restore browser PKCE Microsoft/Xbox/Minecraft authentication with the new public client ID.
- Check Java entitlements and profile before saving or refreshing an online session.
- Harden callback state/path/duplicate validation and expose clear cancellation and rejection states.
- Keep Offline Profiles separate; restore official wardrobe controls for verified accounts.
- Disable selection and dragging in interface chrome; preserve text-field editing and clipboard use.
- No desktop client secret or signing certificate is included. Live authentication remains unverified
  until the owner completes browser sign-in; registration alone is not Minecraft approval.

