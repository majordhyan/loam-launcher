# Windows trust: Defender, SmartScreen and code signing

## What happened (2026-10-06)

Microsoft Defender quarantined `%LOCALAPPDATA%\LOAM\loam.exe` from LOAM 1.6.1:

| | |
| :--- | :--- |
| Detection | `Trojan:Win32/Bearfoos.A!ml`, severity Severe |
| Type | FastPath (a signature pushed from Microsoft's cloud for this file), event 2010 then 1116/1117 |
| File | `loam.exe` 1.6.1 as installed, SHA-256 `58593C341D74227E621D04388F72D38A453E655BFEDD8B6384F718A3536415EC` |
| Installer | `LOAM-Setup-1.6.1-Windows-x64.exe`, SHA-256 `1FC21CACB73C41449A8D9B51466626D8324F1A5645C7C34A1AB3A328DABF23B5` (not detected itself) |
| Definitions | 1.459.568.0, engine 1.1.26080.3 |

**It is a false positive.** `!ml` means a machine-learning verdict, not a match against known malware. The installed file is our build: it differs from `src-tauri/target/release/loam.exe` only in the 3-byte bundle marker Tauri writes when packaging (`__TAURI_BUNDLE_TYPE_VAR_UNK` → `NSS`). The detection is tied to that exact file; a raw build three bytes different scans clean.

Why the model fired: an unsigned, brand-new file (no reputation) that started hidden `powershell.exe -NoProfile -NonInteractive -Command`, hidden `reg.exe add` and hidden `taskkill /F`. Droppers and remote-access trojans do exactly that. 1.6.2 removes all three (see CHANGELOG). It scans clean and ran with no detection on the same PC.

## 1. Ask Microsoft to clear 1.6.1 (do this now; free)

Everyone who installed 1.6.1 from GitHub will see this alert until Microsoft fixes the verdict. Usually takes a few days.

1. Go to https://www.microsoft.com/en-us/wdsi/filesubmission and sign in with your Microsoft account.
2. Choose **Software developer**.
3. Product: **Microsoft Defender Antivirus (Windows 10/11 / Microsoft 365 Defender)**.
4. File: upload `artifacts/LOAM-Setup-1.6.1-Windows-x64.exe`. Defender does not flag the installer, so it uploads normally.
5. "What do you believe this file is?" **Incorrectly detected (false positive)**.
6. Detection name: `Trojan:Win32/Bearfoos.A!ml`. Definition version: `1.459.568.0`.
7. Paste into "Additional information":

```
LOAM is a Minecraft: Java Edition launcher for Windows (Tauri 2 / Rust + WebView2), published by LOAM at
https://loamlauncher.app and https://github.com/majordhyan/loam-launcher/releases.
The installer installs loam.exe to %LOCALAPPDATA%\LOAM. Defender (FastPath, 1.459.568.0) quarantines
that installed loam.exe, SHA-256 58593C341D74227E621D04388F72D38A453E655BFEDD8B6384F718A3536415EC,
as Trojan:Win32/Bearfoos.A!ml. This is our own build. It downloads Minecraft and Java from Mojang and
Eclipse Adoptium, and starts Java to run the game. It does not take remote commands.
Version 1.6.2 (installer SHA-256 C10BFC7841F4E1EEE91A8B63234C643B6B0499C9BB61D855FD4BA035C084DB34) no longer
runs helper processes; please also review it so the new release is not flagged.
The build is not code-signed yet; we are setting up signing.
```

8. Submit the **1.6.2 installer** the same way, as "should not be detected", so it has a clean verdict before people download it.
9. Write down the submission IDs. The status page shows when the verdict changes. Users then just run `Update-MpSignature` (or wait for automatic updates) and can restore the file from Protection history.

## 2. Code signing (the lasting fix)

Unsigned files are judged one by one, by hash, so every new release starts with no reputation and can be flagged again. A signature lets Defender and SmartScreen trust the **publisher** across releases. Options:

| Route | Cost | Who can use it | What gets signed | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Microsoft Store (MSIX)** | Free for individuals | Individuals in all markets (ID + selfie check) at https://storedeveloper.microsoft.com | The MSIX package; **Microsoft re-signs it** after certification | Needs an MSIX build of LOAM and a Store-only update path (the Store updates the app; disable LOAM's own updater there). Does not sign the GitHub `.exe`. |
| **Azure Artifact Signing** (was Trusted Signing) | From about USD 9.99/month | Organizations in the US, Canada, EU and UK; **individuals only in the US and Canada** | Every `.exe` and the installer | Cheapest public-trust route if you qualify. Plugs into `bundle.windows.signCommand`. |
| **OV code-signing certificate** from a CA (e.g. Certum, SSL.com, Sectigo resellers) | Typically tens to a few hundred USD per year; check current prices | Individuals worldwide, with identity verification | Every `.exe` and the installer | The key must live on a hardware token or the CA's cloud signing service (an industry rule since 2023). |

EV certificates no longer give instant SmartScreen trust (Microsoft changed that in 2024). OV and Artifact Signing build reputation as people download.

### When you have a certificate

Signing plugs into the existing build. Add to `src-tauri/tauri.conf.json` under `bundle.windows`:

```json
"signCommand": "signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 /a %1"
```

Use your CA's own command instead if it signs through a cloud tool. Tauri signs `loam.exe`, the uninstaller and the setup file. Then:
- `docs/artifact.json`: set `"authenticode"` from what `Get-AuthenticodeSignature` reports;
- README and release notes: drop the "isn't code-signed yet" lines only once the published file really verifies.

## 3. Rules for future code (so the ML model has nothing to react to)

- Don't start shells or system tools (`powershell`, `cmd`, `reg`, `taskkill`, `schtasks`, `wmic`), above all hidden ones. Call the Windows API instead. The only child process LOAM starts is Java.
- Don't download and run executables other than Java from Adoptium and the game files from Mojang. Check hashes as LOAM already does.
- Keep publisher, copyright and version in the file properties (`bundle.publisher`, `bundle.copyright`).
- Before each release: scan the **installed** `loam.exe` (not `target/release`, which lacks the bundle marker) with
  `"%ProgramFiles%\Windows Defender\MpCmdRun.exe" -Scan -ScanType 3 -File <copy> -DisableRemediation`,
  and submit the installer to Microsoft on release day.
