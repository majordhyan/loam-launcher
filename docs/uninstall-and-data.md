# Uninstall and your data

## Uninstall

**Settings → Apps → Installed apps → LOAM → Uninstall** (or Control Panel → Uninstall a program).

The uninstaller removes LOAM's program files (`%LOCALAPPDATA%\LOAM`), its shortcuts and its uninstall entry.

**It keeps your games and worlds** as long as you leave the uninstaller's **"Delete the application data"** box unticked (it is unticked by default). Reinstalling LOAM picks everything up again. This was verified for 1.6.1: all game, world and settings files were byte-for-byte unchanged after uninstalling and reinstalling.

> ⚠️ **Upgraded from a version before 1.5.1?** Your games live in `%LOCALAPPDATA%\app.loam.launcher`, and ticking "Delete the application data" deletes that folder, **including your worlds**. Leave it unticked, or back up `games\` first. (Known issue LOAM-0021; a later release will stop the uninstaller from removing game data.)

## Your data folder

| Installed | Data folder |
| :--- | :--- |
| First installed with 1.5.1 or later | `%APPDATA%\LoamLauncher` |
| Upgraded from an earlier version | `%LOCALAPPDATA%\app.loam.launcher` |
| Moved with *Change data folder* | The folder you chose |

Inside it:

| Folder | Contents |
| :--- | :--- |
| `games\` | One folder per game: its saves, mods, packs, configs and logs |
| `backups\` | Backups made before imports, restores and content removal |
| `trash\` | Games and content you removed, kept so they can be recovered |
| `cache\` | Minecraft libraries, assets, Java runtimes and your cached Minecraft head |
| `reports\` | Problem reports you saved |
| `state.json` | Your game list, accounts (names only, no tokens) and preferences |

**Back up your worlds** by copying `games\<game name>\saves\`.

## Remove everything

1. Uninstall LOAM.
2. Delete the data folder above. ⚠️ This permanently deletes every game and world in it.
3. Remove saved Microsoft sign-ins: open **Credential Manager → Windows Credentials** and remove entries ending in **`.LOAM`**, or in PowerShell:

```powershell
cmdkey /list | Select-String "\.LOAM"
cmdkey /delete:<entry name shown above>
```

Removing a Microsoft account inside LOAM (Accounts → ×) also deletes its saved sign-in.

*Back to [README](../README.md) · [Privacy](../PRIVACY.md)*
