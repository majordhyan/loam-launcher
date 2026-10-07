# LOAM 1.8 redesign: audit and baseline (pass 1)

Evidence: the running app in the Vite preview with the shots sample data (dark theme), source review,
and the installed 1.8.0 build. No recording or Dawn reference screenshots were attached to the brief,
so the baseline screenshots in `docs/redesign/before/` (1280×800 and 1024×700) stand in for them.

## Structure

- **Shell:** `App.tsx` (3,360 lines) holds all app state and renders a 76 px icon-only `Rail`, a custom
  `TitleBar`, the floating `MusicDock`, and one page at a time (`page` state: home, library, discover,
  servers, skins, settings, support, dev). Leaving a page unmounts it.
- **Sheets/drawers** (`sheet` state): accounts, offline, install (create game), details (game profile:
  overview, mods & packs, settings, performance, worlds, backups, logs), import, import review, smart
  drop, migrate hub, migrate storage, delete, stop, report, palette (Ctrl+K), news, what's new,
  licenses, clean cache, remove content.
- **Settings tabs:** general, home & sound (scene), integrations, accounts, storage & Java, performance,
  notifications, updates, about.
- **Backend:** one `dispatch` op table (`commands.rs`) plus updater commands. Progress is a single
  `Progress { phase, message, done, total, files, speed }` snapshot pushed with `state-changed`; `done`
  and `total` are bytes for installs and modpack downloads. The tray, media sessions, audio levels,
  server pings, news and updates run in Rust.

## Feature inventory

| Area | Status | Notes |
| --- | --- | --- |
| Create/install games (Vanilla, Fabric, Quilt) | Working | Install sheet; byte progress; cancel via `cancel` op |
| Launch / stop, crash diagnosis | Working | Crash card with actions; running state from the process table |
| Library (grid/list, filters, pin, duplicate) | Working | |
| Game profile (7 tabs, backups, logs, notes, tags) | Working | |
| Microsoft accounts, offline profiles | Working | Error mapping covered by tests; no live MS account to test with |
| Smart Drop, imports, Migration Hub | Working | .mrpack fix verified on two live packs |
| Discover (Modrinth, CurseForge with key) | Working | Search sequenced against stale responses; **state lost on navigation** |
| Mod updates, Update all | Working | Old versions deleted after the new one lands |
| Servers (27 featured + saved) | Working, with issues | **One thread per ping (27 at once)**; a failed ping shows as "offline"; re-pings on every visit; pulsing dots |
| Skins studio | Working, with issues | **Renders every frame while idle**; decorative landscape stage; previewed / saved / applied states not clearly separated |
| Music (YouTube embed, This PC media) | Working, with issues | **Floating card and pill cover page content**; no reserved space |
| Visualizer (WASAPI loopback) | Working | |
| News (Mojang feeds) | Working | |
| Tray, close to tray, hide while playing | Working (fixed in 1.8) | |
| In-app updates | Working, unverified end to end | Needs a published signed release |
| Downloads view | **Missing** | Progress appears only on Home and the rail Play button |
| Support, reports, diagnostics | Working | |
| Settings persistence | Working | localStorage for UI preferences, `state.json` for data |

## Visual and interaction problems (baseline screenshots)

1. Home: the 96 px version number and the landscape dominate; Play is comparatively small; account
   picker and "Sign in with Microsoft" compete inside the hero.
2. The music pill and card float over content on every page (covers Join buttons, list rows, settings).
3. Icon-only navigation hides LOAM's breadth; Help and Settings are anonymous icons.
4. Discover cards pack description, metadata and Install into small tiles; the target game is a small
   chip in the header.
5. Terracotta is used for page-title dots, primary buttons, tiles, selected chips, the Discover card,
   the Support card and the rail: it stops meaning "the main action".
6. Page titles are 48–56 px with decorative dots and eyebrow lines; greetings are oversized.

## Performance baseline (headless Edge, 1280×800, `docs/redesign/perf-before.json`)

Idle main-thread work measured over 5 s after each page settled:

| Page | Task ms/s | Layouts/s | Style recalcs/s | JS heap |
| --- | --- | --- | --- | --- |
| Home | 238 | 164 | 164 | 31 MB |
| Library | 0.1 | 0 | 0 | 34 MB |
| Discover | 0.1 | 0 | 0 | 67 MB |
| Servers | 323 | 0 | 165 | 47 MB |
| Skins | 144 | 165 | 165 | 64 MB |
| Settings | 0.1 | 0 | 0 | 59 MB |

Causes: continuous decorative CSS animations (server "live" pulses animate box-shadow, which is not
compositor-only; landscape drift, stars, motes, meteors), and the skinview3d models rendering every
frame while idle on Home and Skins.

## Engineering findings

- Discover: request sequencing and detail-fetch guards are correct; page state should survive
  navigation.
- Servers: bound ping concurrency; keep last known values with a timestamp; say "No answer" rather
  than "Offline"; pause refresh when the page or window is hidden.
- Music: playback already persists in the shell; the YouTube player must stay visible at 200×200 px
  or more while playing (YouTube API Services policy), so it needs a reserved, non-overlapping slot.
- Progress: speed is an average since the start; compute a time-weighted moving average on the
  client from byte deltas, show ETA only when meaningful, indeterminate when the total is unknown.
- Skins: render on demand; dispose textures on replace (skinview3d handles its own on `loadSkin`).
