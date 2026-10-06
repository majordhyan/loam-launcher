// The left rail: one icon per place, a sliding marker under the current one, and the
// game's state at the bottom (Play, progress, or Running).
import { useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { Home, LayoutGrid, Compass, Shirt, Settings, LifeBuoy, Play, Square, Loader2 } from "lucide-react";

type Place = { id: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; key?: string };
const top: Place[] = [
  { id: "home", label: "Home", icon: Home, key: "Alt 1" },
  { id: "library", label: "Library", icon: LayoutGrid, key: "Alt 2" },
  { id: "discover", label: "Discover", icon: Compass, key: "Alt 3" },
  { id: "skins", label: "Skins", icon: Shirt, key: "Alt 4" },
];
const bottom: Place[] = [
  { id: "support", label: "Help", icon: LifeBuoy, key: "F1" },
  { id: "settings", label: "Settings", icon: Settings, key: "Ctrl ," },
];

export default function Rail({ page, onNavigate, onPlay, state, progress, gameName, badge }: {
  page: string;
  onNavigate: (page: string) => void;
  onPlay: () => void;
  state: "play" | "install" | "busy" | "running" | "none";
  progress?: number;
  gameName?: string;
  badge?: Record<string, number>;
}) {
  const nav = useRef<HTMLElement>(null);
  const [marker, setMarker] = useState<{ top: number; visible: boolean }>({ top: 0, visible: false });
  useLayoutEffect(() => {
    const el = nav.current?.querySelector<HTMLElement>(`[data-place="${page}"]`);
    setMarker(el ? { top: el.offsetTop, visible: true } : (m) => ({ ...m, visible: false }));
  }, [page]);
  const item = (p: Place) => {
    const Icon = p.icon;
    return (
      <button key={p.id} type="button" data-place={p.id}
        className={`v17-rail-item ${page === p.id ? "active" : ""}`}
        aria-current={page === p.id ? "page" : undefined}
        aria-label={p.label}
        onClick={() => onNavigate(p.id)}>
        <Icon size={21} strokeWidth={1.8} />
        <span className="v17-rail-tip">{p.label}{p.key && <kbd>{p.key}</kbd>}</span>
        {!!badge?.[p.id] && <span className="v17-rail-badge">{badge[p.id]}</span>}
      </button>
    );
  };
  const playLabel = state === "running" ? "Stop Minecraft" : state === "busy" ? "Working…" : state === "install" ? "Install" : state === "none" ? "Install a game" : `Play ${gameName ?? ""}`.trim();
  return (
    <nav className="v17-rail" ref={nav} aria-label="LOAM">
      <button type="button" className="v17-rail-mark" aria-label="LOAM home" onClick={() => onNavigate("home")}>
        <img src="/brand/mark.svg" alt="" draggable={false} />
      </button>
      <span className="v17-rail-marker" style={{ transform: `translateY(${marker.top}px)`, opacity: marker.visible ? 1 : 0 }} />
      <div className="v17-rail-group">{top.map(item)}</div>
      <div className="v17-rail-spacer" data-tauri-drag-region />
      <div className="v17-rail-group">{bottom.map(item)}</div>
      <button type="button" className={`v17-rail-play is-${state}`} aria-label={playLabel} onClick={onPlay} disabled={state === "busy"}
        style={progress !== undefined ? ({ "--p": progress } as CSSProperties) : undefined}>
        {state === "running" ? <Square size={18} fill="currentColor" /> : state === "busy" ? <Loader2 size={20} className="v17-spin" /> : <Play size={20} fill="currentColor" />}
        <span className="v17-rail-tip">{playLabel}<kbd>Ctrl ↵</kbd></span>
      </button>
    </nav>
  );
}
