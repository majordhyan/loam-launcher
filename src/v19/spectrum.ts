// Spectrum maths for the music visualizer (1.9). Real levels come only from audio LOAM plays itself
// (files from this PC, through Web Audio's AnalyserNode); nothing here listens to other apps.

/** Frame-rate independent smoothing: the share of the gap to close after `dt` ms with time constant `tau` ms. */
export function ease(dt: number, tau: number) {
  if (!(dt > 0)) return 0;
  if (!(tau > 0)) return 1;
  return 1 - Math.exp(-dt / tau);
}

/** Moves `shown` toward `target`: quick to rise (attack), slower to fall (release). */
export function smooth(shown: Float32Array, target: ArrayLike<number>, dt: number, attack = 45, release = 220) {
  const up = ease(dt, attack), down = ease(dt, release);
  let moving = false;
  for (let i = 0; i < shown.length; i++) {
    const t = target[i] ?? 0;
    const next = shown[i] + (t - shown[i]) * (t > shown[i] ? up : down);
    if (Math.abs(next - shown[i]) > 0.002) moving = true;
    shown[i] = next;
  }
  return moving;
}

/**
 * Groups FFT bins (byte magnitudes, as `getByteFrequencyData` gives) into `bars` log-spaced bands
 * from `lo` to `hi` Hz, each 0–1. Each band takes the loudest bin it covers, so narrow low bands
 * still get a value.
 */
export function bands(bins: ArrayLike<number>, sampleRate: number, bars: number, lo = 40, hi = 14000) {
  const out = new Float32Array(bars);
  const n = bins.length;
  if (!n || !(sampleRate > 0) || bars < 1) return out;
  const hz = sampleRate / 2 / n; // width of one bin
  const top = Math.min(hi, sampleRate / 2);
  for (let b = 0; b < bars; b++) {
    const f0 = lo * (top / lo) ** (b / bars), f1 = lo * (top / lo) ** ((b + 1) / bars);
    const i0 = Math.min(n - 1, Math.floor(f0 / hz)), i1 = Math.min(n - 1, Math.max(i0, Math.ceil(f1 / hz) - 1));
    let peak = 0;
    for (let i = i0; i <= i1; i++) peak = Math.max(peak, bins[i] || 0);
    // Gentle lift for the treble, which is naturally quieter.
    out[b] = Math.min(1, (peak / 255) * (0.85 + 0.3 * (b / Math.max(1, bars - 1))));
  }
  return out;
}
