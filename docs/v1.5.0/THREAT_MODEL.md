# LOAM Account threat model — draft, implementation disabled

Scope: future OIDC identity and settings sync, separate from Microsoft game authentication.
This draft is not approval to enable or deploy the service. No OIDC implementation was added in this pass.

Assets: refresh/access/ID tokens, user email, sync payloads, device identity, local worlds and credentials.
Actors: legitimate user, local hostile process, malicious server, stolen-token holder, compromised dependency.
Boundaries: system browser ↔ loopback listener ↔ native core ↔ Windows Credential Manager;
native core ↔ configured OIDC provider/JWKS; native core ↔ sync API; frontend ↔ bounded native commands.

| Threat | Required mitigation | Required test | Status |
|---|---|---|---|
| Spoofed provider or intercepted callback | HTTPS issuer allowlist, PKCE S256, state and nonce; no secrets in UI | Wrong issuer/state/nonce, replay, RFC7636 vector | Pending |
| Forged/expired token | Vetted OIDC validation of signature, issuer, audience, expiry | Mock JWKS rotation, wrong audience, expired token | Pending |
| Token disclosure | Credential Manager refresh token; memory-only access token; fixed trace labels | Diagnostic canaries, IPC payload review | Pending |
| Account mix-up / elevation | Independent Microsoft and LOAM sessions; capability data; Guest/LOAM never produce online auth | Matrix and switching tests | Pending |
| Callback DoS | Loopback only, one-shot, size limits, timeout, cancellable listener | Busy port, slow client, duplicate callback | Pending |
| Sync tampering/lost changes | Validated keys, ETags, HLC, bounds, authenticated API | Clock skew, conflict algebra, schema limits | Pending |
| Server breach / excess retention | Minimal records, export/delete, encryption at rest, least privilege | Export/delete end-to-end | Owner/provider pending |
| Repudiation / user surprise | Explicit first-sync review, honest capabilities and local-data preservation | Second-device review and revoked refresh | Pending |

Unmitigated external prerequisites: provider selection and guarantees, hosted API controls,
domain ownership, privacy/age/legal policy, incident ownership and service operation.
The accounts.loam.enabled flag stays false until these and the tests are complete.
