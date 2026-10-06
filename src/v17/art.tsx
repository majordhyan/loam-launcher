// LOAM 1.7 art: seeded landscapes for game covers and the Home scene, and loader glyphs.
// Everything is drawn here from the LOAM palette; no third-party or Minecraft artwork.
import { useEffect, useRef, type CSSProperties } from "react";

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

/** Cover art for a game: seeded hills, a sun or moon, and the loader's palette. */
export function GameCover({ seed, loader, version, className = "", showVersion = true }: {
  seed: string; loader: string | null; version?: string; className?: string; showVersion?: boolean;
}) {
  const kind = loaderKind(loader);
  const p = palettes[kind];
  const r = seeded(seed);
  const W = 320, H = 180;
  const sunX = 60 + r(1) * 200, sunY = 40 + r(2) * 30;
  const id = `c${seed.replace(/[^a-z0-9]/gi, "").slice(0, 12)}${kind}`;
  return (
    <svg className={`v17-cover ${className}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={p.sun} stopOpacity="0.9" />
          <stop offset="1" stopColor={p.sun} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}s)`} />
      {kind === "quilt" &&
        Array.from({ length: 14 }, (_, i) => (
          <circle key={i} cx={r(40 + i) * W} cy={r(60 + i) * 80} r={r(80 + i) * 1.1 + 0.4} fill="#f4f3ee" opacity={0.5 + r(90 + i) * 0.4} />
        ))}
      <circle cx={sunX} cy={sunY} r="46" fill={`url(#${id}g)`} />
      <circle cx={sunX} cy={sunY} r={kind === "quilt" ? 11 : 15} fill={p.sun} />
      {p.layers.map((fill, i) => (
        <path key={i} d={ridge(r, 10 + i * 9, W, H, 82 + i * 20, 16 - i * 1.5)} fill={fill} />
      ))}
      <path d={ridge(r, 200, W, H, 168, 4)} fill="none" stroke="#f4f3ee" strokeOpacity="0.16" strokeWidth="1.2" />
      {showVersion && version && (
        <text x={W - 14} y={H - 14} textAnchor="end" className="v17-cover-version" fill="#f4f3ee">{version}</text>
      )}
    </svg>
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

/**
 * The Home scene: a layered landscape that drifts slowly, follows the pointer a little,
 * and carries floating motes. Static when motion is reduced or a game is running.
 */
export function HeroScene({ seed, loader, image }: { seed: string; loader: string | null; image?: string | null }) {
  const host = useRef<HTMLDivElement>(null);
  const kind = loaderKind(loader);
  const p = palettes[kind];
  const r = seeded(seed + "scene");
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      if (document.documentElement.dataset.motion !== "full") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const b = el.getBoundingClientRect();
        el.style.setProperty("--px", ((e.clientX - b.left) / b.width - 0.5).toFixed(3));
        el.style.setProperty("--py", ((e.clientY - b.top) / b.height - 0.5).toFixed(3));
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(frame); };
  }, []);
  const W = 1600, H = 600;
  return (
    <div className={`v17-scene v17-scene-${kind}`} ref={host} aria-hidden="true">
      {image ? (
        <div className="v17-scene-image" style={{ backgroundImage: `url("${image.replace(/"/g, "%22")}")` }} />
      ) : (
        <>
          <svg className="v17-scene-sky" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="v17sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={p.sky[0]} />
                <stop offset="1" stopColor={p.sky[1]} />
              </linearGradient>
              <radialGradient id="v17sun">
                <stop offset="0" stopColor={p.sun} stopOpacity="0.95" />
                <stop offset="0.35" stopColor={p.sun} stopOpacity="0.35" />
                <stop offset="1" stopColor={p.sun} stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width={W} height={H} fill="url(#v17sky)" />
            {kind === "quilt" &&
              Array.from({ length: 60 }, (_, i) => (
                <circle key={i} className="v17-star" style={{ animationDelay: `${(r(500 + i) * 6).toFixed(2)}s` }}
                  cx={r(300 + i) * W} cy={r(400 + i) * 300} r={r(600 + i) * 1.6 + 0.5} fill="#f4f3ee" />
              ))}
            <g className="v17-sun">
              <circle cx={W * 0.68} cy={190} r="260" fill="url(#v17sun)" />
              <circle cx={W * 0.68} cy={190} r={kind === "quilt" ? 34 : 46} fill={p.sun} />
            </g>
          </svg>
          {p.layers.map((fill, i) => (
            // Each layer is two tiles wide so the drift loops without a seam.
            <svg key={i} className="v17-layer" style={{ "--depth": i, zIndex: i + 1 } as CSSProperties}
              viewBox={`0 0 ${W * 2} ${H}`} preserveAspectRatio="none">
              <path d={ridge(r, 20 + i * 13, W, H, 250 + i * 72, 60 - i * 7, 5, true)} fill={fill} />
              <path transform={`translate(${W - 0.5} 0)`} d={ridge(r, 20 + i * 13, W, H, 250 + i * 72, 60 - i * 7, 5, true)} fill={fill} />
            </svg>
          ))}
          <div className="v17-motes">
            {Array.from({ length: 22 }, (_, i) => (
              <i key={i} style={{
                left: `${(r(700 + i) * 100).toFixed(1)}%`, top: `${(30 + r(800 + i) * 60).toFixed(1)}%`,
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
