# LOAM 1.9.0: final UI, music, Discover and reliability pass

Date: 2026-10-08. Branch `release/1.6.1`. Version stays **1.9.0** (unpublished; no new release target was given).
Screenshots are in [`screens/`](screens/). The redesign before this pass is documented in [`../redesign/`](../redesign/).

## 1. Issue ledger

| # | Area | What was wrong | Fix | Evidence |
|---|------|----------------|-----|----------|
| 1 | Music | The visualizer captured the PC's audio output (WASAPI loopback) to draw bars. | Removed `audioviz.rs`, its QA example and the Win32 audio features. Spectrum now comes only from audio LOAM plays itself (files), via Web Audio's analyser. | `git show bc9221d`; `music-files-spectrum.webp` |
| 2 | Music | Spotify and Apple Music links couldn't be kept anywhere; the only Spotify route was remote control. | "Add link" with provider detection, metadata, save without playing, de-duplication; Spotify and Apple Music open in their own apps. | `music-add-link.webp`, `music-links-visualizer.webp`, `tests/links.test.mjs` |
| 3 | Music | Messages from any YouTube frame were accepted, so an old player could update the current one. | Only messages from the current frame are read (`e.source` check); one session at a time. | `src/v19/music.tsx` |
| 4 | Music | No way to play your own music without another app. | Files source: pick or drop audio files; queue, seek, volume, dock controls. | `music-files-spectrum.webp`, `dock-files-spectrum.webp` |
| 5 | All | `.field-error` had no styles, so errors looked like ordinary text. | Styled in the error colour. | `src/v19/v19.css` |
| 6 | Discover | No category filters, no way to search both sources, no way to see items that don't fit, no hide-installed, and nothing remembered. | Categories (Modrinth tags / CurseForge categories), Both (grouped), "Fits <game>", "Hide installed", removable chips, Clear all, remembered state. | `discover-*.webp` |
| 7 | Discover | "Resource packs" didn't say that texture packs are the same thing. | Renamed "Resource & texture packs". | `discover-texture-packs.webp` |
| 8 | Servers | No way to browse by purpose, and no help for offline profiles. | 18 game modes with counts; "Works with offline profiles" filter from a real login check, dated, with an honest note. | `servers-1440x900.webp` |
| 9 | Servers | axe: `aria-required-children` on the mode tab list (a non-tab button inside it). | The "more modes" toggle moved outside the tab list. | axe run below |
| 10 | Home / Library | Version backgrounds were flat illustrations. | Six pixel-block biomes × dawn/day/dusk/night, drawn at texel scale; still when motion is reduced or the game runs; no pointer parallax. | `home-1440x900.webp`, `library-1440x900.webp`, `pixel-scenes-biomes.webp` |
| 11 | Home | The animated landscape cost 27 ms of main-thread work per second when idle. | 10 fps from a timer instead of a 60 Hz animation-frame poll: 7.9 ms/s. | perf table below |
| 12 | First run | New players got no orientation. | A nine-step tour that spotlights the real controls; skip any time; replay from Help. | `first-run-tour.webp` |
| 13 | Music | The YouTube player was layered under the sidebar (a black box). | Fixed earlier in 1.9.0 (player above the sidebar, below menus and drawers). | `5b36be1` |

## 2. Music support matrix

| Service | Plays | Controls | Metadata | Spectrum | Why |
|---|---|---|---|---|---|
| YouTube | In LOAM, in YouTube's player | Play, pause, skip, volume | Title, channel, artwork (player + oEmbed) | Indicator only | The player is a sealed cross-origin frame; LOAM can't and doesn't read its sound. |
| YouTube Music | In LOAM, in YouTube's player | Same as YouTube | Same as YouTube | Indicator only | Same as YouTube. |
| Files on this PC | In LOAM | Play, pause, skip, seek, volume | File name | **Yes** (Web Audio analyser) | LOAM plays the sound itself. |
| Other apps on this PC | In their app | Play, pause, skip (Windows media controls) | What Windows reports | Indicator only | LOAM sends commands only; it never listens to other apps. |
| Spotify | Opens in Spotify (app if installed, else web player) | In Spotify | Title, artwork (oEmbed) | No | Spotify only allows its own players; no audio analysis. |
| Apple Music | Opens in Apple Music | In Apple Music | Name from the link | No | MusicKit needs an Apple developer token LOAM doesn't have. |

Rules kept:
- YouTube's player is always visible at 200 × 200 px or larger while it plays, and it never plays hidden.
- Nothing plays until the player presses Play.
- Starting one source stops the other.

Visualizer modes:
- **Off.**
- **Minimal:** follows play/pause only.
- **Spectrum:** real levels for files. Other sources show the Minimal indicator.

Smoothing is `alpha = 1 − exp(−dt/τ)`, with τ = 45 ms rising and 220 ms falling, drawn at about 30 fps and paused while hidden.

Link handling:
- Hosts are matched exactly: `youtube.com`, `www.`/`m.`/`music.youtube.com`, `youtu.be`, `open.spotify.com`, `music.apple.com`.
- Spotify short links (`spotify.link`, `spoti.fi`) are followed in Rust, at most 5 hops, and each hop must stay on a short-link or music host.
- Credentials, ports, and non-https schemes are refused.
- Artwork is shown only from the services' image hosts. The CSP lists them.

## 3. Discover filter matrix

| Filter | Modrinth | CurseForge | Both |
|---|---|---|---|
| Content type (Mods, Modpacks, Resource & texture packs, Shaders) | Yes | Yes (modpacks: LOAM can't install CurseForge packs yet, and it says so) | Yes |
| Fits the chosen game (version + loader) | Yes (facets) | Yes (`gameVersion`, `modLoaderType`) | Yes |
| Categories | Yes, several (all must match) | Yes, one at a time (the picker says so) | Not offered: each service has its own list, and the button explains this |
| Hide installed | Yes (on loaded results) | Yes | Yes |
| Sort | Relevance, downloads, follows, updated, newest | Same, mapped to CurseForge's sort fields | Same |
| Release channel | Chosen when installing (newest release first; the version list labels betas and alphas) | Same | Same |
| Restricted downloads | n/a | Files whose author blocks third-party downloads are marked "CurseForge only" | Same |

Other behaviour:
- **Rate limits and outages** get two retries with backoff; `Retry-After` is honoured up to 5 s. After that the message is plain.
- **Without a CurseForge key**, Both shows Modrinth only and says so.
- **Remembered between visits:** source, type, sort, Fits and Hide installed. Categories reset when the source or type changes.

## 4. Measurements

**Idle main-thread work** (headless Edge, Chromium like WebView2, 1280 × 800, demo data; `perf.mjs`):

| Page | Before this pass | After |
|---|---|---|
| Home (animated landscape) | 27.1 ms/s | **7.9 ms/s** |
| Library, Discover, Servers, Skins, Settings | 0.1 ms/s | 0.1 ms/s |

**Accessibility** (axe-core, WCAG 2.2 AA, every page): no violations after fix #9.

**Responsive layout** (`overflow.mjs`, every page): no horizontal overflow and no clipped controls at 900 × 600, 1100 × 720, 1440 × 900 and 1920 × 1080. See `all-pages-900x600.webp`.

**Tests:**
- `npm test`: 42 pass, 0 fail. New this pass: link parsing (7) and spectrum maths (3).
- `cargo clippy --all-targets -D warnings`: clean.
- `cargo test musiclinks`: pass.

**Live checks:**
- **Files spectrum:** a generated 6 s WAV (70 Hz tone plus a 300 Hz→6 kHz sweep) dropped on Files. The bass lit the low bands and the sweep peak moved through the middle. Playback continued in the dock on Home.
- **oEmbed:** YouTube and Spotify return titles and artwork.
- **Spotify short links:** they answer with 307 redirects to `open.spotify.com`.

## 5. Not done, and why

- **Spotify inside LOAM:** not done. The Web Playback SDK needs Premium, a registered developer app and OAuth. Links open in Spotify instead.
- **Apple Music inside LOAM:** not done. MusicKit needs an Apple developer token. Links open in Apple Music.
- **Files queue across restarts:** not kept. It lasts until LOAM closes; keeping it would need broader file-system access.
- **CurseForge in Discover:** the live path (Both, categories) wasn't exercised in this session because no CurseForge key was available. The Modrinth path was verified live.
- **Offline-profile labels:** a point-in-time check (2026-10-08). Servers whose answer was uncertain are left unlabelled.
- **Code signing:** the Windows installer isn't Authenticode-signed. Updates are verified with LOAM's updater key.
- **Release:** not published (by instruction).
