// Library (1.7): every game as a card, with search, type filters and pinning.
import { useMemo, useState } from "react";
import { Pin, PinOff, Play, Plus, Search, Settings2, Square, Download, FolderInput, Copy, LayoutGrid, List, Clock, ChevronDown } from "lucide-react";
import type { Game, Snapshot } from "../api";
import { GameCover, LoaderGlyph, loaderKind, loaderName } from "./art";
import { ago, byRecent, playtime } from "./time";

const VIEW = "loam_library_view", SORT = "loam_library_sort";
const read = (k: string, d: string) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const keep = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

const PINS = "loam_pinned_games";
function readPins(): string[] {
  try { return JSON.parse(localStorage.getItem(PINS) || "[]"); } catch { return []; }
}

export default function Library({ snap, busy, onPlayGame, onSelectGame, onDetails, onCreate, onMigrate, onDuplicate }: {
  snap: Snapshot;
  busy: boolean;
  onPlayGame: (id: string) => void;
  onSelectGame: (id: string) => void;
  onDetails: (id: string) => void;
  onCreate: (loader?: "vanilla" | "fabric" | "quilt") => void;
  onMigrate: () => void;
  onDuplicate: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned" | "vanilla" | "fabric" | "quilt">("all");
  const [pins, setPins] = useState<string[]>(readPins);
  const [view, setView] = useState<"grid" | "list">(() => (read(VIEW, "grid") === "list" ? "list" : "grid"));
  const [sort, setSort] = useState<"recent" | "name" | "playtime" | "created">(() => read(SORT, "recent") as "recent");
  const togglePin = (id: string) => setPins((p) => {
    const next = p.includes(id) ? p.filter((x) => x !== id) : [id, ...p];
    try { localStorage.setItem(PINS, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });
  const games = snap.data.games;
  const counts = useMemo(() => ({
    all: games.length,
    pinned: games.filter((g) => pins.includes(g.id)).length,
    vanilla: games.filter((g) => loaderKind(g.loader) === "vanilla").length,
    fabric: games.filter((g) => loaderKind(g.loader) === "fabric").length,
    quilt: games.filter((g) => loaderKind(g.loader) === "quilt").length,
  }), [games, pins]);
  const shown = games
    .filter((g) => filter === "all" || (filter === "pinned" ? pins.includes(g.id) : loaderKind(g.loader) === filter))
    .filter((g) => !query.trim() || `${g.name} ${g.version} ${loaderName(g.loader)} ${(g.tags || []).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) =>
      Number(pins.includes(b.id)) - Number(pins.includes(a.id)) ||
      (sort === "name" ? a.name.localeCompare(b.name)
        : sort === "playtime" ? (b.playtime || 0) - (a.playtime || 0)
        : sort === "created" ? Date.parse(b.created) - Date.parse(a.created)
        : byRecent(a, b)));

  const card = (g: Game, i: number) => {
    const running = !!snap.running[g.id];
    const pinned = pins.includes(g.id);
    const selected = g.id === snap.data.selectedGame;
    return (
      <article key={g.id} className={`v17-card v17-rise ${selected ? "selected" : ""} ${running ? "running" : ""}`} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
        <button type="button" className="v17-card-cover" onClick={() => onSelectGame(g.id)} aria-label={`Select ${g.name}`}>
          <GameCover seed={g.id} loader={g.loader} version={g.version} />
          <span className="v17-card-type"><LoaderGlyph loader={g.loader} size={13} /> {loaderName(g.loader)}</span>
          {running && <span className="v17-card-live">Running</span>}
        </button>
        <button type="button" className={`v17-card-pin ${pinned ? "on" : ""}`} onClick={() => togglePin(g.id)} aria-label={pinned ? `Unpin ${g.name}` : `Pin ${g.name}`} aria-pressed={pinned}>
          {pinned ? <PinOff size={15} /> : <Pin size={15} />}
        </button>
        <div className="v17-card-body">
          <strong title={g.name}>{g.name}</strong>
          <small>{loaderName(g.loader)} {g.version} · {(g.memory / 1024).toFixed(g.memory % 1024 ? 1 : 0)} GB{!g.installed ? " · Not installed" : ""}</small>
          <small className="v17-card-played"><Clock size={11} /> {g.lastPlayed ? `${ago(g.lastPlayed)} · ${playtime(g.playtime)}` : "Not played yet"}</small>
          {!!g.tags?.length && <span className="v17-card-tags">{g.tags.slice(0, 3).map((t) => <span key={t}>{t}</span>)}</span>}
        </div>
        <div className="v17-card-actions">
          <button type="button" className={`v17-btn v17-btn-sm ${running ? "v17-btn-stop" : "v17-btn-go"} v17-grow`} disabled={busy} onClick={() => onPlayGame(g.id)}>
            {running ? <><Square size={13} fill="currentColor" /> Stop</> : g.installed ? <><Play size={14} fill="currentColor" /> Play</> : <><Download size={14} /> Install</>}
          </button>
          <button type="button" className="v17-icon-btn" aria-label={`Duplicate ${g.name}`} title="Duplicate" onClick={() => onDuplicate(g.id)} disabled={busy}><Copy size={16} /></button>
          <button type="button" className="v17-icon-btn" aria-label={`${g.name} settings`} title="Settings, mods and worlds" onClick={() => onDetails(g.id)}><Settings2 size={16} /></button>
        </div>
      </article>
    );
  };

  return (
    <main className="v17-page v17-library">
      <header className="v17-page-head v17-rise">
        <div>
          <p className="v17-eyebrow">{games.length} {games.length === 1 ? "game" : "games"} · each in its own folder</p>
          <h1 className="v17-display">Library<span className="v17-dot">.</span></h1>
        </div>
        <div className="v17-head-actions">
          <button type="button" className="v17-btn v17-btn-ghost" onClick={onMigrate}><FolderInput size={16} /> Import</button>
          <button type="button" className="v17-btn v17-btn-primary" onClick={() => onCreate()}><Plus size={17} /> New game</button>
        </div>
      </header>

      <div className="v17-toolbar v17-rise" style={{ animationDelay: "40ms" }}>
        <label className="v17-search">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your games" aria-label="Search your games" />
        </label>
        <label className="v17-select">
          <select value={sort} onChange={(e) => { setSort(e.target.value as typeof sort); keep(SORT, e.target.value); }} aria-label="Sort games">
            <option value="recent">Recently played</option>
            <option value="name">Name</option>
            <option value="playtime">Most played</option>
            <option value="created">Newest</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <div className="v17-segment" role="radiogroup" aria-label="View">
          <button type="button" role="radio" aria-checked={view === "grid"} aria-label="Grid view" className={view === "grid" ? "active" : ""} onClick={() => { setView("grid"); keep(VIEW, "grid"); }}><LayoutGrid size={15} /></button>
          <button type="button" role="radio" aria-checked={view === "list"} aria-label="List view" className={view === "list" ? "active" : ""} onClick={() => { setView("list"); keep(VIEW, "list"); }}><List size={15} /></button>
        </div>
        <div className="v17-tabs" role="tablist" aria-label="Filter games">
          {(["all", "pinned", "vanilla", "fabric", "quilt"] as const).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "pinned" ? "Pinned" : loaderName(f === "vanilla" ? null : f === "quilt" ? "quilt:" : "0")}
              <span className="v17-count">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <div className={view === "list" ? "v17-grid v17-list" : "v17-grid"}>
          {shown.map(card)}
          {filter === "all" && !query && view === "grid" && (
            <div className="v17-card v17-card-new v17-rise" style={{ animationDelay: `${Math.min(shown.length, 12) * 35}ms` }}>
              <strong>New game</strong>
              <small>Start clean, or with a mod loader.</small>
              <div className="v17-new-options">
                <button type="button" onClick={() => onCreate("vanilla")}><LoaderGlyph loader={null} size={18} /> Vanilla</button>
                <button type="button" onClick={() => onCreate("fabric")}><LoaderGlyph loader="0" size={18} /> Fabric</button>
                <button type="button" onClick={() => onCreate("quilt")}><LoaderGlyph loader="quilt:" size={18} /> Quilt</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="v17-empty v17-rise">
          <strong>{games.length ? "No games match." : "No games yet."}</strong>
          <p>{games.length ? "Try another search or filter." : "Create one, or bring your games from another launcher."}</p>
          {!games.length && (
            <div className="v17-head-actions">
              <button type="button" className="v17-btn v17-btn-primary" onClick={() => onCreate()}><Plus size={17} /> New game</button>
              <button type="button" className="v17-btn v17-btn-ghost" onClick={onMigrate}><FolderInput size={16} /> Import</button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
