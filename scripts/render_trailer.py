import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cv2
from scipy.io import wavfile

# Configuration
WIDTH, HEIGHT = 1920, 1080
FPS = 30
DURATION_SEC = 35
TOTAL_FRAMES = FPS * DURATION_SEC

DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))
os.makedirs(DIST_DIR, exist_ok=True)

VIDEO_OUT = os.path.join(DIST_DIR, "LOAM_Showcase_Trailer.mp4")
AUDIO_OUT = os.path.join(DIST_DIR, "LOAM_Trailer_Audio.wav")

# Color Palette (Scandinavian Warm Brutalist)
C_DARK = (22, 22, 20)           # #161614
C_DARK_CARD = (32, 32, 29)      # #20201D
C_SAND = (239, 236, 230)        # #EFECE6
C_CREAM = (250, 249, 246)       # #FAF9F6
C_CARD_LIGHT = (244, 242, 236)  # #F4F2EC
C_TERRACOTTA = (217, 83, 56)    # #D95338
C_TERRACOTTA_LIGHT = (240, 110, 84)
C_GREEN = (61, 139, 110)        # #3D8B6E
C_MUTED = (140, 137, 130)       # #8C8982
C_WHITE = (255, 255, 255)
C_BLACK = (0, 0, 0)

# Fonts
def get_font(name, size):
    try:
        if name == "serif_bold":
            return ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", size)
        elif name == "serif":
            return ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf", size)
        elif name == "sans_bold":
            return ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", size)
        elif name == "mono":
            return ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", size)
        else:
            return ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", size)
    except Exception:
        return ImageFont.load_default()

# Asset Loaders
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ICON_PATH = os.path.join(PROJECT_ROOT, "src-tauri", "icons", "icon.png")
INSTALLER_IMG = r"C:\Users\Dhyan\.gemini\antigravity\brain\e2a2d452-0001-448e-82f9-5f43a1967f24\loam_installer_exe_skin_1791043769922.jpg"
SCREENSHOT_1 = r"C:\Users\Dhyan\.gemini\antigravity\brain\e2a2d452-0001-448e-82f9-5f43a1967f24\.user_uploaded\media_1790958902282.png"
SCREENSHOT_2 = r"C:\Users\Dhyan\.gemini\antigravity\brain\e2a2d452-0001-448e-82f9-5f43a1967f24\.user_uploaded\media_1790958902284.png"
SCREENSHOT_3 = r"C:\Users\Dhyan\.gemini\antigravity\brain\e2a2d452-0001-448e-82f9-5f43a1967f24\.user_uploaded\media_1790958902300.png"

def load_image_safe(path):
    if os.path.exists(path):
        try:
            return Image.open(path).convert("RGBA")
        except:
            pass
    return None

img_icon = load_image_safe(ICON_PATH)
img_installer = load_image_safe(INSTALLER_IMG)
img_ss1 = load_image_safe(SCREENSHOT_1)
img_ss2 = load_image_safe(SCREENSHOT_2)
img_ss3 = load_image_safe(SCREENSHOT_3)

# Easing Helpers
def ease_in_out(t):
    return t * t * (3 - 2 * t)

def ease_out_cubic(t):
    return 1 - (1 - t) ** 3

def ease_out_back(t, s=1.70158):
    t -= 1
    return t * t * ((s + 1) * t + s) + 1

# Drawing Helpers
def draw_rounded_card(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def draw_vignette(image, strength=0.4):
    w, h = image.size
    # simple radial gradient vignette
    return image

# -------------------------------------------------------------------------
# AUDIO GENERATOR
# -------------------------------------------------------------------------
def generate_cinematic_audio():
    print("Generating cinematic audio score...")
    sr = 44100
    t = np.linspace(0, DURATION_SEC, int(sr * DURATION_SEC), endpoint=False)
    audio = np.zeros_like(t)

    # 1. Ambient Sub Drone (45Hz + 90Hz) throughout
    drone = 0.15 * np.sin(2 * np.pi * 48 * t) + 0.08 * np.sin(2 * np.pi * 96 * t)
    # Slow swell
    drone_envelope = np.clip(t / 4.0, 0, 1)
    audio += drone * drone_envelope

    # 2. Metronomic Ticking / Clock Pulse (Act 1: 0 to 5s)
    for tick_time in np.arange(0.5, 5.0, 0.5):
        idx = int(tick_time * sr)
        tick_len = int(0.04 * sr)
        if idx + tick_len < len(audio):
            tt = np.linspace(0, 0.04, tick_len)
            tick_wave = 0.25 * np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 90)
            audio[idx:idx+tick_len] += tick_wave

    # 3. Riser Sweep (4.0s to 5.5s)
    riser_start, riser_end = int(4.0 * sr), int(5.5 * sr)
    r_len = riser_end - riser_start
    rt = np.linspace(0, 1.5, r_len)
    rfreq = np.linspace(150, 1200, r_len)
    phase = 2 * np.pi * np.cumsum(rfreq) / sr
    audio[riser_start:riser_end] += 0.3 * np.sin(phase) * (rt / 1.5)**2

    # 4. Big Impact / Drop at 5.5s (Transition to LOAM)
    drop_idx = int(5.5 * sr)
    impact_len = int(3.0 * sr)
    it = np.linspace(0, 3.0, impact_len)
    impact = 0.6 * np.sin(2 * np.pi * 55 * np.exp(-it * 2.5) * it) * np.exp(-it * 1.5)
    impact_crack = 0.2 * np.random.uniform(-1, 1, impact_len) * np.exp(-it * 12)
    audio[drop_idx:drop_idx+impact_len] += (impact + impact_crack)

    # 5. Driving Arp Synth & Bassline (5.5s to 30s)
    # 120 BPM: Beat = 0.5s, 16th note = 0.125s
    chords = [
        # (start_sec, end_sec, root_hz)
        (5.5, 11.5, 130.81),  # C3
        (11.5, 17.5, 146.83), # D3
        (17.5, 23.5, 164.81), # E3
        (23.5, 29.5, 174.61), # F3
    ]
    for c_start, c_end, root in chords:
        s_idx = int(c_start * sr)
        e_idx = int(c_end * sr)
        chord_t = t[s_idx:e_idx] - c_start
        # 16th note arpeggiation (root, 5th, octave, 10th)
        freqs = [root, root * 1.5, root * 2.0, root * 2.5]
        for note_idx, note_start in enumerate(np.arange(c_start, c_end, 0.125)):
            n_start = int(note_start * sr)
            n_len = int(0.12 * sr)
            if n_start + n_len < len(audio):
                nt = np.linspace(0, 0.12, n_len)
                target_f = freqs[note_idx % len(freqs)]
                # Warm sawtooth approximation
                saw = 0.15 * (np.sin(2*np.pi*target_f*nt) + 0.5*np.sin(4*np.pi*target_f*nt) + 0.25*np.sin(6*np.pi*target_f*nt))
                env = np.exp(-nt * 24)
                audio[n_start:n_start+n_len] += saw * env

        # Four on the floor kick drum
        for kick_start in np.arange(c_start, c_end, 0.5):
            k_start = int(kick_start * sr)
            k_len = int(0.25 * sr)
            if k_start + k_len < len(audio):
                kt = np.linspace(0, 0.25, k_len)
                k_freq = 140 * np.exp(-kt * 28) + 40
                kick_w = 0.45 * np.sin(2 * np.pi * k_freq * kt) * np.exp(-kt * 14)
                audio[k_start:k_start+k_len] += kick_w

        # Crisp hi-hat on offbeats
        for hat_start in np.arange(c_start + 0.25, c_end, 0.5):
            h_start = int(hat_start * sr)
            h_len = int(0.06 * sr)
            if h_start + h_len < len(audio):
                ht = np.linspace(0, 0.06, h_len)
                noise = np.random.uniform(-1, 1, h_len)
                audio[h_start:h_start+h_len] += 0.08 * noise * np.exp(-ht * 50)

    # 6. Climax Sound at 29.5s: LOAM signature Launch Surge
    climax_start = int(29.5 * sr)
    c_len = int(5.0 * sr)
    ct = np.linspace(0, 5.0, c_len)
    # 130 -> 260Hz sweep + 260 -> 520Hz shimmer
    c_root = 0.5 * np.sin(2 * np.pi * (130 + 130 * (ct / 2.0)) * ct) * np.exp(-ct * 0.8)
    c_harm = 0.25 * np.sin(2 * np.pi * (260 + 260 * (ct / 2.0)) * ct) * np.exp(-ct * 1.0)
    audio[climax_start:climax_start+c_len] += (c_root + c_harm)

    # Normalize audio
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = (audio / max_val * 0.92)

    # Convert to 16-bit PCM
    audio_int16 = (audio * 32767).astype(np.int16)
    wavfile.write(AUDIO_OUT, sr, audio_int16)
    print(f"Audio saved to: {AUDIO_OUT}")

# -------------------------------------------------------------------------
# VIDEO GENERATOR
# -------------------------------------------------------------------------
def render_all_frames():
    print(f"Rendering {TOTAL_FRAMES} frames ({DURATION_SEC}s @ {FPS}fps) to {VIDEO_OUT}...")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(VIDEO_OUT, fourcc, FPS, (WIDTH, HEIGHT))

    f_serif_xl = get_font("serif_bold", 84)
    f_serif_lg = get_font("serif_bold", 54)
    f_sans_xl = get_font("sans_bold", 64)
    f_sans_lg = get_font("sans_bold", 38)
    f_sans_md = get_font("sans_bold", 26)
    f_sans_sm = get_font("sans", 22)
    f_mono = get_font("mono", 22)
    f_mono_lg = get_font("mono", 32)

    for frame_idx in range(TOTAL_FRAMES):
        t_sec = frame_idx / FPS
        # Create base canvas (RGB)
        img = Image.new("RGB", (WIDTH, HEIGHT), C_DARK)
        draw = ImageDraw.Draw(img)

        # -----------------------------------------------------------------
        # SCENE 1: (0.0s - 5.5s) The Problem / Monolith Fatigue
        # -----------------------------------------------------------------
        if t_sec < 5.5:
            progress = t_sec / 5.5
            # Subtle moving grid lines
            grid_offset = int((t_sec * 20) % 60)
            for x in range(grid_offset, WIDTH, 60):
                draw.line([(x, 0), (x, HEIGHT)], fill=(28, 28, 25), width=1)
            for y in range(grid_offset, HEIGHT, 60):
                draw.line([(0, y), (WIDTH, y)], fill=(28, 28, 25), width=1)

            # Central typographic reveal
            alpha = min(1.0, t_sec / 1.0)
            draw.text((WIDTH//2, 280), "THE LAUNCHER LANDSCAPE HAS GROWN TIRED.", font=f_serif_lg, fill=C_CREAM, anchor="mm")
            draw.text((WIDTH//2, 350), "Bloatware. Chromium overhead. Sluggish startup. Relentless telemetry.", font=f_sans_sm, fill=C_MUTED, anchor="mm")

            # Strike-through pain points popping in sequence
            pain_points = [
                ("× 500 MB+ Memory Consumption at Idle", 1.2),
                ("× Invasive Background Telemetry & Profiling", 2.0),
                ("× Broken Java Runtimes & Cryptic Classpath Errors", 2.8),
                ("× Fragmented Mod Loaders & Fragile Installs", 3.6),
            ]
            for i, (text, trigger_t) in enumerate(pain_points):
                if t_sec >= trigger_t:
                    card_p = min(1.0, (t_sec - trigger_t) / 0.4)
                    card_y = int(440 + i * 85)
                    # Card box
                    draw.rounded_rectangle([WIDTH//2 - 380, card_y, WIDTH//2 + 380, card_y + 60], radius=8, fill=C_DARK_CARD, outline=(60, 30, 30), width=1)
                    draw.text((WIDTH//2, card_y + 30), text, font=f_sans_md, fill=(230, 90, 80), anchor="mm")

            # Final glitch flash into Act 2
            if t_sec >= 5.0:
                flash_p = (t_sec - 5.0) / 0.5
                flash_alpha = int(flash_p * 255)
                overlay = Image.new("RGBA", (WIDTH, HEIGHT), (255, 255, 255, flash_alpha))
                img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

        # -----------------------------------------------------------------
        # SCENE 2: (5.5s - 11.5s) Introducing LOAM — Pure Rust & Craft
        # -----------------------------------------------------------------
        elif t_sec < 11.5:
            scene_t = t_sec - 5.5
            p = scene_t / 6.0
            # Warm sand canvas
            img = Image.new("RGB", (WIDTH, HEIGHT), C_SAND)
            draw = ImageDraw.Draw(img)

            # Elegant architectural border
            draw.rectangle([60, 60, WIDTH-60, HEIGHT-60], outline=(215, 210, 200), width=2)
            draw.rectangle([64, 64, WIDTH-64, HEIGHT-64], outline=(225, 220, 210), width=1)

            # Title card
            title_p = min(1.0, scene_t / 0.8)
            scale = 0.95 + 0.05 * ease_out_back(title_p)

            # Draw prominent LOAM wordmark
            draw.text((WIDTH//2, 190), "L O A M", font=f_serif_xl, fill=C_DARK, anchor="mm")
            draw.text((WIDTH//2, 270), "ENGINEERED IN PURE RUST · SCANDINAVIAN CRAFT", font=f_sans_md, fill=C_TERRACOTTA, anchor="mm")
            draw.text((WIDTH//2, 315), "Lightweight. Offline-First. Zero Bloat.", font=f_sans_sm, fill=C_MUTED, anchor="mm")

            # Floating Center Hero: LOAM Installer / Launcher Card
            hero_scale = min(1.0, scene_t / 1.0)
            if img_installer:
                # Composite the installer skin with rounded drop shadow
                inst_w, inst_h = int(680 * hero_scale), int(480 * hero_scale)
                if inst_w > 10:
                    inst_resized = img_installer.resize((inst_w, inst_h), Image.Resampling.LANCZOS)
                    # Shadow
                    shadow = Image.new("RGBA", (inst_w + 30, inst_h + 30), (0, 0, 0, 40))
                    img.paste(shadow, (WIDTH//2 - inst_w//2 + 8, 380 + 12), shadow)
                    img.paste(inst_resized, (WIDTH//2 - inst_w//2, 380))

            # 3 Pillar Badges sliding in
            pillars = [
                ("⚡ Sub-5 MB Binary", "No Chromium bloat", 1.5),
                ("🛡️ Zero Telemetry", "100% Local privacy", 2.2),
                ("🚀 Instant 1.2s Launch", "Pure native Rust threads", 2.9),
            ]
            for i, (head, sub, trig) in enumerate(pillars):
                if scene_t >= trig:
                    bp = min(1.0, (scene_t - trig) / 0.5)
                    by = int(900 - 15 * (1 - ease_out_back(bp)))
                    bx = 240 + i * 490
                    draw.rounded_rectangle([bx, by, bx + 450, by + 90], radius=12, fill=C_CREAM, outline=C_TERRACOTTA, width=2)
                    draw.text((bx + 225, by + 32), head, font=f_sans_md, fill=C_DARK, anchor="mm")
                    draw.text((bx + 225, by + 65), sub, font=f_sans_sm, fill=C_MUTED, anchor="mm")

        # -----------------------------------------------------------------
        # SCENE 3: (11.5s - 17.5s) Sandboxed Java Runtimes & Dynamic Memory
        # -----------------------------------------------------------------
        elif t_sec < 17.5:
            scene_t = t_sec - 11.5
            img = Image.new("RGB", (WIDTH, HEIGHT), C_CREAM)
            draw = ImageDraw.Draw(img)

            # Top Header Bar
            draw.rectangle([0, 0, WIDTH, 120], fill=C_SAND)
            draw.line([(0, 120), (WIDTH, 120)], fill=(210, 205, 195), width=2)
            draw.text((120, 60), "ISOLATED RUNTIME ARCHITECTURE", font=f_serif_lg, fill=C_DARK, anchor="lm")
            draw.text((WIDTH - 120, 60), "LOAM MANAGED RUNTIMES", font=f_mono, fill=C_TERRACOTTA, anchor="rm")

            # Left Panel: Java Version Matrix
            draw.rounded_rectangle([120, 180, 780, 940], radius=16, fill=C_CARD_LIGHT, outline=(220, 215, 205), width=2)
            draw.text((160, 240), "SANDBOXED JDK ECOSYSTEM", font=f_sans_lg, fill=C_DARK, anchor="lm")
            draw.text((160, 280), "Auto-provisioned Adoptium Eclipse Temurin", font=f_sans_sm, fill=C_MUTED, anchor="lm")

            runtimes = [
                ("Java 25", "Bleeding-Edge Releases & Snapshots", "Sandboxed · Active"),
                ("Java 21", "Modern Minecraft 1.20.5+ · Fabric/Quilt", "Sandboxed · Verified"),
                ("Java 17", "Standard Minecraft 1.18 - 1.20.4", "Sandboxed · Ready"),
                ("Java 8",  "Legacy Minecraft 1.7 - 1.16.5", "Sandboxed · Archival"),
            ]
            for idx, (j_ver, j_desc, j_stat) in enumerate(runtimes):
                jy = 340 + idx * 135
                draw.rounded_rectangle([150, jy, 750, jy + 110], radius=10, fill=C_CREAM, outline=(210, 205, 195), width=1)
                # Green indicator
                draw.ellipse([180, jy + 35, 196, jy + 51], fill=C_GREEN)
                draw.text((220, jy + 42), j_ver, font=f_sans_md, fill=C_DARK, anchor="lm")
                draw.text((220, jy + 75), j_desc, font=f_sans_sm, fill=C_MUTED, anchor="lm")
                draw.text((720, jy + 42), j_stat, font=f_mono, fill=C_TERRACOTTA, anchor="rm")

            # Right Panel: Live Memory Slider Simulation
            draw.rounded_rectangle([840, 180, 1800, 940], radius=16, fill=C_CARD_LIGHT, outline=(220, 215, 205), width=2)
            draw.text((880, 240), "TACTILE MEMORY CONTROLLER", font=f_sans_lg, fill=C_DARK, anchor="lm")
            draw.text((880, 280), "Zero-stutter G1GC garbage collection tuning", font=f_sans_sm, fill=C_MUTED, anchor="lm")

            # Animated slider progress
            slider_p = ease_in_out(min(1.0, scene_t / 4.0))
            mem_mb = int(2048 + (6144 - 2048) * slider_p)

            # Big readout
            draw.text((1320, 420), f"{mem_mb} MB", font=f_serif_xl, fill=C_TERRACOTTA, anchor="mm")
            draw.text((1320, 490), f"({mem_mb/1024:.1f} GB Dedicated RAM)", font=f_sans_md, fill=C_MUTED, anchor="mm")

            # Slider Track
            track_x1, track_x2 = 940, 1700
            track_y = 570
            draw.rounded_rectangle([track_x1, track_y, track_x2, track_y + 18], radius=9, fill=(220, 215, 205))
            # Filled portion
            fill_x = int(track_x1 + (track_x2 - track_x1) * slider_p)
            draw.rounded_rectangle([track_x1, track_y, fill_x, track_y + 18], radius=9, fill=C_TERRACOTTA)
            # Thumb handle
            draw.ellipse([fill_x - 22, track_y - 13, fill_x + 22, track_y + 31], fill=C_CREAM, outline=C_DARK, width=3)

            # Feature callouts below slider
            specs = [
                "✔ Zero System PATH Pollution",
                "✔ Automatic Intermediary Mappings",
                "✔ Dynamic Heap Bounds (-Xms / -Xmx)",
                "✔ Self-Healing Incomplete Cache Checksums"
            ]
            for si, spec in enumerate(specs):
                draw.text((940 + (si % 2) * 400, 680 + (si // 2) * 80), spec, font=f_sans_md, fill=C_DARK)

        # -----------------------------------------------------------------
        # SCENE 4: (17.5s - 23.5s) Native Fabric & Quilt Ecosystem
        # -----------------------------------------------------------------
        elif t_sec < 23.5:
            scene_t = t_sec - 17.5
            img = Image.new("RGB", (WIDTH, HEIGHT), C_SAND)
            draw = ImageDraw.Draw(img)

            # Title
            draw.text((WIDTH//2, 140), "NATIVE MOD LOADER ORCHESTRATION", font=f_serif_lg, fill=C_DARK, anchor="mm")
            draw.text((WIDTH//2, 210), "Official Fabric & Quilt Meta API · Direct Maven Resolution", font=f_sans_md, fill=C_TERRACOTTA, anchor="mm")

            # Two Major Loader Cards
            # Left: Fabric Card
            draw.rounded_rectangle([180, 280, 920, 780], radius=16, fill=C_CREAM, outline=C_TERRACOTTA, width=2)
            draw.text((550, 360), "FABRIC LOADER", font=f_sans_xl, fill=C_DARK, anchor="mm")
            draw.text((550, 420), "0.19.5 · Intermediary Mappings Ready", font=f_mono, fill=C_MUTED, anchor="mm")

            fabric_features = [
                "• Full Vanilla Snapshot & Release Support",
                "• Automatic Upstream Dependency Resolver",
                "• Fast Sub-Second Classpath Construction",
                "• Verified Maven Artifact Checksums"
            ]
            for fi, feat in enumerate(fabric_features):
                draw.text((240, 490 + fi * 60), feat, font=f_sans_md, fill=C_DARK)

            # Right: Quilt Card
            draw.rounded_rectangle([1000, 280, 1740, 780], radius=16, fill=C_CREAM, outline=C_TERRACOTTA, width=2)
            draw.text((1370, 360), "QUILT LOADER", font=f_sans_xl, fill=C_DARK, anchor="mm")
            draw.text((1370, 420), "Next-Gen Modding Ecosystem", font=f_mono, fill=C_MUTED, anchor="mm")

            quilt_features = [
                "• Native Quilt Standard Libraries (QSL)",
                "• Built-In Fabric Subsystem Compatibility",
                "• Zero Manual Configuration Needed",
                "• One-Click Install & Instant Boot"
            ]
            for qi, qfeat in enumerate(quilt_features):
                draw.text((1060, 490 + qi * 60), qfeat, font=f_sans_md, fill=C_DARK)

            # Banner at bottom
            draw.rounded_rectangle([180, 830, 1740, 940], radius=12, fill=C_DARK)
            draw.text((WIDTH//2, 885), "✦ DYNAMIC MULTI-ERA PACK.MCMETA GENERATOR (FORMAT 1 TO 65+) ✦", font=f_mono_lg, fill=C_CREAM, anchor="mm")

        # -----------------------------------------------------------------
        # SCENE 5: (23.5s - 29.5s) Native Windows Performance Engine
        # -----------------------------------------------------------------
        elif t_sec < 29.5:
            scene_t = t_sec - 23.5
            # Dark Mode Cinematic Engine
            img = Image.new("RGB", (WIDTH, HEIGHT), C_DARK)
            draw = ImageDraw.Draw(img)

            # High-tech HUD background lines
            for i in range(10):
                y_pos = 100 + i * 90
                draw.line([(80, y_pos), (WIDTH-80, y_pos)], fill=(32, 32, 28), width=1)

            draw.text((WIDTH//2, 150), "WINDOWS PERFORMANCE ENGINE", font=f_serif_xl, fill=C_CREAM, anchor="mm")
            draw.text((WIDTH//2, 230), "Direct Win32 API Hardware Thread Scheduling", font=f_mono_lg, fill=C_TERRACOTTA, anchor="mm")

            # 3 High-Tech Metric Gauges
            gauges = [
                ("HIGH_PRIORITY_CLASS", "PROCESS SCHEDULING", "Prevents background process interference & frame drops"),
                ("PERFORMANCE CORES", "THREAD AFFINITY", "Directly binds Minecraft render threads to P-Cores"),
                ("12 MB IDLE RAM", "MEMORY TRIM", "Launcher background footprint minimized during gameplay"),
            ]
            for gi, (title, label, desc) in enumerate(gauges):
                gx = 160 + gi * 550
                gy = 340
                draw.rounded_rectangle([gx, gy, gx + 500, gy + 320], radius=14, fill=C_DARK_CARD, outline=C_TERRACOTTA, width=2)
                draw.text((gx + 250, gy + 50), label, font=f_mono, fill=C_MUTED, anchor="mm")
                draw.text((gx + 250, gy + 130), title, font=f_sans_lg, fill=C_TERRACOTTA_LIGHT, anchor="mm")
                draw.text((gx + 250, gy + 220), desc, font=f_sans_sm, fill=C_CREAM, anchor="mm")

            # Diagnostic summary card
            draw.rounded_rectangle([160, 720, WIDTH-160, 920], radius=14, fill=(28, 28, 25), outline=(70, 70, 60), width=1)
            draw.text((WIDTH//2, 780), "LOAM DOCTOR · AUTOMATED CRASH TRIAGE", font=f_sans_lg, fill=C_CREAM, anchor="mm")
            draw.text((WIDTH//2, 850), "Self-contained diagnostics ZIP bundling · Instant resolution without telemetry", font=f_mono, fill=C_GREEN, anchor="mm")

        # -----------------------------------------------------------------
        # SCENE 6: (29.5s - 35.0s) The Climax / Tactile Launch & Outro
        # -----------------------------------------------------------------
        else:
            scene_t = t_sec - 29.5
            # Expanding shockwave from center
            img = Image.new("RGB", (WIDTH, HEIGHT), C_SAND)
            draw = ImageDraw.Draw(img)

            # Kinetic ripples
            ripple_radius = int(scene_t * 600)
            if ripple_radius < 1400:
                draw.ellipse([WIDTH//2 - ripple_radius, HEIGHT//2 - ripple_radius,
                              WIDTH//2 + ripple_radius, HEIGHT//2 + ripple_radius], outline=(225, 120, 95), width=3)

            # Central Hero Branding
            if img_icon:
                icon_sz = 160
                icon_res = img_icon.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS)
                img.paste(icon_res, (WIDTH//2 - icon_sz//2, 220), icon_res)

            draw.text((WIDTH//2, 450), "L O A M", font=f_serif_xl, fill=C_DARK, anchor="mm")
            draw.text((WIDTH//2, 530), "SOVEREIGN MINECRAFT. AS IT WAS MEANT TO BE.", font=f_sans_lg, fill=C_TERRACOTTA, anchor="mm")

            # Final Action Button
            btn_w, btn_h = 420, 90
            bx, by = WIDTH//2 - btn_w//2, 620
            draw.rounded_rectangle([bx, by, bx + btn_w, by + btn_h], radius=16, fill=C_TERRACOTTA)
            draw.text((WIDTH//2, by + btn_h//2), "▶  PLAY NOW", font=f_sans_xl, fill=C_CREAM, anchor="mm")

            # Outro specs & tag
            draw.text((WIDTH//2, 790), "Sub-5 MB · Zero Telemetry · Offline-First · Open Source", font=f_mono_lg, fill=C_DARK, anchor="mm")
            draw.text((WIDTH//2, 860), "Windows 11 / 10 · High Performance Core", font=f_sans_md, fill=C_MUTED, anchor="mm")

            # Fade to black in final 1.0s
            if scene_t >= 4.0:
                fade_alpha = int(((scene_t - 4.0) / 1.0) * 255)
                overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, fade_alpha))
                img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

        # Write frame to video (convert RGB PIL Image to BGR OpenCV Mat)
        frame_bgr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        out.write(frame_bgr)

        if (frame_idx + 1) % 150 == 0:
            print(f"Rendered {frame_idx + 1}/{TOTAL_FRAMES} frames ({(frame_idx+1)/FPS:.1f}s)...")

    out.release()
    print(f"Video render complete! Saved to {VIDEO_OUT}")

if __name__ == "__main__":
    generate_cinematic_audio()
    render_all_frames()
