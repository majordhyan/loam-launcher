# LOAM Launcher — Remaster Brief v2.0 and Codex Build Prompt

**Status:** development specification, revision 2.0, 30 September 2026 (supersedes the 29 September 2026 brief)
**Target:** Windows 10/11 x64 desktop launcher for Minecraft Java Edition
**Name:** LOAM · **Tagline:** Your worlds, ready.
**Installer:** `LOAM Setup.exe` (or `LOAM Setup <version>.exe`)
**Agent deliverables:** source repository, working app, Windows setup `.exe` + SHA-256, test evidence, screenshots, build instructions, support matrix

---

## 0. What changed in v2

| Area | v1 brief | v2 remaster |
|---|---|---|
| Accounts | Microsoft + offline profile | Microsoft (the one real online login), clearly labeled Offline Profile, account chooser with capability chips, **Import from another launcher** (game data only), optional third-party auth server (later gate) |
| Design | Palette + principles | Full token system, derived tints, contrast-safe text rules, type scale, grid, motion, component specs, dark mode, command palette, keyboard map, screen wireframes, state copy |
| Support | none | **Support & Feedback page** with Discord link, guided bug report, redacted diagnostics zip, known-issues feed, "fixed in vX" hints |
| Updates | later gate | Signed in-app update check moved to Gate H so fixes reported on Discord can actually ship |
| Gates | A–F | A–H (A–G required for v1.0, H before public distribution) |
| Prompt | one prompt | Updated master prompt, owner checklist of credentials you must supply |

**Important account note.** Legacy Mojang logins have been retired in favor of Microsoft accounts, so "Mojang account" and "Microsoft account" are now the same thing in LOAM: one **Sign in with Microsoft** button covers both, plus Xbox Game Pass PC owners. LOAM does **not** implement TLauncher-account login. That is a proprietary, undocumented third-party account system. Section 2.6 lists the supported alternatives for people migrating from it.

---

## 1. Product definition

LOAM is a calm, typography-led Minecraft Java launcher. The name evokes the ground worlds are built on; the restrained, earthy character suits the terracotta accent without imitating Minecraft branding. The home screen makes three actions obvious: **Play**, **Install**, **switch games**. A user can create an isolated vanilla game, sign in with Microsoft, import supported content, and launch without touching directories or Java arguments. It should feel like a carefully designed desktop utility, not a game store.

**Supported range:** Minecraft Java 1.16.1 through the latest release in the live official version manifest (26.3 is the pinned acceptance target as of this brief). Never hard-code a version list. Never infer loader support from the game version alone. Show snapshots only when enabled. Each game version + loader lives in its own isolated game. Windows x64 first.

**Non-goals for v1 (do not show as working controls):** Forge/NeoForge, CurseForge packs, mod search, dependency solving, world migration, automated crash repair, hosted LOAM account service, telemetry.

---

## 2. Account system

### 2.1 Modes

| Mode | Label in UI | What it is |
|---|---|---|
| Microsoft account | `MICROSOFT ✓` after entitlement + profile verified | Browser-based sign-in, verified Minecraft Java ownership |
| Offline Profile | `OFFLINE PROFILE` (always visible in selector, pre-launch summary and game-running state) | Local display name for local play, testing, LAN and servers that run in offline mode |
| Third-party auth server | `THIRD-PARTY · <host>` | **Later gate (I).** Yggdrasil-compatible provider via authlib-injector, only for servers that use that provider |

### 2.2 Capability matrix (shown as chips in the account chooser)

| Capability | Microsoft | Offline Profile | Third-party |
|---|---|---|---|
| Verified Minecraft Java ownership | ✓ | ✗ | provider-defined, never presented as Microsoft |
| Singleplayer, LAN | ✓ | ✓ | ✓ |
| Online-mode (Microsoft-authenticated) servers | ✓ | ✗ | ✗ |
| Offline-mode servers | ✓ | ✓ | ✓ |
| Servers that use the chosen provider | – | – | ✓ |
| Realms | ✓ | ✗ | ✗ |
| Personal skin / cape | ✓ | default skin | provider skin |

The account chooser reads from this matrix in code, so the UI and the launch pre-check use one source of truth.

### 2.3 Microsoft sign-in ("Mojang / Microsoft account", the recommended path)

1. Registered **public client**, system-browser **authorization-code flow with PKCE**, loopback redirect. No client secret shipped, no embedded webview, LOAM never sees a password.
2. Chain to verify at implementation time against current primary docs: Microsoft identity → Xbox Live → XSTS → Minecraft services login → **entitlements check** → **profile fetch**. Only after entitlement and profile succeed may the UI show `Minecraft Java ✓`.
3. Tokens live in **Windows Credential Manager** (DPAPI-backed). Refresh silently on expiry; on refresh failure show the **Authentication expired** state with a `SIGN IN AGAIN` action. Sign-out deletes tokens and cached profile/skin.
4. Map known failure codes to plain messages, verifying the code list against current documentation: no Xbox profile on the account, region unavailable, adult verification required, child account that must be added to a family. Every message includes a concrete next step.
5. If the account owns no Java Edition: "Minecraft Java Edition wasn't found on this account." with `GET MINECRAFT ↗` (minecraft.net) and `USE OFFLINE PROFILE` as secondary.
6. **Registration blocker:** Minecraft services may require your Azure app ID to be approved by Mojang/Microsoft before the login endpoint accepts it. If access is missing, the app shows a clear configuration blocker (`docs/microsoft-setup.md`), never fakes a login, and records the gate as **BLOCKED** in the test report.
7. Canceled sign-in returns cleanly to the launcher with no error toast.

### 2.4 Offline Profile

- User picks a display name: 3–16 characters, `A–Z a–z 0–9 _`, unique inside LOAM.
- Stable local ID uses the documented vanilla offline scheme (name-based UUID v3 from the string `OfflinePlayer:<name>`), so the same name gives the same ID as offline-mode servers expect.
- Creation dialog copy: *"Offline profiles are local. They don't prove you own Minecraft, can't join servers that verify accounts, can't use Realms, and can't show a personal skin. Use one for local play, testing, LAN and servers running in offline mode."* Buttons: `CREATE OFFLINE PROFILE`, `CANCEL`, and a quiet link `SIGN IN WITH MICROSOFT INSTEAD`.
- Never described as "cracked", "free Minecraft" or a licensed account. Never claims ownership. Game files come only from official manifests; LOAM does not distribute, mirror or patch game binaries, forge entitlements, steal or reuse session tokens, or bypass server authentication.

### 2.5 Switching

Switching changes the identity for the **next launch only**; it never touches game files. The pre-launch summary always shows the account type. Play is disabled with a reason line when the selected game/account combination cannot work (for example, a Realms link with an offline profile).

### 2.6 Coming from TLauncher or another launcher

LOAM does not read, import or emulate TLauncher accounts or any other launcher's credentials. What it offers instead:

- **Import from another launcher** (in `INSTALL +`, Gate D): the user points LOAM at a launcher's game folder (LOAM also offers to check `%APPDATA%\.minecraft` and asks before reading any other folder). LOAM copies, never moves, only **game data**: `saves`, `mods`, `resourcepacks`, `shaderpacks`, `options.txt`, `servers.dat`, and version metadata used to pick a matching Minecraft version. It never opens or copies account, profile-auth, token or session files. Everything goes through the Smart Drop review sheet.
- **Offline Profile** for local play and offline-mode servers (2.4).
- **Sign in with Microsoft** for online-mode servers and Realms.

### 2.7 Third-party auth server (Gate I, optional, after v1)

Only if independently verified: user enters a provider API root; LOAM downloads authlib-injector from its official release, verifies its hash, launches with it, and labels the profile `THIRD-PARTY · host`. No claim of Microsoft identity or ownership, HTTPS only, host shown in every launch summary.

---

## 3. Design system (palette locked, everything else remastered)

### 3.1 Tokens

The five brand colors are **unchanged**. Everything else is derived from them only.

```css
:root {
  /* Locked brand palette */
  --loam-accent: #C15F3C;   /* primary action, active, progress fill */
  --loam-paper:  #F4F3EE;   /* main canvas */
  --loam-white:  #FFFFFF;   /* panels, sheets, popovers */
  --loam-muted:  #B1ADA1;   /* hairline accents, disabled, decorative labels */
  --loam-ink:    #171715;   /* main text */

  /* Derived (mixed from the five above) */
  --loam-accent-deep:  #9F4A2B;  /* small accent text, links, error rule (≈5.4:1 on paper) */
  --loam-accent-press: #A9512F;  /* hover/pressed fill */
  --loam-accent-tint:  #EDDED5;  /* progress track, selected row, warning wash */
  --loam-text-2:       #6F6B60;  /* secondary text (≈4.8:1 on paper) */
  --loam-line:         #D9D8D3;  /* hairlines */
  --loam-sunken:       #ECEBE5;  /* inset areas, disabled fill */
  --loam-scrim:        rgb(23 23 21 / 0.32);
}
```

Dark theme (v1.1, ship only if polished): canvas `#171715`, panel `#21211E`, text `#F4F3EE`, secondary `#B1ADA1`, accent `#C15F3C` (fills) with a lighter derived accent for small text. Follows Windows setting by default, overridable in Settings.

**Contrast rules (verify with a checker, do not trust these estimates):**
- `#B1ADA1` on Paper is only about 2:1. **Never use Muted for text that carries meaning.** Use `--loam-text-2` for metadata.
- White on `#C15F3C` is about 4.2:1, which passes only for large text. PLAY (24 px / 600) may use white on accent. Small accent buttons use `--loam-accent-deep` fill with white text, and small accent text links use `--loam-accent-deep`.
- **Never rely on color alone.** Errors, warnings and success always add an icon glyph and a text label.
- Windows High Contrast (`forced-colors`) is fully supported with system colors and visible borders.

### 3.2 Typography

Bundle **Geist** (or Inter) and **Geist Mono** as local WOFF2, both SIL Open Font License. No CDN font requests, so it works offline and leaks nothing.

| Style | Spec | Use |
|---|---|---|
| Display | `clamp(44px, 6vw, 72px)` / 1.0, weight 600, −0.03em | Selected game name |
| H1 | 32/36, 600, −0.02em | Page titles (Settings, Support) |
| H2 | 20/28, 600 | Section headings |
| Body | 15/24, 400 | Copy |
| Label | 11/16, 500, +0.12em, UPPERCASE | `JAVA EDITION`, `INSTALL +`, chips |
| Mono | 12/18 Geist Mono, tabular numerals | Versions, byte counts, hashes, logs |

### 3.3 Grid, spacing, shape

- 8 px base unit; spacing scale 4/8/12/16/24/32/48/64/96.
- 12-column grid, 24 px gutters, 40 px outer margins at the default 1120×720 window. Minimum window 960×600. Below 1000 px the game switcher collapses into a popover.
- Left edges align: wordmark, game name, `INSTALL +` and news date share one vertical axis.
- Radii: 2 px controls, 4 px panels, 8 px top corners on bottom sheets. No pill shapes.
- Elevation: none on inline surfaces (1 px `--loam-line` instead). One soft shadow `0 12px 32px rgb(23 23 21 / 0.10)` only on popovers and sheets, plus the scrim.

### 3.4 Motion

| Token | Value | Use |
|---|---|---|
| `--dur-micro` | 120 ms | Hover, press, focus |
| `--dur-state` | 200 ms | Play state change, chip swap |
| `--dur-sheet` | 320 ms | Sheets and popovers |
| Easing | `cubic-bezier(.2, 0, 0, 1)` | All transitions |

Progress fills reflect **real bytes**, smoothed at most 250 ms. No looping decorative animation. Where progress is unmeasurable (waiting for browser sign-in, hash verification), show a labeled **step indicator** ("Step 2 of 4 · Verifying files"), never an endless spinner over a measurable download. With `prefers-reduced-motion`, all transitions become instant or crossfade.

### 3.5 Iconography and identity

- Single 1.5 px stroke line-icon set (Lucide is ISC-licensed; record it in third-party notices). 16/20/24 px grid; icons always paired with a label or `aria-label`.
- Game tiles use a two-letter **monogram** in Geist Mono on `--loam-sunken`, not game art.
- **Wordmark:** original, four letters constructed on a shared grid, with one subtle square terrain cut in a single letter. It must stay legible at 16 px and 256 px. **App icon:** terracotta square with a paper-colored letter form and the same cut. Deliver `.ico` with 16/24/32/48/64/128/256, a monochrome variant, and branded NSIS header and sidebar bitmaps (check the current Tauri/NSIS required dimensions). No dirt blocks, pickaxes, pixel fonts, Minecraft trademarks or official art.
- No wallpaper, gradients, glass, particles, ads or dashboard clutter.

### 3.6 Core components

**Play control** (72 px high, 280–360 px wide, 2 px radius, label 24/600, +0.08em):

| State | Face | Sub-line | Behavior |
|---|---|---|---|
| `INSTALL` | Accent fill | `1.05 GB download · 2.4 GB on disk` | Starts install |
| `INSTALLING` | Tint track, accent fill by bytes, label `412 / 1,046 MB` | current action, files, speed, ETA | `CANCEL` text button |
| `VERIFYING` | Step indicator | `Checking 1,318 files` | Not clickable |
| `READY / PLAY` | Accent fill | `Verified 2 min ago` | Launches |
| `LAUNCHING` | Determinate steps: Java, natives, arguments, start | current step | Cancelable |
| `RUNNING` | Ink fill, label `RUNNING` | `Since 14:02 · 4 GB` | Secondary `STOP`, `VIEW LOG` |
| `REPAIR` | Accent-deep fill | the specific diagnosed fault | Only shown with a concrete fault |
| Disabled | Sunken fill, muted label | the reason (no account, no disk, offline) | Reason line is a real action link |

**Game switcher:** a row of 44×44 monogram tiles (active tile has a 2 px ink underline); overflow becomes `ALL GAMES (7)` opening a searchable popover. `←/→` or `Ctrl+1…9` switches. Row menu: Rename, Open folder, Duplicate, Backups, Delete (typed-name confirmation, worlds called out).

**Account chip** (top right): avatar or monogram, name, type label (`MICROSOFT ✓` or `OFFLINE PROFILE`). Opens the account popover with capability chips (2.2).

**Sheets** (bottom sheet ≤ 560 px wide, centered): Install+, Smart Drop review, Accounts, Backups. Focus trap, `Esc` closes, focus returns to the trigger.

**Toasts:** bottom-right, ink on white, 6 s, pause on hover, never for errors that need action (those become inline banners).

**Command palette** (`Ctrl+K`): Play *game*, Switch to…, Install +, Open game folder, Settings, Report a problem. Every entry runs a real action.

**Keyboard map:** `Ctrl+Enter` Play · `Ctrl+N` Install+ · `Ctrl+K` palette · `Ctrl+,` Settings · `F1` Support · `Ctrl+1…9` game · `Esc` close. Visible focus ring everywhere: 2 px ink, 2 px offset, plus 1 px accent-tint halo.

Keep the **native Windows title bar** in v1 so Snap Layouts, DPI behavior and accessibility stay intact. Add custom chrome only if it passes those tests.

### 3.7 Accessibility and scaling

WCAG 2.2 AA target. Full keyboard operation, correct roles and names, live region for progress and errors, screen-reader pass with Narrator. Verified at 100/125/150/200% Windows scaling and at the 960×600 minimum window. Reduced motion, forced-colors and text-only zoom respected. No information conveyed by color alone.

---

## 4. Screens

### 4.1 Home

```text
┌────────────────────────────────────────────────────────────────────────┐
│ LOAM                                    ◉ Alex · MICROSOFT ✓   ?   ⚙  │
│ JAVA EDITION                                                            │
│ YOUR WORLDS, READY.                                                     │
│                                                                         │
│                                                                         │
│   Survival SMP                                                          │
│   26.3 · Fabric · 4 GB                                                  │
│                                                                         │
│   [           PLAY           ]                                          │
│   Ready · verified 2 min ago                                            │
│                                                                         │
│                                                                         │
│   INSTALL +    ⇣ Drop a mod, pack or world     [SM][CR][TS][+3]         │
│ ────────────────────────────────────────────────────────────────────── │
│   12 SEP  Official news headline, one line                    READ ↗   │
└────────────────────────────────────────────────────────────────────────┘
```

- `?` opens **Support & Feedback** (section 5). `⚙` opens Settings.
- Center block is left-aligned on the grid (Swiss layout) rather than centered, giving the display type an anchor. Empty space is intentional.
- News: one item, official source only, cached, hidden gracefully when offline (no error).
- Drag over window: full-window drop state with a single sentence ("Drop to review"), inspection begins only after drop.

### 4.2 First run

Inline three-step flow (no blocking modal wall), one screen at a time:

1. **Account** – `SIGN IN WITH MICROSOFT` (primary), `USE OFFLINE PROFILE`, `LATER`. Install does **not** require an account; Play does.
2. **Game** – default `Latest Release`, shows exact version from live manifest, download size, disk needed, free space, folder.
3. **Install** – press `INSTALL`. Nothing downloads before this press.

Interrupted setup resumes or restarts cleanly; an empty folder is never treated as installed.

### 4.3 Install + (create a game)

Search Minecraft versions (release default, snapshots via toggle) → Vanilla or **only** loader versions the live metadata reports for that Minecraft version → name → optional folder and RAM (slider with system-RAM-aware maximum and plain warning above 75%) → review size → `CREATE`. Also offers `IMPORT FROM ANOTHER LAUNCHER` (2.6). Changing a game's version always creates a new game or an explicit migration copy.

### 4.4 Smart Drop review sheet

Type · target game · Minecraft/loader compatibility · dependencies (missing ones listed, never assumed) · source (file or allowlisted Modrinth URL) · exact operation summary · backup notice → `CONFIRM` / `CANCEL`. Supported v1 inputs: Fabric mod JAR, resource pack ZIP, shader ZIP, world ZIP, Modrinth `.mrpack`, and pasted allowlisted Modrinth project/version URLs. Never execute dropped content. Ambiguous or unsupported files are refused with a specific reason.

### 4.5 Accounts sheet

```text
ACCOUNTS
┌──────────────────────────────────────────────────────────┐
│ ● Alex            MICROSOFT ✓                            │
│   Java ✓ · Online servers · Realms · Skin                │
│ ○ Testing         OFFLINE PROFILE                        │
│   Local only · No ownership · Offline-mode servers       │
│                                                          │
│ + SIGN IN WITH MICROSOFT      + OFFLINE PROFILE          │
└──────────────────────────────────────────────────────────┘
```

### 4.6 Game details drawer

Overview · Content (list mods/packs/shaders/worlds; disable via atomic `.disabled` rename; remove with automatic backup) · Settings (RAM, resolution, advanced JVM arguments with a warning) · Backups (`RESTORE BACKUP`) · Logs.

### 4.7 Settings

Accounts · Java & memory (runtime in use, architecture/version, detect vs. managed) · Storage (data location, disk usage, cache clean, migrate with verification) · Appearance (light/dark/system, high-contrast note, reduced motion follow) · Language · Advanced (snapshots, debug launch plan with secrets redacted) · Updates · **Support & Feedback** · About (version, licenses, third-party notices, "Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.").

### 4.8 State copy deck

| State | Headline | Primary action | Secondary |
|---|---|---|---|
| Empty (no games) | Nothing here yet. | `INSTALL +` | Import from another launcher |
| First run | Let's set up your first game. | `INSTALL` | Review size |
| Downloading | Installing 26.3 | `CANCEL` | Details |
| No network | You're offline. | `RETRY` | Play installed games still works |
| No account | Choose who's playing. | `SIGN IN WITH MICROSOFT` | Use Offline Profile |
| Insufficient disk | Not enough space. Need 2.4 GB, have 1.1 GB. | `CHOOSE ANOTHER FOLDER` | Clean cache |
| Auth expired | Your Microsoft session ended. | `SIGN IN AGAIN` | Use Offline Profile |
| Incompatible file | This file can't go in *Survival SMP*. *(specific reason)* | `CHOOSE ANOTHER GAME` | Close |
| Launch failure | The game closed unexpectedly. Exit code *n*. | `VIEW LOG` | `COPY DIAGNOSTICS` · `RETRY` · `RESTORE BACKUP` · **`REPORT THIS ↗`** |
| Running | Playing since 14:02. | `STOP` | `VIEW LOG` |
| Update available | LOAM *x.y.z* is ready. | `UPDATE` | What's new |

A plain-language cause appears only when log evidence supports it. No invented one-click fixes, no automatic deletion of mods or worlds.

---

## 5. Support & Feedback (new)

Reached from the `?` icon (top right), Settings, `F1`, the command palette, and the **REPORT THIS ↗** button on every failure state.

### 5.1 Page layout

```text
SUPPORT & FEEDBACK

┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ ASK THE COMMUNITY   │ │ REPORT A PROBLEM    │ │ WHAT'S NEW          │
│ Join our Discord to │ │ Guided form builds  │ │ Known issues and    │
│ get help.           │ │ a redacted report.  │ │ fixes by version.   │
│ [ OPEN DISCORD ↗ ]  │ │ [ START REPORT ]    │ │ [ VIEW ]            │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘

Your recent reports          Version 1.0.2 · Windows 11 x64 · Copy version info
LOAM-7K3Q-92  Launch crash   Saved locally · Fixed in 1.0.3 ↑ UPDATE
```

### 5.2 Discord link

- Constant in `loam.config.json`: `support.discordInviteUrl`, opened in the **system browser** only via an allowlist (`discord.gg`, `discord.com`). Ship builds fail CI if it still contains the placeholder `https://discord.gg/REPLACE_ME`.
- **Recommended Discord setup (owner task):** a Forum channel `#support` with tags *Crash, Install, Login, Import, UI, Performance, Fixed, Needs info*; `#feature-requests`; `#announcements`; `#changelog`. Pin a "How to report" post that matches the template below, and a warning to **never post tokens or passwords**.
- LOAM never posts to Discord automatically. No webhook or bot token is ever embedded in the client (it would leak). Sending is always a user action.

### 5.3 Guided report

Fields: **Type** (Crash on launch · Install failed · Import failed · Login problem · Visual glitch · Performance · Other / idea) · **What happened** · **What you expected** · **Steps to reproduce** · attach toggles, all default on except the profile name: redacted latest log, redacted launch plan, system info, LOAM version.

A live **preview pane** shows exactly what will be included before anything is copied or saved. Auto-filled facts: LOAM version, Windows build, architecture, total RAM, Java runtime, selected game + Minecraft version + loader, account **type** (never the name unless the user opts in), free disk.

Actions:

1. `COPY REPORT` copies a Discord-ready Markdown summary, **under 1,800 characters**.
2. `SAVE DIAGNOSTICS ZIP` writes the redacted bundle (logs, launch plan, metadata, `report.json`) and reveals it in Explorer. Users attach it in their Discord post.
3. `OPEN DISCORD ↗`.

Every report gets an ID like `LOAM-7K3Q-92` shown in the summary and zip name, so you can find it in the Discord thread.

Template copied to the clipboard:

```text
**LOAM report** LOAM-7K3Q-92
**Type:** Crash on launch
**LOAM:** <version> · <Windows build> x64 · <RAM> GB
**Game:** <mc version> · <loader> · Java <version> · <MB> MB
**Account type:** Microsoft | Offline Profile
**Happened:** <text>
**Expected:** <text>
**Steps:** <text>
**Diagnostics zip:** attached (report ID above)
```

### 5.4 Known-issues feed ("fixed in the next update")

LOAM checks a static JSON file (HTTPS, allowlisted host such as GitHub Pages or Releases; cached; schema-validated; failures are silent) and matches error **fingerprints** against it:

```json
{
  "schema": 1,
  "issues": [
    {
      "id": "LOAM-0012",
      "fingerprint": "launch.java.unsupported_class_version",
      "title": "Old modpack fails to start on the newest Java",
      "status": "fixed",
      "fixedIn": "1.0.3",
      "workaround": "Choose Java 17 for this game in Game settings."
    }
  ]
}
```

A failure screen or the What's New view then shows "Known issue · Fixed in 1.0.3 · `UPDATE`" or the workaround. Statuses: *investigating, workaround, fixed*.

### 5.5 Privacy

No automatic upload, no analytics in v1. The redactor removes access/refresh/launch tokens, usernames in file paths, account emails, and the Microsoft profile name (unless opted in). A **canary test** plants fake secrets across logs and asserts none appear in any export.

---

## 6. Main user journeys

**First run:** account (or later) → default `Latest Release` with size → `INSTALL` → fetch official metadata and runtime → verify hashes → isolated game folder → `READY` → `PLAY`.

**Create a game:** `INSTALL +` → version search → Vanilla or available loader → name → RAM/folder → size review → create.

**Smart Drop:** drag → inspect after drop → review → confirm → backup → atomic apply → result or actionable error.

**Recovery:** failure → exit status, evidence-based reason, `VIEW LOG`, `COPY DIAGNOSTICS`, `RETRY`, `RESTORE BACKUP` (if applicable), `REPORT THIS ↗`.

**Get help:** `?` → Discord, guided report, or What's New.

---

## 7. Scope and release gates

| Gate | Required outcome | Release |
|---|---|---|
| A. Desktop shell + design system | Tauri shell, tokens, all screens/states in section 4, keyboard, persistence, no dead controls | v1.0 |
| B. Vanilla engine | Manifest, inheritance, libraries, assets, Java selection, hashes, natives, arguments, lifecycle; real old and new launches | v1.0 |
| C. Identity | Microsoft sign-in with entitlement/profile checks, Offline Profile, secure token lifecycle, capability matrix | v1.0 |
| D. Games and import | Isolated games, Vanilla + Fabric where available, Smart Drop, Import from another launcher (game data only) | v1.0 |
| E. Reliability | Resume/retry, disk checks, backups, logs, cancellation, no false success, corrupt-download handling | v1.0 |
| F. Windows release | Branded icon, NSIS setup `.exe`, install/uninstall, clean-machine test, SHA-256, README | v1.0 |
| **G. Support & feedback** | Support page, Discord link, guided report, redacted diagnostics zip, known-issues feed, report IDs | v1.0 |
| **H. Updates** | Signed update check on launch (user chooses to install, never silent), release notes view, rollback-safe install | before public distribution |
| I. Later | Third-party auth server, Forge/NeoForge, CurseForge, mod search, dependency solving, crash-repair suggestions | after v1, each behind its own adapter, test matrix and honest support table |

---

## 8. Technical architecture

**Stack:** Tauri 2 shell · React + TypeScript UI · Rust launcher core · CSS design tokens · small state layer (Zustand or equivalent) · typed command/event boundary. Verify current package versions and licenses before committing. Do not paste opaque code from another launcher; respect GPL obligations if adapting.

```text
loam-launcher/
  src/                   # React screens, components, styles/tokens.css, typed commands
  src-tauri/
    src/
      accounts/          # Microsoft session, offline profiles, credential store, capability matrix
      catalog/           # game + loader metadata
      downloads/         # queue, resume, hash verification
      games/             # isolated game model + persistence
      install/           # vanilla + Fabric adapters
      import/            # safe inspectors, transactional installers, other-launcher importer
      java/              # runtime discovery/provisioning
      launch/            # argument resolution, process lifecycle
      diagnostics/       # logging, redaction, export bundle
      support/           # report builder, known-issues feed, allowlisted link opener
      updater/           # Gate H
    capabilities/        # least-privilege Tauri permissions
    icons/
  loam.config.json       # support.discordInviteUrl, feed URL, allowlists
  tests/                 # fixtures + end-to-end scenarios
  docs/                  # architecture, licensing, support matrix, microsoft-setup, build
  .github/workflows/     # Windows build/test/artifacts
```

**Data layout (per-user, never inside the install directory):**

```text
LOAM/
  cache/{assets,libraries,versions,runtimes,downloads}/
  games/<stable-id>/{game.json,mods,config,saves,resourcepacks,shaderpacks,logs}/
  backups/<stable-id>/
  logs/
  reports/
```

Opaque stable IDs, never user-supplied names, in paths. Schema versions on all persisted files.

### Installation and launch correctness

- Query the official version manifest at runtime; parse inherited metadata, OS/architecture rules, hashes/sizes, classpath, natives, logging config, asset index, Java requirements, modern and legacy argument formats. Official URLs only; verify hashes and sizes.
- Choose Java by metadata, not a fixed path; use a permitted trusted runtime or guide the user. Confirm architecture/version before launch. Never bundle an unlicensed runtime.
- Produce a redacted launch plan for diagnostics. Spawn with an **argument vector**, correct working directory and environment, never an unsanitized shell string.
- Fabric via its published metadata; check availability per version; verify with an actual modded launch. Forge/NeoForge need their own adapters and are not in v1.
- Downloads: concurrency limits, retry with backoff, cancel, resumable partial files where safe, HTTPS only, hash checks, disk-space estimate, never blocking the UI.

### Security and safety

Path validation, archive traversal, symlink escape, decompression-bomb and size limits; temporary files plus atomic moves; never execute dropped files; only allowlisted Modrinth URLs (respect API terms and rate limits); no generic remote fetch; world saves untouched by repair/uninstall unless the user explicitly deletes; passwords, refresh tokens, launch tokens excluded from all logs and reports. Tauri permissions and the opener allowlist are least-privilege and reviewed.

---

## 9. Testing and acceptance

**Unit:** manifest inheritance, rule evaluation, Java selection, checksum failures, metadata parsing, import classification, path traversal, offline UUID scheme, offline name validation, capability matrix, redaction canary, Discord/Modrinth URL allowlists, known-issues fingerprint matching.

**Integration:** interrupted downloads, canceled installs, invalid archives, profile switching, backups, storage migration, other-launcher import (credential files never read), sanitized report bundle, report under 1,800 characters.

**UI/accessibility:** screenshots of every state in 4.8 at 100/125/150/200% scaling and 960×600; forced-colors; reduced motion; keyboard-only run of every journey; axe-style automated checks plus a Narrator pass; contrast checker results for all token pairs.

**On-device (clean Windows 10/11 x64 VM):** install from setup `.exe`; install and launch one older and one recent vanilla release in range (include 26.3 if in the live manifest); install and launch a Fabric game with a compatible test mod; Offline Profile launch; **real Microsoft sign-in with a consenting game-owning test account** when app access exists (else mark **BLOCKED**); submit a test report and confirm the zip opens and contains no secrets; uninstall preserves user data and removes binaries.

**Static:** `cargo test`, `cargo clippy`, TypeScript typecheck, frontend build all pass. Build the installer on Windows CI or a Windows host. Report exact artifact path, size, SHA-256, and unsigned/signed status. Maintain a support matrix; two smoke tests do not prove cross-version completeness.

---

## 10. What you (the owner) must supply

| Item | Why |
|---|---|
| Azure/Entra public-client app registration (loopback redirect) and Minecraft services access approval for its app ID | Without it, Microsoft login is reported BLOCKED, never faked |
| Discord invite URL (permanent, non-expiring) and the channel setup in 5.2 | Goes in `loam.config.json` |
| Public HTTPS host for `known-issues.json` and the update manifest (GitHub Pages/Releases works) | Support feed and Gate H |
| Updater signing keypair (Tauri updater) and, ideally, a Windows code-signing certificate | Update integrity; SmartScreen reputation |
| Font decision (Geist or Inter) and final wordmark approval | Branding |
| Windows CI runner (GitHub Actions `windows-latest`) or a Windows machine | Real installer proof |

---

## 11. Build-agent master prompt (copy into Codex)

```text
You are the lead engineer, product designer and QA owner for LOAM Launcher. Build a complete, installable Windows 10/11 x64 Minecraft Java desktop application in this repository. Read LOAM_Launcher_Remaster_Brief_v2.md in full and treat sections 1-9 as acceptance criteria. Do the implementation. Do not stop at a plan, mockup, scaffolding, or a React screen with nonfunctional buttons.

PRODUCT: LOAM, tagline "Your worlds, ready." Swiss-minimal desktop utility. Locked palette: accent #C15F3C, paper #F4F3EE, white #FFFFFF, muted #B1ADA1, ink #171715, plus only the derived tokens in section 3.1. Follow the type scale, 8px grid, motion tokens, component specs, keyboard map and state copy in sections 3 and 4. Muted #B1ADA1 must never carry meaningful text; use the derived secondary text color. Never rely on color alone. Bundle Geist/Inter and Geist Mono locally (OFL), no CDN requests. Create an original legible LOAM wordmark, app icon (.ico multi-size, monochrome variant) and branded NSIS bitmaps. No game art, gradients, glass or ornament. Keep the native Windows title bar. Name the installer LOAM Setup.exe (or versioned equivalent).

TECH: Tauri 2 + React/TypeScript + Rust core. Typed commands/events, per-user data storage, isolated game directories, verified shared cache, least-privilege Tauri capabilities. Read current primary documentation for Tauri, Microsoft identity and Xbox/Minecraft services, Mojang version metadata, Fabric, Modrinth, authlib-injector and the Java runtime distribution before choosing versions. Record versions and license decisions in docs.

REAL FUNCTIONS: Official version discovery for 1.16.1 through the latest release in the live manifest (26.3 is the pinned acceptance target). Install client, assets, libraries and a suitable Java runtime from permitted sources; process manifest inheritance and platform rules; verify hashes; build a redacted launch plan; spawn the game with an argument vector.

ACCOUNTS: (1) Microsoft: system-browser authorization code + PKCE public client, Xbox/XSTS/Minecraft services chain, entitlement check and profile fetch before showing "Minecraft Java ✓", tokens in Windows Credential Manager, safe refresh, sign-out wipes tokens, plain-language mapping of known failure codes, clean cancel. If app registration or Minecraft services access is missing, show a configuration blocker and mark the gate BLOCKED; never fake a login. (2) Offline Profile: clearly labeled OFFLINE PROFILE everywhere, valid unique 3-16 char names, vanilla offline UUID scheme, capability matrix drives UI and launch pre-checks, no claim of ownership, Realms, skins or online-mode access. (3) Import from another launcher: user-selected folder, copy game data only (saves, mods, resourcepacks, shaderpacks, options.txt, servers.dat, version metadata), NEVER read or copy any account, token, session or credential file, route everything through the Smart Drop review sheet. Do NOT implement TLauncher-account login or emulation, do not build cracked-account features, do not distribute, mirror or patch game binaries, do not bypass server authentication or forge entitlements. Do not build the third-party auth server mode in v1.

GAMES AND IMPORT: Named isolated games, Vanilla and Fabric only where live metadata shows availability, never silently upgrade a game or world. Smart Drop for validated Fabric JAR, resource/shader ZIP, world ZIP, Modrinth .mrpack and pasted allowlisted Modrinth URLs, with review sheet, compatibility checks, security limits, backup and atomic apply. Reject ambiguous input. Missing dependencies are shown, never assumed.

SUPPORT AND FEEDBACK: Build the Support & Feedback page exactly as in section 5: three cards (Ask the community, Report a problem, What's new), guided report form with live preview, report IDs like LOAM-XXXX-XX, Copy Report (Discord-ready Markdown under 1,800 characters), Save Diagnostics ZIP (redacted, reveal in Explorer), Open Discord via an allowlisted system-browser opener using support.discordInviteUrl from loam.config.json. CI must fail a release build if that value is still the placeholder. Never embed a Discord webhook or bot token; never upload anything automatically; no analytics. Implement the known-issues JSON feed with fingerprint matching, caching and silent failure, and show "Known issue - fixed in X" on failure screens. Add a REPORT THIS action to every failure state and a redaction canary test.

UPDATES (Gate H): Tauri updater with signature verification, user-initiated install, release-notes view, never silent. If the signing key or hosting is not provided, implement the code path, document setup, and report the gate as unverified.

FIRST RUN: Show a meaningful first-install flow; never download gigabytes before the user presses INSTALL. Install does not require an account; Play does. Real byte-based progress, resume/retry after interruption, no fake percentages, no endless spinner on measurable work.

WORKFLOW:
1. Inspect the repo, OS and toolchain. Write a short plan with concrete deliverables, then start coding. Keep the app runnable after every gate.
2. Gate A: structure, tokens.css, components, all screens and states, keyboard map, command palette, persistent state. Every visible control is wired to a real action or removed.
3. Gate B: vanilla engine with fixtures and real Windows launches.
4. Gate C: accounts, credential storage, capability matrix, account UI.
5. Gate D: isolated games, Fabric adapter, Smart Drop, other-launcher import, backups.
6. Gate E: resume, retry, cancel, disk checks, diagnostics, corrupt-file handling.
7. Gate G: Support & Feedback, report builder, redaction, known-issues feed.
8. Polish every state. Run cargo test, cargo clippy, TypeScript typecheck, frontend build, UI/accessibility checks. Capture screenshots at 100/125/150/200% and 960x600 of first run, home, installing, import review, accounts, support, and each error state.
9. Gate F/H: build a branded NSIS setup on Windows. Test install, launch, reinstall/update and uninstall on a clean environment. Report exact artifact path, size, SHA-256, signed/unsigned status. Provide README, build instructions, third-party notices, support matrix and a known-limitations list.

DEFINITION OF DONE: A person on a clean Windows PC can install LOAM from the setup .exe, open it, create a legitimate game installation, play a verified vanilla release, make and play a Fabric game, use the implemented imports, switch between a Microsoft account and a labeled Offline Profile where their capabilities allow, recover from ordinary network/corrupt-file errors, and open Support & Feedback to join the Discord and produce a clean redacted report. All progress shown comes from real operations. If you lack a Windows host, a Minecraft-owning test account, Microsoft app access, the Discord URL, or signing keys, complete every independent part and report exactly which gates are unverified. Never invent the installer or test results.

Maintain a concise progress log. Make implementation decisions autonomously. Ask me only for an external credential, registration, the Discord invite URL, a blocking branding decision, or final distribution approval; keep building everything else meanwhile.
```

---

## 12. Source references (recheck at implementation time)

- [Minecraft Java 26.3 release](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-3)
- [Minecraft Usage Guidelines](https://www.minecraft.net/en-us/usage-guidelines)
- [Microsoft authorization-code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/)
- [Tauri updater plugin](https://v2.tauri.app/plugin/updater/)
- [Fabric metadata API reference](https://wiki.fabricmc.net/documentation:modpack_related_endpoints)
- [NeoForge 26.1 Java migration](https://docs.neoforged.net/primer/docs/26.1/)
- [Modrinth API documentation](https://docs.modrinth.com/api/)
- [authlib-injector (for later gate I)](https://github.com/yushijinhun/authlib-injector)

This brief does not certify API access or a completed build.
