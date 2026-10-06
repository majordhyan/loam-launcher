# LOAM privacy

LOAM is a desktop launcher. It has no LOAM account, no LOAM server, no ads, no telemetry and no analytics. It sends nothing about you to the LOAM project. This page lists every place LOAM connects to and what stays on your PC.

## What stays on your PC

- **Games, worlds, mods, settings and logs** live in your LOAM data folder (shown in Settings → Storage). Nothing is uploaded.
- **Microsoft sign-in.** Your refresh token is stored in Windows Credential Manager (entry name `LOAM`). Short-lived game tokens stay in memory. LOAM never sees your Microsoft password: you type it on Microsoft's own sign-in page in your browser.
- **Your Minecraft skin** is cached under `cache/avatars` so your head shows without a network request.
- **Crash explanations** are made on your PC by reading the game log. The log is not sent anywhere.
- **Problem reports** are created locally. You preview them, then choose to copy or save them. LOAM never posts or uploads a report.
- **Migration Hub** only reads instance folders from Prism Launcher, MultiMC and CurseForge. It never opens their account or login files, and never changes the originals.

## Where LOAM connects, and why

| Purpose | Hosts | When |
|---|---|---|
| Minecraft versions, game files and assets | `piston-meta.mojang.com`, `piston-data.mojang.com`, `launchermeta.mojang.com`, `launcher.mojang.com`, `libraries.minecraft.net`, `resources.download.minecraft.net` | Browsing versions, installing, repairing |
| Minecraft news on the home screen | `launchercontent.mojang.com` | At most every 15 minutes while LOAM is open |
| Fabric and Quilt | `meta.fabricmc.net`, `maven.fabricmc.net`, `meta.quiltmc.org`, `maven.quiltmc.org` | Choosing or installing a loader |
| Java runtime (Eclipse Temurin) | `api.adoptium.net`, `github.com` and its download hosts | Installing a game that needs a Java version you don't have yet |
| Modrinth content | `api.modrinth.com`, `cdn.modrinth.com` | Only when you paste a Modrinth link or import a Modrinth pack |
| Microsoft account | `login.microsoftonline.com`, `user.auth.xboxlive.com`, `xsts.auth.xboxlive.com`, `api.minecraftservices.com` | Signing in, and before each launch with a Microsoft account |
| Skins | `textures.minecraft.net`, `api.mojang.com`, `sessionserver.mojang.com` | Showing your head, the skin studio, or looking up a player name |

Every download is checked against a hash published by its source before it is used. LOAM only follows redirects to the hosts above. Opening Discord, minecraft.net articles or the Minecraft store happens in your own browser, only when you click.

These services have their own privacy policies. LOAM sends them only what the request needs: for example, Minecraft services receive your sign-in token, never your password.

## Removing your data

- Uninstalling LOAM keeps your games and worlds by default so you don't lose them by accident. Delete the data folder yourself to remove everything.
- Remove a Microsoft account in LOAM (Accounts → ×) to delete its saved token, or delete the `LOAM` entry in Windows Credential Manager.

## Limits

LOAM can't protect files from other software already running on your Windows account, and it can't control what mods do once the game runs. Mods run with the game's permissions; only install mods you trust.

Questions: loamlauncher@gmail.com
