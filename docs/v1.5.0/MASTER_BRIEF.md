# LOAM v1.5.0: Master Brief (the final-polish release)

**What this is:** the improvement brief for v1.5.0, written for a coding agent. It builds on `LOAM_v1.4.0_Master_Brief.md` and adds: the **SmartScreen / trust fix** (the "Windows protected your PC" screen), the **LOAM Account** (optional, browser sign-in), **Guest accounts and unofficial-server support**, fixes for **open / game-launch / close jitter**, a **full code revamp** (logic, math, and UI physics), and new features that answer the weaknesses reported about competing launchers.

**Relationship to earlier documents.** Everything in `LOAM_v1.4.0_Master_Brief.md` (Full Edition and Seed, Environment Doctor, Launch Insurance, transactions, newtypes, `verify`) still applies. **Carry-over rule:** at the start, verify each v1.4.0 milestone in `docs/v1.5.0/LEDGER.md`; anything unfinished becomes a P0 item here. Also still applicable: `LOAM_UI_Update_Prompt_v1.md`, `LOAM_Final_Polish_Prompt_v3.md`, `LOAM_Launcher_Remaster_Brief_v2.md`.
**Precedence on conflict:** this document → v1.4.0 brief → UI Update Prompt → Polish Prompt v3 → Remaster Brief v2. **This document deliberately overrides one earlier rule:** Brief v2 listed "hosted accounts" as a non-goal. v1.5.0 adds an optional LOAM Account (section 4), with the safeguards below.

---

## 1. Goals, honesty rules, and what code cannot do

| Tier | Work |
|---|---|
| **P0 (release-blocking)** | Trust and SmartScreen program (section 2); **Smoothness program** for open, launch, and close (section 8); **code revamp** with differential testing (section 9); LOAM Account with PKCE browser sign-in and the three-account model (section 4); everything unfinished from v1.4.0 |
| **P1** | Trust Ledger and Verify-this-app (3); Mod Guard (5); World Time Machine (6); Server list and join (4.8); `.mrpack` import and export (7) |
| **P2 (feature-flagged)** | Cloud sync of settings and skins; cloud snapshots; LOAM Identity for servers (authlib-injector-compatible); local skin pack for offline play; Start-with-Windows tray companion |

**Honesty rules (never relax):**

1. **SmartScreen cannot be "removed" by code.** It is a reputation system. Code can remove the things *within our control* (unsigned binaries, heuristic triggers, missing publisher info) and add a verification experience; **removing the warning for users requires a code-signing identity and accumulated reputation, which only the owner can obtain** (section 2.1). The agent must not claim the warning is gone unless it was tested on a clean machine with a signed, reputation-bearing build.
2. **Forbidden "fixes" for SmartScreen or antivirus:** never tell users to disable SmartScreen or Defender; never strip the Mark-of-the-Web programmatically; never add Defender exclusions silently; never pack, obfuscate, or encrypt binaries to evade scanners; never request admin rights to "get around" a prompt.
3. **Account honesty:** a LOAM Account and a Guest account **do not prove Minecraft ownership**, cannot join servers that verify Microsoft accounts, and cannot use Realms. The UI says so wherever it matters. LOAM never forges sessions, tokens, or UUIDs, never impersonates another player's identity, and never circumvents a server's authentication, whitelist, or ban list.
4. **No marketing as "free Minecraft"** or as a way to avoid buying the game. In-app copy states that Minecraft Java Edition is a paid game, and that Microsoft sign-in is needed for official servers and Realms.
5. **No telemetry, ever.** The LOAM Account backend is not analytics. It stores the minimum needed for sync and deletes it on request (4.6).
6. **Never claim a number you did not measure** (smoothness, size, reputation). Report *Ran / Passed / Not run / Unverified*.

---

## 2. Trust program: the SmartScreen screen

**The screenshots:** "Windows protected your PC: Microsoft Defender SmartScreen prevented an unrecognized app from starting." The second shows another app (`Solar_Tweaks_Setup_4.0.4-B.exe`) with `Publisher: Unknown publisher`, which is the same mechanism: an unsigned installer from a publisher without reputation. LOAM's installer triggers it for the same reason.

### 2.1 What only the owner can do (put these in `docs/v1.5.0/OWNER_TASKS.md` and block the release on them)

1. **Obtain a code-signing identity** and use it for every release. Options to evaluate against current Microsoft documentation (eligibility, cost, how SmartScreen reputation is established for each): an OV certificate, an EV certificate, or Microsoft's Trusted Signing service. Use **the same publisher identity for every release** so reputation accumulates. The agent cannot buy or validate identities; it builds the pipeline.
2. **Register an official domain** with HTTPS and publish downloads only from it (and the GitHub release), with the SHA-256 beside each file.
3. **Submit each release** to Microsoft for analysis (Microsoft Security Intelligence file submission) and to the major antivirus vendors' false-positive channels **after signing**; log the submission IDs.
4. Decide on **additional distribution channels** (2.4).
5. Decide **legal wording** for Guest and unofficial-server support (section 4.7) with professional advice.

### 2.2 What the agent builds

- **Signing pipeline.** Sign the installer, the main executable, and every LOAM-built helper executable with SHA-256 and an RFC 3161 timestamp. Tauri 2 offers signing settings under `bundle.windows` (for example `certificateThumbprint`, `digestAlgorithm`, `timestampUrl`, and `signCommand` for external services; **verify exact key names in current Tauri docs**). Secrets (certificates, tokens) live only in CI secrets, never in the repo or logs. Bundled third-party binaries that are already signed (for example Temurin) stay untouched.
- **Verification step in the build:** `signtool verify /pa /v` and `Get-AuthenticodeSignature` on every shipped binary; the build fails if anything is unsigned, the timestamp is missing, or the publisher name differs from `release.config.json → publisher`.
- **Metadata that makes the installer look like what it is:** consistent `CompanyName`, `ProductName`, `FileDescription`, `FileVersion`, `LegalCopyright` in the version resource; a proper application manifest; a stable installer file name pattern.
- **Remove heuristic triggers within our control:** no packers (UPX and similar), no obfuscation, no self-modifying behavior; no persistence (Run keys, scheduled tasks, startup entries) **without an explicit opt-in**; no silent elevation; no download-and-execute of unsigned code at install time (the only executables LOAM may run from downloads are vendor-signed prerequisites such as the VC++ redistributable and the WebView2 installer, and only with consent); minimal installer scripting. Scan each release candidate (Defender command line, plus a multi-engine check) and record results in the release report.
- **Reputation hygiene:** do not rename or re-package the same version under different names; do not ship rebuilt installers with changing hashes for the same version number; keep release assets immutable after publishing.

### 2.3 Trust experience inside the app and on the website

- **`Settings → About → Verify this app`:** shows the publisher name and certificate thumbprint (read from the running executable's signature), the app's SHA-256, the install source, and the seed version (Full Edition); a **`Copy hash`** button; a `Check on the website` link to the published checksums; and a plain explanation of what the signature does and does not prove.
- **First-run page** (and the website download page) explains in two sentences why Windows may show a warning for new apps, how to confirm the publisher name and the hash, and what to do (More info → confirm the publisher → Run). **No instruction to disable security features, ever.**
- Release pages show: signed status, publisher, SHA-256, VirusTotal-style scan links, and a `SECURITY.md` with a responsible-disclosure contact.

### 2.4 Distribution channels (evaluate; the owner decides)

| Channel | Why | Caveat to verify |
|---|---|---|
| **winget** (manifest to the community repository, installer URL plus hash) | Installs from a verified catalog; widely trusted | Check current validation rules and how unsigned or low-reputation installers are treated |
| **Microsoft Store (MSIX)** | Store-installed apps do not use the same download warning | Store policy review: Guest and unofficial-server features may conflict; decide before investing |
| Scoop / Chocolatey | Community convenience | Community-maintained, not official reputation |
| Portable ZIP | For restricted PCs | Still subject to SmartScreen on first run if unsigned |

### 2.5 Acceptance

Signed artifacts verify; the installer shows the publisher name instead of "Unknown publisher" on a clean Windows 10 and 11 VM; a clean-VM install is attempted with SmartScreen **on** and the outcome is recorded honestly (warning present, reduced, or absent, and why); no forbidden "fix" appears anywhere in code or docs.

---

## 3. Trust Ledger (P1): the unique factor

A screen, **`Settings → Trust`**, that proves LOAM's behavior instead of promising it:

- **Network ledger:** every request LOAM itself makes (host, purpose, bytes, time, whether user-initiated), grouped by purpose from the per-purpose allowlists (v1.4.0 section 9.4). A running line such as `0 requests to analytics or ad hosts`.
- **File ledger:** every folder LOAM wrote to this session and the largest consumers (the storage map).
- **Account ledger:** which account is active, what is stored where (Windows Credential Manager entries by name, never values), and a `Sign out and revoke` action.
- **Privacy receipt** after each play session (optional): hosts contacted, bytes, files written.
- **Export** as JSON (redacted).
- **Honest limit, shown on the screen:** the ledger covers **LOAM's own traffic**, not what the game or a mod does.

**Implementation:** the single HTTP client (`infra::http::Client`, the only allowed way to make requests, enforced by `clippy.toml`) writes a bounded ring buffer of ledger entries (no URLs with secrets, no query values, no bodies). A test asserts that a full install, launch, and sync run produces ledger entries only for allowlisted purposes.

---

## 4. Accounts: Microsoft, LOAM Account, and Guest

### 4.1 The three kinds, and what each can do (capabilities are data, not scattered `if`s)

```rust
pub enum AccountKind { Microsoft, Loam, Guest }

pub struct Capabilities {
    pub verified_ownership: bool,
    pub online_mode_servers: bool,   // servers that verify Microsoft accounts
    pub realms: bool,
    pub offline_mode_servers: bool,  // servers that accept unauthenticated names
    pub cloud_sync: bool,            // LOAM sync (separate from Microsoft)
}
impl AccountKind {
    pub const fn caps(self) -> Capabilities {
        match self {
            Self::Microsoft => Capabilities { verified_ownership: true,  online_mode_servers: true,  realms: true,  offline_mode_servers: true,  cloud_sync: false },
            Self::Loam      => Capabilities { verified_ownership: false, online_mode_servers: false, realms: false, offline_mode_servers: true,  cloud_sync: true  },
            Self::Guest     => Capabilities { verified_ownership: false, online_mode_servers: false, realms: false, offline_mode_servers: true,  cloud_sync: false },
        }
    }
}
// A Microsoft account can also be signed into a LOAM Account for sync; the two are independent
// and no Microsoft token is ever sent to LOAM's servers.
```

The launch layer takes a `LaunchAuth { Online{..}, Offline{ name, uuid } }` built from the account kind; **Loam and Guest always produce `Offline`**. UI, Doctor, Quick Play, and the server list read `caps()`, never `kind == …`.

| | Microsoft | **LOAM Account** | **Guest** |
|---|---|---|---|
| Needs sign-in | Yes (browser) | Yes (browser, optional) | **No** |
| Proves ownership | Yes | **No** | **No** |
| Offline-mode / unofficial servers | Yes | **Yes** | **Yes** |
| Servers that verify Microsoft accounts, Realms | Yes | **No** | **No** |
| Cloud sync (settings, game list, skins, server list) | No (separate) | **Yes** | No |
| Reserved display name across LOAM | No | **Yes** | No |
| Label in the UI | `MICROSOFT` | `LOAM ACCOUNT` | `GUEST · OFFLINE` |

### 4.2 LOAM Account architecture (do not roll your own authentication)

- **Identity provider:** a managed OpenID Connect (OIDC) provider (hosted sign-up and sign-in pages, email verification, passkeys, optional social sign-in, rate limiting, breach-password checks). Criteria: OIDC discovery, Authorization Code + **PKCE** for native apps, refresh-token rotation, passkey support, data export and deletion, regional data residency, cost at scale. **Code against standard OIDC (discovery document and JWKS), not a vendor SDK**, so the provider can be swapped by configuration. The choice of provider is an owner decision (`OWNER_TASKS.md`).
- **Backend:** a small API (`api.<domain>`) that validates the access token (signature via JWKS, `iss`, `aud`, `exp`) and serves only the sync endpoints below. No other server logic in 1.5.0.
- **Hosted pages** carry LOAM branding (palette, wordmark). The agent builds the callback success page and the website account pages (follow-up prompt for the Lovable site).

### 4.3 Browser sign-in flow (OAuth 2.0 Authorization Code + PKCE, RFC 8252 for native apps)

```text
1. LOAM generates: state (random), nonce (random), code_verifier (43-128 chars), code_challenge = BASE64URL(SHA256(verifier)).
2. LOAM binds a one-shot HTTP listener to 127.0.0.1 on an ephemeral port (loopback only, never 0.0.0.0), 3-minute timeout.
3. LOAM opens the SYSTEM browser at /authorize?response_type=code&client_id=…&redirect_uri=http://127.0.0.1:<port>/callback
      &scope=openid profile email offline_access&state=…&nonce=…&code_challenge=…&code_challenge_method=S256
   and shows the exact domain it is opening ("Opening account.<domain> in your browser").
4. The user signs in or signs up in the browser (never inside LOAM).
5. The browser redirects to the loopback listener with code + state. LOAM verifies state, serves a branded
   "You can return to LOAM" page, closes the listener (single use).
6. LOAM exchanges code + code_verifier at the token endpoint; validates the ID token (signature, iss, aud, exp, nonce).
7. Refresh token → Windows Credential Manager (keyring crate). Access token stays in memory only.
8. Refresh with rotation; on any refresh failure → signed-out state with a calm message, local data untouched.
```

Fallbacks: if the loopback port cannot be bound, use a registered custom scheme (`loam://auth/callback`) with the same checks. **Sign out** revokes the refresh token at the provider and deletes the Credential Manager entry. Account switching never exposes another account's tokens.

### 4.4 Data model and sync (minimal by design)

**Server stores only:** user id, verified email, display name (the in-game name), created-at, status; per-user sync blobs `{key, version, updated_at, payload}`; optional cloud snapshots (P2, opt-in).

**Syncable keys (allowlist):** `settings` (non-sensitive), `games-index` (names, versions, loaders, memory; **no file paths**), `skins` (PNG ≤ 1 MB each, ≤ 20), `servers` (saved server list), `mod-recipes` (section 7).
**Never synced:** tokens or credentials (LOAM or Microsoft), worlds (unless the user opts into cloud snapshots), file paths, usernames of Microsoft accounts, diagnostics, ledger data.

**Endpoints (`/v1`):** `GET/PUT /sync/{key}` (ETag with `If-Match` for optimistic concurrency, per-blob size cap about 256 KB, per-user cap about 5 MB; both numbers are config), `GET /export` (everything held about the user), `DELETE /account` (erases the account and all data, confirmed by re-authentication). Rate limits per user and per IP.

**Conflict resolution (math with tests):** per-field last-writer-wins using a **hybrid logical clock** (HLC), so merges work across devices with skewed clocks.

```rust
// Merge must be commutative, associative, and idempotent (property-tested).
pub struct Stamped<T> { pub value: T, pub hlc: Hlc, pub device: DeviceId }   // total order: (hlc, device)
pub fn merge<T: Clone>(a: &Stamped<T>, b: &Stamped<T>) -> Stamped<T> { if (a.hlc, &a.device) >= (b.hlc, &b.device) { a.clone() } else { b.clone() } }
```

Sync is **offline-first**: changes queue locally, upload with backoff when online, and the app is fully usable offline with the cached identity (`Last synced 10:42`). A first sign-in on a new device shows a review ("Bring in your 3 games and 5 skins?") rather than silently overwriting local data.

### 4.5 Security requirements and threat model (write `docs/v1.5.0/THREAT_MODEL.md`)

| Threat | Mitigation |
|---|---|
| Phishing (fake login page) | Always the system browser; show the exact domain; never collect passwords in LOAM; passkeys preferred |
| Auth-code interception or a local process on the loopback port | PKCE (S256), `state`, single-use listener bound to 127.0.0.1, short timeout |
| Token theft | Refresh token in Windows Credential Manager, access token in memory only, short access-token lifetime, rotation, "sign out everywhere" |
| Account takeover | Email verification, rate limits, breach-password checks and passkeys at the provider |
| Server breach | Store the minimum; no secrets from Microsoft or Mojang; encrypt at rest; deletion and export work |
| Abusive uploads (skins, sync blobs) | Strict size and type validation (PNG decode, dimensions 64×64 or 64×32), allowlisted keys, rate limits |
| Impersonation by name | Display names are 3-16 chars `[A-Za-z0-9_]`, unique per LOAM, reserved-name list, homoglyph checks; a LOAM name carries no claim about Mojang accounts |
| Leaking via logs | The redactor covers account data; tests with canary tokens |

Add contract tests against a **mock OIDC provider** (no real network in CI) covering: success, state mismatch, nonce mismatch, expired token, wrong audience, refresh rotation, revoked refresh token, loopback port busy, user closes the browser (timeout).

### 4.6 Privacy and legal (the agent drafts; the owner must have it reviewed)

- **Privacy policy and terms**, plain language, linked from the sign-in flow: what is stored, why, how long, how to export and delete.
- **Age gate:** many launchers are used by children, and collecting personal data from minors carries legal obligations that vary by region. Default to **a minimum age appropriate for the strictest target region** and collect only an email, or require a parent-managed flow; **this is an owner and legal decision** (`OWNER_TASKS.md`). Guest accounts need no data at all, so children can always play locally.
- No ads, no tracking, no third-party analytics SDKs in the app or on the account pages.
- `DELETE /account` and `GET /export` are tested end to end.

### 4.7 Guest accounts and unofficial (offline-mode) servers

- **Guest:** one step, no sign-in: choose a name (3-16 chars `[A-Za-z0-9_]`); the offline UUID is derived deterministically as vanilla does (existing implementation; keep its golden tests); arm model preserved; local skin only. Label `GUEST · OFFLINE` wherever the account appears.
- **LOAM Account on offline-mode servers:** joins with its reserved name as an offline-mode player. This gives continuity across devices and name reservation **inside LOAM**; it does not make a server trust the name.
- **One-time notice** when a Guest or LOAM Account first joins any server: "This account can join servers that allow unauthenticated players. It can't join servers that verify Microsoft accounts. Minecraft Java Edition is a paid game; sign in with Microsoft to play on official servers and Realms."
- **Guardrails (hard):** no token, session, or UUID forging; no assuming another player's UUID or name from a lookup; no features to defeat whitelists, bans, or anti-cheat; no "premium bypass" language anywhere in code, UI, website, or docs.
- **Legal review required** for this section's wording and for how Guest play is described in stores, on the website, and in the terms (`OWNER_TASKS.md`). Also keep the Microsoft/Mojang app-approval process separate and honest.

### 4.8 Server list and joining (P1)

- **Servers page** (Game Details tab and a Home action): saved servers, per-server ping, MOTD, players, version, latency, and a **compatibility chip** against the selected game. `JOIN` launches with Quick Play for the selected game, using the version metadata's quick-play arguments where available and the legacy `--server` / `--port` path otherwise.
- **Server List Ping** (Minecraft's documented status protocol): resolve `_minecraft._tcp.<host>` SRV records, connect with a 3 s timeout, send handshake (next-state = status) and a status request, read the length-prefixed JSON reply. Treat everything as **untrusted input**: cap packet and JSON sizes, validate the 64×64 PNG icon, render MOTD as plain styled text (no HTML), parse with a hardened VarInt reader, limit concurrent pings, never ping automatically in bulk. Disclose in the Trust Ledger: "server pings (user-initiated) reveal your IP to that server, like the game itself does".

```rust
async fn ping(host: &str, port: u16, protocol: i32) -> Result<ServerStatus, PingError> {
    // 1. SRV lookup (hickory-resolver) with fallback to host:port
    // 2. TcpStream::connect with timeout(3s)
    // 3. write handshake: varint(len) | 0x00 | varint(protocol) | string(host) | u16(port) | varint(1)
    // 4. write status request: 0x01 0x00
    // 5. read varint(len) (cap 64 KiB) | varint(id == 0x00) | string(json) (cap 32 KiB)
    // 6. optional ping/pong (id 0x01, i64) for latency
}
```

- **Reading and writing the game's own server list** (`servers.dat`, NBT): parse and edit with a well-tested NBT crate, atomic write with a backup, so servers added in LOAM appear in-game and vice versa.
- **Failure messages from the Known-Issues DB** (log patterns such as an unverified-username disconnect, an invalid session, not whitelisted, outdated client or server) map to plain explanations, for example "This server requires a Microsoft account. Guest and LOAM accounts can't join it." No retry loops, no workarounds offered.

### 4.9 Account UI

Account popover and `Settings → Accounts`: the three kinds with capability chips (icon plus text), `Add Microsoft account`, `Sign in with LOAM` (opens the browser), `Create a Guest`, and for a LOAM Account: sync status, `Sync now`, `Sign out and revoke`, `Export my data`, `Delete my account`. Honest copy everywhere (4.1 table). Follow the UI Update Prompt component specs and the website prompt for the account pages.

### 4.10 Tests for accounts

Capabilities table tests (every cell); `LaunchAuth` construction per kind (Guest and LOAM can never produce `Online`); golden tests for the offline UUID; PKCE vector tests (RFC 7636 test vectors); loopback-listener tests (wrong state, double use, timeout, port busy); mock-OIDC suite (4.5); HLC merge property tests; sync conflict simulations with skewed clocks; redaction canaries; E2E for first sign-in on a second device with the review sheet; server-ping fuzz tests (truncated, oversized, malicious VarInts).

---

## 5. Mod Guard (P1)

Checks before launch and when mods change; always advisory and never auto-modifying files.

- **Compatibility:** loader and Minecraft version constraints, required dependencies, duplicate mod IDs, Java version (v1.4.0 section 9.5 parsers).
- **Provenance:** compute SHA-1 and SHA-512 of each JAR and look the hashes up through Modrinth's public hash lookup (batched, rate-limited, descriptive `User-Agent`; disclose in the Trust Ledger). Result per mod: `Matches a known release` (with the project name and link), or `Unknown source` (neutral wording, not "unsafe").
- **Tamper hint:** a mod whose hash changed since LOAM added it is flagged `Changed since added`.
- **Review flags** (not "malware" verdicts): archives containing Windows executables or scripts (`.exe`, `.dll`, `.bat`, `.ps1`, `.vbs`), malformed archives, or a decompression ratio and size beyond safe limits (zip-bomb defense when reading metadata).
- **Actions:** `Disable` (rename to `.jar.disabled`), `Open folder`, `Undo`, `Quarantine` (move to a LOAM folder, reversible).
- **Honest copy:** "Mod Guard checks compatibility and known sources. It can't prove that a mod is safe."
- Tests: fixtures for each flag; zip-bomb fixture; Modrinth responses frozen; offline behavior (checks that need the network are skipped with a note).

---

## 6. World Time Machine (P1)

Automatic, local, space-efficient world snapshots.

- **When:** after the game exits (wait for the process to end, then a short delay; throttled, below-normal I/O and CPU priority, **never while the game is running**), before a loader update or a mod change on that game, and before importing or replacing a world.
- **How:** per-world incremental snapshots using **hardlinks for unchanged files** and copies for changed files (detected by size, mtime, then hash). Region files change in place, so a changed `.mca` is copied whole. Skip if the session lock (`session.lock`) cannot be read, which means the world is in use.
- **Retention (configurable defaults):** keep the last 10 plus one per day for 7 days plus one per week for 4 weeks; a size cap with a clear warning before pruning; pruning never deletes the only remaining snapshot.
- **Restore:** by default restore to a **new copy** named `World (restored 2026-10-03 14:02)`. `Replace current` requires confirmation and **takes a snapshot of the current state first**.
- **Safety:** all operations are journaled transactions (v1.4.0 section 9.1); failure never touches the live world; the feature is off for worlds on drives without enough free space, with an explanation.
- **UI:** Worlds shelf → `History` per world (list of snapshots with date and size, `Restore`, `Open folder`). Cloud snapshots (P2) are opt-in, size-capped, and use the LOAM Account.
- Tests: snapshot of a changing world, hardlink correctness, retention math (property tests), crash during snapshot, restore without overwriting, a locked world.

---

## 7. `.mrpack` import and export (P1)

Support Modrinth's open modpack format (verify the current specification): a ZIP with `modrinth.index.json` (`formatVersion`, `game`, `name`, `dependencies` such as `minecraft`, `fabric-loader`, `quilt-loader`, `files[]` with `path`, `hashes` (sha1, sha512), `downloads[]`, `fileSize`, `env`) plus `overrides/` and `client-overrides/`.

- **Import = a reviewed install, not a store.** Show a Smart-Drop-style review sheet (pack name, game version, loader, mod list with sources) before anything is created; the result is a **new isolated game** through the normal install transaction.
- **Security (zip-slip and supply chain):** every `path` and every override entry goes through `SafeRelPath`; downloads only from the hosts the spec permits (verify: Modrinth CDN, GitHub, GitLab, raw GitHub content), each in the `modrinth-pack` allowlist purpose; verify the sha512 (and sha1) of every file; enforce size and file-count caps; reject absolute paths, `..`, and device names; never execute anything from a pack.
- **Export:** create an `.mrpack` from a LOAM game whose mods are all known on Modrinth by hash (Mod Guard lookup); mods without a known source are listed and the user chooses to include them as overrides or skip them.
- Loader support follows the loaders that actually ship in LOAM. Unsupported dependencies produce a clear message, not a broken install.
- Tests: valid pack, hash mismatch, zip-slip entries, oversized pack, disallowed host, unsupported loader, interrupted download, export then re-import round trip.

---

## 8. Smoothness program: app open, game open, in-game, game exit, app close (P0)

**Reported symptoms:** jitter and lag when the app opens, when the game opens, and when things close. Do not guess; instrument, find the cause on each path, fix the cause, and prove the result with numbers. Reuse the v3 hypotheses H1 to H11 and the v1.4.0 launch-pipeline work, and add the items below.

### 8.1 Principles

1. **Nothing heavy on the critical path.** Open and Play do only what is required; everything else is precomputed, deferred, or concurrent.
2. **No contention during transitions.** No background work competes with window creation, game spawn, or game exit.
3. **Event-driven, not polling.** Wait on handles and OS events rather than timers.
4. **Compositor-only animation, no allocations in animation frames.**
5. **Measure at each step**, on at least a low-end and a mid-range PC, at 60, 120, and 144 Hz where available, and at 100 % and 150 % scaling.

### 8.2 Measurement harness (build first)

- **UI instrumentation** (`window.__loamPerf`, enabled by a flag): `requestAnimationFrame` deltas, `PerformanceObserver` for `longtask`, `event` timing, and `layout-shift`, marks for first paint and interactive; exported as JSON per scenario.
- **Backend tracing:** `tracing` spans with monotonic timestamps for every step on the open, launch, and close paths (Chrome trace-event JSON, viewable in Perfetto).
- **System view:** PresentMon (frame pacing of the LOAM window and the game), and Windows Performance Recorder/Analyzer traces for CPU and I/O contention when a stall has no obvious owner.
- **`scripts/perf/smoothness.ps1`** runs the scenarios 20 times each: cold start, warm start, Play to game window, Play to title screen, Stop, game exit, close while idle, close while a download is running, close while the game runs. Output: median, p95, p99, max, and a `docs/perf/smoothness.md` table (before and after).

**Budgets (hypotheses to validate, per v3 section 1 plus):** LOAM UI frame time p99 ≤ one display refresh (16.7 ms at 60 Hz); no frame > 50 ms during open, launch, or close; no main-thread task > 50 ms; Play press to `javaw` spawned ≤ 300 ms with a valid token; game exit to restored launcher window ≤ 300 ms; close to process tree gone ≤ 500 ms.

### 8.3 Cause catalog (test each; fix what is confirmed)

| Phase | Suspect | Test | Fix |
|---|---|---|---|
| **App open** | Window created and shown before first paint (white flash, reflow) | trace window show vs first paint | Create hidden, set background color, **show on the frontend's first-paint signal**; apply DWM caption and theme attributes **before** showing |
| | Heavy work in `setup` (migrations, seed manifest check, Doctor, catalog refresh) | span timings | Only the minimal state load on the critical path; everything else after first paint, behind the quiet gate (8.4) |
| | Font swap causing layout shift | `layout-shift` entries | Preload used weights; metrics-matched fallback |
| | Large initial JS and render | bundle report, long tasks | Route-level splitting; `startTransition` for non-urgent updates; virtualize long lists; Strata paths precomputed, not generated at startup |
| | Audio context created on the first click (can stall tens of ms) | trace first PLAY press | Create and warm the `AudioContext` on the first user gesture during idle, not on the PLAY click |
| | WebView2 environment creation cost | trace | Single instance; optional tray companion keeps the core alive (8.7); evaluate WebView2 argument experiments only with measurements |
| **Game open** | Background work (Doctor, seed prep, sync, news, Mod Guard lookups, ledger flush, prefetch) overlapping the launch | task registry during launch | **Quiet gate**: pause all background services from 200 ms before spawn until the game window has been visible for 10 s |
| | Process spawn or pipe reading on the UI or a shared runtime thread | thread attribution | Dedicated spawn thread; dedicated pipe-reader threads with bounded buffers (a full pipe can stall the game) |
| | Token refresh, file hashing, natives extraction, `java -version` in the path | spans | Precompute (v1.4.0 section 9; v3 section 4.2); verify by lockfile and size, never by hashing |
| | Launch animation overlapping spawn | frame trace | Compositor-only animation; spawn is already on another thread; animation durations are caps tied to real events |
| | Window-detection polling | CPU samples | Event-based detection (`SetWinEventHook` for show or foreground events filtered by process tree) with a slow fallback poll |
| | LOAM's WebView/GPU process competing with the game | GPU/CPU counters during boot | Game mode: hide, then destroy the WebView window; low priority and EcoQoS for LOAM itself (v3 section 4.5) |
| **In game** | LOAM doing anything | process CPU while playing | Zero timers, zero polling; **wait on the process handle**, not a loop; ledger and playtime flushed lazily |
| | JVM heap resizing, GC pauses, wrong GPU, throttling | GC logs, PresentMon, GPU adapter in use | v3 section 5 and v1.4.0 section 11 (data-driven profiles, GPU preference reconciled per runtime, EcoQoS opt-out verified by read-back) |
| **Game exit** | Launcher restoring its window while the JVM is still writing the world | disk queue length at exit | Restore on process exit event, but defer heavy tasks (snapshots, verification, sync, Doctor) for 5 to 10 s and run them at background I/O priority; World Time Machine waits for the process to end |
| | Rebuilding the WebView takes too long | trace restore | Recreate from the stored UI snapshot; minimal first render; fade-in on opacity only |
| **App close** | Waiting for network or tasks | trace close | Cancel tokens in parallel, single atomic state flush, force-exit watchdog at 1.5 s, destroy the WebView explicitly; verify no orphan `msedgewebview2.exe` |
| | Closing while a download or transaction runs | chaos test | Persist resumable state; transactions roll back or resume by journal; never block on I/O |

### 8.4 The quiet gate (reference sketch)

```rust
/// Background services await this before doing heavy work. While closed, nothing heavy runs.
pub struct QuietGate { tx: watch::Sender<bool> }          // true = open (work allowed)
impl QuietGate {
    pub fn close_for_launch(&self) { let _ = self.tx.send(false); }
    pub fn reopen_after(&self, delay: Duration) { /* after the game window has been visible for `delay`, send(true) */ }
}
// Every background task: `gate.wait_open().await;` before each heavy unit of work; poll `gate.is_open()` between chunks.
// Test: with a fake clock, assert that no registered heavy task makes progress while the gate is closed.
```

### 8.5 Open, launch, and close choreography (order of operations)

**Open:** read minimal state → create the hidden window with the theme background → frontend renders from the UI snapshot → first-paint signal → show (fade in, opacity only) → after idle: seed manifest check, Doctor (quiet), catalog and news refresh, token refresh, prewarm of the selected game.
**Play:** press (120 ms) → quiet gate closes → spawn on the dedicated thread → launch strip with real steps → event-based window detection → strip completes → content fade and scale 0.985 → Game mode (hide or destroy WebView) → gate reopens 10 s after the window is visible.
**Game exit:** process-handle event → restore window from the snapshot (fade) → `Session ended` card → deferred background tasks after the settle delay.
**Close:** fade 150 ms in parallel with: cancel tokens, one atomic state write, WebView destroy, exit; watchdog at 1.5 s.

### 8.6 Optional tray companion (P2, opt-in)

`Settings → Performance → Fast reopen`: keeps a small Rust-only process (tray icon, no WebView, about 10 to 20 MB) after close, so reopening is faster. Off by default, no autostart unless the user turns on `Start with Windows`, and always removed on uninstall. Measure and report the memory cost honestly.

### 8.7 Acceptance

`docs/perf/smoothness.md` shows before and after for every scenario on every test machine, each budget met or the remainder explained with evidence; no frame over 50 ms in the open, launch, and close traces; no orphan processes; the quiet-gate test passes.

---

## 9. Code revamp charter: logic, math, and physics (P0)

**Goal:** a codebase that is smaller, clearer, provably correct where it matters, and faster. **Method: strangler, not big-bang.** Replace one module at a time behind tests, keep the app shippable after each step, and prove equivalence before deleting old code.

### 9.1 Scorecard and order

Score every module (size, cognitive complexity, duplicated logic, `unwrap` count, test coverage, bug history from the crash reports). Revamp in descending score. Expected top candidates (confirm with data): `engine.rs`, `catalog.rs`, `network.rs`, `storage.rs`, the Smart Drop and Skin Studio code, frontend state and `InstallSheet.tsx`. Record the scorecard and the order in `docs/v1.5.0/REVAMP_PLAN.md`.

### 9.2 Differential testing (the safety net)

For each rewritten module, keep the old implementation callable behind a test-only shim, then assert equivalence across the whole catalog fixture set:

```rust
#[test]
fn new_launch_plan_matches_legacy_for_every_version() {
    for v in catalog_fixture_versions() {                 // vanilla 1.0 … 26.3, Fabric/Quilt tier fixtures
        let old = legacy::build_plan(&v).expect("legacy plan");
        let new = launch::build_plan(&v).expect("new plan");
        assert_eq!(normalize(&old), normalize(&new), "plan differs for {v}");
    }
}
```

Every **intended** difference (a bug fixed on purpose) is listed in `docs/v1.5.0/INTENDED_DIFFS.md` with its reason and test; any other difference fails the build. Legacy shims are deleted only when the new module has shipped in a release candidate and the fixtures are green.

### 9.3 State machines instead of flags

Model every multi-step behavior as an explicit state machine with a transition table and exhaustive tests (every state × event is either a defined transition or an explicit ignore; no panics; invariants hold). Required machines: **Play control**, **Install transaction**, **Account session**, **Sync**, **World snapshot**, **Server ping**.

```text
PlayState: NotInstalled | Installing{progress} | NeedsRepair | Ready | Launching{step} | Running{pid,since}
         | Stopping | Exited{code,duration} | Error{code}
Events:    InstallRequested | InstallProgress | InstallDone | VerifyFailed | PlayPressed | StepDone
         | WindowShown | StopPressed | ProcessExited | RepairDone | ErrorRaised | Reset
Examples:  Ready --PlayPressed--> Launching{0}          Launching --WindowShown--> Running
           Running --StopPressed--> Stopping            Stopping|Running --ProcessExited--> Exited
           NeedsRepair --RepairDone--> Ready            any --ErrorRaised--> Error   (Error --Reset--> prior stable state)
Invariants: Running ⇒ pid exists; Installing ⇒ a live transaction; Ready ⇒ launch dry run passed (v1.4.0 section 8.3)
```

The UI renders from the state (one component per state), so impossible UI states cannot exist.

### 9.4 One tested math library (`domain/math` in Rust, `lib/math` in TypeScript)

Each function is pure, documented, property-tested, and used everywhere instead of ad-hoc arithmetic:

| Module | Contents |
|---|---|
| `units` | byte formatting (1024-based, labeled), speeds, durations; integer-only byte math |
| `progress` | byte-weighted, phase-weighted, monotonic aggregate; clamps; no `NaN` or `Infinity` |
| `smoothing` | frame-rate independent exponential moving average (below); ETA with stall handling |
| `spring` | critically damped spring and inertia (below) |
| `heap` | memory plan from RAM, version era, loader, and mod count; round-trip with JVM arguments |
| `version` | natural numeric ordering of Minecraft versions; manifest-time ordering for snapshots |
| `predicate` | Fabric and Quilt version-range evaluation |
| `hlc` | hybrid logical clock for sync merges |
| `uuid_offline` | deterministic offline UUID (golden vectors) |
| `retention` | snapshot retention selection (last N, daily, weekly) |

```ts
// Frame-rate independent exponential smoothing: same result at 60, 120, or 144 Hz.
export function ema(prev: number, sample: number, dtSeconds: number, tauSeconds: number): number {
  const alpha = 1 - Math.exp(-dtSeconds / tauSeconds);
  return prev + alpha * (sample - prev);
}

// Critically damped spring, closed form (no overshoot, stable for any dt).
export function smoothDamp(x: number, v: number, target: number, omega: number, dt: number): [number, number] {
  const e = Math.exp(-omega * dt);
  const d = x - target;
  const t = (v + omega * d) * dt;
  return [target + (d + t) * e, (v - omega * t) * e];
}
```

### 9.5 UI physics (skin viewer, sheets, drag gestures)

- **Skin viewer:** orbit with inertia. Dragging sets a target; on release the angular velocity (moving average of the last ~100 ms) decays as `v ← v·exp(−k·dt)` with `k ≈ 4 to 6 s⁻¹`; zoom uses `smoothDamp` with `ω ≈ 12`; pitch is clamped (about ±80°); a **fixed-timestep accumulator** (1/120 s) with `dt` clamped to 50 ms makes behavior identical at any refresh rate and after a stall; guard every value with `Number.isFinite`; **sleep** (stop rendering) when velocity and error are below epsilon; pause when hidden; `prefers-reduced-motion` disables inertia (instant response); handle DPR changes and resize with `ResizeObserver`.
- **Sheets and drawers:** drag-to-dismiss uses a spring with velocity hand-off and a dismiss decision on the **projected** position (`x + v·0.2`), so a fast flick closes it even if the drag was short.
- **Tests:** critical damping (no overshoot), convergence time within tolerance, frame-rate independence (final state equal within epsilon for `dt` of 1/60, 1/120, 1/144), energy decay of inertia, no `NaN` after a long frame, behavior after a 500 ms stall.
- Keep animation CSS for simple transitions; use JS physics only where interaction demands it. Everything remains compositor-only (`transform`, `opacity`).

### 9.6 Logic rules

No sentinel values; newtypes for domain strings (v1.4.0 section 6.3); capabilities as data (4.1); one place per concern (downloads, hashing, launch plans, token refresh, account sessions); commands stay thin; Win32 behind traits; every `match` is exhaustive (no wildcard arms on domain enums); errors are typed with stable codes.

### 9.7 Revamp acceptance

Behavior preserved except `INTENDED_DIFFS.md`; coverage and mutation targets from v1.4.0 section 14 met on the revamped modules; total lines of non-generated code and the count of `unwrap`/`expect` reduced (report the numbers); startup and launch budgets not worse than the baseline.

---

## 10. Testing additions for v1.5.0

| Area | Tests |
|---|---|
| Signing and trust | build fails on unsigned or wrongly-signed binaries; Verify-this-app shows the real publisher and hash; forbidden-string scan (below) |
| Accounts | section 4.10 in full |
| Server list | ping fuzzing and malformed-packet corpus; compat chip table tests; `servers.dat` round trip with backups |
| Mod Guard | fixtures for each flag; zip-bomb; frozen Modrinth responses; offline behavior |
| World Time Machine | incremental snapshot correctness; retention property tests; crash mid-snapshot; locked world; restore never overwrites |
| `.mrpack` | section 7 test list |
| Smoothness | scenario runs with budgets; quiet-gate test; no orphan processes |
| Revamp | differential tests on every revamped module; state-machine exhaustiveness |
| Physics and math | section 9.5 and property tests on `domain/math` |
| Installer | clean Windows 10 and 11, signed Lite and Full, upgrade from 1.4.0 and 1.3.0, uninstall cleanup, network-off first run (Full), SmartScreen outcome recorded |

**Forbidden-string scan** (`scripts/forbidden-strings.ps1`, part of `verify`): fails if `src/`, website content, installer text, or in-app copy contains phrases such as "disable SmartScreen", "turn off Defender", "add an exclusion" (outside the documented, optional, user-driven guidance in Doctor), "premium bypass", "free Minecraft", or "cracked". The scan guards honesty and trust rules automatically.

---

## 11. Release engineering for v1.5.0

1. **Version 1.5.0** everywhere; `CHANGELOG.md`; an honest in-app "What's new".
2. **Signed artifacts:** Lite and Full installers, main executable, helpers; timestamps; verification output saved in the release report.
3. **Scans and submissions:** Defender command-line scan and a multi-engine check of each release candidate; submit the signed release to Microsoft and AV false-positive channels; record outcomes. **Do not upload anything unsigned.**
4. **Distribution:** official domain and GitHub release with SHA-256 and `SECURITY.md`; generate the winget manifest (`wingetcreate`); other channels per the owner's decision.
5. **Account backend:** deploy to a staging then production environment; infrastructure as code; secrets only in the platform's secret store; runbook (deploy, rollback, key rotation, incident contact); backups; **server-side metrics are aggregate only (request counts, errors, latency), never user content**; a status page.
6. **Feature flags:** `accounts.loam.enabled` ships **off** until the backend, privacy policy, terms, and age policy are approved; Guest accounts, Trust Ledger, Mod Guard, Time Machine, and the server list ship per their tests.
7. **Website updates (follow-up prompt):** Lite and Full downloads, signed status and publisher, the verification steps, LOAM Account pages (sign up, sign in, privacy, delete my data), and the honest capability table.
8. **Release report** `docs/v1.5.0/RELEASE_REPORT.md`: what shipped, flags left off and why, measurements (including the smoothness table and installer sizes), the clean-VM SmartScreen outcome, unverified items, known issues.

---

## 12. AI coding playbook additions for this release

1. **Threat-model before writing auth code.** Make the agent produce `THREAT_MODEL.md` first and review it. Authentication, token storage, and deep links are where plausible-looking code is most dangerous.
2. **Use vetted libraries and standards, never hand-rolled crypto or OAuth.** Prefer maintained OIDC and OAuth crates, verify against the RFC test vectors (PKCE), and test against a mock identity provider.
3. **Secrets hygiene.** No secrets in the repo, logs, or prompts; add a secret scanner (for example `gitleaks`) to `verify`; signing keys exist only in CI secrets or a managed signing service.
4. **Strangler plus differential testing** for the revamp: old and new implementations compared across the fixture catalog; intended differences are written down.
5. **State machines first.** Write the transition table and exhaustive tests before the UI; render the UI from state.
6. **Fake clocks for time-dependent logic** (HLC, retries, quiet gate, snapshot retention, token expiry). Time bugs are invisible without them.
7. **Trace-driven development for smoothness.** Write the expected timeline first, then make the real trace match it; budgets are tests.
8. **Performance regression tests.** Benchmarks (`criterion`) for hot paths, scenario scripts for UI, and thresholds that fail the build.
9. **Read the current docs, don't recall them,** for Microsoft signing and SmartScreen behavior, Tauri 2 config keys, the Modrinth pack format, and Windows APIs. Record each finding in `DECISIONS.md` with the source.
10. **Honest-copy linting.** Automated forbidden-string scans keep unsafe advice and misleading claims out of the product.
11. **Short milestone prompts that link documents**, a plan-diff before any large refactor, and an adversarial review in a separate session after each milestone.
12. **Security-persona review** after the accounts milestone: try to break the sign-in flow, the loopback listener, the sync API, and the ping parser.

**Prompts**

```
Threat-model prompt:
Produce THREAT_MODEL.md for <feature>. List assets, actors, trust boundaries, and STRIDE threats with a mitigation and
a test for each. Mark anything you cannot mitigate. Do not write implementation code until I approve the model.
```

```
Differential-testing prompt:
Rewrite <module> using the strangler pattern. Keep the old implementation behind a test-only shim, write a test that compares
old and new outputs across all catalog fixtures, list every intended difference in INTENDED_DIFFS.md, and do not delete the old
code until the comparison passes and the module has shipped in a release candidate.
```

```
Smoothness prompt:
Add tracing for <scenario>, run scripts/perf/smoothness.ps1 before changing anything, identify the owner of each stall using
the trace, fix only confirmed causes, and re-run. Report before/after medians, p95, p99, and max. Say what you could not measure.
```

---

## 13. Definition of done

- [ ] v1.4.0 ledger items verified; unfinished ones completed.
- [ ] `verify` passes locally and in CI; zero warnings; secret scan and forbidden-string scan pass.
- [ ] **Trust:** all binaries signed and verified in the build; installer shows the publisher on a clean VM; the SmartScreen outcome is recorded honestly; Verify-this-app works; no forbidden "fix" exists; `OWNER_TASKS.md` lists every item that needs the owner.
- [ ] **Accounts:** capabilities table implemented as data; Guest works with no sign-in; LOAM Account sign-in, sync, export, delete, and sign-out-and-revoke pass against the mock IdP; PKCE vectors, loopback, and HLC property tests pass; the threat model is written and reviewed; flag off until backend and legal approvals.
- [ ] **Unofficial servers:** Guest and LOAM Account join offline-mode servers; online-mode refusals produce the plain message; no bypass or forging code or wording anywhere.
- [ ] **Smoothness:** before and after table for every scenario; budgets met or explained; no frame over 50 ms in open, launch, and close; quiet-gate test passes; no orphan processes.
- [ ] **Revamp:** scorecard and plan done; differential tests green; `INTENDED_DIFFS.md` reviewed; state machines exhaustive; math library tested; physics tests (damping, frame-rate independence, stall behavior) pass; reduction in code size and `unwrap` count reported.
- [ ] Trust Ledger, Mod Guard, World Time Machine, server list, `.mrpack`: each passes its test list or its flag stays off.
- [ ] Lite and Full installers tested on clean Windows 10 and 11, including upgrade, uninstall cleanup, and the network-off Full first run.
- [ ] `RELEASE_REPORT.md` lists measurements, flags left off, and every unverified item.

---

## 14. Owner tasks and decisions (the agent cannot do these)

1. Obtain and validate a **code-signing identity**; choose OV, EV, or the Trusted Signing service after reading current Microsoft documentation; provide it to CI as a secret.
2. Register the **domain**, DNS, and TLS; set up the website, `SECURITY.md` contact, and a support email.
3. Choose the **identity provider** and hosting for the account backend; accept the running costs and the data-protection duties (privacy policy, terms, export and deletion handling).
4. Decide the **age policy** and have the privacy policy and terms reviewed by a lawyer.
5. Have the wording of **Guest and unofficial-server support** reviewed by a lawyer, and decide how it is described in distribution channels; follow the Minecraft Usage Guidelines and brand rules for any use of the name.
6. Decide on **Microsoft Store and winget** submissions; complete the Microsoft/Mojang application approval needed for Microsoft sign-in.
7. Submit signed releases to **Microsoft and antivirus vendors** for analysis.
8. Provide **test hardware** (low-end, mid-range, a hybrid-GPU laptop, a high-refresh display) and clean Windows 10 and 11 VMs.

## 15. Appendices

**A. New error code families:** `LOAM-ACC-*` accounts and sessions · `LOAM-SYN-*` sync · `LOAM-SGN-*` signing and verification · `LOAM-SRV-*` server list and ping · `LOAM-MOD-*` Mod Guard · `LOAM-WTM-*` World Time Machine · `LOAM-PCK-*` pack import and export.

**B. Fixtures to create:** RFC 7636 PKCE vectors; OIDC discovery and JWKS documents plus expired, wrong-audience, and wrong-nonce tokens; sync blobs with skewed HLC timestamps; malformed and oversized server-ping packets, valid and invalid icons, `servers.dat` samples; Modrinth hash-lookup responses; a zip-bomb JAR, a JAR containing an `.exe`, an altered JAR; `.mrpack` files (valid, zip-slip, bad hash, disallowed host); worlds with a changing region file and a locked `session.lock`; before and after smoothness traces.

**C. Double-check against live sources (never assume):** current Microsoft guidance on how SmartScreen reputation works for OV, EV, and Trusted Signing certificates, and Trusted Signing's eligibility, name, and regions; Tauri 2 signing keys; winget validation rules and installer requirements; Microsoft Store policy on offline accounts; Minecraft Server List Ping protocol details and quick-play arguments per version; Modrinth hash lookup and `.mrpack` specifications and allowed hosts; the OIDC provider's native-app and PKCE support, refresh-token rotation, and data-export features; `windows` crate names for process and window events; WebView2 behavior for hidden-window creation and destroy-and-recreate.