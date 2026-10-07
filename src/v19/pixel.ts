// LOAM pixel scenes (1.9): blocky landscapes drawn in the style of a voxel world, generated from a
// seed. Every texture here is LOAM's own: colours and noise, no game or third-party artwork.
//
// A scene is built once for a size (terrain, trees, flowers, textures baked into two offscreen
// canvases) and then drawn cheaply each frame: sky, drifting clouds, the baked terrain, and a few
// particles (fireflies, petals, leaves, snow) plus water shimmer.
import { seeded, type SceneTime } from "../v17/art";

export type Biome = "meadow" | "birch" | "taiga" | "desert" | "cherry" | "shore";
export const BIOMES: { id: Biome; name: string }[] = [
  { id: "meadow", name: "Meadow" },
  { id: "birch", name: "Birch forest" },
  { id: "taiga", name: "Snowy taiga" },
  { id: "desert", name: "Desert" },
  { id: "cherry", name: "Cherry grove" },
  { id: "shore", name: "Sea shore" },
];
export const biomeFor = (seed: string): Biome => BIOMES[Math.floor(seeded(seed)(7) * BIOMES.length)].id;

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const css = ([r, g, b]: Rgb, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

type Palette = { top: string[]; soil: string[]; trunk: string[]; leaves: string[]; tree: "oak" | "birch" | "spruce" | "cactus" | "cherry"; flowers: string[]; water?: boolean; snow?: boolean };
const PALETTES: Record<Biome, Palette> = {
  meadow: { top: ["#5f9e3a", "#6db044", "#548f32", "#7cbd4d"], soil: ["#866043", "#795339", "#6b4a33", "#94694a"], trunk: ["#6b5134", "#5a432a", "#7a5d3e"], leaves: ["#4c8a2c", "#3f7a24", "#5b9a35", "#346b1e"], tree: "oak", flowers: ["#c9302c", "#f2d33a", "#5a73e0", "#f1f1ea"] },
  birch: { top: ["#6aa442", "#79b54c", "#5e9439", "#86c158"], soil: ["#866043", "#795339", "#6b4a33", "#94694a"], trunk: ["#e8e6df", "#d6d3c9", "#3b3a36"], leaves: ["#7da24c", "#6c9040", "#8fb35b", "#5f8237"], tree: "birch", flowers: ["#f2d33a", "#f1f1ea", "#c9302c"] },
  taiga: { top: ["#f3f7fa", "#e4ecf1", "#d6e1e8", "#ffffff"], soil: ["#6f5440", "#5f4636", "#7c5f48", "#53402f"], trunk: ["#4d3a26", "#3d2e1e", "#5a4430"], leaves: ["#3c5c3f", "#304f34", "#476a4a", "#28432c"], tree: "spruce", flowers: [], snow: true },
  desert: { top: ["#ddd09a", "#e6daa8", "#d1c38b", "#ece2b6"], soil: ["#d4c48a", "#c9b87d", "#dccd97", "#bfae72"], trunk: ["#5b8a2f", "#4c7a26", "#6b9b3a"], leaves: [], tree: "cactus", flowers: ["#8a5a2b"] },
  cherry: { top: ["#6aa442", "#77b24b", "#5f9a3c", "#84bf55"], soil: ["#866043", "#795339", "#6b4a33", "#94694a"], trunk: ["#4a2e2a", "#3b2420", "#5a3833"], leaves: ["#f2a9c9", "#e78db6", "#f8c4dc", "#db7ba8"], tree: "cherry", flowers: ["#f8c4dc", "#f1f1ea"] },
  shore: { top: ["#ddd09a", "#e6daa8", "#d1c38b", "#ece2b6"], soil: ["#cdbd84", "#c2b178", "#d7c891", "#b8a76d"], trunk: ["#6b5134", "#5a432a", "#7a5d3e"], leaves: ["#4c8a2c", "#3f7a24", "#5b9a35", "#346b1e"], tree: "oak", flowers: ["#f2d33a"], water: true },
};

type Sky = { top: string; mid: string; low: string; sun: string; glow: string; tint: string; tintA: number; haze: number; cloud: string };
const SKIES: Record<SceneTime, Sky> = {
  dawn: { top: "#8f8fc4", mid: "#f0b4a6", low: "#fbd9b4", sun: "#fff3d6", glow: "#ffd9a8", tint: "#ffb38a", tintA: 0.12, haze: 0.38, cloud: "#fff1ea" },
  day: { top: "#6ea6e8", mid: "#9cc7f0", low: "#d6ecfb", sun: "#fffbe8", glow: "#fff4c2", tint: "#ffffff", tintA: 0, haze: 0.32, cloud: "#ffffff" },
  dusk: { top: "#6b5aa6", mid: "#f09a72", low: "#ffd29a", sun: "#fff0c8", glow: "#ffbe7a", tint: "#ff9a5a", tintA: 0.16, haze: 0.4, cloud: "#ffe2cf" },
  night: { top: "#0d1230", mid: "#1d2550", low: "#3a3c6a", sun: "#f1f1e2", glow: "#c8d0ff", tint: "#1a2150", tintA: 0.5, haze: 0.45, cloud: "#7a80a8" },
};

export type Scene = {
  w: number; h: number; time: SceneTime; biome: Biome;
  sky: HTMLCanvasElement; land: HTMLCanvasElement;
  clouds: { x: number; y: number; cells: [number, number][]; speed: number }[];
  stars: { x: number; y: number; p: number }[];
  particles: { x: number; y: number; vx: number; vy: number; p: number; c: string; kind: "firefly" | "petal" | "leaf" | "snow" }[];
  water: { x: number; y: number; w: number }[];
  /** Height of the flat ground at the right, in texels from the bottom, for placing a figure. */
  ground: number;
};

const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

/** Builds a scene `w`×`h` texels in size. Deterministic for the same seed, biome and time. */
export function buildScene(seed: string, biome: Biome, time: SceneTime, w: number, h: number): Scene {
  const r = seeded(`${seed}:${biome}`);
  const P = PALETTES[biome], S = SKIES[time];
  let salt = 1000;
  const rnd = () => r(salt++);
  const pick = <T,>(a: T[], k: number) => a[Math.floor(Math.abs(Math.sin(k * 12.9898 + salt) * 43758.5453) % 1 * a.length)];
  const noise = (x: number, y: number, k: number) => Math.abs(Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453) % 1;

  // ---------- sky (gradient bands, sun or moon, stars)
  const sky = canvas(w, h);
  const sx = sky.getContext("2d")!;
  const bands = Math.ceil(h / 3);
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const c = t < 0.55 ? mix(hex(S.top), hex(S.mid), t / 0.55) : mix(hex(S.mid), hex(S.low), (t - 0.55) / 0.45);
    sx.fillStyle = css(c);
    sx.fillRect(0, i * 3, w, 3);
  }
  const sunX = Math.round(w * (0.3 + rnd() * 0.25)), sunY = Math.round(h * (time === "day" ? 0.2 : time === "night" ? 0.22 : 0.5));
  const sunR = Math.max(4, Math.round(h * 0.07));
  for (let ring = 3; ring >= 1; ring--) {
    sx.fillStyle = css(hex(S.glow), 0.1 * (4 - ring));
    const g = sunR + ring * Math.max(3, Math.round(sunR * 0.6));
    sx.fillRect(sunX - g, sunY - g, g * 2, g * 2);
  }
  if (time === "dawn" || time === "dusk") {
    // Square rays, faint, fanned from the sun.
    sx.fillStyle = css(hex(S.glow), 0.08);
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI * 0.95 + (k / 6) * Math.PI * 0.9;
      for (let d = sunR * 2; d < w; d += 3) sx.fillRect(Math.round(sunX + Math.cos(a) * d), Math.round(sunY + Math.sin(a) * d * 0.6), 2, 2);
    }
  }
  sx.fillStyle = css(hex(S.sun));
  sx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  if (time === "night") {
    // Moon craters.
    sx.fillStyle = "rgba(160,165,190,0.55)";
    sx.fillRect(sunX - sunR + 2, sunY - 1, 2, 2);
    sx.fillRect(sunX + 1, sunY - sunR + 2, 2, 2);
    sx.fillRect(sunX + sunR - 4, sunY + 2, 2, 2);
  }
  const stars = time === "night" ? Array.from({ length: Math.round(w * h / 420) }, () => ({ x: Math.floor(rnd() * w), y: Math.floor(rnd() * h * 0.55), p: rnd() * Math.PI * 2 })) : [];

  // ---------- land: three depth layers, framed by big trees at the edges
  const land = canvas(w, h);
  const lx = land.getContext("2d")!;
  const tint = hex(S.tint);
  const shade = (c: string, depth: number) => {
    // Far layers fade toward the low sky; the time of day tints everything.
    let v = mix(hex(c), hex(S.low), depth * S.haze);
    if (S.tintA) v = mix(v, tint, S.tintA);
    return v;
  };
  const block = (x0: number, y0: number, size: number, pal: string[], k: number, depth: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      lx.fillStyle = css(shade(pal[Math.floor(noise(x0 + x, y0 + y, k) * pal.length)], depth));
      lx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  };
  const groundBlock = (x0: number, y0: number, size: number, depth: number, surface: boolean) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      // The top block carries the surface colour on its first rows, with a ragged edge.
      const edge = Math.max(1, Math.round(size * 0.28)) + (noise(x0 + x, 3, 9) > 0.6 ? 1 : 0);
      const pal = surface && y < edge ? P.top : P.soil;
      lx.fillStyle = css(shade(pal[Math.floor(noise(x0 + x, y0 + y, 3) * pal.length)], depth));
      lx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  };
  const heights = (count: number, base: number, amp: number, k: number, flatFrom = -1, flatTo = -1, flatH = 0) => {
    const out: number[] = [];
    let cur = base;
    for (let i = 0; i < count; i++) {
      if (i >= flatFrom && i <= flatTo) { out.push(flatH); cur = flatH; continue; }
      const step = noise(i, k, 5);
      cur += step < 0.25 ? -1 : step > 0.75 ? 1 : 0;
      cur = Math.max(base - amp, Math.min(base + amp, cur));
      out.push(cur);
    }
    return out;
  };
  const tree = (cx: number, groundY: number, s: number, depth: number, k: number, kind = P.tree) => {
    const tall = kind === "spruce" ? 6 + Math.floor(noise(k, 1, 2) * 3) : kind === "cactus" ? 2 + Math.floor(noise(k, 1, 2) * 2) : 4 + Math.floor(noise(k, 1, 2) * 2);
    for (let i = 0; i < tall; i++) {
      if (kind === "birch") {
        block(cx, groundY - (i + 1) * s, s, [P.trunk[0], P.trunk[1], P.trunk[0], P.trunk[1], P.trunk[2]], k * 7 + i, depth);
      } else block(cx, groundY - (i + 1) * s, s, P.trunk, k * 7 + i, depth);
    }
    if (kind === "cactus") return;
    const topY = groundY - tall * s;
    if (kind === "spruce") {
      for (let row = 0; row < tall + 1; row++) {
        const half = Math.max(0, Math.floor((row + 1) / 2) - (row % 3 === 0 ? 0 : 0));
        for (let dx = -half; dx <= half; dx++) {
          block(cx + dx * s, topY + (row - 1) * s, s, P.leaves, k * 13 + row * 5 + dx, depth);
          if (P.snow && row % 2 === 0) { lx.fillStyle = css(shade("#f4f8fb", depth)); lx.fillRect(cx + dx * s, topY + (row - 1) * s, s, Math.max(1, s >> 2)); }
        }
      }
      return;
    }
    const leaves = P.leaves;
    const shape = [[-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -2], [0, -2], [1, -2], [0, -3]];
    if (kind === "cherry") shape.push([-3, -1], [3, -1], [-2, -2], [2, -2], [-1, -3], [1, -3]);
    for (const [dx, dy] of shape) {
      if (noise(cx + dx, dy, k) < 0.08 && Math.abs(dx) === 2) continue;
      block(cx + dx * s, topY + dy * s, s, leaves, k * 17 + dx * 3 + dy, depth);
    }
  };

  // Distant mountains, mid hills with trees (or the sea on the shore), then big foreground blocks.
  const layers = [
    // `base` is the layer's typical height as a fraction of the scene; `amp` is in blocks.
    { size: Math.max(3, Math.round(h / 28)), base: 0.44, amp: 3, depth: 0.9, trees: biome === "taiga" ? 0.2 : 0.06 },
    { size: Math.max(4, Math.round(h / 20)), base: biome === "desert" ? 0.3 : 0.32, amp: 2, depth: 0.5, trees: biome === "desert" ? 0.1 : 0.2 },
  ];
  const water: Scene["water"] = [];
  for (const [li, L] of layers.entries()) {
    if (li === 1 && P.water) {
      // The sea fills the middle distance: a horizon line, then deeper water toward the front.
      const wy = Math.round(h * 0.6);
      for (let y = wy; y < h; y++) {
        lx.fillStyle = css(shade(y - wy < 2 ? "#a9d4f5" : "#3f76e4", 0.35 * (1 - (y - wy) / (h - wy))));
        lx.fillRect(0, y, w, 1);
      }
      water.push({ x: 0, y: wy + 2, w });
      continue;
    }
    const cols = Math.ceil(w / L.size) + 1;
    const rowsBase = Math.round((h * L.base) / L.size);
    const hs = heights(cols, rowsBase, L.amp, 30 + li * 11);
    for (let i = 0; i < cols; i++) {
      const top = h - hs[i] * L.size;
      for (let y = top, n = 0; y < h; y += L.size, n++) groundBlock(i * L.size, y, L.size, L.depth, n === 0 && (li === 1 || P.snow === true));
      if (noise(i, li, 21) < L.trees) tree(i * L.size, top, L.size, L.depth, i * 31 + li);
      else if (li === 1 && biome === "desert" && noise(i, li, 23) < 0.12) {
        // Dead bushes.
        lx.fillStyle = css(shade("#8a5a2b", L.depth));
        lx.fillRect(i * L.size + 1, top - 2, 1, 2); lx.fillRect(i * L.size, top - 3, 1, 1); lx.fillRect(i * L.size + 2, top - 3, 1, 1);
      }
    }
  }
  // Foreground: large textured blocks with steps; a flat stage at the right for the player.
  const fg = Math.max(6, Math.round(h / 9));
  const fgCols = Math.ceil(w / fg) + 1;
  const groundRows = 2;
  const flatFrom = Math.floor(fgCols * 0.68), flatTo = Math.floor(fgCols * 0.92);
  const fgH = heights(fgCols, groundRows, 1, 77, flatFrom, flatTo, groundRows);
  for (let i = 0; i < fgCols; i++) {
    // On the shore the front is a beach at the sides with open water between.
    if (P.water && i > fgCols * 0.22 && i < flatFrom - 1) continue;
    const top = h - fgH[i] * fg;
    for (let y = top, n = 0; y < h; y += fg, n++) groundBlock(i * fg, y, fg, 0, n === 0);
    if ((i < flatFrom || i > flatTo) && P.flowers.length) {
      const fx = i * fg + Math.floor(noise(i, 2, 8) * (fg - 4)) + 1;
      if (noise(i, 4, 6) < 0.45) {
        const c = pick(P.flowers, i);
        lx.fillStyle = css(shade(biome === "desert" ? "#8a5a2b" : "#3f7a24", 0));
        lx.fillRect(fx + 1, top - 4, 1, 4);
        lx.fillStyle = css(shade(c, 0));
        lx.fillRect(fx, top - 6, 3, 2);
        lx.fillRect(fx + 1, top - 7, 1, 1);
      } else if (noise(i, 5, 6) < 0.5 && biome !== "desert" && !P.snow) {
        lx.fillStyle = css(shade(P.top[2], 0));
        lx.fillRect(fx, top - 3, 1, 3); lx.fillRect(fx + 2, top - 4, 1, 4); lx.fillRect(fx + 1, top - 2, 1, 2); lx.fillRect(fx + 3, top - 2, 1, 2);
      }
    }
  }
  // Framing trees at the edges, large and partly off-canvas, like a window into the world.
  const big = Math.max(5, Math.round(fg * 0.62));
  if (P.tree !== "cactus") {
    tree(-Math.round(big * 0.7), h - fgH[0] * fg, big, 0, 901);
    tree(w - Math.round(big * 1.3), h - fgH[fgCols - 1] * fg, big, 0, 902);
  } else {
    tree(Math.round(w * 0.08), h - fgH[Math.floor(fgCols * 0.08)] * fg, Math.max(4, Math.round(fg * 0.55)), 0, 903);
    tree(Math.round(w * 0.42), h - fgH[Math.floor(fgCols * 0.42)] * fg, Math.max(4, Math.round(fg * 0.55)), 0, 904);
  }

  // ---------- moving parts
  const clouds = Array.from({ length: 3 + Math.round(w / 140) }, (_, i) => {
    const cw = 4 + Math.floor(rnd() * 6), size = Math.max(2, Math.round(h / 45));
    const cells: [number, number][] = [];
    for (let x = 0; x < cw; x++) { cells.push([x * size, 0]); if (x > 0 && x < cw - 1 && rnd() < 0.7) cells.push([x * size, -size]); }
    return { x: rnd() * w, y: Math.round(h * (0.08 + rnd() * 0.25)) + i, cells, speed: 0.6 + rnd() * 0.8 };
  });
  const kind: Scene["particles"][number]["kind"] | null = time === "night" && !P.snow && biome !== "desert" ? "firefly" : biome === "cherry" ? "petal" : P.snow ? "snow" : biome === "birch" ? "leaf" : null;
  const particles = kind ? Array.from({ length: kind === "snow" ? 26 : 12 }, () => ({
    x: rnd() * w, y: rnd() * h, vx: kind === "firefly" ? (rnd() - 0.5) * 3 : 2 + rnd() * 3, vy: kind === "firefly" ? (rnd() - 0.5) * 2 : 3 + rnd() * 4, p: rnd() * Math.PI * 2,
    c: kind === "firefly" ? "#ffe9a0" : kind === "petal" ? "#f8c4dc" : kind === "snow" ? "#ffffff" : "#d8b94a", kind,
  })) : [];
  return { w, h, time, biome, sky, land, clouds, stars, particles, water, ground: groundRows * fg };
}

/** Draws one frame. `t` is seconds; `still` draws the scene without motion. */
export function drawScene(ctx: CanvasRenderingContext2D, s: Scene, t: number, still: boolean) {
  const S = SKIES[s.time];
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(s.sky, 0, 0);
  for (const st of s.stars) {
    const a = still ? 0.7 : 0.45 + 0.4 * Math.sin(t * 1.3 + st.p);
    ctx.fillStyle = `rgba(255,255,240,${a.toFixed(2)})`;
    ctx.fillRect(st.x, st.y, 1, 1);
  }
  ctx.fillStyle = css(hex(S.cloud), s.time === "night" ? 0.35 : 0.82);
  for (const c of s.clouds) {
    const x = still ? c.x : ((c.x + t * c.speed) % (s.w + 60)) - 40;
    for (const [cx, cy] of c.cells) ctx.fillRect(Math.round(x + cx), c.y + cy, Math.max(2, Math.round(s.h / 45)), Math.max(2, Math.round(s.h / 45)));
  }
  ctx.drawImage(s.land, 0, 0);
  for (const wtr of s.water) {
    // A few highlight texels drift across the water.
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    for (let i = 0; i < 14; i++) {
      const x = Math.round((i * 37 + (still ? 0 : t * 4)) % wtr.w);
      ctx.fillRect(x, wtr.y + 1 + ((i * 7) % 4), 3, 1);
    }
  }
  if (still) return;
  for (const p of s.particles) {
    let x: number, y: number;
    if (p.kind === "firefly") {
      x = (p.x + Math.sin(t * 0.6 + p.p) * 8 + p.vx * Math.sin(t * 0.2 + p.p)) % s.w;
      y = s.h * 0.55 + ((p.y * 0.4 + Math.cos(t * 0.5 + p.p) * 5) % (s.h * 0.4));
      const glow = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2 + p.p * 3));
      ctx.fillStyle = `rgba(255,233,160,${(glow * 0.35).toFixed(2)})`;
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      ctx.fillStyle = `rgba(255,240,180,${glow.toFixed(2)})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      continue;
    }
    x = (p.x + t * p.vx + Math.sin(t + p.p) * 3) % (s.w + 10);
    y = (p.y + t * p.vy) % (s.h + 10);
    ctx.fillStyle = p.c;
    ctx.fillRect(Math.round(x), Math.round(y), p.kind === "snow" ? 1 : 2, 1);
  }
}
