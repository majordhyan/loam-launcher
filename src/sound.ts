// LOAM interface sounds (1.7): synthesized on the PC with the Web Audio API. Nothing is
// downloaded or streamed. A master bus carries the volume and a short, soft room echo so
// the sounds feel warm instead of beepy. Voices are capped and every node is released.

export type SfxType =
  | "click"
  | "tab"
  | "nav"
  | "toggle"
  | "pop"
  | "sheetOpen"
  | "sheetClose"
  | "launch"
  | "installed"
  | "success"
  | "error";

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;
let soundEnabled = true;
let volume = 0.7;
let activeVoices = 0;
let lastAt: Record<string, number> = {};
const MAX_VOICES = 10;

try {
  const stored = localStorage.getItem("loam_sfx_enabled");
  if (stored !== null) soundEnabled = stored === "true";
  const v = localStorage.getItem("loam_sfx_volume");
  if (v !== null && Number.isFinite(+v)) volume = Math.max(0, Math.min(1, +v));
} catch {
  soundEnabled = true;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try { localStorage.setItem("loam_sfx_enabled", String(enabled)); } catch { /* storage unavailable */ }
}
export function getVolume(): number {
  return volume;
}
export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (master && audioCtx) master.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.02);
  try { localStorage.setItem("loam_sfx_volume", String(volume)); } catch { /* storage unavailable */ }
}

function context(): { ctx: AudioContext; out: AudioNode } | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    audioCtx = new C();
    // Master bus: volume -> gentle compressor -> speakers, with a short damped echo send.
    master = audioCtx.createGain();
    master.gain.value = volume;
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    const delay = audioCtx.createDelay(0.2);
    delay.delayTime.value = 0.085;
    const fb = audioCtx.createGain();
    fb.gain.value = 0.22;
    const damp = audioCtx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 2200;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.18;
    master.connect(comp);
    master.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(wet);
    wet.connect(comp);
    comp.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") void audioCtx.resume().catch(() => {});
  return audioCtx.state === "closed" || !master ? null : { ctx: audioCtx, out: master };
}

type Voice = { osc: (type: OscillatorType, f: number) => OscillatorNode; gain: (v?: number) => GainNode; filter: (type: BiquadFilterType, f: number, q?: number) => BiquadFilterNode; noise: (dur: number) => AudioBufferSourceNode };

let noiseBuffer: AudioBuffer | null = null;

export function playSfx(type: SfxType): void {
  if (!soundEnabled || volume <= 0 || activeVoices >= MAX_VOICES) return;
  // Rapid repeats (key repeat, double events) collapse into one sound.
  const t = performance.now();
  if (t - (lastAt[type] || 0) < 45) return;
  lastAt[type] = t;
  const env = context();
  if (!env) return;
  const { ctx, out } = env;
  const now = ctx.currentTime + 0.005;
  const nodes: AudioNode[] = [];
  const sources: AudioScheduledSourceNode[] = [];
  const v: Voice = {
    osc: (kind, f) => { const o = ctx.createOscillator(); o.type = kind; o.frequency.setValueAtTime(f, now); nodes.push(o); sources.push(o); return o; },
    gain: (g = 0) => { const n = ctx.createGain(); n.gain.setValueAtTime(g, now); nodes.push(n); return n; },
    filter: (kind, f, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = kind; n.frequency.setValueAtTime(f, now); n.Q.value = q; nodes.push(n); return n; },
    noise: (dur) => {
      if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const d = noiseBuffer.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const s = ctx.createBufferSource();
      s.buffer = noiseBuffer;
      s.loop = dur > 0.5;
      nodes.push(s);
      sources.push(s);
      return s;
    },
  };
  /** A struck note: sine body plus a quieter overtone, exponential decay. */
  const mallet = (f: number, at: number, dur: number, level: number, bright = 2.76) => {
    const body = v.osc("sine", f), over = v.osc("sine", f * bright), g = v.gain(), og = v.gain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    og.gain.setValueAtTime(0.0001, at);
    og.gain.exponentialRampToValueAtTime(level * 0.28, at + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.35);
    body.connect(g); over.connect(og); g.connect(out); og.connect(out);
    body.start(at); over.start(at); body.stop(at + dur + 0.02); over.stop(at + dur + 0.02);
  };
  /** A soft air burst through a moving band-pass filter. */
  const air = (at: number, dur: number, from: number, to: number, level: number) => {
    const n = v.noise(dur), bp = v.filter("bandpass", from, 1.1), g = v.gain();
    bp.frequency.exponentialRampToValueAtTime(to, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(level, at + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    n.connect(bp); bp.connect(g); g.connect(out);
    n.start(at); n.stop(at + dur + 0.02);
  };
  activeVoices++;
  try {
    switch (type) {
      case "click": {
        // A woody tick: tiny noise transient plus a damped high mallet.
        const n = v.noise(0.03), hp = v.filter("highpass", 2400), g = v.gain();
        g.gain.setValueAtTime(0.09, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
        n.connect(hp); hp.connect(g); g.connect(out);
        n.start(now); n.stop(now + 0.03);
        mallet(1760, now, 0.05, 0.035, 2.1);
        break;
      }
      case "tab":
        mallet(988, now, 0.09, 0.05, 2.0);
        break;
      case "nav":
        air(now, 0.16, 900, 2600, 0.035);
        mallet(784, now + 0.03, 0.12, 0.035, 2.0);
        break;
      case "toggle":
        mallet(1318.5, now, 0.06, 0.05, 1.5);
        mallet(1760, now + 0.035, 0.08, 0.04, 1.5);
        break;
      case "pop": {
        const o = v.osc("sine", 520), g = v.gain();
        o.frequency.exponentialRampToValueAtTime(1100, now + 0.05);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        o.connect(g); g.connect(out); o.start(now); o.stop(now + 0.1);
        break;
      }
      case "sheetOpen":
        air(now, 0.22, 600, 2400, 0.04);
        mallet(659.25, now + 0.05, 0.18, 0.03, 2.0);
        break;
      case "sheetClose":
        air(now, 0.16, 2000, 700, 0.03);
        break;
      case "launch": {
        // A warm swell: low fifth blooming through an opening filter, then a rising C-E-G-C.
        const lp = v.filter("lowpass", 400, 0.9), g = v.gain();
        lp.frequency.exponentialRampToValueAtTime(3200, now + 0.5);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.09, now + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
        for (const f of [130.81, 196.0, 261.63]) {
          const o = v.osc("triangle", f);
          o.detune.setValueAtTime(f === 196 ? 4 : -3, now);
          o.connect(lp); o.start(now); o.stop(now + 1.15);
        }
        lp.connect(g); g.connect(out);
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => mallet(f, now + 0.12 + i * 0.075, 0.5, 0.045));
        air(now, 0.6, 400, 3000, 0.02);
        break;
      }
      case "installed":
      case "success":
        mallet(659.25, now, 0.5, 0.06);
        mallet(987.77, now + 0.09, 0.65, 0.065);
        if (type === "success") mallet(1318.5, now + 0.18, 0.7, 0.045);
        break;
      case "error": {
        const o = v.osc("sine", 220), g = v.gain();
        o.frequency.exponentialRampToValueAtTime(150, now + 0.25);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        o.connect(g); g.connect(out); o.start(now); o.stop(now + 0.32);
        mallet(196, now + 0.12, 0.3, 0.04, 1.5);
        break;
      }
    }
  } catch {
    sources.forEach((s) => { try { s.stop(); } catch { /* not started */ } });
  } finally {
    let remaining = sources.length;
    const release = () => { nodes.forEach((n) => n.disconnect()); activeVoices = Math.max(0, activeVoices - 1); };
    if (!remaining) release();
    else sources.forEach((s) => s.addEventListener("ended", () => { if (--remaining === 0) release(); }, { once: true }));
  }
}
