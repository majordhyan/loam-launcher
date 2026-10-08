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

- `LOAM-Setup-Windows-x64.exe`, the installer (5.4 MB)
- `SHA256SUMS.txt`, its checksum

## 2. Check the download

```powershell
certutil -hashfile LOAM-Setup-Windows-x64.exe SHA256
```

The printed value must match the line in `SHA256SUMS.txt`. For 1.9.0 it is:

```
fce385344a077a515f14925359002e4070873e3d65bdcdafb8a1efab04292be4
```

## 3. Run the installer

LOAM 1.9.0 is not code-signed yet, so Windows SmartScreen shows **"Windows protected your PC"**. After checking the hash, choose **More info → Run anyway**.

LOAM installs to `%LOCALAPPDATA%\LOAM` and adds a Start menu shortcut.

## 4. First launch

See [First run](first-run.md).

## Updating

From 1.9.0 (and 1.8 builds), LOAM updates itself: **Settings › Updates** checks this repository's releases, shows what's new and installs the update with a progress bar, then restarts. An update is installed only if its signature matches LOAM's key. LOAM also checks once a day at startup; you can turn that off in the same place.

From 1.6.1 or older, download the newest installer from [Releases](https://github.com/majordhyan/loam-launcher/releases) and run it over your current version once. Your games, worlds, accounts and settings are kept.

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
