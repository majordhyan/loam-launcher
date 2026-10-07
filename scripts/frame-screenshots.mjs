// Website screenshots: frames 2560×1600 captures on a soft backdrop with rounded corners and a
// shadow (3000×2000), and writes WebP copies of both. Dark shots get a dark backdrop.
// node scripts/frame-screenshots.mjs <inDir> <outDir>
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const [inDir, outDir] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const W = 3000, H = 2000, SW = 2560, SH = 1600, R = 28;
const left = (W - SW) / 2, top = (H - SH) / 2 - 20;

const backdrop = (dark) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1">${dark
      ? '<stop offset="0" stop-color="#2B1C16"/><stop offset="0.6" stop-color="#1A110D"/><stop offset="1" stop-color="#3A1E14"/>'
      : '<stop offset="0" stop-color="#F7EFE6"/><stop offset="0.6" stop-color="#F0DCC9"/><stop offset="1" stop-color="#E4B996"/>'}</linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.08" r="0.7"><stop offset="0" stop-color="${dark ? "#C15F3C" : "#FFFFFF"}" stop-opacity="${dark ? 0.28 : 0.6}"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
</svg>`);
const shadow = (dark) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="${left + 10}" y="${top + 44}" width="${SW - 20}" height="${SH - 10}" rx="${R}" fill="#2A140C" fill-opacity="${dark ? 0.7 : 0.32}"/></svg>`)).blur(48).png().toBuffer();
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}"><rect width="${SW}" height="${SH}" rx="${R}" fill="#fff"/></svg>`);
const edge = (dark) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}"><rect x="1" y="1" width="${SW - 2}" height="${SH - 2}" rx="${R - 1}" fill="none" stroke="${dark ? "#FFFFFF" : "#000000"}" stroke-opacity="${dark ? 0.14 : 0.1}" stroke-width="2"/></svg>`);

for (const f of (await fs.readdir(inDir)).filter((f) => f.endsWith(".png")).sort()) {
  const src = path.join(inDir, f);
  const dark = /dark/.test(f);
  const meta = await sharp(src).metadata();
  if (meta.width !== SW || meta.height !== SH) throw new Error(`${f} is ${meta.width}×${meta.height}, expected ${SW}×${SH}`);
  const shot = await sharp(src).composite([{ input: mask, blend: "dest-in" }, { input: edge(dark) }]).png().toBuffer();
  const base = f.replace(/\.png$/, "");
  await fs.copyFile(src, path.join(outDir, f));
  await sharp(src).webp({ quality: 88 }).toFile(path.join(outDir, `${base}.webp`));
  const framed = sharp(backdrop(dark)).composite([{ input: await shadow(dark) }, { input: shot, left, top }]);
  await framed.clone().png({ compressionLevel: 9 }).toFile(path.join(outDir, `${base}-framed.png`));
  await framed.clone().webp({ quality: 88 }).toFile(path.join(outDir, `${base}-framed.webp`));
  console.log("framed", base);
}
