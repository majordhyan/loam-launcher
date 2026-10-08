# Changelog

All notable changes to LOAM are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions use [Semantic Versioning](https://semver.org/).

---

## [1.9.0] — 2026-10-08 — A calmer LOAM, with Discover, Servers and music

A redesign of the whole app around one idea: the next action should be obvious, and everything else should be easy to find. 1.9.0 is the first public release since 1.6.1, so it also includes everything from 1.7 and 1.8.

### New layout
- **Labeled navigation.** A sidebar with Home, Library, Discover, Servers, Skins and Music, then Downloads, Settings and Help, and your account at the bottom. Below 1100 pixels wide it becomes an icon rail with the same names as tooltips. `Alt 1`–`Alt 6` jump between the main places.
- **Home** leads with the selected game: its name (click to switch), its real state, one Play button, then version, loader, Java and memory. While a game installs, the same place shows measured progress, speed, time left and Cancel. Recent games, shortcuts and Minecraft news sit alongside.
- **Pixel landscapes.** Home's banner and every game cover are Minecraft-style block landscapes (meadow, birch forest, taiga, desert, cherry grove, shore) at dawn, day, dusk or night. They hold still while Minecraft runs or when motion is reduced.
- **Library.** Every game as a card in a grid or list, with search, filters, sorting, pins, tags, notes, duplicate, playtime and last played.
- **Downloads** shows what LOAM is installing, with progress from measured bytes, an honest time left, and Cancel.
- **Themes.** Dark (now the default), Light and OLED Black, all fully themed. A new LOAM mark and app icon.
- **First-run tour.** Nine short steps that point at the real controls; replay it from Help.

### Added
- **Discover.** Browse Modrinth mods, modpacks, resource & texture packs and shaders inside LOAM, and CurseForge mods once you add your own free API key in Settings › Integrations. Filter by category, Minecraft version, loader and installed state; filters are remembered.
- **Project details.** Licence, last update, downloads, categories, the project's Source, Issues, Wiki and Discord links, screenshots, and every compatible version with the recommended one marked. Choose a version before installing.
- **See what will be installed.** Before anything downloads, LOAM lists every file, its size, the folder it goes to (`mods`, `resourcepacks`, `shaderpacks`) and the required mods that come with it.
- **Shaders that work.** A shader pack brings Iris, and Sodium, when your game has neither.
- **Safe installs.** Every file is checksum-verified before it reaches your game. Cancel works at any point, and a failed or cancelled install changes nothing. Update all mods, packs and shaders at once; old versions are removed.
- **Performance pack.** One click adds Sodium, Lithium, FerriteCore, ImmediatelyFast, Entity Culling and ModernFix to a Fabric or Quilt game, where builds exist.
- **Servers.** 32 popular servers by game mode (BedWars, SkyBlock, SkyWars, Survival, Lifesteal, Prison and more), with status, players, ping and version. **Join** starts your game straight into the server and installs it first if needed. Add up to 50 of your own. "Works with offline profiles" shows servers that let an offline profile in.
- **Music.** Paste a YouTube, YouTube Music, Spotify, Apple Music or SoundCloud link: LOAM shows what it is and what will happen, and saves it. YouTube plays in LOAM through YouTube's privacy-enhanced player; Spotify, Apple Music and SoundCloud open in their own apps. Play MP3, M4A, Ogg, WAV or FLAC files from your PC with a queue, seeking and volume. One compact player lives in the sidebar and keeps playing as you move around.
- **An honest visualizer.** "Live" for files LOAM plays (real levels); "Ambient" for YouTube and other apps, whose sound LOAM can't and doesn't read. LOAM never captures your PC's sound.
- **Live Minecraft news**, release and snapshot notes inside LOAM.
- **System tray**, with Play, Stop and quick links; "Keep in tray" when you close LOAM.
- **Updates from Settings › Updates.** LOAM checks its releases, shows what's new and installs updates signed with LOAM's key.
- **Skins.** A calm 3D stage that says where your look is (a preview, saved in LOAM, or on your Microsoft account). A new default skin, LOAM Field, and a matching cape.

### Microsoft accounts
- Sign-in errors name the exact problem and its fix (no Xbox profile, Xbox terms, region, family settings, expired link and more).
- **Xbox Game Pass** accounts sign in correctly.

### Faster and steadier
- An idle LOAM does almost no work: under 1 ms of main-thread time per second on Home, Servers and Skins (was up to 323 ms).
- When Modrinth, CurseForge or Mojang limit requests or have a brief outage, LOAM retries and then says plainly what happened.
- Modpacks (`.mrpack`) that carry configs, scripts and other normal game files import correctly; unsafe paths are still blocked and named.

### Accessibility
- The automated WCAG 2.2 AA check (axe-core) reports no problems on any page, in Dark and Light.
- Every page was checked at the window sizes Windows display scaling produces from 100% to 200%, and at the 960 × 600 minimum window.

### Known issues
- The installer is not code-signed yet (SmartScreen warning).
- Installs before 1.8 can't update themselves: run the 1.9.0 installer once. Games, worlds and settings are kept.
- YouTube needs its player to stay visible while it plays; on very short windows it moves to a bar at the bottom.

---

## [1.6.1] — 2026-10-06 — Bring your games. Understand your crashes.

### Added
- **Migration Hub.** Import Prism Launcher, MultiMC and CurseForge instances as LOAM games in one step: worlds, mods, configs, resource and shader packs, screenshots, options and server lists. Fabric or Quilt loader and memory carry over. Sources are only read; account files and logs are never opened. Forge and NeoForge instances can bring their worlds and packs into a vanilla game. A failed copy is removed and never appears in your library.
- **Smart Drop anywhere.** Drop a `.jar`, `.zip`, `.mrpack` or folder anywhere on the window, even before you have a game. LOAM checks it against every game with a reason for each incompatible one, preselects the best match, and can create a matching game for a Modrinth pack.
- **Crash decoder.** After a crash, LOAM reads the log on your PC and explains the cause in place of the version number, with a one-click fix. It recognises missing or wrong-version mods, mod conflicts (including OptiFine with Sodium or Iris), duplicate mods, mixin failures, mods built for newer Java, out-of-memory, memory Windows can't reserve, rejected Java options and graphics-driver failures.
- **Account heads and Java Edition check.** Your Minecraft head (with hat layer) on every account, cached so it appears instantly. Microsoft accounts show "Java Edition ✓" with the time access was last confirmed.
- **Smoother sign-in.** A LOAM-styled browser page after Microsoft sign-in, and LOAM returns to the front by itself.
- Successful installs, imports, backups and migrations now confirm with a short message.

### Fixed
- **Minecraft 1.17 to 1.20.4 could not start.** LOAM 1.5.x passed a Java option that Java 16 to 20 reject. Verified with real Java 8, 17, 21 and 25 and a real 1.20.1 launch.
- **Minecraft 1.17 and 1.17.1 could not install**, because no Java 16 JRE exists. LOAM now uses the Java 16 JDK.
- Faster game start on low-memory PCs: the whole heap is no longer reserved before the title screen.
- Fabric mods that ship a `pack.mcmeta` were rejected as "ambiguous". Forge mods now get a clear message.
- Import staging folders were left inside game folders. Importing a launcher folder could merge two worlds with the same name. World archives with `:` in the name failed after review.
- "Playing as …" showed a placeholder name when no account was selected. Quilt games were labelled as Fabric. The Java label was wrong for 1.19 and 1.20.5+.
- Typing in the command palette and Offline Profile fields went to the Close button; Enter in the palette now runs the top result.

### Known issues
- The installer is not code-signed yet (SmartScreen warning).
- For installs upgraded from before 1.5.1, the uninstaller's optional "Delete the application data" box also deletes your games. It is off by default; leave it unticked.
- Fabric shows its own error window for missing mods before LOAM's crash card appears.

---

## [1.5.1] — 2026-10-05 — Settings and confirmation fixes

### Fixed
- Removed the **Verify this app** panel and its hanging signature-check action. Game-level diagnostics remain available and unaffected.
- Update check button and developer configuration messaging are now hidden when auto-updates are unconfigured; a plain manual-update explanation is shown instead.
- Game removal confirmation now tolerates case differences and surrounding whitespace while still requiring the complete, correct game name.
- Interface size scaling now correctly applies to pixel-sized controls (compact/large density modes).

### Changed
- Motion settings now explain the effective mode, Windows reduced-motion status, and running-game limits.
- Selecting a motion preference explicitly resets the per-session performance safeguard — **Full** mode is no longer silently downgraded for slow-frame environments.
- Stale snapshot transition names are cleared on rapid navigation; the WAAPI fallback activates correctly when no snapshot transition is active.

---

## [1.5.0] — 2026-10-05 — UI polish & branding update *(unsigned build)*

### Added
- Full motion system: tab transitions, reduced-motion awareness, and per-session performance sampling. System / Full / Reduced / Off modes persist correctly across restarts.
- Official Minecraft Java news feed with real article titles, dates, and links; offline cache prevents failures on launch without internet.
- In-app skin 3D preview: upload a PNG or look up any public player's skin; preview the LOAM custom cape; save locally.
- Keyboard navigation for version rows.
- Named game folders now include profile names and version strings; stable internal UUIDs are retained; legacy folder names migrate automatically with rollback protection.

### Changed
- Updated app wordmark, multi-size icon set, and full installer branding.
- Fixed crowded, unstyled version selection rows.
- Non-modal game inspector restores keyboard focus on close; progress bar fills animate with CSS transforms.
- Skin Studio: fixed header navigation; static preview by default; pause handling reduces unnecessary GPU rendering.

### Security
- Disabled production developer tools and browser inspect shortcuts. Input copy/paste (Ctrl+C/V) remains available in text fields.

---

## [1.5.0-rc.4] — 2026-10-04 — Microsoft account restoration

### Added
- Restored browser PKCE Microsoft / Xbox / Minecraft authentication flow with the registered public client ID.
- Java entitlement and profile checks before saving or refreshing an online session.
- Hardened OAuth callback: state, path, and duplicate-request validation; clear cancellation and rejection states exposed in UI.

### Changed
- Offline Profiles remain separate and clearly labeled.
- Official wardrobe controls restored for verified Microsoft accounts.
- Text selection and dragging disabled in interface chrome; clipboard use in text fields is preserved.

### Notes
- No desktop client secret or signing certificate is included in the build. Live authentication requires completing browser sign-in; registration alone is not Minecraft approval.

---

## [1.5.0-rc.3] — 2026-10-03 — Local profiles *(development candidate)*

- Offline-only profiles as the sole authentication path for this candidate.
- Retired saved Microsoft credentials are removed on startup.
- Preserved all existing UI, fonts, palette, and game layout.

---

## [1.5.0-rc.2] — 2026-10-02 — Custom NSIS installer theme *(development candidate)*

- Custom native NSIS theme: paper-coloured surfaces, terracotta accent controls and progress bars, LOAM L-mark icon, branded sidebar and header images.
- Installer copy accurately describes the Lite download model and pending public-release gates.
- Home screen now shows the recorded installation-check date (not "today").

---

## [1.5.0-rc.1] — 2026-10-01 — Security & integrity layer *(development candidate)*

### Added
- Settings › About: reads the running binary's Authenticode status, publisher, certificate thumbprint and SHA-256; copy-hash action.
- Selected-game checks for cached files, JAR directories, managed Java, and working space; GPU/network conditions reported separately.
- Bounded repair pass before launch (max 32 files / 256 MiB); larger repairs require manual Verify/reinstall. Download hashes verified.
- ZIP classpath directory validation before marking a game ready.
- Game Mode minimizes LOAM on detected game window; restores on process exit.

### Fixed
- Incomplete Java extraction no longer counts as "ready" without a verified-install marker.
- Launch no longer falls back to an arbitrary PATH Java that may be the wrong version.
- Skin preview: cleaned up temporary URLs, rejects stale loads, pauses when hidden, honours reduced-motion changes.
- Sound playback: bounded, cleaned up, resilient to unavailable audio devices.
- Correct binary-unit labels (MiB / GiB) throughout.

---

## [1.4.0] — prior release

- Resource-pack metadata, game-settings drawer, and editable-field context-menu improvements.

---

*Older history available on request.*
