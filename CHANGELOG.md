# Changelog

## 1.6.1 — 2026-10-06 (unsigned build)

### New
- **Migration Hub.** Finds Prism Launcher, MultiMC and CurseForge instances (default folders, or any folder you choose) and turns one into a LOAM game in a single step: worlds, mods, configs, resource and shader packs, screenshots, options and server lists are copied, and the Fabric/Quilt loader and memory setting carry over. Sources are only read. Account files, logs and launcher settings are never opened. Forge and NeoForge instances can bring their worlds, packs and settings into a vanilla game. A failed copy is removed and never appears in the library. Available on first run, from Install, the import screen, the command palette, or by dropping an instance folder on the window.
- **Smart Drop everywhere.** Drop a `.jar`, `.zip`, `.mrpack` or folder anywhere on the window, even before you have a game. LOAM identifies it once, lists every game with a compatibility verdict and reason ("Needs a Fabric or Quilt game.", "Made for Minecraft ~1.21.4."), preselects the best match, and offers to create a matching game for a Modrinth pack. The existing review and backup step still runs before anything changes.
- **Crash decoder.** When Minecraft exits with an error, LOAM reads the log and newest crash report locally and shows one plain-language card in place of the version numerals, with a one-click fix where it can apply one. It recognises: missing or wrong-version mod dependencies, mod conflicts (including OptiFine with Sodium or Iris), the same mod installed twice, mixin failures naming a mod, mods built for a newer Java, out-of-memory, memory that Windows cannot reserve, Java options rejected by Java, and graphics-driver failures. Fixes: disable the named mod and play, change memory and play, open game settings, or find the missing mod on Modrinth. Unknown crashes still say so honestly.
- **Account heads and Java Edition check.** Accounts show the Minecraft head (face and hat layer) from the profile skin, cached on disk so it appears on first paint. Microsoft accounts show "Java Edition ✓" with the time access was last confirmed; it refreshes at every launch. Offline profiles use the head from your saved skin-studio look.
- **Sign-in feels like one step.** The browser page after Microsoft sign-in is now a styled LOAM page, and LOAM comes back to the front by itself.
- `PRIVACY.md`: every host LOAM contacts and why; what stays on your PC.

### Fixed
- **Minecraft 1.17 to 1.20.4 could not start** (Java 16–20). LOAM passed the experimental flag `G1NewSizePercent` without `UnlockExperimentalVMOptions`, which those Java versions reject before the game starts. Verified with real Temurin 8, 17, 21 and 25 and a real 1.20.1 launch.
- **Minecraft 1.17 and 1.17.1 could not install.** Eclipse Temurin publishes no Java 16 JRE; LOAM now falls back to the Java 16 JDK of the same vendor.
- Removed `-XX:+AlwaysPreTouch`, which committed the whole heap before the title screen and slowed startup on low-memory PCs.
- Fabric mods that also ship a `pack.mcmeta` were rejected as "ambiguous". Mod metadata now wins. Forge and NeoForge mods get a clear message.
- Quilt mods can be imported into Quilt games; Fabric mods into Quilt games show Quilt's own dependency handling.
- Import staging folders (`.import-…`) were left inside the game folder after every import, including extracted packs. They are now removed on success and failure.
- Importing a launcher folder could merge two worlds with the same folder name. The incoming world is now renamed "(imported 2)".
- World archives with characters like `:` in the file name were accepted at review and then failed to import.
- Reviewing an import no longer hashes every file in the target game just to measure its size.
- Home showed "Playing as WhyNotDhyan" when no account was selected; Quilt games were labelled "Fabric quilt:…"; the Java chip guessed wrong for 1.19 and 1.20.5–1.20.6. It now follows Mojang's Java ranges.
- Network user-agent reported LOAM 1.4.0.
- Sheets with a text field (command palette, Offline Profile name) opened with focus on the Close button, so typing went nowhere. The field is focused again, and Enter in the palette runs the top match.
- The developer Component Catalog no longer appears in the production command palette.
- Successful background operations (import, backup, install, migration) now confirm with a toast.

### Verification
- 55 Rust tests (13 new), 19 frontend tests, TypeScript check and clippy with warnings denied.
- End-to-end on Windows 11 with real services, in a data folder whose path has spaces and "ü": Prism and CurseForge fixture instances imported (sources unchanged byte-for-byte); real Modrinth files classified; Fabric 1.21.4 installed and launched; two real crashes decoded (rejected JVM option; Iris without Sodium); the card's "Disable Iris" fix applied and the game then reached its window; vanilla 1.20.1 launched on Java 17.
- Not verified: real Prism/MultiMC/CurseForge installs (none on the test PC; fixtures follow their file formats), Microsoft sign-in with a live account, OptiFine conflict on a real launch, clean-VM installation.

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

