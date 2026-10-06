# LOAM v1.4.0: Master Brief (remastered from the v1.3.0 prompt)

**What this is:** the single source of truth for the next release. It replaces `LOAM_v1.3.0_Master_Brief.md`. It is rewritten around what the engineering changelog shows was **actually built and fixed** in v1.1.0 → v1.3.0, the bugs that surfaced, and a new headline goal: **a Full Edition installer that ships every redistributable resource LOAM needs, so nothing that commonly causes errors has to be downloaded or guessed at runtime.**

**Why v1.4.0:** the changelog records v1.3.0 as already built and shipped (installer `LOAM_1.3.0_x64-setup.exe`, 4.39 MiB). The next release is therefore **v1.4.0**. If you would rather ship this as v1.3.1, change the version in one place (section 15) and nothing else in this document needs to change.

**Attach alongside:** `LOAM_Launcher_Remaster_Brief_v2.md` (rules that never change), `LOAM_Final_Polish_Prompt_v3.md` (performance, catalog, math, scaling; referenced by section), `LOAM_UI_Update_Prompt_v1.md` (UI; referenced by section).
**Precedence on conflict:** this document → UI Update Prompt → Polish Prompt v3 → Remaster Brief v2. Safety, honesty, and privacy rules from Brief v2 are never overridden.

---

## 1. Release goals

| Tier | Work | Rule |
|---|---|---|
| **P0, release-blocking** | (a) **Full Edition + Seed system** (section 7). (b) **Environment Doctor + Launch Insurance** (section 8). (c) **Install transactions, verified store, and bug-class elimination** (section 9, 6.3). (d) Zero warnings, a much deeper test suite (section 14). (e) Real verification of every "done" claim in the changelog (section 2). | Must ship |
| **P1** | Launch-stall diagnosis and fixes; hardware-tuning hardening; legacy-version verification (1.0 → 1.16.5); UI Update; audio and context-menu fixes | Each ships only if its tests pass |
| **P2, feature-flagged** | News and notifications; Quick Play; Worlds shelf; NeoForge and Forge; component updates of the seed; Mesa compatibility renderer | A flag turns on only when its tests pass. Disabled is not a failure |

**Non-goals (unchanged):** CurseForge packs, a mod store, dependency solving, hosted accounts, telemetry, automated mod repair, FPS or rendering mods, **and bundling any Mojang-owned file** (client JARs, assets, Mojang-hosted libraries). See 7.2.

**What "no errors" means.** Software cannot be proven bug-free. The release bar is concrete: every automated check passes; zero warnings from the compiler, clippy, TypeScript, and ESLint; zero `console.error`, unhandled rejections, or panics in end-to-end runs; every error a user can reach has a stable code, a plain message, and a next action; a clean-VM test passes on Windows 10 and 11, **including with the network disabled after install** (Full Edition). Anything not verified on real hardware is listed as unverified in the release report.

---

## 2. Status ledger: verify, don't trust

The changelog claims the work below is done. **The agent must verify each claim with a test or a reproducible check before building on it,** and record the result in `docs/v1.4.0/LEDGER.md`.

| Area | Claimed in | How to verify | Known gap to close |
|---|---|---|---|
| Managed Java (Temurin 8 / 17 / 21 / 25 under `cache/runtimes/`) | 1.1.0 | For every catalog tier version: resolver returns the right major; `java -version` runs; `java --list-modules` contains the required modules (10.2) | Version→Java mapping is range-based; make it metadata-first (section 10). Confirm the runtime is a **full JRE** (not a jlink-stripped or "headless" image) |
| Skin Studio, Mojang texture resolver, default skins | 1.1.0 | Component and E2E tests; invalid-PNG fuzz cases | None known |
| Hardware tuning (`windows_perf.rs`): GPU preference, EcoQoS opt-out, priority, fixed heap | 1.2.0 | Read the registry values back; call `GetProcessInformation` on a running game; benchmark before/after (v3 section 6) | Per-runtime GPU keys and cleanup (11.2); fixed-heap policy (11.3); no measured numbers exist yet |
| Offline UUID and arm geometry (`accounts.rs`) | 1.2.0 | Golden tests for UUIDs and model | None known |
| Diagnostics redaction (`diagnostics.rs`) | 1.2.0 | Canary tests: tokens, bearer keys, usernames, paths never appear in exports | Extend to Doctor reports and traces |
| Catalog 26.3 → 1.0, offline-first caches, filter chips (`catalog.rs`, `InstallSheet.tsx`) | 1.2.1 | Legacy tier launches (12.2); offline start shows the cached catalog | Legacy engine is unverified below 1.8.9 |
| Fabric and Quilt install and launch | 1.3.0 | **Tier-2 sweep over every offered combination** (9.5) and Tier-1 real launches | Fixed only for two reported cases; no sweep exists |
| Context menu removed, Web Audio SFX, easing curve, tabular numerals | 1.3.0 | UI tests; manual | Right-click now also blocks copy and paste in text fields (13.1); audio hardening (13.2) |
| 27 of 27 tests (16 unit, 11 reliability) | 1.3.0 | Run them; measure coverage | Far too thin for the surface area (section 14) |

---

## 3. Findings from the changelog analysis

Each finding is a required action. Items F1 to F3 are the **root causes behind the two reported crashes**; the fixes shipped in 1.3.0 were correct for those cases, but the underlying classes of bug are still open.

| # | Finding | Required action |
|---|---|---|
| **F1** | `size: 0` was used as "unknown size". Launch verification then compared a real 701,826-byte file against `0` (LOAM-FF91-23). The shipped patch special-cases zero, but a **sentinel value is still the data model.** | Replace sentinels with `Option<u64>`; record the **actual** size and hashes of every installed file in the lockfile; add a zero-byte and truncated-archive check (9.3). |
| **F2** | A path validator (`safe_relative`) was applied to a **non-path** string (`"fabric:0.19.5"`), so every loader install failed (LOAM-0C5F-93). | Introduce **newtypes with their own grammars** (`SafeRelPath`, `LoaderSpec`, `MavenCoord`, `VersionId`). A validator can never be applied to the wrong kind of value because the types differ (6.3). |
| **F3** | Both fixes were verified against the reported cases only. | A **sweep test** installs and verifies every Fabric and Quilt combination the metadata offers (9.5), and fixture tests cover every coordinate shape in every frozen profile. |
| **F4** | A global `contextmenu` `preventDefault` also removes right-click **Cut / Copy / Paste** in text inputs (skin name, player-name lookup, version search). | Allow the native menu only on editable fields and selected text, or ship a small custom menu (13.1). |
| **F5** | Java major is chosen from hard-coded version ranges (1.0–1.16.5 → 8, 1.17–1.20.4 → 17, 1.20.5–1.21.x → 21, 26.x → 25). Mojang's version JSON carries `javaVersion.majorVersion`, and some snapshots in the middle of those ranges differ. | **Metadata first**, range table only as the fallback for old JSONs that lack the field (section 10). |
| **F6** | The runtime is described as "headless". Minecraft needs `java.desktop` (ImageIO, AWT), and TLS to Mojang servers needs the EC crypto module (`jdk.crypto.ec` on older JDKs). A stripped runtime fails in confusing ways. | Verify the **module set** of every runtime on provisioning and in Doctor (10.2). Never ship a jlink-stripped image. |
| **F7** | GPU preference is written for "the managed `javaw.exe`" but there are four runtimes; stale keys can survive runtime updates or uninstall. LOAM's own WebView2 process may also wake the discrete GPU on hybrid laptops. | One registry entry **per runtime path**, reconciled on every runtime change, removed on uninstall; evaluate pinning LOAM's UI to the integrated GPU (11.2). |
| **F8** | "Ready · verified" can be shown while a library is bad (the 0-byte case). | "Verified" means the **launch dry run** passed (8.3), not just "install finished". |
| **F9** | `-Xms = -Xmx` is applied universally. On small-RAM machines it removes elasticity; on large heaps it commits more than needed. | Policy by RAM tier, validated by benchmark (11.3). |
| **F10** | Maven Central hosts were added to the network allowlist globally. | Scope allowlists **per purpose** (`loader-libs`, `runtime-download`, `catalog`, `news`) and require a hash sidecar for every file fetched from them (9.4). |
| **F11** | The installer is 4.39 MiB because everything else (Java runtimes, loader libraries, possibly WebView2, VC++ runtime) is fetched or assumed at first run. Each is an error source: blocked CDN, slow network, antivirus, missing runtime. | **Full Edition** (section 7). |
| **F12** | Report IDs like `LOAM-0C5F-93` identify an occurrence; they are not stable error codes. | Keep report IDs, **add** stable error codes (`LOAM-INS-0201`) that map to fixes, and make both appear in the UI and the report (6.4). |
| **F13** | Many reported failures (missing Java, corrupt file) end with "Reinstall to repair." | **Launch Insurance**: classify the failure and auto-repair the safe classes once, visibly (8.4). |
| **F14** | Classic Windows causes of "game won't start" are not checked anywhere: missing VC++ runtime, GDI-generic OpenGL (no GPU driver, RDP, some VMs), JVM unable to reserve the heap, clock skew breaking TLS, blocked hosts, Controlled Folder Access, over-long paths. | **Environment Doctor** (section 8). |
| **F15** | No sound volume control; the `launch` sound is a 42–65 Hz sub-bass rumble that small speakers cannot reproduce and can surprise users. | Levels (Off / Subtle / Full), a polyphony cap, suspend while a game runs (13.2). |

---

## 4. Operating contract for the coding agent

1. **Read before writing.** Map the repo; write `docs/v1.4.0/CURRENT_STATE.md`. Names below (`engine.rs`, `catalog.rs`, `network.rs`, `storage.rs`, `windows_perf.rs`, `accounts.rs`, `diagnostics.rs`, `skins.rs`, `InstallSheet.tsx`, `SkinStudio.tsx`, `sound.ts`, `tokens.css`, `styles.css`) come from the changelog; confirm them against the real tree.
2. **Plan, then build.** `docs/v1.4.0/PLAN.md` (milestones, tasks, risks, tests), `PROGRESS.md`, `docs/DECISIONS.md`, and a new **`docs/GOTCHAS.md`** (one line per bug class and the guard that prevents it).
3. **Truth over memory.** For every external API (Mojang manifests, Fabric and Quilt meta, Maven, Adoptium, Modrinth, Windows APIs, Tauri 2, crates), look at the live source or current docs, freeze the response as a fixture, and code against the fixture. If something cannot be verified, say so and write a spike test.
4. **Characterize, then refactor.** Pin current behavior with tests before moving code. Never mix a behavior change into a restructuring commit.
5. **Small commits.** One concern each; `verify` passes before every commit; max about 400 changed lines per commit unless it is mechanical.
6. **Run the real commands** and report: *Ran / Passed / Not run / Unverified.* Never claim a check passed that was not run.
7. **Fix the class, not the instance.** After every bug: (a) failing test, (b) fix, (c) a guard that makes the *class* impossible (type, lint, or generalized test), (d) a line in `GOTCHAS.md`.
8. **Architecture is enforced by tools, not by prose** (6.5).
9. **Stop and ask only** for: secrets or signing keys, branding or legal decisions, real-hardware access, or irreversible design forks. Otherwise decide, record, and continue.
10. **Hard constraints:** no telemetry; no hidden network calls (every host allowlisted in config, per purpose); no silent system changes; one explicit consent for any elevated action; honest account labels; hash verification on every download; atomic writes; never delete a user's worlds or files without a specific confirmation; **never bundle Mojang-owned files.**
11. **Feature flags** (`loam.config.json → features.*`) guard every P2 item. A flag turns on only when its tests pass.

---

## 5. Milestones and exit criteria

| # | Milestone | Exit criteria |
|---|---|---|
| **M0** | Foundation: `AGENTS.md`, `verify.ps1`, CI, `clippy.toml` bans, baselines, `LEDGER.md` skeleton, fixtures harness | `verify` runs end to end; baseline numbers recorded (startup, launch timeline, memory, bundle size, installer size, test count, warning count) |
| **M1** | Verify the ledger; bug sweep; zero warnings | `LEDGER.md` complete; `BUG_SWEEP.md`; every finding F1–F15 has a ticket or a fix |
| **M2** | Newtypes and bug-class guards (F1, F2, F3, F5, F6, F10); regression tests for the four reported crashes | All four crash reports (LOAM-5F5B-4B, LOAM-D365-7F, LOAM-0C5F-93, LOAM-FF91-23) have permanent regression tests |
| **M3** | Architecture refactor, error model, typed IPC (section 6) | Behavior unchanged (characterization tests green); module layout in place; no `unwrap/expect/panic` in non-test code |
| **M4** | Install transactions, journal, verified store, download engine (section 9) | Chaos tests pass (kill mid-install, disk full, file locked, truncated download) |
| **M5** | **Seed system and Full Edition** (section 7) | Full installer builds reproducibly; first run works with the network disabled (Java, WebView2, loader libraries available); size report within budget |
| **M6** | **Environment Doctor and Launch Insurance** (section 8) | Every Doctor check has a unit test with a fake environment and a real-machine verification; auto-repair classes tested |
| **M7** | Runtime resolver, legacy engine verification, Fabric/Quilt sweep (sections 10, 12, 9.5) | Support matrix generated from real runs |
| **M8** | Launch-stall diagnosis, hardware-tuning hardening, Game mode (section 11) | `docs/perf/diagnosis.md` with evidence; benchmark report with real numbers |
| **M9** | UI Update, audio and context-menu fixes (section 13) | UI Update Prompt definition of done passes |
| **M10** | P2 features behind flags | Each flag's tests pass or the flag stays off |
| **M11** | QA matrix, release engineering (sections 14, 15) | Definition of done (section 17) |

After each milestone: `verify` green, `PROGRESS.md` updated, an adversarial review pass (16.3), tag `m<N>-done`.

---

## 6. Engineering foundation

### 6.1 Target structure, mapped from the current files

| Current (from changelog) | Target |
|---|---|
| `engine.rs` | split into `services/install/`, `services/launch/`, `services/java/` |
| `catalog.rs` | `services/catalog/` + `loaders/{vanilla,fabric_like,fabric,quilt}` |
| `network.rs` | `infra/http/` (allowlist per purpose, retry, ETag cache, size caps) |
| `storage.rs` | `infra/fs/` (atomic write, safe rename, long paths) + `infra/store/` (versioned JSON) |
| `windows_perf.rs` | `infra/windows/perf.rs` (Win32 behind traits) + `services/perf/` (policy) |
| `accounts.rs`, `skins.rs`, `diagnostics.rs` | `services/auth/`, `services/skins/`, `services/diagnostics/` |
| *(new)* | `services/seed/`, `services/doctor/`, `services/insurance/`, `domain/` (pure types) |
| `InstallSheet.tsx`, `SkinStudio.tsx` | `features/install/`, `features/skins/` |
| `sound.ts`, `tokens.css`, `styles.css` | `lib/sfx/`, `styles/tokens.css`, `styles/base.css` |

Rules: commands in `commands/` are thin (validate → call a service → map the error). `domain/` has no I/O. `infra/` has no business rules. Win32 calls sit behind traits so logic is testable on CI. No file over about 400 lines unless it is data.

### 6.2 Typed contracts end to end

Generate TypeScript types from Rust (`tauri-specta` or `ts-rs`) so commands, events, and payloads share one source of truth; drift fails the build. Validate every **external** JSON at the boundary (tolerant of extra fields, strict on required ones, typed errors).

### 6.3 Bug-class elimination in code (reference sketches; compile and adapt)

**Never use a sentinel for "unknown".**

```rust
// BAD: size: u64 where 0 means "unknown"
// GOOD:
pub struct FileSpec {
    pub rel: SafeRelPath,
    pub size: Option<u64>,         // None = unknown until downloaded
    pub sha1: Option<Sha1Hex>,
    pub sha256: Option<Sha256Hex>,
    pub origin: Origin,
}

pub fn verify_file(spec: &LockedFile, actual_len: u64) -> Result<(), VerifyError> {
    if actual_len == 0 { return Err(VerifyError::ZeroBytes); }
    if actual_len != spec.size { return Err(VerifyError::SizeMismatch { want: spec.size, got: actual_len }); }
    Ok(())
}
// LockedFile.size is a plain u64: the lockfile only ever contains measured values.
```

**One type per kind of string, each with its own grammar.**

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SafeRelPath(String);
impl SafeRelPath {
    pub fn parse(s: &str) -> Result<Self, PathError> {
        // normalize '\' to '/'; reject: empty, absolute, drive letter, UNC, any ".." or "." component,
        // NUL, ':' (except never allowed), reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9),
        // trailing space or dot in any component, component > 128 chars, total > 200 chars.
    }
    pub fn join_under(&self, root: &Path) -> PathBuf { root.join(&self.0) }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LoaderKind { Fabric, Quilt /* , Forge, NeoForge behind flags */ }

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoaderSpec { pub kind: LoaderKind, pub version: LoaderVersion }
impl FromStr for LoaderSpec {          // "fabric:0.19.5"
    type Err = LoaderSpecError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (k, v) = s.split_once(':').ok_or(LoaderSpecError::Shape)?;
        Ok(Self { kind: k.parse()?, version: LoaderVersion::parse(v)? })   // ^[0-9A-Za-z][0-9A-Za-z.+_-]{0,63}$
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MavenCoord { group: String, artifact: String, version: String, classifier: Option<String>, ext: String }
impl FromStr for MavenCoord {          // group:artifact:version[:classifier][@ext]
    type Err = MavenError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (core, ext) = match s.split_once('@') { Some((c, e)) => (c, e), None => (s, "jar") };
        let p: Vec<&str> = core.split(':').collect();
        let (g, a, v, c) = match p.as_slice() {
            [g, a, v] => (*g, *a, *v, None),
            [g, a, v, c] => (*g, *a, *v, Some(*c)),
            _ => return Err(MavenError::Shape),
        };
        // each segment must match ^[A-Za-z0-9_.+-]+$ ; group additionally split on '.'
        Ok(Self::new_validated(g, a, v, c, ext)?)
    }
}
impl MavenCoord {
    pub fn rel_path(&self) -> SafeRelPath {   // group/with/slashes/artifact/version/artifact-version[-classifier].ext
        /* build and parse through SafeRelPath so the traversal guard always applies */
    }
}
```

**Property and table tests for the above** (examples): every coordinate in every frozen Fabric and Quilt profile parses; coordinates with `@jar`, classifiers, trailing-slash repo URLs, and 3-part and 4-part forms; `LoaderSpec` accepts `fabric:0.19.5` and rejects `fabric:../x`; `SafeRelPath` rejects `..`, `C:\x`, `\\srv\share`, `CON`, trailing dots.

### 6.4 Error model

`thiserror` enums per area. `AppError { code, kind, message_key, detail_redacted, report_id }`:

- **`code`** is stable (`LOAM-INS-0201`) and maps to a fix. **`report_id`** (`LOAM-0C5F-93` style) identifies one occurrence and stays in reports.
- No `unwrap`, `expect`, `panic!`, `todo!`, `unimplemented!` in non-test code (clippy deny).
- Every Tauri command returns `Result<T, AppError>`. The UI maps `code` to copy (what happened, what to do, one action). A panic hook writes a crash marker and a redacted report; React has an error boundary per route and a global rejection handler that reports a coded error and never leaves a blank screen.
- `docs/error-codes.md` is generated from the enum.

### 6.5 Architecture enforced by tools

`clippy.toml`:

```toml
disallowed-methods = [
  { path = "std::fs::write",          reason = "use infra::fs::atomic_write" },
  { path = "std::fs::rename",         reason = "use infra::fs::safe_rename (retries on sharing violations)" },
  { path = "std::fs::remove_dir_all", reason = "use infra::fs::remove_tree (guards roots, uses Recycle Bin where applicable)" },
  { path = "std::process::Command::new", reason = "use infra::process::spawn" },
  { path = "reqwest::get",            reason = "use infra::http::Client (allowlist, retries, caps)" },
  { path = "reqwest::Client::new",    reason = "use infra::http::Client" },
]
```

TypeScript: ESLint `no-restricted-imports` and `no-restricted-syntax` ban direct `fetch` to external origins, `localStorage` for app data, and `console.log`; `dependency-cruiser` enforces `features/* → components/ui, lib` but never feature-to-feature imports; `knip` removes dead exports.

### 6.6 State, storage, migrations

All persisted data is versioned JSON written atomically (temp + flush + fsync + rename) with a schema number and one rolling backup. **Migration 1.3.x → 1.4.0:** read old `install.json` and `game.json`, add the lockfile fields (9.2), recompute sizes and hashes for existing installs in the background, never delete the old file until the new one verifies. Idempotent; a newer schema opens read-only with a clear message. Test with fixtures from real 1.2.x and 1.3.0 data.

### 6.7 `verify` and CI

`scripts/verify.ps1`, fail on first problem:

```powershell
$ErrorActionPreference = "Stop"
function Step([string]$name, [scriptblock]$body) {
  Write-Host "== $name"
  & $body
  if ($LASTEXITCODE -ne 0) { throw "$name failed ($LASTEXITCODE)" }
}
Step "rust fmt"        { cargo fmt --all -- --check }
Step "rust clippy"     { cargo clippy --workspace --all-targets --all-features -- -D warnings }
Step "rust test"       { cargo test --workspace --all-features }
Step "rust deny"       { cargo deny check }
Step "rust audit"      { cargo audit }
Step "rust unused"     { cargo machete }
Step "ts typecheck"    { npm run typecheck }
Step "ts lint"         { npm run lint -- --max-warnings=0 }
Step "ts test"         { npm test -- --run }
Step "ts dead code"    { npx knip }
Step "ts layers"       { npx depcruise src --config .dependency-cruiser.cjs }
Step "types drift"     { npm run gen:types; git diff --exit-code -- src/lib/ipc/generated }
Step "bundle budget"   { node scripts/check-bundle.mjs }       # initial JS <= 150 KB gzip
Step "error codes"     { cargo run -q -p xtask -- check-error-codes }
Step "e2e smoke"       { npx playwright test --reporter=line }  # fails on console.error / unhandled rejection
Write-Host "verify: OK"
```

CI runs the same script on `windows-latest`; a scheduled job runs the live-contract and sweep tests (14). A pre-commit hook (lefthook) runs the fast subset.

---

## 7. Full Edition and the Seed system (P0 centerpiece)

### 7.1 Goal and editions

Ship **two editions from one codebase:**

| | **LOAM Lite** (today's installer, about 4–5 MB) | **LOAM Full** (new, expected roughly 400–650 MB; measure) |
|---|---|---|
| Purpose | Fast download; fetches what it needs | **Everything redistributable is already on disk**; first run needs no downloads for LOAM itself |
| WebView2 | Evergreen bootstrapper (needs internet if missing) | Offline installer embedded (runs only if the runtime is missing) |
| Java runtimes | Downloaded on demand | **Bundled** (8, 17, 21, 25, x64, full JRE) |
| VC++ runtime | Detect and guide | **Bundled**, installed only if missing, with consent |
| Fabric / Quilt loader files | Downloaded on install | **Bundled** (loader jars, shared libraries, per-version intermediary and hashed jars) |
| Catalog and loader indexes | Fetched | **Snapshot bundled** (instant first run, works offline for browsing) |
| Doctor / Launch Insurance / Known-issues DB | Yes | Yes (same code) |
| Optional Mesa software renderer | No | Bundled (P2, off by default) |

**Honest limit:** Minecraft's own files (client JAR, assets, Mojang libraries) always come from Mojang's servers at install time. Full Edition removes every *other* download and error source. It does **not** make a brand-new Vanilla install possible offline, and the UI must say so plainly ("Minecraft files download from Mojang when you press Install").

### 7.2 What is bundled, and what must never be

| Component | Est. size (measure!) | Licence and rule |
|---|---|---|
| Eclipse Temurin **JRE** 8, 17, 21, 25 (x64) | about 40–55 MB each | GPL-2.0 with Classpath Exception; ship licence and notice files; pin by SHA-256 |
| WebView2 offline installer (via Tauri `offlineInstaller`) | about 130–170 MB | Microsoft redistribution terms; installs only if missing |
| VC++ 2015–2022 x64 redistributable | about 18–25 MB | Microsoft redistribution terms; install only if missing |
| Fabric loader and Quilt loader (latest 3 stable each) + their shared libraries | about 10–30 MB | Open-source licences; notices generated |
| Fabric `intermediary` jars (release versions 1.14 → latest), Quilt `hashed` jars | about 60–120 MB | Open-source; pinned by hash |
| Metadata snapshots: Mojang manifest and release version JSONs, Fabric/Quilt game and loader indexes, Adoptium release index | about 3–6 MB compressed | Metadata only, with provenance recorded. **If terms are unclear, do not bundle; fall back to the network** |
| Mesa software OpenGL (opt-in) | about 20–40 MB | MIT; experimental |
| Fonts, default skins, known-issues DB, licence notices | under 5 MB | Existing assets |

**Never bundle:** Minecraft client or server JARs, game assets, any Mojang-hosted library, mods, or Fabric API (downloaded on demand with hash verification). This is a legal line, not a preference.

### 7.3 Seed layout

Few, large files (fast to build, fast to scan with antivirus, easy to verify):

```
<install dir>\seed\
  seed-manifest.json        (signed; lists every component and hash)
  seed-manifest.sig
  runtimes\temurin-8-x64.zip   temurin-17-x64.zip   temurin-21-x64.zip   temurin-25-x64.zip
  loaders\fabric-libs.zip      quilt-libs.zip
  meta\catalog-snapshot.zip
  prereq\vc_redist.x64.exe
  optional\mesa-x64.zip
  NOTICES\THIRD_PARTY_NOTICES.txt
```

`seed-manifest.json` (schema sketch):

```json
{
  "schema": 1,
  "seed_version": "2026.10.1",
  "built_at": "2026-10-xxT00:00:00Z",
  "components": [
    {
      "id": "runtime-temurin-21-x64",
      "kind": "java-runtime",
      "major": 21,
      "file": "runtimes/temurin-21-x64.zip",
      "size": 0,
      "sha256": "…",
      "source": "https://api.adoptium.net/…",
      "licence": "GPL-2.0-with-classpath-exception",
      "modules_required": ["java.base", "java.desktop", "java.logging", "jdk.crypto.ec", "jdk.unsupported", "jdk.zipfs"]
    }
  ]
}
```

(All values come from the build script, never hand-edited. `size` above is a placeholder.)

### 7.4 Build pipeline

- **`seed.lock.json`** pins every component by URL, size, and SHA-256. The build never resolves "latest".
- **`scripts/build-seed.ps1`:** download into `.seed-cache/` (reused between builds) → verify SHA-256 (fail on any mismatch) → assemble `src-tauri/resources/seed/` → generate `seed-manifest.json` and THIRD_PARTY_NOTICES → sign the manifest (ed25519; public key compiled into the app; private key never in the repo) → print a size report → **fail if total exceeds the budget** (set in `seed.budget.json`, start at 900 MB) or any component lacks a licence entry.
- **`npm run seed:update`** is the only way to change pins; it produces a reviewable diff (old hash → new hash, size change, licence change).
- **Commands:** `npm run build:lite` and `npm run build:full`.

Tauri 2 configuration for Full (`src-tauri/tauri.full.conf.json`, merged with `tauri build --config …`; verify key names against current Tauri 2 docs):

```json
{
  "bundle": {
    "resources": { "resources/seed/": "seed/" },
    "windows": {
      "webviewInstallMode": { "type": "offlineInstaller", "silent": true },
      "nsis": { "installMode": "currentUser", "compression": "none" }
    }
  }
}
```

`tauri.lite.conf.json` keeps today's settings (bootstrapper, no seed). Benchmark NSIS `compression` (`lzma` vs `zlib` vs `none`): the seed files are already compressed, so `none` may build faster with little size difference. Check the NSIS 2 GB limit and the release-hosting file-size limit before committing to a size.

Also add `.cargo/config.toml` so LOAM's own executable does not depend on the VC++ runtime being present:

```toml
[target.x86_64-pc-windows-msvc]
rustflags = ["-C", "target-feature=+crt-static"]
```

### 7.5 Runtime: the resource provider chain

Every resource (Java runtime, loader library, catalog) is obtained through one chain. **The rest of the app never knows where a file came from.**

```rust
#[async_trait]
pub trait ResourceProvider: Send + Sync {
    async fn ensure(&self, id: &ComponentId, ctx: &Ctx) -> Result<Ensured, AppError>;
}
// Order: Store (already verified on disk) → Seed (extract + verify) → Network (download + verify) → Err(coded)
pub struct Chain(Vec<Arc<dyn ResourceProvider>>);
```

**Seeding algorithm (idempotent and crash-safe):**

1. If the target directory exists with a `.verified` marker matching the component hash → return.
2. Extract the seed archive into `<dest>.tmp-<uuid>` (low priority thread, bounded I/O).
3. Verify the archive SHA-256 **before** extraction (stream-hash while reading), then verify the extracted result (for runtimes: required modules, `java -version`; for libraries: per-file hashes from the manifest).
4. Write `.verified`, then **atomic rename** to the final directory (`safe_rename` with sharing-violation retries).
5. Record the result in `seed-state.json`; on any failure delete the temp directory and fall through to the next provider.

**Scheduling:** extract **on demand first** (the runtime for the selected game comes before anything else), then in the **background at idle and low priority** until everything is prepared, so a Full install never makes the first launch wait. `Settings → Storage & Java → Prepare everything now` runs the queue immediately. Progress is real and quiet ("Preparing LOAM · 3 of 7"). The queue pauses while a game is running or on battery saver.

**Startup cost rule:** startup never hashes the seed. It verifies the (small) signed manifest only; component hashes are checked on first use and in Doctor's deep check.

### 7.6 Integrity and supply chain

- The manifest is **signed** (ed25519); verify the signature at startup and refuse a seed that does not verify (fall back to the network path and say so in Doctor).
- Pinned hashes mean a compromised CDN cannot change what ships.
- P2: **component updates.** A newer Temurin patch release can be delivered as a signed component update from an allowlisted host, without a new installer. The same signature check applies.
- Generate an SBOM (`cargo cyclonedx`, `cyclonedx-npm`) and THIRD_PARTY_NOTICES; include them in the app (About → Licences).

### 7.7 Installer behavior

- **Per-user install** (no admin) to `%LOCALAPPDATA%\Programs\LOAM`; the seed lives under it, read-only.
- VC++ runtime and (on machines without it) WebView2 are installed by the installer or the app **only when missing**, with one disclosed elevation prompt if needed. Never silent, never repeated.
- Upgrade in place from Lite or an older Full: user data (games, worlds, settings) is untouched; the seed is replaced; seeded caches are reconciled by hash (no re-extraction if the component is unchanged).
- **Uninstall:** removes the program and seed; asks whether to remove caches (default: keep worlds, games, settings); **removes every registry value LOAM wrote** (per-runtime GPU keys, 11.2); never touches worlds.
- If NSIS reports a corrupt installer, show a plain message pointing to the published SHA-256 and a re-download link.

### 7.8 Size and performance guardrails

- A bigger installer must not slow the app: seed files are never read at startup; startup budgets in v3 section 1 still apply and are re-measured for Full.
- Report installer size, installed size, and first-run time for Lite and Full in `docs/perf/report.md`.
- Test Full on a **network-disabled clean VM**: install, first run, Doctor, install a Fabric game's loader files, launch is attempted up to the point where Mojang downloads are required. Everything else must succeed offline.

---

## 8. Environment Doctor and Launch Insurance (P0)

### 8.1 Doctor: checks that find the usual causes of errors before the user does

A `Check` trait, every Win32 or network call behind a trait so checks are unit-testable with a fake environment:

```rust
pub enum Severity { Info, Warn, Fail }
pub enum CheckResult { Pass(String), Warn { detail: String, fix: Option<FixAction> }, Fail { detail: String, fix: Option<FixAction> }, Skipped(String) }

#[async_trait]
pub trait Check: Send + Sync {
    fn id(&self) -> &'static str;
    async fn run(&self, env: &dyn Env) -> CheckResult;
}
```

| Check | How | Typical fix |
|---|---|---|
| **WebView2 runtime** | query installed version (or Tauri's webview version) | Full: run the embedded offline installer (consent); Lite: link |
| **VC++ 2015–2022 x64 runtime** | registry `HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\X64` (`Installed`, `Bld`) plus a `LoadLibrary` probe for `vcruntime140_1.dll` | Full: run bundled redist with one elevation prompt (consent) |
| **OpenGL capability** | spawn `loam.exe --probe-gl` (a short-lived helper that creates a hidden window and context and prints `GL_RENDERER` and `GL_VERSION` as JSON); 5 s timeout so a bad driver cannot hang LOAM | If the renderer is "GDI Generic" or the version is below the game's minimum: explain (no GPU driver, RDP, or VM) and offer Update-driver guidance; P2: the Mesa compatibility renderer |
| **GPU driver age** | DXGI adapter driver date | Warn if very old; link to the vendor |
| **Java runtimes present and sane** | for each needed major: file exists, `java -version` runs, `--list-modules` contains the required set (10.2), arch is x64 | Re-seed or re-download that runtime |
| **Heap feasibility** | `java -Xmx{n}m -version` with the chosen heap (about 100–200 ms), compare with `GlobalMemoryStatusEx` (physical, available, **commit limit**) | Lower the heap automatically with an explanation; warn if the page file is disabled |
| **Disk space** | `GetDiskFreeSpaceExW` on the data drive vs a threshold | Plain message with numbers |
| **Path hazards** | data path length, non-ASCII, OneDrive-redirected folders, reserved names | Suggest the default short root |
| **Antivirus or sharing-violation interference** | after seeding or install, any file missing or zero-byte where one was just written; rename retries exhausted | Explain quarantine; show the folder to allow; never automated |
| **Controlled Folder Access** | write test on the data directory; read the CFA registry state if accessible | Explain how to allow LOAM |
| **Clock skew** | compare an HTTP `Date` header from a probe with local time; more than a few minutes off breaks TLS validation | Link to Windows time sync |
| **Network reachability per allowlisted host** | HEAD with 3 s timeout; classify DNS failure, TLS failure, timeout, 403, redirect to a captive portal | Tell the user which host is blocked and by what kind of failure |
| **Windows version and long-path setting** | `RtlGetVersion`; registry `LongPathsEnabled` | Informational |
| **Hybrid GPU and hybrid CPU detection** | DXGI adapters; CPU topology | Informational for the tuning panel |

**Behavior:** runs quietly after first paint on first run and after every upgrade, before the first launch after an install, after any launch failure that matches a class, and on demand (`Settings → Diagnostics → Run checks`). Also exposed as `loam.exe --doctor --json` and `--selftest` for CI and support. The UI is a calm, grouped checklist ("12 ready · 2 need attention"), each item with `Fix now` (safe actions only) and a redacted `Copy report`. Results are cached with a timestamp and invalidated by relevant changes.

### 8.2 Safe Mode and crash-loop breaker

`loam.exe --safe-mode`: disables Game mode, tuning, sounds, animations, and background tasks, so a problem can be isolated. If LOAM crashes during startup twice in a row, it starts in Safe Mode automatically and explains why.

### 8.3 Launch dry run (what "Verified" means)

After install and before the first Play (and after any Repair): build the real launch plan and verify, with no game window, that every classpath entry exists, is non-zero, and (for JARs) has an intact archive directory; natives are present; the Java runtime passes its module check; the heap probe passes; and, for Fabric and Quilt, the loader main class is present in the loader JAR. Only then show `Ready · Verified today`.

### 8.4 Launch Insurance (visible, bounded self-repair)

```text
preflight (cheap) → spawn → watch first ~30 s
if the game exits early or LOAM detects a known failure:
    classify with the Known-Issues DB
    SAFE auto-actions, at most ONE retry, always announced:
      · missing / corrupt / zero-byte file  → repair only the bad files → relaunch
      · Java mismatch or runtime unhealthy  → re-resolve the runtime → relaunch
      · heap reservation failure            → lower the heap → relaunch
    NEVER auto-touch: user mods, worlds, settings, accounts
    otherwise → show cause + one action (Open mods / Repair / View log / Doctor)
```

**Known-Issues DB** (`known-issues.json`, bundled in the seed, updatable later, matched locally, never sent anywhere):

```json
{ "id": "ki-zero-byte-library",
  "match": { "kind": "loam-error", "code": "LOAM-HSH-0102" },
  "title": "A game file is incomplete",
  "cause": "A download was interrupted or a security tool removed a file.",
  "actions": ["repair"], "auto": { "safe": true, "action": "repair" } }
```

Other `match.kind` values: `log-regex`, `exit-code`. Examples to ship: WGL/GLFW "driver does not appear to support OpenGL" → Doctor GL guidance; "Could not reserve enough space for object heap" → lower heap; Fabric "Incompatible mod set" and missing dependency → Open Mods; `UnsupportedClassVersionError` → Java mismatch.

---

## 9. Install transactions, the verified store, and Fabric/Quilt hardening (P0)

### 9.1 Transactions and the journal

Every install, repair, loader update, and seed extraction is a **transaction** with a write-ahead journal (`journal/<tx>.jsonl`, append-only, fsync on each line):

```jsonl
{"tx":"9f3a","op":"begin","game":"g-123","kind":"install","ts":"…"}
{"tx":"9f3a","op":"stage","dir":"staging/9f3a"}
{"tx":"9f3a","op":"file","rel":"libraries/net/fabricmc/intermediary/1.21.4/intermediary-1.21.4.jar","size":701826,"sha256":"…"}
{"tx":"9f3a","op":"commit"}
```

- Work happens in `staging/<tx>/` on the **same drive** as the destination so the final move is an atomic rename.
- Commit order: libraries into the shared store → profile and lockfile → `game.json` **last**, so a half-finished install never looks installed.
- **Recovery at startup:** scan journals with no `commit` or `rollback`; delete staging, remove any partial game directory whose `game.json` was never written, mark the transaction rolled back, and show one quiet message ("Finished cleaning up an interrupted install").
- Cancel, crash, power loss, and disk-full all end in the same path: previous state intact, no staging leftovers.
- Per-game lock (one install or launch per game); a lock file protects shared-store writes; deleting a game cannot race its own install.

### 9.2 The lockfile (the single record of what is installed)

```json
{
  "schema": 3,
  "game": { "id": "g-123", "mc": "1.21.4",
            "loader": { "kind": "fabric", "version": "0.16.10", "profileId": "fabric-loader-0.16.10-1.21.4" } },
  "java": { "major": 21, "source": "seed", "modules_ok": true },
  "files": [
    { "rel": "libraries/net/fabricmc/intermediary/1.21.4/intermediary-1.21.4.jar",
      "size": 701826, "sha1": "…", "sha256": "…", "origin": "maven.fabricmc.net", "zip_ok": true, "verified_at": "…" }
  ]
}
```

It contains **only measured values**: sizes and hashes are computed from the bytes on disk after download. Launch verification compares disk against the lockfile, never against remote metadata that may omit sizes.

### 9.3 Verification policy

| Situation | Rule |
|---|---|
| Metadata gives size and hash | Verify both while streaming; reject on mismatch |
| Metadata gives neither (the Fabric/Quilt case) | Fetch the Maven `.sha1` sidecar (tiny, parallel), verify, and record the measured size. If no sidecar exists, trust only over TLS from an allowlisted host and record the measured hash (trust-on-first-use), flagged `origin_unverified` in Doctor |
| Any file | Reject **zero-byte** files and, for `.jar`/`.zip`, **truncated or malformed archives** |
| Any binary download | Reject an HTML or JSON error body served with `200 OK` (check `Content-Type` and the first bytes: ZIP starts with `PK`) |
| Later launches | Fast check: existence, size, mtime against the lockfile. Full hash only on Repair, Doctor deep check, or when mtime changed |

```rust
pub fn jar_is_intact(path: &Path) -> Result<(), VerifyError> {
    let f = File::open(path)?;
    let mut z = zip::ZipArchive::new(f).map_err(|_| VerifyError::BadArchive)?; // validates end-of-central-directory
    if z.is_empty() { return Err(VerifyError::EmptyArchive); }
    z.by_index(0).map_err(|_| VerifyError::BadArchive)?;
    z.by_index(z.len() - 1).map_err(|_| VerifyError::BadArchive)?;
    Ok(())
}
```

A persistent `library-meta.json` (coordinate → sha1, size) lets reinstalls and repairs avoid network lookups. It is pre-populated from the seed.

### 9.4 Download engine

```text
fetch(spec):
  part = <dest>.part
  if part exists and is shorter than expected: resume with Range + If-Range (ETag)
  stream response → write to part while hashing (sha1 + sha256)
  checks: status 200 / 206; Content-Type is not text/html; received == Content-Length (if sent);
          ZIP-like files begin with "PK"
  stall detection: under 1 KiB/s for 20 s → abort this attempt
  retries: 3, jittered backoff (about 0.5 s, 1.5 s, 4 s); retry only network errors, 408, 429 (honor Retry-After), 5xx
  success: fsync(part) → compare hash (pinned or sidecar) → safe_rename(part → dest) → record in the transaction
```

Bounded concurrency (about 6–8 overall, 4 per host), bounded channels so a slow disk applies backpressure, one progress aggregator feeding the byte-weighted model (v3 section 14.2). Timeouts: connect 10 s, idle-read 30 s.

**Allowlists are per purpose**, not global, defined in `loam.config.json` and asserted by tests:

| Purpose | Hosts (verify from live profiles and docs) | Extra rule |
|---|---|---|
| `catalog` | Mojang manifest hosts, Fabric and Quilt meta | JSON only, size capped |
| `minecraft-files` | Mojang file hosts named in version JSON | Hash from the version JSON is mandatory |
| `loader-libs` | Fabric and Quilt Maven, **Maven Central** (only for coordinates that appear in a validated profile) | Sidecar hash required |
| `runtime-download` | Adoptium | Checksum from the API or pinned |
| `news` and `modrinth` | Their exact hosts | P2 |

### 9.5 Fabric and Quilt: required behavior, plus the sweep

Carried over from the v1.3.0 prompt, now as **hardening and verification of what exists**:

- **Direct profile install**, no external installer run. Fetch the loader list and the launcher profile JSON from the Fabric or Quilt meta service; validate (`id` matches the expected pattern, `inheritsFrom` equals the chosen game version, `mainClass` matches the strict Knot pattern, every library parses as a `MavenCoord`, every host is allowlisted); merge with the vanilla version JSON; install through a transaction (9.1).
- **Merge rules (engine, fully unit-tested):** libraries loader-first then parent, de-duplicated by `group:artifact[:classifier]` with **the loader's version winning**; JVM and game arguments parent-first then child, rules evaluated, variables substituted once at the end; the child's `mainClass` replaces the parent's; `assetIndex`, `javaVersion`, `logging` come from the parent unless the child defines them; both `arguments` and legacy `minecraftArguments` handled.
- **Default loader build** is the newest *stable*; experimental builds appear only under the loader build dropdown. Snapshots only with Preview versions on.
- **Smart Drop for these loaders:** read `fabric.mod.json` / `quilt.mod.json`; Fabric mods are accepted on Quilt with a note; Quilt-only mods are rejected on Fabric; version constraints evaluated with a tested predicate parser; missing dependencies and duplicate mod IDs reported before anything changes; backup first, Undo restores; disable by renaming to `.jar.disabled`; remove goes to the Recycle Bin.
- **Optional API mod:** an unchecked checkbox at Review (`Add Fabric API` or the Quilt equivalent), downloaded from Modrinth with hash verification and a descriptive `User-Agent`; skipped with a message if none exists for that version.
- **Update loader / Repair / Rollback:** install the new build into staging, verify, switch the profile pointer atomically, keep the previous profile for one-click rollback; Repair re-verifies by hash and re-downloads only what is wrong.
- **Crash hints:** recognize an incompatible mod set, a missing dependency, a mod for another Minecraft version, and a Java mismatch from the log or `crash-reports/`; show a plain message and one action; never auto-edit mods.

**The sweep (closes F3):**

```text
for game in offered_fabric_games ∪ offered_quilt_games:
    loader = latest_stable(game)
    plan   = resolve(game, loader)                         # fixtures on every push, live endpoints nightly
    assert every plan file path parses (SafeRelPath) and every coordinate parses (MavenCoord)
    install(plan) into a temp root                         # mock server on push, real network nightly
    assert lock.files.all(|f| f.size > 0 && (!f.is_zip || jar_is_intact(f)))
    assert loader_main_class_present(plan)
    assert dry_run(plan).ok                                # 8.3
```

**Mandatory regression tests** (names are the crash reports): `LOAM-5F5B-4B` and `LOAM-D365-7F` (missing Java: resolver provisions or seeds a runtime on a clean profile); `LOAM-0C5F-93` (Fabric 0.19.5 on 26.3 and on 1.21.4 install without "Unsafe file path"; Quilt too); `LOAM-FF91-23` (a library with unknown size installs, records 701,826 bytes, and launches; a real 0-byte file is rejected).

**Tier-1 real launches** (real Windows, game window detected, graceful close): Fabric on 1.14.4, 1.16.5, 1.18.2, 1.19.4, 1.20.1, 1.20.6, 1.21.1, 1.21.4, 26.1, 26.2, 26.3; Quilt on 1.18.2, 1.19.4, 1.20.1, 1.20.6, 1.21.4; each once with the API mod installed and one test mod loaded. `docs/support-matrix.md` is **generated from real runs**: Verified (with date, Java major, loader build), Available (installs, not launch-tested), Not available. The UI shows `VERIFIED ON LOAM` only for Verified cells.

### 9.6 Windows robustness for every file operation

Short data root (`%LOCALAPPDATA%\LOAM`) with long-path awareness enabled in the app manifest and `\\?\` paths in the file helper; `safe_rename` retries with backoff on sharing violations and access denied (antivirus and indexers); same-volume atomic rename with a verified copy-then-delete fallback; detect files that vanish after write (quarantine) and explain; normalize or reject reserved device names and trailing dots and spaces in game folder names (the display name can be anything); handle case-insensitive collisions, locked files on Repair, low disk (needed size plus 20 %), sleep and resume, and network drops mid-download.

---

## 10. Java runtime resolver (metadata first)

```rust
pub fn required_java_major(v: &VersionJson, id: &VersionId) -> u8 {
    v.java_version.as_ref().map(|j| j.major_version)       // authoritative when present
        .unwrap_or_else(|| legacy_fallback(id))             // only for old JSONs without the field
}
fn legacy_fallback(id: &VersionId) -> u8 {
    // range table from the changelog: <=1.16.5 → 8, 1.17..=1.20.4 → 17, 1.20.5..=1.21.x → 21, 26.x / 25w → 25
}
```

### 10.1 Resolution

Candidate order for the needed major: **managed runtime already verified → seed → Adoptium download → coded error.** For legacy versions (and any Forge) require the **exact** major (8); for others the metadata major or newer only if compatibility-tested. A table test pins `version → major` across the catalog tiers and **fails if metadata and fallback disagree** (so range drift is visible).

### 10.2 Health check (closes F6)

On provisioning, on seeding, and in Doctor, for each runtime:

1. `java -version` runs (timeout 5 s).
2. `java --list-modules` includes at least: `java.base`, `java.desktop`, `java.logging`, `java.management`, `java.naming`, `java.xml`, `jdk.crypto.ec` (or the module that provides EC crypto on that JDK; verify per major), `jdk.unsupported`, `jdk.zipfs`.
3. Architecture is x64 (`os.arch` from `-XshowSettings:properties -version`).
4. The default CDS archive (`lib/server/classes.jsa`) is present; do not strip it.
5. Result cached by (path, size, mtime); invalidated on change.

Use Temurin **JRE** packages (verify the package type includes `java.desktop`), never jlink-stripped images.

---

## 11. Launch pipeline, stalls, and hardware tuning (P1)

### 11.1 Stall diagnosis

Follow `LOAM_Final_Polish_Prompt_v3.md` sections 2 to 4 in full (tracing, hypotheses H1–H11, critical-path budget, token refresh off the critical path, drained pipes, Game mode, graceful stop). Add this check: **the launch preflight must not hash files** (use the lockfile and fast checks), and Doctor must never run on the launch critical path.

### 11.2 GPU and process tuning, hardened (F7)

- **Reconcile, don't just write.** On every runtime change: for each managed `javaw.exe` and `java.exe`, set `HKCU\Software\Microsoft\DirectX\UserGpuPreferences` to `GpuPreference=2;`. Track the exact value names LOAM wrote in `perf-state.json`; remove **only** LOAM-owned values whose target no longer exists; remove all of them on uninstall.
- **Verify by reading back:** after spawning the game, call `GetProcessInformation` for power throttling and `GetPriorityClass`; log the actual state in diagnostics. A silent failure on an older Windows build must degrade gracefully, not error.
- **Reference sketch** (confirm names in the `windows` crate):

```rust
// Opt the game process out of EcoQoS: ControlMask selects the setting, StateMask = 0 turns throttling OFF.
let state = PROCESS_POWER_THROTTLING_STATE {
    Version: PROCESS_POWER_THROTTLING_CURRENT_VERSION,
    ControlMask: PROCESS_POWER_THROTTLING_EXECUTION_SPEED,
    StateMask: 0,
};
unsafe { SetProcessInformation(handle, ProcessPowerThrottling, &state as *const _ as *const c_void, size_of_val(&state) as u32)? };
```

- **Keep LOAM's own UI off the discrete GPU on hybrid laptops (evaluate):** try Chromium's low-power-GPU switch via WebView2 additional browser arguments (verify the flag exists in the runtime version used) and/or a per-exe preference for the WebView2 process. Keep it only if measured game frame times improve.
- **While a game runs (Game mode):** LOAM sets EcoQoS **on** for itself, lowers its priority and memory priority, destroys the WebView window, and pauses downloads (v3 section 4.5).
- Put all Win32 calls behind traits (`GpuPrefs`, `ProcessTuner`) so policy is unit-tested with fakes.

### 11.3 Heap policy (F9)

```rust
pub fn heap_plan(ram: RamInfo, version: &VersionId, modded: bool) -> HeapPlan {
    // xmx: from a tested function of physical RAM, available RAM, era, loader, mod count; never > ~50% of RAM; keep >= 2 GB headroom
    // xms: = xmx when ram.total >= 12 GiB && xmx <= ram.total / 4, else min(xmx, 1..2 GiB)
}
```

Property tests for 4, 8, 16, 32, 64, and 128 GB machines; the UI value must equal the `-Xmx`/`-Xms` actually passed (v3 section 14.3). Evaluate `-XX:+AlwaysPreTouch` and the collector choice per Java major by benchmark; record in `docs/perf/profiles.md`. Do not ship a lever without data.

### 11.4 Measurements

`docs/perf/report.md` with real numbers from the benchmark harness (v3 section 6): load time, 1 % and 0.1 % lows, p99 frame time, GC pauses, first-run time, installer size, and **Full versus Lite first-run time**. Include negative results.

---

## 12. Catalog and legacy-version verification (P1)

### 12.1 Catalog behavior

Keep: the catalog from the newest release down to 1.0, filter chips (`ALL · RELEASES · SNAPSHOTS · FABRIC · QUILT`), `V / F / Q` compatibility badges, and the loader build dropdown (★ Latest Stable, Experimental). Add: stale-while-revalidate with an "Updated 2 h ago" hint; on first run offline, **show the seed's catalog snapshot** so the Install surface is never empty; if a required file is not cached and the network is down, say exactly that ("Minecraft files come from Mojang; connect to the internet to install").

### 12.2 Legacy matrix (below 1.8.9 was never verified)

- **Tier 2 (every legacy version offered):** version JSON parses in whichever format it uses; every library and the client JAR resolve; natives extract once and are reused; assets index handled (including the old virtual and map-to-resources layouts); classpath complete; Java is exactly 8.
- **Tier 1 (real launch, Offline Profile):** 1.0, 1.2.5, 1.5.2, 1.6.4, 1.7.10, 1.8.9, 1.12.2, 1.16.5 (Java 8); 1.17.1; 1.18.2; 1.20.1; 1.20.4 (17); 1.20.6; 1.21.4 (21); 26.1, 26.2, 26.3 (25); plus one snapshot from each Java boundary.
- Document known caveats honestly in the UI and `support-matrix.md` (for example, online sign-in does not work for some very old versions because of retired session services; Offline Profile does).
- Version ordering is natural and numeric (`1.10 > 1.9.4`, `1.21.11 > 1.21.9`, `26.1.2 > 26.1`); `LATEST RELEASE` comes from the manifest's `latest.release`. Table-test with the full list.

---

## 13. UI, audio, and interaction fixes (P1)

Apply `LOAM_UI_Update_Prompt_v1.md` in full. In addition:

### 13.1 Context menu without breaking paste (F4)

```ts
// main.tsx: replace the global preventDefault
window.addEventListener("contextmenu", (e) => {
  const t = e.target as HTMLElement | null;
  const editable = !!t?.closest('input, textarea, [contenteditable="true"]');
  const hasSelection = (window.getSelection()?.toString() ?? "").length > 0;
  if (!editable && !hasSelection) e.preventDefault();   // native menu only where it is useful
});
```

Optional: a small LOAM-styled menu (Cut / Copy / Paste / Select all) for editable fields so the native Edge menu never appears. Also block browser accelerators that do not belong in a desktop app (reload, print, find, zoom): prefer the WebView2 setting for accelerator keys if reachable through Tauri, otherwise `keydown` handlers. Release builds must have DevTools disabled (verify). E2E test: right-click and paste into the skin-name field works; right-click on the stage shows nothing.

### 13.2 Sound engine hardening (F15)

```ts
// lib/sfx: one AudioContext, created on first user gesture
type Level = "off" | "subtle" | "full";
let ctx: AudioContext | null = null, master: GainNode | null = null, voices = 0;
const MAX_VOICES = 6;

function ensure(): AudioContext {
  if (!ctx) { ctx = new AudioContext({ latencyHint: "interactive" }); master = ctx.createGain(); master.connect(ctx.destination); }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
export function play(name: SfxName) {
  if (level === "off" || document.hidden || gameRunning || voices >= MAX_VOICES) return;
  const c = ensure(); master!.gain.value = level === "subtle" ? 0.25 : 0.5;
  voices++;
  const { osc, gain } = build(name, c);           // oscillator + envelope per sound
  osc.onended = () => { osc.disconnect(); gain.disconnect(); voices--; };
  osc.start(); osc.stop(c.currentTime + duration(name));
}
```

Requirements: three levels (`Off / Subtle / Full`, default **Subtle**), a polyphony cap, nodes disconnected on end (no leaks), suspended while the window is hidden or a game is running, never plays before a user gesture, volume independent of the Windows system sound scheme. Soften the `launch` sound's lowest frequencies so small speakers do not distort. Unit-test the envelope math and voice accounting; add one E2E that clicks through ten controls and asserts no growth in live audio nodes.

### 13.3 Motion token reconciliation

Keep the new easing `cubic-bezier(0.16, 1, 0.3, 1)` as `--ease` for entrances and sheets. Durations stay as in the UI Update Prompt. Press feedback (`scale(0.982)`) applies to small controls only; the large PLAY control uses at most `scale(0.99)` and never changes layout. `font-variant-numeric: tabular-nums lining-nums` stays on every changing number.

### 13.4 New surfaces to design with the same components

Doctor checklist sheet, Seed progress row ("Preparing LOAM · 3 of 7", quiet, in Settings → Storage & Java and a thin line in the Home dock only while working), Launch Insurance banner ("Repaired 1 file and restarted"), Safe Mode banner, and an About line `LOAM 1.4.0 · Full` (or `· Lite`) with the seed version.

### 13.5 Website follow-up

The download page needs two downloads: **Lite (small, downloads what it needs)** and **Full (everything included, recommended if your connection is slow or restricted)**, each with size, SHA-256, and requirements. (A website prompt update can be generated from this section.)

---

## 14. Testing strategy (depth)

| Layer | Tooling | Required coverage |
|---|---|---|
| Unit and table tests | `cargo test`, `vitest` | `domain/` and parsers ≥ 90 % line coverage (`cargo llvm-cov`); data-driven tables for version → Java, version ordering, memory math, units |
| Property tests | `proptest`, `fast-check` | `SafeRelPath`, `MavenCoord`, `LoaderSpec`, version predicates, merge de-duplication, heap plan, progress monotonicity |
| Fuzz | `cargo-fuzz` (nightly, 10 min each) | the same parsers plus profile JSON, version JSON, `fabric.mod.json` / `quilt.mod.json`, skin PNG validation |
| Mutation | `cargo-mutants` on `domain/` and `services/install` verify code | surviving mutants reviewed; no surviving mutant in size or hash checks |
| Snapshot and golden | `insta` | merged launch plans for every Tier-1 version; Doctor reports from fake environments |
| Integration with fakes | `wiremock`/`httpmock`, `FakeFs`, `FakeClock`, `FakeEnv` | install, repair, update, rollback, seeding; **fault injection**: 404, 500, truncated body, wrong hash, wrong `Content-Length`, HTML body with 200, slow stall, dropped connection, redirect to a disallowed host |
| Chaos | scripted | kill the process at every journal step; fill a small VHD; hold an exclusive handle during rename; remove a file between verify and launch |
| Contract (live) | scheduled CI | real Mojang, Fabric, Quilt, Adoptium, Modrinth responses still match the frozen fixtures |
| Sweep (live) | scheduled CI + a real Windows machine | section 9.5 for every offered Fabric and Quilt combination |
| Doctor | unit with fake env, plus real-machine runs | every check has a pass, warn, and fail case |
| E2E | Playwright against the dev build; `tauri-driver` for the packaged app | every journey in the UI Update Prompt and v3 section 16; fail on `console.error` and unhandled rejections |
| Real launch (Tier 1) | PowerShell script on real Windows | matrices in 9.5 and 12.2; results feed `support-matrix.md` |
| Installer | clean Windows 10 and 11 VMs (Sandbox or Hyper-V) | **Lite and Full**; upgrade from 1.3.0; **Full with the network disabled**; uninstall cleanup; WebView2 absent; VC++ absent |
| Soak and perf | v3 sections 3.2 and 6 | 2 h stable; startup, memory, and frame budgets |
| Visual and accessibility | Playwright screenshots, axe, manual keyboard and Narrator pass | all screens, both themes, 100/150/200 % |

Grow the suite by **risk, not by count.** The 27 existing tests are the starting point; every finding F1–F15 and every reported crash gets permanent tests. Track the number, coverage by module, and mutation results in the release report.

---

## 15. Release engineering

1. **Version 1.4.0** in `package.json`, `Cargo.toml`, `tauri.conf.json`, the About screen, both installers; `CHANGELOG.md`; an honest in-app "What's new".
2. **Artifacts:** `LOAM_1.4.0_x64-setup.exe` (Lite) and `LOAM_Full_1.4.0_x64-setup.exe` (Full). For each: size, **SHA-256**, signed or unsigned status; one `SHA256SUMS.txt`. If unsigned, say so in the notes and on the website (SmartScreen).
3. **Reproducibility:** pinned seed, locked dependencies, recorded toolchain versions; two builds on the same inputs produce the same seed manifest.
4. **Compliance:** THIRD_PARTY_NOTICES, SBOM, licence texts for Temurin, WebView2, VC++, Mesa (if shipped), and all Rust and npm dependencies; the legal line in 7.2 (no Mojang files) is checked by an automated scan of the seed for forbidden hosts and filenames.
5. **Clean-machine tests** (section 14 installer row), including **upgrade from 1.3.0 preserving games, worlds, and settings** and **uninstall removing every LOAM-written registry value**.
6. **Release hosting:** verify file-size limits for the Full installer on the chosen host; the website reads both assets from the release.
7. **Release report** `docs/v1.4.0/RELEASE_REPORT.md`: what shipped, what is flagged off and why, measured results (including installer sizes and first-run times), unverified items, known issues.

---

## 16. AI coding playbook for this release

### 16.1 Setup (M0)

`AGENTS.md` at the repo root, re-read every session:

```md
# AGENTS.md: LOAM
## Commands
- Everything: `pwsh scripts/verify.ps1` (must pass before any commit or "done")
- Seed + Full build: `npm run seed:update`, `npm run build:lite`, `npm run build:full`
## Rules
- Newtypes for paths, loader specs, Maven coordinates, version IDs. No sentinels (use Option).
- All Win32 and network access behind traits. Use infra::fs / infra::http / infra::process only.
- No unwrap/expect/panic/todo in non-test Rust. Typed errors with stable codes + report IDs.
- Never bundle Mojang-owned files. Never add telemetry or hidden network calls.
- After every bug: failing test, fix, a guard for the CLASS of bug, a line in docs/GOTCHAS.md.
- Final message of every task: Ran / Passed / Not run / Unverified.
## Docs to keep current
docs/v1.4.0/PLAN.md, PROGRESS.md, LEDGER.md, docs/DECISIONS.md, docs/GOTCHAS.md
```

Seed `docs/GOTCHAS.md` with what this project already taught:

```md
- Sentinel 0 meaning "unknown" → LOAM-FF91-23. Guard: Option<u64>; lockfile stores measured values only.
- Path validator used on a non-path string → LOAM-0C5F-93. Guard: newtypes with distinct grammars.
- Maven coordinates have 3- and 4-part forms, @ext suffixes, and repo URLs with trailing slashes. Guard: MavenCoord + sweep.
- Global contextmenu preventDefault breaks paste. Guard: editable allow-list + E2E.
- Java major by version ranges drifts. Guard: metadata first + table test.
- Stripped JREs lack java.desktop / EC crypto. Guard: module check.
```

### 16.2 Techniques that consistently raise quality

1. **Bug-class elimination.** Turn every incident into a type, a lint, or a generalized test, not a one-off patch. The two shipped crashes are textbook cases (F1, F2).
2. **Enforce architecture with tools.** `clippy.toml` `disallowed-methods`, ESLint restricted imports, `dependency-cruiser`, `cargo-deny` bans. A rule the compiler enforces never needs to be re-explained to the agent.
3. **Interface first.** Ask for the trait, the fakes (`FakeFs`, `FakeHttp`, `FakeClock`, `FakeEnv`), and the tests; then the implementation. Fakes beat mocks: deterministic retries, timeouts, and disk-full behavior.
4. **Win32 behind traits.** Logic that depends on registry, DXGI, or process APIs becomes unit-testable on CI.
5. **Table-driven specs.** Put examples in data (`version → java major`, `coordinate → path`, `ram → heap`). Tables are the best documentation and the cheapest regression net.
6. **Golden masters** for merged launch plans and Doctor reports; review diffs, never blindly update.
7. **Property, fuzz, and mutation testing** for parsers and verification code; mutation testing reveals tests that pass for the wrong reason.
8. **Characterize before refactoring** the big files (`engine.rs`, `catalog.rs`); split by responsibility only after tests pin behavior.
9. **Tight loops:** `cargo watch -x check -x test`, `vitest --watch`; compile after every file; never let the agent write hundreds of lines before the first compile.
10. **Repo map for fast onboarding.** Generate `docs/REPO_MAP.md` (tree and one line per module) in `verify`, so a fresh session understands the layout in seconds.
11. **Evidence-based debugging:** reproduce → smallest failing test → fix → keep the test. If it cannot be reproduced, say so and list the evidence needed.
12. **Two-agent pattern:** an implementer session and a separate reviewer session that has not seen the implementation reasoning (16.3).
13. **Anti-hallucination for crates and APIs:** after adding a dependency or calling a Windows or Tauri API, check the real docs or source, compile immediately, and add a spike test for anything non-obvious. Plausible-looking names are the most common failure mode.
14. **Pin what ships.** Seed components, crates, and npm packages are pinned; updates are explicit, reviewed diffs.
15. **Diff budget and checkpoints.** About 400 changed lines per commit; tag every milestone; keep `PROGRESS.md` current so work survives a lost session.
16. **Explain before editing** unfamiliar code: a ten-line summary of purpose and invariants first.
17. **Make claims checkable.** Budgets, invariants, and sizes live in tests and scripts (`check-bundle.mjs`, seed budget, "UI memory value equals JVM argument"), not in comments.
18. **Disprove yourself.** End every task with "what I did not verify, and why I believe it works anyway."

### 16.3 Reusable prompts

**Milestone**

```
Milestone M<N>: <name>. Read AGENTS.md, docs/v1.4.0/PLAN.md, PROGRESS.md, GOTCHAS.md.
Goal: <one sentence>. Acceptance: <checkable bullets>.
Write tests and fakes first; implement in small commits; run `pwsh scripts/verify.ps1` after each step.
Do not change behavior outside this milestone. Finish with: changes, verify output, Ran/Passed/Not run/Unverified,
and updates to PROGRESS.md, DECISIONS.md, GOTCHAS.md.
```

**From a crash report**

```
Crash report <ID>: "<message>". 1) Write a failing test that reproduces it. 2) Fix it.
3) Name the CLASS of bug and add a guard (type, lint, or a generalized test). 4) Add a GOTCHAS.md line.
5) Search the codebase for other instances of the same class and list them.
```

**Adversarial review (separate session, after each milestone)**

```
You are a hostile reviewer. Do not praise. Review the diff for M<N> and find real defects: races, cancellation and
cleanup bugs, sentinel values, validators applied to the wrong kind of string, unvalidated external data, path traversal,
Windows edge cases (long paths, file locks, antivirus, reserved names), unbounded memory or threads, swallowed errors,
unwrap/panic paths, UI states without keyboard access, layout shift, contrast failures, and any claim in the summary that
was not verified. For each: file:line, why it fails, a failing test, the fix. Then fix them.
```

**Seed audit**

```
Audit the seed: every component pinned by SHA-256; licences present; no Mojang-owned files or hosts; manifest signature
verifies; the build is reproducible; the size is within budget. Report any component you could not verify.
```

### 16.4 Human review checklist

Run `verify` yourself. Install both editions on a clean VM; disable the network and start the Full edition; run Doctor; break a library file by hand and watch Launch Insurance repair it; kill LOAM mid-install and restart; right-click and paste into a text field; read every "Unverified" line in the agent's summary and test it.

---

## 17. Definition of done

- [ ] `verify` passes locally and in CI; zero warnings; no `unwrap/expect/panic/todo` in non-test Rust; no `any` outside generated TypeScript.
- [ ] `LEDGER.md`: every changelog claim verified or corrected; findings F1–F15 closed or documented with evidence.
- [ ] The four reported crashes have permanent regression tests; `GOTCHAS.md` lists each bug class and its guard.
- [ ] Newtypes in place; no sentinel sizes; the lockfile contains measured values only; zero-byte and truncated-archive files are rejected everywhere.
- [ ] Install, repair, update, and rollback run as journaled transactions; the chaos tests pass.
- [ ] **Full Edition** builds reproducibly; seed manifest signed and verified; seed within budget; no forbidden files; **first run works with the network disabled** (runtimes, WebView2 and VC++ handled, loader files and catalog snapshot available); Lite and Full installers tested on clean Windows 10 and 11, including upgrade from 1.3.0 and uninstall cleanup.
- [ ] **Doctor** has every listed check with unit tests and real-machine runs; **Launch Insurance** auto-repairs the three safe classes once and never touches mods or worlds; Safe Mode works.
- [ ] Fabric and Quilt sweep passes for every offered combination; Tier-1 launches recorded; `support-matrix.md` generated from real runs; legacy Tier-1 results recorded.
- [ ] Java resolver is metadata-first; every runtime passes the module check.
- [ ] Tuning is reconciled per runtime and verified by read-back; benchmark report has real numbers; no lever ships without data.
- [ ] UI Update Prompt definition of done passes; context menu allows paste in inputs; audio has levels and no leaks.
- [ ] No orphan processes after close, stop, or crash; 2-hour soak stable.
- [ ] `RELEASE_REPORT.md` lists sizes, measurements, flags left off, and every unverified item honestly.

---

## 18. Appendices

### A. Error code families (extend; keep report IDs separate)

`LOAM-NET-*` network and allowlist · `LOAM-INS-*` install and transactions · `LOAM-HSH-*` integrity (`0102` zero-byte or truncated file) · `LOAM-LDR-*` loaders · `LOAM-JAV-*` Java runtime · `LOAM-LCH-*` launch · `LOAM-AUT-*` authentication · `LOAM-FS-*` filesystem and Windows · `LOAM-SED-*` seed · `LOAM-DOC-*` Doctor · `LOAM-MIG-*` migration · `LOAM-CFG-*` configuration.

### B. Fixtures to create (M0, M2, M4, M5)

Mojang manifest v2 and version JSONs for each Java boundary and each legacy era; Fabric and Quilt `game`, `loader/{game}`, and `profile/json` for the Tier-1 versions **including the 26.3 and 1.21.4 cases from the crash reports**; Maven `.sha1` sidecars; a library entry with no size; HTML-with-200 and truncated-JAR bodies; Adoptium release JSON; `fabric.mod.json` / `quilt.mod.json` samples with constraints in several styles; crash logs (incompatible mods, missing dependency, Java mismatch, OpenGL failure, heap reservation failure); real 1.2.x and 1.3.0 `install.json` and `game.json` files.

### C. Double-check against live sources (never assume)

Tauri 2 config keys for `bundle.resources` (map form), `bundle.windows.webviewInstallMode` (`offlineInstaller`), `bundle.windows.nsis` (`installMode`, `compression`, installer hooks); NSIS size limits; Adoptium API endpoints and that the JRE package includes `java.desktop`; WebView2 offline installer redistribution terms; VC++ redistributable licence and detection keys; Mesa Windows build licence; Fabric and Quilt endpoint paths, profile fields (`id`, `inheritsFrom`, `mainClass`, library `url`/hash fields) and stability flags; Modrinth API parameters and terms; Minecraft launcher metadata features and Java requirements per version; Windows API behavior for `SetProcessInformation`, GPU preference keys, and DWM attributes on Windows 10 versus 11; the `windows` crate's exact type names.
