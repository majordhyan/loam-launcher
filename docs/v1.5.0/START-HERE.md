# LOAM 1.5.0-rc.4 — Microsoft + Offline Profiles

Use LOAM Setup 1.5.0-rc.4.exe. It is an unsigned development candidate with the custom native
LOAM installer theme. Windows may show unknown-publisher warnings. Security protections have
not been disabled. No public release is certified.

Microsoft sign-in is restored with the owner's new public client ID and no client secret.
Accounts → SIGN IN WITH MICROSOFT opens your system browser. Complete sign-in/MFA yourself.
LOAM checks Xbox/XSTS, Minecraft Java entitlements and the Java profile before saving an account.
The in-game name is the Minecraft Java profile name; it can differ from your Xbox gamertag.
Offline Profiles remain separate and cannot join authenticated servers or Realms.

App chrome cannot be text-selected or dragged. Editable fields retain editing and clipboard
operations. Skin and cape upload controls are available for verified Microsoft profiles;
offline previews do not grant official cosmetics.

Read docs/microsoft-setup.md for registration requirements and live-test status. Registration
alone does not confirm Minecraft app approval. No private client secret is included or needed.
The previously shared secret should be deleted in Entra.

This handoff contains editable source, installer, checksums and test evidence. Admin registration
helper scripts are preserved in the workspace but excluded from the distributed source archive.
Remaining v1.5 work and clean-machine testing are documented in docs/v1.5.0/LEDGER.md.
