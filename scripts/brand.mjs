import sharp from "sharp";
import fs from "node:fs/promises";
// LOAM mark v2 (1.7.0). Sources: public/brand/mark.svg (48 px and up) and mark-small.svg (16–32 px).
await fs.mkdir("src-tauri/icons", { recursive: true });
const big = await fs.readFile("public/brand/mark.svg");
const small = await fs.readFile("public/brand/mark-small.svg");
await fs.copyFile("public/brand/mark.svg", "public/mark.svg");
await fs.writeFile("public/mark-mono.svg", small.toString().replace(/url\(#tile\)/, "#171715"));
await sharp(big, { density: 600 }).resize(1024, 1024).png().toFile("public/brand/icon.png");
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
  sizes.map((s) => sharp(s <= 32 ? small : big, { density: 600 }).resize(s, s).png().toBuffer()),
);
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
pngs.forEach((p, i) => {
  let n = 6 + i * 16;
  header[n] = sizes[i] === 256 ? 0 : sizes[i];
  header[n + 1] = header[n];
  header.writeUInt16LE(1, n + 4);
  header.writeUInt16LE(32, n + 6);
  header.writeUInt32LE(p.length, n + 8);
  header.writeUInt32LE(offset, n + 12);
  offset += p.length;
});
await fs.writeFile(
  "src-tauri/icons/icon.ico",
  Buffer.concat([header, ...pngs]),
);
await fs.writeFile("src-tauri/icons/icon.png", pngs.at(-1));
// Installer artwork (1.8): a dusk scene like the app's Home, drawn at 2x so Windows' "fit control"
// scaling shrinks it (sharp) instead of stretching it (blurry) on 125-200% displays.
async function bmp(w0, h0, name) {
  const k = 2, w = w0 * k, h = h0 * k;
  const tall = h0 > 100;
  const svg = tall
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 164 314">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FCEBD6"/><stop offset="0.55" stop-color="#F6C9A0"/><stop offset="1" stop-color="#EE9D6E"/></linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF8EC"/><stop offset="0.55" stop-color="#FFE7C7" stop-opacity="0.9"/><stop offset="1" stop-color="#FFE7C7" stop-opacity="0"/></radialGradient>
        <linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A2419"/><stop offset="1" stop-color="#22120D"/></linearGradient>
      </defs>
      <rect width="164" height="314" fill="url(#sky)"/>
      <circle cx="122" cy="176" r="34" fill="url(#sun)"/>
      <circle cx="122" cy="176" r="12" fill="#FFF6E6"/>
      <path d="M0 196 C22 184 40 190 58 182 C78 173 96 186 116 180 C134 175 150 184 164 178 V314 H0Z" fill="#E28A5C"/>
      <path d="M0 210 C18 202 34 208 52 200 C72 192 92 206 112 199 C132 193 148 203 164 197 V314 H0Z" fill="#C4683F"/>
      <path d="M0 224 C24 216 44 224 66 216 C88 209 108 222 130 215 C144 211 154 215 164 212 V314 H0Z" fill="#94452B"/>
      <path d="M0 238 C26 232 50 240 76 233 C102 227 128 238 164 230 V314 H0Z" fill="url(#base)"/>
      <text x="82" y="118" text-anchor="middle" font-family="Segoe UI Semibold, Segoe UI" font-weight="600" font-size="27" letter-spacing="4" fill="#2A1712">LOAM</text>
      <text x="82" y="136" text-anchor="middle" font-family="Segoe UI" font-size="9.5" fill="#7A4430">Your worlds, ready.</text>
      <g font-family="Segoe UI" font-size="8.6" fill="#F7E9DC">
        ${["Vanilla · Fabric · Quilt", "Modpacks, shaders, servers", "Skins, tray and music", "No ads. No analytics."].map((t, i) =>
          `<circle cx="22" cy="${254.5 + i * 15}" r="1.8" fill="#EE9D6E"/><text x="30" y="${257.5 + i * 15}">${t}</text>`).join("")}
      </g></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 150 57">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FBEFE3"/></linearGradient></defs>
      <rect width="150" height="57" fill="url(#g)"/>
      <path d="M60 57 C80 50 96 54 112 48 C126 43 138 49 150 45 V57Z" fill="#F3C9A4"/>
      <path d="M84 57 C100 53 116 56 130 52 C140 50 146 52 150 51 V57Z" fill="#E28A5C"/>
      <text x="52" y="35" font-family="Segoe UI Semibold, Segoe UI" font-weight="600" font-size="19" letter-spacing="2.5" fill="#2A1712">LOAM</text></svg>`;
  const icon = await sharp(tall ? big : small, { density: 600 }).resize((tall ? 50 : 28) * k).png().toBuffer();
  const composed = await sharp(Buffer.from(svg)).composite([{ input: icon, left: (tall ? 57 : 16) * k, top: (tall ? 36 : 14) * k }]).png().toBuffer();
  const rgb = await sharp(composed).removeAlpha().raw().toBuffer();
  const stride = Math.ceil((w * 3) / 4) * 4;
  const out = Buffer.alloc(54 + stride * h);
  out.write("BM");
  out.writeUInt32LE(out.length, 2);
  out.writeUInt32LE(54, 10);
  out.writeUInt32LE(40, 14);
  out.writeInt32LE(w, 18);
  out.writeInt32LE(h, 22);
  out.writeUInt16LE(1, 26);
  out.writeUInt16LE(24, 28);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const src = (y * w + x) * 3,
        dst = 54 + (h - 1 - y) * stride + x * 3;
      out[dst] = rgb[src + 2];
      out[dst + 1] = rgb[src + 1];
      out[dst + 2] = rgb[src];
    }
  await fs.writeFile(`src-tauri/icons/${name}.bmp`, out);
  await sharp(composed).png().toFile(`src-tauri/icons/${name}-preview.png`);
}
await bmp(150, 57, "header");
await bmp(164, 314, "sidebar");
