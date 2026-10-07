// A pixel scene in an element: sized to it, crisp at any DPI (drawn at a low texel resolution and
// scaled up without smoothing), animated at ~15 fps only while it's on screen, visible, allowed to
// move, and not under a running game. Never follows the pointer.
import { useEffect, useRef } from "react";
import type { SceneTime } from "../v17/art";
import { sceneTime } from "../v17/art";
import { biomeFor, buildScene, drawScene, type Biome } from "./pixel";

export default function PixelScene({ seed, biome, time, animate = false, className = "", onGround }: {
  seed: string;
  biome?: Biome | "auto";
  time?: SceneTime | "auto";
  animate?: boolean;
  className?: string;
  /** Called with the flat ground's height from the bottom, in CSS pixels. */
  onGround?: (px: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const groundCb = useRef(onGround);
  groundCb.current = onGround;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const b: Biome = !biome || biome === "auto" ? biomeFor(seed) : biome;
    const t: SceneTime = !time || time === "auto" ? sceneTime() : time;
    let scene: ReturnType<typeof buildScene> | null = null, scale = 1;
    let frame = 0, last = 0, visible = true;
    const start = performance.now();
    const build = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      // One texel is 2–5 CSS px depending on size, so blocks read the same on covers and banners.
      scale = Math.max(2, Math.min(5, w / 300));
      const tw = Math.max(48, Math.round(w / scale)), th = Math.max(28, Math.round(h / scale));
      scene = buildScene(seed, b, t, tw, th);
      el.width = tw; el.height = th;
      groundCb.current?.(scene.ground * (h / th));
      drawScene(ctx, scene, (performance.now() - start) / 1000, !animate);
    };
    const moving = () => animate && visible && !document.hidden && document.documentElement.dataset.motion === "full" && document.documentElement.dataset.motionPaused !== "true";
    const loop = (now: number) => {
      frame = 0;
      if (!scene || !moving()) return;
      if (now - last >= 66) { last = now; drawScene(ctx, scene, (now - start) / 1000, false); }
      frame = requestAnimationFrame(loop);
    };
    const kick = () => { if (!frame && moving()) frame = requestAnimationFrame(loop); };
    build();
    kick();
    const ro = new ResizeObserver(() => { build(); kick(); });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
    io.observe(el);
    const mo = new MutationObserver(kick);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion", "data-motion-paused"] });
    document.addEventListener("visibilitychange", kick);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); mo.disconnect(); document.removeEventListener("visibilitychange", kick); };
  }, [seed, biome, time, animate]);
  return <canvas ref={ref} className={`v19-pixel ${className}`} aria-hidden="true" />;
}
