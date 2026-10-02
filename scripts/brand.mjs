import sharp from "sharp";
import fs from "node:fs/promises";
await fs.mkdir("src-tauri/icons", { recursive: true });
await fs.mkdir("public", { recursive: true });
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="#C15F3C"/><path d="M64 48h40v120h40v-24h48v64H64z" fill="#F4F3EE"/></svg>`;
await fs.writeFile("public/mark.svg", mark);
await fs.writeFile("public/mark-mono.svg", mark.replace("#C15F3C", "#171715"));
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
  sizes.map((s) => sharp(Buffer.from(mark)).resize(s, s).png().toBuffer()),
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#F4F3EE"/><rect x="16" y="16" width="24" height="24" fill="#C15F3C"/><path d="M22 21h4v12h4v-2h5v6H22z" fill="#F4F3EE"/><text x="${w > 160 ? 16 : 50}" y="${w > 160 ? 82 : 33}" font-family="Segoe UI" font-size="18" font-weight="600" letter-spacing="1" fill="#171715">LOAM</text>${h > 100 ? '<text x="16" y="110" font-family="Segoe UI" font-size="11" fill="#6F6B60">Your worlds, ready.</text><path d="M16 282H148" stroke="#D9D8D3"/>' : ""}</svg>`;
  const rgb = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
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
}
await bmp(150, 57, "header");
await bmp(164, 314, "sidebar");
