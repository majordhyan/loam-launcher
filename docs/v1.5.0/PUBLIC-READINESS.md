# Public release readiness — 2026-10-04

Result: BLOCKED. No new public release or signed installer was produced.

## Checks actually run

- Full local verification exited 0: 12 frontend tests, 19 Rust unit tests and 11 integration
  tests; TypeScript/production frontend build; Clippy with warnings denied. Evidence:
  `verify-public-readiness.log`. Mocked and live-test distinctions remain as in packaged-checks.md.
- Microsoft Defender custom scans, with remediation disabled, returned exit 0 and "found no
  threats" for both the installer and installed app. Defender antivirus and real-time protection
  were enabled; signature update reported 2026-10-03 20:27:13 local time. This is one scanner's
  result at that time, not a guarantee of safety or absence of bugs.
- Both CurrentUser/My and LocalMachine/My Windows stores inspected: zero code-signing certificates.
- Installer Authenticode: NotSigned, no signer or timestamp certificate.
- Public configuration check failed: HTTPS known-issues feed and signed updater configuration missing.
- Signature gate failed: LOAM-SGN-CONFIG (publisher unconfigured).

Installer SHA-256:
`1DB786C53E7842AE730FEE9676C90DB37EF6797D9C6A995F300C6C74EBFD379C`

Installed app SHA-256:
`A1C475D9926A9CB2F999EC53B55DB548A0C359CE55E4F6651D9E914B16751A64`

## External prerequisite

Owner must supply access to an existing publicly trusted code-signing identity or complete
provider identity validation. Do not send private keys, passwords or PFX files in chat.
A Microsoft OAuth app registration is not a signing identity. A self-signed certificate would
not fulfill this public-trust requirement and was not created.

After identity setup, configure Tauri signing so the packaged app and installer are signed
during bundling, use SHA-256 and timestamping, verify both signatures, then regenerate hashes
and test the signed installer on clean machines. Signing only the outer installer is insufficient.

Primary documentation checked this turn:
- https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart
- https://learn.microsoft.com/en-us/azure/artifact-signing/concept-resources-roles
- https://tauri.app/distribute/sign/windows/

## Other incomplete release requirements

Clean Windows 10/11 testing, live Microsoft/Minecraft access, the full v1.5 feature checklist,
updater hosting and signature configuration remain incomplete. See LEDGER.md and OWNER_TASKS.md.
There is no basis to label this candidate fully verified or a final public release.
