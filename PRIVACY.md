# Privacy

**Applies to:** LOAM for Windows 1.9.0 · **Updated:** 8 October 2026

LOAM is a desktop launcher. It has no LOAM account, no LOAM server, no ads, no telemetry and no analytics. It sends nothing about you to the LOAM project.

## What stays on your PC

- **Games, worlds, mods, settings and logs** live in your data folder (`%APPDATA%\LoamLauncher`, or `%LOCALAPPDATA%\app.loam.launcher` for installs upgraded from older versions). Nothing is uploaded.
- **Microsoft sign-in.** Your refresh token is stored in Windows Credential Manager (entries ending in `.LOAM`). Short-lived game tokens stay in memory. You type your password on Microsoft's own page in your browser; LOAM never sees it.
- **Your Minecraft skin** is cached on your PC so your head appears without a network request.
- **Crash explanations** are made on your PC by reading the game's log. The log is not sent anywhere.
- **Problem reports** are created locally with tokens, e-mail addresses and your Windows user name removed. You preview them, then choose to copy or save them. LOAM never posts or uploads a report.
- **Music.** Saved music links, your queue of local files and player settings stay on your PC. Local files are played by LOAM itself and are never uploaded. LOAM never records or listens to your PC's sound; the "Live" visualizer reads only the files LOAM plays.
- **API keys.** A CurseForge API key you add is stored in Windows Credential Manager.
- **Migration Hub** only reads instance folders from Prism Launcher, MultiMC and CurseForge. It never opens their account or login files and never changes the originals.

## Where LOAM connects, and why

| Purpose | Hosts | When |
| :--- | :--- | :--- |
| Minecraft versions, game files and assets | `piston-meta.mojang.com`, `piston-data.mojang.com`, `launchermeta.mojang.com`, `launcher.mojang.com`, `libraries.minecraft.net`, `resources.download.minecraft.net` | Browsing versions, installing, repairing |
| Minecraft news, release and snapshot notes | `launchercontent.mojang.com` | About every 10 minutes while LOAM is open, and when you come back to it |
| Fabric and Quilt | `meta.fabricmc.net`, `maven.fabricmc.net`, `meta.quiltmc.org`, `maven.quiltmc.org` | Choosing or installing a loader |
| Java (Eclipse Temurin) | `api.adoptium.net`, `github.com` and its download hosts | Installing a game that needs a Java version you don't have yet |
| Modrinth | `api.modrinth.com`, `cdn.modrinth.com` | Browsing Discover, installing or updating content, pasting a Modrinth link or importing a Modrinth pack |
| CurseForge | `api.curseforge.com`, `media.forgecdn.net` and its download hosts | Only after you add your own CurseForge API key, when you browse or install from CurseForge |
| Minecraft servers | The servers listed on the Servers page and the ones you add (their address and port, including DNS lookups) | While the Servers page is open, to show status, players and ping; and when you Join |
| Music: YouTube | `www.youtube-nocookie.com` (YouTube's privacy-enhanced player), `i.ytimg.com` | Only when you press Play on YouTube music. YouTube's own player then talks to YouTube under YouTube's privacy policy |
| Music: link details | `www.youtube.com`, `open.spotify.com`, `soundcloud.com` (their public oEmbed pages); artwork from `i.ytimg.com`, `i.scdn.co`, `i1.sndcdn.com` | When you add a music link, to show its title and artwork. Only the link you pasted is sent |
| LOAM updates | `github.com` and its download hosts | Checking for and downloading LOAM updates (once a day at startup unless you turn it off, or when you press Check) |
| Microsoft account | `login.microsoftonline.com`, `user.auth.xboxlive.com`, `xsts.auth.xboxlive.com`, `api.minecraftservices.com` | Signing in, and before each launch with a Microsoft account |
| Skins | `textures.minecraft.net`, `api.mojang.com`, `sessionserver.mojang.com` | Showing your head, the skin studio, or looking up a player name |

Every downloaded game file is checked against the hash its source publishes before use. LOAM only follows redirects to the hosts above. Discord, minecraft.net articles, the Minecraft store, project pages, and Spotify, Apple Music and SoundCloud links open in your own browser or their apps, only when you click them.

These services have their own privacy policies. LOAM sends them only what each request needs; for example, Minecraft services receive your sign-in token, never your password.

## Removing your data

Uninstalling keeps your games and worlds so you don't lose them by accident. To remove everything, see [Uninstall and your data](docs/uninstall-and-data.md).

## Limits

LOAM can't protect your files from other software already running on your Windows account, and it can't control what a mod does once the game runs. Mods run with the game's permissions; only install mods you trust.

**Questions:** loamlauncher@gmail.com
