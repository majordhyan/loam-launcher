# v1.5.0 implementation plan — 2026-10-03

Preserve the existing UI, palette, layouts, navigation, user data and uncommitted work.
The five concept PNGs are references, not evidence of implemented functionality.

1. Audit v1.4.0 claims, retain baseline test evidence and inventory source complexity.
2. Land bounded local performance capture, repair confirmed resource leaks and arithmetic errors;
   characterize behavior with tests. No performance improvement claims without traces.
3. Add fail-closed release signature and honest-copy checks plus one verification entry point.
4. Continue the carry-over P0 backlog in LEDGER.md: transactions/newtypes, runtime validation,
   Doctor, Full seed, lifecycle/quiet gate. Each is a separate tested milestone.
5. Build LOAM OIDC only after threat-model review and provider configuration; feature remains off.
6. Add tested P1 services behind feature flags. Build and validate a signed release candidate
   only after owner prerequisites and independent implementation gates are satisfied.

This pass implements steps 1–3, not the complete release. Keep the package at 1.4.0 until
there is a coherent v1.5.0 release candidate; do not relabel the old installer.
