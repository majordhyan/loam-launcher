// Minimal real-time bars for the music player. Levels come from audioviz.rs (Windows loopback:
// loudness per pitch band, measured on this PC, nothing recorded). One shared subscription; the
// capture runs only while a visualizer is on screen and the window is visible.
import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { call, native } from "../api";

const BANDS = 28;
const latest = { v: new Array<number>(BANDS).fill(0), at: 0 };
let users = 0;
let stopListen: (() => void) | null = null;
async function acquire() {
  if (users++ > 0 || !native) return;
  const off = await listen<number[]>("audio-levels", (e) => { latest.v = e.payload; latest.at = performance.now(); });
  if (users === 0) { off(); return; }
  stopListen = off;
  void call("visualizer", { on: true }).catch(() => {});
}
function release() {
  if (--users > 0 || !native) return;
  stopListen?.();
  stopListen = null;
  latest.v = new Array<number>(BANDS).fill(0);
  void call("visualizer", { on: false }).catch(() => {});
}

/**
 * Thin capsules mirrored around a centre line, one colour (CSS `color`), no peaks. Silence settles
 * into a calm row of dots and the loop stops drawing until levels move again. `demo` animates
 * without the desktop app (browser preview only).
 */
export default function Visualizer({ bars = 24, className = "", demo = false }: { bars?: number; className?: string; demo?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let held = false;
    const hold = () => { if (!held && !document.hidden) { held = true; void acquire(); } };
    const drop = () => { if (held) { held = false; release(); } };
    const vis = () => (document.hidden ? drop() : hold());
    hold();
    document.addEventListener("visibilitychange", vis);
    const shown = new Float32Array(bars);
    let frame = 0, size = { w: 0, h: 0 }, settled = false;
    const ro = new ResizeObserver(() => { size = { w: el.clientWidth, h: el.clientHeight }; settled = false; });
    ro.observe(el);
    const draw = (t: number) => {
      frame = requestAnimationFrame(draw);
      const { w, h } = size;
      if (!w || !h || document.hidden) return;
      const fresh = demo || performance.now() - latest.at < 400;
      if (!fresh && settled) return; // nothing playing and the dots are drawn: idle
      const dpr = window.devicePixelRatio || 1;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
      const ctx = el.getContext("2d");
      if (!ctx) return;
      let moving = false;
      for (let i = 0; i < bars; i++) {
        let target = 0;
        if (demo) {
          target = 0.45 + 0.3 * Math.sin(t / 420 + i * 0.55) * Math.sin(t / 1100 + i * 0.21) + 0.2 * Math.sin(t / 190 + i * 1.7) ** 2;
        } else if (fresh) {
          const pos = 1 + (i / Math.max(1, bars - 1)) * (BANDS - 2);
          const a = Math.floor(pos), f = pos - a;
          target = (((latest.v[a] || 0) * (1 - f) + (latest.v[a + 1] || 0) * f) / 255) * (0.85 + 0.3 * (i / bars));
        }
        target = Math.max(0, Math.min(1, target));
        const next = shown[i] + (target - shown[i]) * (target > shown[i] ? 0.45 : 0.12);
        if (Math.abs(next - shown[i]) > 0.002) moving = true;
        shown[i] = next;
      }
      settled = !moving && !fresh;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const step = w / bars;
      const bw = Math.max(2, Math.min(4, step * 0.42));
      ctx.fillStyle = getComputedStyle(el).color || "#c15f3c";
      for (let i = 0; i < bars; i++) {
        const x = i * step + (step - bw) / 2;
        const bh = Math.max(bw, shown[i] * h);
        ctx.globalAlpha = 0.3 + 0.7 * Math.min(1, shown[i] * 1.4);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, (h - bh) / 2, bw, bh, bw / 2);
        else ctx.rect(x, (h - bh) / 2, bw, bh);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); document.removeEventListener("visibilitychange", vis); drop(); };
  }, [bars, demo]);
  return <canvas ref={canvas} className={`v19-viz ${className}`} aria-hidden="true" />;
}
