# LOAM reveal: production folder

Built for LOAM 1.6.1 from the "Grand Reveal" brief. Every claim is checked against the shipped app; see `06_YouTube/youtube-package.md` for the changes made to the brief and the evidence for each claim.

## Ready to use

| File | What it is |
| :--- | :--- |
| `05_Exports/LOAM_Teaser_15s_16x9_v01_2160p60.mp4` | Teaser (D3), 3840×2160, 60 fps |
| `05_Exports/LOAM_Teaser_15s_9x16_v01_2160x3840p60.mp4` | Teaser for Shorts, 2160×3840, 60 fps, inside the Shorts safe zone |
| `05_Exports/LOAM_TrailerIntro_13s_16x9_v01_2160p60.mp4` | Trailer 0:00–0:13: error cards, silence, Strata, mark, wordmark, tagline |
| `05_Exports/LOAM_EndCard_7s_16x9_v01_2160p60.mp4` | Trailer end card with the download line and the legal line (held 3 s) |
| `06_YouTube/thumbnails/` | Three thumbnail concepts (1280×720) and a Shorts cover (1080×1920) |
| `06_YouTube/youtube-package.md` | Titles, descriptions, chapters, tags, pinned comments, prepared replies |
| `06_YouTube/captions/` | SRT captions: trailer (Cut A) and Shorts S2–S6 |

All videos are H.264 High, 4:2:0, Rec.709 (tagged), with a silent 48 kHz stereo track. They are **silent masters**: add the licensed music bed and the app's own UI sounds in the edit, then mix to −14 LUFS.

The motion uses only the locked palette, the app's Geist typefaces, the real LOAM mark and wordmark, eased fades, moves and stroke reveals. There are no flashes faster than one change every 0.5 s, no AI-generated footage, and no Minecraft art.

## Still to do (needs you or an editor)

- **Real app recordings** for 0:13–1:08 of the trailer, the showcase film and Shorts S2–S6 (brief section 12: demo Windows profile, OBS at 4K 60 fps). Use the 1.6.1 shots listed in the YouTube package: one-button play, version list, Fabric/Quilt, Smart Drop, Migration Hub, crash decoder.
- **Voice-over** (script in the YouTube package and captions) and a **licensed music** track.
- **Gameplay clips** recorded by you (vanilla, no names, no servers).
- Confirm `loamlauncher.app` before publishing.
- Re-time the SRT captions to the final edit.

## Re-render

From `03_GFX`: `bash motion/render-all.sh`, then `bash motion/encode.sh <frames folder> <output.mp4>`. Thumbnails: `node render.mjs still thumbnails/<name>.html <out.png> 1280 720 1`. The renderer drives headless Microsoft Edge; FFmpeg 9 was installed with winget (`Gyan.FFmpeg`).
