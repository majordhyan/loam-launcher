# LOAM 1.9.0 redesign: report

Six passes, each committed separately: audit (`a2eb046`), tokens and shell (`c97d3ee`), Home (`0421587`),
Discover/Servers/Skins (`d721acd`), settings/accounts/sheets (`481819d`), verification and polish (`d7cfa73` and
the final commit). Stack unchanged: Tauri 2, React 19, TypeScript, Rust. No framework rewrite; new shared pieces live in
`src/v19/` and `src/lib/progress.ts`, and one stylesheet (`src/v19/v19.css`) puts every older component on the same
tokens.

## Evidence

- `docs/redesign/before/` and `docs/redesign/after/`: every page in dark mode at 1280×800 and 1024×700.
- `docs/redesign/compare/`: before and after side by side, per page.
- `docs/redesign/packaged/`: real-window captures of the packaged 1.9.0 `loam.exe` on this PC (125% Windows scaling),
  running on the real user data (offline profile, Vanilla Perfected, live server pings, live news).
- `docs/redesign/workflows.webp`: a short recording of Home → game picker → Discover search and details → server details →
  Skins → Music → Settings.
- `docs/redesign/perf-before.json`, `perf-pass3.json`, `perf-after.json`: idle measurements.

No recording or Dawn reference screenshots were attached to the brief, so the baseline captures stand in for them.

## Feature preservation checklist

| Feature | Where it is now | Status |
| --- | --- | --- |
| Create, install, launch, stop games | Home launch area, Library, tray, Ctrl+Enter | Kept; Home shows real state from the operation and process table |
| Install progress and cancel | Home launch area, Downloads page, sidebar Downloads % | Kept and improved (measured bytes, smoothed speed, honest ETA) |
| Crash diagnosis and actions | Home launch area (crash card) | Kept |
| Game profile (overview, mods & packs, settings, performance, worlds, backups, logs) | Manage → sheet | Kept |
| Library (grid/list, filters, pins, duplicate, notes, tags) | Library | Kept |
| Microsoft accounts, offline profiles, capes, access type | Sidebar account control → Accounts sheet | Kept; one stable entry point |
| Smart Drop, imports, Migration Hub | Drop anywhere; Home "Get more"; palette | Kept; PNG drops on Skins go to the skin preview |
| Discover (Modrinth, CurseForge with key), details, versions, dependencies | Discover | Kept; rows, prominent target, state kept across navigation |
| Mod updates, Update all, performance pack | Discover strip | Kept |
| Servers (saved + popular), live ping, join, copy, add/remove | Servers list and details panel | Kept; honest status, bounded checks |
| Skin studio (import, username lookup, classic/slim, front/back, poses, capes, save, apply to account) | Skins | Kept; explicit preview/saved/account state, drag-and-drop, reset view |
| Music: YouTube embed, own YouTube/YouTube Music links, This PC media control, visualizer | Music page + dock | Kept; reserved space, one persistent player |
| Minecraft news and patch notes | Home side column → News sheet | Kept |
| In-app signed updates | Settings › Updates | Kept |
| Tray, close to tray, hide while playing | Settings › General / Performance | Kept |
| Settings (all nine sections), storage migration, Java, notifications | Settings | Kept |
| Help, reports, diagnostics, known issues, keyboard list | Help (was Support) | Kept; keyboard list updated |
| Command palette | Sidebar search control, Ctrl+K, Ctrl+F | Kept; scope stated |
| Component catalog (dev only) | Palette in dev builds | Kept |

Removed on purpose: the 76 px icon-only rail and its Play button (Play lives on Home, in the tray and on Ctrl+Enter),
the floating music pill/card, and continuous decorative animation. No product capability was removed.

## Measurements

Idle main-thread work in headless Edge (Chromium, as WebView2), 1280×800, 5 s after each page settled:

| Page | Before | After |
| --- | --- | --- |
| Home | 238 ms/s, 164 layouts/s | 0.4–1.9 ms/s (two runs), 0 layouts/s |
| Servers | 323 ms/s, 165 style recalcs/s | 0.1 ms/s, 0 |
| Skins | 144 ms/s, 165 layouts/s | 0.1 ms/s, 0 |
| Library, Discover, Settings | ~0.1 ms/s | ~0.1 ms/s |

Packaged app (`target/release/loam.exe`, this PC, 125% scaling):

- Window visible 1.28 s after the process started (cold start, includes WebView2 start-up).
- Idle on Home: 0.31% of one CPU core over 10 s, measured across all 7 LOAM and WebView2 processes.
- Memory: 47 MB working set in the LOAM process; 453 MB across all processes (most of it is the WebView2 runtime).

Not measured: frame timing during transitions on real hardware (headless Edge has no GPU frame clock); GPU memory.

## Tests and checks performed

- Rust: `cargo clippy --all-targets -D warnings` clean; 59 unit + 17 reliability tests pass (new: HTTP error mapping,
  server ping concurrency still covered by the fake-server test).
- Frontend: `tsc --noEmit` clean; 32 node tests pass (new: progress math, eight new contrast pairs).
- Accessibility: axe-core WCAG 2.2 AA on all nine pages, dark and light: zero violations (after fixing button contrast,
  nested interactive rows and two light status colours).
- Layout: no horizontal overflow on any page at 960×600 (minimum window), 1024×700, 1366×768 and 1920×1080, with
  Interface size Default and Large. 2× device pixel ratio captured for the website kit.
- Journeys (browser preview and headless Edge):
  - Music: start YouTube on the Music page → go to Discover: the same iframe keeps playing in the sidebar's 200×200
    slot, no overlap with page content, dock row reserved below the content; at 1024 px it moves into the dock; returning
    restores the large player. No autoplay after a reload.
  - Discover: search "iris" → Home → back: query, results and scroll position (600 px) restored.
  - Servers: open details → focus inside the panel → Escape closes → focus returns to the row.
  - Settings: visualizer switch survives a reload. Alt+6 opens Music.
- Live backend QA earlier in this release: 8/8 featured servers answered; Modrinth install/update (old version deleted);
  Fabulously Optimized (49 mods) and Vanilla Perfected (77 mods) imports; Mojang news and patch notes.
- Packaged app: started, idled, and every sidebar destination captured; closed without starting Minecraft.
- Windows Defender: installer and `loam.exe` scanned, no threats.

## Build

- `artifacts/release-1.9.0/`: `LOAM-Setup-Windows-x64.exe` (5,300,264 bytes, 5.05 MiB), its updater signature,
  `SHA256SUMS.txt`, `RELEASE-NOTES.md`, `latest.json`.
- Also copied to `artifacts/LOAM-Setup-1.9.0-Windows-x64.exe` with its `.sha256`.
- Not installed over the copy on this PC and not published (the brief says not to publish).

## Remaining blockers and limits

- Publishing (and therefore testing the in-app update end to end) needs a `majordhyan` GitHub token; the source stays
  private.
- The installer is still not Authenticode-signed, so SmartScreen warns on first run.
- Microsoft sign-in, skin upload and Microsoft-only servers weren't exercised with a live account (none available).
- Starting Minecraft, cancelling a real download and recovering from a failed install were not exercised end to end in
  this pass, to avoid launching or changing the games on this PC; the states are driven by the same backend operation
  the earlier QA covered. Progress math and the failed/cancelled phases are unit-tested.
- 150% and 200% Windows scaling were checked by CSS size (960×600 minimum) and 2× density, not on physical displays at
  those settings.
- YouTube's rule that its player stays visible means YouTube music always takes a 200×200 area while it plays (sidebar or
  dock); only This PC (Spotify, YouTube Music app) can be audio-only.
