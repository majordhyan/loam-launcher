# LOAM 1.6.1: release notes

**Bring your games. Understand your crashes.**

| | |
|---|---|
| Installer | `artifacts/LOAM-Setup-1.6.1-Windows-x64.exe` |
| Size | 4,792,696 bytes (4.57 MiB) |
| SHA-256 | `1FC21CACB73C41449A8D9B51466626D8324F1A5645C7C34A1AB3A328DABF23B5` |
| Signing | **Not signed** (no Authenticode certificate). Windows SmartScreen will show an unknown-publisher warning. |
| Built from | commit `1e5cb15` on branch `release/1.6.1` |
| Platform | Windows 10/11 x64, per-user NSIS installer, WebView2 |
| Updater | Not configured. Users install new versions manually. |

Full list of changes: [CHANGELOG.md](../CHANGELOG.md). Privacy: [PRIVACY.md](../PRIVACY.md).

## What's new

1. **Migration Hub.** One-step import of Prism Launcher, MultiMC and CurseForge instances. Worlds, mods, configs, packs, screenshots, options and server lists move over; the Fabric or Quilt loader and memory carry over. Originals are only read. Forge/NeoForge instances bring their worlds and packs into a vanilla game.
2. **Smart Drop everywhere.** Drop a mod, pack, world or instance folder anywhere on the window. LOAM checks it against every game, explains why a game can't take it, picks the best match, and can create a matching game for a Modrinth pack. Review and backup still come before any change.
3. **Crash decoder.** After a crash, a plain-language card replaces the version numerals, with a one-click fix such as "Disable Iris and play".
4. **Microsoft account polish.** Your Minecraft head and a "Java Edition ✓" check with the time it was last confirmed. A styled sign-in page, and LOAM returns to the front by itself.

## Important fixes

- **Minecraft 1.17–1.20.4 could not start in LOAM 1.5.x.** Java rejected a JVM option LOAM passed. Fixed and verified with a real 1.20.1 launch on Java 17.
- **Minecraft 1.17/1.17.1 could not install** (no Java 16 JRE exists). LOAM now uses the Java 16 JDK.
- Imports: Fabric mods with `pack.mcmeta` were rejected; staging folders were left behind; folder imports could merge same-named worlds.
- Home said "Playing as WhyNotDhyan" with no account; wrong Java and loader labels; palette and text-field focus.

## Verification (this release)

| Check | Result |
|---|---|
| Rust unit + integration tests | 55 passed (13 new) |
| Frontend tests, TypeScript, production build | 19 passed; typecheck and build passed |
| Clippy, warnings denied | Passed |
| JVM flags against real Temurin 8 / 17 / 21 / 25 | Accepted by all four (1.5.1 flags rejected by Java 17) |
| `qa_features` end-to-end (real Mojang, Fabric, Modrinth, Adoptium) in a data path with spaces and "ü" | Passed: fixture Prism and CurseForge instances imported, sources unchanged byte-for-byte; real Modrinth jars classified; Fabric 1.21.4 installed; two real crashes decoded (rejected JVM option; Iris without Sodium); the "Disable Iris" fix applied and the game reached its window; vanilla 1.20.1 on Java 17 reached its window |
| Installer on this Windows 11 PC | Upgrade 1.5.1 → 1.6.1, launch, keyboard-driven Migration Hub, uninstall, reinstall: all exit 0. All 131 user data files byte-identical after each step. No orphaned WebView processes after close. |
| UI review | Crash card, Smart Drop and Migration Hub checked at 960×600 and 1280×800, light and dark theme |

**Measured on this PC (Windows 11, release build, idle on Home):** window shown 1.4 s after start; `loam.exe` 33 MB working set (8 MB private); the full process tree, including Microsoft WebView2, 392 MB working set (197 MB private); idle CPU about 0 %.

## Known limitations and unverified

- **Unsigned installer.** Needs an Authenticode certificate before wide distribution.
- **Microsoft sign-in was not tested with a live account** in this release; there was no authorised test account. The profile head, "Java Edition ✓" and refocus code paths are built on the existing, unchanged token flow.
- **No real Prism, MultiMC or CurseForge install on the test PC.** The Migration Hub was tested with fixtures that follow each launcher's file format (`instance.cfg` + `mmc-pack.json`; `minecraftinstance.json`). MultiMC is portable, so only common folders are scanned automatically; others use "Choose a folder".
- The OptiFine conflict rule is unit-tested only; no real OptiFine launch.
- Fabric shows its own error window for dependency errors; LOAM's card appears after that window is closed.
- No clean-VM installation test; tests ran on the development PC.
- Updates are manual (no signed update feed is configured).

## Launch copy for loamlauncher.com (checked against the measurements)

> **Tired of bloated, ad-heavy launchers that crawl on startup?** LOAM is a fast, Swiss-designed Minecraft launcher built for players who value speed, privacy and calm.
>
> - **Switch in a minute.** Bring your Prism, MultiMC and CurseForge instances over with their worlds, mods and settings. Your originals stay untouched.
> - **Drop anything, anywhere.** Mods, packs and worlds go to the right game, and you'll see why one won't fit.
> - **Crashes, explained.** "Iris needs Sodium. Add Sodium, or disable Iris." One click, and you're back in.
> - **Private by design.** No ads, no telemetry, no companion apps. See exactly what LOAM connects to (publish PRIVACY.md on the site and link it here).
> - **Light on your PC.** A 4.6 MB installer. Opens in under two seconds.

Do not claim "idles under 50 MB": that is true of LOAM's own process (33 MB) but not of the whole app, which with Windows' WebView2 used about 392 MB on the test PC. Claim "native Rust core" or "starts in under two seconds" instead. Avoid "verified safe mods"; LOAM checks compatibility, not safety.
