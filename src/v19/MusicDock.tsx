// The music dock (1.8): a reserved row at the bottom of the window, so it never covers content.
// It describes what's actually playing and offers only the controls that source supports.
import { useLayoutEffect, useRef } from "react";
import { Link2, Maximize2, Music2, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { useMusic, useMusicSlot } from "./music";
import Visualizer from "./Visualizer";

export default function MusicDock({ page, onOpen }: { page: string; onOpen: () => void }) {
  const m = useMusic();
  // At narrow widths the sidebar has no room for YouTube's player, so the dock holds it.
  const slot = useMusicSlot("dock", 0, m.yt.started && page !== "music");
  // Toasts and other bottom-anchored things sit above the dock: publish its height.
  const box = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const set = () => document.documentElement.style.setProperty("--dock-h", `${box.current?.offsetHeight ?? 0}px`);
    set();
    const ro = box.current ? new ResizeObserver(set) : null;
    if (box.current) ro!.observe(box.current);
    return () => { ro?.disconnect(); document.documentElement.style.setProperty("--dock-h", "0px"); };
  });
  // A loaded YouTube player always wins: it's the one that must stay visible.
  const yt = m.yt.started;
  const track = m.files.queue[m.files.index];
  const files = !yt && m.source === "files" && !!track;
  const pc = !yt && !files && m.source === "pc" && m.now.active;
  if (!m.enabled || m.dismissed || page === "music" || (!yt && !files && !pc)) return null;

  const playing = yt ? m.ytPlaying : files ? m.files.playing : !!m.now.playing;
  const title = yt ? m.yt.title || "Loading…" : files ? track.name : m.now.title || "Unknown track";
  const by = yt ? m.yt.author : files ? "" : m.now.artist;
  const provider = yt ? "YouTube" : files ? "File on this PC" : m.now.source || "Another app";
  const art = yt ? (m.yt.videoId ? `https://i.ytimg.com/vi/${m.yt.videoId}/mqdefault.jpg` : null) : files ? null : m.now.art;
  const toggle = () => (yt ? m.ytCmd(playing ? "pauseVideo" : "playVideo") : files ? m.fileCmd("toggle") : void m.media("toggle"));
  const skip = (dir: "next" | "previous") => (yt ? m.ytCmd(dir === "next" ? "nextVideo" : "previousVideo") : files ? m.fileCmd(dir) : void m.media(dir));
  const volume = yt ? m.yt.volume : m.files.volume;
  return (
    <section ref={box} className={`v19-dock ${yt ? "has-player" : ""}`} aria-label="Music">
      {yt && <div ref={slot} className="v19-yt-slot v19-yt-slot-dock" aria-hidden="true" />}
      <button type="button" className="v19-dock-track" onClick={onOpen} title="Open Music">
        <span className={`v19-dock-art ${yt ? "is-video" : ""}`}>{art ? <img src={art} alt="" /> : <Music2 size={18} />}</span>
        <span className="v19-dock-text">
          <strong title={title}>{title}</strong>
          <small>{by ? <>{by} · </> : null}{provider}</small>
        </span>
      </button>
      <div className="v19-dock-controls">
        <button type="button" className="v19-icon" aria-label="Previous" onClick={() => skip("previous")}><SkipBack size={16} /></button>
        <button type="button" className="v19-dock-play" aria-label={playing ? "Pause" : "Play"} onClick={toggle}>
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button type="button" className="v19-icon" aria-label="Next" onClick={() => skip("next")}><SkipForward size={16} /></button>
      </div>
      <div className="v19-dock-end">
        <Visualizer mode={m.viz} playing={yt ? m.yt.state === 1 : playing} analyser={files ? m.analyser() : null} bars={16} className="v19-viz-dock" />
        {(yt || files) && (
          <label className="v19-dock-volume" title="Volume">
            <Volume2 size={15} aria-hidden="true" />
            <input type="range" min={0} max={100} step={1} value={volume} aria-label="Volume"
              onChange={(e) => { const v = Math.max(0, Math.min(100, +e.target.value)); if (yt) m.ytCmd("setVolume", [v]); else m.setFileVolume(v); }} />
          </label>
        )}
        <button type="button" className="v19-icon" aria-label="Add a music link" title="Add a music link" onClick={() => m.setAdding(true)}><Link2 size={15} /></button>
        <button type="button" className="v19-icon" aria-label="Open Music" title="Open Music" onClick={onOpen}><Maximize2 size={15} /></button>
        <button type="button" className="v19-icon" aria-label={yt ? "Stop and close the player" : files ? "Stop and hide" : "Hide the dock"} title={yt ? "Stop and close (YouTube's player can't play hidden)" : files ? "Stop and hide" : "Hide until the next track"} onClick={m.dismiss}><X size={16} /></button>
      </div>
    </section>
  );
}
