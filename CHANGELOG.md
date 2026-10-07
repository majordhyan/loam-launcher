# Changelog

## 1.8.0 — 2026-10-07 (unsigned build)

### New
- **Servers.** A new page (Alt+4) with 27 popular community servers, among them Hypixel, CubeCraft, Wynncraft, MCC Island, Mineplex, Complex Gaming, Jartex, BlocksMC, EarthMC, Lifesteal SMP, Minemen Club and 2b2t. Filter by type (Survival, Minigames, Skyblock, PvP, Prison, Towny, Anarchy…), search, and sort by players or name. These servers aren't run by Mojang or LOAM. Each card shows the server's icon, message of the day, players online, version and ping, refreshed every minute. **Join** starts a game straight into the server (Quick Play on 1.20 and newer, the older join arguments before that) and installs the game first if it isn't ready. Pick which game to join with, copy an address, or add your own servers (up to 50). Addresses with a DNS SRV record (like `minehut.com`) resolve correctly. Online servers need a Microsoft account; LOAM says so when an offline profile is selected.
- **System tray.** LOAM has a tray icon. Hover it to see the selected game, whether it's running or installing, and the account. Its menu has Open LOAM, Play, Stop Minecraft, Library, Discover mods, Servers, Skins, Settings and Quit. "Hide to tray" in Settings › General now works. Set "When you close LOAM" to **Keep in tray** to keep it running in the corner. Quit from the tray waits while a game or download is running.
- **Music player.** A small player in the bottom corner, on by default and switched off in Settings › Home & sound.
  - **YouTube** plays the cozy chill mix, or any YouTube or YouTube Music playlist or video link you paste, through YouTube's own privacy-enhanced player, on loop. It needs an internet connection; nothing is downloaded.
  - **This PC** shows and controls whatever is playing on this PC (Spotify, YouTube Music in the app or a browser, and other music apps) with cover art, play/pause and skip, through Windows' media controls. No login or account linking. Buttons open Spotify or YouTube Music.
  - **Minimize keeps it playing.** YouTube becomes a compact 200-pixel player (the smallest YouTube allows while playing); This PC becomes a small pill with play/pause and skip. Only hiding the YouTube player completely stops it.
- **Music visualizer.** Minimal bars that move with whatever this PC is playing. LOAM measures only how loud each pitch is, on this PC; nothing is recorded or sent. It runs only while the player is on screen and LOAM isn't minimized. Switch it off in Settings › Home & sound.
- **Minecraft news, live.** Home's news card now shows Mojang's latest Java news, releases and snapshots with their pictures, refreshed every 10 minutes and whenever you come back to LOAM. It opens a news page with every recent article and patch note; release and snapshot notes open right inside LOAM. New releases (and, if you choose, snapshots) are announced, per Settings › Notifications.
- **Update LOAM from Settings.** Settings › Updates checks LOAM's GitHub releases, shows what's new, and installs the update with a progress bar; LOAM restarts by itself. An update is installed only if its signature matches LOAM's key. LOAM also checks once a day at startup and tells you when an update is ready (switch this off in the same place). This works from 1.8.0 onward.
- **Update all mods at once.** After "Check for updates" in Discover, **Update all** updates every mod, resource pack and shader in one go, with progress. Old versions are now deleted once the new one is in place, instead of piling up in `cache/replaced`.
- **Modrinth and CurseForge logos** mark where each project comes from in Discover.

### Microsoft accounts
- Sign-in errors now name the exact problem and its fix instead of "Xbox authorization was declined." Covered cases:
  - no Xbox profile yet;
  - Xbox terms not accepted;
  - a region where Xbox Live isn't available;
  - adult verification;
  - a child account outside a Microsoft family;
  - Family settings blocking online play;
  - an expired or reused sign-in link;
  - a Microsoft session that was signed out;
  - Minecraft rejecting the app registration;
  - too many attempts.
- **Xbox Game Pass** accounts sign in correctly. Microsoft's store list can be empty for Game Pass, and LOAM used to reject those accounts; it now accepts any account with a live Java profile.
- The account manager shows how Java access was confirmed (Java Edition, Xbox Game Pass or Java profile), the capes on the profile with the active one first, and the profile ID. These sync at every sign-in and launch.

### Fixed
- **Modpacks (.mrpack).** Importing a modpack such as "Vanilla Perfected" stopped with "Pack contains a path outside supported game content." Packs may now carry any normal game files: configs, options, server lists, scripts, KubeJS/OpenLoader data, and others. LOAM still blocks unsafe paths, programs and scripts, LOAM's own files, and launcher account files, and the error now names the offending file. Quilt packs and packs that need a newer Fabric or Quilt loader import correctly. Forge and NeoForge packs explain that they aren't supported yet instead of failing later.
- **Hide to tray** didn't work with big modpacks: LOAM gave up waiting for the game window after 15 seconds, before a heavily modded game shows it. It now waits as long as the game is starting. The first time LOAM hides, a Windows notification says it's in the system tray (Windows 11 tucks new tray icons under ^). Double-clicking the tray icon opens LOAM too.
- **Skins:** in dark mode, or with motion reduced, the 3D model could disappear after the window or theme changed. It now redraws after every resize.
- **Shaders and resource packs** zipped inside an extra folder (common with downloads) are repackaged automatically so the game sees them. A data pack dropped as a resource pack now explains that data packs go into a world's `datapacks` folder.

### Improved
- **Animated background.** Moving the mouse over Home now moves the hills in smooth depth (one eased animation loop instead of restarting CSS transitions on every mouse movement, which stuttered). The sun drifts the other way, and a soft light follows the pointer. Shooting stars cross the night sky. Everything still holds still while a game runs or when motion is reduced.
- **Installer.** New artwork with a dusk landscape, drawn at twice the size so it stays sharp on high-DPI displays. The welcome page explains where LOAM keeps your games (`AppData\Roaming\LoamLauncher`) and that no administrator prompt is needed.
- **Feels like a desktop app.** Browser shortcuts no longer do web-page things: reload, print, find, page zoom, view source, Alt+← and the mouse back button are off (Ctrl+F opens LOAM's search). Slim scrollbars, focus rings only when you use the keyboard, no spell-check squiggles in search boxes, and images can't be dragged out.
- **Type and icons.** Headings now use Geist, like the rest of the interface, for a cleaner, calmer look; icons are drawn with a finer line; numbers line up.
- Keyboard: Alt+1 to Alt+5 open Home, Library, Discover, Servers and Skins.

## 1.7.1 — 2026-10-06 (unsigned build)

### Microsoft accounts
- **Mojang has approved LOAM's app ID for the Minecraft API**, so "Sign in with Microsoft" can now complete the last step (Minecraft login), which used to stop with HTTP 403. You get online servers, Realms and your own skin and cape. When an offline profile is selected, Home shows **Sign in with Microsoft** next to the account picker.

### Fixed
- **Window frame.** The plain Windows title bar is gone. LOAM draws its own slim, draggable bar with minimal minimize, maximize/restore and close icons that follow the theme; double-click it to maximize. Close still waits while a game or download is running.
- With Interface size set to Compact or Large, full-window sheets (Accounts, Create a game) filled only part of the window. They now fill it at every size.
- **Skins:** recent skins show as a small front-on figure of the character instead of the raw texture file. In dark mode, the selected Front/Back and Idle/Walk/Wave buttons had white text on white; their text is now always dark.
- **Game profile:** all seven tabs are always visible. Backups and Logs no longer hide off the edge.
- **Game profile › Performance** now describes exactly what LOAM sets at launch. It previously mentioned string deduplication, which LOAM doesn't use, and quoted a 20 ms pause target and file-check timings that weren't accurate for every game. "Reset memory and Java options to recommended" now really resets them; before, it only showed a message.
- Remaining ALL-CAPS labels ("Check for updates", "Check game", "Java Edition ✓") are in sentence case.
- Build tooling: updated `source-map-js` (a dev-only Vite dependency) to fix a published advisory; the shipped app was not affected.
- Discover: the "Install into" game menu opened behind the toolbar and only closed when the mouse left it. It now opens on top and closes on any click outside it or Esc.
- Search boxes in Discover and Library drew a second box inside themselves.

### Remastered
- **Every screen now uses the 1.7 design.** Install, Settings, Support, Skins and each game's profile were rebuilt. Sheets, drawers, tabs, fields, toggles, segmented controls, menus, buttons, facts and notices share one look in light, dark and OLED Black.
- **Animated background.** Home follows the time of day: dawn, day, dusk and a starry night with a full moon. Clouds drift, the sun's rays turn slowly, haze settles between the hills, birds cross by day and fireflies come out at night. Pick a time in Settings › Home & sound, or leave it on Auto. As before, it all holds still while a game runs or when motion is reduced.
- **Game profile.** Opening a game shows its cover with name, game type and Java version, a Play or Stop button, and playtime, last played, mods, worlds and memory at a glance, plus its tags and notes. Tabs have icons and plain names: Overview, Mods & packs, Settings, Performance, Worlds, Backups and Logs.
- **Create a game.** A live cover previews the game as you choose. Vanilla, Fabric and Quilt are cards that say what each is for, and greyed-out ones say why. The steps read Choose, Review, Install. Version rows show game-type icons instead of letters, and the Java estimate uses Mojang's real version ranges.
- **Settings.** A section menu with icons and short descriptions; each section sits on its own card.
- **Support.** Four clear ways to get help, plus this installation's details, keyboard shortcuts, known issues and your saved reports.
- **Skins.** The 3D model stands on a landscape stage with glass controls; labels are in plain words.
- **Words.** Labels across the app are in sentence case instead of ALL CAPS.

## 1.7.0 — 2026-10-06 (unsigned build)

### New
- **Discover.** Browse Modrinth mods, modpacks, resource packs and shaders inside LOAM. Results show only what fits the game you pick (its Minecraft version, and Fabric or Quilt for mods). Every project has a details panel with screenshots, description, licence and versions. **Install** adds the newest compatible version with every required mod; for example, Iris brings Sodium. Each file is checksum-verified and opened before it reaches the game, and nothing is written until every file has passed. A modpack downloads and goes through Smart Drop, which creates a matching new game.
- **Mod updates.** "Check for updates" asks Modrinth which mods, resource packs and shaders in a game have newer versions for it, then updates one or all. The old file is kept in `cache/replaced`.
- **Performance pack.** One click in Discover adds Sodium, Lithium, FerriteCore, ImmediatelyFast, Entity Culling and ModernFix to a Fabric or Quilt game. Each is added only if it has a build for that game, and anything already there is skipped. These mods change rendering, memory and loading, not gameplay.
- **CurseForge as a second source** once you add a CurseForge API key in Settings › Integrations (free at console.curseforge.com; stored in Windows Credential Manager). Mods whose authors only allow website downloads are named, not installed. CurseForge modpacks aren't supported yet; existing CurseForge instances still import through Migration Hub.
- **A new Home.** Your own skin in 3D (it waves hello, walks when you launch, and can be turned by dragging) stands in front of a slowly drifting landscape drawn for LOAM. The selected game, its PLAY button and your account sit on top, with your recent games below and shortcuts to Discover, Migration Hub and Smart Drop alongside. In Settings › Home & sound, choose a still landscape or your own picture instead.
- **Library.** Every game as a card with its own cover, in a grid or a list. Search by name, version or tag, filter by Vanilla, Fabric, Quilt or pinned, sort by recently played, name, most played or newest, and pin favourites. Duplicate a game and open its settings from its card.
- **Playtime and last played.** LOAM records when each game last started and how long you played. Both show in the Library, on Home and in the game's settings. Duplicates start at zero.
- **Notes and tags** for every game, in its settings. Tags are searchable in the Library.
- **Memory presets** in game settings: Low RAM PC, Vanilla, Modded, Heavy pack and Shaders. A preset is never more than 75% of the PC's memory. LOAM's own tuned Java flags still apply.
- **Side rail** for Home, Library, Discover, Skins, Help and Settings (Alt+1 to Alt+4), with a Play button that shows install progress.
- **OLED Black** theme.
- **New look.** A new LOAM mark and app icon, Bricolage Grotesque for headings (OFL), and new cards, buttons, menus and motion. Decorative motion stops while a game runs and follows the Motion setting and Windows' reduced-motion setting.
- **Interface sounds, redone.** Softer clicks, a chime when something is ready, a short swell on launch and a low tone on errors, all made on your PC. Volume control in Settings › Home & sound.

### Fixed
- **The uninstaller's "Delete application data" could delete games.** Installations from before LOAM 1.5.1 keep their games in `%LOCALAPPDATA%\app.loam.launcher`, and a moved library keeps its location file there. In either case the uninstaller now removes only the WebView cache.
- A sound device that fails to start can no longer throw from a button click.
- Quilt games now find Quilt *and* Fabric mods. The old link import only looked for Fabric.

### Verification
- 64 Rust tests, 19 frontend tests, TypeScript check, clippy with warnings denied.
- End-to-end against live Modrinth (`examples/qa_discover.rs`), all passing:
  - search;
  - Iris with Sodium added as a dependency;
  - a resource pack and a shader;
  - Lithium into a Quilt 1.21.1 game, and mods refused for Vanilla;
  - an old Sodium found and updated, with the old file kept;
  - a Fabulously Optimized pack downloaded and recognised by Smart Drop;
  - all six performance-pack mods into Fabric 1.21.4;
  - notes and tags saved and validated.
- Not verified: CurseForge (no API key on the test PC), and a full clean-VM install.

## 1.6.2 — 2026-10-06 (unsigned build)

### Fixed
- **Microsoft Defender quarantined `loam.exe` from 1.6.1 as `Trojan:Win32/Bearfoos.A!ml`.** This is a false positive: `!ml` marks a machine-learning verdict, and the file is byte-for-byte our build (verified). The model reacts to what the app does, and 1.6.1 started three hidden helper programs, a pattern malware uses: `powershell.exe -NoProfile -NonInteractive -Command` (signature check), `reg.exe add` (GPU preference) and `taskkill /F` (Stop). 1.6.2 starts no hidden helpers. Each one is now a direct Windows call inside LOAM:
  - signature check: `WinVerifyTrust`, offline, no UI;
  - "use the high-performance GPU for Java": the same per-user `UserGpuPreferences` value Windows Settings writes, via `RegSetValueExW`;
  - Stop: `TerminateProcess` on the game process LOAM started, after the graceful close.
  The only program LOAM starts is Java, to run Minecraft.
- The app now carries publisher details in its file properties: company "LOAM", copyright, product and version.

### Verification
- 59 Rust tests (4 new: unsigned and signed files, GPU preference written and read back from HKCU, process termination), 19 frontend tests, TypeScript check, clippy with warnings denied.
- Microsoft Defender (signatures as of 2026-10-06) finds no threats in the 1.6.2 installer or the installed `loam.exe`; installed over 1.6.1 and ran with no detection. The 1.6.1 installed `loam.exe` is still detected until Microsoft clears it (submission pending).

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

