// LOAM 1.7 art: seeded landscapes for game covers and the Home scene, and loader glyphs.
// Everything is drawn here from the LOAM palette; no third-party or Minecraft artwork.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import PixelScene from "../v19/PixelScene";
import type { Biome } from "../v19/pixel";

export function seeded(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (n: number) => {
    let x = (h + Math.imul(n + 1, 0x9e3779b1)) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };
}

/** A smooth ridge line across `w`, as an SVG path closed to the bottom. */
function ridge(rand: (n: number) => number, salt: number, w: number, h: number, base: number, amp: number, points = 6, loop = false) {
  const step = w / points;
  const ys = Array.from({ length: points + 1 }, (_, i) => base + (rand(salt + i) - 0.5) * 2 * amp);
  // A looping ridge ends where it starts, so two copies side by side join without a step.
  if (loop) ys[points] = ys[0];
  let d = `M0 ${h} L0 ${ys[0].toFixed(1)}`;
  for (let i = 0; i < points; i++) {
    const x0 = i * step, x1 = (i + 1) * step;
    d += ` C${(x0 + step * 0.5).toFixed(1)} ${ys[i].toFixed(1)} ${(x1 - step * 0.5).toFixed(1)} ${ys[i + 1].toFixed(1)} ${x1.toFixed(1)} ${ys[i + 1].toFixed(1)}`;
  }
  return `${d} L${w} ${h} Z`;
}

export type LoaderKind = "vanilla" | "fabric" | "quilt";
export const loaderKind = (loader: string | null): LoaderKind =>
  !loader ? "vanilla" : loader.startsWith("quilt:") ? "quilt" : "fabric";

const palettes: Record<LoaderKind, { sky: [string, string]; sun: string; layers: string[] }> = {
  // Morning field: paper sky, sand and clay hills.
  vanilla: { sky: ["#f6efe3", "#ead9c6"], sun: "#fff6ea", layers: ["#dcc6ad", "#c9a98a", "#b0876a", "#8a634b", "#5c4234"] },
  // Terracotta dusk.
  fabric: { sky: ["#f3c9a8", "#d9805a"], sun: "#fff1df", layers: ["#c96f49", "#b05a39", "#924529", "#6e321f", "#3f2219"] },
  // Clay night.
  quilt: { sky: ["#3a2a2a", "#7a4334"], sun: "#f3d6bf", layers: ["#7d4635", "#64382c", "#4b2c24", "#35211c", "#211715"] },
};

/** Cover art for a game: its own still pixel landscape (biome chosen from the game's id). */
export function GameCover({ seed, version, className = "", showVersion = true, biome, time }: {
  seed: string; loader: string | null; version?: string; className?: string; showVersion?: boolean; biome?: Biome | "auto"; time?: SceneTime | "auto";
}) {
  return (
    <span className={`v17-cover v19-cover ${className}`} aria-hidden="true">
      <PixelScene seed={seed} biome={biome} time={time || "day"} />
      {showVersion && version && <span className="v19-cover-version">{version}</span>}
    </span>
  );
}

/** Small glyphs for each game type; drawn for LOAM, not the projects' own logos. */
export function LoaderGlyph({ loader, size = 16 }: { loader: string | null; size?: number }) {
  const kind = loaderKind(loader);
  const s = { width: size, height: size } as CSSProperties;
  if (kind === "fabric")
    // A woven thread.
    return (
      <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M4 16c4-8 8 8 16 0" /><path d="M4 8c4 8 8-8 16 0" />
      </svg>
    );
  if (kind === "quilt")
    // A patchwork square.
    return (
      <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="3.5" />
      </svg>
    );
  // A plain block.
  return (
    <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </svg>
  );
}

export const loaderName = (loader: string | null) => {
  const k = loaderKind(loader);
  return k === "vanilla" ? "Vanilla" : k === "fabric" ? "Fabric" : "Quilt";
};

export type SceneTime = "dawn" | "day" | "dusk" | "night";
export const sceneTime = (d = new Date()): SceneTime => {
  const h = d.getHours() + d.getMinutes() / 60;
  return h < 5 ? "night" : h < 8 ? "dawn" : h < 17 ? "day" : h < 20.5 ? "dusk" : "night";
};
const times: Record<SceneTime, { sky: [string, string, string]; sun: string; sunY: number; haze: string; layers: string[] }> = {
  dawn: { sky: ["#c9b3c4", "#f2c6a8", "#f7dcc4"], sun: "#fff1e0", sunY: 300, haze: "#f4d2bb", layers: ["#d8a88b", "#c08368", "#a0644f", "#78473a", "#4a2c25"] },
  day: { sky: ["#e2bfa6", "#efd3bb", "#f8e8d6"], sun: "#fffaf1", sunY: 118, haze: "#f1e2cf", layers: ["#d9c1a6", "#c6a383", "#ad8565", "#87624b", "#593f31"] },
  dusk: { sky: ["#8f4a3a", "#e08a5f", "#f6c8a2"], sun: "#ffeedd", sunY: 250, haze: "#f0a77f", layers: ["#c96f49", "#b05a39", "#924529", "#6e321f", "#3f2219"] },
  night: { sky: ["#1a1418", "#3a2622", "#80473a"], sun: "#f6ead8", sunY: 140, haze: "#8a4c3c", layers: ["#7d4a3b", "#663e32", "#4f3128", "#38241e", "#231816"] },
};

/**
 * The Home scene: a layered landscape that follows the time of day. Hills drift and follow
 * the pointer, clouds pass, the sun's rays turn slowly, haze sits between the ridges; birds
 * cross in daylight and fireflies and stars come out at night. Everything holds still when
 * motion is reduced or a game is running.
 */
export function HeroScene({ seed, image, time }: { seed: string; loader?: string | null; image?: string | null; time?: SceneTime }) {
  const host = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState<SceneTime>(() => time ?? sceneTime());
  useEffect(() => {
    if (time) return setNow(time);
    const t = window.setInterval(() => setNow(sceneTime()), 60_000);
    return () => window.clearInterval(t);
  }, [time]);
  const p = times[now];
  const night = now === "night";
  const r = seeded(seed + "scene");
  // Parallax: the pointer sets a target; one animation loop eases every layer toward it and
  // writes transforms directly (no CSS transitions to restart, no style recalculation of the
  // whole scene). The loop sleeps as soon as everything has settled.
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const sunRef = useRef<SVGGElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let tx = 0, ty = 0, x = 0, y = 0, gx = 0.5, gy = 0.4, tgx = 0.5, tgy = 0.4, w = 0, h = 0, frame = 0, inside = false;
    const step = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      gx += (tgx - gx) * 0.12;
      gy += (tgy - gy) * 0.12;
      layers.current.forEach((l, i) => {
        if (l) l.style.transform = `translate3d(${(-x * (i + 1) * 14).toFixed(2)}px, ${(-y * (i + 1) * 6).toFixed(2)}px, 0)`;
      });
      if (sunRef.current) sunRef.current.style.transform = `translate3d(${(x * 22).toFixed(2)}px, ${(y * 12).toFixed(2)}px, 0)`;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${(gx * w).toFixed(1)}px, ${(gy * h).toFixed(1)}px, 0)`;
        glowRef.current.style.opacity = inside ? "1" : "0";
      }
      const settled = Math.abs(tx - x) < 0.001 && Math.abs(ty - y) < 0.001 && Math.abs(tgx - gx) < 0.001 && Math.abs(tgy - gy) < 0.001;
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    const kick = () => { if (!frame) frame = requestAnimationFrame(step); };
    const move = (e: PointerEvent) => {
      if (document.documentElement.dataset.motion !== "full") return;
      const b = el.getBoundingClientRect();
      if (!b.width) return;
      w = el.offsetWidth; h = el.offsetHeight; // layout px, so interface zoom does not skew the glow
      const nx = (e.clientX - b.left) / b.width, ny = (e.clientY - b.top) / b.height;
      tx = Math.max(-0.6, Math.min(0.6, nx - 0.5));
      ty = Math.max(-0.6, Math.min(0.6, ny - 0.5));
      inside = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;
      if (inside) { tgx = nx; tgy = ny; }
      kick();
    };
    const leave = () => { tx = 0; ty = 0; inside = false; kick(); };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => { window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); cancelAnimationFrame(frame); };
  }, []);
  const W = 1600, H = 600;
  const sunX = W * 0.54;
  const uid = `s${seed.replace(/[^a-z0-9]/gi, "").slice(0, 8)}${now}`;
  const ridgeAt = (i: number) => ridge(r, 20 + i * 13, W, H, 250 + i * 72, 60 - i * 7, 5, true);
  return (
    <div className={`v17-scene v17-time-${now}`} ref={host} aria-hidden="true">
      {image ? (
        <div className="v17-scene-image" style={{ backgroundImage: `url("${image.replace(/"/g, "%22")}")` }} />
      ) : (
        <>
          <svg className="v17-scene-sky" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id={`${uid}k`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={p.sky[0]} />
                <stop offset="0.55" stopColor={p.sky[1]} />
                <stop offset="1" stopColor={p.sky[2]} />
              </linearGradient>
              <radialGradient id={`${uid}g`}>
                <stop offset="0" stopColor={p.sun} stopOpacity="0.95" />
                <stop offset="0.3" stopColor={p.sun} stopOpacity="0.32" />
                <stop offset="1" stopColor={p.sun} stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width={W} height={H} fill={`url(#${uid}k)`} />
            {(night || now === "dawn") &&
              Array.from({ length: night ? 90 : 25 }, (_, i) => (
                <circle key={i} className="v17-star" style={{ animationDelay: `${(r(500 + i) * 6).toFixed(2)}s` }}
                  cx={r(300 + i) * W} cy={r(400 + i) * 320} r={r(600 + i) * 1.6 + 0.4} fill="#f8f1e6" opacity={night ? 0.9 : 0.35} />
              ))}
            <g ref={sunRef} className="v18-sun-shift">
              <g className="v17-sun">
              <circle cx={sunX} cy={p.sunY} r="300" fill={`url(#${uid}g)`} />
              <circle cx={sunX} cy={p.sunY} r={night ? 30 : 46} fill={p.sun} />
              {night && (
                <g fill="#d9c8b4" opacity="0.55">
                  <circle cx={sunX - 9} cy={p.sunY - 6} r={6} />
                  <circle cx={sunX + 10} cy={p.sunY + 8} r={4} />
                  <circle cx={sunX + 4} cy={p.sunY - 13} r={2.5} />
                </g>
              )}
              </g>
            </g>
          </svg>
          {night && <div className="v18-meteors">{[0, 1, 2].map((i) => <i key={i} style={{ left: `${(20 + r(2100 + i) * 60).toFixed(1)}%`, top: `${(4 + r(2200 + i) * 22).toFixed(1)}%`, animationDelay: `${(i * 7 + r(2300 + i) * 6).toFixed(1)}s` }} />)}</div>}
          <div className="v18-glow" ref={glowRef} />
          {!night && <div className="v17-rays" style={{ "--sx": `${(sunX / W) * 100}%`, "--sy": `${(p.sunY / H) * 100}%` } as CSSProperties} />}
          <svg className="v17-clouds" viewBox={`0 0 ${W * 2} ${H}`} preserveAspectRatio="none">
            <defs><filter id={`${uid}b`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter></defs>
            {Array.from({ length: 7 }, (_, i) => (
              <ellipse key={i} filter={`url(#${uid}b)`} cx={r(1200 + i) * W * 2} cy={60 + r(1300 + i) * 170} rx={120 + r(1400 + i) * 160} ry={18 + r(1500 + i) * 22}
                fill={night ? "#6b4a40" : "#fff8ef"} opacity={night ? 0.25 : 0.55} />
            ))}
          </svg>
          {p.layers.map((fill, i) => (
            // Each layer is two tiles wide so the drift loops without a seam; a haze gradient sits on each ridge.
            <div key={i} className="v18-parallax" ref={(el) => { layers.current[i] = el; }} style={{ zIndex: i + 1 }}>
            <svg className="v17-layer" style={{ "--depth": i } as CSSProperties}
              viewBox={`0 0 ${W * 2} ${H}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id={`${uid}h${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={p.haze} stopOpacity={Math.max(0, 0.45 - i * 0.09)} />
                  <stop offset="0.35" stopColor={p.haze} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, W - 0.5].map((x) => (
                <g key={x} transform={`translate(${x} 0)`}>
                  <path d={ridgeAt(i)} fill={fill} />
                  <path d={ridgeAt(i)} fill={`url(#${uid}h${i})`} />
                </g>
              ))}
            </svg>
            </div>
          ))}
          {!night && (
            <div className="v17-birds">
              {[0, 1, 2].map((i) => (
                <svg key={i} viewBox="0 0 24 10" style={{ top: `${14 + r(1600 + i) * 18}%`, animationDelay: `${-(r(1700 + i) * 30).toFixed(1)}s`, animationDuration: `${(26 + r(1800 + i) * 14).toFixed(1)}s`, width: `${(12 + r(1900 + i) * 8).toFixed(0)}px` }}>
                  <path d="M1 7 Q6 1 12 6 Q18 1 23 7" fill="none" stroke={now === "dusk" ? "#4a2418" : "#6f5a4c"} strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ))}
            </div>
          )}
          <div className={`v17-motes ${night ? "fireflies" : ""}`}>
            {Array.from({ length: night ? 28 : 22 }, (_, i) => (
              <i key={i} style={{
                left: `${(r(700 + i) * 100).toFixed(1)}%`, top: `${((night ? 50 : 30) + r(800 + i) * (night ? 45 : 60)).toFixed(1)}%`,
                animationDelay: `${(-r(900 + i) * 14).toFixed(2)}s`, animationDuration: `${(10 + r(1000 + i) * 10).toFixed(1)}s`,
                width: `${(2 + r(1100 + i) * 3).toFixed(1)}px`, height: `${(2 + r(1100 + i) * 3).toFixed(1)}px`,
              }} />
            ))}
          </div>
        </>
      )}
      <div className="v17-scene-shade" />
    </div>
  );
}
