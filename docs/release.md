# Release setup

The current installer is an unsigned development artifact. Public distribution is blocked until the acceptance matrix and external configuration are complete.

Configure these public values in `loam.config.json`, then rebuild:

- Approved Microsoft public-client ID.
- `support.discordInviteUrl` is configured to the supplied `https://discord.gg/7ft7ZJ9brd`. Keep it permanent; any placeholder fails the release CI check.
- `support.email` is configured to `loamlauncher@gmail.com` for direct customer and player inquiries.
- HTTPS `support.knownIssuesUrl`, serving schema 1 (example below).
- HTTPS updater endpoint and the Tauri updater public key.

```json
{"schema":1,"issues":[{"id":"LOAM-0012","fingerprint":"launch.java.unsupported_class_version","title":"A mod needs a different Java version","status":"fixed","fixedIn":"1.0.3","workaround":"Use a compatible mod version in a separate game."}]}
```

Known issue status must be `investigating`, `workaround` or `fixed`. Feed fetch failures silently use the cache. Fingerprints are conservative stable categories, not uploaded log contents.

Generate and protect a Tauri updater signing key using the official CLI documentation. Store the private key and password only in your release secret store; only the public key ships. Enable `bundle.createUpdaterArtifacts` for the signed release pipeline and supply `TAURI_SIGNING_PRIVATE_KEY`/password to that build. Serve the resulting versioned artifact, signature and updater JSON over HTTPS. Signatures must carry the signed version (`requireSignedVersion` is enabled). Do not use downgrade comparators or disable TLS checks.

Before shipping: test a valid update, tampered artifact, wrong signature, missing signed version, interrupted download, install failure and rollback/recovery. The code saves state/reports before updating, but full installer rollback is not yet established by evidence. Gate H remains UNVERIFIED until those tests pass against actual hosting and keys.

Windows Authenticode signing is separate from updater signing. Obtain an appropriate signing certificate and timestamp releases. Report the signature status of the exact final installer; do not label an unsigned build signed.

CI runs tests, clippy and Windows NSIS packaging. Version tags additionally run `npm run release:check`, which intentionally fails with the current placeholders. CI does not publish releases automatically.

Recommended Discord setup: a support Forum with Crash, Install, Login, Import, UI, Performance, Fixed and Needs info tags; feature requests, announcements and changelog channels. Pin the LOAM report format and a reminder never to post passwords or tokens. No webhook or bot token belongs in this client.

Primary references: [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/), [Tauri updater](https://v2.tauri.app/plugin/updater/).

## In-app updates (1.8.0+)

LOAM's Settings › Updates uses Tauri's signed updater. It reads
`https://github.com/majordhyan/loam-launcher/releases/latest/download/latest.json` and installs a setup only if its
signature matches the public key built into LOAM (`loam.config.json` › `updates.publicKey`).

- **Private key:** `%USERPROFILE%\.loam\updater\loam-updater.key` (no password). It is not in this repository and must
  never be committed. Back it up somewhere safe: if it's lost, installed copies of LOAM can't verify future updates and
  players must reinstall once by hand.
- **Build a signed release** (PowerShell):

  ```powershell
  $env:TAURI_SIGNING_PRIVATE_KEY = "$env:USERPROFILE\.loam\updater\loam-updater.key"
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
  npm run bundle
  python scripts/make-update-feed.py 1.8.0
  ```

  This writes `artifacts/release-1.8.0/` with the setup, `.sig`, `SHA256SUMS.txt`, `RELEASE-NOTES.md` and `latest.json`.
- **Publish:** `python scripts/publish-release.py 1.8.0` with `GITHUB_TOKEN` set uploads all five files. Players on 1.8.0
  or newer are offered the update the next time LOAM checks.
