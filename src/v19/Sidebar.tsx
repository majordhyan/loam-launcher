// App navigation (1.8): labeled places, a secondary group, and a stable account control.
// At narrow widths it becomes a 68 px rail with tooltips; accessible names stay the same.
import type { ComponentType } from "react";
import { ChevronsUpDown, Compass, Download, Home, LayoutGrid, LifeBuoy, Music2, Server, Settings, Shirt } from "lucide-react";
import type { Account } from "../api";
import { Avatar } from "../features/Avatar";
import { useMusic, useMusicSlot } from "./music";

type Place = { id: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; key?: string };
export const PRIMARY: Place[] = [
  { id: "home", label: "Home", icon: Home, key: "Alt+1" },
  { id: "library", label: "Library", icon: LayoutGrid, key: "Alt+2" },
  { id: "discover", label: "Discover", icon: Compass, key: "Alt+3" },
  { id: "servers", label: "Servers", icon: Server, key: "Alt+4" },
  { id: "skins", label: "Skins", icon: Shirt, key: "Alt+5" },
  { id: "music", label: "Music", icon: Music2, key: "Alt+6" },
];
const SECONDARY: Place[] = [
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "settings", label: "Settings", icon: Settings, key: "Ctrl+," },
  { id: "support", label: "Help", icon: LifeBuoy, key: "F1" },
];

export default function Sidebar({ page, onNavigate, account, onAccount, download }: {
  page: string;
  onNavigate: (page: string) => void;
  account?: Account;
  onAccount: () => void;
  /** Live install/download progress for the Downloads entry: 0–1, null when indeterminate. */
  download: { label: string; fraction: number | null } | null;
}) {
  const music = useMusic();
  // When YouTube is playing and the sidebar has room, its player sits here (YouTube requires it
  // visible); the Music page takes it over when open.
  const slot = useMusicSlot("sidebar", 1, music.yt.started && page !== "music");
  const item = (p: Place) => {
    const Icon = p.icon;
    const active = page === p.id;
    const busy = p.id === "downloads" && download;
    return (
      <button key={p.id} type="button" data-place={p.id} className={`v19-nav-item ${active ? "active" : ""}`}
        aria-current={active ? "page" : undefined} aria-label={p.label}
        title={p.key ? `${p.label} (${p.key})` : p.label} onClick={() => onNavigate(p.id)}>
        <Icon size={18} strokeWidth={1.85} />
        <span className="v19-nav-label">{p.label}</span>
        {busy && (
          <span className="v19-nav-meta" aria-label={download.fraction === null ? "In progress" : `${Math.round(download.fraction * 100)}%`}>
            {download.fraction === null ? <i className="v19-nav-spinner" /> : `${Math.floor(download.fraction * 100)}%`}
          </span>
        )}
        {p.id === "music" && music.ytPlaying && page !== "music" && <span className="v19-nav-dot" aria-label="Playing" />}
      </button>
    );
  };
  return (
    <nav className="v19-sidebar" aria-label="LOAM">
      <button type="button" className="v19-brand" onClick={() => onNavigate("home")} aria-label="LOAM home" data-tauri-drag-region>
        <img src="/brand/mark.svg" alt="" draggable={false} />
        <span className="v19-brand-name">LOAM</span>
      </button>
      <div className="v19-nav-group">{PRIMARY.map(item)}</div>
      <div className="v19-sidebar-fill" data-tauri-drag-region />
      {music.yt.started && page !== "music" && (
        <div className="v19-side-player">
          <div ref={slot} className="v19-yt-slot v19-yt-slot-side" />
        </div>
      )}
      <div className="v19-nav-group v19-nav-secondary">{SECONDARY.map(item)}</div>
      <button type="button" className="v19-account" onClick={onAccount} aria-label={account ? `Account: ${account.name}, ${account.kind === "microsoft" ? "Microsoft" : "offline profile"}. Switch account` : "Add an account"}>
        <span className="v19-account-avatar"><Avatar account={account} size={30} /></span>
        <span className="v19-account-text">
          <strong>{account?.name ?? "Add an account"}</strong>
          <small>{!account ? "Sign in or play offline" : account.kind === "microsoft" ? (account.access || "Microsoft account") : "Offline profile"}</small>
        </span>
        <ChevronsUpDown size={15} className="v19-account-chev" />
      </button>
    </nav>
  );
}
