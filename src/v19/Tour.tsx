// First-run tour (1.9): a short guided walk through LOAM that points at the real controls. Shown
// once on first launch; replay it from Help. Escape skips, arrow keys step, focus stays in the card.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useFocusTrap } from "./a11y";

const KEY = "loam_tour_done";
export function tourDone() { try { return localStorage.getItem(KEY) === "1"; } catch { return true; } }
function markDone() { try { localStorage.setItem(KEY, "1"); } catch { /* storage unavailable */ } }

type Step = { title: string; body: string; target?: string; page?: string };
const STEPS: Step[] = [
  { title: "Welcome to LOAM", body: "A calm launcher for Minecraft: Java Edition. This quick tour shows where everything is. It takes under a minute, and you can skip it any time." },
  { title: "Your account", target: ".v19-account", body: "Start here. Sign in with your Microsoft account to play online servers and use your own skin, or make an offline profile for playing on your own." },
  { title: "Your game, ready to play", target: ".v19-launch", page: "home", body: "Home shows the game you'll play next. Create a game by picking a Minecraft version and Vanilla, Fabric or Quilt; LOAM downloads and checks everything. Then press Play." },
  { title: "Library", target: '[data-place="library"]', body: "Every game you make lives here, each in its own folder with its own worlds, mods and settings. Pin favourites and open Manage for memory, Java and backups." },
  { title: "Discover mods, shaders and packs", target: '[data-place="discover"]', body: "Browse Modrinth (and CurseForge if you connect it). LOAM only shows what fits the game you choose and installs any mods it needs." },
  { title: "Servers", target: '[data-place="servers"]', body: "Join popular servers by game mode (BedWars, SkyBlock, Survival and more) in one click, or add your own. Using an offline profile? LOAM can show servers that accept it." },
  { title: "Skins", target: '[data-place="skins"]', body: "Preview a skin in 3D, save it in LOAM, or put it on your Microsoft account." },
  { title: "Music", target: '[data-place="music"]', body: "Play YouTube or local music while you browse, or save Spotify and Apple Music links to open in their apps." },
  { title: "Search and help", target: ".v19-search", body: "Press Ctrl+K to find any action or game. F1 opens Help, where you can report a problem or replay this tour." },
];

export default function Tour({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (page: string) => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  useFocusTrap(card, open);
  const step = STEPS[i];
  const finish = () => { markDone(); setI(0); onClose(); };

  useEffect(() => { if (open) setI(0); }, [open]);
  useEffect(() => { if (open && step.page) onNavigate(step.page); }, [open, i]); // eslint-disable-line react-hooks/exhaustive-deps
  // Follow the target as layout settles (page changes, window resizes).
  useLayoutEffect(() => {
    if (!open) return;
    let raf = 0;
    const measure = () => {
      const el = step.target ? document.querySelector<HTMLElement>(step.target) : null;
      setRect(el && el.offsetParent !== null ? el.getBoundingClientRect() : null);
    };
    measure();
    const t = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(raf); window.clearInterval(t); window.removeEventListener("resize", measure); };
  }, [open, i, step.target]);
  useEffect(() => { if (open) card.current?.querySelector<HTMLButtonElement>(".v19-tour-next")?.focus(); }, [open, i]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); finish(); }
      else if (e.key === "ArrowRight" && !(e.target instanceof HTMLInputElement)) setI((n) => Math.min(STEPS.length - 1, n + 1));
      else if (e.key === "ArrowLeft" && !(e.target instanceof HTMLInputElement)) setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }); // re-binds each render so `finish` sees current state

  if (!open) return null;
  // Place the card beside the target: to the right of sidebar items, otherwise below or above.
  const pad = 8, W = 340;
  let style: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (rect) {
    const right = rect.right + 16 + W < window.innerWidth;
    if (rect.width < 260 && right) style = { left: rect.right + 16, top: Math.min(Math.max(16, rect.top + rect.height / 2 - 90), window.innerHeight - 260) };
    else if (rect.bottom + 230 < window.innerHeight) style = { left: Math.min(Math.max(16, rect.left), window.innerWidth - W - 16), top: rect.bottom + 14 };
    else style = { left: Math.min(Math.max(16, rect.left), window.innerWidth - W - 16), top: Math.max(16, rect.top - 230) };
  }
  return (
    <div className="v19-tour" role="presentation">
      {rect ? (
        <div className="v19-tour-spot" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      ) : (
        <div className="v19-tour-dim" />
      )}
      <div ref={card} className="v19-tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body" style={style}>
        <div className="v19-tour-head">
          <span className="v19-tour-count">{i + 1} of {STEPS.length}</span>
          <button type="button" className="v19-icon" aria-label="Skip the tour" title="Skip (Esc)" onClick={finish}><X size={16} /></button>
        </div>
        <h2 id="tour-title">{step.title}</h2>
        <p id="tour-body">{step.body}</p>
        <div className="v19-tour-dots" aria-hidden="true">{STEPS.map((_, n) => <i key={n} className={n === i ? "on" : ""} />)}</div>
        <div className="v19-tour-actions">
          {i === 0 ? <button type="button" className="v17-btn v17-btn-ghost" onClick={finish}>Skip</button>
            : <button type="button" className="v17-btn v17-btn-ghost" onClick={() => setI(i - 1)}><ArrowLeft size={15} /> Back</button>}
          <button type="button" className="v17-btn v17-btn-primary v19-tour-next" onClick={() => (i === STEPS.length - 1 ? finish() : setI(i + 1))}>
            {i === 0 ? "Show me around" : i === STEPS.length - 1 ? "Start playing" : <>Next <ArrowRight size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
