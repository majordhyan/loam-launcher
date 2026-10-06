# Revamp scorecard — 2026-10-03

Counts are a lexical prioritization proxy, not measured cognitive complexity or coverage.
Includes tests in source files. Bug risk and dependency boundaries override the numeric order.

| Module | Lines | unwrap/expect | Branch tokens | Score |
|---|---:|---:|---:|---:|
| src\App.tsx | 3194 | 0 | 92 | 3654 |
| src-tauri\src\imports.rs | 793 | 16 | 104 | 1633 |
| src-tauri\src\commands.rs | 688 | 21 | 63 | 1423 |
| src-tauri\src\engine.rs | 649 | 18 | 63 | 1324 |
| src-tauri\src\skins.rs | 629 | 5 | 74 | 1099 |
| src-tauri\src\network.rs | 351 | 29 | 27 | 1066 |
| src\InstallSheet.tsx | 825 | 0 | 45 | 1050 |
| src\ui.tsx | 816 | 0 | 27 | 951 |
| src-tauri\src\catalog.rs | 540 | 1 | 48 | 800 |
| src\SkinStudio.tsx | 643 | 0 | 23 | 758 |
| src-tauri\src\diagnostics.rs | 310 | 9 | 26 | 620 |
| src-tauri\src\accounts.rs | 335 | 8 | 23 | 610 |
| src-tauri\src\storage.rs | 202 | 2 | 26 | 372 |
| src-tauri\src\updates.rs | 181 | 4 | 18 | 351 |
| src-tauri\src\maintenance.rs | 137 | 4 | 21 | 322 |
| src\ComponentCatalog.tsx | 299 | 0 | 3 | 314 |
| src\sound.ts | 269 | 0 | 9 | 314 |
| src-tauri\src\model.rs | 146 | 5 | 5 | 271 |
| src-tauri\src\windows_perf.rs | 221 | 0 | 7 | 256 |
| src-tauri\src\lib.rs | 25 | 2 | 11 | 120 |
| src\perf.ts | 67 | 0 | 9 | 112 |
| src\api.ts | 83 | 0 | 1 | 88 |
| src\main.tsx | 57 | 0 | 3 | 72 |
| src\lib\math.ts | 16 | 0 | 5 | 41 |
| src-tauri\src\main.rs | 5 | 0 | 0 | 5 |
| src\vite-env.d.ts | 2 | 0 | 0 | 2 |

Next: engine/catalog transaction and metadata boundaries, then commands/model state and network purpose allowlists. Preserve fixture behavior with test-only legacy shims. Skin and audio changes in this pass are targeted fixes, not an architecture rewrite. Full mutation/coverage/duplication analysis remains unmeasured.
