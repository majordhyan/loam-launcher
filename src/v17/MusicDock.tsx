// Music player (1.8).
// • YouTube: the cozy chill playlist, or any YouTube / YouTube Music playlist or video link you
//   paste, through YouTube's own embedded player. YouTube requires that player to stay visible
//   (at least 200 × 200 px), so minimizing keeps a compact 200 px player in the corner; only
//   hiding it completely stops the music.
// • This PC: whatever is playing on this PC (Spotify, YouTube Music in a browser or app, …),
//   shown and controlled through Windows' media controls, with no login. Minimized, it's a small
//   pill with play/pause and skip.
// The visualizer follows what the PC is actually playing (see audioviz.rs): loudness per pitch,
// measured on the device, nothing recorded.
import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { ChevronDown, ExternalLink, Link2, Maximize2, Minimize2, Music2, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from "lucide-react";
import { call, native } from "../api";

export const COZY_PLAYLIST = "PLQwRmTwWx0ubcpv0SkHroupj1LqW5_Va5";
const KEY = "loam_music", SRC = "loam_music_source", VIZ = "loam_music_viz", LINK = "loam_music_link";
type Source = "youtube" | "pc";
type Mode = "pill" | "mini" | "full";
type Now = { active: boolean; title?: string; artist?: string; art?: string | null; playing?: boolean; source?: string };

const read = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
export function musicEnabled() { return read(KEY, "true") !== "false"; }
export function setMusicEnabled(on: boolean) { write(KEY, String(on)); window.dispatchEvent(new Event("loam-music-change")); }
export function visualizerEnabled() { return read(VIZ, "true") !== "false"; }
export function setVisualizerEnabled(on: boolean) { write(VIZ, String(on)); window.dispatchEvent(new Event("loam-music-change")); }

/** A YouTube or YouTube Music link → what to embed. Only IDs are kept, never the raw URL. */
export function parseYouTube(raw: string): { list?: string; video?: string } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (!["youtube.com", "music.youtube.com", "youtu.be"].includes(host)) return null;
  const id = (v: string | null, re: RegExp) => (v && re.test(v) ? v : undefined);
  const list = id(u.searchParams.get("list"), /^[A-Za-z0-9_-]{10,64}$/);
  const video = host === "youtu.be" ? id(u.pathname.slice(1), /^[A-Za-z0-9_-]{11}$/) : id(u.searchParams.get("v"), /^[A-Za-z0-9_-]{11}$/);
  return list || video ? { list, video } : null;
}

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

/**
 * Minimal real-time bars: thin capsules mirrored around a centre line, one colour, no peaks.
 * Silence settles into a calm row of dots. `demo` animates without the desktop app.
 */
function Visualizer({ bars = 24, className = "", demo = false }: { bars?: number; className?: string; demo?: boolean }) {
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
    const shown = new Float32Array(bars);
    const color = getComputedStyle(el).color || "#c15f3c";
    let frame = 0;
    const draw = (t: number) => {
      frame = requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio || 1;
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
      const ctx = el.getContext("2d");
      if (!ctx) return;
      const fresh = performance.now() - latest.at < 400;
      // Bands spread across the bars; the lowest band is skipped (rumble), highs are lifted a bit.
      for (let i = 0; i < bars; i++) {
        let target = 0;
        if (demo) {
          target = 0.45 + 0.3 * Math.sin(t / 420 + i * 0.55) * Math.sin(t / 1100 + i * 0.21) + 0.2 * Math.sin(t / 190 + i * 1.7) ** 2;
        } else if (fresh) {
          const pos = 1 + (i / Math.max(1, bars - 1)) * (BANDS - 2);
          const a = Math.floor(pos), f = pos - a;
          target = (((latest.v[a] || 0) * (1 - f) + (latest.v[a + 1] || 0) * f) / 255) * (0.85 + 0.3 * (i / bars));
        }
        target = Math.max(0, Math.min(1, target));
        shown[i] += (target - shown[i]) * (target > shown[i] ? 0.45 : 0.12);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const step = w / bars;
      const bw = Math.max(2, Math.min(4, step * 0.42));
      ctx.fillStyle = color;
      for (let i = 0; i < bars; i++) {
        const x = i * step + (step - bw) / 2;
        const bh = Math.max(bw, shown[i] * h);
        ctx.globalAlpha = 0.28 + 0.72 * Math.min(1, shown[i] * 1.4);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, (h - bh) / 2, bw, bh, bw / 2);
        else ctx.rect(x, (h - bh) / 2, bw, bh);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", vis); drop(); };
  }, [bars, demo]);
  return <canvas ref={canvas} className={`v18-viz ${className}`} aria-hidden="true" />;
}

// ------------------------------------------------------------------ Dock
export default function MusicDock() {
  const [on, setOn] = useState(musicEnabled);
  const [viz, setViz] = useState(visualizerEnabled);
  const [mode, setMode] = useState<Mode>("pill");
  const [source, setSource] = useState<Source>(() => (read(SRC, "youtube") === "pc" || read(SRC, "") === "spotify" ? "pc" : "youtube"));
  const [link, setLink] = useState(() => read(LINK, ""));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
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

  // This PC: poll Windows' media session while it's on screen (slower when minimized).
  useEffect(() => {
    if (!on || source !== "pc" || !native) return;
    let live = true;
    const tick = () => void call<Now>("mediaNow", { prefer: "any" }).then((n) => live && setNow(n)).catch(() => {});
    tick();
    const t = window.setInterval(() => { if (!document.hidden) tick(); }, mode === "full" ? 2000 : 4000);
    return () => { live = false; window.clearInterval(t); };
  }, [on, source, mode]);

  // YouTube player state and title, from its own postMessage events.
  const ytMounted = on && source === "youtube" && mode !== "pill";
  useEffect(() => {
    if (!ytMounted) { setYt({ state: -1, title: "" }); return; }
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
    let tries = 0;
    const hello = window.setInterval(() => {
      frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "loam", channel: "widget" }), "*");
      if (++tries > 12) window.clearInterval(hello);
    }, 600);
    return () => { window.removeEventListener("message", onMsg); window.clearInterval(hello); };
  }, [ytMounted, link]);

  const ytCmd = (func: string, args: unknown[] = []) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  const ytPlaying = yt.state === 1 || yt.state === 3;
  async function media(action: string) {
    setError("");
    try {
      await call("mediaControl", { prefer: "any", action });
      window.setTimeout(() => void call<Now>("mediaNow", { prefer: "any" }).then(setNow).catch(() => {}), 350);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  const openApp = (app: "spotify" | "ytmusic") => void call("openMusicApp", { app }).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  // Minimize: a playing YouTube player shrinks to the 200 px mini player; anything else folds to the pill.
  const minimize = () => setMode(source === "youtube" && ytPlaying ? "mini" : "pill");
  function saveLink() {
    const v = draft.trim();
    if (!v) { setLink(""); write(LINK, ""); setEditing(false); return; }
    if (!parseYouTube(v)) { setError("Paste a YouTube or YouTube Music link to a playlist or video."); return; }
    setError("");
    setLink(v);
    write(LINK, v);
    setEditing(false);
  }

  if (!on) return null;
  const demo = !native;
  const custom = link ? parseYouTube(link) : null;
  const params = `enablejsapi=1&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;
  const embed = custom?.list
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${custom.list}&loop=1&${params}`
    : custom?.video
      ? `https://www.youtube-nocookie.com/embed/${custom.video}?loop=1&playlist=${custom.video}&${params}`
      : `https://www.youtube-nocookie.com/embed/videoseries?list=${COZY_PLAYLIST}&loop=1&${params}`;
  const full = mode === "full", mini = mode === "mini";
  const pcPlaying = !!now.playing;

  return (
    <div className={`v18-music is-${mode}`}>
      {mode === "pill" ? (
        <div className={`v18-music-pill ${source === "pc" && now.active ? "has-controls" : ""}`}>
          <button type="button" className="v18-music-pill-open" onClick={() => setMode("full")} aria-label="Open music">
            {source === "pc" && now.art ? <img src={now.art} alt="" /> : <Music2 size={15} />}
            {viz && (native || pcPlaying) && <Visualizer bars={5} className="v18-viz-pill" demo={demo && pcPlaying} />}
            <span>{source === "pc" && now.active && now.title ? now.title : "Music"}</span>
          </button>
          {source === "pc" && now.active && (
            <>
              <button type="button" className="v18-pill-btn" aria-label={pcPlaying ? "Pause" : "Play"} onClick={() => void media("toggle")}>
                {pcPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              </button>
              <button type="button" className="v18-pill-btn" aria-label="Next" onClick={() => void media("next")}><SkipForward size={14} /></button>
            </>
          )}
        </div>
      ) : (
        <section className={`v18-music-card ${mode}`} aria-label="Music">
          {full ? (
            <header>
              <div className="v17-segment v18-music-tabs" role="tablist" aria-label="Music source">
                <button type="button" role="tab" aria-selected={source === "youtube"} className={source === "youtube" ? "active" : ""} onClick={() => setSource("youtube")}>YouTube</button>
                <button type="button" role="tab" aria-selected={source === "pc"} className={source === "pc" ? "active" : ""} onClick={() => setSource("pc")}>This PC</button>
              </div>
              <button type="button" className="v17-icon-btn" aria-label="Minimize music" title="Minimize" onClick={minimize}><Minimize2 size={15} /></button>
              <button type="button" className="v17-icon-btn" aria-label="Turn music off" title="Turn off (Settings › Home & sound)" onClick={() => setMusicEnabled(false)}><X size={16} /></button>
            </header>
          ) : null}
          {source === "youtube" ? (
            <div className="v18-music-player">
              <iframe ref={frame} key={embed} src={embed} title="Music player" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
            </div>
          ) : null}
          {source === "youtube" ? (
            mini ? (
              <div className="v18-mini-bar">
                <button type="button" className="v18-mini-btn" aria-label={ytPlaying ? "Pause" : "Play"} onClick={() => ytCmd(ytPlaying ? "pauseVideo" : "playVideo")}>
                  {ytPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                </button>
                <button type="button" className="v18-mini-btn" aria-label="Next" onClick={() => ytCmd("nextVideo")}><SkipForward size={14} /></button>
                {viz ? <Visualizer bars={10} className="v18-viz-mini" demo={demo && ytPlaying} /> : <span className="v18-grow" />}
                <button type="button" className="v18-mini-btn" aria-label="Expand music" title="Expand" onClick={() => setMode("full")}><Maximize2 size={13} /></button>
                <button type="button" className="v18-mini-btn" aria-label="Hide music" title="Hide (stops YouTube; its player must stay visible to play)" onClick={() => setMode("pill")}><ChevronDown size={14} /></button>
              </div>
            ) : (
              <>
                {viz && <Visualizer className="v18-viz-card" demo={demo && ytPlaying} />}
                {yt.title && <p className="v18-music-title" title={yt.title}>{yt.title}</p>}
                <div className="v18-music-controls">
                  <button type="button" className="v17-icon-btn" aria-label="Previous" onClick={() => ytCmd("previousVideo")}><SkipBack size={15} /></button>
                  <button type="button" className="v18-music-play" aria-label={ytPlaying ? "Pause" : "Play"} onClick={() => ytCmd(ytPlaying ? "pauseVideo" : "playVideo")}>
                    {ytPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                  </button>
                  <button type="button" className="v17-icon-btn" aria-label="Next" onClick={() => ytCmd("nextVideo")}><SkipForward size={15} /></button>
                  <input type="range" min={0} max={100} defaultValue={60} aria-label="Music volume" onChange={(e) => ytCmd("setVolume", [+e.target.value])} />
                </div>
                {editing ? (
                  <form className="v18-music-link" onSubmit={(e) => { e.preventDefault(); saveLink(); }}>
                    <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste a YouTube or YouTube Music link" aria-label="Playlist or video link" />
                    <button type="submit" className="v17-btn v17-btn-sm v17-btn-primary">Play</button>
                    <button type="button" className="v17-icon-btn" aria-label="Cancel" onClick={() => { setEditing(false); setError(""); }}><X size={14} /></button>
                  </form>
                ) : (
                  <div className="v18-music-source">
                    <span>{custom ? "Your link" : "Cozy chill mix"}</span>
                    <button type="button" className="v17-text-btn" onClick={() => { setDraft(link); setEditing(true); }}><Link2 size={13} /> {custom ? "Change" : "Play your own playlist"}</button>
                    {custom && <button type="button" className="v17-text-btn" onClick={() => { setLink(""); write(LINK, ""); }}><RotateCcw size={13} /> Cozy mix</button>}
                  </div>
                )}
                {error && <p className="field-error" role="alert">{error}</p>}
              </>
            )
          ) : (
            <div className="v18-pc">
              {now.active ? (
                <>
                  <div className="v18-pc-now">
                    {now.art ? <img src={now.art} alt="" /> : <span className="v18-pc-art"><Music2 size={24} /></span>}
                    <div>
                      <small className="v18-pc-source">{now.source || "Playing on this PC"}</small>
                      <strong title={now.title}>{now.title || "Unknown track"}</strong>
                      <span title={now.artist}>{now.artist}</span>
                    </div>
                  </div>
                  {viz && <Visualizer className="v18-viz-card" demo={demo && pcPlaying} />}
                  <div className="v18-music-controls is-center">
                    <button type="button" className="v17-icon-btn" aria-label="Previous" onClick={() => void media("previous")}><SkipBack size={16} /></button>
                    <button type="button" className="v18-music-play" aria-label={pcPlaying ? "Pause" : "Play"} onClick={() => void media("toggle")}>
                      {pcPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <button type="button" className="v17-icon-btn" aria-label="Next" onClick={() => void media("next")}><SkipForward size={16} /></button>
                  </div>
                </>
              ) : (
                <div className="v18-pc-empty">
                  <Music2 size={24} />
                  <p>Play music in Spotify, YouTube Music or any app on this PC. It shows up here with play, pause and skip, and keeps playing when you minimize. No login needed.</p>
                </div>
              )}
              <div className="v18-pc-apps">
                <button type="button" className="v17-btn v17-btn-sm" onClick={() => openApp("spotify")}><ExternalLink size={13} /> Spotify</button>
                <button type="button" className="v17-btn v17-btn-sm" onClick={() => openApp("ytmusic")}><ExternalLink size={13} /> YouTube Music</button>
              </div>
              {error && <p className="field-error" role="alert">{error}</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
