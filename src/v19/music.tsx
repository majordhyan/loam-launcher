// Music state for the whole app (1.8, reworked in 1.9). It lives above the pages, so navigating
// never restarts playback. Only one thing plays at a time: starting one source stops the other.
//
// • YouTube / YouTube Music: through YouTube's privacy-enhanced embedded player. YouTube's rules
//   require that player to stay visible at 200 × 200 px or more while it plays, so it never
//   collapses to audio only: one iframe is positioned over a reserved slot (the Music page, the
//   sidebar, or the dock at narrow widths). Nothing loads until the player presses Play.
// • Files: audio files the player picks on this PC, played by LOAM itself. These are the only
//   sound LOAM can measure, so they're the only source with a real spectrum.
// • This PC: remote control of whatever another app is playing through Windows' media controls.
//   LOAM sends play, pause and skip; it never listens to other apps' audio.
// • Spotify and Apple Music links are saved and opened in their own apps (see links.ts).
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { call, native } from "../api";
import { addLink as addTo, loadLinks, storeLinks, youTubeIds, type SavedLink } from "./links";

export const COZY_PLAYLIST = "PLQwRmTwWx0ubcpv0SkHroupj1LqW5_Va5";
const KEY = "loam_music", SRC = "loam_music_source", VIZ = "loam_music_viz", LINK = "loam_music_link";
export type Source = "youtube" | "files" | "pc";
export type VizMode = "off" | "minimal" | "spectrum";
export type Now = { active: boolean; title?: string; artist?: string; art?: string | null; playing?: boolean; source?: string; app?: string };
export type YouTubeState = { started: boolean; state: number; title: string; author: string; videoId: string; volume: number };
export type Track = { id: string; name: string; url: string };
export type FileState = { queue: Track[]; index: number; playing: boolean; time: number; duration: number; volume: number };

const read = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
export function musicEnabled() { return read(KEY, "true") !== "false"; }
export function setMusicEnabled(on: boolean) { write(KEY, String(on)); window.dispatchEvent(new Event("loam-music-change")); }
/** Off, a simple playing indicator, or a real spectrum where LOAM has the sound (files). Older builds stored true/false. */
export function vizMode(): VizMode {
  const v = read(VIZ, "spectrum");
  return v === "false" ? "off" : v === "off" || v === "minimal" ? v : "spectrum";
}
export function setVizMode(m: VizMode) { write(VIZ, m); window.dispatchEvent(new Event("loam-music-change")); }

export function embedUrl(link: string, autoplay: boolean) {
  const custom = link ? youTubeIds(link) : null;
  // LOAM's own buttons drive the player, so YouTube's control bar and annotations are hidden.
  const params = `enablejsapi=1&controls=0&iv_load_policy=3&rel=0&modestbranding=1&playsinline=1${autoplay ? "&autoplay=1" : ""}&origin=${encodeURIComponent(window.location.origin)}`;
  if (custom?.list) return `https://www.youtube-nocookie.com/embed/videoseries?list=${custom.list}&loop=1&${params}`;
  if (custom?.video) return `https://www.youtube-nocookie.com/embed/${custom.video}?loop=1&playlist=${custom.video}&${params}`;
  return `https://www.youtube-nocookie.com/embed/videoseries?list=${COZY_PLAYLIST}&loop=1&${params}`;
}

type Music = {
  enabled: boolean;
  viz: VizMode;
  source: Source;
  setSource: (s: Source) => void;
  /** The YouTube link the player uses ("" = the cozy mix). */
  link: string;
  setLink: (l: string) => void;
  yt: YouTubeState;
  ytPlaying: boolean;
  startYouTube: (link?: string) => void;
  stopYouTube: () => void;
  ytCmd: (func: string, args?: unknown[]) => void;
  files: FileState;
  addFiles: (list: FileList | File[]) => void;
  playFile: (index: number) => void;
  fileCmd: (cmd: "toggle" | "next" | "previous" | "stop") => void;
  seekFile: (seconds: number) => void;
  setFileVolume: (v: number) => void;
  removeFile: (index: number) => void;
  /** The analyser for LOAM's own audio (files), once something has played. */
  analyser: () => AnalyserNode | null;
  now: Now;
  media: (action: "toggle" | "next" | "previous") => Promise<void>;
  openApp: (app: "spotify" | "ytmusic") => Promise<void>;
  links: SavedLink[];
  saveLink: (l: SavedLink) => void;
  removeLink: (key: string) => void;
  openLink: (url: string) => Promise<void>;
  /** The "Add link" sheet, opened from the Music page or the dock. */
  adding: boolean;
  setAdding: (on: boolean) => void;
  /** Where the one player shows: the sidebar card when it has room, otherwise the dock. */
  place: "side" | "dock";
  setPlace: (p: "side" | "dock") => void;
  error: string;
  setError: (e: string) => void;
  /** The dock hides until something new plays. */
  dismissed: boolean;
  dismiss: () => void;
  frame: RefObject<HTMLIFrameElement | null>;
  registerSlot: (id: string, el: HTMLElement | null, priority: number) => void;
  slots: Map<string, { el: HTMLElement; priority: number }>;
  slotVersion: number;
};
const Ctx = createContext<Music | null>(null);
export const useMusic = () => {
  const m = useContext(Ctx);
  if (!m) throw new Error("useMusic outside MusicProvider");
  return m;
};

const idle: YouTubeState = { started: false, state: -1, title: "", author: "", videoId: "", volume: 60 };
const noFiles: FileState = { queue: [], index: -1, playing: false, time: 0, duration: 0, volume: 70 };
const AUDIO = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

export function MusicProvider({ children, pollPc }: { children: ReactNode; pollPc: boolean }) {
  const [enabled, setEnabled] = useState(musicEnabled);
  const [viz, setViz] = useState(vizMode);
  const [source, setSourceState] = useState<Source>(() => {
    const s = read(SRC, "youtube");
    return s === "pc" || s === "spotify" ? "pc" : s === "files" ? "files" : "youtube";
  });
  const [link, setLinkState] = useState(() => read(LINK, ""));
  const [yt, setYt] = useState<YouTubeState>(idle);
  const [files, setFiles] = useState<FileState>(noFiles);
  const [now, setNow] = useState<Now>({ active: false });
  const [links, setLinks] = useState<SavedLink[]>(loadLinks);
  const [adding, setAdding] = useState(false);
  const [place, setPlace] = useState<"side" | "dock">("dock");
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const slots = useRef(new Map<string, { el: HTMLElement; priority: number }>()).current;
  const [slotVersion, setSlotVersion] = useState(0);

  useEffect(() => {
    const sync = () => { setEnabled(musicEnabled()); setViz(vizMode()); };
    window.addEventListener("loam-music-change", sync);
    return () => window.removeEventListener("loam-music-change", sync);
  }, []);

  // ---- Files: one <audio> element for the app's lifetime, routed through an analyser once played.
  const audio = useRef<HTMLAudioElement | null>(null);
  const graph = useRef<{ ctx: AudioContext; analyser: AnalyserNode } | null>(null);
  const queue = useRef<Track[]>([]);
  queue.current = files.queue;
  const el = useCallback(() => {
    if (!audio.current) {
      const a = new Audio();
      a.preload = "metadata";
      a.volume = noFiles.volume / 100;
      audio.current = a;
    }
    return audio.current;
  }, []);
  const stopFiles = useCallback(() => { audio.current?.pause(); }, []);

  // Turning music off stops everything.
  useEffect(() => { if (!enabled) { setYt(idle); stopFiles(); } }, [enabled, stopFiles]);

  const setSource = useCallback((s: Source) => { setSourceState(s); write(SRC, s); }, []);
  const setLink = useCallback((l: string) => { setLinkState(l); write(LINK, l); }, []);
  const ytCmd = useCallback((func: string, args: unknown[] = []) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    if (func === "setVolume") setYt((y) => ({ ...y, volume: Number(args[0]) || 0 }));
  }, []);
  const startYouTube = useCallback((next?: string) => {
    setError(""); setDismissed(false); stopFiles();
    if (next !== undefined) { setLink(next); setYt({ ...idle, started: true, state: 3 }); }
    else setYt((y) => (y.started ? y : { ...idle, started: true, state: 3 }));
    setSource("youtube");
  }, [setLink, setSource, stopFiles]);
  const stopYouTube = useCallback(() => setYt(idle), []);
  const dismiss = useCallback(() => { setDismissed(true); setYt(idle); stopFiles(); }, [stopFiles]);

  // YouTube player events. Messages from a previous player (an old link) are ignored by checking
  // they come from the current frame.
  useEffect(() => {
    if (!yt.started) return;
    const onMsg = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      let host = "";
      try { host = new URL(e.origin).hostname; } catch { return; }
      if ((host !== "www.youtube-nocookie.com" && host !== "www.youtube.com") || typeof e.data !== "string") return;
      let d: { event?: string; info?: unknown };
      try { d = JSON.parse(e.data); } catch { return; }
      if (d.event === "onStateChange" && typeof d.info === "number") setYt((y) => ({ ...y, state: d.info as number }));
      if (d.event === "onError") setError("This video can't be played outside YouTube. Try another link, or skip ahead.");
      if (d.event === "infoDelivery" && d.info && typeof d.info === "object") {
        const info = d.info as { playerState?: number; volume?: number; videoData?: { title?: string; author?: string; video_id?: string } };
        setYt((y) => ({
          ...y,
          state: typeof info.playerState === "number" ? info.playerState : y.state,
          volume: typeof info.volume === "number" ? Math.round(info.volume) : y.volume,
          title: info.videoData?.title || y.title,
          author: info.videoData?.author || y.author,
          videoId: info.videoData?.video_id || y.videoId,
        }));
      }
    };
    window.addEventListener("message", onMsg);
    let tries = 0;
    const hello = window.setInterval(() => {
      frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "loam", channel: "widget" }), "*");
      if (++tries > 12) window.clearInterval(hello);
    }, 600);
    return () => { window.removeEventListener("message", onMsg); window.clearInterval(hello); };
  }, [yt.started, link]);

  // Audio element events → state. Events for a track that's no longer loaded are ignored.
  useEffect(() => {
    const a = el();
    const current = () => queue.current.findIndex((t) => t.url === a.currentSrc || t.url === a.src);
    const sync = () => setFiles((f) => ({ ...f, playing: !a.paused && !a.ended, time: a.currentTime || 0, duration: Number.isFinite(a.duration) ? a.duration : 0 }));
    const ended = () => {
      const i = current();
      if (i >= 0 && i + 1 < queue.current.length) play(i + 1);
      else sync();
    };
    const failed = () => { if (current() >= 0) { setError("This file can't be played. LOAM plays MP3, AAC/M4A, Ogg, Opus, WAV, FLAC and WebM audio."); sync(); } };
    const evs: [string, () => void][] = [["play", sync], ["pause", sync], ["timeupdate", sync], ["loadedmetadata", sync], ["ended", ended], ["error", failed]];
    for (const [n, f] of evs) a.addEventListener(n, f);
    return () => { for (const [n, f] of evs) a.removeEventListener(n, f); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function connect() {
    if (graph.current) { void graph.current.ctx.resume(); return; }
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0; // smoothing happens per frame in the visualizer
      analyser.minDecibels = -85; // a narrower window keeps one loud bass note from lighting every low band
      analyser.maxDecibels = -20;
      ctx.createMediaElementSource(el()).connect(analyser);
      analyser.connect(ctx.destination);
      graph.current = { ctx, analyser };
    } catch { /* plays without a spectrum */ }
  }
  function play(index: number) {
    const t = queue.current[index];
    if (!t) return;
    const a = el();
    setError(""); setDismissed(false); setYt(idle); setSource("files");
    connect();
    if (a.src !== t.url) { a.src = t.url; a.currentTime = 0; }
    setFiles((f) => ({ ...f, index, time: 0 }));
    void a.play().catch(() => setError("This file can't be played."));
  }
  const playFile = useCallback((i: number) => play(i), []); // eslint-disable-line react-hooks/exhaustive-deps
  const addFiles = useCallback((list: FileList | File[]) => {
    const picked = Array.from(list).filter((f) => f.type.startsWith("audio/") || AUDIO.test(f.name)).slice(0, 200);
    if (!picked.length) { setError("Choose audio files, like MP3, M4A, Ogg, WAV or FLAC."); return; }
    const added = picked.map((f) => ({ id: `${f.name}:${f.size}:${f.lastModified}`, name: f.name.replace(/\.[^.]+$/, ""), url: URL.createObjectURL(f) }));
    const fresh = added.filter((t) => !queue.current.some((q) => q.id === t.id));
    for (const t of added) if (!fresh.includes(t)) URL.revokeObjectURL(t.url);
    const start = queue.current.length;
    queue.current = [...queue.current, ...fresh];
    setFiles((f) => ({ ...f, queue: queue.current }));
    setSource("files");
    if (fresh.length && (el().paused || start === 0)) play(start);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const fileCmd = useCallback((cmd: "toggle" | "next" | "previous" | "stop") => {
    const a = el();
    const i = queue.current.findIndex((t) => t.url === a.src);
    if (cmd === "stop") { a.pause(); a.currentTime = 0; return; }
    if (cmd === "toggle") {
      if (i < 0) { play(0); return; }
      if (a.paused) { setYt(idle); connect(); void a.play().catch(() => {}); } else a.pause();
      return;
    }
    if (cmd === "previous" && a.currentTime > 3) { a.currentTime = 0; return; }
    const n = cmd === "next" ? i + 1 : i - 1;
    if (n >= 0 && n < queue.current.length) play(n);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const seekFile = useCallback((s: number) => { const a = el(); if (Number.isFinite(a.duration)) a.currentTime = Math.max(0, Math.min(a.duration, s)); }, [el]);
  const setFileVolume = useCallback((v: number) => { el().volume = Math.max(0, Math.min(100, v)) / 100; setFiles((f) => ({ ...f, volume: v })); }, [el]);
  const removeFile = useCallback((index: number) => {
    const t = queue.current[index];
    if (!t) return;
    const a = el();
    if (a.src === t.url) { a.pause(); a.removeAttribute("src"); a.load(); }
    URL.revokeObjectURL(t.url);
    queue.current = queue.current.filter((_, i) => i !== index);
    setFiles((f) => ({ ...f, queue: queue.current, index: queue.current.findIndex((q) => q.url === a.src), playing: !a.paused }));
  }, [el]);
  const analyser = useCallback(() => graph.current?.analyser ?? null, []);

  // This PC: poll Windows' media session while it's shown (dock or Music page) and LOAM is visible.
  useEffect(() => {
    if (!enabled || !native || (!pollPc && source !== "pc")) return;
    let live = true;
    const tick = () => { if (!document.hidden) void call<Now>("mediaNow", { prefer: "any" }).then((n) => { if (!live) return; setNow((p) => { if (n.title && n.title !== p.title) setDismissed(false); return n; }); }).catch(() => {}); };
    tick();
    const t = window.setInterval(tick, pollPc ? 2000 : 5000);
    document.addEventListener("visibilitychange", tick);
    return () => { live = false; window.clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [enabled, source, pollPc]);

  const media = useCallback(async (action: "toggle" | "next" | "previous") => {
    setError("");
    try {
      await call("mediaControl", { prefer: "any", action });
      window.setTimeout(() => void call<Now>("mediaNow", { prefer: "any" }).then(setNow).catch(() => {}), 350);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);
  const openApp = useCallback(async (app: "spotify" | "ytmusic") => {
    try { await call("openMusicApp", { app }); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);
  const saveLink = useCallback((l: SavedLink) => setLinks((list) => { const next = addTo(list, l); storeLinks(next); return next; }), []);
  const removeLink = useCallback((key: string) => setLinks((list) => { const next = list.filter((l) => l.key !== key); storeLinks(next); return next; }), []);
  const openLink = useCallback(async (url: string) => {
    setError("");
    if (!native) { window.open(url, "_blank", "noopener"); return; }
    try { await call("openMusicLink", { url }); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);
  const registerSlot = useCallback((id: string, el: HTMLElement | null, priority: number) => {
    if (el) slots.set(id, { el, priority }); else slots.delete(id);
    setSlotVersion((v) => v + 1);
  }, [slots]);

  const value = useMemo<Music>(() => ({
    enabled, viz, source, setSource, link, setLink, yt, ytPlaying: yt.state === 1 || yt.state === 3,
    startYouTube, stopYouTube, ytCmd, files, addFiles, playFile, fileCmd, seekFile, setFileVolume, removeFile, analyser,
    now, media, openApp, links, saveLink, removeLink, openLink, adding, setAdding, place, setPlace,
    error, setError, dismissed, dismiss, frame, registerSlot, slots, slotVersion,
  }), [enabled, viz, source, setSource, link, setLink, yt, startYouTube, stopYouTube, ytCmd, files, addFiles, playFile, fileCmd, seekFile, setFileVolume, removeFile, analyser,
    now, media, openApp, links, saveLink, removeLink, openLink, adding, place, error, dismissed, dismiss, registerSlot, slots, slotVersion]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Reserves a place for the YouTube player. The highest-priority visible slot gets it. */
export function useMusicSlot(id: string, priority: number, active = true) {
  const { registerSlot } = useMusic();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    registerSlot(id, active ? ref.current : null, priority);
    return () => registerSlot(id, null, priority);
  }, [id, priority, active, registerSlot]);
  return ref;
}

/**
 * The one YouTube iframe. It never moves in the DOM (moving an iframe reloads it); it's fixed-
 * positioned over the current slot and follows it as layout changes.
 */
export function YouTubeHost() {
  const { yt, link, frame, slots, slotVersion, enabled } = useMusic();
  const host = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState("");
  // Load once per start or link change; autoplay is fine here because the player pressed Play.
  useEffect(() => { setSrc(yt.started ? embedUrl(link, true) : ""); }, [yt.started, link]);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el || !yt.started) return;
    let frameId = 0, current: HTMLElement | null = null;
    const pick = () => {
      let best: { el: HTMLElement; priority: number } | null = null;
      for (const s of slots.values()) if (s.el.isConnected && s.el.offsetParent !== null && (!best || s.priority > best.priority)) best = s;
      return best?.el ?? null;
    };
    const place = () => {
      frameId = 0;
      current = pick();
      if (!current) { el.style.visibility = "hidden"; return; }
      const r = current.getBoundingClientRect();
      el.style.visibility = "visible";
      el.style.transform = `translate3d(${Math.round(r.left)}px, ${Math.round(r.top)}px, 0)`;
      el.style.width = `${Math.round(r.width)}px`;
      el.style.height = `${Math.round(r.height)}px`;
      el.style.borderRadius = getComputedStyle(current).borderRadius;
      // Clip to the scroll container so the player never draws over the title bar or dock.
      const scroller = current.closest(".v17-content") as HTMLElement | null;
      if (scroller && scroller.contains(current)) {
        const b = scroller.getBoundingClientRect();
        const top = Math.max(0, b.top - r.top), bottom = Math.max(0, r.bottom - b.bottom);
        el.style.clipPath = top || bottom ? `inset(${top}px 0 ${bottom}px 0 round ${getComputedStyle(current).borderRadius})` : "";
      } else el.style.clipPath = "";
    };
    const schedule = () => { if (!frameId) frameId = requestAnimationFrame(place); };
    place();
    const ro = new ResizeObserver(schedule);
    for (const s of slots.values()) ro.observe(s.el);
    ro.observe(document.documentElement);
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    // Slots move when sheets open or the page animates in; a cheap check keeps up with that.
    const poll = window.setInterval(schedule, 400);
    return () => { cancelAnimationFrame(frameId); ro.disconnect(); window.removeEventListener("resize", schedule); document.removeEventListener("scroll", schedule, true); window.clearInterval(poll); };
  }, [yt.started, slotVersion, slots]);
  if (!enabled || !yt.started || !src) return null;
  return (
    <div ref={host} className="v19-yt-host" style={{ visibility: "hidden" }}>
      <iframe ref={frame} key={src} src={src} title="YouTube music player" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
    </div>
  );
}
