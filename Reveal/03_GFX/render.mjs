// Renders LOAM reveal graphics with headless Microsoft Edge over the DevTools protocol.
//   Still:  node render.mjs still  <page.html> <out.png> <width> <height> [scale]
//   At t:   node render.mjs at <page.html?query> <out.png> <width> <height> <t> [scale]
//   Frames: node render.mjs frames <page.html> <outDir> <width> <height> <seconds> <fps> [scale]
// Frame mode calls window.render(t) (t in seconds) before each capture, so motion is
// deterministic and frame-exact rather than captured in real time.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [mode, page, out, w, h, ...rest] = process.argv.slice(2);
const width = +w, height = +h;
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const port = 9400 + Math.floor(Math.random() * 400);
const profile = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), ".edge-profile-" + port);
const proc = spawn(edge, ["--headless=new", `--remote-debugging-port=${port}`, "--hide-scrollbars", "--allow-file-access-from-files", "--force-color-profile=srgb", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
}
if (!target) throw new Error("Edge did not start");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
};

const scale = mode === "still" ? +(rest[0] || 2) : mode === "at" ? +(rest[1] || 1) : +(rest[2] || 1);
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });
const [pagePath, query = ""] = page.split("?");
await send("Page.navigate", { url: pathToFileURL(path.resolve(pagePath)).href + (query ? "?" + query : "") });
await sleep(600);
await evaluate("document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.decode().catch(() => {})))).then(() => true)");

const shoot = async (file) => {
  const s = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(file, Buffer.from(s.result.data, "base64"));
};

if (mode === "at") {
  // One frame at time t: node render.mjs at <page?query> <out.png> <w> <h> <t> [scale]
  await evaluate(`window.render(${+rest[0]}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  await shoot(out);
  console.log("saved", out, "t=" + rest[0]);
} else if (mode === "still") {
  await sleep(200);
  await shoot(out);
  console.log("saved", out);
} else {
  const seconds = +rest[0], fps = +rest[1];
  fs.mkdirSync(out, { recursive: true });
  const total = Math.round(seconds * fps);
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await evaluate(`window.render(${f / fps}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    await shoot(path.join(out, `f_${String(f).padStart(5, "0")}.png`));
    if (f % 60 === 0) console.log(`frame ${f}/${total} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  console.log("frames done", total);
}
ws.close();
proc.kill();
await sleep(500);
fs.rmSync(profile, { recursive: true, force: true });
