# LOAM website kit (1.8.0)

Everything here is ready to upload to loamlauncher.app.

## Icons (`icons/`)
| File | Use |
| :--- | :--- |
| `favicon.ico` | Classic favicon (16, 32, 48 px) |
| `favicon.svg` | Modern browsers (crisp at any size) |
| `favicon-16.png`, `favicon-32.png`, `favicon-48.png` | PNG favicons |
| `apple-touch-icon.png` | iPhone/iPad home screen (180 px) |
| `loam-icon-192.png`, `loam-icon-512.png` | Android / web app manifest |
| `loam-icon-maskable-512.png` | Android adaptive icon (mark inside the safe zone) |
| `loam-icon-1024.png`, `loam-icon-256.png`, `loam-icon-128.png` | Hero, press kit, social cards |
| `loam-icon.svg` | The full-detail mark (vector) |
| `loam-app-icon.ico` | The exact icon the Windows app uses |

Paste in the site's `<head>`:

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#C15F3C">
```

Put `site.webmanifest` (in this folder) at the site root next to the icons.

## Screenshots (`screenshots/`)
Captured from LOAM 1.8.0 at 2× resolution: 2560×1600 for a 1280×800 window, with LOAM's own window frame, sample games and a sample player name. Every shot comes in four files:

| File | Use |
| :--- | :--- |
| `loam-<name>.png` / `.webp` | The window alone (2560×1600). Show it at 1280×800 CSS pixels for a pixel-perfect result on high-DPI screens. |
| `loam-<name>-framed.png` / `.webp` | The window on a soft backdrop with rounded corners and a shadow (3000×2000), ready for a hero section. Dark shots sit on a dark backdrop. |

Use the `.webp` files on the site (much smaller), and keep the `.png` files for press and stores.

| Name | Shows |
| :--- | :--- |
| `home-dusk` | Home at dusk: the selected game, PLAY, the 3D skin and the animated landscape (best hero image) |
| `home-night-dark` | Home at night in dark mode |
| `home-day` | Home by day |
| `servers` / `servers-dark` | The new Servers page: live players, ping and one-click Join |
| `discover` | Discover: Modrinth mods filtered to the selected game |
| `discover-details` | A project's details panel (Sodium) with screenshots and Install |
| `library` / `library-dark` | The Library grid with covers, tags and filters |
| `game-profile` | A game's profile: playtime, mods, worlds and tabs |
| `skins-dark` | The 3D skin and cape studio |
| `settings` | Settings › Home & sound, including the music player and visualizer |

Responsive example:

```html
<picture>
  <source srcset="/screenshots/loam-home-dusk-framed.webp" type="image/webp">
  <img src="/screenshots/loam-home-dusk-framed.png" width="1500" height="1000"
       alt="LOAM's Home screen: the selected Minecraft game with a Play button and an animated landscape">
</picture>
```

## Social preview
`loam-social-card-1200x630.png`: use as `og:image` and `twitter:image`.

```html
<meta property="og:image" content="https://www.loamlauncher.app/loam-social-card-1200x630.png">
<meta name="twitter:card" content="summary_large_image">
```

## Download link and checksum
Installer: `LOAM-Setup-Windows-x64.exe` from the GitHub release. Show the SHA-256 from `SHA256SUMS.txt` (copy included here) next to the download button. The installer isn't code-signed yet, so say that SmartScreen may ask the player to confirm.

Keep the line: "LOAM is an independent project and is not affiliated with, endorsed by, or associated with Mojang Studios or Microsoft."
