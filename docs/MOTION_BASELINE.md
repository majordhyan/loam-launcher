# Baseline — 2026-10-05

Existing 1.5.0-rc.4 working tree, before this polish pass.

- npm run build: PASS; Vite build portion 1.11 seconds (single run, not startup).
- npm test: 12 passing.
- dist total: 6,295,443 bytes including existing static assets.
- Main JS: 359.73 kB, CSS: 69.62 kB; lazy Skin Studio JS: 529.85 kB (Vite decimal sizes).
- Rust baseline: 21 unit + 11 integration tests passed through scripts/dev-shell.ps1; cargo is not on the default shell PATH.
- Cold start to usable native window: not measured.
- Idle CPU / total process-tree memory: not measured.
- Native WebView frame timing: not measured.

Inventory: App.tsx conditionally renders pages and settings tabs; ui.tsx owns sheets, drawers, controls; styles.css/remaster.css/tokens.css overlap existing animations; SkinStudio is lazy-loaded; sound.ts already handles mute and bounded voices; perf.ts supplies opt-in local measurements. Existing Off motion button incorrectly maps to Full.
