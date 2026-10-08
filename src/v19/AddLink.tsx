// "Add link" (1.9): paste a YouTube, YouTube Music, Spotify or Apple Music link, see what it is and
// what LOAM will do with it, then save it, play it (YouTube) or open it in its app (Spotify, Apple).
import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Link2, Loader2, Play, X } from "lucide-react";
import { call, native } from "../api";
import { useFocusTrap } from "./a11y";
import { CAPABILITIES, PROVIDER_NAME, parseMusicLink, safeThumb, type MusicLink, type SavedLink } from "./links";
import { useMusic } from "./music";
import { ProviderMark } from "./MusicMarks";

type Lookup = { state: "idle" | "checking" | "done" | "failed"; link?: MusicLink; title?: string; author?: string; thumb?: string; note?: string };

export function actionLabel(l: MusicLink) {
  return l.provider === "spotify" ? "Open in Spotify" : l.provider === "apple" ? "Open in Apple Music" : l.provider === "soundcloud" ? "Open in SoundCloud" : "Play in LOAM";
}
export function kindLabel(l: MusicLink) {
  return `${PROVIDER_NAME[l.provider]} ${l.kind}`;
}

export default function AddLink() {
  const m = useMusic();
  const [text, setText] = useState("");
  const [look, setLook] = useState<Lookup>({ state: "idle" });
  const [saved, setSaved] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  useFocusTrap(panel, m.adding);
  const close = () => { m.setAdding(false); setText(""); setLook({ state: "idle" }); setSaved(false); };

  useEffect(() => { if (m.adding) window.setTimeout(() => input.current?.focus(), 30); }, [m.adding]);
  useEffect(() => {
    if (!m.adding) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Recognise as the player types; look up the public title after a short pause. Only the newest
  // lookup may update the preview.
  useEffect(() => {
    setSaved(false);
    const parsed = text.trim() ? parseMusicLink(text) : null;
    if (!text.trim()) { setLook({ state: "idle" }); return; }
    if (!parsed) { setLook({ state: "failed", note: "LOAM recognises links to a song, album, playlist, artist or video on YouTube, YouTube Music, Spotify and Apple Music." }); return; }
    const local = "short" in parsed ? undefined : parsed;
    if (!native) {
      setLook(local ? { state: "done", link: local, title: local.hint } : { state: "failed", note: "Short links are followed in the desktop app." });
      return;
    }
    setLook({ state: "checking", link: local, title: local?.hint });
    const id = ++seq.current;
    const t = window.setTimeout(async () => {
      try {
        const r = await call<{ url: string; meta: { title?: string; author?: string; thumb?: string } | null }>("musicLink", { url: parsed.url });
        if (id !== seq.current) return;
        const final = parseMusicLink(r.url);
        if (!final || "short" in final) { setLook({ state: "failed", note: "That link doesn't point at a song, album, playlist, artist or video." }); return; }
        setLook({ state: "done", link: final, title: r.meta?.title || final.hint, author: r.meta?.author, thumb: safeThumb(r.meta?.thumb) });
      } catch (e) {
        if (id !== seq.current) return;
        // Details are a nicety: a recognised link can still be saved without them.
        if (local) setLook({ state: "done", link: local, title: local.hint, note: "Couldn't load its details right now; you can still save it." });
        else setLook({ state: "failed", note: e instanceof Error ? e.message : String(e) });
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [text]);

  if (!m.adding) return null;
  const l = look.link;
  const already = l ? m.links.some((x) => x.key === l.key) : false;
  const entry = (): SavedLink | null => (l ? { ...l, title: look.title, author: look.author, thumb: look.thumb, added: Date.now() } : null);
  const save = () => { const e = entry(); if (e) { m.saveLink(e); setSaved(true); } };
  const act = () => {
    const e = entry();
    if (!e) return;
    m.saveLink(e);
    if (e.provider === "youtube" || e.provider === "ytmusic") m.startYouTube(e.url);
    else void m.openLink(e.url);
    close();
  };
  const cap = l ? CAPABILITIES[l.provider] : null;
  return (
    <>
      <div className="v19-scrim" onClick={close} />
      <aside ref={panel} className="v19-drawer v19-addlink" role="dialog" aria-modal="true" aria-labelledby="addlink-title">
        <header className="v19-drawer-head">
          <Link2 size={18} />
          <div className="v19-list-main"><strong id="addlink-title">Add a music link</strong><small>YouTube, YouTube Music, Spotify or Apple Music</small></div>
          <button type="button" className="v19-icon" aria-label="Close" onClick={close}><X size={16} /></button>
        </header>
        <div className="v19-drawer-body">
          <label className="v19-field">
            <span>Link</span>
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a link to a song, album or playlist" spellCheck={false} autoComplete="off"
              aria-describedby="addlink-status" onKeyDown={(e) => { if (e.key === "Enter" && l && look.state !== "checking") act(); }} />
          </label>
          <div id="addlink-status" aria-live="polite">
            {look.state === "failed" && <p className="field-error">{look.note}</p>}
            {l && (
              <div className="v19-linkcard">
                <span className="v19-linkcard-art">{look.thumb ? <img src={look.thumb} alt="" /> : <ProviderMark provider={l.provider} size={28} />}</span>
                <span className="v19-linkcard-text">
                  <small><ProviderMark provider={l.provider} size={13} /> {kindLabel(l)}</small>
                  <strong>{look.title || (look.state === "checking" ? "Looking it up…" : `A ${l.kind} on ${PROVIDER_NAME[l.provider]}`)}</strong>
                  {look.author && <span>{look.author}</span>}
                </span>
                {look.state === "checking" && <Loader2 size={16} className="v17-spin" aria-label="Checking" />}
              </div>
            )}
            {l && cap && (
              <p className="muted v19-small v19-linkcard-note">
                {cap.plays === "here" ? "Plays here in YouTube's player, which stays visible while it plays." : cap.why}
                {look.note ? ` ${look.note}` : ""}
                {already ? " It's already in your links." : ""}
              </p>
            )}
          </div>
        </div>
        <footer className="v19-drawer-foot">
          <span className="v19-grow" />
          <button type="button" className="v17-btn v17-btn-ghost" disabled={!l || saved} onClick={save}>
            {saved ? <><Check size={15} /> Saved</> : already ? "Saved already" : "Save for later"}
          </button>
          <button type="button" className="v17-btn v17-btn-primary" disabled={!l} onClick={act}>
            {l && l.provider !== "youtube" && l.provider !== "ytmusic" ? <ExternalLink size={15} /> : <Play size={15} fill="currentColor" />}
            {l ? actionLabel(l) : "Play in LOAM"}
          </button>
        </footer>
      </aside>
    </>
  );
}
