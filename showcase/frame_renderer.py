import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

from showcase.config import (
    WIDTH_1080P,
    HEIGHT_1080P,
    FPS,
    DURATION_SEC,
    TOTAL_FRAMES,
    SHOTS,
    C_IVORY,
    C_WHITE,
    C_TERRACOTTA,
    C_TERRACOTTA_LIGHT,
    C_TERRACOTTA_DEEP,
    C_TAUPE,
    C_TAUPE_LIGHT,
    C_INK,
    C_INK_MUTED,
    C_INK_FAINT,
    C_GREEN,
    ASSET_ICON,
    ASSET_WORDMARK,
    COPY_SHOT1_SUB,
    COPY_SHOT2_HEAD,
    COPY_SHOT3_HEAD,
    COPY_SHOT4_HEAD,
    COPY_SHOT5_HEAD,
    COPY_SHOT6_HEAD,
    COPY_SHOT7_HEAD,
    COPY_SHOT8_TAGLINE,
    COPY_SHOT8_PLATFORM
)

# -------------------------------------------------------------------------
# REALTIME ASSET PATHS (High-Res 4K Browser Captures)
# -------------------------------------------------------------------------
ASSET_HOME_REALTIME = os.path.join(os.path.dirname(__file__), "assets", "screen_home_realtime.png")
ASSET_SETTINGS_REALTIME = os.path.join(os.path.dirname(__file__), "assets", "screen_settings_realtime.png")
ASSET_STUDIO_REALTIME = os.path.join(os.path.dirname(__file__), "assets", "screen_studio_realtime.png")
ASSET_DEV_REALTIME = os.path.join(os.path.dirname(__file__), "assets", "screen_dev_realtime.png")
ASSET_MINECRAFT_REAL = os.path.join(os.path.dirname(__file__), "assets", "screen_minecraft.png")

# -------------------------------------------------------------------------
# EASING CURVES (Cubic Bezier & Smooth Transitions)
# -------------------------------------------------------------------------
def make_cubic_bezier(x1, y1, x2, y2):
    """Exact cubic-bezier curve evaluator via Newton-Raphson."""
    def bezier(t):
        if t <= 0.0: return 0.0
        if t >= 1.0: return 1.0
        s = t
        for _ in range(8):
            x_cur = 3 * (1 - s)**2 * s * x1 + 3 * (1 - s) * s**2 * x2 + s**3
            dx_ds = 3 * (1 - s)**2 * x1 + 6 * (1 - s) * s * (x2 - x1) + 3 * s**2 * (1 - x2)
            if abs(dx_ds) < 1e-6:
                break
            s -= (x_cur - t) / dx_ds
            s = max(0.0, min(1.0, s))
        return 3 * (1 - s)**2 * s * y1 + 3 * (1 - s) * s**2 * y2 + s**3
    return bezier

ease_cinematic = make_cubic_bezier(0.22, 1.0, 0.36, 1.0)
ease_elastic_out = make_cubic_bezier(0.175, 0.885, 0.32, 1.275)

def clamp(v, min_v=0.0, max_v=1.0):
    return max(min_v, min(max_v, v))

# -------------------------------------------------------------------------
# FONT & ASSET MANAGER
# -------------------------------------------------------------------------
_font_cache = {}

def get_font(family, size):
    key = (family, size)
    if key in _font_cache:
        return _font_cache[key]
    
    font_paths = {
        "variable":   r"C:\Windows\Fonts\SegUIVar.ttf",
        "sans_bold":  r"C:\Windows\Fonts\segoeuib.ttf",
        "sans":       r"C:\Windows\Fonts\segoeui.ttf",
        "serif_bold": r"C:\Windows\Fonts\georgiab.ttf",
        "serif":      r"C:\Windows\Fonts\georgia.ttf",
        "mono":       r"C:\Windows\Fonts\consola.ttf",
        "geometric":  r"C:\Windows\Fonts\Bahnschrift.ttf"
    }
    path = font_paths.get(family, r"C:\Windows\Fonts\segoeui.ttf")
    try:
        font = ImageFont.truetype(path, size)
    except Exception:
        try:
            font = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", size)
        except Exception:
            font = ImageFont.load_default()
    _font_cache[key] = font
    return font

def load_rgba(path):
    if os.path.exists(path):
        try:
            return Image.open(path).convert("RGBA")
        except Exception as e:
            print(f"Warning: Failed to load {path}: {e}")
    return Image.new("RGBA", (100, 100), (200, 200, 200, 255))

# Pre-load verified assets
RAW_WORDMARK = load_rgba(ASSET_WORDMARK)
RAW_HOME_REALTIME = load_rgba(ASSET_HOME_REALTIME)
RAW_SETTINGS_REALTIME = load_rgba(ASSET_SETTINGS_REALTIME)
RAW_STUDIO_REALTIME = load_rgba(ASSET_STUDIO_REALTIME)
RAW_DEV_REALTIME = load_rgba(ASSET_DEV_REALTIME)
RAW_MINECRAFT = load_rgba(ASSET_MINECRAFT_REAL)

# Crop tight bounding box for Wordmark
wm_bbox = RAW_WORDMARK.getbbox()
if wm_bbox:
    CROP_WORDMARK_INK = RAW_WORDMARK.crop(wm_bbox)
else:
    CROP_WORDMARK_INK = RAW_WORDMARK

# Create ivory version of Wordmark for Shot 8
arr_wm = np.array(CROP_WORDMARK_INK)
is_terracotta = (arr_wm[:, :, 0] > 140) & (arr_wm[:, :, 1] < 120) & (arr_wm[:, :, 3] > 100)
is_letter = (arr_wm[:, :, 3] > 50) & ~is_terracotta

arr_wm_ivory = arr_wm.copy()
arr_wm_ivory[is_letter, 0] = 244
arr_wm_ivory[is_letter, 1] = 243
arr_wm_ivory[is_letter, 2] = 238
arr_wm_ivory[is_terracotta, 0] = 255
arr_wm_ivory[is_terracotta, 1] = 255
arr_wm_ivory[is_terracotta, 2] = 255
CROP_WORDMARK_IVORY = Image.fromarray(arr_wm_ivory, "RGBA")

def paste_with_alpha(target_img, overlay_rgba, pos, opacity=1.0):
    """Pastes an RGBA image onto target_img taking into account both overlay's alpha and extra opacity."""
    if opacity <= 0.001:
        return
    r, g, b, a = overlay_rgba.split()
    if opacity < 0.999:
        a = a.point(lambda p: int(p * opacity))
    target_img.paste(overlay_rgba, pos, mask=a)

# Pre-render Cursor Sprite
def build_cursor():
    cur = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    d = ImageDraw.Draw(cur)
    poly_outer = [(2, 2), (2, 26), (8, 20), (13, 30), (18, 28), (13, 18), (22, 18)]
    d.polygon(poly_outer, fill=(255, 255, 255, 255))
    poly_inner = [(4, 5), (4, 23), (9, 19), (13, 27), (16, 26), (12, 17), (19, 17)]
    d.polygon(poly_inner, fill=(23, 23, 21, 255))
    return cur

CURSOR_SPRITE = build_cursor()

# -------------------------------------------------------------------------
# GRAPHIC PRIMITIVES & WINDOW FRAMING (Dual-Layer Ambient Shadows)
# -------------------------------------------------------------------------
def create_window_card(content_image, width, height, radius=12, border_color=C_TAUPE_LIGHT):
    """
    Wraps an application screenshot in a desktop window card with dual-layer soft shadow
    and rounded corners.
    """
    resized = content_image.resize((width, height), Image.Resampling.LANCZOS)
    
    mask = Image.new("L", (width, height), 0)
    d_mask = ImageDraw.Draw(mask)
    d_mask.rounded_rectangle([(0, 0), (width - 1, height - 1)], radius=radius, fill=255)
    
    card = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    card.paste(resized, (0, 0), mask=mask)
    
    d_card = ImageDraw.Draw(card)
    d_card.rounded_rectangle([(0, 0), (width - 1, height - 1)], radius=radius, outline=border_color, width=1)
    
    # Soft dual-layer drop shadow container
    pad = 32
    shadow_w = width + pad * 2
    shadow_h = height + pad * 2
    shadow_img = Image.new("RGBA", (shadow_w, shadow_h), (0, 0, 0, 0))
    d_sh = ImageDraw.Draw(shadow_img)
    # Layer 1: Ambient soft shadow
    d_sh.rounded_rectangle([(pad - 4, pad + 10), (pad + width + 4, pad + height + 16)], radius=radius + 6, fill=(18, 18, 16, 24))
    # Layer 2: Directional contact shadow
    d_sh.rounded_rectangle([(pad - 1, pad + 4), (pad + width + 1, pad + height + 8)], radius=radius + 2, fill=(18, 18, 16, 32))
    shadow_blurred = shadow_img.filter(ImageFilter.GaussianBlur(14))
    
    shadow_blurred.paste(card, (pad, pad), mask=card)
    return shadow_blurred, pad

# Pre-render standard window cards using REALTIME 4K captures
CARD_HOME_SHOT2, PAD_SHOT2 = create_window_card(RAW_HOME_REALTIME, 940, 528)
CARD_HOME_SHOT3, PAD_SHOT3 = create_window_card(RAW_HOME_REALTIME, 1380, 776)
CARD_STUDIO_SHOT5, PAD_SHOT5 = create_window_card(RAW_STUDIO_REALTIME, 1120, 630)
CARD_SETTINGS_SHOT6, PAD_SHOT6 = create_window_card(RAW_SETTINGS_REALTIME, 1200, 675)
CARD_MINECRAFT_SHOT7, PAD_SHOT7 = create_window_card(RAW_MINECRAFT, 1280, 775)

# -------------------------------------------------------------------------
# SHOT RENDERERS
# -------------------------------------------------------------------------

def render_shot_1(frame_idx):
    """
    SHOT 1 — THE SIGNAL (Frames 0–180, 00:00–00:03)
    Visual: Full ivory canvas, terracotta square motif, fine horizontal rule,
            LOAM wordmark reveal through clean mask, supporting text: 'Minecraft Java launcher'.
    """
    f = frame_idx  # 0 to 179
    base = Image.new("RGB", (WIDTH_1080P, HEIGHT_1080P), C_IVORY)
    draw = ImageDraw.Draw(base)
    
    # Subtle continuous camera breathing (1.000 to 1.015x)
    t_breath = f / 180.0
    
    t_open = clamp((f - 18) / 45.0)
    t_mark = ease_cinematic(t_open)
    
    t_text = clamp((f - 52) / 50.0)
    t_text_ease = ease_cinematic(t_text)
    
    center_x = WIDTH_1080P // 2
    rule_y = int(530 + t_breath * 4)
    
    # Fine horizontal rule (width expands from center)
    max_half_width = 320
    curr_half_width = int(max_half_width * t_mark)
    if curr_half_width > 0:
        draw.line(
            [(center_x - curr_half_width, rule_y), (center_x + curr_half_width, rule_y)],
            fill=C_TAUPE,
            width=1
        )
        
    # Terracotta square motif (22x22 px) above the rule
    sq_size = 22
    sq_y_final = rule_y - 145
    sq_y = sq_y_final + int((1.0 - t_mark) * 25)
    sq_alpha = int(255 * t_mark)
    if sq_alpha > 0:
        draw.rounded_rectangle([(center_x - sq_size // 2, sq_y), (center_x + sq_size // 2, sq_y + sq_size)], radius=3, fill=C_TERRACOTTA)
        
    # LOAM Wordmark reveal
    if t_text > 0:
        wm_h = 82
        wm_w = int(CROP_WORDMARK_INK.width * (wm_h / CROP_WORDMARK_INK.height))
        wm_resized = CROP_WORDMARK_INK.resize((wm_w, wm_h), Image.Resampling.LANCZOS)
        
        wm_target_y = rule_y - 100
        wm_offset_y = int((1.0 - t_text_ease) * 25)
        wm_draw_y = wm_target_y + wm_offset_y
        wm_x = center_x - wm_w // 2
        
        paste_with_alpha(base, wm_resized, (wm_x, wm_draw_y), opacity=t_text_ease)
        
        # Supporting text: "MINECRAFT JAVA LAUNCHER" in Segoe UI Variable
        font_sub = get_font("variable", 16)
        text_sub = COPY_SHOT1_SUB.upper()
        spaced_text = "  ".join(list(text_sub))
        sub_y = rule_y + 38 + int((1.0 - t_text_ease) * 12)
        bbox = draw.textbbox((0, 0), spaced_text, font=font_sub)
        sub_x = center_x - (bbox[2] - bbox[0]) // 2
        
        alpha_color = tuple(int(C_INK_MUTED[i] * t_text_ease + C_IVORY[i] * (1.0 - t_text_ease)) for i in range(3))
        draw.text((sub_x, sub_y), spaced_text, fill=alpha_color, font=font_sub)
        
    return base

def render_shot_2(frame_idx):
    """
    SHOT 2 — THE PROMISE (Frames 180–420, 00:03–00:07)
    Copy: 'Your worlds,\nready.'
    Visual: Oversized left-aligned typography. Real Home screen enters from right.
    """
    f = frame_idx - 180  # 0 to 239
    base = Image.new("RGB", (WIDTH_1080P, HEIGHT_1080P), C_IVORY)
    draw = ImageDraw.Draw(base)
    
    t_enter = ease_cinematic(clamp(f / 52.0))
    t_drift = f / 240.0 * 8
    
    left_x = 135
    head_y_target = 380
    head_y = head_y_target + int((1.0 - t_enter) * 35) - int(t_drift * 0.5)
    
    draw.text((left_x, head_y - 68), "LOAM LAUNCHER", fill=C_TERRACOTTA, font=get_font("sans_bold", 15))
    draw.line([(left_x, head_y - 48), (left_x + 36, head_y - 48)], fill=C_TERRACOTTA, width=2)
    
    font_head = get_font("serif_bold", 74)
    draw.text((left_x, head_y), "Your worlds,", fill=C_INK, font=font_head)
    draw.text((left_x, head_y + 88), "ready.", fill=C_INK, font=font_head)
    
    font_sub = get_font("variable", 20)
    sub_desc = "A calmer, beautifully organized way\nto launch and configure Minecraft."
    draw.text((left_x, head_y + 200), sub_desc, fill=C_INK_MUTED, font=font_sub, spacing=8)
    
    # Realtime App Window preview sliding in from the right
    win_x_final = 825
    win_x = win_x_final + int((1.0 - t_enter) * 480) - int(t_drift)
    win_y = 260 - PAD_SHOT2
    
    base.paste(CARD_HOME_SHOT2, (win_x, win_y), mask=CARD_HOME_SHOT2)
    return base

def render_shot_3(frame_idx):
    """
    SHOT 3 — THE HOME SCREEN (Frames 420–720, 00:07–00:12)
    Copy: 'A clear way to play.'
    Visual: Home screen primary subject. Cursor moves deliberately to select setup,
            settles and hovers Play button.
    """
    f = frame_idx - 420  # 0 to 299
    base = Image.new("RGB", (WIDTH_1080P, HEIGHT_1080P), C_IVORY)
    draw = ImageDraw.Draw(base)
    
    t_fade = ease_cinematic(clamp(f / 35.0))
    t_push = f / 300.0 * 10
    head_y = 55 + int((1.0 - t_fade) * 15)
    draw.text((135, head_y), COPY_SHOT3_HEAD, fill=C_INK, font=get_font("serif_bold", 40))
    draw.text((135, head_y + 50), "Instant profile switching  •  No PATH pollution  •  Adoptium Temurin Runtime", fill=C_INK_MUTED, font=get_font("variable", 16))
    
    # Centered Home Screen Window (Realtime Capture)
    win_x = (WIDTH_1080P - (CARD_HOME_SHOT3.width - PAD_SHOT3 * 2)) // 2 - PAD_SHOT3
    win_y = 150 - PAD_SHOT3 - int(t_push * 0.4)
    base.paste(CARD_HOME_SHOT3, (win_x, win_y), mask=CARD_HOME_SHOT3)
    
    # Cursor choreography:
    # Frame 0-90: cursor enters smoothly towards setup selection card
    # Frame 90 (8.5s): clicks on Fabric 1.21.4 setup
    # Frame 90-180: moves to hover Play button
    # Frame 180-300: calm hold
    cur_x = 1500
    cur_y = 850
    click_pulse = 0.0
    
    # Instance button position in realtime home screen is at x=880, y=275
    target_instance = (880, 260)
    target_play = (1120, 725)
    
    if f < 90:
        t_c = ease_cinematic(clamp(f / 80.0))
        cur_x = int(1400 * (1 - t_c) + target_instance[0] * t_c)
        cur_y = int(600 * (1 - t_c) + target_instance[1] * t_c)
    elif f < 180:
        t_c = ease_cinematic(clamp((f - 90) / 75.0))
        cur_x = int(target_instance[0] * (1 - t_c) + target_play[0] * t_c)
        cur_y = int(target_instance[1] * (1 - t_c) + target_play[1] * t_c)
        if 90 <= f <= 118:
            click_pulse = math.sin((f - 90) / 28.0 * math.pi)
    else:
        cur_x = target_play[0]
        cur_y = target_play[1]
        
    if click_pulse > 0:
        r = int(14 + 20 * click_pulse)
        alpha = int(160 * (1.0 - click_pulse))
        pulse_overlay = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
        d_p = ImageDraw.Draw(pulse_overlay)
        d_p.ellipse([(1, 1), (r * 2 - 2, r * 2 - 2)], outline=(*C_TERRACOTTA, alpha), width=2)
        base.paste(pulse_overlay, (target_instance[0] - r, target_instance[1] - r), mask=pulse_overlay)
        
    base.paste(CURSOR_SPRITE, (cur_x, cur_y), mask=CURSOR_SPRITE)
    return base

def render_shot_4(frame_idx):
    """
    SHOT 4 — YOUR SETUPS (Frames 720–1020, 00:12–00:17)
    Copy: 'A place for every setup.'
    Visual: 3 authentic prepared configurations in an editorial grid.
    """
    f = frame_idx - 720  # 0 to 299
    base = Image.new("RGB", (WIDTH_1080P, HEIGHT_1080P), C_IVORY)
    draw = ImageDraw.Draw(base)
    
    t_enter = ease_cinematic(clamp(f / 42.0))
    t_drift = f / 300.0 * 6
    
    draw.text((135, 65), COPY_SHOT4_HEAD, fill=C_INK, font=get_font("serif_bold", 42))
    draw.text((135, 122), "Isolated instances  •  Per-profile Java overrides  •  Integrity verified", fill=C_INK_MUTED, font=get_font("variable", 17))
    
    card_w = 510
    card_h = 585
    card_y = 195 - int(t_drift * 0.5)
    spacing = 35
    start_x = 135
    
    setups = [
        {
            "name": "Fabric 1.21.4",
            "desc": "Primary Performance Setup",
            "badge": "ACTIVE PROFILE",
            "is_active": True,
            "loader": "Fabric Loader 0.16.9",
            "mc_ver": "1.21.4 (Latest Release)",
            "java": "Adoptium Temurin 21.0.5",
            "ram": "6,144 MB (Allocated)",
            "flags": "G1GC Optimized Presets",
            "status": "Verified & Ready"
        },
        {
            "name": "Vanilla 1.20.4",
            "desc": "Clean Mojang Environment",
            "badge": "STANDALONE",
            "is_active": False,
            "loader": "Official Mojang Vanilla",
            "mc_ver": "1.20.4",
            "java": "Adoptium Temurin 17.0.12",
            "ram": "4,096 MB (Default)",
            "flags": "Standard GC",
            "status": "Integrity Checked"
        },
        {
            "name": "Quilt 1.21.1",
            "desc": "Experimental Modded Sandbox",
            "badge": "MODPACK",
            "is_active": False,
            "loader": "Quilt Loader 0.26.1",
            "mc_ver": "1.21.1",
            "java": "Adoptium Temurin 21.0.5",
            "ram": "4,096 MB",
            "flags": "Aikar Tuning Flags",
            "status": "Ready to Launch"
        }
    ]
    
    for i, s in enumerate(setups):
        t_card = ease_cinematic(clamp((f - i * 12) / 45.0))
        cx = start_x + i * (card_w + spacing)
        cy = card_y + int((1.0 - t_card) * 35)
        
        border_col = C_TERRACOTTA if s["is_active"] else C_TAUPE_LIGHT
        border_w = 2 if s["is_active"] else 1
        
        draw.rounded_rectangle([(cx, cy), (cx + card_w, cy + card_h)], radius=12, fill=C_WHITE, outline=border_col, width=border_w)
        
        badge_fill = C_TERRACOTTA if s["is_active"] else C_TAUPE_LIGHT
        badge_text_col = C_WHITE if s["is_active"] else C_INK_MUTED
        draw.rounded_rectangle([(cx + 28, cy + 28), (cx + 175, cy + 56)], radius=6, fill=badge_fill)
        draw.text((cx + 38, cy + 34), s["badge"], fill=badge_text_col, font=get_font("sans_bold", 12))
        
        draw.text((cx + 28, cy + 74), s["name"], fill=C_INK, font=get_font("serif_bold", 28))
        draw.text((cx + 28, cy + 112), s["desc"], fill=C_INK_MUTED, font=get_font("variable", 15))
        
        draw.line([(cx + 28, cy + 144), (cx + card_w - 28, cy + 144)], fill=C_TAUPE_LIGHT, width=1)
        
        rows = [
            ("Version", s["mc_ver"]),
            ("Loader", s["loader"]),
            ("Runtime", s["java"]),
            ("Memory", s["ram"]),
            ("Tuning", s["flags"]),
            ("Integrity", s["status"])
        ]
        
        ry = cy + 165
        for label, val in rows:
            draw.text((cx + 28, ry), label, fill=C_INK_FAINT, font=get_font("variable", 14))
            draw.text((cx + 140, ry), val, fill=C_INK, font=get_font("sans_bold", 14))
            ry += 42
            
        btn_y = cy + card_h - 75
        btn_fill = C_TERRACOTTA if s["is_active"] else C_IVORY
        btn_txt = "Ready to Launch" if s["is_active"] else "Select Setup"
        btn_txt_col = C_WHITE if s["is_active"] else C_INK
        draw.rounded_rectangle([(cx + 28, btn_y), (cx + card_w - 28, btn_y + 46)], radius=8, fill=btn_fill)
        
        b_box = draw.textbbox((0, 0), btn_txt, font=get_font("sans_bold", 15))
        bx = cx + (card_w - (b_box[2] - b_box[0])) // 2
        draw.text((bx, btn_y + 13), btn_txt, fill=btn_txt_col, font=get_font("sans_bold", 15))
        
    if f > 80:
        t_cur = ease_cinematic(clamp((f - 80) / 60.0))
        cur_x = int(600 * (1 - t_cur) + 380 * t_cur)
        cur_y = int(400 * (1 - t_cur) + 725 * t_cur)
        base.paste(CURSOR_SPRITE, (cur_x, cur_y), mask=CURSOR_SPRITE)
        
    return base

def render_shot_5(frame_idx):
    """
    SHOT 5 — THE SIGNATURE INTERACTION (Frames 1020–1320, 00:17–00:22)
    Preferred copy: 'Drop it in.\nMake it yours.'
    Visual: Realtime Skin Studio import workflow. File chip drags into the real drop zone,
            detected, and confirmed with tactile visual feedback.
    """
    f = frame_idx - 1020  # 0 to 299
    base = Image.new("RGB", (WIDTH_1080P, HEIGHT_1080P), C_IVORY)
    draw = ImageDraw.Draw(base)
    
    t_enter = ease_cinematic(clamp(f / 40.0))
    t_drift = f / 300.0 * 6
    
    left_x = 135
    head_y = 350 + int((1.0 - t_enter) * 30) - int(t_drift * 0.4)
    draw.text((left_x, head_y - 50), "SKIN STUDIO & OFFLINE ENGINE", fill=C_TERRACOTTA, font=get_font("sans_bold", 14))
    draw.text((left_x, head_y), "Drop it in.", fill=C_INK, font=get_font("serif_bold", 66))
    draw.text((left_x, head_y + 78), "Make it yours.", fill=C_INK, font=get_font("serif_bold", 66))
    
    sub = "Drag and drop any 64×64 PNG texture.\nAutomatically generates resource packs\nwith zero Mojang session requirements."
    draw.text((left_x, head_y + 185), sub, fill=C_INK_MUTED, font=get_font("variable", 18), spacing=7)
    
    # Right side: Realtime Skin Studio Window
    win_x = 750 - PAD_SHOT5
    win_y = 210 - PAD_SHOT5
    base.paste(CARD_STUDIO_SHOT5, (win_x, win_y), mask=CARD_STUDIO_SHOT5)
    
    chip_start = (620, 700)
    chip_target = (1120, 480)
    
    drop_occurred = f >= 120
    
    if not drop_occurred:
        t_drag = ease_cinematic(clamp((f - 40) / 75.0))
        chip_x = int(chip_start[0] * (1 - t_drag) + chip_target[0] * t_drag)
        chip_y = int(chip_start[1] * (1 - t_drag) + chip_target[1] * t_drag)
        
        chip_w, chip_h = 240, 56
        draw.rounded_rectangle([(chip_x, chip_y), (chip_x + chip_w, chip_y + chip_h)], radius=8, fill=C_WHITE, outline=C_TAUPE, width=1)
        draw.rounded_rectangle([(chip_x + 12, chip_y + 12), (chip_x + 44, chip_y + 44)], radius=4, fill=C_TERRACOTTA)
        draw.text((chip_x + 19, chip_y + 17), "PNG", fill=C_WHITE, font=get_font("sans_bold", 11))
        draw.text((chip_x + 54, chip_y + 12), "custom_skin.png", fill=C_INK, font=get_font("sans_bold", 13))
        draw.text((chip_x + 54, chip_y + 30), "64×64 • RGBA Texture", fill=C_INK_MUTED, font=get_font("variable", 11))
        
        cur_x = chip_x + 160
        cur_y = chip_y + 20
        base.paste(CURSOR_SPRITE, (cur_x, cur_y), mask=CURSOR_SPRITE)
    else:
        t_confirm = ease_cinematic(clamp((f - 120) / 30.0))
        
        cx, cy = chip_target[0] + 50, chip_target[1] + 30
        rw, rh = 280, 160
        pulse_alpha = int(180 * (1.0 - clamp((f - 120) / 60.0)))
        if pulse_alpha > 0:
            glow = Image.new("RGBA", (rw, rh), (0, 0, 0, 0))
            d_g = ImageDraw.Draw(glow)
            d_g.rounded_rectangle([(0, 0), (rw - 1, rh - 1)], radius=12, outline=(*C_TERRACOTTA, pulse_alpha), width=3)
            base.paste(glow, (cx - rw // 2, cy - rh // 2), mask=glow)
            
        toast_w, toast_h = 320, 52
        tx = 1080
        ty = 760 + int((1.0 - t_confirm) * 20)
        draw.rounded_rectangle([(tx, ty), (tx + toast_w, ty + toast_h)], radius=8, fill=C_WHITE, outline=C_TERRACOTTA, width=1)
        
        chk_x = tx + 24
        chk_y = ty + 26
        draw.line([(chk_x, chk_y), (chk_x + 6, chk_y + 6), (chk_x + 16, chk_y - 6)], fill=C_TERRACOTTA, width=2)
        draw.text((tx + 50, ty + 16), "Texture Applied & Synced", fill=C_TERRACOTTA, font=get_font("sans_bold", 15))
        
        base.paste(CURSOR_SPRITE, (tx + 280, ty + 20), mask=CURSOR_SPRITE)
        
    return base

def render_shot_6(frame_idx):
    """
    SHOT 6 — QUIET CONTROL (Frames 1320–1560, 00:22–00:26)
    Copy: 'Set it your way.'
    Visual: Realtime Settings screen with memory allocation slider adjusting from 2048 MB to 6144 MB.
    """
    f = frame_idx - 1320  # 0 to 239
    base = Image.new("RGB", (WIDTH_1080P, HEIGHT_1080P), C_IVORY)
    draw = ImageDraw.Draw(base)
    
    t_enter = ease_cinematic(clamp(f / 35.0))
    t_drift = f / 240.0 * 6
    
    head_y = 60 + int((1.0 - t_enter) * 15)
    draw.text((135, head_y), COPY_SHOT6_HEAD, fill=C_INK, font=get_font("serif_bold", 40))
    draw.text((135, head_y + 50), "Automatic Adoptium Temurin detection  •  Zero manual PATH editing", fill=C_INK_MUTED, font=get_font("variable", 16))
    
    # Realtime Settings Window (Centered)
    win_x = (WIDTH_1080P - (CARD_SETTINGS_SHOT6.width - PAD_SHOT6 * 2)) // 2 - PAD_SHOT6
    win_y = 150 - PAD_SHOT6 - int(t_drift * 0.4)
    base.paste(CARD_SETTINGS_SHOT6, (win_x, win_y), mask=CARD_SETTINGS_SHOT6)
    
    # Interactive Memory Slider overlay over the window:
    sx_start = 700
    sx_end = 1240
    track_w = sx_end - sx_start
    sy = 635
    
    t_drag = ease_cinematic(clamp((f - 65) / 55.0))
    
    val_mb = int(2048 + (6144 - 2048) * t_drag)
    thumb_x = int(sx_start + (val_mb - 1024) / (8192 - 1024) * track_w)
    
    box_x = 420
    box_y = 530
    box_w = 880
    box_h = 160
    draw.rounded_rectangle([(box_x, box_y), (box_x + box_w, box_y + box_h)], radius=10, fill=C_WHITE, outline=C_TAUPE_LIGHT, width=1)
    
    draw.text((box_x + 35, box_y + 24), "Allocated Memory (RAM)", fill=C_INK, font=get_font("sans_bold", 17))
    draw.text((box_x + 35, box_y + 48), "Direct JVM Heap allocation with automatic G1GC tuning", fill=C_INK_MUTED, font=get_font("variable", 13))
    
    ram_str = f"{val_mb:,} MB"
    if val_mb >= 6000:
        ram_str += "  (Optimal)"
    b_tag = draw.textbbox((0, 0), ram_str, font=get_font("sans_bold", 15))
    tag_w = (b_tag[2] - b_tag[0]) + 24
    draw.rounded_rectangle([(box_x + box_w - tag_w - 35, box_y + 24), (box_x + box_w - 35, box_y + 54)], radius=6, fill=C_TERRACOTTA)
    draw.text((box_x + box_w - tag_w - 23, box_y + 30), ram_str, fill=C_WHITE, font=get_font("sans_bold", 15))
    
    draw.rounded_rectangle([(box_x + 35, sy - 4), (box_x + box_w - 35, sy + 4)], radius=4, fill=C_TAUPE_LIGHT)
    draw.rounded_rectangle([(box_x + 35, sy - 4), (thumb_x, sy + 4)], radius=4, fill=C_TERRACOTTA)
    
    thumb_r = 12
    draw.ellipse([(thumb_x - thumb_r, sy - thumb_r), (thumb_x + thumb_r, sy + thumb_r)], fill=C_WHITE, outline=C_TERRACOTTA, width=3)
    
    draw.text((box_x + 35, sy + 18), "1,024 MB", fill=C_INK_FAINT, font=get_font("mono", 12))
    draw.text((box_x + box_w // 2 - 30, sy + 18), "4,096 MB", fill=C_INK_FAINT, font=get_font("mono", 12))
    draw.text((box_x + box_w - 100, sy + 18), "8,192 MB", fill=C_INK_FAINT, font=get_font("mono", 12))
    
    if f < 65:
        t_c = ease_cinematic(clamp(f / 60.0))
        cur_x = int(600 * (1 - t_c) + (thumb_x + 2) * t_c)
        cur_y = int(720 * (1 - t_c) + (sy + 2) * t_c)
    elif f <= 135:
        cur_x = thumb_x + 2
        cur_y = sy + 2
    else:
        t_c = ease_cinematic(clamp((f - 135) / 50.0))
        cur_x = int((thumb_x + 2) * (1 - t_c) + 1200 * t_c)
        cur_y = int((sy + 2) * (1 - t_c) + 720 * t_c)
        
    base.paste(CURSOR_SPRITE, (cur_x, cur_y), mask=CURSOR_SPRITE)
    return base

def render_shot_7(frame_idx):
    """
    SHOT 7 — THE PAYOFF (Frames 1560–1860, 00:26–00:31)
    Copy: 'Ready when you are.'
    Visual: Return to Realtime Home. Cursor moves to terracotta Play button, clicks.
            Clean launch transition to authentic Minecraft Fabric title screen.
    """
    f = frame_idx - 1560  # 0 to 299
    base = Image.new("RGB", (WIDTH_1080P, HEIGHT_1080P), C_IVORY)
    draw = ImageDraw.Draw(base)
    
    launched = f >= 150
    
    if not launched:
        t_fade = ease_cinematic(clamp(f / 35.0))
        head_y = 55 + int((1.0 - t_fade) * 15)
        draw.text((135, head_y), COPY_SHOT7_HEAD, fill=C_INK, font=get_font("serif_bold", 40))
        draw.text((135, head_y + 50), "Isolated process launch  •  Windows performance tuning enabled", fill=C_INK_MUTED, font=get_font("variable", 16))
        
        # Realtime Home Window
        win_x = (WIDTH_1080P - (CARD_HOME_SHOT3.width - PAD_SHOT3 * 2)) // 2 - PAD_SHOT3
        win_y = 150 - PAD_SHOT3
        base.paste(CARD_HOME_SHOT3, (win_x, win_y), mask=CARD_HOME_SHOT3)
        
        # In realtime home screen, PLAY button is centered at x=960, y=695
        # Button bounds: left=840, top=665, right=1080, bottom=725
        bx = 840
        by = 665
        btn_w = 240
        btn_h = 60
        
        clicked = f >= 132
        
        t_cur = ease_cinematic(clamp(f / 110.0))
        cur_x = int(600 * (1 - t_cur) + 980 * t_cur)
        cur_y = int(850 * (1 - t_cur) + 695 * t_cur)
        
        # Elastic press state on Play button
        if f > 80:
            btn_fill = C_TERRACOTTA_DEEP if clicked else (C_TERRACOTTA_LIGHT if f > 90 else C_TERRACOTTA)
            btn_text = "LAUNCHING..." if clicked else "PLAY"
            
            draw.rounded_rectangle([(bx, by), (bx + btn_w, by + btn_h)], radius=8, fill=btn_fill)
            tbox = draw.textbbox((0, 0), btn_text, font=get_font("sans_bold", 18))
            tx = bx + (btn_w - (tbox[2] - tbox[0])) // 2
            draw.text((tx, by + 18), btn_text, fill=C_WHITE, font=get_font("sans_bold", 18))
        
        base.paste(CURSOR_SPRITE, (cur_x, cur_y), mask=CURSOR_SPRITE)
    else:
        t_trans = ease_cinematic(clamp((f - 150) / 45.0))
        
        head_y = 55 + int((1.0 - t_trans) * 15)
        draw.text((135, head_y), "Minecraft 1.21.4 (Fabric)", fill=C_INK, font=get_font("serif_bold", 38))
        draw.text((135, head_y + 48), "Session active  •  Process running at High Priority", fill=C_GREEN, font=get_font("sans_bold", 15))
        
        mc_x = (WIDTH_1080P - (CARD_MINECRAFT_SHOT7.width - PAD_SHOT7 * 2)) // 2 - PAD_SHOT7
        mc_y = 150 - PAD_SHOT7
        base.paste(CARD_MINECRAFT_SHOT7, (mc_x, mc_y), mask=CARD_MINECRAFT_SHOT7)
        
        # Terracotta expansion bridge into Shot 8 (frames 280 to 299 of Shot 7)
        if f >= 280:
            t_bridge = ease_cinematic((f - 280) / 20.0)
            bw = int(WIDTH_1080P * t_bridge * 1.25)
            bh = int(HEIGHT_1080P * t_bridge * 1.25)
            if bw > 0 and bh > 0:
                bx1 = max(0, WIDTH_1080P // 2 - bw // 2)
                by1 = max(0, HEIGHT_1080P // 2 - bh // 2)
                bx2 = min(WIDTH_1080P, WIDTH_1080P // 2 + bw // 2)
                by2 = min(HEIGHT_1080P, HEIGHT_1080P // 2 + bh // 2)
                draw.rectangle([(bx1, by1), (bx2, by2)], fill=C_TERRACOTTA)
        
    return base

def render_shot_8(frame_idx):
    """
    SHOT 8 — THE BRAND HOLD (Frames 1860–2160, 00:31–00:36)
    Visual: Full terracotta background. Large ivory LOAM wordmark,
            Tagline: 'Your worlds, ready.', Supporting: 'For Windows • v1.5.0'.
            Holds solidly through the end while audio cleanly resolves.
    """
    f = frame_idx - 1860  # 0 to 299
    base = Image.new("RGB", (WIDTH_1080P, HEIGHT_1080P), C_TERRACOTTA)
    draw = ImageDraw.Draw(base)
    
    t_enter = ease_cinematic(clamp(f / 45.0))
    t_breathe = f / 300.0 * 4
    
    center_x = WIDTH_1080P // 2
    center_y = int(510 - t_breathe * 0.5)
    
    # 1. LOAM Wordmark in Pure Ivory
    wm_h = 108
    wm_w = int(CROP_WORDMARK_IVORY.width * (wm_h / CROP_WORDMARK_IVORY.height))
    wm_resized = CROP_WORDMARK_IVORY.resize((wm_w, wm_h), Image.Resampling.LANCZOS)
    
    wm_y_target = center_y - 135
    wm_y = wm_y_target + int((1.0 - t_enter) * 30)
    wm_x = center_x - wm_w // 2
    
    paste_with_alpha(base, wm_resized, (wm_x, wm_y), opacity=t_enter)
    
    # 2. Horizontal Ivory Rule
    rule_y = center_y + 18
    rule_max_w = 480
    curr_rule_w = int(rule_max_w * t_enter)
    if curr_rule_w > 0:
        draw.line(
            [(center_x - curr_rule_w // 2, rule_y), (center_x + curr_rule_w // 2, rule_y)],
            fill=C_IVORY,
            width=1
        )
        
    # 3. Tagline: "Your worlds, ready."
    font_tag = get_font("serif_bold", 48)
    tag_text = COPY_SHOT8_TAGLINE
    bbox_tag = draw.textbbox((0, 0), tag_text, font=font_tag)
    tag_x = center_x - (bbox_tag[2] - bbox_tag[0]) // 2
    tag_y = rule_y + 38 + int((1.0 - t_enter) * 15)
    
    draw.text((tag_x, tag_y), tag_text, fill=C_IVORY, font=font_tag)
    
    # 4. Platform & Version: "For Windows  •  v1.5.0"
    font_plat = get_font("variable", 18)
    plat_text = COPY_SHOT8_PLATFORM.upper()
    spaced_plat = "  ".join(list(plat_text))
    bbox_plat = draw.textbbox((0, 0), spaced_plat, font=font_plat)
    plat_x = center_x - (bbox_plat[2] - bbox_plat[0]) // 2
    plat_y = tag_y + 82
    
    draw.text((plat_x, plat_y), spaced_plat, fill=(244, 243, 238, 210), font=font_plat)
    
    return base

# -------------------------------------------------------------------------
# MASTER FRAME DISPATCHER
# -------------------------------------------------------------------------
def render_frame(frame_idx):
    """
    Renders the exact 1920x1080 frame for index frame_idx (0 to 2159).
    Returns a PIL Image object (RGB mode).
    """
    if frame_idx < 180:
        return render_shot_1(frame_idx)
    elif frame_idx < 420:
        return render_shot_2(frame_idx)
    elif frame_idx < 720:
        return render_shot_3(frame_idx)
    elif frame_idx < 1020:
        return render_shot_4(frame_idx)
    elif frame_idx < 1320:
        return render_shot_5(frame_idx)
    elif frame_idx < 1560:
        return render_shot_6(frame_idx)
    elif frame_idx < 1860:
        return render_shot_7(frame_idx)
    else:
        return render_shot_8(frame_idx)
