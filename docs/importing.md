# Importing: Smart Drop and the Migration Hub

LOAM never changes a game until you have reviewed what will happen, and it makes a backup first. Your source files are only read.

## Bring your games from another launcher (Migration Hub)

![Migration Hub](images/1.9.0/migration-hub.png)

The Migration Hub turns a **Prism Launcher**, **MultiMC** or **CurseForge** instance into a LOAM game.

1. Close the other launcher.
2. Open it from **Install → Import from another launcher**, the first-run screen, or `Ctrl K` → *Import from Prism, MultiMC or CurseForge*. You can also drop an instance folder onto LOAM's window.
3. LOAM lists the instances it finds in the usual places:
   - Prism Launcher: `%APPDATA%\PrismLauncher\instances` (or its custom instance folder)
   - CurseForge: `%USERPROFILE%\curseforge\minecraft\Instances`
   - MultiMC is portable: LOAM checks common folders. Use **Choose a folder** for anything else.
4. Press **Import** on the instance you want.

**What comes over:** worlds, mods, mod configs, resource and shader packs, screenshots, `options.txt` and your server list. The Minecraft version, the Fabric or Quilt loader version and the memory setting are kept.

**What never comes over:** account and login files, logs and the other launcher's own settings. LOAM never opens them.

**Forge and NeoForge instances:** LOAM doesn't run Forge or NeoForge. Choose **Import worlds** to bring the worlds, packs and settings into a vanilla game of the same version; the mods stay behind.

The new game appears in your library only after every file has been copied. If anything fails, LOAM removes its partial copy, and your original is never changed. Press **Install** afterwards to download Minecraft for the new game.

## Drop anything, anywhere (Smart Drop)

![Smart Drop](images/1.9.0/smart-drop.png)

Drag a file anywhere onto LOAM's window, or choose one with **Drop a mod, pack or world**:

| You drop | LOAM does |
| :--- | :--- |
| Fabric or Quilt mod `.jar` | Lists your games, marks which can run it ("Needs a Fabric or Quilt game.", "Made for Minecraft ~1.21.4.") and picks the best match |
| Resource pack or shader pack `.zip` | Adds it to the game you choose |
| World `.zip` | Imports a copy as a new world; the archive is untouched |
| Modrinth `.mrpack` | Installs into a matching game, or offers **New game** with the pack's exact Minecraft and loader version |
| Prism, MultiMC or CurseForge instance folder | Opens the Migration Hub for it |
| A `.minecraft` folder | Copies saves, mods, packs, options and server list into the selected game |

You can also paste a **Modrinth link** (project or version page) on the import screen.

Then review: LOAM shows the file count, size, target version, loader and the mod's declared dependencies (present, missing or wrong version). Missing dependencies are listed, not installed automatically. Press **Confirm import** to apply.

## Backups and undo

- A backup of the game's worlds, mods, configs, packs, options and server list is made before every import.
- Restore it from the game's **Details → Backups** tab. Restoring first backs up the current state, so it can be undone too.
- If LOAM was interrupted while applying an import, that game won't launch until you restore its backup, so a half-applied import is never played.

## Safety checks

Archives are inspected without running anything: unsafe paths, links, oversized or "zip bomb" archives and duplicate entries are rejected. LOAM checks compatibility, not intent: a mod runs with the game's permissions, so only install mods you trust.

*Back to [README](../README.md) · [Compatibility](compatibility.md) · [Troubleshooting](troubleshooting.md)*
