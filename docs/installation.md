# Installation

## Requirements

| | |
| :--- | :--- |
| Windows | 10 or 11, 64-bit (x64) |
| WebView2 | Built into Windows 11; the installer downloads it on Windows 10 if missing |
| Disk | 18 MB for LOAM; about 0.5–1 GB per Minecraft version |
| Rights | No administrator rights needed (installs for your Windows account only) |

## 1. Download

From the [latest release](https://github.com/majordhyan/loam-launcher/releases/latest), download:

- `LOAM-Setup-Windows-x64.exe`, the installer (4.6 MB)
- `SHA256SUMS.txt`, its checksum

## 2. Check the download

```powershell
certutil -hashfile LOAM-Setup-Windows-x64.exe SHA256
```

The printed value must match the line in `SHA256SUMS.txt`. For 1.6.1 it is:

```
1fc21cacb73c41449a8d9b51466626d8324f1a5645c7c34a1ab3a328dabf23b5
```

## 3. Run the installer

LOAM 1.6.1 is not code-signed yet, so Windows SmartScreen shows **"Windows protected your PC"**. After checking the hash, choose **More info → Run anyway**.

LOAM installs to `%LOCALAPPDATA%\LOAM` and adds a Start menu shortcut.

## 4. First launch

See [First run](first-run.md).

## Updating

Download the newest installer from [Releases](https://github.com/majordhyan/loam-launcher/releases) and run it over your current version. Your games, worlds, accounts and settings are kept. (Automatic updates will arrive with a signed release.)

## Silent install

```powershell
LOAM-Setup-Windows-x64.exe /S
```

## Where your data lives

| Installed | Data folder |
| :--- | :--- |
| First installed with 1.5.1 or later | `%APPDATA%\LoamLauncher` |
| Upgraded from an earlier version | `%LOCALAPPDATA%\app.loam.launcher` (kept where it was) |

You can move it with **Settings → Storage & Java → Change data folder**: LOAM copies and verifies everything into an empty folder, switches after a restart, and leaves the original untouched.

*Back to [README](../README.md) · [Troubleshooting](troubleshooting.md) · [Uninstall](uninstall-and-data.md)*
