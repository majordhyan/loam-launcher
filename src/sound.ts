// Synthesized acoustic sound design engine using Web Audio API
// Local synthesis; audio-device initialization and scheduling have nonzero latency.

type SfxType =
  | "click"
  | "tab"
  | "sheetOpen"
  | "sheetClose"
  | "launch"
  | "installed"
  | "toggle";

let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let activeVoices = 0;
const MAX_VOICES = 8;

// Initialize sound preference from localStorage
try {
  const stored = localStorage.getItem("loam_sfx_enabled");
  if (stored !== null) {
    soundEnabled = stored === "true";
  }
} catch {
  soundEnabled = true;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try {
    localStorage.setItem("loam_sfx_enabled", String(enabled));
  } catch {}
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playSfx(type: SfxType): void {
  if (!soundEnabled || activeVoices >= MAX_VOICES) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === "closed") return;
    const now = ctx.currentTime;
    // Bound overlapping sounds and disconnect the entire graph after playback.
    const nodes: AudioNode[] = [];
    const oscillators: OscillatorNode[] = [];
    const oscillator = () => {
      const node = ctx.createOscillator();
      nodes.push(node);
      oscillators.push(node);
      return node;
    };
    const gainNode = () => {
      const node = ctx.createGain();
      nodes.push(node);
      return node;
    };
    const filterNode = () => {
      const node = ctx.createBiquadFilter();
      nodes.push(node);
      return node;
    };
    activeVoices++;
    let failed = false;
    try {
      switch (type) {
        case "click": {
          // Subtle tactile click (micro-impulse with soft lowpass)
          const osc = oscillator();
          const gain = gainNode();
          const filter = filterNode();

          osc.type = "sine";
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(2400, now);

          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.025);
          break;
        }

        case "tab": {
          // Resonant wood/glass tap
          const osc = oscillator();
          const gain = gainNode();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(680, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.035);

          gain.gain.setValueAtTime(0.035, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.035);
          break;
        }

        case "toggle": {
          // Crisp notch pop
          const osc = oscillator();
          const gain = gainNode();

          osc.type = "sine";
          osc.frequency.setValueAtTime(900, now);
          osc.frequency.exponentialRampToValueAtTime(700, now + 0.02);

          gain.gain.setValueAtTime(0.03, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.02);
          break;
        }

        case "sheetOpen": {
          // Silky ascending airy sweep
          const osc = oscillator();
          const gain = gainNode();
          const filter = filterNode();

          osc.type = "sine";
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1400, now);
          filter.frequency.linearRampToValueAtTime(2200, now + 0.12);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.04, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case "sheetClose": {
          // Soft descending acoustic tap
          const osc = oscillator();
          const gain = gainNode();

          osc.type = "sine";
          osc.frequency.setValueAtTime(460, now);
          osc.frequency.exponentialRampToValueAtTime(260, now + 0.1);

          gain.gain.setValueAtTime(0.035, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.11);
          break;
        }

        case "launch": {
          // Uplifting cinematic launch surge (warm deep chord + upward harmonic shimmer)
          const root = oscillator();
          const harmonic = oscillator();
          const gain = gainNode();
          const filter = filterNode();

          root.type = "sine";
          root.frequency.setValueAtTime(130, now);
          root.frequency.exponentialRampToValueAtTime(260, now + 0.35);

          harmonic.type = "triangle";
          harmonic.frequency.setValueAtTime(260, now);
          harmonic.frequency.exponentialRampToValueAtTime(520, now + 0.35);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(800, now);
          filter.frequency.linearRampToValueAtTime(2400, now + 0.25);
          filter.frequency.exponentialRampToValueAtTime(600, now + 0.4);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.07, now + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

          root.connect(filter);
          harmonic.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          root.start(now);
          harmonic.start(now);
          root.stop(now + 0.45);
          harmonic.stop(now + 0.45);
          break;
        }

        case "installed": {
          // Pleasant two-tone chime (E5 -> A5 harmonious major chord)
          const note1 = oscillator();
          const note2 = oscillator();
          const gain1 = gainNode();
          const gain2 = gainNode();

          note1.type = "sine";
          note1.frequency.setValueAtTime(659.25, now); // E5
          gain1.gain.setValueAtTime(0.055, now);
          gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
          note1.connect(gain1);
          gain1.connect(ctx.destination);
          note1.start(now);
          note1.stop(now + 0.3);

          const t2 = now + 0.08;
          note2.type = "sine";
          note2.frequency.setValueAtTime(880.0, t2); // A5
          gain2.gain.setValueAtTime(0.065, t2);
          gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.35);
          note2.connect(gain2);
          gain2.connect(ctx.destination);
          note2.start(t2);
          note2.stop(t2 + 0.38);
          break;
        }
      }
    } catch {
      failed = true;
      oscillators.forEach((node) => {
        try {
          node.stop();
        } catch {
          /* Not started. */
        }
      });
    } finally {
      let remaining = oscillators.length;
      const cleanup = () => {
        nodes.forEach((node) => node.disconnect());
        activeVoices = Math.max(0, activeVoices - 1);
      };
      if (!remaining || failed) cleanup();
      else
        oscillators.forEach((node) => {
          node.addEventListener(
            "ended",
            () => {
              if (--remaining === 0) cleanup();
            },
            { once: true },
          );
        });
    }
  } catch {
    // Gracefully ignore audio synthesis errors
  }
}
