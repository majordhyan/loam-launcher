// What's playing, in one place (1.9). LOAM shows a single music player at a time: a card in the
// sidebar when it has room, otherwise the dock at the bottom of the window. Both read from
// `useNowPlaying`, so they always offer the same controls for the same source.
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Maximize2, Music2, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { useMusic, useMusicSlot } from "./music";
import PlaylistMenu from "./PlaylistMenu";
import Visualizer from "./Visualizer";

export const clock = (s: number) => (Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

export function useNowPlaying(page: string) {
  const m = useMusic();
  const yt = m.yt.started;
  const track = m.files.queue[m.files.index];
  const files = !yt && m.source === "files" && !!track;
  const pc = !yt && !files && m.source === "pc" && m.now.active;
  const shown = m.enabled && !m.dismissed && page !== "music" && (yt || files || pc);
  const playing = yt ? m.ytPlaying : files ? m.files.playing : !!m.now.playing;
  return {
    m, yt, files, pc, shown, playing,
    /** Playing for the visualizer: YouTube's "buffering" doesn't count. */
    sounding: yt ? m.yt.state === 1 : playing,
    title: yt ? m.yt.title || "Loading…" : files ? track.name : m.now.title || "Unknown track",
    by: yt ? m.yt.author : files ? "" : m.now.artist || "",
    provider: yt ? "YouTube" : files ? "File on this PC" : m.now.source || "Another app",
    art: yt ? null : files ? null : m.now.art || null,
    volume: yt ? m.yt.volume : m.files.volume,
    hasVolume: yt || files,
    toggle: () => (yt ? m.ytCmd(playing ? "pauseVideo" : "playVideo") : files ? m.fileCmd("toggle") : void m.media("toggle")),
    skip: (dir: "next" | "previous") => (yt ? m.ytCmd(dir === "next" ? "nextVideo" : "previousVideo") : files ? m.fileCmd(dir) : void m.media(dir)),
    setVolume: (v: number) => { const n = Math.max(0, Math.min(100, v)); if (yt) m.ytCmd("setVolume", [n]); else m.setFileVolume(n); },
    analyser: files ? m.analyser() : null,
    /** Position and length where the source reports them (YouTube, files); 0 when unknown. */
    time: yt ? m.yt.time : files ? m.files.time : 0,
    duration: yt ? m.yt.duration : files ? m.files.duration : 0,
    seek: (s: number) => (yt ? m.ytCmd("seekTo", [s, true]) : files ? m.seekFile(s) : undefined),
  };
}

// Room each layout needs in the sidebar (CSS px): the rendered card's height plus a 4 px margin.
// Full: player (or artwork), track, visualizer, progress, controls and volume. Compact: player
// (or artwork), track, and one row of controls with a small visualizer. Mini: player (or artwork
// for files) and a single row with play, the track and close, for short windows. YouTube's player
// is always at least 200 × 200, as YouTube requires.
const NEED = { video: { full: 388, compact: 283, mini: 250 }, audio: { full: 197, compact: 89, mini: 52 } };
type Density = "full" | "compact" | "mini";

/**
 * The sidebar card. It measures the sidebar's free space and tells the music state where the
 * player belongs; when it doesn't fit (short windows, or the icon rail below 1100 px), the dock
 * takes over and this renders nothing.
 */
export function SidePlayer({ page, onOpen, sidebar, fill }: { page: string; onOpen: () => void; sidebar: RefObject<HTMLElement | null>; fill: RefObject<HTMLElement | null> }) {
  const n = useNowPlaying(page);
  const { m } = n;
  const card = useRef<HTMLDivElement>(null);
  const side = m.place === "side";
  const slot = useMusicSlot("sidebar", 1, n.shown && n.yt && side);
  const need = n.yt ? NEED.video : NEED.audio;
  const [density, setDensity] = useState<Density>("full");
  useLayoutEffect(() => {
    // Prefer the sidebar: the full card when it fits, the compact card when only that fits, and the
    // dock only when neither does (short windows, or the icon rail below 1100 px).
    const check = () => {
      const rail = window.innerWidth < 1100; // the sidebar's icon-rail breakpoint
      const free = Math.max(0, (fill.current?.offsetHeight ?? 0) - 12) + (card.current?.offsetHeight ?? 0);
      const fits: Density | null = rail ? null : free >= need.full ? "full" : free >= need.compact ? "compact" : free >= need.mini ? "mini" : null;
      if (fits) setDensity(fits);
      m.setPlace(fits ? "side" : "dock");
    };
    check();
    const ro = new ResizeObserver(check);
    if (sidebar.current) ro.observe(sidebar.current);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); window.removeEventListener("resize", check); };
  }, [need, n.shown, m.setPlace, sidebar, fill]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!n.shown || !side) return null;
  return (
    <div ref={card} className={`v19-side-player ${n.yt ? "has-video" : ""} is-${density}`} role="region" aria-label="Music">
      {n.yt && <div ref={slot} className="v19-yt-slot v19-yt-slot-side" />}
      {density === "mini" ? (
        <div className="v19-sp-body v19-sp-row">
          <button type="button" className="v19-dock-play" aria-label={n.playing ? "Pause" : "Play"} onClick={n.toggle}>
            {n.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          </button>
          <button type="button" className="v19-sp-track" onClick={onOpen} title="Open Music">
            <span className="v19-sp-text">
              <strong title={n.title}>{n.title}</strong>
              <small>{n.by || n.provider}</small>
            </span>
          </button>
          <button type="button" className="v19-icon" aria-label="Next" onClick={() => n.skip("next")}><SkipForward size={15} /></button>
          <button type="button" className="v19-icon" aria-label={n.yt ? "Stop and close the player" : "Stop and hide"} title={n.yt ? "Stop and close (YouTube's player can't play hidden)" : "Stop and hide"} onClick={m.dismiss}><X size={15} /></button>
        </div>
      ) : (
        <div className="v19-sp-body">
          <div className="v19-sp-head">
            <button type="button" className="v19-sp-track" onClick={onOpen} title="Open Music">
              {!n.yt && <span className={`v19-sp-art ${n.files ? "is-file" : ""}`}>{n.art ? <img src={n.art} alt="" /> : <Music2 size={16} />}</span>}
              <span className="v19-sp-text">
                <strong title={n.title}>{n.title}</strong>
                <small>{n.by ? `${n.by} · ` : ""}{n.provider}</small>
              </span>
            </button>
            <PlaylistMenu placement="right" size={15} />
          </div>
          {density === "full" && <Visualizer mode={m.viz} playing={n.sounding} analyser={n.analyser} bars={26} className="v19-viz-side" />}
          {density === "full" && n.duration > 0 && (
            <label className="v19-sp-seek">
              <input type="range" min={0} max={Math.floor(n.duration)} step={1} value={Math.min(Math.floor(n.time), Math.floor(n.duration))} aria-label="Position"
                style={{ "--p": `${Math.min(100, (n.time / n.duration) * 100)}%` } as React.CSSProperties} onChange={(e) => n.seek(+e.target.value)} />
              <span>{clock(n.time)}</span><span>{clock(n.duration)}</span>
            </label>
          )}
          <div className="v19-sp-controls">
            <button type="button" className="v19-icon" aria-label="Previous" onClick={() => n.skip("previous")}><SkipBack size={15} /></button>
            <button type="button" className="v19-dock-play" aria-label={n.playing ? "Pause" : "Play"} onClick={n.toggle}>
              {n.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            </button>
            <button type="button" className="v19-icon" aria-label="Next" onClick={() => n.skip("next")}><SkipForward size={15} /></button>
            {density === "compact" ? <span className="v19-sp-mini-viz"><Visualizer mode={m.viz} playing={n.sounding} analyser={n.analyser} bars={9} className="v19-viz-inline" /></span> : <span className="v19-grow" />}
            <button type="button" className="v19-icon" aria-label="Open Music" title="Open Music" onClick={onOpen}><Maximize2 size={14} /></button>
            <button type="button" className="v19-icon" aria-label={n.yt ? "Stop and close the player" : "Stop and hide"} title={n.yt ? "Stop and close (YouTube's player can't play hidden)" : "Stop and hide"} onClick={m.dismiss}><X size={15} /></button>
          </div>
          {density === "full" && n.hasVolume && (
            <label className="v19-sp-volume" title="Volume">
              <Volume2 size={14} aria-hidden="true" />
              <input type="range" min={0} max={100} step={1} value={n.volume} aria-label="Volume" onChange={(e) => n.setVolume(+e.target.value)} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
