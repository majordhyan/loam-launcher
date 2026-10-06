// Home (1.7): the scene with your player, the selected game and its PLAY button, recent
// games, and shortcuts to Discover, Migration Hub and Smart Drop.
import { lazy, Suspense, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, Compass, Download, FolderInput, Play, Plus, Search, Settings2, Square, Sparkles, CheckCircle2 } from "lucide-react";
import type { Account, Game, Operation, Snapshot } from "../api";
import { bytes } from "../api";
import { Avatar, AccountBadge } from "../features/Avatar";
import { javaFor, loaderLabel } from "../lib/versions";
import { GameCover, HeroScene, LoaderGlyph, loaderName } from "./art";
import { ago, byRecent } from "./time";

const HeroSkin = lazy(() => import("./HeroSkin"));

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

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
  news: { title: string; date: string; link: string } | null;
  migrationCount: number;
  onPlay: () => void;
  onPlayGame: (id: string) => void;
  onSelectGame: (id: string) => void;
  onDetails: (id?: string) => void;
  onAccounts: () => void;
  onCreate: () => void;
  onOfflineProfile: () => void;
  onImport: () => void;
  onMigrate: () => void;
  onDiscover: () => void;
  onLibrary: () => void;
  onPalette: () => void;
  onNews: () => void;
};

export default function Home(p: HomeProps) {
  const { snap, game, account, running, gameActive, operation } = p;
  const games = snap.data.games;
  const recent = game ? [game, ...games.filter((g) => g.id !== game.id).sort(byRecent)].slice(0, 4) : [];
  const pct = gameActive && operation && operation.total > 0 ? Math.min(1, operation.done / operation.total) : null;
  const status = !game ? "" : running ? "Minecraft is running" : gameActive ? (operation?.message || "Preparing") : game.installed ? "Ready to play" : "Ready to install";
  const label = !game ? "Create a game" : gameActive ? (operation?.total ? `${bytes(operation.done)} / ${bytes(operation.total)}` : operation?.phase === "launching" ? "Launching" : "Preparing") : running ? "Stop" : game.installed ? "Play" : "Install";

  return (
    <main className="v17-page v17-home">
      <header className="v17-home-head v17-rise">
        <div>
          <p className="v17-eyebrow">{greeting()}</p>
          <h1 className="v17-display">
            {account ? <>Welcome back, <span className="v17-name">{account.name}</span></> : <>Welcome to LOAM</>}
            <span className="v17-dot">.</span>
          </h1>
        </div>
        <button type="button" className="v17-search-chip" onClick={p.onPalette} aria-label="Search and actions, Ctrl K">
          <Search size={16} />
          <span>Search games, actions…</span>
          <kbd>Ctrl K</kbd>
        </button>
      </header>

      <div className="v17-home-grid">
        <section className={`v17-hero v17-rise ${running ? "is-running" : ""}`} style={{ animationDelay: "60ms" }}>
          {p.scene.mode === "still" ? (
            <div className="v17-scene-still"><GameCover seed={game?.id || "loam"} loader={game?.loader ?? "0"} showVersion={false} /></div>
          ) : (
            <HeroScene seed={game?.id || "loam"} loader={game?.loader ?? "0"} image={p.scene.mode === "custom" ? p.scene.image : null} time={p.scene.time === "auto" ? undefined : p.scene.time} />
          )}
          <Suspense fallback={null}>
            <HeroSkin account={account} paused={p.motionPaused || running} celebrate={p.celebrate} />
          </Suspense>

          <div className="v17-hero-info">
            {!game ? (
              <div className="v17-hero-welcome">
                <p className="v17-chip-glass"><Sparkles size={13} /> Your first game</p>
                <h2 className="v17-display">Pick a version.<br />Make it yours.</h2>
                <p className="v17-hero-copy">Vanilla, Fabric or Quilt, from 1.16.1 to the latest. Each game gets its own folder.</p>
                <div className="v17-hero-actions">
                  {!account && (
                    <button type="button" className="v17-btn v17-btn-glass" onClick={p.onOfflineProfile}>Create offline profile</button>
                  )}
                  <button type="button" className="v17-btn v17-btn-primary v17-btn-lg" onClick={p.onCreate}>
                    <Plus size={20} /> Create a game
                  </button>
                </div>
                <button type="button" className="v17-link-glass" onClick={p.onMigrate}>
                  {p.migrationCount > 0 ? `Bring ${p.migrationCount} ${p.migrationCount === 1 ? "game" : "games"} from Prism, MultiMC or CurseForge` : "Coming from Prism, MultiMC or CurseForge?"}
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <>
                <p className="v17-chip-glass">
                  <span className={`v17-pulse ${running ? "on" : gameActive ? "busy" : ""}`} />
                  {status}
                </p>
                {p.crashSlot || (
                  <>
                    <h2 className="v17-hero-name">{game.name}</h2>
                    <div className="v17-hero-version mono">{game.version}</div>
                    <div className="v17-hero-chips">
                      <span><LoaderGlyph loader={game.loader} size={14} /> {game.loader ? loaderLabel(game.loader) : "Vanilla"}</span>
                      <span className="mono">{(game.memory / 1024).toFixed(game.memory % 1024 ? 1 : 0)} GB</span>
                      {javaFor(game.version) && <span>Java {javaFor(game.version)}</span>}
                      <button type="button" onClick={() => p.onDetails()}><Settings2 size={13} /> Details</button>
                    </div>
                  </>
                )}
                <div className="v17-hero-actions">
                  <button type="button"
                    className={`v17-btn v17-btn-play ${running ? "is-running" : ""} ${gameActive ? "is-busy" : ""}`}
                    disabled={gameActive} onClick={p.onPlay}
                    style={pct !== null ? ({ "--fill": pct } as CSSProperties) : undefined}>
                    <span className="v17-btn-play-fill" />
                    <span className="v17-btn-play-label">
                      {running ? <Square size={20} fill="currentColor" /> : !gameActive && game.installed ? <Play size={22} fill="currentColor" /> : !gameActive ? <Download size={20} /> : null}
                      {label}
                    </span>
                    <kbd>Ctrl ↵</kbd>
                  </button>
                </div>
                <p className="v17-hero-status" role="status" aria-live="polite">
                  {gameActive ? (
                    <>{operation?.message}{!!operation?.speed && <span className="mono"> · {bytes(operation.speed)}/s</span>}</>
                  ) : game.installed ? (
                    <><CheckCircle2 size={14} /> {game.verified && Number.isFinite(Date.parse(game.verified)) ? `Files checked ${new Date(game.verified).toLocaleDateString()}` : "Files check before every launch"}</>
                  ) : (
                    <>About 1.2 GB from Mojang, checked as it downloads</>
                  )}
                </p>
              </>
            )}
          </div>

          <button type="button" className="v17-hero-account" onClick={p.onAccounts} aria-label={`Playing as ${account?.name || "nobody yet"}. Switch account`}>
            <span className="v17-hero-avatar"><Avatar account={account} size={30} /></span>
            <span className="v17-hero-account-text">
              <strong>{account?.name || "Add a profile"}</strong>
              <small>{account ? <AccountBadge account={account} /> : "Microsoft or offline"}</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </section>

        <aside className="v17-home-side">
          <button type="button" className="v17-tile v17-tile-accent v17-rise" style={{ animationDelay: "120ms" }} onClick={p.onDiscover}>
            <span className="v17-tile-icon"><Compass size={22} /></span>
            <span className="v17-tile-text">
              <strong>Discover mods</strong>
              <small>Mods, packs and shaders from Modrinth, checked and installed in one click.</small>
            </span>
            <ArrowUpRight size={18} className="v17-tile-go" />
            <svg className="v17-tile-strata" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 70 C 60 50, 120 90, 180 66 S 270 50, 300 60" /><path d="M0 96 C 70 80, 130 112, 200 92 S 280 84, 300 88" />
            </svg>
          </button>
          <button type="button" className="v17-tile v17-rise" style={{ animationDelay: "170ms" }} onClick={p.onMigrate}>
            <span className="v17-tile-icon"><FolderInput size={20} /></span>
            <span className="v17-tile-text">
              <strong>Bring your games</strong>
              <small>From Prism, MultiMC or CurseForge, worlds and mods included.</small>
            </span>
            <ArrowRight size={16} className="v17-tile-go" />
          </button>
          <button type="button" className="v17-tile v17-tile-dashed v17-rise" style={{ animationDelay: "220ms" }} onClick={p.onImport}>
            <span className="v17-tile-icon"><Download size={20} /></span>
            <span className="v17-tile-text">
              <strong>Drop a mod, pack or world</strong>
              <small>Anywhere on the window. LOAM checks it and backs up first.</small>
            </span>
          </button>
          <button type="button" className="v17-news v17-rise" style={{ animationDelay: "270ms" }} onClick={p.onNews}>
            <span className="v17-eyebrow">{p.news ? `Minecraft news · ${new Date(p.news.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : "What's new in LOAM"}</span>
            <strong>{p.news ? p.news.title : `LOAM ${snap.version}: Discover, a new Home and Library`}</strong>
            <span className="v17-news-go">Read <ArrowUpRight size={14} /></span>
          </button>
        </aside>

        {recent.length > 0 && (
          <section className="v17-recent v17-rise" style={{ animationDelay: "140ms" }}>
            <div className="v17-section-head">
              <h3>Jump back in</h3>
              <button type="button" className="v17-text-btn" onClick={p.onLibrary}>
                Library · {games.length} <ArrowRight size={14} />
              </button>
            </div>
            <div className="v17-rows">
              {recent.map((g) => {
                const isRunning = !!snap.running[g.id];
                const selected = g.id === game?.id;
                return (
                  <div key={g.id} className={`v17-row ${selected ? "selected" : ""} ${isRunning ? "running" : ""}`}>
                    <button type="button" className="v17-row-main" onClick={() => p.onSelectGame(g.id)} aria-pressed={selected}>
                      <span className="v17-row-cover"><GameCover seed={g.id} loader={g.loader} showVersion={false} /></span>
                      <span className="v17-row-text">
                        <strong>{g.name}</strong>
                        <small><LoaderGlyph loader={g.loader} size={12} /> {loaderName(g.loader)} {g.version}{isRunning ? " · Running" : !g.installed ? " · Not installed" : g.lastPlayed ? ` · ${ago(g.lastPlayed)}` : ""}</small>
                      </span>
                    </button>
                    <button type="button" className={`v17-btn v17-btn-sm ${isRunning ? "v17-btn-stop" : "v17-btn-go"}`}
                      disabled={gameActive}
                      onClick={() => p.onPlayGame(g.id)}>
                      {isRunning ? <><Square size={13} fill="currentColor" /> Stop</> : g.installed ? <><Play size={14} fill="currentColor" /> Play</> : <><Download size={14} /> Install</>}
                    </button>
                    <button type="button" className="v17-icon-btn" aria-label={`${g.name} settings`} onClick={() => p.onDetails(g.id)}>
                      <Settings2 size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
