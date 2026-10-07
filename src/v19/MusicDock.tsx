// The music dock (1.8): a reserved row at the bottom of the window, so it never covers content.
// Since 1.9 it's the fallback: when the sidebar has room, the sidebar card is the only player and
// the dock stays hidden. It offers only the controls the playing source supports.
import { useLayoutEffect, useRef } from "react";
import { Link2, Maximize2, Music2, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { useMusicSlot } from "./music";
import { useNowPlaying } from "./NowPlaying";
import Visualizer from "./Visualizer";

export default function MusicDock({ page, onOpen }: { page: string; onOpen: () => void }) {
  const n = useNowPlaying(page);
  const { m } = n;
  const show = n.shown && m.place === "dock";
  const slot = useMusicSlot("dock", 0, show && n.yt);
  // Toasts and other bottom-anchored things sit above the dock: publish its height.
  const box = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const set = () => document.documentElement.style.setProperty("--dock-h", `${box.current?.offsetHeight ?? 0}px`);
    set();
    const ro = box.current ? new ResizeObserver(set) : null;
    if (box.current) ro!.observe(box.current);
    return () => { ro?.disconnect(); document.documentElement.style.setProperty("--dock-h", "0px"); };
  });
  if (!show) return null;

  const art = n.yt ? null : n.art;
  return (
    <section ref={box} className={`v19-dock ${n.yt ? "has-player" : ""}`} aria-label="Music">
      {n.yt && <div ref={slot} className="v19-yt-slot v19-yt-slot-dock" aria-hidden="true" />}
      <button type="button" className="v19-dock-track" onClick={onOpen} title="Open Music">
        {!n.yt && <span className="v19-dock-art">{art ? <img src={art} alt="" /> : <Music2 size={18} />}</span>}
        <span className="v19-dock-text">
          <strong title={n.title}>{n.title}</strong>
          <small>{n.by ? <>{n.by} · </> : null}{n.provider}</small>
        </span>
      </button>
      <div className="v19-dock-controls">
        <button type="button" className="v19-icon" aria-label="Previous" onClick={() => n.skip("previous")}><SkipBack size={16} /></button>
        <button type="button" className="v19-dock-play" aria-label={n.playing ? "Pause" : "Play"} onClick={n.toggle}>
          {n.playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button type="button" className="v19-icon" aria-label="Next" onClick={() => n.skip("next")}><SkipForward size={16} /></button>
      </div>
      <div className="v19-dock-end">
        <Visualizer mode={m.viz} playing={n.sounding} analyser={n.analyser} bars={18} className="v19-viz-dock" />
        {n.hasVolume && (
          <label className="v19-dock-volume" title="Volume">
            <Volume2 size={15} aria-hidden="true" />
            <input type="range" min={0} max={100} step={1} value={n.volume} aria-label="Volume" onChange={(e) => n.setVolume(+e.target.value)} />
          </label>
        )}
        <button type="button" className="v19-icon" aria-label="Add a music link" title="Add a music link" onClick={() => m.setAdding(true)}><Link2 size={15} /></button>
        <button type="button" className="v19-icon" aria-label="Open Music" title="Open Music" onClick={onOpen}><Maximize2 size={15} /></button>
        <button type="button" className="v19-icon" aria-label={n.yt ? "Stop and close the player" : n.files ? "Stop and hide" : "Hide the dock"} title={n.yt ? "Stop and close (YouTube's player can't play hidden)" : n.files ? "Stop and hide" : "Hide until the next track"} onClick={m.dismiss}><X size={16} /></button>
      </div>
    </section>
  );
}
