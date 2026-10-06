import os

# Base paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOWCASE_DIR = os.path.abspath(os.path.dirname(__file__))
ASSETS_DIR = os.path.join(SHOWCASE_DIR, "assets")
EXPORTS_DIR = os.path.join(SHOWCASE_DIR, "exports")
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")

os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)
os.makedirs(DIST_DIR, exist_ok=True)

# Technical specifications
FPS = 60
DURATION_SEC = 36.0
TOTAL_FRAMES = int(FPS * DURATION_SEC)  # 2160 frames
SAMPLE_RATE = 48000                     # 48 kHz stereo

WIDTH_1080P = 1920
HEIGHT_1080P = 1080

WIDTH_4K = 3840
HEIGHT_4K = 2160

# Shot boundaries: [start_frame, end_frame)
SHOTS = {
    1: {"name": "THE SIGNAL",                "range": (0, 180),    "time": (0.0, 3.0)},
    2: {"name": "THE PROMISE",               "range": (180, 420),  "time": (3.0, 7.0)},
    3: {"name": "THE HOME SCREEN",           "range": (420, 720),  "time": (7.0, 12.0)},
    4: {"name": "YOUR SETUPS",               "range": (720, 1020), "time": (12.0, 17.0)},
    5: {"name": "THE SIGNATURE INTERACTION", "range": (1020, 1320),"time": (17.0, 22.0)},
    6: {"name": "QUIET CONTROL",             "range": (1320, 1560),"time": (22.0, 26.0)},
    7: {"name": "THE PAYOFF",                "range": (1560, 1860),"time": (26.0, 31.0)},
    8: {"name": "THE BRAND HOLD",            "range": (1860, 2160),"time": (31.0, 36.0)},
}

# Verified Visual Identity Palette (Warm Scandinavian Editorial)
C_IVORY = (244, 243, 238)           # #F4F3EE Dominant background
C_WHITE = (255, 255, 255)           # #FFFFFF Window & card surfaces
C_TERRACOTTA = (193, 95, 60)        # #C15F3C Primary action & brand accent
C_TERRACOTTA_LIGHT = (212, 114, 79) # #D4724F Hover state / highlights
C_TERRACOTTA_DEEP = (166, 75, 42)   # #A64B2A Active click
C_TAUPE = (177, 173, 161)           # #B1ADA1 Fine borders, quiet rules
C_TAUPE_LIGHT = (226, 223, 215)     # #E2DFD7 Subtle container borders
C_INK = (23, 23, 21)                # #171715 Primary text
C_INK_MUTED = (98, 95, 88)          # #625F58 Supporting editorial text
C_INK_FAINT = (150, 147, 139)       # #96938B Sub-captions, version numbers
C_GREEN = (46, 125, 50)             # Status indicator green
C_SHADOW = (18, 18, 16, 28)         # Subtle layer drop shadow

# Editorial copy constants
COPY_SHOT1_SUB = "Minecraft Java launcher"
COPY_SHOT2_HEAD = "Your worlds,\nready."
COPY_SHOT3_HEAD = "A clear way to play."
COPY_SHOT4_HEAD = "A place for every setup."
COPY_SHOT5_HEAD = "Drop it in.\nMake it yours."
COPY_SHOT6_HEAD = "Set it your way."
COPY_SHOT7_HEAD = "Ready when you are."
COPY_SHOT8_TAGLINE = "Your worlds, ready."
COPY_SHOT8_PLATFORM = "For Windows  •  v1.5.0"

# Output files
FILE_AUDIO_WAV = os.path.join(EXPORTS_DIR, "LOAM_Showcase_36s_Audio.wav")
FILE_VIDEO_1080P = os.path.join(EXPORTS_DIR, "LOAM_Showcase_36s_1080p.mp4")
FILE_VIDEO_4K = os.path.join(EXPORTS_DIR, "LOAM_Showcase_36s_4K.mp4")
FILE_COVER_PNG = os.path.join(EXPORTS_DIR, "LOAM_Showcase_Cover.png")

# Verified assets
ASSET_ICON = os.path.join(ASSETS_DIR, "brand_icon.png")
ASSET_WORDMARK = os.path.join(ASSETS_DIR, "brand_wordmark.png")
ASSET_SCREEN_HOME = os.path.join(ASSETS_DIR, "screen_home.png")
ASSET_SCREEN_STUDIO = os.path.join(ASSETS_DIR, "screen_studio.png")
ASSET_SCREEN_SETTINGS = os.path.join(ASSETS_DIR, "screen_settings.png")
ASSET_SCREEN_MINECRAFT = os.path.join(ASSETS_DIR, "screen_minecraft.png")
ASSET_SCREEN_ACCOUNTS = os.path.join(ASSETS_DIR, "screen_accounts.png")
ASSET_SCREEN_FIRST_RUN = os.path.join(ASSETS_DIR, "screen_first_run.png")
