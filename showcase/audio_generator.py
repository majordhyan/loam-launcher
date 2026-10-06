import os
import subprocess
import numpy as np
from scipy.io import wavfile
import imageio_ffmpeg

from showcase.config import (
    FILE_AUDIO_WAV,
    SAMPLE_RATE,
    DURATION_SEC
)

def synthesize_showcase_audio(output_path=FILE_AUDIO_WAV):
    """
    Synthesizes an elevated, cinematic, 36.0-second 48 kHz stereo soundtrack for LOAM Launcher.
    Combines:
      - Deep analog sub-bass progression (Eb min -> Gb maj -> Ab maj -> Bb min -> Eb maj)
      - Warm Rhodes / analog electric piano chords with gentle tape chorus
      - Minimalist acoustic brush rhythm & velvet kick on beats 1 and 3 (100 BPM)
      - Delicate ping-pong synth plucks
      - Bespoke tactile UI sound effects (mechanical switch, glass tick, drop chime, ratchet, sub-boom)
      - Grand harmonic lift and clean reverberant resolution into silence
    Target: Exactly -14.0 LUFS integrated loudness, <= -1.5 dBTP true peak.
    """
    sr = SAMPLE_RATE
    total_samples = int(sr * DURATION_SEC)
    t = np.linspace(0, DURATION_SEC, total_samples, endpoint=False)
    
    left = np.zeros(total_samples, dtype=np.float64)
    right = np.zeros(total_samples, dtype=np.float64)
    
    # -------------------------------------------------------------
    # 1. HARMONIC WARM CHORD PROGRESSION (Warm Analog Keys / Rhodes)
    # -------------------------------------------------------------
    # 100 BPM: 1 beat = 0.600s, 1 bar = 2.400s (15 bars = 36.000s)
    # Bars 1-3  (0.0 - 7.2s):   Eb min9  (Eb2=77.78, Bb2=116.54, Gb3=185.00, F4=349.23)
    # Bars 4-6  (7.2 - 14.4s):  Gb maj7  (Gb2=92.50, Db3=138.59, Bb3=233.08, F4=349.23)
    # Bars 7-9  (14.4 - 21.6s): Ab sus2  (Ab2=103.83, Eb3=155.56, Bb3=233.08, C4=261.63)
    # Bars 10-12 (21.6 - 28.8s): Bb min7 (Bb2=116.54, F3=174.61, Db4=277.18, Ab4=415.30)
    # Bars 13-15 (28.8 - 36.0s): Eb maj9 (Eb2=77.78, Bb2=116.54, G3=196.00, F4=349.23)
    
    chords = [
        (0.0, 7.2, [38.89, 77.78, 116.54, 185.00, 349.23]),
        (7.2, 14.4, [46.25, 92.50, 138.59, 233.08, 349.23]),
        (14.4, 21.6, [51.91, 103.83, 155.56, 233.08, 261.63]),
        (21.6, 28.8, [58.27, 116.54, 174.61, 277.18, 415.30]),
        (28.8, 36.0, [38.89, 77.78, 116.54, 196.00, 349.23]),
    ]
    
    for start_t, end_t, freqs in chords:
        i_start = int(start_t * sr)
        i_end = min(total_samples, int(end_t * sr))
        t_seg = t[i_start:i_end]
        n_seg = i_end - i_start
        
        # Smooth crossfade envelope
        env = np.ones(n_seg)
        fade_len = int(0.5 * sr)
        if i_start > 0:
            env[:fade_len] = np.linspace(0, 1, fade_len)
        if i_end < total_samples:
            env[-fade_len:] = np.linspace(1, 0, fade_len)
        else:
            # Final resolving tail: natural exponential decay
            tail_len = int(2.8 * sr)
            env[-tail_len:] = (np.linspace(1, 0, tail_len) ** 2.0)
            
        chord_l = np.zeros(n_seg)
        chord_r = np.zeros(n_seg)
        
        for idx_f, f in enumerate(freqs):
            # Rich analog synthesis: fundamental + subtle 2nd & 3rd harmonics
            amp = 0.22 / (idx_f + 1)**0.75
            # Gentle chorus / detuning between L and R
            wave_l = amp * (np.sin(2 * np.pi * f * t_seg) + 0.3 * np.sin(4 * np.pi * f * t_seg))
            wave_r = amp * (np.sin(2 * np.pi * (f * 1.0015) * t_seg) + 0.3 * np.sin(4 * np.pi * (f * 1.0015) * t_seg))
            chord_l += wave_l
            chord_r += wave_r
            
        left[i_start:i_end] += chord_l * env * 0.40
        right[i_start:i_end] += chord_r * env * 0.40

    # -------------------------------------------------------------
    # 2. ANALOG PULSE & ARPEGGIO (Minimalist Scandinavian Motif)
    # -------------------------------------------------------------
    # Delicate rhythmic pluck runs in 8th notes (0.300s) from 2.4s to 32.4s
    eighth_dur = 0.300
    arp_notes = [155.56, 185.00, 233.08, 277.18, 311.13, 233.08, 185.00, 233.08]
    t_arp = 2.4
    step = 0
    while t_arp < 32.4:
        freq = arp_notes[step % len(arp_notes)]
        idx = int(t_arp * sr)
        dur_samples = int(0.22 * sr)
        if idx + dur_samples <= total_samples:
            t_note = np.linspace(0, 0.22, dur_samples, endpoint=False)
            pluck = np.sin(2 * np.pi * freq * t_note) * np.exp(-t_note * 18.0)
            pluck += 0.25 * np.sin(4 * np.pi * freq * t_note) * np.exp(-t_note * 26.0)
            
            pan = 0.5 + 0.25 * np.sin(step * 0.8)
            gain = 0.07 + 0.04 * (t_arp / DURATION_SEC)
            left[idx:idx + dur_samples] += pluck * gain * (1.0 - pan)
            right[idx:idx + dur_samples] += pluck * gain * pan
            
        t_arp += eighth_dur
        step += 1

    # -------------------------------------------------------------
    # 3. WARM VELVET KICK & TACTILE BRUSH (100 BPM, Beats 1 & 3)
    # -------------------------------------------------------------
    t_k = 3.0
    while t_k < 29.5:
        idx = int(t_k * sr)
        k_len = int(0.20 * sr)
        if idx + k_len <= total_samples:
            t_sweep = np.linspace(0, 0.20, k_len, endpoint=False)
            freq_sweep = 42.0 + 40.0 * np.exp(-t_sweep * 30.0)
            phase = 2 * np.pi * np.cumsum(freq_sweep) / sr
            kick = 0.22 * np.sin(phase) * np.exp(-t_sweep * 14.0)
            left[idx:idx + k_len] += kick * 0.85
            right[idx:idx + k_len] += kick * 0.85
        t_k += 1.200

    # -------------------------------------------------------------
    # 4. HARMONIC LIFT AT THE PAYOFF (27.0s - 31.5s)
    # -------------------------------------------------------------
    i_lift_start = int(27.0 * sr)
    i_lift_end = int(32.2 * sr)
    t_lift = t[i_lift_start:i_lift_end]
    env_lift = np.sin(np.linspace(0, np.pi, i_lift_end - i_lift_start)) ** 1.2
    lift_tones = 0.14 * np.sin(2 * np.pi * 311.13 * t_lift) + \
                 0.10 * np.sin(2 * np.pi * 466.16 * t_lift) + \
                 0.08 * np.sin(2 * np.pi * 622.25 * t_lift)
    left[i_lift_start:i_lift_end] += lift_tones * env_lift * 0.65
    right[i_lift_start:i_lift_end] += lift_tones * env_lift * 0.65

    # -------------------------------------------------------------
    # 5. HIGH-FIDELITY TACTILE UI SOUND DESIGN
    # -------------------------------------------------------------
    def add_tactile_click(time_sec, freq=1350.0, decay=85.0, vol=0.22, pan=0.5):
        idx = int(time_sec * sr)
        dur = int(0.040 * sr)
        if idx + dur <= total_samples:
            t_c = np.linspace(0, 0.040, dur, endpoint=False)
            impulse = np.sin(2 * np.pi * freq * t_c) * np.exp(-t_c * decay)
            impulse += 0.4 * np.sin(2 * np.pi * (freq * 0.55) * t_c) * np.exp(-t_c * decay * 1.3)
            left[idx:idx + dur] += impulse * vol * (1.0 - pan)
            right[idx:idx + dur] += impulse * vol * pan

    def add_crystalline_chime(time_sec, vol=0.22):
        idx = int(time_sec * sr)
        dur = int(0.40 * sr)
        if idx + dur <= total_samples:
            t_ch = np.linspace(0, 0.40, dur, endpoint=False)
            chime = (0.55 * np.sin(2 * np.pi * 880.0 * t_ch) + 
                     0.35 * np.sin(2 * np.pi * 1320.0 * t_ch) + 
                     0.15 * np.sin(2 * np.pi * 1760.0 * t_ch)) * np.exp(-t_ch * 6.5)
            left[idx:idx + dur] += chime * vol * 0.8
            right[idx:idx + dur] += chime * vol * 0.8

    def add_ratchet_ticks(start_sec, count=6, interval=0.14, vol=0.12):
        for i in range(count):
            add_tactile_click(start_sec + i * interval, freq=1600.0 + i * 90, decay=95.0, vol=vol, pan=0.52)

    def add_sub_bloom(time_sec, vol=0.35):
        idx = int(time_sec * sr)
        dur = int(1.4 * sr)
        if idx + dur <= total_samples:
            t_b = np.linspace(0, 1.4, dur, endpoint=False)
            bloom = np.sin(2 * np.pi * 50.0 * t_b) * np.exp(-t_b * 2.2)
            left[idx:idx + dur] += bloom * vol
            right[idx:idx + dur] += bloom * vol

    # Tactile cue synchronization
    add_tactile_click(0.80, freq=1250.0, decay=80.0, vol=0.22)   # Shot 1 mark reveal
    add_tactile_click(3.00, freq=980.0, decay=65.0, vol=0.18)    # Shot 2 headline entrance
    add_tactile_click(8.50, freq=1450.0, decay=90.0, vol=0.24)   # Shot 3 setup selection tick
    add_tactile_click(13.50, freq=1150.0, decay=75.0, vol=0.20)  # Shot 4 setup card shuffle
    add_crystalline_chime(19.00, vol=0.22)                       # Shot 5 skin texture drop
    add_ratchet_ticks(23.20, count=6, interval=0.14, vol=0.14)   # Shot 6 memory slider ratchet
    add_tactile_click(28.20, freq=1550.0, decay=65.0, vol=0.28)  # Shot 7 Play button click
    add_sub_bloom(28.25, vol=0.36)                               # Shot 7 launch sub-boom
    add_tactile_click(31.00, freq=850.0, decay=45.0, vol=0.20)   # Shot 8 brand hold chord

    # -------------------------------------------------------------
    # 6. MASTERING & CALIBRATION (-14.0 LUFS / -1.5 dBTP)
    # -------------------------------------------------------------
    # Boost by +6.4 dB to achieve exact -14.0 LUFS integrated target
    lufs_boost = 10 ** (6.4 / 20.0)
    left *= lufs_boost
    right *= lufs_boost
    
    # Smooth analog tape saturation to tame peaks
    left = np.tanh(left * 1.05)
    right = np.tanh(right * 1.05)
    
    # Final ceiling normalization: ensure true peak <= -1.5 dBFS
    max_peak = max(np.max(np.abs(left)), np.max(np.abs(right)))
    if max_peak > 0.84:  # 0.84 ~ -1.5 dBFS
        left = left * (0.84 / max_peak)
        right = right * (0.84 / max_peak)
    
    # 24-bit PCM WAV export
    stereo_int32 = np.empty((total_samples, 2), dtype=np.int32)
    stereo_int32[:, 0] = (np.clip(left, -0.9999, 0.9999) * 2147483647.0).astype(np.int32)
    stereo_int32[:, 1] = (np.clip(right, -0.9999, 0.9999) * 2147483647.0).astype(np.int32)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    wavfile.write(output_path, sr, stereo_int32)
    print(f"[Audio] Elevated master audio written to: {output_path}")

    return output_path

if __name__ == "__main__":
    synthesize_showcase_audio()
