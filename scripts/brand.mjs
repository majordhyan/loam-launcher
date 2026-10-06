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
async function bmp(w, h, name) {
  const svg = h > 100
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 164 314">
      <rect width="164" height="314" fill="#EEECE5"/>
      <text x="82" y="147" text-anchor="middle" font-family="Segoe UI" font-size="28" letter-spacing="3" fill="#171715">LOAM</text>
      <text x="82" y="170" text-anchor="middle" font-family="Segoe UI" font-size="10" fill="#6F6B60">Your worlds, ready.</text>
      <path d="M18 225H146" stroke="#D9D8D3"/>
      <g font-family="Segoe UI" font-size="9" fill="#171715">
        <text x="20" y="249">Isolated game spaces</text><text x="20" y="267">Vanilla · Fabric · Quilt</text><text x="20" y="285">Mods from Modrinth</text><text x="20" y="303">No ads. No analytics.</text>
      </g></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#F4F3EE"/><text x="54" y="35" font-family="Segoe UI" font-size="20" letter-spacing="2" fill="#171715">LOAM</text></svg>`;
  const icon = await sharp(h > 100 ? big : small, { density: 600 }).resize(h > 100 ? 48 : 27).png().toBuffer();
  const composed = await sharp(Buffer.from(svg)).composite([{input:icon, left:h > 100 ? 58 : 17, top:h > 100 ? 65 : 15}]).png().toBuffer();
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
