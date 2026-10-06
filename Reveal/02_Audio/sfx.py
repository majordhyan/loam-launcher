"""LOAM reveal sound design. Synthesizes original SFX and a soft music bed for a scene
from motion/timeline.js, so every sound lands on its visual cue. All sounds are generated
here (no samples, no licensed audio).

Usage: python sfx.py <scene> <out.wav>
"""
import json, sys, re
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 48_000
rng = np.random.default_rng(7)
ROOT = Path(__file__).resolve().parent.parent
TL = json.loads(re.sub(r"^\s*window\.TIMELINES\s*=\s*|;\s*$", "", (ROOT / "03_GFX/motion/timeline.js").read_text(encoding="utf-8").strip()))

def t_axis(d): return np.arange(int(d * SR)) / SR
def lp(x, f, order=2): return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)
def env(n, a, d=None, total=None):
    """Attack (s) then exponential decay with time constant d (s)."""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if d: e *= np.exp(-np.maximum(0, t - a) / d)
    return e
def note(f): return 440 * 2 ** ((f - 69) / 12)

# ---------- instruments ----------
def tick(gain=0.5):
    """Dry error tick: short blip plus click."""
    n = int(0.06 * SR); t = np.arange(n) / SR
    blip = np.sin(2 * np.pi * 1180 * t) * env(n, 0.001, 0.012)
    click = hp(rng.standard_normal(n), 2500) * env(n, 0.0005, 0.003)
    return gain * (0.6 * blip + 0.4 * click)

def buzz(dur=0.16, gain=0.35):
    """Low error buzzer (soft square at 82 Hz, rounded)."""
    t = t_axis(dur)
    sq = np.sign(np.sin(2 * np.pi * 82 * t)) * 0.6 + np.sin(2 * np.pi * 164 * t) * 0.3
    return gain * lp(sq, 900) * env(len(t), 0.004, dur * 0.5)

def hum(dur, gain=0.05):
    """Faint electrical noise bed under the error cards."""
    t = t_axis(dur)
    x = lp(rng.standard_normal(len(t)), 600) + 0.3 * np.sin(2 * np.pi * 50 * t)
    fade = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.01)
    return gain * x / np.max(np.abs(x)) * fade

def pen(dur, gain=0.12):
    """Pen on paper: band-limited noise with a gentle swell."""
    t = t_axis(dur)
    x = bp(rng.standard_normal(len(t)), 1800, 6000)
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    grain = 1 + 0.35 * np.sin(2 * np.pi * 9 * t + rng.random() * 6)
    return gain * x / np.max(np.abs(x)) * shape * grain

def felt(midi, dur=3.0, gain=0.42):
    """Felt piano: soft attack, a few harmonics, warm low-pass, long decay."""
    t = t_axis(dur); f = note(midi)
    tone = sum(a * np.sin(2 * np.pi * f * k * t + k) * np.exp(-t * (1.2 + 0.9 * k)) for k, a in [(1, 1), (2, 0.42), (3, 0.18), (4, 0.08)])
    hammer = lp(rng.standard_normal(len(t)), 1400) * np.exp(-t / 0.012) * 0.25
    return gain * lp(tone + hammer, 2600) * env(len(t), 0.006)

def chime(midi, dur=1.6, gain=0.24):
    t = t_axis(dur); f = note(midi)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) + 0.12 * np.sin(2 * np.pi * f * 3.98 * t)
    return gain * x * env(len(t), 0.003, 0.45)

def ui_click(gain=0.45):
    """Tactile UI click: tiny transient plus a soft 'thock' body."""
    n = int(0.09 * SR); t = np.arange(n) / SR
    tr = bp(rng.standard_normal(n), 2000, 7000) * np.exp(-t / 0.0025)
    body = np.sin(2 * np.pi * (210 - 80 * t / 0.09) * t) * np.exp(-t / 0.022)
    return gain * (0.55 * tr + 0.6 * body)

def whoosh(dur=0.55, gain=0.16, rise=True):
    t = t_axis(dur)
    x = rng.standard_normal(len(t))
    # Sweep a band-pass upwards (or down) using short overlapping blocks.
    out = np.zeros_like(x); block = 1024
    for i in range(0, len(x), block):
        p = i / len(x); fc = 400 + (3600 if rise else -0) * (p if rise else 1 - p) + (0 if rise else 400)
        seg = x[i:i + block]
        out[i:i + block] = bp(seg, max(120, fc * 0.6), min(SR / 2 - 100, fc * 1.6))
    return gain * out / np.max(np.abs(out)) * np.sin(np.pi * t / dur) ** 2

def kick(gain=0.5):
    n = int(0.22 * SR); t = np.arange(n) / SR
    f = 46 + 70 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return gain * np.sin(ph) * np.exp(-t / 0.09)

def shaker(gain=0.06):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return gain * hp(rng.standard_normal(n), 6000) * np.exp(-t / 0.012)

def pad(chords, start, end, bpm=100, gain=0.10):
    """Warm detuned pad, one chord per two bars, stereo."""
    dur = end - start; t = t_axis(dur)
    L = np.zeros_like(t); R = np.zeros_like(t)
    bar = 4 * 60 / bpm; span = 2 * bar
    for i, ch in enumerate(chords * 8):
        a = i * span
        if a >= dur: break
        seg = (t >= a) & (t < a + span + 1.2)
        tt = t[seg] - a
        e = np.minimum(1, tt / 0.9) * np.minimum(1, np.maximum(0, (span + 1.2 - tt) / 1.2))
        for m in ch:
            f = note(m)
            L[seg] += e * np.sin(2 * np.pi * f * 0.997 * tt)
            R[seg] += e * np.sin(2 * np.pi * f * 1.003 * tt + 0.7)
    fade = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 0.8)
    return gain * np.stack([lp(L, 1800), lp(R, 1800)], 1) * fade[:, None] / 4

# ---------- score ----------
def build(scene):
    T = TL[scene]; length = T["length"]
    mix = np.zeros((int(length * SR), 2))
    def put(sig, at, pan=0.0, g=1.0):
        if at >= length: return
        i = int(at * SR)
        if sig.ndim == 1:
            l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
            sig = np.stack([sig * l, sig * r], 1)
        j = min(len(mix), i + len(sig))
        mix[i:j] += g * sig[: j - i]

    n = T.get("noise")
    if n:
        put(hum(n["b"] - n["a"]), n["a"])
        k, x = 0, n["a"]
        while x < n["b"] - 1e-6:
            put(tick(), x, pan=(-0.25 if k % 2 else 0.25))
            if k == 0: put(buzz(), x)
            k += 1; x += n["every"]
        put(buzz(0.09, 0.22), n["b"] - n["every"])     # last card stings, then silence
    s = T.get("strata")
    if s:
        put(pen(s["dur"] * 1.1, 0.16), s["start"], pan=-0.3)
        for i in range(6):
            put(pen(s["dur"], 0.07), max(s["start"] + 0.6, s["firstUntil"]) + i * s["stagger"] * 1.6, pan=(i % 3 - 1) * 0.4)
    b = T.get("brand")
    last = length
    if b:
        put(felt(60, 3.2), b["a"]); put(felt(48, 3.2, 0.25), b["a"])          # C4 over C3
        put(felt(67, 2.6, 0.28), b["wm"], pan=0.15)                            # G4 as the wordmark lands
        music_from = b["a"]
        progression = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]]   # Cmaj7 Am7 Fmaj7 G
        put(pad(progression, music_from, last), music_from)
    if T.get("lift") is not None and T.get("converge"):
        put(whoosh(0.6, 0.10), T["lift"] - 0.1)
    tag = T.get("tag")
    if tag:
        put(chime(76, 1.4, 0.20), tag[0]); put(chime(81, 1.6, 0.18), tag[0] + 0.13)   # E5 -> A5
    shots = T.get("shots") or []
    if shots:
        a0, a1 = shots[0]["a"], shots[-1]["b"]
        beat = 0.6
        x = a0
        while x < a1 - 0.05:
            put(kick(0.32), x)
            put(shaker(0.05), x + beat / 2, pan=0.35)
            x += beat
        for sh in shots:
            put(whoosh(0.32, 0.09), sh["a"] - 0.18)
            put(ui_click(0.42), sh["a"] + 0.02, pan=0.1)
    if T.get("brandBack"):
        put(felt(60, 3.0, 0.30), T["brandBack"][0]); put(felt(64, 3.0, 0.22), T["brandBack"][0] + 0.04); put(felt(67, 3.0, 0.2), T["brandBack"][0] + 0.08)
    cta = T.get("cta")
    if cta:
        put(ui_click(0.35), cta[0])
        put(chime(84, 2.0, 0.12), cta[0] + 0.05, pan=0.2)
    # Gentle master: fade the last 0.6 s, soft-clip.
    t = np.arange(len(mix)) / SR
    mix *= np.minimum(1, (length - t) / 0.6)[:, None]
    return np.tanh(mix * 1.1) / 1.1

if __name__ == "__main__":
    scene, out = sys.argv[1], sys.argv[2]
    audio = build(scene)
    wavfile.write(out, SR, (audio / max(1e-9, np.max(np.abs(audio))) * 0.89 * 32767).astype(np.int16))
    print("wrote", out, f"{len(audio) / SR:.2f}s")
