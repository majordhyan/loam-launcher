# LOAM reveal: production folder

Built for LOAM 1.6.1 from the "Grand Reveal" brief. Every claim is checked against the shipped app; see `06_YouTube/youtube-package.md` for the changes made to the brief and the evidence for each claim.

## Ready to use (v02, with sound)

| File | What it is |
| :--- | :--- |
| `05_Exports/LOAM_Teaser_15s_16x9_v02_2160p60.mp4` | Teaser: "Download failed." cold open, four fast app shots, mark, end line. 3840×2160, 60 fps |
| `05_Exports/LOAM_Teaser_15s_9x16_v02_2160x3840p60.mp4` | Same teaser for Shorts, 2160×3840, inside the Shorts safe zone |
| `05_Exports/LOAM_Promo_30s_16x9_v02_2160p60.mp4` | 30 s promo: six features (one button, Smart Drop, crash decoder, Migration Hub, light/dark, worlds) |
| `05_Exports/LOAM_Promo_30s_9x16_v02_2160x3840p60.mp4` | Same promo for Shorts / Reels / TikTok |
| `05_Exports/LOAM_TrailerIntro_13s_16x9_v02_2160p60.mp4` | Trailer 0:00–0:13: error cards, silence, Strata, mark, wordmark, tagline |
| `05_Exports/LOAM_EndCard_7s_16x9_v02_2160p60.mp4` | Trailer end card with the download line and the legal line (held 3 s) |
| `06_YouTube/thumbnails/LOAM_Thumb_v2_*.png` | Four high-contrast thumbnails (Crash, OneButton, NoAds, Bring), 1280×720 |
| `06_YouTube/youtube-package.md` | **High-CTR kit (v2)** at the top: titles, description, tags, hashtags, thumbnail pairing, retention notes; then the full package |
| `06_YouTube/captions/` | SRT captions: trailer (Cut A) and Shorts S2–S6 |

The v01 silent masters are kept next to v02 for an editor who wants to lay their own music.

**Video:** H.264 High, 4:2:0, Rec.709 (tagged), CRF 12, faststart. **Audio:** AAC-LC 384 kbps, 48 kHz stereo, mastered to −14 LUFS integrated (YouTube's reference), peaks ≤ −0.9 dBFS.

**Sound design** (`02_Audio/sfx.py`): every sound is synthesized from code with numpy, so there is nothing to license and no Content ID risk. A typewriter tick on each error card, a low buzz under the failures, silence, a soft hum as the Strata lines meet, a felt "thock" and chime on the mark, a UI click and whoosh on every shot change, and a light kick/shaker groove under a Cmaj7–Am7–Fmaj7–G pad for the montage cuts. Cues are scheduled from the same `03_GFX/motion/timeline.js` the picture uses, so sound and picture can't drift apart.

The motion uses only the locked palette, the app's Geist typefaces, the real LOAM mark and wordmark, real 1.6.1 screenshots, eased fades, moves and stroke reveals. There are no flashes faster than one change every 0.5 s, no AI-generated footage, and no Minecraft art.

## Still to do (needs you or an editor)

- **Real app recordings** for 0:13–1:08 of the trailer, the showcase film and Shorts S2–S6 (brief section 12: demo Windows profile, OBS at 4K 60 fps). Use the 1.6.1 shots listed in the YouTube package: one-button play, version list, Fabric/Quilt, Smart Drop, Migration Hub, crash decoder.
- **Voice-over** (script in the YouTube package and captions). The v02 cuts already carry original music and SFX; a licensed track is optional.
- **Gameplay clips** recorded by you (vanilla, no names, no servers).
- Confirm `loamlauncher.app` before publishing.
- Re-time the SRT captions to the final edit.

## Re-render

From `03_GFX`: `bash motion/render-all.sh` (teaser v01, intro, end card) and `bash motion/render-v02.sh` (teaser2, promo30). Then, from `Reveal`: `bash 02_Audio/mix-all.sh` synthesizes, masters and muxes all six v02 files. Edit shots, captions and crops in `motion/timeline.js`; the sound follows automatically. Thumbnails: `node render.mjs still thumbnails/<name>.html <out.png> 1280 720 1`. The renderer drives headless Microsoft Edge; FFmpeg 9 was installed with winget (`Gyan.FFmpeg`).
