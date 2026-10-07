// Music state for the whole app (1.8). It lives above the pages, so navigating never restarts
// playback, and there is only ever one YouTube player.
//
// • YouTube: the cozy chill mix or the player's own YouTube / YouTube Music link, through
//   YouTube's privacy-enhanced embedded player. YouTube's rules require that player to stay
//   visible at 200 × 200 px or more while it plays, so it never collapses to audio only: one
//   iframe is positioned over a reserved slot (the Music page, the sidebar, or the dock at narrow
//   widths). Nothing loads until the player presses Play: no autoplay at startup.
// • This PC: remote control of whatever another app is playing (Spotify, YouTube Music, …)
//   through Windows' media controls. No login, nothing embedded, so an audio-only dock is fine.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { call, native } from "../api";

export const COZY_PLAYLIST = "PLQwRmTwWx0ubcpv0SkHroupj1LqW5_Va5";
const KEY = "loam_music", SRC = "loam_music_source", VIZ = "loam_music_viz", LINK = "loam_music_link";
export type Source = "youtube" | "pc";
export type Now = { active: boolean; title?: string; artist?: string; art?: string | null; playing?: boolean; source?: string; app?: string };
export type YouTubeState = { started: boolean; state: number; title: string; author: string; videoId: string; volume: number };

const read = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
export function musicEnabled() { return read(KEY, "true") !== "false"; }
export function setMusicEnabled(on: boolean) { write(KEY, String(on)); window.dispatchEvent(new Event("loam-music-change")); }
export function visualizerEnabled() { return read(VIZ, "true") !== "false"; }
export function setVisualizerEnabled(on: boolean) { write(VIZ, String(on)); window.dispatchEvent(new Event("loam-music-change")); }

/** A YouTube or YouTube Music link → what to embed. Only validated IDs are kept. */
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

export function embedUrl(link: string, autoplay: boolean) {
  const custom = link ? parseYouTube(link) : null;
  const params = `enablejsapi=1&rel=0&modestbranding=1&playsinline=1${autoplay ? "&autoplay=1" : ""}&origin=${encodeURIComponent(window.location.origin)}`;
  if (custom?.list) return `https://www.youtube-nocookie.com/embed/videoseries?list=${custom.list}&loop=1&${params}`;
  if (custom?.video) return `https://www.youtube-nocookie.com/embed/${custom.video}?loop=1&playlist=${custom.video}&${params}`;
  return `https://www.youtube-nocookie.com/embed/videoseries?list=${COZY_PLAYLIST}&loop=1&${params}`;
}

type Music = {
  enabled: boolean;
  viz: boolean;
  source: Source;
  setSource: (s: Source) => void;
  link: string;
  setLink: (l: string) => void;
  yt: YouTubeState;
  ytPlaying: boolean;
  startYouTube: () => void;
  stopYouTube: () => void;
  ytCmd: (func: string, args?: unknown[]) => void;
  now: Now;
  media: (action: "toggle" | "next" | "previous") => Promise<void>;
  openApp: (app: "spotify" | "ytmusic") => Promise<void>;
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

export function MusicProvider({ children, pollPc }: { children: ReactNode; pollPc: boolean }) {
  const [enabled, setEnabled] = useState(musicEnabled);
  const [viz, setViz] = useState(visualizerEnabled);
  const [source, setSourceState] = useState<Source>(() => (read(SRC, "youtube") === "pc" || read(SRC, "") === "spotify" ? "pc" : "youtube"));
  const [link, setLinkState] = useState(() => read(LINK, ""));
  const [yt, setYt] = useState<YouTubeState>(idle);
  const [now, setNow] = useState<Now>({ active: false });
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const slots = useRef(new Map<string, { el: HTMLElement; priority: number }>()).current;
  const [slotVersion, setSlotVersion] = useState(0);

  useEffect(() => {
    const sync = () => { setEnabled(musicEnabled()); setViz(visualizerEnabled()); };
    window.addEventListener("loam-music-change", sync);
    return () => window.removeEventListener("loam-music-change", sync);
  }, []);
  // Turning music off stops it.
  useEffect(() => { if (!enabled) setYt(idle); }, [enabled]);

  const setSource = useCallback((s: Source) => { setSourceState(s); write(SRC, s); }, []);
  const setLink = useCallback((l: string) => { setLinkState(l); write(LINK, l); }, []);
  const ytCmd = useCallback((func: string, args: unknown[] = []) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    if (func === "setVolume") setYt((y) => ({ ...y, volume: Number(args[0]) || 0 }));
  }, []);
  const startYouTube = useCallback(() => { setError(""); setDismissed(false); setYt((y) => (y.started ? y : { ...idle, started: true, state: 3 })); }, []);
  const stopYouTube = useCallback(() => setYt(idle), []);
  const dismiss = useCallback(() => { setDismissed(true); setYt(idle); }, []);

  // YouTube player events: state, title, channel, video id.
  useEffect(() => {
    if (!yt.started) return;
    const onMsg = (e: MessageEvent) => {
      let host = "";
      try { host = new URL(e.origin).hostname; } catch { return; }
      if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host) || typeof e.data !== "string") return;
      let d: { event?: string; info?: unknown };
      try { d = JSON.parse(e.data); } catch { return; }
      if (d.event === "onStateChange" && typeof d.info === "number") setYt((y) => ({ ...y, state: d.info as number }));
      if (d.event === "onError") setError("This video can't be played in LOAM. Try another link, or skip ahead.");
      if (d.event === "infoDelivery" && d.info && typeof d.info === "object") {
        const info = d.info as { playerState?: number; videoData?: { title?: string; author?: string; video_id?: string } };
        setYt((y) => ({
          ...y,
          state: typeof info.playerState === "number" ? info.playerState : y.state,
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
  const registerSlot = useCallback((id: string, el: HTMLElement | null, priority: number) => {
    if (el) slots.set(id, { el, priority }); else slots.delete(id);
    setSlotVersion((v) => v + 1);
  }, [slots]);

  const value = useMemo<Music>(() => ({
    enabled, viz, source, setSource, link, setLink, yt, ytPlaying: yt.state === 1 || yt.state === 3,
    startYouTube, stopYouTube, ytCmd, now, media, openApp, error, setError, dismissed, dismiss, frame, registerSlot, slots, slotVersion,
  }), [enabled, viz, source, setSource, link, setLink, yt, startYouTube, stopYouTube, ytCmd, now, media, openApp, error, dismissed, dismiss, registerSlot, slots, slotVersion]);
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
