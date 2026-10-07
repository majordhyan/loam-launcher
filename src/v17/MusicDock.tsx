// Music mini-player (1.8). "Cozy mix" streams a YouTube playlist through YouTube's own embedded
// player (kept visible while playing, as YouTube requires; collapsing the card pauses it).
// "Spotify" shows and controls the Spotify app through Windows' media controls, with no login.
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ExternalLink, Music2, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { call, native } from "../api";

export const COZY_PLAYLIST = "PLQwRmTwWx0ubcpv0SkHroupj1LqW5_Va5";
const KEY = "loam_music", SRC = "loam_music_source";
type Source = "cozy" | "spotify";
type Now = { active: boolean; title?: string; artist?: string; art?: string | null; playing?: boolean; spotify?: boolean };

export function musicEnabled() { try { return localStorage.getItem(KEY) !== "false"; } catch { return true; } }
export function setMusicEnabled(on: boolean) {
  try { localStorage.setItem(KEY, String(on)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event("loam-music-change"));
}

export default function MusicDock() {
  const [on, setOn] = useState(musicEnabled);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>(() => { try { return (localStorage.getItem(SRC) as Source) || "cozy"; } catch { return "cozy"; } });
  const [now, setNow] = useState<Now>({ active: false });
  const [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const sync = () => setOn(musicEnabled());
    window.addEventListener("loam-music-change", sync);
    return () => window.removeEventListener("loam-music-change", sync);
  }, []);
  useEffect(() => { try { localStorage.setItem(SRC, source); } catch { /* storage unavailable */ } }, [source]);

  // Spotify: poll Windows' media session while the card is open.
  useEffect(() => {
    if (!on || !open || source !== "spotify" || !native) return;
    let live = true;
    const tick = () => void call<Now>("mediaNow", { prefer: "spotify" }).then((n) => live && setNow(n)).catch(() => {});
    tick();
    const t = window.setInterval(() => { if (!document.hidden) tick(); }, 2500);
    return () => { live = false; window.clearInterval(t); };
  }, [on, open, source]);

  const yt = (func: string, args: unknown[] = []) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  async function media(action: string) {
    setError("");
    try {
      await call("mediaControl", { prefer: "spotify", action });
      window.setTimeout(() => void call<Now>("mediaNow", { prefer: "spotify" }).then(setNow).catch(() => {}), 400);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  if (!on) return null;
  const embed = `https://www.youtube-nocookie.com/embed/videoseries?list=${COZY_PLAYLIST}&loop=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`;
  return (
    <div className={`v18-music ${open ? "open" : ""}`}>
      {open ? (
        <section className="v18-music-card" aria-label="Music">
          <header>
            <div className="v17-segment v18-music-tabs" role="tablist" aria-label="Music source">
              <button type="button" role="tab" aria-selected={source === "cozy"} className={source === "cozy" ? "active" : ""} onClick={() => setSource("cozy")}>Cozy mix</button>
              <button type="button" role="tab" aria-selected={source === "spotify"} className={source === "spotify" ? "active" : ""} onClick={() => { yt("pauseVideo"); setSource("spotify"); }}>Spotify</button>
            </div>
            <button type="button" className="v17-icon-btn" aria-label="Collapse music" title="Collapse (pauses the cozy mix)" onClick={() => { yt("pauseVideo"); setOpen(false); }}><ChevronDown size={16} /></button>
            <button type="button" className="v17-icon-btn" aria-label="Turn music off" title="Turn off (Settings › Home & sound)" onClick={() => { yt("pauseVideo"); setMusicEnabled(false); }}><X size={16} /></button>
          </header>
          {source === "cozy" ? (
            <>
              <div className="v18-music-player">
                <iframe ref={frame} src={embed} title="Cozy chill music playlist" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
              </div>
              <div className="v18-music-controls">
                <button type="button" className="v17-icon-btn" aria-label="Previous" onClick={() => yt("previousVideo")}><SkipBack size={16} /></button>
                <button type="button" className="v17-btn v17-btn-sm v17-btn-primary" onClick={() => yt("playVideo")}><Play size={14} fill="currentColor" /> Play</button>
                <button type="button" className="v17-icon-btn" aria-label="Pause" onClick={() => yt("pauseVideo")}><Pause size={16} /></button>
                <button type="button" className="v17-icon-btn" aria-label="Next" onClick={() => yt("nextVideo")}><SkipForward size={16} /></button>
                <input type="range" min={0} max={100} defaultValue={60} aria-label="Music volume" onChange={(e) => yt("setVolume", [+e.target.value])} />
              </div>
              <p className="v18-music-note">Streams the cozy chill playlist from YouTube, on loop. Needs an internet connection.</p>
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
      ) : (
        <button type="button" className="v18-music-pill" onClick={() => setOpen(true)} aria-label="Open music">
          <span className="v18-eq" aria-hidden="true"><i /><i /><i /></span>
          <Music2 size={15} />
          <span>{source === "spotify" && now.active && now.title ? now.title : "Music"}</span>
        </button>
      )}
    </div>
  );
}
