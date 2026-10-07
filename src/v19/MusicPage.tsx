// Music page (1.8, reworked in 1.9): pick a source, see what's playing, control it, and keep a
// library of links. Each source says what it can actually do (see CAPABILITIES in links.ts).
import { useRef, useState } from "react";
import { ExternalLink, FolderOpen, Link2, Music2, Pause, Play, RotateCcw, SkipBack, SkipForward, Square, Trash2, Volume2, X } from "lucide-react";
import { CAPABILITIES, PROVIDER_NAME, youTubeIds, type SavedLink } from "./links";
import { setVizMode, useMusic, useMusicSlot, type Source, type VizMode } from "./music";
import { actionLabel } from "./AddLink";
import { ProviderMark } from "./MusicMarks";
import Visualizer from "./Visualizer";

const clock = (s: number) => (Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
const SOURCES: { id: Source; label: string }[] = [{ id: "youtube", label: "YouTube" }, { id: "files", label: "Files" }, { id: "pc", label: "Other apps" }];

export default function MusicPage() {
  const m = useMusic();
  const slot = useMusicSlot("page", 2, m.yt.started);
  const picker = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const custom = m.link ? youTubeIds(m.link) : null;

  if (!m.enabled) {
    return (
      <main className="v17-page v19-music-page">
        <header className="v17-page-head"><div><h1 className="v17-display">Music</h1><p className="v19-subtitle">The music player is turned off.</p></div></header>
        <p className="muted">Turn it on in Settings › Home & sound.</p>
      </main>
    );
  }
  const playLink = (l: SavedLink) => (l.provider === "youtube" || l.provider === "ytmusic" ? m.startYouTube(l.url) : void m.openLink(l.url));
  const f = m.files, track = f.queue[f.index];
  const vizHint: Record<VizMode, string> = {
    off: "No visualizer.",
    minimal: "A small indicator that shows when music is playing.",
    spectrum: "Real levels for files from this PC. YouTube and other apps show the small indicator, because their sound isn't LOAM's to measure.",
  };

  return (
    <main className="v17-page v19-music-page">
      <header className="v17-page-head">
        <div>
          <h1 className="v17-display">Music</h1>
          <p className="v19-subtitle">Play something while you build. Playback keeps going when you switch pages.</p>
        </div>
        <button type="button" className="v17-btn v17-btn-primary" onClick={() => m.setAdding(true)}><Link2 size={16} /> Add link</button>
      </header>

      <div className="v17-segment v19-music-tabs" role="tablist" aria-label="Music source">
        {SOURCES.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={m.source === s.id} className={m.source === s.id ? "active" : ""} onClick={() => m.setSource(s.id)}>{s.label}</button>
        ))}
      </div>

      {m.source === "youtube" && (
        <section className="v19-music-grid">
          <div className="v19-music-stage">
            {m.yt.started ? (
              <div ref={slot} className="v19-yt-slot v19-yt-slot-page" />
            ) : (
              <div className="v19-music-start">
                <ProviderMark provider="youtube" size={30} />
                <strong>{custom ? (custom.list ? "Your playlist" : "Your video") : "Cozy chill mix"}</strong>
                <p>Plays in YouTube's own player, here and in a small panel while you use the rest of LOAM. YouTube requires its player to stay visible while it plays.</p>
                <button type="button" className="v17-btn v17-btn-primary" onClick={() => m.startYouTube()}><Play size={16} fill="currentColor" /> Play</button>
              </div>
            )}
          </div>
          <aside className="v19-music-side">
            <div className="v19-panel">
              <p className="v19-label">Now playing</p>
              <strong className="v19-music-title">{m.yt.started ? m.yt.title || "Loading…" : "Nothing yet"}</strong>
              <p className="muted v19-music-by">{m.yt.started ? m.yt.author || "YouTube" : "Press Play to start."}</p>
              <Visualizer mode={m.viz} playing={m.yt.state === 1} className="v19-viz-page" />
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
              <p className="v19-label">Playing from</p>
              <strong>{custom ? (custom.list ? "Your playlist" : "Your video, on repeat") : "Cozy chill mix"}</strong>
              <p className="muted">{custom ? "A link you added." : "LOAM's default playlist."} Add any YouTube or YouTube Music playlist or video.</p>
              <div className="v19-row" style={{ marginTop: 10 }}>
                <button type="button" className="v17-btn v17-btn-sm" onClick={() => m.setAdding(true)}><Link2 size={14} /> Use another link</button>
                {custom && <button type="button" className="v17-btn v17-btn-sm v17-btn-ghost" onClick={() => (m.yt.started ? m.startYouTube("") : m.setLink(""))}><RotateCcw size={14} /> Cozy mix</button>}
              </div>
              {m.error && <p className="field-error" role="alert">{m.error}</p>}
            </div>
          </aside>
        </section>
      )}

      {m.source === "files" && (
        <section className="v19-music-grid">
          <div className={`v19-music-stage v19-files-stage ${drag ? "is-drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) m.addFiles(e.dataTransfer.files); }}>
            <input ref={picker} type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.oga,.opus,.wav,.flac,.webm" multiple hidden
              onChange={(e) => { if (e.target.files?.length) m.addFiles(e.target.files); e.target.value = ""; }} />
            {f.queue.length ? (
              <>
                <div className="v19-files-now">
                  <span className="v19-pc-art"><Music2 size={34} /></span>
                  <div>
                    <p className="v19-label">{f.playing ? "Playing" : track ? "Paused" : "Ready"}</p>
                    <strong>{track?.name || "Pick a track"}</strong>
                    <span className="muted">{track ? `${clock(f.time)} / ${clock(f.duration)}` : `${f.queue.length} in the queue`}</span>
                  </div>
                </div>
                <Visualizer mode={m.viz} playing={f.playing} analyser={m.analyser()} bars={44} className="v19-viz-stage" />
                <ol className="v19-queue" aria-label="Queue">
                  {f.queue.map((t, i) => (
                    <li key={t.id} className={i === f.index ? "is-current" : ""}>
                      <button type="button" className="v19-queue-play" onClick={() => m.playFile(i)} aria-current={i === f.index ? "true" : undefined}>
                        <span className="v19-queue-n">{i === f.index && f.playing ? <Volume2 size={14} /> : i + 1}</span>
                        <span className="v19-queue-name">{t.name}</span>
                      </button>
                      <button type="button" className="v19-icon" aria-label={`Remove ${t.name}`} onClick={() => m.removeFile(i)}><X size={14} /></button>
                    </li>
                  ))}
                </ol>
                <button type="button" className="v17-btn v17-btn-sm v19-files-add" onClick={() => picker.current?.click()}><FolderOpen size={14} /> Add more files</button>
              </>
            ) : (
              <div className="v19-music-start">
                <Music2 size={28} />
                <strong>Play files from this PC</strong>
                <p>Choose MP3, M4A, Ogg, WAV or FLAC files, or drop them here. LOAM plays them itself, so the visualizer can show their real spectrum. Files stay where they are; the queue lasts until you close LOAM.</p>
                <button type="button" className="v17-btn v17-btn-primary" onClick={() => picker.current?.click()}><FolderOpen size={16} /> Choose files</button>
              </div>
            )}
          </div>
          <aside className="v19-music-side">
            <div className="v19-panel">
              <p className="v19-label">Controls</p>
              <label className="v19-seek">
                <span>{clock(f.time)}</span>
                <input type="range" min={0} max={Math.max(1, Math.floor(f.duration))} step={1} value={Math.floor(f.time)} aria-label="Position" disabled={!track || !f.duration}
                  onChange={(e) => m.seekFile(+e.target.value)} />
                <span>{clock(f.duration)}</span>
              </label>
              <div className="v19-music-controls">
                <button type="button" className="v19-icon" aria-label="Previous" disabled={!f.queue.length} onClick={() => m.fileCmd("previous")}><SkipBack size={17} /></button>
                <button type="button" className="v19-dock-play is-lg" aria-label={f.playing ? "Pause" : "Play"} disabled={!f.queue.length} onClick={() => m.fileCmd("toggle")}>
                  {f.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <button type="button" className="v19-icon" aria-label="Next" disabled={f.index < 0 || f.index >= f.queue.length - 1} onClick={() => m.fileCmd("next")}><SkipForward size={17} /></button>
              </div>
              <label className="v19-volume">
                <Volume2 size={15} aria-hidden="true" />
                <input type="range" min={0} max={100} step={1} value={f.volume} aria-label="Volume" onChange={(e) => m.setFileVolume(+e.target.value)} />
                <span className="v19-volume-value">{f.volume}</span>
              </label>
              {m.error && <p className="field-error" role="alert">{m.error}</p>}
            </div>
          </aside>
        </section>
      )}

      {m.source === "pc" && (
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
                <strong>Nothing is playing in other apps</strong>
                <p>Play music in Spotify, Apple Music, a browser or any app that shows in Windows' media controls. LOAM can then pause, play and skip it. No login, and LOAM never listens to the sound.</p>
              </div>
            )}
          </div>
          <aside className="v19-music-side">
            <div className="v19-panel">
              <p className="v19-label">Controls</p>
              <Visualizer mode={m.viz} playing={!!m.now.playing} className="v19-viz-page" />
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
                <button type="button" className="v17-btn v17-btn-sm" onClick={() => void m.openApp("spotify")}><ProviderMark provider="spotify" size={14} /> Spotify</button>
                <button type="button" className="v17-btn v17-btn-sm" onClick={() => void m.openApp("ytmusic")}><ProviderMark provider="ytmusic" size={14} /> YouTube Music</button>
              </div>
              {m.error && <p className="field-error" role="alert">{m.error}</p>}
            </div>
          </aside>
        </section>
      )}

      <section className="v19-links" aria-labelledby="links-title">
        <div className="v19-section-row">
          <h2 id="links-title" className="v19-section-title">Your links</h2>
        </div>
        {m.links.length ? (
          <ul className="v19-list v19-link-list">
            {m.links.map((l) => {
              const here = l.provider === "youtube" || l.provider === "ytmusic";
              return (
                <li key={l.key} className="v19-list-row">
                  <span className="v19-link-art">{l.thumb ? <img src={l.thumb} alt="" loading="lazy" /> : <ProviderMark provider={l.provider} size={22} />}</span>
                  <span className="v19-list-main">
                    <strong>{l.title || `A ${l.kind} on ${PROVIDER_NAME[l.provider]}`}</strong>
                    <small><ProviderMark provider={l.provider} size={12} /> {PROVIDER_NAME[l.provider]} {l.kind}{l.author ? ` · ${l.author}` : ""}</small>
                  </span>
                  <button type="button" className={`v17-btn v17-btn-sm ${here ? "" : "v17-btn-ghost"}`} onClick={() => playLink(l)}>
                    {here ? <Play size={14} fill="currentColor" /> : <ExternalLink size={14} />} {here ? "Play" : actionLabel(l)}
                  </button>
                  <button type="button" className="v19-icon" aria-label={`Remove ${l.title || "this link"}`} title="Remove" onClick={() => m.removeLink(l.key)}><Trash2 size={15} /></button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="v19-empty-inline">
            <p className="muted">Save links to YouTube, YouTube Music, Spotify or Apple Music. YouTube plays here; Spotify and Apple Music open in their apps.</p>
            <button type="button" className="v17-btn v17-btn-sm" onClick={() => m.setAdding(true)}><Link2 size={14} /> Add your first link</button>
          </div>
        )}
      </section>

      <section className="v19-music-foot">
        <div className="v19-viz-setting">
          <div>
            <h2 className="v19-h3">Visualizer</h2>
            <p className="muted v19-small">{vizHint[m.viz]}</p>
          </div>
          <div className="v17-segment" role="radiogroup" aria-label="Visualizer">
            {(["off", "minimal", "spectrum"] as VizMode[]).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={m.viz === v} className={m.viz === v ? "active" : ""} onClick={() => setVizMode(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
        </div>
        <details className="v19-caps">
          <summary>What each service can do in LOAM</summary>
          <table>
            <thead><tr><th scope="col">Service</th><th scope="col">Plays</th><th scope="col">Controls</th><th scope="col">Spectrum</th></tr></thead>
            <tbody>
              {(["youtube", "ytmusic", "files", "pc", "spotify", "apple"] as const).map((id) => {
                const c = CAPABILITIES[id];
                return (
                  <tr key={id}>
                    <th scope="row">{c.name}</th>
                    <td>{c.plays === "here" ? "In LOAM" : c.plays === "remote" ? "In their app; LOAM sends play, pause, skip" : `Opens in ${c.name}`}</td>
                    <td>{c.controls}</td>
                    <td>{c.spectrum ? "Yes" : "Indicator only"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted v19-small">LOAM never records or captures your PC's sound and doesn't get around any service's protection. Spotify and Apple Music only allow their own players.</p>
        </details>
      </section>
    </main>
  );
}
