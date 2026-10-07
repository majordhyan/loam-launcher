// Music player (1.8). "Cozy mix" streams a YouTube playlist through YouTube's own embedded player.
// YouTube requires that player to stay visible (at least 200 × 200 px), so minimizing shrinks it
// into a small floating mini-player that keeps playing; only hiding it completely stops the music.
// "Spotify" shows and controls the Spotify app through Windows' media controls, with no login.
// The visualizer follows what this PC is actually playing (see audioviz.rs): loudness per pitch,
// measured on the device, nothing recorded.
import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { ChevronDown, ExternalLink, Maximize2, Minimize2, Music2, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { call, native } from "../api";

export const COZY_PLAYLIST = "PLQwRmTwWx0ubcpv0SkHroupj1LqW5_Va5";
const KEY = "loam_music", SRC = "loam_music_source", VIZ = "loam_music_viz";
type Source = "cozy" | "spotify";
type Mode = "pill" | "mini" | "full";
type Now = { active: boolean; title?: string; artist?: string; art?: string | null; playing?: boolean; spotify?: boolean };

const read = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
export function musicEnabled() { return read(KEY, "true") !== "false"; }
export function setMusicEnabled(on: boolean) { write(KEY, String(on)); window.dispatchEvent(new Event("loam-music-change")); }
export function visualizerEnabled() { return read(VIZ, "true") !== "false"; }
export function setVisualizerEnabled(on: boolean) { write(VIZ, String(on)); window.dispatchEvent(new Event("loam-music-change")); }

// ------------------------------------------------------------------ Audio levels (shared)
// One subscription for every visualizer on screen; the capture runs only while one is visible.
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

/** Real-time bars. `bars` groups the 28 measured bands; `demo` animates without the desktop app. */
function Visualizer({ bars = BANDS, className = "", demo = false, round = true }: { bars?: number; className?: string; demo?: boolean; round?: boolean }) {
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
    const shown = new Float32Array(bars), peaks = new Float32Array(bars);
    const accent = getComputedStyle(el).getPropertyValue("--loam-accent").trim() || "#c15f3c";
    let frame = 0;
    const draw = (t: number) => {
      frame = requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio || 1;
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
      const ctx = el.getContext("2d");
      if (!ctx) return;
      const per = BANDS / bars;
      for (let i = 0; i < bars; i++) {
        let target = 0;
        if (demo) {
          target = 0.35 + 0.3 * Math.sin(t / 380 + i * 0.7) * Math.sin(t / 910 + i * 0.23) + 0.25 * Math.sin(t / 170 + i * 1.9) ** 2 - i / bars * 0.25;
        } else {
          for (let j = Math.floor(i * per); j < Math.floor((i + 1) * per); j++) target = Math.max(target, (latest.v[j] || 0) / 255);
          if (performance.now() - latest.at > 400) target = 0;
        }
        target = Math.max(0, Math.min(1, target));
        // Fast rise, slow fall, like a real meter; peaks hang briefly and drift down.
        shown[i] = target > shown[i] ? shown[i] + (target - shown[i]) * 0.6 : shown[i] * 0.88 + target * 0.12;
        peaks[i] = Math.max(peaks[i] - 0.006, shown[i]);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const gap = Math.max(1, Math.min(3, w / bars * 0.28));
      const bw = (w - gap * (bars - 1)) / bars;
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, "#f6b98f");
      for (let i = 0; i < bars; i++) {
        const x = i * (bw + gap);
        const bh = Math.max(round ? bw : 2, shown[i] * h);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, shown[i] * 1.6 + 0.15);
        ctx.beginPath();
        if (round && ctx.roundRect) ctx.roundRect(x, h - bh, bw, bh, Math.min(bw / 2, 3));
        else ctx.rect(x, h - bh, bw, bh);
        ctx.fill();
        if (round && bars > 8 && peaks[i] > 0.04) {
          ctx.globalAlpha = 0.9;
          ctx.fillRect(x, h - peaks[i] * h - 3, bw, 2);
        }
      }
      ctx.globalAlpha = 1;
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", vis); drop(); };
  }, [bars, demo, round]);
  return <canvas ref={canvas} className={`v18-viz ${className}`} aria-hidden="true" />;
}

// ------------------------------------------------------------------ Dock
export default function MusicDock() {
  const [on, setOn] = useState(musicEnabled);
  const [viz, setViz] = useState(visualizerEnabled);
  const [mode, setMode] = useState<Mode>("pill");
  const [source, setSource] = useState<Source>(() => (read(SRC, "cozy") as Source) || "cozy");
  const [now, setNow] = useState<Now>({ active: false });
  const [yt, setYt] = useState<{ state: number; title: string }>({ state: -1, title: "" });
  const [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const sync = () => { setOn(musicEnabled()); setViz(visualizerEnabled()); };
    window.addEventListener("loam-music-change", sync);
    return () => window.removeEventListener("loam-music-change", sync);
  }, []);
  useEffect(() => write(SRC, source), [source]);

  // Spotify: poll Windows' media session while it's on screen.
  useEffect(() => {
    if (!on || source !== "spotify" || !native) return;
    let live = true;
    const tick = () => void call<Now>("mediaNow", { prefer: "spotify" }).then((n) => live && setNow(n)).catch(() => {});
    tick();
    const t = window.setInterval(() => { if (!document.hidden) tick(); }, mode === "full" ? 2500 : 6000);
    return () => { live = false; window.clearInterval(t); };
  }, [on, source, mode]);

  // YouTube player state and title, from its own postMessage events.
  const cozyMounted = on && source === "cozy" && mode !== "pill";
  useEffect(() => {
    if (!cozyMounted) { setYt({ state: -1, title: "" }); return; }
    const onMsg = (e: MessageEvent) => {
      let host = "";
      try { host = new URL(e.origin).hostname; } catch { return; }
      if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host) || typeof e.data !== "string") return;
      let d: { event?: string; info?: unknown };
      try { d = JSON.parse(e.data); } catch { return; }
      if (d.event === "onStateChange" && typeof d.info === "number") setYt((y) => ({ ...y, state: d.info as number }));
      if (d.event === "infoDelivery" && d.info && typeof d.info === "object") {
        const info = d.info as { playerState?: number; videoData?: { title?: string } };
        setYt((y) => ({ state: typeof info.playerState === "number" ? info.playerState : y.state, title: info.videoData?.title || y.title }));
      }
    };
    window.addEventListener("message", onMsg);
    // The player script starts after the frame loads; say hello a few times until it answers.
    let tries = 0;
    const hello = window.setInterval(() => {
      frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "loam", channel: "widget" }), "*");
      if (++tries > 12) window.clearInterval(hello);
    }, 600);
    return () => { window.removeEventListener("message", onMsg); window.clearInterval(hello); };
  }, [cozyMounted]);

  const ytCmd = (func: string, args: unknown[] = []) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  const ytPlaying = yt.state === 1 || yt.state === 3;
  async function media(action: string) {
    setError("");
    try {
      await call("mediaControl", { prefer: "spotify", action });
      window.setTimeout(() => void call<Now>("mediaNow", { prefer: "spotify" }).then(setNow).catch(() => {}), 400);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  // Minimize keeps a playing cozy mix in the mini-player; anything else folds to the pill.
  const minimize = () => setMode(source === "cozy" && ytPlaying ? "mini" : "pill");

  if (!on) return null;
  const demo = !native;
  const playingAnything = source === "cozy" ? ytPlaying : !!now.playing;
  const embed = `https://www.youtube-nocookie.com/embed/videoseries?list=${COZY_PLAYLIST}&loop=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;
  const full = mode === "full", mini = mode === "mini";
  const title = source === "cozy" ? yt.title : now.title;

  return (
    <div className={`v18-music is-${mode}`}>
      {mode === "pill" ? (
        <button type="button" className="v18-music-pill" onClick={() => setMode("full")} aria-label="Open music">
          {viz && (native || playingAnything) ? <Visualizer bars={4} className="v18-viz-pill" demo={demo && playingAnything} round={false} /> : <span className="v18-eq" aria-hidden="true"><i /><i /><i /></span>}
          <Music2 size={15} />
          <span>{source === "spotify" && now.active && now.title ? now.title : "Music"}</span>
        </button>
      ) : (
        <section className={`v18-music-card ${mode}`} aria-label="Music">
          {full ? (
            <header>
              <div className="v17-segment v18-music-tabs" role="tablist" aria-label="Music source">
                <button type="button" role="tab" aria-selected={source === "cozy"} className={source === "cozy" ? "active" : ""} onClick={() => setSource("cozy")}>Cozy mix</button>
                <button type="button" role="tab" aria-selected={source === "spotify"} className={source === "spotify" ? "active" : ""} onClick={() => setSource("spotify")}>Spotify</button>
              </div>
              <button type="button" className="v17-icon-btn" aria-label="Minimize music" title={source === "cozy" ? "Minimize (keeps playing in a mini player)" : "Minimize"} onClick={minimize}><Minimize2 size={15} /></button>
              <button type="button" className="v17-icon-btn" aria-label="Turn music off" title="Turn off (Settings › Home & sound)" onClick={() => setMusicEnabled(false)}><X size={16} /></button>
            </header>
          ) : null}
          {source === "cozy" ? (
            <div className="v18-music-player">
              <iframe ref={frame} src={embed} title="Cozy chill music playlist" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
            </div>
          ) : null}
          {source === "cozy" ? (
            <>
              {viz && <Visualizer bars={mini ? 14 : BANDS} className={mini ? "v18-viz-mini" : "v18-viz-card"} demo={demo && ytPlaying} />}
              {full && title && <p className="v18-music-title" title={title}>{title}</p>}
              <div className="v18-music-controls">
                <button type="button" className="v17-icon-btn" aria-label="Previous" onClick={() => ytCmd("previousVideo")}><SkipBack size={15} /></button>
                <button type="button" className="v18-music-play" aria-label={ytPlaying ? "Pause" : "Play"} onClick={() => ytCmd(ytPlaying ? "pauseVideo" : "playVideo")}>
                  {ytPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <button type="button" className="v17-icon-btn" aria-label="Next" onClick={() => ytCmd("nextVideo")}><SkipForward size={15} /></button>
                {full ? (
                  <input type="range" min={0} max={100} defaultValue={60} aria-label="Music volume" onChange={(e) => ytCmd("setVolume", [+e.target.value])} />
                ) : (
                  <>
                    <span className="v18-grow" />
                    <button type="button" className="v17-icon-btn" aria-label="Expand music" title="Expand" onClick={() => setMode("full")}><Maximize2 size={14} /></button>
                    <button type="button" className="v17-icon-btn" aria-label="Hide music" title="Hide (stops the cozy mix; YouTube's player must stay visible to play)" onClick={() => setMode("pill")}><ChevronDown size={15} /></button>
                  </>
                )}
              </div>
              {full && <p className="v18-music-note">Streams the cozy chill playlist from YouTube on loop. Minimize keeps it playing in a small player; YouTube's player has to stay visible to play.</p>}
            </>
          ) : (
            <div className="v18-spotify">
              {now.active ? (
                <>
                  <div className="v18-spotify-now">
                    {now.art ? <img src={now.art} alt="" /> : <span className="v18-spotify-art"><Music2 size={26} /></span>}
                    <div>
                      <strong title={now.title}>{now.title || "Unknown track"}</strong>
                      <small title={now.artist}>{now.artist}</small>
                    </div>
                  </div>
                  {viz && <Visualizer className="v18-viz-card" demo={demo && !!now.playing} />}
                  <div className="v18-music-controls">
                    <button type="button" className="v17-icon-btn" aria-label="Previous" onClick={() => void media("previous")}><SkipBack size={16} /></button>
                    <button type="button" className="v18-spotify-play" aria-label={now.playing ? "Pause" : "Play"} onClick={() => void media("toggle")}>
                      {now.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>
                    <button type="button" className="v17-icon-btn" aria-label="Next" onClick={() => void media("next")}><SkipForward size={16} /></button>
                  </div>
                </>
              ) : (
                <div className="v18-spotify-empty">
                  <Music2 size={26} />
                  <p>Open Spotify and play something. It shows up here, with play, pause and skip. No login needed.</p>
                </div>
              )}
              <button type="button" className="v17-text-btn" onClick={() => void call("openSpotify").catch((e) => setError(e instanceof Error ? e.message : String(e)))}><ExternalLink size={14} /> Open Spotify</button>
              {error && <p className="field-error" role="alert">{error}</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
