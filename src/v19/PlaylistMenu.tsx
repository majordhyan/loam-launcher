// The playlist switcher (1.9): one button on the player opens what's queued, your saved links and
// the cozy mix, so switching music never needs the Music page. Opens beside the sidebar card or
// above the dock; Escape or a click elsewhere closes it.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ExternalLink, FolderOpen, Link2, ListMusic, Music2, Play, Volume2 } from "lucide-react";
import { useMusic } from "./music";
import { PROVIDER_NAME, youTubeIds } from "./links";
import { ProviderMark } from "./MusicMarks";

export default function PlaylistMenu({ placement, size = 15 }: { placement: "right" | "up"; size?: number }) {
  const m = useMusic();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const btn = useRef<HTMLButtonElement>(null), pop = useRef<HTMLDivElement>(null), picker = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect(), W = 300;
      setPos(placement === "right"
        ? { left: Math.min(r.right + 12, window.innerWidth - W - 8), bottom: Math.max(8, window.innerHeight - r.bottom - 8), width: W }
        : { left: Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8)), bottom: window.innerHeight - r.top + 8, width: W });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, placement]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", esc);
    window.setTimeout(() => pop.current?.querySelector<HTMLButtonElement>("[aria-current=true], button")?.focus(), 20);
    return () => { window.removeEventListener("pointerdown", away, true); window.removeEventListener("keydown", esc); };
  }, [open]);

  const ytNow = m.yt.started ? (m.link ? youTubeIds(m.link) : null) : undefined; // undefined = YouTube not playing
  const cozyNow = m.yt.started && !m.link;
  const done = (f: () => void) => () => { f(); setOpen(false); };
  const keys = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(pop.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  return (
    <>
      <button ref={btn} type="button" className={`v19-icon ${open ? "is-on" : ""}`} aria-label="Playlist" title="Playlist" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <ListMusic size={size} />
      </button>
      <input ref={picker} type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.oga,.opus,.wav,.flac,.webm" multiple hidden
        onChange={(e) => { if (e.target.files?.length) m.addFiles(e.target.files); e.target.value = ""; setOpen(false); }} />
      {open && createPortal(
        <div ref={pop} className={`v19-playlist v19-playlist-${placement}`} style={pos} role="dialog" aria-label="Playlist" onKeyDown={keys}>
          {m.files.queue.length > 0 && (
            <section>
              <p className="v19-label">Files</p>
              {m.files.queue.map((t, i) => {
                const cur = m.source === "files" && i === m.files.index;
                return (
                  <button key={t.id} type="button" className="v19-pl-item" aria-current={cur} onClick={done(() => m.playFile(i))}>
                    <span className="v19-pl-art is-file">{cur && m.files.playing ? <Volume2 size={14} /> : <Music2 size={14} />}</span>
                    <span className="v19-pl-text"><strong>{t.name}</strong><small>File on this PC</small></span>
                    {cur && <Check size={14} className="v19-pl-check" />}
                  </button>
                );
              })}
            </section>
          )}
          <section>
            <p className="v19-label">Your music</p>
            <button type="button" className="v19-pl-item" aria-current={cozyNow} onClick={done(() => m.startYouTube(""))}>
              <span className="v19-pl-art is-cozy"><Music2 size={14} /></span>
              <span className="v19-pl-text"><strong>Cozy chill mix</strong><small>LOAM's playlist · YouTube</small></span>
              {cozyNow && <Check size={14} className="v19-pl-check" />}
            </button>
            {m.links.map((l) => {
              const here = l.provider === "youtube" || l.provider === "ytmusic";
              const ids = here ? youTubeIds(l.url) : null;
              const cur = !!(here && ytNow && ids && ytNow.list === ids.list && ytNow.video === ids.video);
              return (
                <button key={l.key} type="button" className="v19-pl-item" aria-current={cur}
                  onClick={done(() => (here ? m.startYouTube(l.url) : void m.openLink(l.url)))}>
                  <span className="v19-pl-art">{l.thumb ? <img src={l.thumb} alt="" loading="lazy" /> : <ProviderMark provider={l.provider} size={18} />}</span>
                  <span className="v19-pl-text">
                    <strong>{l.title || `A ${l.kind} on ${PROVIDER_NAME[l.provider]}`}</strong>
                    <small>{PROVIDER_NAME[l.provider]} {l.kind}{here ? "" : " · opens in the app"}</small>
                  </span>
                  {cur ? <Check size={14} className="v19-pl-check" /> : here ? <Play size={13} className="v19-pl-go" /> : <ExternalLink size={13} className="v19-pl-go" />}
                </button>
              );
            })}
          </section>
          <div className="v19-pl-foot">
            <button type="button" className="v17-btn v17-btn-sm" onClick={done(() => m.setAdding(true))}><Link2 size={14} /> Add link</button>
            <button type="button" className="v17-btn v17-btn-sm v17-btn-ghost" onClick={() => picker.current?.click()}><FolderOpen size={14} /> Choose files</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
