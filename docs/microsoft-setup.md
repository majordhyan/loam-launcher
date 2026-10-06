# Microsoft sign-in — app ID allow-listed by Mojang

Public client ID: fef7a470-7d7e-4c33-92aa-33d13270c3e9.
Authority: https://login.microsoftonline.com/consumers.
Scopes: XboxLive.signin offline_access.

Owner reports Mobile/desktop redirect http://localhost:8400 and personal-account support.
Portal settings have not been independently verified in this turn. LOAM prefers port 8400,
falling back to an OS-assigned IPv4 loopback port if occupied. Authorization and token
requests use the same root URI with trailing slash. Microsoft documents port-independent
localhost redirect matching. Platform must be Mobile and desktop, not Web or SPA.

No client secret is used, stored or shipped. A secret was pasted into chat: revoke it in
Entra → this app → Certificates & secrets. Workspace registration helpers are not invoked
by LOAM and are excluded from the new source handoff.

Reuses existing native Rust reqwest authentication: browser code + fresh PKCE/state → Xbox
→ XSTS → Minecraft token → Java entitlement and profile checks, before saving an account.
Refresh credentials use Windows Credential Manager; access tokens stay in memory. Sign-out
removes the credential before the profile. Invalid state, duplicate parameters and non-root
callbacks are rejected. Cancellation/timeout drop the listener. Callback content never
includes codes or tokens and does not claim Minecraft login succeeded before it is checked.

Entra registration does not establish Minecraft app-ID approval. Minecraft login 401/403
is MINECRAFT_LOGIN_REJECTED: no automatic retries or alternate client ID. The historical
review link https://aka.ms/mce-reviewappid errored in the research tool on 2026-10-04;
its form availability remains unverified.

Outstanding: owner-completed login/MFA, live refresh/restart/sign-out, Minecraft approval
if required, and authenticated-server join. No lifetime availability promise: registration,
consent and service access can change. Synthetic callback/entitlement tests are not live
service tests. Detailed Xbox failure-code mapping remains incomplete.

Primary documentation checked 2026-10-04:
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- https://learn.microsoft.com/en-us/entra/identity-platform/reply-url
- https://learn.microsoft.com/en-us/xbox/gdk/docs/services/fundamentals/s2s-auth-calls/service-authentication/live-website-authentication

## Live result — 2026-10-04, RC.4
Owner completed system-browser sign-in. The packaged app reported Microsoft and Xbox success,
then HTTP 403 at Minecraft login (MINECRAFT_LOGIN_REJECTED). No Microsoft/Java account was
saved; the existing Offline Profile remained selected. Entitlement/profile, official skins,
refresh and authenticated-server join are not verified. Do not repeatedly retry this rejection.
Registration settings and Minecraft app-ID approval require review by Microsoft/Mojang;
the 403 alone does not prove the exact service-side reason. No tokens or codes recorded here.

## App-ID review — approved 2026-10-06
Mojang Enforcement replied that the submitted application "met the required criteria and have been
approved for our allow list" for the Minecraft API. LOAM's public client ID is unchanged
(fef7a470-7d7e-4c33-92aa-33d13270c3e9), so 1.7.1 needs no code change to use it. Error text for an
HTTP 401/403 at Minecraft login no longer says approval is unconfirmed; it asks the player to retry
and report if it persists (allow-list changes can take time to reach every server).
Still to verify on a real account (owner): sign-in, Java entitlement and profile, official skin,
refresh after restart, sign-out, and joining an online-mode server.
