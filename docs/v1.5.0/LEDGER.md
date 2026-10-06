# Carry-over ledger — inspected 2026-10-03

Statuses apply to this working tree, not historical assertions.

| v1.4 milestone | Status / evidence | v1.5 priority |
|---|---|---|
| M0 Foundation | Partial: existing Windows CI, 28 Rust and 6 baseline frontend tests pass. New verify script and perf capture added. No complete fixture corpus, generated IPC or secret scan yet. | P0 |
| M1 Bug sweep | Partial: supplied 1.4 installer hash and size verified; no complete F1–F15 sweep. | P0 |
| M2 Newtypes / bug guards | Partial: loader-colon and traversal regression tests pass; unknown size still represented by zero, string-based loader contracts remain. | P0 |
| M3 Architecture / typed errors | Incomplete: large dispatch, string errors and scattered clients remain; scorecard in REVAMP_PLAN. | P0 |
| M4 Install transactions / store | Partial: atomic state and resumed/hash-verified downloads tested. No full journal/chaos suite across all operations. | P0 |
| M5 Full Edition / seed | Not implemented in inspected tree: no signed seed lock, resource-provider chain or Full installer. | P0 |
| M6 Doctor / Launch Insurance | Not implemented as specified; no complete fake-environment check suite or safe-mode recovery. | P0 |
| M7 Java / legacy / loader sweep | Partial: live source adapters and Java provisioning exist, loader planning fixture passes. Complete real-game tier matrix and runtime health checks unverified. | P0 |
| M8 Smoothness / tuning | Partial: child.wait and drained pipes exist; window detection polls; GPU settings lack ownership reconciliation. Historical benchmark table has no trace evidence established in this pass. | P0 |
| M9 UI / audio / menus | Partial: existing design retained; text-field context menus present; audio bounded/cleaned, hidden preview paused and blob lifecycle fixed. Full visual/accessibility matrix unverified. | P0 |
| M10 Optional features | Incomplete: v1.5 optional features explicitly off in configuration. | P0 |
| M11 Release QA | Incomplete: 1.4 installer unsigned; no clean Windows 10/11 VM evidence established this pass. | P0 |

## Earlier version claims

- v1.1: Java and skin code exists; no new real-game launch or runtime matrix claimed.
- v1.2: Windows tuning exists; EcoQoS does not by itself prove P-core placement or FPS gains.
  UUID adjustment for skin model remains a compatibility risk: do not silently change existing player identities.
- v1.2.1: Mojang, Fabric and Quilt adapters exist; catalog presence is not launch certification.
- v1.3: loader parsing and download reliability tests pass; audio robustness needed the fixes in this pass.
- v1.4: resource-pack metadata fixture passes, but broad compatibility ranges are not proof of all-version support.
  Installer: 4,627,762 bytes, SHA256 C7C2238B91F8599F0D264886A348A6E47CE7841CFA69CC3A887DCA4AE91AAC9C, NotSigned.

## v1.5 additions

Trust Ledger, OIDC/sync/backend, Mod Guard, Time Machine, server list and pack export remain
unfinished. Signing checks exist; signing and reputation do not. Performance capture exists;
budgets and end-to-end scenarios remain unmeasured. No release gate is marked complete by inference.

## RC.2 implementation update — 2026-10-04

- Settings / About now reads real binary signature/hash and provides local selected-game checks.
- Small, measured cache repairs run once before launch; limits and path confinement have regression tests.
- New installations validate classpath ZIP directories before setting ready; unmarked runtime extraction
  is not considered usable, and arbitrary system-Java fallback has been removed.
- Game-window minimize and exit restoration are wired. Tray mode remains disabled.
- Installer built with custom LOAM artwork and native paper/terracotta theme.
- The existing Fabric planning integration test uses live upstream services, not frozen fixtures;
  its success is a live planning check, not a real-game launch or a hermetic fixture test.

These are partial advances on M6/M8/M9/M11. They do not complete the Full Edition,
complete Doctor coverage, OIDC/backend, quiet gate or clean-VM certification requirements.
