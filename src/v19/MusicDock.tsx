// The music dock (1.8): a reserved row at the bottom of the window, so it never covers content.
// It describes what's actually playing and offers only the controls that source supports.
import { Maximize2, Music2, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { native } from "../api";
import { useMusic, useMusicSlot } from "./music";
import Visualizer from "./Visualizer";

export default function MusicDock({ page, onOpen }: { page: string; onOpen: () => void }) {
  const m = useMusic();
  // At narrow widths the sidebar has no room for YouTube's player, so the dock holds it.
  const slot = useMusicSlot("dock", 0, m.yt.started && page !== "music");
  // A loaded YouTube player always wins: it's the one that must stay visible.
  const yt = m.yt.started;
  const pc = !yt && m.source === "pc" && m.now.active;
  if (!m.enabled || m.dismissed || page === "music" || (!yt && !pc)) return null;

  const playing = yt ? m.ytPlaying : !!m.now.playing;
  const title = yt ? m.yt.title || "Loading…" : m.now.title || "Unknown track";
  const by = yt ? m.yt.author : m.now.artist;
  const provider = yt ? "YouTube" : m.now.source || "This PC";
  const art = yt ? (m.yt.videoId ? `https://i.ytimg.com/vi/${m.yt.videoId}/mqdefault.jpg` : null) : m.now.art;
  const toggle = () => (yt ? m.ytCmd(playing ? "pauseVideo" : "playVideo") : void m.media("toggle"));
  return (
    <section className={`v19-dock ${yt ? "has-player" : ""}`} aria-label="Music">
      {yt && <div ref={slot} className="v19-yt-slot v19-yt-slot-dock" aria-hidden="true" />}
      <button type="button" className="v19-dock-track" onClick={onOpen} title="Open Music">
        <span className={`v19-dock-art ${yt ? "is-video" : ""}`}>{art ? <img src={art} alt="" /> : <Music2 size={18} />}</span>
        <span className="v19-dock-text">
          <strong title={title}>{title}</strong>
          <small>{by ? <>{by} · </> : null}{provider}</small>
        </span>
      </button>
      <div className="v19-dock-controls">
        <button type="button" className="v19-icon" aria-label="Previous" onClick={() => (yt ? m.ytCmd("previousVideo") : void m.media("previous"))}><SkipBack size={16} /></button>
        <button type="button" className="v19-dock-play" aria-label={playing ? "Pause" : "Play"} onClick={toggle}>
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button type="button" className="v19-icon" aria-label="Next" onClick={() => (yt ? m.ytCmd("nextVideo") : void m.media("next"))}><SkipForward size={16} /></button>
      </div>
      <div className="v19-dock-end">
        {m.viz && (native || playing) && <Visualizer bars={16} className="v19-viz-dock" demo={!native && playing} />}
        {yt && (
          <label className="v19-dock-volume" title="Volume">
            <Volume2 size={15} aria-hidden="true" />
            <input type="range" min={0} max={100} step={1} value={m.yt.volume} aria-label="Volume"
              onChange={(e) => m.ytCmd("setVolume", [Math.max(0, Math.min(100, +e.target.value))])} />
          </label>
        )}
        <button type="button" className="v19-icon" aria-label="Open Music" title="Open Music" onClick={onOpen}><Maximize2 size={15} /></button>
        <button type="button" className="v19-icon" aria-label={yt ? "Stop and close the player" : "Hide the dock"} title={yt ? "Stop and close (YouTube's player can't play hidden)" : "Hide until the next track"} onClick={m.dismiss}><X size={16} /></button>
      </div>
    </section>
  );
}
