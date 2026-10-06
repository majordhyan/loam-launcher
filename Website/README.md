# LOAM website kit (1.7.1)

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
Captured from LOAM 1.7.1 at 2× resolution (2560×1600 for 1280×800 windows) with LOAM's own window frame, using sample games and a sample player name. `*-framed.png` versions sit on a soft background with a shadow, ready for a hero section. Light and dark versions are both included.

## Social preview
`loam-social-card-1200x630.png`: use as `og:image` and `twitter:image`.

```html
<meta property="og:image" content="https://www.loamlauncher.app/loam-social-card-1200x630.png">
<meta name="twitter:card" content="summary_large_image">
```

## Download link and checksum
Installer: `LOAM-Setup-Windows-x64.exe` from the GitHub release. Show the SHA-256 from `SHA256SUMS.txt` (copy included here) next to the download button. The installer isn't code-signed yet, so say that SmartScreen may ask the player to confirm.

Keep the line: "LOAM is an independent project and is not affiliated with, endorsed by, or associated with Mojang Studios or Microsoft."
