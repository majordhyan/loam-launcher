# Architecture and safety

React renders local state and invokes the Rust `dispatch` boundary. All game I/O, network requests, hashes, process management and credentials live in Rust. Long operations run outside the UI thread, are serialized, and emit typed progress records. Frontend browser preview cannot install or launch anything.

`catalog` resolves official manifest entries, inheritance, Windows x64 rules, libraries, assets, logging and Java requirements. `network` restricts HTTPS origins and redirects, verifies metadata hashes, resumes partials and retries three times. `engine` installs isolated games, probes Java version/architecture, checks required launch files, creates a redacted plan, and starts Java with an argument vector. It removes inherited Java-option environment variables.

Data schema 1 lives in the per-user data directory. Opaque UUIDs identify games. Shared cache files retain upstream hashes; game saves are isolated. State writes use a same-directory temporary file, sync, and atomic replacement. Backups preserve content before import/restore/toggle operations. Migration SHA-256 verifies every copied file before changing the persistent storage pointer; the source remains intact.

Archive review rejects traversal, rooted/ADS paths, Windows device names, path collisions, links/junctions, oversized entries, excessive ratios and more than 50,000 entries. Extraction is bounded by declared entry size and total limits. A review token binds a file import to its SHA-256. Apply stages changes, writes a durable backup/transaction record, and renames staged files. A failed apply attempts rollback; an interrupted transaction blocks launch until recovery.

Other-launcher import opens only explicitly allowed game-data paths, never launcher account/session/profile files. No third-party authentication, entitlement forgery, game patching, automatic mod execution or automatic uploads are implemented.

Tauri capabilities grant core APIs and native open/save dialogs. System links are opened by Rust after allowlist validation. Fonts are local. CSP restricts renderer content to local resources and IPC. The updater verifies signed packages and signed version metadata; installing always requires a user action.

Diagnostics redact tokens, account names, emails and Windows user paths before export. The report preview enumerates the exact files included. The canary test inspects every ZIP member for planted secrets.

`skins` handles bounded, validated and re-encoded PNG textures, exact-host Mojang lookups, atomic studio persistence and authenticated official appearance requests. The renderer receives sanitized texture data only, never tokens. The custom LOAM cape has no in-game entitlement claim. See `skin-studio.md` for supported actions and outstanding live identity validation.
