// The music visualizer (1.9). Three modes, all honest about what they show:
//   Off.
//   Minimal: a small "playing" indicator that follows play/pause only, not the sound.
//   Spectrum: real levels, but only for audio LOAM plays itself (files from this PC), read from
//     Web Audio's analyser. YouTube's player is a sealed frame and other apps' sound is theirs, so
//     those fall back to the minimal indicator; LOAM never captures system audio.
// Drawn at about 30 fps with frame-rate independent smoothing; stops drawing when idle or hidden.
import { useEffect, useRef } from "react";
import { bands, smooth } from "./spectrum";
import type { VizMode } from "./music";

type Props = { mode: VizMode; playing: boolean; analyser?: AnalyserNode | null; bars?: number; className?: string; label?: boolean };

const AMBIENT = "Ambient animation: it follows play and pause, not the sound";
const LIVE = "Live spectrum of the file that's playing";

/** `label` adds a small "Live" or "Ambient" tag, so it's always clear whether the bars react to the sound. */
export default function Visualizer({ mode, playing, analyser = null, bars = 24, className = "", label = false }: Props) {
  if (mode === "off") return null;
  const live = mode === "spectrum" && !!analyser;
  const viz = live ? <Spectrum analyser={analyser} playing={playing} bars={bars} className={className} /> : <Indicator playing={playing} bars={mode === "minimal" ? 5 : bars} className={className} />;
  if (!label) return viz;
  return (
    <span className="v19-viz-labelled">
      {viz}
      <span className={`v19-viz-tag ${live ? "is-live" : ""}`} title={live ? LIVE : AMBIENT}>{live ? "Live" : "Ambient"}</span>
    </span>
  );
}

// Fixed per-bar timings (a cheap hash), so bars move out of step like an equalizer but never jump
// between renders.
const timing = (i: number) => ({ "--d": `${0.55 + ((i * 37) % 23) / 30}s`, "--delay": `${-((i * 53) % 17) / 10}s`, "--lo": `${0.18 + ((i * 29) % 11) / 40}` });

/**
 * A playing indicator for sound LOAM can't measure (YouTube's sealed player, other apps): bars
 * that move while music plays and settle into a calm line when it stops. It follows play/pause,
 * not the music itself; files get the real spectrum above.
 */
function Indicator({ playing, bars, className }: { playing: boolean; bars: number; className: string }) {
  return (
    <span className={`v19-viz-min ${playing ? "is-playing" : ""} ${className}`} role="img" aria-label={playing ? `Playing. ${AMBIENT}.` : "Paused"} title={AMBIENT}>
      {Array.from({ length: bars }, (_, i) => <i key={i} style={timing(i) as React.CSSProperties} />)}
    </span>
  );
}

function Spectrum({ analyser, playing, bars, className }: { analyser: AnalyserNode; playing: boolean; bars: number; className: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const shown = new Float32Array(bars);
    let raf = 0, last = 0, size = { w: el.clientWidth, h: el.clientHeight }, settled = false;
    const ro = new ResizeObserver(() => { size = { w: el.clientWidth, h: el.clientHeight }; settled = false; });
    ro.observe(el);
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || t - last < 31) return; // ~30 fps
      const dt = last ? Math.min(100, t - last) : 33;
      last = t;
      const { w, h } = size;
      if (!w || !h) return;
      let target: ArrayLike<number> = new Float32Array(bars);
      if (playing) { analyser.getByteFrequencyData(bins); target = bands(bins, analyser.context.sampleRate, bars); }
      const moving = smooth(shown, target, dt);
      if (!moving && settled) return;
      settled = !moving;
      const dpr = window.devicePixelRatio || 1;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const step = w / bars, bw = Math.max(2, Math.min(4, step * 0.42));
      ctx.fillStyle = getComputedStyle(el).color || "#c15f3c";
      for (let i = 0; i < bars; i++) {
        const x = i * step + (step - bw) / 2, bh = Math.max(bw, shown[i] * h);
        ctx.globalAlpha = 0.3 + 0.7 * Math.min(1, shown[i] * 1.4);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, (h - bh) / 2, bw, bh, bw / 2);
        else ctx.rect(x, (h - bh) / 2, bw, bh);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [analyser, playing, bars]);
  return <canvas ref={canvas} className={`v19-viz is-live ${className}`} role="img" aria-label={LIVE} title={LIVE} />;
}
