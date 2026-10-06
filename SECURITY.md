# Security Policy

## Supported Versions

| Version | Supported |
| :--- | :--- |
| 1.6.x (latest) | ✅ Active |
| < 1.6.0 | ❌ No longer supported, please update |

We recommend always running the latest release. Older builds do not receive security fixes.

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub Issues.**

Use one of the following private channels:

- **GitHub Private Vulnerability Reporting:** Use the [Security tab → Report a vulnerability](https://github.com/majordhyan/loam-launcher/security/advisories/new) button in this repository (requires a GitHub account).
- **Email:** [loamlauncher@gmail.com](mailto:loamlauncher@gmail.com) — use the subject line `[SECURITY] <brief description>`.

Please include:
1. A clear description of the vulnerability and its potential impact.
2. Steps to reproduce or a proof-of-concept (where safe to share).
3. The LOAM version affected.
4. Your preferred contact method for follow-up.

We aim to acknowledge reports within **72 hours** and provide a resolution timeline within **7 days**.

---

## ⚠️ Important: What NOT to Share Publicly

**Never post the following in public Issues, Discussions, or social media:**

- Microsoft or Xbox authentication tokens or refresh tokens
- Raw application log files (these may contain account identifiers)
- `state.json` contents
- Windows Credential Manager exports

If you accidentally included sensitive data in a public post, revoke/change any exposed credentials immediately and contact us.

---

## Scope

The following are considered in scope for security reports:

- Authentication token handling (Microsoft OAuth, Xbox, Minecraft)
- File-system access outside LOAM's own folders: the data folder (`%APPDATA%\LoamLauncher`, or `%LOCALAPPDATA%\app.loam.launcher` for upgraded installs) and the install folder (`%LOCALAPPDATA%\LOAM`)
- Imports (Smart Drop, Migration Hub) that write outside the target game folder or read another launcher's account files
- Arbitrary code execution via crafted modpack or import files
- HTTPS validation bypasses in game asset or update downloads
- Privilege escalation via the installer

The following are **out of scope:**

- Vulnerabilities in Minecraft itself or in mod loaders
- Issues requiring physical access to the machine
- Social engineering attacks
- Theoretical issues with no demonstrated impact

---

## Disclosure Policy

We follow coordinated disclosure. We ask that you give us a reasonable time to investigate and release a fix before any public disclosure. We will credit researchers who report valid issues (unless anonymity is preferred).

---

*© 2026 LOAM. All rights reserved.*
