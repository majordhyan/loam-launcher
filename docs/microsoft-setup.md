# Microsoft sign-in setup — BLOCKED

The owner has no application registration or approved client ID. This build deliberately refuses Microsoft sign-in until configured. No login or entitlement test has been simulated.

1. Register a Microsoft identity public/native client supporting personal Microsoft accounts. Configure a desktop loopback redirect (`http://localhost`) and authorization-code flow with PKCE. LOAM binds an ephemeral IPv4 loopback port and validates OAuth state. No secret belongs in this application.
2. Obtain any approval Microsoft/Mojang requires for that client ID to access Minecraft services. Registration by itself does not prove access.
3. Put the public client ID in `loam.config.json` as `microsoftClientId`, then rebuild. Never borrow another launcher's client ID.
4. With a consenting Minecraft Java owning test account, verify system-browser authorization, cancel, refresh, sign-out, Xbox authorization, entitlements and profile. Also exercise an account without ownership, no Xbox profile, family restrictions and expired consent.
5. Only mark Gate C verified after recording these live results. Passwords and tokens must never be put in source, chat, fixtures, screenshots or reports.

The implementation exchanges Microsoft → Xbox Live → XSTS → Minecraft services tokens, then checks entitlements and fetches the profile before persisting the account. Only the refresh token is stored in Windows Credential Manager under service `LOAM`; access tokens remain in memory. Each Microsoft launch refreshes and rechecks ownership. Sign-out deletes the credential before removing the local account record.

Current limitation: public primary documentation did not substantiate the full Xbox numeric error-code list during this build. Xbox errors currently show a conservative profile/region/family-settings next step. Detailed numeric mappings and live service behavior remain unverified; do not represent them as certified.

Primary reference: [Microsoft authorization-code + PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow). Minecraft service access must be checked directly with Microsoft/Mojang for the registered application.
