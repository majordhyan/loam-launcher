// Music page (1.8): choose a source, see what's playing, and control it. Each source says what it
// can actually do: YouTube plays inside LOAM in YouTube's own player; This PC remote-controls
// another app through Windows' media controls.
import { useState } from "react";
import { ExternalLink, Link2, Music2, Pause, Play, RotateCcw, SkipBack, SkipForward, Square, Volume2 } from "lucide-react";
import { native } from "../api";
import { parseYouTube, setVisualizerEnabled, useMusic, useMusicSlot } from "./music";
import Visualizer from "./Visualizer";

export default function MusicPage() {
  const m = useMusic();
  const slot = useMusicSlot("page", 2, m.yt.started);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const custom = m.link ? parseYouTube(m.link) : null;

  if (!m.enabled) {
    return (
      <main className="v17-page v19-music-page">
        <header className="v17-page-head"><div><h1 className="v17-display">Music</h1><p className="v19-subtitle">The music player is turned off.</p></div></header>
        <p className="muted">Turn it on in Settings › Home & sound.</p>
      </main>
    );
  }
  function saveLink() {
    const v = draft.trim();
    if (!v) { m.setLink(""); setEditing(false); return; }
    if (!parseYouTube(v)) { m.setError("Paste a YouTube or YouTube Music link to a playlist or a video."); return; }
    m.setError("");
    m.setLink(v);
    setEditing(false);
  }
  const yt = m.source === "youtube";
  return (
    <main className="v17-page v19-music-page">
      <header className="v17-page-head">
        <div>
          <h1 className="v17-display">Music</h1>
          <p className="v19-subtitle">Play something while you build. Playback keeps going when you switch pages.</p>
        </div>
        <div className="v17-segment" role="tablist" aria-label="Music source">
          <button type="button" role="tab" aria-selected={yt} className={yt ? "active" : ""} onClick={() => m.setSource("youtube")}>YouTube</button>
          <button type="button" role="tab" aria-selected={!yt} className={!yt ? "active" : ""} onClick={() => m.setSource("pc")}>This PC</button>
        </div>
      </header>

      {yt ? (
        <section className="v19-music-grid">
          <div className="v19-music-stage">
            {m.yt.started ? (
              <div ref={slot} className="v19-yt-slot v19-yt-slot-page" />
            ) : (
              <div className="v19-music-start">
                <Music2 size={28} />
                <strong>{custom ? "Your playlist" : "Cozy chill mix"}</strong>
                <p>Plays in YouTube's own player, here and in a small panel while you use the rest of LOAM. YouTube requires its player to stay visible while it plays.</p>
                <button type="button" className="v17-btn v17-btn-primary" onClick={m.startYouTube}><Play size={16} fill="currentColor" /> Play</button>
              </div>
            )}
          </div>
          <aside className="v19-music-side">
            <div className="v19-panel">
              <p className="v19-label">Now playing</p>
              <strong className="v19-music-title">{m.yt.started ? m.yt.title || "Loading…" : "Nothing yet"}</strong>
              <p className="muted v19-music-by">{m.yt.started ? m.yt.author || "YouTube" : "Press Play to start."}</p>
              {m.viz && <Visualizer className="v19-viz-page" demo={!native && m.ytPlaying} />}
              <div className="v19-music-controls">
                <button type="button" className="v19-icon" aria-label="Previous" disabled={!m.yt.started} onClick={() => m.ytCmd("previousVideo")}><SkipBack size={17} /></button>
                <button type="button" className="v19-dock-play is-lg" aria-label={m.ytPlaying ? "Pause" : "Play"}
                  onClick={() => (!m.yt.started ? m.startYouTube() : m.ytCmd(m.ytPlaying ? "pauseVideo" : "playVideo"))}>
                  {m.ytPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <button type="button" className="v19-icon" aria-label="Next" disabled={!m.yt.started} onClick={() => m.ytCmd("nextVideo")}><SkipForward size={17} /></button>
                <button type="button" className="v19-icon" aria-label="Stop" title="Stop and close the player" disabled={!m.yt.started} onClick={m.stopYouTube}><Square size={14} fill="currentColor" /></button>
              </div>
              <label className="v19-volume">
                <Volume2 size={15} aria-hidden="true" />
                <input type="range" min={0} max={100} step={1} value={m.yt.volume} aria-label="Volume" disabled={!m.yt.started}
                  onChange={(e) => m.ytCmd("setVolume", [Math.max(0, Math.min(100, +e.target.value))])} />
                <span className="v19-volume-value">{m.yt.volume}</span>
              </label>
            </div>
            <div className="v19-panel">
              <p className="v19-label">Playlist</p>
              {editing ? (
                <form className="v19-link-form" onSubmit={(e) => { e.preventDefault(); saveLink(); }}>
                  <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://music.youtube.com/playlist?list=…" aria-label="YouTube or YouTube Music link" />
                  <div className="v19-row-end">
                    <button type="button" className="v17-btn v17-btn-sm v17-btn-ghost" onClick={() => { setEditing(false); m.setError(""); }}>Cancel</button>
                    <button type="submit" className="v17-btn v17-btn-sm v17-btn-primary">Use this link</button>
                  </div>
                </form>
              ) : (
                <>
                  <strong>{custom ? (custom.list ? "Your playlist" : "Your video, on repeat") : "Cozy chill mix"}</strong>
                  <p className="muted">{custom ? "From the link you added." : "LOAM's default playlist."} Paste any YouTube or YouTube Music playlist or video link.</p>
                  <div className="v19-row">
                    <button type="button" className="v17-btn v17-btn-sm" onClick={() => { setDraft(m.link); setEditing(true); }}><Link2 size={14} /> {custom ? "Change link" : "Use your own link"}</button>
                    {custom && <button type="button" className="v17-btn v17-btn-sm v17-btn-ghost" onClick={() => m.setLink("")}><RotateCcw size={14} /> Cozy mix</button>}
                  </div>
                </>
              )}
              {m.error && <p className="field-error" role="alert">{m.error}</p>}
            </div>
          </aside>
        </section>
      ) : (
        <section className="v19-music-grid">
          <div className="v19-music-stage v19-pc-stage">
            {m.now.active ? (
              <div className="v19-pc-now">
                {m.now.art ? <img src={m.now.art} alt="" /> : <span className="v19-pc-art"><Music2 size={36} /></span>}
                <div>
                  <p className="v19-label">{m.now.source || "Playing on this PC"}</p>
                  <strong>{m.now.title || "Unknown track"}</strong>
                  <span>{m.now.artist}</span>
                </div>
              </div>
            ) : (
              <div className="v19-music-start">
                <Music2 size={28} />
                <strong>Nothing is playing on this PC</strong>
                <p>Play music in Spotify, YouTube Music, a browser or any app that shows in Windows' media controls. LOAM can then pause, play and skip it. No login, and nothing is sent anywhere.</p>
              </div>
            )}
          </div>
          <aside className="v19-music-side">
            <div className="v19-panel">
              <p className="v19-label">Controls</p>
              {m.viz && <Visualizer className="v19-viz-page" demo={!native && !!m.now.playing} />}
              <div className="v19-music-controls">
                <button type="button" className="v19-icon" aria-label="Previous" disabled={!m.now.active} onClick={() => void m.media("previous")}><SkipBack size={17} /></button>
                <button type="button" className="v19-dock-play is-lg" aria-label={m.now.playing ? "Pause" : "Play"} disabled={!m.now.active} onClick={() => void m.media("toggle")}>
                  {m.now.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <button type="button" className="v19-icon" aria-label="Next" disabled={!m.now.active} onClick={() => void m.media("next")}><SkipForward size={17} /></button>
              </div>
              <p className="muted v19-small">Volume and seeking stay in the app that's playing.</p>
            </div>
            <div className="v19-panel">
              <p className="v19-label">Open an app</p>
              <div className="v19-row">
                <button type="button" className="v17-btn v17-btn-sm" onClick={() => void m.openApp("spotify")}><ExternalLink size={14} /> Spotify</button>
                <button type="button" className="v17-btn v17-btn-sm" onClick={() => void m.openApp("ytmusic")}><ExternalLink size={14} /> YouTube Music</button>
              </div>
              {m.error && <p className="field-error" role="alert">{m.error}</p>}
            </div>
          </aside>
        </section>
      )}
      <div className="v19-music-foot">
        <label className="v19-check">
          <input type="checkbox" checked={m.viz} onChange={(e) => setVisualizerEnabled(e.target.checked)} />
          <span>Show the visualizer <small className="muted">(measures loudness of what this PC plays; nothing is recorded)</small></span>
        </label>
      </div>
    </main>
  );
}
