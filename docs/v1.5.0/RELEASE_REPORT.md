# v1.5.0 progress report — development candidates, not public certification

## 2026-10-04 RC.2 superseding status

Package version is now 1.5.0-rc.2. It includes the earlier polish plus local app signature/hash
verification, selected-game checks, bounded cache repair, stricter installation checks,
working minimize/restore, corrected date/capability copy, and custom NSIS presentation.
Read CHANGELOG.md and LEDGER.md for current scope; the older pass report below is history.
Current test/build evidence: verify-rc2.log and bundle-rc2.log. Artifact metadata and native
smoke-test results are recorded separately in artifact-rc2.json and packaged-checks.md.
No public upload is authorized or performed. Signing and other release gates remain blocked.

## Earlier foundation pass

The original page layout and CSS are preserved. No installer was rebuilt, published or relabeled
in this pass. Package metadata remains 1.4.0 until a coherent 1.5.0 candidate exists.

Implemented: bounded audio voices and graph cleanup; safe audio-device failure handling;
skin image decode/cancellation and blob cleanup; hidden preview pause and live reduced-motion
handling; finite binary-unit formatting with differential tests; bounded opt-in local UI traces;
developer verify entry point; honest-copy scan; fail-closed signature verification and CI hooks;
prior-version ledger, scorecard, threat-model draft and owner-task list.

Validation results are recorded in verify.log. Tests involving Web Audio and browser performance
are mocked; they do not establish real device latency, frame pacing or sound quality.
The production frontend build still warns about the lazy 3D wardrobe chunk exceeding 500 kB.
This warning is retained, not hidden by increasing a threshold. CI has not been run remotely.

Ran / passed locally: 12 frontend tests, TypeScript typecheck, production frontend build,
17 Rust unit tests, 11 Rust integration tests, Clippy with warnings denied, product-copy scan.
Negative gate check passed: an unconfigured publisher is rejected with LOAM-SGN-CONFIG.
No clean-VM, real-game, live Microsoft or hosted-account test was run in this pass.

Existing artifact verified: LOAM_Installer.exe, 4,627,762 bytes, Authenticode NotSigned,
SHA256 C7C2238B91F8599F0D264886A348A6E47CE7841CFA69CC3A887DCA4AE91AAC9C.
This is the pre-existing 1.4.0 artifact and does not contain the changes in this pass.

Remaining: carry-over P0 milestones in LEDGER.md; complete native/UI performance scenarios;
secret scanner integration; signed release build pipeline and complete binary inventory;
OIDC/backend/sync contract suite; Full seed; Doctor; purpose-scoped HTTP ledger;
Mod Guard, Time Machine, server list and mrpack export; clean-VM install/update/uninstall
and DPI/Narrator matrix. Optional feature flags remain false. No SmartScreen improvement claimed.
