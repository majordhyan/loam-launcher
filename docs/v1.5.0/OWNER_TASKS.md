# External prerequisites

## Updated owner choice — 2026-10-04

Use no-cost unsigned distribution. Microsoft Artifact Signing is not configured and is not
required to install or open LOAM. No signing-service login exists in the app. Windows may show
an unknown-publisher warning. Signing is now optional for this distribution choice; the earlier
signed-public-release requirements below remain reference material for a future signed edition.
Other functional and QA gates remain applicable. Local Offline Profiles already exist and are
separate from Microsoft Minecraft accounts. Auto-update signature verification remains required.

- Choose/validate a code-signing identity, configure CI secrets, and set release.config.json publisher
  to the certificate's exact simple subject name. Never put certificate/private-key material here.
- Confirm official domain, download/checksum URLs and responsible-disclosure contact.
- Choose managed OIDC provider and hosting; approve costs, privacy/terms, age policy and Guest wording.
- Complete Minecraft app-ID review. Microsoft/Xbox success does not establish Minecraft access.
- Provide clean Windows 10/11 test environments and additional display/hardware tiers.
- Review signed builds before distribution, vendor submissions, winget or Store submission.

Microsoft's current developer documentation says EV no longer gives automatic SmartScreen
reputation. Artifact Signing is the current name for Trusted Signing; neither code nor a
certificate alone establishes a warning-free clean-machine experience. No security settings
are changed by the implementation in this pass.

Sources checked 2026-10-03:
- https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation
- https://tauri.app/distribute/sign/windows/

Signing configuration uses Tauri bundle.windows certificateThumbprint/digestAlgorithm/timestampUrl
or signCommand for an external service. Configure SHA-256 and RFC3161 timestamping in the signing
environment; verify all LOAM-built shipped executables including any future helpers. The current
verification script checks the explicitly declared artifact list, valid Authenticode signature,
timestamp, exact publisher and SignTool policy. It does not yet audit RFC3161/digest algorithms
independently or discover undeclared helpers; these remain release tasks.
