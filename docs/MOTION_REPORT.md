# LOAM 1.5.0 polish verification — 2026-10-05

## Implemented

- Repaired the unstyled version tiles: full-width rows, spacing, readable loader badges, keyboard arrow/Home/End navigation and explicit selection.
- Small motion token layer; content-only View Transitions with interruption protection and cancellable WAAPI entrance fallback. No duplicate interactive page trees or new animation packages.
- Persisted System / Full / Reduced / Off controls; OS reduction wins. Off previously selected Full. Decorative CSS stops when hidden or a game runs.
- Progress and slider fills use transforms. Drawers are non-modal, restore focus and close with Escape. Buttons have restrained press travel.
- Skin preview is static by default, renders changed textures on demand, pauses hidden/running/reduced states, and preserves optional user-started animation. Fixed dead Settings/Support/Actions buttons in Skin Studio.
- Supplied flat L logo and wordmark used for app branding; matching multi-size ICO and NSIS art regenerated.
- New games use readable name/version folders. Existing UUID folders migrate on startup with stable IDs, collision protection, link/path validation and rollback if state persistence fails. If a folder is locked the old mapping remains usable; startup retries next time.
- Official Java news uses Mojang's v2 feed titles/dates/article URLs, a 15-minute cache, offline fallback and refresh on focus/periodically while visible. No fabricated release headline.
- Production WebView devtools disabled; standard inspect shortcuts suppressed. This is not anti-debugging protection against external tools.

## Verification

- Baseline: 12 frontend tests, 32 Rust tests passed.
- After: 15 frontend tests and 39 Rust tests passed. New tests use local fixtures/mocks for interruption, preferences, malicious links, folder collision, migration/rename data preservation, write-failure rollback and running-game rejection.
- TypeScript and production frontend build pass. Cargo Clippy with all targets and warnings denied passed before final frontend-only fixes; final rerun recorded in release metadata.
- Browser preview: Home, Settings, Support and Skin Studio checked. Full/Reduced/Off controls respond, Reduced/Off persist during navigation; settings focus transfers correctly. Minimum 960×600 settings layout remains scrollable. Axe automatic checks returned no violations for checked Home/Settings/Support/Studio states after fixing page-badge contrast. This is not a complete all-mode/all-screen accessibility certification.
- A WebGL shader warning from the existing skinview3d/Three.js dependency was observed in browser preview; no JavaScript errors were reported. Renderer output remains available.
- Installer/build and native smoke-test details are recorded separately in RELEASE-1.5.0.md.

## Measured size comparison

| Measure | Before | After |
| --- | ---: | ---: |
| dist including static assets | 6,295,443 bytes | 6,396,396 bytes |
| Main JS (Vite decimal kB) | 359.73 | 363.83 |
| CSS (Vite decimal kB) | 69.62 | 73.34 |
| Lazy Skin Studio JS (Vite decimal kB) | 529.85 | 530.19 |

Total dist growth: approximately 1.60%, including supplied branding. Vite's existing >500 kB lazy Skin Studio warning remains.

Cold-start-to-usable-window, native idle CPU/RAM, integrated-GPU FPS and before/after frame timings were **not measured**. No claim of 60 fps or <5% resource regression is made. Automated tests validate behavior, not performance.

## Remaining limitations

The full requested surface specification is not completely implemented: no FLIP list reordering, sliding shared tab indicator, per-tab scroll storage, texture crossfade, animated toast timer, or complete all-mode axe matrix. WAAPI fallback is an entrance rather than a two-view crossfade, preserving the app's existing mount/state behavior. View Transition snapshots may take a rendering frame to capture; game actions are never routed through this helper.

The public release configuration gate remains blocked by absent known-issues hosting and signed updater configuration. Authenticode signing is not configured. Microsoft/Minecraft app approval and a fresh real-account multiplayer launch are not verified in this pass. This build must not be represented as fully certified or signed.

Branch: polish/motion. Pre-existing uncommitted work retained; no commits and no pushes.
