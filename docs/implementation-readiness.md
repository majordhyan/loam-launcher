# LOAM Launcher — analysis and implementation preparation

Prepared 30 September 2026 from `C:\Users\Dhyan\Downloads\LOAM_Launcher_Remaster_Brief_v2.md`.

## Assessment and scope of this preparation

The brief provides a strong product direction, unusually explicit failure behavior, and useful release gates. The project is ready for staged implementation once the native toolchain is available. It is not ready for a release commitment: authentication access, runtime provisioning, safe imports and installer recovery need early proof.

The user's current request is to analyse and prepare. Section 11 is an embedded future build prompt, not authorization to begin the complete build, install toolchains, register services, or distribute software. This preparation creates documentation only. No app, installer or test pass is claimed.

This is a substantial desktop systems project: a launcher engine, identity integration, transactional content manager, support workflow and Windows distribution pipeline behind a restrained interface. The visual shell is only one part of completion.

## Verified starting point

| Check | Observed result |
|---|---|
| Repository | Workspace contains only `.git`; clean status; no existing app or workspace AGENTS.md |
| Host | Windows 11 Pro x64, build 26200 |
| Node / npm | Node 24.18.0; npm 11.16.0 |
| Rust | `rustc` and `cargo` unavailable on PATH; default user `.cargo/bin/rustc.exe` absent |
| Native compiler | Visual Studio Community 2026 18.10.2 found by vswhere with x86/x64 VC tools component |
| WebView2 | Runtime 154.0.4258.37 registered |
| Native build readiness | SDK/linker compilation and Rust MSVC target still need a real smoke build |
| Official Minecraft manifest | Direct HTTPS query returned latest release `26.3`, snapshot `26.4-snapshot-2`; `26.3` present |
| External configuration | No app registration, Discord invite, feed host, signing material or test account supplied in this request |

Manifest results are a point-in-time observation, not a version list to embed. No game binaries were downloaded and no credentials were accessed.

## Proposed scope baseline

- Required: gates A–G for v1.0, and H before any public distribution. Treat A–H as the public-release acceptance set.
- Vanilla and Fabric only; discover exact versions and loader availability from metadata.
- Microsoft and clearly labelled Offline Profiles; no third-party authentication in v1.
- Isolated games, reviewed imports, backups, evidence-based errors, user-controlled diagnostics export.
- Light theme first, native title bar, keyboard support, forced colors and reduced motion from the beginning.
- Proposed font default: Geist + Geist Mono, locally bundled with notices. Final identity approval remains an owner decision.
- No telemetry, automatic report submission, mod marketplace, Forge/NeoForge or automatic dependency solving.

## Ambiguities to resolve in the implementation specification

| Issue | Proposed resolution |
|---|---|
| Dark theme deferred to v1.1 but Appearance lists light/dark/system | Ship light only initially; do not expose inactive theme choices. Forced colors remains required. |
| Language setting without translations or supported locale list | English first with externalized strings; hide language selection until another locale exists. |
| Gate A asks for all controls before backend gates | During development, expose only implemented actions or explicit configuration blockers. Story fixtures can cover future states without pretending they work in the app. |
| First run says no downloads before INSTALL while version/size review requires metadata | Permit small metadata requests for review; defer client, assets, libraries and runtime payloads until explicit install. Distinguish CREATE from INSTALL consistently. |
| Shader ZIP support without a shader renderer | Import as content only after review; disclose required compatible renderer. Do not claim vanilla/Fabric alone enables shaders or install dependencies silently. |
| Ambiguous resource/shader/world archives | Inspect bounded metadata and structure; reject ambiguous input. Do not execute JARs during inspection. |
| Modrinth URL allowlist vs pack file download hosts | Separate navigation, API and artifact-host policies. Validate redirects and each pack URL; reject disallowed hosts explicitly. Resolve the precise permitted set against current format documentation. |
| Pack dependencies vs no dependency solving | Support explicitly declared supported game/loader dependencies; report missing mod dependencies. Reject packs needing unsupported loaders. |
| Global minimum game version | Use manifest chronology/type policy, not numeric or lexical version comparisons across 1.x and 26.x naming. |
| Offline Microsoft sessions | Define behavior explicitly: failed refresh does not silently convert identity to an Offline Profile. Offer an explicit profile switch. |
| Realms and skins in account chips | Describe identity capabilities; these do not promise a launcher Realms browser or skin editor. |
| Known-issue example recommends older Java for UnsupportedClassVersionError | Treat sample text as illustrative. The actual class/runtime mismatch must determine advice; lowering Java may make it worse. |
| “Rollback-safe” updater | Signature verification alone is insufficient. Specify interrupted-install recovery and app-data schema compatibility; preserve data and test recovery to a prior build. |
| Cross-volume storage migration and atomic imports | Atomic rename applies within a volume. Stage on the destination volume, verify, journal, then commit; keep the source until success. |
| Running games during backup/import/update | Block conflicting mutations; define process shutdown and backup consistency. Avoid copying actively changing worlds as if consistent. |
| Game-data importer includes version metadata near credential files | Enumerate explicit allowed paths and metadata filenames; do not recursively scan arbitrary launcher files or read auth files for classification. |
| Diagnostics preview and 1,800-character cap | Preview the exact sanitized export; truncate user fields with visible markers while retaining report ID and essentials. Never claim a ZIP is attached before the user attaches it. |
| “Never execute dropped files” vs installed mods | Never execute during inspection/import. Explain that accepted mods will execute later inside Minecraft when the user launches. |

These are proposed interpretations, not changes to the supplied brief. They can be carried into implementation without blocking independent work.

## Architecture prepared for implementation

Keep React responsible for presentation and interaction. Rust owns filesystem access, network policies, secrets, metadata resolution, installation, process lifecycle and diagnostics. The frontend must never receive refresh tokens or raw launch credentials.

Use typed commands and events with operation IDs, stable game IDs, structured error codes and explicit cancellation. Operation snapshots should let the UI reconnect without losing progress. Store schema-versioned metadata atomically and keep credentials in Windows Credential Manager.

Define core records before screens: Game, AccountSummary, ResolvedInstallPlan, DownloadJob, OperationSnapshot, ImportPlan, BackupRecord and DiagnosticReport. An install plan lists every artifact, origin, expected hash, size, destination and runtime requirement. An import plan records source fingerprints, proposed changes, conflicts and backup requirements; revalidate before commit.

The operation lifecycle should distinguish planning, downloading, verifying, committing, ready, launching, running, failed and cancelled. Installation readiness is a verified persisted result, not the existence of a directory. Track process state independently so reopening the launcher does not incorrectly allow duplicate launches or destructive operations.

Security controls belong in the initial design: destination canonicalization, Windows junction/reparse-point handling, archive entry/byte limits, redirect validation, least-privilege IPC, structured logging and redaction before persistence. Advanced JVM arguments require particular care because agents and classpaths can load arbitrary code.

Cache cleanup needs reference tracking and locks. Shared cached content must not be writable through a game directory in a way that corrupts another game's installation. Disk estimates must account for cache reuse, extraction, staging and backup overhead; mark estimates where exact totals are unavailable.

## Build sequence and evidence

| Stage | Deliverable | Exit evidence |
|---|---|---|
| 0. Feasibility | Rust MSVC toolchain and SDK validation, dependency/license register, auth setup notes, runtime source decision | Native Tauri smoke build; unresolved external access documented |
| 1. Foundation / A | Tokens, native shell, typed boundary, schema persistence, keyboard/focus handling, initial working screens | Real settings/profile persistence; contrast and keyboard checks |
| 2. First playable slice / B + local C + E | Manifest selection → explicit install → verification → Offline Profile → vanilla launch | Real launch of 1.16.1 and 26.3; cancellation and corrupt download evidence |
| 3. Online identity / C | PKCE browser flow, verification, secure refresh/sign-out | Consenting owner account tested, or external access marked BLOCKED |
| 4. Games and content / D + E | Fabric, isolated games, transactional import, backup/restore, migration | Real compatible mod launch; malicious archive fixtures; source files preserved |
| 5. Support / G | Report preview, redacted ZIP, report IDs, feed matching, Discord action | Canary secrets absent across exports; report length; ZIP opens; URL validation |
| 6. Finish A–G / F | Complete required UI states, accessibility, branding, NSIS packaging | Static checks plus clean Windows 10/11 install/launch/uninstall evidence |
| 7. Public release / H | Signed updates, release notes, recovery behavior | Reject tampered update; install valid update; interrupted-update recovery; retained user data |

Begin redaction, cancellation, disk accounting and transaction journaling alongside the first backend work. Gate E is a cross-cutting requirement, not late polish. Plan the identity access proof early because it depends on external approval.

Use PASS, FAIL, BLOCKED, NOT RUN and NOT IMPLEMENTED in evidence records. Record OS, game version, Java version, loader, account mode, artifact commit/hash and logs. Separate “designed to support” from “tested on”; two releases cannot validate the whole supported range.

For UI coverage, test all section 4.8 states at the required scaling levels, plus actual Narrator, forced-colors, text zoom and keyboard journeys. Browser viewport resizing alone does not prove Windows DPI behavior. Windows 11 host access does not satisfy clean Windows 10/11 VM acceptance.

## Owner inputs and when they are needed

| Input | Needed by | Independent work remains possible |
|---|---|---|
| Public client ID, redirect configuration and Minecraft service approval | Real Microsoft login proof | Shell, local profiles, install engine, imports, reports |
| Consenting Minecraft-owning test account | Identity acceptance | All implementation and mocked protocol failure tests; no credentials in chat |
| Permanent Discord invite and configured community | Final support link and release config | Local report builder and ZIP export |
| Public HTTPS issue/update hosting and publishing access | Live feeds/update testing | Parsers, fixtures, cache and signatures |
| Updater signing keys through a secure secret store | Signed update acceptance | Update UI and local failure-path testing |
| Windows code-signing certificate, if chosen | Signed installer distribution | Unsigned local installer; report actual signing status |
| Brand approval and font choice | Final packaged assets | Geist-based token/layout implementation |
| Clean Windows test environments / CI | Release evidence | Current Windows host development |

Private signing keys, tokens and account passwords should not be stored in the repository or requested as chat text. Public client ID and URLs are configuration, not secrets. Missing inputs are release/verification dependencies, not reasons to stop unrelated implementation.

## Sources and verification limits

- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/): used to assess Rust and Windows native prerequisites. A real compiler/linker check remains pending.
- [Tauri updater](https://v2.tauri.app/plugin/updater/): signed update mechanism; recovery behavior still needs project-specific design and testing.
- [Microsoft authorization-code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow): PKCE flow reference. This does not establish Xbox/Minecraft API approval for LOAM.
- [Official version manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json): read directly via PowerShell HTTPS after browser retrieval failed; point-in-time versions recorded above.

Modrinth format retrieval through the browser failed in this preparation. Fabric API details, Minecraft service access/error codes, runtime distribution licensing, exact dependency versions, font licenses, NSIS bitmap sizes and all contrast ratios remain verification tasks before their respective implementation decisions. The brief's listed links and estimates are not substitutes for those checks.

Preparation is complete. The next implementation milestone is a native shell and one verified vanilla install-and-launch path, with foundations for safe operations and honest status reporting.
