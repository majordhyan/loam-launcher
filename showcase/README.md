# LOAM Launcher — Product Showcase Film ("Your worlds, ready.")

Deterministic 36-second product showcase film for **LOAM Launcher**, engineered with Python, Pillow, NumPy, SciPy, and FFmpeg.

---

## 1. Commands

### Preview & Verification
To verify the audio track and sample frames from every scene without re-rendering the full film:
```powershell
python -m showcase.audio_generator
python -c "from showcase.frame_renderer import render_frame; render_frame(1980).save('showcase/exports/LOAM_Showcase_Cover.png')"
```

### Full Production Build
Renders all 2,160 frames at 60 fps, synthesizes the calibrated -14 LUFS 48 kHz soundtrack, encodes both 1080p and 4K masters with web-optimized metadata (`+faststart`), and exports the cover image:
```powershell
python -m showcase.build_showcase --force
```

---

## 2. Configuration & Customization

All captions, color tokens, typography, shot boundaries, and export targets are centralized in:
`showcase/config.py`

### Where to Change Captions & Text
Open `showcase/config.py` and modify the copy constants:
```python
COPY_SHOT1_SUB     = "Minecraft Java launcher"
COPY_SHOT2_HEAD    = "Your worlds,\nready."
COPY_SHOT3_HEAD    = "A clear way to play."
COPY_SHOT4_HEAD    = "A place for every setup."
COPY_SHOT5_HEAD    = "Drop it in.\nMake it yours."
COPY_SHOT6_HEAD    = "Set it your way."
COPY_SHOT7_HEAD    = "Ready when you are."
COPY_SHOT8_TAGLINE = "Your worlds, ready."
COPY_SHOT8_PLATFORM = "For Windows  •  v1.5.0"
```

### Download Destination / Release Version
If a public distribution URL is verified in the future, add it to `COPY_SHOT8_PLATFORM` in `showcase/config.py`.

---

## 3. Timeline & Shot Structure (Locked 36.0 Seconds / 2,160 Frames @ 60 FPS)

| Shot | Time Code | Frame Range | Name | Core Action |
|:---:|:---:|:---:|:---|:---|
| **1** | 00:00–00:03 | 0–180 | **THE SIGNAL** | Ivory canvas, terracotta square motif, fine taupe rule, LOAM wordmark reveal, "Minecraft Java launcher" subtext. |
| **2** | 00:03–00:07 | 180–420 | **THE PROMISE** | "Your worlds, ready." typography, authentic LOAM Home screen enters from right with soft shadow. |
| **3** | 00:07–00:12 | 420–720 | **THE HOME SCREEN** | "A clear way to play." Camera centers on launcher, smooth cursor selects Minecraft setup, clicks, hovers Play button. |
| **4** | 00:12–00:17 | 720–1020 | **YOUR SETUPS** | "A place for every setup." 3 real setups (Fabric 1.21.4, Vanilla 1.20.4, Quilt 1.21.1) with loader, Java 21, and RAM tags. |
| **5** | 00:17–00:22 | 1020–1320 | **SIGNATURE INTERACTION** | "Drop it in. Make it yours." Drag-and-drop custom PNG texture into Skin Studio drop target, verified offline UUID synchronization. |
| **6** | 00:22–00:26 | 1320–1560 | **QUIET CONTROL** | "Set it your way." Settings screen memory allocation slider smoothly adjusted from 2,048 MB to 6,144 MB (Optimal). |
| **7** | 00:26–00:31 | 1560–1860 | **THE PAYOFF** | "Ready when you are." Play button clicked, launch transition to authentic running Minecraft Fabric title screen. |
| **8** | 00:31–00:36 | 1860–2160 | **THE BRAND HOLD** | Full terracotta background, ivory LOAM wordmark, "Your worlds, ready.", "For Windows • v1.5.0", music resolves to silence. |

---

## 4. Asset Provenance & Real-Time App Captures

- **Real-Time 4K Browser Interface Captures**:
  - Home Screen: Direct 4K capture from running app with Fabric 1.21.4 setup, Dhyan profile (`showcase/assets/screen_home_realtime.png`).
  - Skin Studio: Direct 4K capture with active 3D Steve/Alex viewport, cape selector, and local preview (`showcase/assets/screen_studio_realtime.png`).
  - Settings Screen: Direct 4K capture showing Appearance, Interface scaling, and motion controls (`showcase/assets/screen_settings_realtime.png`).
  - Game Payoff: Retouched high-fidelity 1.21.4 Fabric title screen (`showcase/assets/screen_minecraft.png`).
- **Brand Assets**:
  - `brand_wordmark.png` & `brand_icon.png`: Authentic vector exports from `public/brand/`.
- **Typography**:
  - Windows 11 optical fonts: `SegUIVar.ttf` (Segoe UI Variable), `georgiab.ttf` (Georgia Bold), `segoeuib.ttf`, and `Bahnschrift.ttf`.
- **Motion & Presentation Design**:
  - Continuous camera breathing/drift (1.000 to 1.015x) eliminating static holds.
  - Dual-layer ambient drop shadows on application window cards.
  - Elastic tactile click feedback states and Bézier interpolation (`cubic-bezier(0.22, 1, 0.36, 1)`).
  - Terracotta Graphic Bridge (Shot 7 -> Shot 8) expanding seamlessly into the brand hold.

---

## 5. Soundtrack & Audio Provenance

- **Composition**: Bespoke original electronic soundscape procedurally synthesized at 48,000 Hz stereo.
- **Key & Harmony**: Eb min9 -> Gb maj7 -> Ab sus2 -> Bb min7 -> Eb maj9 at 100 BPM (15 bars spanning exactly 36.000s).
- **Sound Design**:
  - Rich analog Rhodes / electric piano chord voicing with warm tape chorus.
  - Acoustic brush rhythm & velvet kick on beats 1 and 3 (100 BPM).
  - Minimalist ping-pong pluck arpeggio.
  - Synchronized micro-tactile mechanical clicks (0.8s, 3.0s, 8.5s, 13.5s, 28.2s, 31.0s).
  - Crystalline dual chime (880 Hz + 1320 Hz) on skin drop at 19.0s.
  - Ratchet tick sequence on memory slider (23.2s).
  - Low-frequency 50 Hz sub-boom on Play launch (28.25s).
- **Mastering**:
  - Integrated Loudness: **-14.0 LUFS** (EBU R128 verified).
  - True Peak: **-1.5 dBFS** (strictly compliant with broadcast delivery standards).
  - 100% original, royalty-free DSP code.

---

## 6. Output Specifications

- **1080p Master**:
  - File: `showcase/exports/LOAM_Showcase_36s_1080p.mp4` (and `dist/LOAM_Showcase_36s_1080p.mp4`)
  - Resolution: 1920 × 1080
  - Frame Rate: 60.0 fps (2,160 frames)
  - Video Codec: H.264 (High Profile, CRF 17, slow preset)
  - Color Space: YUV420p
  - Audio: AAC 320 kbps, 48 kHz stereo
  - Streaming: Fast-start (`moov` atom at file beginning)
- **4K Master**:
  - File: `showcase/exports/LOAM_Showcase_36s_4K.mp4` (and `dist/LOAM_Showcase_36s_4K.mp4`)
  - Resolution: 3840 × 2160
  - Frame Rate: 60.0 fps (2,160 frames)
  - Video Codec: H.264 (High Profile, CRF 16, Lanczos upscaling)
  - Color Space: YUV420p
  - Audio: AAC 320 kbps, 48 kHz stereo
  - Streaming: Fast-start (`moov` atom at file beginning)
- **Cover Image**:
  - File: `showcase/exports/LOAM_Showcase_Cover.png` (and `dist/LOAM_Showcase_Cover.png`)
  - Resolution: 1920 × 1080 PNG
  - Content: Pure terracotta brand hold with ivory LOAM wordmark and typography.
