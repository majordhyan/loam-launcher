// Home (1.8): the next action first. The selected game, its real state, one primary action, then
// version and loader, then management. Recent games below; discovery and news in a side column.
import { lazy, Suspense, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, ArrowRight, ArrowUpRight, Check, ChevronDown, Download, FolderInput, Play, Plus, Settings2, Square, X } from "lucide-react";
import type { Account, Game, Operation, Snapshot } from "../api";
import { javaFor, loaderLabel } from "../lib/versions";
import { eta, formatEta, formatRate, fraction, phaseName } from "../lib/progress";
import { formatBytes } from "../lib/math";
import { DownloadsCtx, ProgressBar } from "../v19/Downloads";
import { ModrinthLogo } from "./brands";
import { GameCover, HeroScene, LoaderGlyph, loaderName } from "./art";
import { ago, byRecent } from "./time";

const HeroSkin = lazy(() => import("./HeroSkin"));

export type HomeProps = {
  snap: Snapshot;
  game?: Game;
  account?: Account;
  running: boolean;
  gameActive: boolean;
  operation: Operation | null;
  crashSlot: ReactNode;
  scene: { mode: "animated" | "still" | "custom"; image: string | null; time: "auto" | "dawn" | "day" | "dusk" | "night" };
  celebrate: number;
  motionPaused: boolean;
  news: { title: string; date: string; kind?: string; image?: string | null } | null;
  migrationCount: number;
  onPlay: () => void;
  onPlayGame: (id: string) => void;
  onSelectGame: (id: string) => void;
  onDetails: (id?: string) => void;
  onAccounts: () => void;
  onMicrosoft?: () => void;
  onCreate: () => void;
  onOfflineProfile: () => void;
  onImport: () => void;
  onMigrate: () => void;
  onDiscover: () => void;
  onLibrary: () => void;
  onPalette: () => void;
  onNews: () => void;
  onCancel: () => void;
};

/** Picks the selected game from a compact menu (Escape and outside clicks close it). */
function GamePicker({ games, game, onSelect, onCreate }: { games: Game[]; game: Game; onSelect: (id: string) => void; onCreate: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); box.current?.querySelector<HTMLButtonElement>("button")?.focus(); } };
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", away, true); window.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="v19-picker" ref={box}>
      <button type="button" className="v19-picker-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <h2>{game.name}</h2>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="v19-menu" role="listbox" aria-label="Choose a game">
          {[...games].sort(byRecent).map((g) => (
            <button key={g.id} type="button" role="option" aria-selected={g.id === game.id} className="v19-menu-item"
              onClick={() => { setOpen(false); onSelect(g.id); }}>
              <LoaderGlyph loader={g.loader} size={14} />
              <span>{g.name}<small>{loaderName(g.loader)} {g.version}</small></span>
              {g.id === game.id && <Check size={15} />}
            </button>
          ))}
          <button type="button" className="v19-menu-item v19-menu-create" onClick={() => { setOpen(false); onCreate(); }}><Plus size={15} /> <span>Create a game</span></button>
        </div>
      )}
    </div>
  );
}

export default function Home(p: HomeProps) {
  const { snap, game, account, running, gameActive, operation } = p;
  const { rate } = useContext(DownloadsCtx);
  const games = snap.data.games;
  const recent = game ? games.filter((g) => g.id !== game.id).sort(byRecent).slice(0, 4) : [];
  const launching = gameActive && operation?.phase === "launching";
  const f = gameActive && !launching && operation ? fraction(operation.done, operation.total) : null;
  const left = gameActive && operation ? eta(operation.done, operation.total, rate?.bps ?? null) : null;
  const failed = operation?.phase === "failed" && operation.gameId === game?.id && !gameActive;

  // One honest status line from real state.
  const status = !game ? null
    : running ? { tone: "good", text: "Running" }
    : launching ? { tone: "busy", text: "Starting Minecraft…" }
    : gameActive ? { tone: "busy", text: phaseName(operation?.phase || "") || "Working" }
    : failed ? { tone: "bad", text: "Didn't finish" }
    : game.installed ? { tone: "good", text: "Ready to play" }
    : { tone: "idle", text: "Not installed yet" };

  return (
    <main className="v17-page v19-home">
      <div className="v19-home-grid">
        <div className="v19-home-main">
          {!game ? (
            <section className="v19-launch v19-launch-empty">
              <div className="v19-launch-banner"><GameCover seed="loam" loader="0" showVersion={false} /></div>
              <div className="v19-launch-body">
                <h2>Create your first game</h2>
                <p className="muted">Pick a Minecraft version and Vanilla, Fabric or Quilt. Each game gets its own folder, worlds and mods.</p>
                <div className="v19-launch-actions">
                  <button type="button" className="v17-btn v17-btn-primary v17-btn-lg" onClick={p.onCreate}><Plus size={18} /> Create a game</button>
                  <button type="button" className="v17-btn v17-btn-lg" onClick={p.onMigrate}><FolderInput size={17} /> {p.migrationCount > 0 ? `Bring ${p.migrationCount} from other launchers` : "Bring games from other launchers"}</button>
                </div>
                {!account && <p className="v19-launch-note">You'll also need an account to play. <button type="button" className="v17-text-btn" onClick={p.onAccounts}>Add one</button></p>}
              </div>
            </section>
          ) : (
            <section className={`v19-launch ${running ? "is-running" : ""}`} aria-label="Selected game">
              <div className="v19-launch-banner">
                {p.scene.mode === "still" ? (
                  <GameCover seed={game.id} loader={game.loader ?? "0"} showVersion={false} />
                ) : (
                  <HeroScene seed={game.id} loader={game.loader ?? "0"} image={p.scene.mode === "custom" ? p.scene.image : null} time={p.scene.time === "auto" ? undefined : p.scene.time} />
                )}
                <div className="v19-launch-skin">
                  <Suspense fallback={null}><HeroSkin account={account} paused={p.motionPaused || running} celebrate={p.celebrate} /></Suspense>
                </div>
              </div>
              <div className="v19-launch-body">
                <GamePicker games={games} game={game} onSelect={p.onSelectGame} onCreate={p.onCreate} />
                {status && (
                  <p className={`v19-status is-${status.tone}`} role="status" aria-live="polite">
                    <i aria-hidden="true" />{status.text}
                  </p>
                )}
                <p className="v19-launch-meta">
                  <LoaderGlyph loader={game.loader} size={14} />
                  <span>{game.loader ? `${loaderLabel(game.loader)} · ` : "Vanilla · "}Minecraft {game.version}</span>
                  {javaFor(game.version) && <span>Java {javaFor(game.version)}</span>}
                  <span>{(game.memory / 1024).toFixed(game.memory % 1024 ? 1 : 0)} GB memory</span>
                  {game.lastPlayed && <span>Played {ago(game.lastPlayed)}</span>}
                </p>
                {p.crashSlot}
                {gameActive && !launching && (
                  <div className="v19-launch-progress">
                    <ProgressBar value={f} label={`${phaseName(operation?.phase || "")} ${game.name}`} />
                    <div className="v19-job-meta">
                      <span>{operation && f !== null ? `${formatBytes(operation.done)} of ${formatBytes(operation.total)}` : operation?.message || "Working…"}</span>
                      <span>{[formatRate(rate?.bps ?? null), formatEta(left)].filter(Boolean).join(" · ")}</span>
                    </div>
                  </div>
                )}
                {failed && operation?.error && <p className="v19-launch-error"><AlertCircle size={15} /> {operation.error}</p>}
                <div className="v19-launch-actions">
                  {gameActive ? (
                    launching
                      ? <button type="button" className="v17-btn v17-btn-primary v17-btn-lg" disabled><span className="v19-btn-spinner" /> Starting…</button>
                      : <button type="button" className="v17-btn v17-btn-lg" onClick={p.onCancel}><X size={17} /> Cancel</button>
                  ) : running ? (
                    <button type="button" className="v17-btn v17-btn-stop v17-btn-lg" onClick={p.onPlay}><Square size={15} fill="currentColor" /> Stop Minecraft</button>
                  ) : (
                    <button type="button" className="v17-btn v17-btn-primary v17-btn-lg v19-play" onClick={p.onPlay} title="Ctrl+Enter">
                      {game.installed ? <><Play size={18} fill="currentColor" /> Play</> : failed ? <>Try again</> : <><Download size={18} /> Install</>}
                    </button>
                  )}
                  <button type="button" className="v17-btn v17-btn-lg" onClick={() => p.onDetails()}><Settings2 size={17} /> Manage</button>
                  {!account && <button type="button" className="v17-btn v17-btn-lg v17-btn-ghost" onClick={p.onAccounts}>Add an account</button>}
                </div>
                {!gameActive && !running && !game.installed && <p className="v19-launch-note">About 1.2 GB from Mojang, checked as it downloads.</p>}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section aria-labelledby="recent-title">
              <div className="v19-section-row">
                <h2 id="recent-title" className="v19-section-title">Recent games</h2>
                <button type="button" className="v17-text-btn" onClick={p.onLibrary}>All {games.length} in Library <ArrowRight size={14} /></button>
              </div>
              <ul className="v19-list">
                {recent.map((g) => {
                  const isRunning = !!snap.running[g.id];
                  return (
                    <li key={g.id} className="v19-list-row v19-game-row">
                      <button type="button" className="v19-game-pick" onClick={() => p.onSelectGame(g.id)} title="Select this game">
                        <span className="v19-game-thumb"><GameCover seed={g.id} loader={g.loader} showVersion={false} /></span>
                        <span className="v19-list-main">
                          <strong>{g.name}</strong>
                          <small>{loaderName(g.loader)} {g.version}{isRunning ? " · Running" : !g.installed ? " · Not installed" : g.lastPlayed ? ` · ${ago(g.lastPlayed)}` : ""}</small>
                        </span>
                      </button>
                      <button type="button" className={`v17-btn v17-btn-sm ${isRunning ? "v17-btn-stop" : "v17-btn-ghost"}`} disabled={gameActive} onClick={() => p.onPlayGame(g.id)}>
                        {isRunning ? <><Square size={12} fill="currentColor" /> Stop</> : g.installed ? <><Play size={13} fill="currentColor" /> Play</> : <><Download size={13} /> Install</>}
                      </button>
                      <button type="button" className="v19-icon" aria-label={`Manage ${g.name}`} title="Manage" onClick={() => p.onDetails(g.id)}><Settings2 size={16} /></button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="v19-home-side" aria-label="More to do">
          <h2 className="v19-label">Get more</h2>
          <ul className="v19-list v19-links">
            <li><button type="button" className="v19-link-row" onClick={p.onDiscover}><ModrinthLogo size={18} /><span><strong>Discover mods</strong><small>Mods, packs and shaders that fit your game</small></span><ArrowRight size={15} /></button></li>
            <li><button type="button" className="v19-link-row" onClick={p.onMigrate}><FolderInput size={18} /><span><strong>Bring your games</strong><small>{p.migrationCount > 0 ? `${p.migrationCount} found in Prism, MultiMC or CurseForge` : "From Prism, MultiMC or CurseForge"}</small></span><ArrowRight size={15} /></button></li>
            <li><button type="button" className="v19-link-row" onClick={p.onImport}><Download size={18} /><span><strong>Add a file</strong><small>A mod, pack or world; or drop it on the window</small></span><ArrowRight size={15} /></button></li>
          </ul>
          <h2 className="v19-label v19-side-gap">{p.news ? "Minecraft news" : "What's new"}</h2>
          <button type="button" className="v19-news-card" onClick={p.onNews}>
            {p.news?.image && <img src={p.news.image} alt="" />}
            <span className="v19-news-text">
              <small>{p.news ? `${p.news.kind === "snapshot" ? "Snapshot" : p.news.kind === "release" ? "Release" : "Article"} · ${new Date(p.news.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : `LOAM ${snap.version}`}</small>
              <strong>{p.news ? p.news.title : "Servers, music, live news and in-app updates"}</strong>
              <span className="v19-news-more">{p.news ? "All news" : "Read"} <ArrowUpRight size={13} /></span>
            </span>
          </button>
        </aside>
      </div>
    </main>
  );
}
