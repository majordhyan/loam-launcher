import {
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Plus,
  Settings,
  HelpCircle,
  UserRound,
  Download,
  FolderOpen,
  SlidersHorizontal,
  Play,
  Square,
  Search,
  Command,
  ArrowLeft,
  MessageSquare,
  FileText,
  Package,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Archive,
  Upload,
  Trash2,
  CheckCircle2,
  X,
  Keyboard,
  HardDrive,
  RefreshCw,
  Shirt,
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  call,
  empty,
  native,
  bytes,
  type Snapshot,
  type Game,
  type Operation,
} from "./api";
import { Sheet, Wordmark, Empty, DialogError } from "./ui";
import InstallSheet from "./InstallSheet";
const SkinStudio = lazy(() => import("./SkinStudio"));
type ImportPlan = {
  expandedBytes: number;
  fileCount: number;
  token: string;
  filename: string;
  kind: string;
  notes: string[];
  dependencies: string[];
  backup: string;
  version: string;
  loader: string | null;
};
type Report = { id: string; summary: string; files: Record<string, string> };
type Issue = {
  id: string;
  title: string;
  status: string;
  fixedIn?: string;
  workaround?: string;
};
const activePhases = [
  "planning",
  "downloading",
  "runtime",
  "verifying",
  "launching",
  "importing",
  "backup",
  "copying",
  "authenticating",
];
export default function App() {
  const [snap, setSnap] = useState<Snapshot>(empty),
    [page, setPage] = useState("home"),
    [sheet, setSheet] = useState(""),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [toastPaused, setToastPaused] = useState(false),
    [matchedIssue, setMatchedIssue] = useState<Issue | null>(null),
    [profileName, setProfileName] = useState(""),
    [firstStep, setFirstStep] = useState(0),
    [query, setQuery] = useState(""),
    [dragging, setDragging] = useState(false),
    [importPlan, setImportPlan] = useState<ImportPlan | null>(null),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [logs, setLogs] = useState(""),
    [detailsTab, setDetailsTab] = useState("overview"),
    [content, setContent] = useState<
      { path: string; name: string; kind: string; enabled: boolean }[]
    >([]),
    [backups, setBackups] = useState<{ id: string; created: string }[]>([]),
    [editName, setEditName] = useState(""),
    [editMemory, setEditMemory] = useState(4096),
    [editWidth, setEditWidth] = useState(1280),
    [editHeight, setEditHeight] = useState(720),
    [editJvm, setEditJvm] = useState(""),
    [storageUsage, setStorageUsage] = useState<Record<string, number>>({}),
    [migrationTarget, setMigrationTarget] = useState(""),
    [licenses, setLicenses] = useState(""),
    [removePath, setRemovePath] = useState(""),
    [news, setNews] = useState<{ title: string; date: string } | null>(null),
    [deleteName, setDeleteName] = useState(""),
    [issues, setIssues] = useState<Issue[]>([]),
    [reports, setReports] = useState<
      { id: string; type: string; date: string }[]
    >([]),
    [update, setUpdate] = useState<{
      available: boolean;
      version?: string;
      notes?: string;
    } | null>(null),
    [report, setReport] = useState({
      id: "",
      type: "Crash on launch",
      happened: "",
      expected: "",
      steps: "",
      log: true,
      launchPlan: true,
      system: true,
      includeName: false,
    }),
    [preview, setPreview] = useState<Report | null>(null),
    [settingsTab, setSettingsTab] = useState("general");
  const game = snap.data.games.find((g) => g.id === snap.data.selectedGame),
    account = snap.data.accounts.find(
      (a) => a.id === snap.data.selectedAccount,
    ),
    operation = snap.operation,
    active = !!operation && activePhases.includes(operation.phase),
    gameActive = active && operation?.gameId === game?.id,
    running = !!game && !!snap.running[game.id];
  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = snap.data.preferences
      .reducedMotion
      ? "reduced"
      : "full";
  }, [snap.data.preferences.reducedMotion]);
  const refresh = useCallback(async () => {
    if (native) setSnap(await call<Snapshot>("snapshot"));
  }, []);
  const act = useCallback(
    async (op: string, args: Record<string, unknown> = {}) => {
      try {
        const result = await call(op, args);
        await refresh();
        return result;
      } catch (e) {
        fail(e);
      }
    },
    [refresh, fail],
  );
  useEffect(() => {
    void refresh().catch(fail);
    if (!native) return;
    const unsubs = [
      listen<Operation>("operation", (e) => {
        setSnap((s) => ({ ...s, operation: e.payload }));
        if (e.payload.error) setError(e.payload.error);
        if (!activePhases.includes(e.payload.phase)) void refresh().catch(fail);
      }),
      listen("state-changed", () => void refresh().catch(fail)),
      listen<string>("close-blocked", (e) => fail(e.payload)),
      listen<string>("game-failure", (e) => fail(e.payload)),
    ];
    return () => {
      for (const u of unsubs) void u.then((fn) => fn());
    };
  }, [refresh, fail]);
  useEffect(() => {
    if (!toast || toastPaused) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast, toastPaused]);
  useEffect(() => {
    if (!native) return;
    void call<{ title: string; date: string }>("news")
      .then(setNews)
      .catch(() => {});
    void invoke<{ available: boolean; version?: string; notes?: string }>(
      "check_update",
    )
      .then(setUpdate)
      .catch(() => {});
  }, []);
  useEffect(() => {
    setMatchedIssue(null);
    if (!native || !error) return;
    let current = true;
    void call<Issue | null>("matchIssue", { message: error })
      .then((v) => {
        if (current) setMatchedIssue(v);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [error]);
  useEffect(() => {
    if (!native || !game) return;
    const unlisten = getCurrentWebview().onDragDropEvent((e) => {
      setDragging(e.payload.type === "over" || e.payload.type === "enter");
      if (e.payload.type === "drop") {
        setDragging(false);
        if (e.payload.paths.length !== 1) {
          fail("Drop one file or game folder at a time.");
          return;
        }
        void inspect(e.payload.paths[0]);
      }
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, [game?.id]);
  useEffect(() => {
    if (!native || (page !== "support" && sheet !== "whatsnew")) return;
    void act("knownIssues").then((v) => {
      if (v) setIssues((v as { issues: Issue[] }).issues);
    });
    void act("reports").then((v) => {
      if (v) setReports(v as typeof reports);
    });
  }, [page, sheet]);
  useEffect(() => {
    if (sheet !== "report" || !native) return;
    let live = true;
    const t = setTimeout(() => {
      call<Report>("reportPreview", report)
        .then((v) => {
          if (live) {
            setPreview(v);
            if (!report.id) setReport((r) => ({ ...r, id: v.id }));
          }
        })
        .catch(fail);
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [report, sheet]);
  useEffect(() => {
    if (sheet !== "details" || !game) return;
    setEditName(game.name);
    setEditMemory(game.memory);
    setEditWidth(game.width || 1280);
    setEditHeight(game.height || 720);
    setEditJvm((game.jvmArgs || []).join("\n"));
    void act("content", { id: game.id }).then((v) => {
      if (v) setContent(v as typeof content);
    });
    void act("backups", { id: game.id }).then((v) => {
      if (v) setBackups(v as typeof backups);
    });
    if (detailsTab === "logs") void readLog();
  }, [sheet, detailsTab, game?.id]);
  async function inspect(source: string) {
    if (!game) {
      setError(
        "Create a game first, then choose it as the import destination.",
      );
      setSheet("install");
      return;
    }
    setBusy(true);
    try {
      setImportPlan(
        await call<ImportPlan>("inspectImport", { id: game.id, source }),
      );
      setSheet("importReview");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (native && page === "settings" && settingsTab === "storage")
      void call<Record<string, number>>("storageUsage")
        .then(setStorageUsage)
        .catch(fail);
  }, [page, settingsTab, operation?.phase]);
  async function chooseMigration() {
    try {
      const folder = await open({
        directory: true,
        multiple: false,
        title: "Choose an empty folder for LOAM data",
      });
      if (typeof folder === "string") {
        setMigrationTarget(folder);
        setSheet("migrate");
      }
    } catch (e) {
      fail(e);
    }
  }
  async function pick(folder = false) {
    if (!native) {
      fail("Choose files in the LOAM desktop app.");
      return;
    }
    const p = await open({
      directory: folder,
      multiple: false,
      title: folder
        ? "Select a game data folder"
        : "Choose a mod, pack, or world",
      filters: folder
        ? undefined
        : [{ name: "Minecraft content", extensions: ["jar", "zip", "mrpack"] }],
    });
    if (typeof p === "string") await inspect(p);
  }
  async function readLog() {
    if (game) {
      const v = await act("log", { id: game.id });
      setLogs(typeof v === "string" ? v : "");
    }
  }
  function showReport() {
    setReport((r) => ({ ...r, id: "", happened: error || r.happened }));
    setSheet("report");
  }
  async function primary() {
    if (!game) {
      setSheet("install");
      return;
    }
    if (running) {
      setSheet("stop");
      return;
    }
    if (gameActive) return;
    if (!game.installed) {
      await act("install", { id: game.id });
      return;
    }
    if (!account) {
      setSheet("accounts");
      return;
    }
    setError("");
    await act("launch", { id: game.id });
  }
  async function created(g: Game) {
    setSheet("");
    setPage("home");
    await refresh();
    await act("install", { id: g.id });
  }
  async function checkUpdates() {
    setBusy(true);
    try {
      setUpdate(await invoke("check_update"));
      setSheet("whatsnew");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(
        (e.target as HTMLElement).tagName,
      );
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setSheet("palette");
      } else if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        void primary();
      } else if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setSheet("install");
      } else if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        setPage("settings");
        setSheet("");
      } else if (e.key === "F1") {
        e.preventDefault();
        setPage("support");
        setSheet("");
      } else if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const g = snap.data.games[+e.key - 1];
        if (g) void act("selectGame", { id: g.id });
      } else if (
        !editing &&
        !sheet &&
        ["ArrowLeft", "ArrowRight"].includes(e.key) &&
        snap.data.games.length
      ) {
        const index = snap.data.games.findIndex((g) => g.id === game?.id);
        const next =
          (index + (e.key === "ArrowRight" ? 1 : -1) + snap.data.games.length) %
          snap.data.games.length;
        void act("selectGame", { id: snap.data.games[next].id });
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [game, running, gameActive, account, sheet, snap.data.games]);
  const shortcuts = [
    {
      name: game ? `Play ${game.name}` : "Install your first game",
      icon: Play,
      action: () => void primary(),
      key: "Ctrl ↵",
    },
    {
      name: "Install a game",
      icon: Plus,
      action: () => setSheet("install"),
      key: "Ctrl N",
    },
    ...(game
      ? [
          {
            name: "Open game folder",
            icon: FolderOpen,
            action: () => void act("openFolder", { id: game.id }),
            key: "",
          },
        ]
      : []),
    {
      name: "Settings",
      icon: Settings,
      action: () => setPage("settings"),
      key: "Ctrl ,",
    },
    {
      name: "Skins and capes",
      icon: Shirt,
      action: () => setPage("skins"),
      key: "",
    },
    {
      name: "Report a problem",
      icon: MessageSquare,
      action: showReport,
      key: "F1",
    },
    ...snap.data.games.map((g) => ({
      name: `Switch to ${g.name}`,
      icon: Package,
      action: () => void act("selectGame", { id: g.id }),
      key: g.version,
    })),
  ];
  return (
    <DialogError.Provider
      value={{
        message: error,
        hint: matchedIssue
          ? `Known issue${matchedIssue.fixedIn ? ` — fixed in ${matchedIssue.fixedIn}` : ` — ${matchedIssue.status}`}. ${matchedIssue.workaround || ""}`
          : undefined,
        report: showReport,
        dismiss: () => setError(""),
      }}
    >
      <div className={`app ${page === "home" ? "is-home" : ""}`}>
        <header className="topbar">
          <button
            className="brand-button"
            aria-label="LOAM home"
            onClick={() => setPage("home")}
          >
            <Wordmark />
            <span className="brand-caption">JAVA EDITION</span>
          </button>
          <div className="top-actions">
            <button
              className="account-chip"
              onClick={() => setSheet("accounts")}
            >
              <span className="avatar">
                <UserRound size={17} />
              </span>
              <span>
                <strong>{account?.name || "Choose who’s playing"}</strong>
                <small>
                  {account
                    ? account.kind === "microsoft"
                      ? "MICROSOFT ✓"
                      : "OFFLINE PROFILE"
                    : "ACCOUNT"}
                </small>
              </span>
              <ChevronDown size={14} />
            </button>
            <span className="header-divider" />
            <button
              className={`icon-button ${page === "skins" ? "current" : ""}`}
              aria-label="Skins and capes"
              title="Skins and capes"
              onClick={() => setPage(page === "skins" ? "home" : "skins")}
            >
              <Shirt size={21} />
            </button>
            <button
              className={`icon-button ${page === "support" ? "current" : ""}`}
              title="Support & Feedback · F1"
              aria-label="Support and feedback"
              onClick={() => setPage(page === "support" ? "home" : "support")}
            >
              <HelpCircle size={20} />
            </button>
            <button
              className={`icon-button ${page === "settings" ? "current" : ""}`}
              title="Settings · Ctrl+,"
              aria-label="Settings"
              onClick={() => setPage(page === "settings" ? "home" : "settings")}
            >
              <Settings size={20} />
            </button>
          </div>
        </header>
        {!native && (
          <div className="preview-banner">
            DESIGN PREVIEW · File access and game operations are available in
            the desktop app.
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Something needs your attention.</strong>
              <p>{error}</p>
              {matchedIssue && (
                <p>
                  <strong>
                    Known issue
                    {matchedIssue.fixedIn
                      ? ` — fixed in ${matchedIssue.fixedIn}`
                      : ` — ${matchedIssue.status}`}
                  </strong>
                  {matchedIssue.workaround && ` · ${matchedIssue.workaround}`}{" "}
                  <button onClick={() => setSheet("whatsnew")}>
                    VIEW UPDATE
                  </button>
                </p>
              )}
              <div className="inline-actions">
                <button onClick={showReport}>REPORT THIS ↗</button>
                {game && (
                  <>
                    <button
                      onClick={() => {
                        setSheet("details");
                        setDetailsTab("logs");
                      }}
                    >
                      VIEW LOG
                    </button>
                    <button
                      onClick={() => {
                        setError("");
                        void primary();
                      }}
                    >
                      RETRY
                    </button>
                  </>
                )}
              </div>
            </div>
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {page === "home" ? (
          <main className="home">
            <div className="home-kicker">
              <button
                className="game-picker"
                onClick={() => {
                  setQuery("");
                  setSheet("games");
                }}
              >
                <span>MY GAMES</span>
                <span>/</span>
                {game?.name || "Your library"}
                <ChevronDown size={16} />
              </button>
              <button
                className="shortcut-hint"
                onClick={() => {
                  setQuery("");
                  setSheet("palette");
                }}
              >
                <Command size={13} />K <span>Quick actions</span>
              </button>
            </div>
            {!game ? (
              <section className="welcome">
                <div className="setup-steps">
                  <span className={firstStep === 0 ? "active" : ""}>
                    01 ACCOUNT
                  </span>
                  <span className={firstStep === 1 ? "active" : ""}>
                    02 YOUR GAME
                  </span>
                  <span>03 PLAY</span>
                </div>
                <div className="welcome-body">
                  <div>
                    <h1>
                      Let’s set up
                      <br />
                      your first game<span className="accent">.</span>
                    </h1>
                    <p className="hero-description">
                      A quiet place for all your worlds.
                      <br />
                      Pick a version. Make it yours. Get playing.
                    </p>
                    {firstStep === 0 && !account ? (
                      <>
                        <button
                          className="primary"
                          onClick={() => void act("signIn")}
                        >
                          SIGN IN WITH MICROSOFT
                          <ArrowUpRight size={17} />
                        </button>
                        <div className="welcome-secondary">
                          <button
                            className="text-button"
                            onClick={() => setSheet("offline")}
                          >
                            Use Offline Profile
                          </button>
                          <button
                            className="text-button subtle"
                            onClick={() => setFirstStep(1)}
                          >
                            Later
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          className="play-button"
                          onClick={() => setSheet("install")}
                        >
                          INSTALL
                          <Plus size={23} />
                        </button>
                        <p className="footnote">
                          Choose your version and review the download first.
                        </p>
                      </>
                    )}
                  </div>
                  <aside className="welcome-note">
                    <span className="tiny-index">01 — A FRESH START</span>
                    <ShieldCheck size={28} />
                    <h3>
                      Your games.
                      <br />
                      Their own space.
                    </h3>
                    <p>
                      Every installation has its own mods, settings, and saves.
                      Room to experiment, without disturbing your favorite
                      world.
                    </p>
                    <span className="note-rule" />
                    <p className="small">
                      Official files. Local storage.
                      <br />
                      No ads. No distractions.
                    </p>
                  </aside>
                </div>
              </section>
            ) : (
              <section className="game-hero page-enter">
                <div className="hero-topline">
                  <span className="eyebrow">
                    {running
                      ? "MINECRAFT IS RUNNING"
                      : gameActive
                        ? "PREPARING YOUR WORLD"
                        : game.installed
                          ? "✓ READY TO PLAY"
                          : "READY TO INSTALL"}
                  </span>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSheet("details");
                      setDetailsTab("overview");
                    }}
                  >
                    GAME DETAILS
                    <SlidersHorizontal size={16} />
                  </button>
                </div>
                <h1 className="version-display">{game.version}</h1>
                <p className="edition-title">Minecraft Java Edition</p>
                <div className="game-meta">
                  <Package size={18} />
                  <span>
                    {game.loader ? `Fabric ${game.loader}` : "Vanilla"}
                  </span>
                  <span className="dot">·</span>
                  <span>{game.memory / 1024} GB</span>
                </div>
                <div className="launch-area">
                  <div>
                    <button
                      className={`play-button ${running ? "running" : ""} ${gameActive ? "progress-button" : ""}`}
                      disabled={gameActive}
                      onClick={() => void primary()}
                    >
                      {gameActive && operation && operation.total > 0 && (
                        <span
                          className="play-fill"
                          style={{
                            width: `${Math.min(100, (operation.done / operation.total) * 100)}%`,
                          }}
                        />
                      )}
                      <span>
                        {gameActive
                          ? operation?.total
                            ? `${bytes(operation.done)} / ${bytes(operation.total)}`
                            : operation?.phase === "launching"
                              ? "LAUNCHING"
                              : "PREPARING"
                          : running
                            ? "RUNNING"
                            : game.installed
                              ? "PLAY"
                              : "INSTALL"}
                      </span>
                      {!gameActive &&
                        (running ? (
                          <Square size={21} />
                        ) : game.installed ? (
                          <ArrowRight size={26} />
                        ) : (
                          <Download size={23} />
                        ))}
                    </button>
                    <div
                      className="launch-status"
                      role="status"
                      aria-live="polite"
                    >
                      {gameActive ? (
                        <>
                          <p>{operation?.message}</p>
                          {!!operation?.speed && (
                            <span className="mono">
                              {bytes(operation.speed)}/s · about{" "}
                              {Math.ceil(
                                (operation.total - operation.done) /
                                  operation.speed,
                              )}
                              s remaining
                            </span>
                          )}
                        </>
                      ) : (
                        <p>
                          <span className="status-icon">
                            {game.installed ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <Download size={14} />
                            )}
                          </span>
                          {running
                            ? operation?.phase === "running"
                              ? operation.message
                              : "Minecraft is running"
                            : game.installed
                              ? `Ready · verified ${game.verified ? new Date(game.verified).toLocaleDateString() : ""}`
                              : "Ready to install · files verified before play"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="launch-aside">
                    {gameActive ? (
                      <button
                        className="text-button"
                        onClick={() => void act("cancel")}
                      >
                        CANCEL
                        <X size={15} />
                      </button>
                    ) : running ? (
                      <button
                        className="text-button"
                        onClick={() => {
                          setDetailsTab("logs");
                          setSheet("details");
                        }}
                      >
                        VIEW LOG
                        <FileText size={16} />
                      </button>
                    ) : (
                      <>
                        <span className="eyebrow">PLAYING AS</span>
                        <button
                          className="text-button"
                          onClick={() => setSheet("accounts")}
                        >
                          {account?.name || "Choose an account"}
                          <ChevronDown size={14} />
                        </button>
                        <span className="account-type">
                          {account
                            ? account.kind === "offline"
                              ? "OFFLINE PROFILE"
                              : "MICROSOFT ✓"
                            : "Required to play"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}
            <div className="library-bar">
              <button
                className="install-link"
                onClick={() => setSheet("install")}
              >
                INSTALL
                <Plus size={19} />
              </button>
              <button className="drop-link" onClick={() => setSheet("import")}>
                <Download size={17} />
                <span>Drop a mod, pack or world</span>
              </button>
              <div className="game-switcher">
                {snap.data.games.slice(0, 5).map((g) => (
                  <button
                    key={g.id}
                    className={`game-tile ${g.id === game?.id ? "active" : ""}`}
                    title={g.name}
                    aria-label={`Switch to ${g.name}`}
                    aria-pressed={g.id === game?.id}
                    onClick={() => void act("selectGame", { id: g.id })}
                  >
                    {g.name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </button>
                ))}
                {snap.data.games.length > 5 && (
                  <button
                    className="game-tile"
                    onClick={() => {
                      setQuery("");
                      setSheet("games");
                    }}
                  >
                    +{snap.data.games.length - 5}
                  </button>
                )}
              </div>
              {snap.data.games.length > 0 && (
                <button
                  className="all-games"
                  onClick={() => {
                    setQuery("");
                    setSheet("games");
                  }}
                >
                  ALL GAMES ({snap.data.games.length})<ChevronDown size={14} />
                </button>
              )}
            </div>
            <footer className="home-footer">
              <span className="mono">
                {news
                  ? new Date(news.date).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                    })
                  : `LOAM ${snap.version}`}
              </span>
              <span>
                {news ? news.title : "Your next adventure is a click away."}
              </span>
              <button
                className="text-button"
                onClick={() => {
                  if (news) void act("openLink", { kind: "news" });
                  else {
                    setQuery("");
                    setSheet("palette");
                  }
                }}
              >
                <Keyboard size={15} />
                {news ? "OFFICIAL NEWS ↗" : "KEYBOARD SHORTCUTS"}
              </button>
            </footer>
          </main>
        ) : page === "skins" ? (
          <Suspense
            fallback={
              <main className="subpage">
                <h1>Opening skin studio…</h1>
              </main>
            }
          >
            <SkinStudio
              account={account}
              reducedMotion={snap.data.preferences.reducedMotion}
              onBack={() => setPage("home")}
              onAccounts={() => setSheet("accounts")}
              onError={fail}
              onReport={showReport}
            />
          </Suspense>
        ) : page === "settings" ? (
          <main className="subpage">
            <button className="back-link" onClick={() => setPage("home")}>
              <ArrowLeft size={16} />
              Back to your worlds
            </button>
            <div className="page-title">
              <div>
                <p className="eyebrow">MAKE YOURSELF AT HOME</p>
                <h1>Settings</h1>
              </div>
              <span className="mono">LOAM {snap.version}</span>
            </div>
            <div className="settings-layout">
              <nav className="settings-nav" aria-label="Settings sections">
                {[
                  ["general", "General"],
                  ["accounts", "Accounts"],
                  ["storage", "Storage & Java"],
                  ["updates", "Updates"],
                  ["about", "About LOAM"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={settingsTab === id ? "selected" : ""}
                    onClick={() => setSettingsTab(id)}
                  >
                    {label}
                    <ArrowRight size={14} />
                  </button>
                ))}
              </nav>
              <div className="settings-content">
                {settingsTab === "general" ? (
                  <>
                    <h2>Make LOAM feel like yours.</h2>
                    <p className="muted">
                      The essentials, set up for the way you play.
                    </p>
                    <div className="setting-row">
                      <div>
                        <h3>Animations</h3>
                        <p>
                          Subtle transitions. System reduced motion takes
                          priority.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label="Enable animations"
                        checked={!snap.data.preferences.reducedMotion}
                        onChange={(e) =>
                          void act("preferences", {
                            reducedMotion: !e.target.checked,
                          })
                        }
                      />
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>Preview versions</h3>
                        <p>Show Minecraft snapshots in the version catalog.</p>
                      </div>
                      <input
                        aria-label="Show snapshots"
                        type="checkbox"
                        checked={snap.data.preferences.snapshots}
                        onChange={(e) =>
                          void act("preferences", {
                            snapshots: e.target.checked,
                          })
                        }
                      />
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>Appearance</h3>
                        <p>
                          LOAM Paper · light theme. Windows high contrast and
                          reduced motion are respected.
                        </p>
                      </div>
                      <span className="swatch" />
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>Language</h3>
                        <p>English</p>
                      </div>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        setQuery("");
                        setSheet("palette");
                      }}
                    >
                      Keyboard shortcuts
                      <Keyboard size={16} />
                    </button>
                  </>
                ) : settingsTab === "accounts" ? (
                  <>
                    <h2>Who’s playing?</h2>
                    <p className="muted">
                      Switching accounts applies to your next launch. Your
                      worlds stay where they are.
                    </p>
                    <button
                      className="primary"
                      onClick={() => setSheet("accounts")}
                    >
                      MANAGE ACCOUNTS
                      <UserRound size={17} />
                    </button>
                  </>
                ) : settingsTab === "storage" ? (
                  <>
                    <h2>A place for everything.</h2>
                    <p className="mono">
                      {Object.entries(storageUsage)
                        .map(([k, v]) => `${k}: ${bytes(v)}`)
                        .join(" · ")}
                    </p>
                    <div className="setting-row">
                      <div>
                        <h3>Game data</h3>
                        <p className="path">{snap.root}</p>
                        <p>{bytes(snap.freeDisk)} free on this drive</p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="Open data folder"
                        onClick={() => void act("openFolder")}
                      >
                        <FolderOpen size={20} />
                      </button>
                    </div>
                    <div className="inline-actions">
                      <button
                        disabled={active || running}
                        onClick={() => void chooseMigration()}
                      >
                        MIGRATE STORAGE
                      </button>
                      <button
                        disabled={active || running}
                        onClick={() => setSheet("cleanCache")}
                      >
                        CLEAN CACHED DOWNLOADS
                      </button>
                      <button
                        disabled={active || running}
                        onClick={() => void act("restart")}
                      >
                        RESTART LOAM
                      </button>
                    </div>
                    {operation?.gameId === "" && operation.message && (
                      <p role="status">
                        {operation.message}
                        {operation.total > 0
                          ? ` · ${bytes(operation.done)} / ${bytes(operation.total)}`
                          : ""}
                      </p>
                    )}
                    <div className="setting-row">
                      <div>
                        <h3>Java, taken care of</h3>
                        <p>
                          LOAM provisions a verified Eclipse Temurin runtime for
                          each version’s Java requirement. All runtimes are x64.
                        </p>
                      </div>
                      <ShieldCheck size={22} />
                    </div>
                    <p className="footnote">
                      Each game has separate saves, mods, packs, settings, and
                      logs. Shared libraries and assets are verified before use.
                    </p>
                  </>
                ) : settingsTab === "updates" ? (
                  <>
                    <h2>Always a little better.</h2>
                    <p className="muted">
                      Update packages must pass signature verification. You
                      choose when to install.
                    </p>
                    <div className="notice">
                      <ShieldCheck size={20} />
                      <p>
                        {snap.configuration.updates
                          ? "Signed update feed configured."
                          : "Development build · update hosting and signing have not been configured."}
                      </p>
                    </div>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void checkUpdates()}
                    >
                      CHECK FOR UPDATES
                      <RefreshCw size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <Wordmark />
                    <p className="intro">Your worlds, ready.</p>
                    <p className="mono">Version {snap.version} · Windows x64</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSheet("licenses");
                        void fetch("/third-party-notices.txt")
                          .then((r) => {
                            if (!r.ok) throw Error("License file unavailable");
                            return r.text();
                          })
                          .then(setLicenses)
                          .catch(fail);
                      }}
                    >
                      LICENSES & THIRD-PARTY NOTICES
                    </button>
                    <p className="muted">
                      Built with Tauri, React, and Rust. Geist typography. Icons
                      by Lucide.
                    </p>
                    <div className="notice">
                      <p>
                        Not an official Minecraft product. Not approved by or
                        associated with Mojang or Microsoft.
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setPage("support")}
                    >
                      Support & Feedback
                      <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main className="subpage support-page">
            <button className="back-link" onClick={() => setPage("home")}>
              <ArrowLeft size={16} />
              Back to your worlds
            </button>
            <div className="page-title">
              <div>
                <p className="eyebrow">A LITTLE HELP GOES A LONG WAY</p>
                <h1>Support & Feedback</h1>
              </div>
              <span className="mono">LOAM {snap.version}</span>
            </div>
            <div className="support-grid">
              <article>
                <MessageSquare size={26} />
                <span className="eyebrow">01 / COMMUNITY</span>
                <h2>Ask the community</h2>
                <p>
                  Questions, discoveries, or a little help getting started. Join
                  the conversation.
                </p>
                <button
                  className="text-button"
                  onClick={() => void act("openLink", { kind: "discord" })}
                >
                  OPEN DISCORD
                  <ArrowUpRight size={17} />
                </button>
                {!snap.configuration.discord && (
                  <small>Community invite awaiting configuration.</small>
                )}
              </article>
              <article>
                <FileText size={26} />
                <span className="eyebrow">02 / REPORT A PROBLEM</span>
                <h2>Report a problem</h2>
                <p>
                  Tell us what happened. We’ll help you put together a report
                  with the useful details.
                </p>
                <button className="text-button" onClick={showReport}>
                  START A REPORT
                  <ArrowRight size={17} />
                </button>
              </article>
              <article>
                <Package size={26} />
                <span className="eyebrow">03 / WHAT’S NEW</span>
                <h2>What’s new</h2>
                <p>
                  Known issues, helpful workarounds, and improvements in the
                  latest release.
                </p>
                <button
                  className="text-button"
                  onClick={() => setSheet("whatsnew")}
                >
                  VIEW UPDATES
                  <ArrowRight size={17} />
                </button>
              </article>
            </div>
            <div className="reports-header">
              <h2>Your recent reports</h2>
              <button
                className="text-button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(`LOAM ${snap.version} · Windows x64`)
                    .then(() => setToast("Version info copied."))
                    .catch(fail);
                }}
              >
                COPY VERSION INFO
                <Copy size={15} />
              </button>
            </div>
            {reports.length ? (
              <div className="report-list">
                {reports.map((r) => (
                  <div key={r.id}>
                    <span className="mono">{r.id}</span>
                    <span>{r.type}</span>
                    <span className="muted">
                      Saved locally · {new Date(r.date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No reports yet. Here when you need us.</Empty>
            )}
            <div className="privacy-note">
              <ShieldCheck size={16} />
              <p>
                Nothing is sent automatically. You review every report before
                copying or saving it.
              </p>
            </div>
          </main>
        )}
        {sheet === "install" && (
          <InstallSheet
            snap={snap}
            onClose={() => setSheet("")}
            onCreated={(g) => void created(g)}
            onReport={showReport}
            onImport={() => {
              setSheet("import");
              if (!game)
                fail("Create a matching game first, then import its data.");
            }}
            error={fail}
          />
        )}
        {sheet === "accounts" && (
          <Sheet title="Accounts" full onClose={() => setSheet("")}>
            <p className="intro">Choose how you play.</p>
            <div className="accounts-layout">
              <div>
                <div className="account-list">
                  {snap.data.accounts.map((a) => (
                    <div
                      className={`account-row ${a.id === account?.id ? "selected" : ""}`}
                      key={a.id}
                    >
                      <button
                        onClick={() => void act("selectAccount", { id: a.id })}
                      >
                        <span className="avatar">
                          {a.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span>
                          <strong>{a.name}</strong>
                          <small>
                            {a.kind === "microsoft"
                              ? "MICROSOFT ✓"
                              : "OFFLINE PROFILE"}
                          </small>
                          <span className="capabilities">
                            {Object.entries(
                              snap.capabilities[a.kind] || {},
                            ).map(([key, yes]) => (
                              <span key={key}>
                                {yes ? "✓" : "−"}{" "}
                                {
                                  (
                                    {
                                      ownership: "Java ownership",
                                      singleplayer: "Singleplayer",
                                      lan: "LAN",
                                      onlineServers: "Online servers",
                                      offlineServers: "Offline servers",
                                      realms: "Realms",
                                      personalSkin: "Personal skin",
                                    } as Record<string, string>
                                  )[key]
                                }
                              </span>
                            ))}
                          </span>
                        </span>
                        {a.id === account?.id && <Check size={18} />}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${a.name}`}
                        onClick={() => void act("removeAccount", { id: a.id })}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                {!snap.data.accounts.length && (
                  <Empty>
                    Add an account to play. You can install games first.
                  </Empty>
                )}
                <div className="sheet-actions">
                  <button
                    className="primary"
                    onClick={() => void act("signIn")}
                  >
                    SIGN IN WITH MICROSOFT
                    <ArrowUpRight size={16} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setSheet("offline")}
                  >
                    <Plus size={17} />
                    OFFLINE PROFILE
                  </button>
                </div>
                {!snap.configuration.microsoft && (
                  <p className="footnote">
                    Microsoft sign-in needs an approved app registration. This
                    build will explain the setup requirement when selected.
                  </p>
                )}
                {operation?.phase === "authenticating" && (
                  <button
                    className="text-button"
                    onClick={() => void act("cancel")}
                  >
                    CANCEL SIGN-IN
                  </button>
                )}
              </div>
              <aside className="account-detail-card">
                <span className="avatar large">
                  {account?.name.slice(0, 1).toUpperCase() || <UserRound />}
                </span>
                <h2>{account?.name || "Your next adventure."}</h2>
                <dl className="facts">
                  <div>
                    <dt>ACCOUNT TYPE</dt>
                    <dd>
                      {account?.kind === "microsoft"
                        ? "Microsoft"
                        : account
                          ? "OFFLINE PROFILE"
                          : "No account selected"}
                    </dd>
                  </div>
                  <div>
                    <dt>STATUS</dt>
                    <dd>
                      {account?.kind === "microsoft"
                        ? "Minecraft Java ✓"
                        : account
                          ? "Local play"
                          : "Choose a profile to play"}
                    </dd>
                  </div>
                  <div>
                    <dt>NEXT LAUNCH</dt>
                    <dd>
                      {account
                        ? "✓ Selected for next launch"
                        : "Install games without an account"}
                    </dd>
                  </div>
                </dl>
                <button
                  className="secondary"
                  onClick={() => {
                    setSheet("");
                    setPage("skins");
                  }}
                >
                  SKINS & CAPES
                  <Shirt size={19} />
                </button>
                <p className="footnote">
                  {account?.kind === "microsoft"
                    ? "Manage your official skin and owned capes in the studio."
                    : "Offline profiles do not provide access to authenticated servers. Skin and cape previews stay in LOAM."}
                </p>
              </aside>
            </div>
          </Sheet>
        )}
        {sheet === "offline" && (
          <Sheet
            title="A name for local play."
            eyebrow="OFFLINE PROFILE"
            onClose={() => setSheet("")}
          >
            <p className="intro">
              Offline profiles are local. They don’t prove you own Minecraft,
              can’t join servers that verify accounts, can’t use Realms, and
              can’t show a personal skin.
            </p>
            <p className="muted">
              Use one for local play, testing, LAN and servers running in
              offline mode.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act("offlineAccount", { name: profileName }).then((v) => {
                  if (v) {
                    setSheet("");
                    setFirstStep(1);
                    setToast("Offline Profile created.");
                  }
                });
              }}
            >
              <label>
                DISPLAY NAME
                <input
                  autoFocus
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  maxLength={16}
                  minLength={3}
                  pattern="[A-Za-z0-9_]{3,16}"
                  placeholder="Your name"
                  required
                />
              </label>
              <p className="footnote">3–16 letters, numbers, or underscores.</p>
              <div className="sheet-actions">
                <button className="primary" type="submit">
                  CREATE OFFLINE PROFILE
                  <ArrowRight size={16} />
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setSheet("")}
                >
                  CANCEL
                </button>
              </div>
            </form>
            <button className="text-button" onClick={() => void act("signIn")}>
              Sign in with Microsoft instead
              <ArrowUpRight size={15} />
            </button>
          </Sheet>
        )}
        {sheet === "games" && (
          <Sheet title="Your games" full onClose={() => setSheet("")}>
            <p className="intro">Every world, in its own space.</p>
            <div className="games-layout">
              <div>
                <div className="game-rows">
                  {snap.data.games.map((g) => (
                    <button
                      className={`library-game ${game?.id === g.id ? "selected" : ""}`}
                      key={g.id}
                      aria-pressed={game?.id === g.id}
                      onClick={() => void act("selectGame", { id: g.id })}
                    >
                      <Package size={32} />
                      <span>
                        <strong>{g.name}</strong>
                        <small>
                          {g.version} · {g.loader ? "Fabric" : "Vanilla"}
                        </small>
                      </span>
                      <span className="eyebrow">
                        {snap.running[g.id]
                          ? "RUNNING"
                          : g.installed
                            ? "✓ READY"
                            : "INSTALL"}
                      </span>
                      <ChevronDown size={17} />
                    </button>
                  ))}
                  {!snap.data.games.length && (
                    <Empty>
                      Your first world starts here. Create a game to get going.
                    </Empty>
                  )}
                </div>
                <div className="sheet-actions">
                  <button
                    className="secondary"
                    onClick={() => setSheet("install")}
                  >
                    NEW GAME
                    <Plus size={19} />
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setSheet("import")}
                  >
                    IMPORT GAME
                    <Download size={19} />
                  </button>
                </div>
              </div>
              <aside className="game-selection">
                <h2>{game?.name || "A space of your own."}</h2>
                {game && (
                  <>
                    <dl className="facts">
                      <div>
                        <dt>VERSION</dt>
                        <dd>{game.version}</dd>
                      </div>
                      <div>
                        <dt>LOADER</dt>
                        <dd>
                          {game.loader ? `Fabric ${game.loader}` : "Vanilla"}
                        </dd>
                      </div>
                      <div>
                        <dt>MEMORY</dt>
                        <dd>{game.memory / 1024} GB</dd>
                      </div>
                    </dl>
                    <button
                      className="secondary"
                      onClick={() => {
                        setDetailsTab("content");
                        setSheet("details");
                      }}
                    >
                      <Package size={19} />
                      MANAGE CONTENT
                    </button>
                    <p className="footnote">
                      Changing versions creates a new game. Your worlds stay
                      where they are.
                    </p>
                    <button
                      className="play-button"
                      disabled={active}
                      onClick={() => {
                        setSheet("");
                        void primary();
                      }}
                    >
                      {running
                        ? "RUNNING"
                        : game.installed
                          ? "PLAY"
                          : "INSTALL"}
                      <ArrowRight size={26} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setDetailsTab("settings");
                        setSheet("details");
                      }}
                    >
                      GAME SETTINGS
                      <Settings size={17} />
                    </button>
                  </>
                )}
              </aside>
            </div>
          </Sheet>
        )}
        {sheet === "palette" && (
          <Sheet
            title="Go somewhere."
            eyebrow="COMMAND PALETTE"
            onClose={() => setSheet("")}
          >
            <div className="search-input">
              <Search size={18} />
              <input
                autoFocus
                placeholder={"What would you like to do?"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>ESC</kbd>
            </div>
            <div className="command-list">
              {shortcuts
                .filter((a) =>
                  a.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((a) => (
                  <button
                    key={a.name}
                    onClick={() => {
                      setSheet("");
                      a.action();
                    }}
                  >
                    <a.icon size={18} />
                    <span>{a.name}</span>
                    <kbd>{a.key}</kbd>
                  </button>
                ))}
            </div>
          </Sheet>
        )}
        {sheet === "import" && (
          <Sheet
            title="Install"
            eyebrow="SMART DROP"
            full
            onClose={() => setSheet("")}
          >
            <p className="intro">
              Mods, packs, and worlds. We’ll inspect the content and show you
              exactly what changes.
            </p>
            <div className="import-layout">
              <div className="import-destination">
                <label>
                  TARGET GAME
                  <select
                    value={game?.id || ""}
                    onChange={(e) =>
                      void act("selectGame", { id: e.target.value })
                    }
                  >
                    {!game && <option value="">Create a game first</option>}
                    {snap.data.games.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} · {g.version}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="notice">
                  <Archive size={18} />
                  <p>
                    A backup is created before content changes. Every import is
                    reviewed before it reaches your game.
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setSheet("install")}
                >
                  CREATE A MATCHING GAME
                  <Plus size={17} />
                </button>
              </div>
              <div className="import-source">
                <button
                  className="drop-zone"
                  disabled={!game || busy}
                  onClick={() => void pick()}
                >
                  <Upload size={28} />
                  <strong>
                    {busy
                      ? "Inspecting content…"
                      : "Choose a mod, pack, or world"}
                  </strong>
                  <span>Fabric .jar · .zip · Modrinth .mrpack</span>
                </button>
                <button
                  className="text-button"
                  disabled={!game || busy}
                  onClick={() => void pick(true)}
                >
                  <FolderOpen size={17} />
                  IMPORT FROM ANOTHER LAUNCHER
                </button>
                <div className="divider" />
                <label>
                  OR PASTE A MODRINTH LINK
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://modrinth.com/mod/…"
                  />
                </label>
                <button
                  className="primary"
                  disabled={!url || !game || busy}
                  onClick={() => {
                    setBusy(true);
                    void act("modrinth", { id: game?.id, url })
                      .then((v) => {
                        if (v) {
                          setImportPlan(v as ImportPlan);
                          setSheet("importReview");
                        }
                      })
                      .finally(() => setBusy(false));
                  }}
                >
                  INSPECT LINK
                  <ArrowRight size={16} />
                </button>
                <p className="footnote">
                  Links download into a review cache. Nothing changes in your
                  game until you confirm.
                </p>
              </div>
            </div>
          </Sheet>
        )}
        {sheet === "importReview" && importPlan && (
          <Sheet
            title="Review import"
            eyebrow="SMART DROP / REVIEW"
            full
            onClose={() => setSheet("")}
          >
            <p className="intro">A quick look before it lands.</p>
            <div className="import-layout">
              <div className="import-destination">
                <Download size={38} />
                <h2>Ready for review.</h2>
                <p className="muted">{importPlan.filename}</p>
                <p className="footnote">
                  Review compatibility and declared dependencies. Your source
                  files stay untouched.
                </p>
                <button
                  className="secondary"
                  onClick={() => setSheet("import")}
                >
                  CHOOSE ANOTHER FILE
                </button>
              </div>
              <div className="review-card">
                <div className="review-game">
                  <Package size={28} />
                  <div>
                    <h3>{importPlan.filename}</h3>
                    <p>
                      {importPlan.kind.toUpperCase()} → {game?.name}
                    </p>
                  </div>
                </div>
                <dl className="facts">
                  <div>
                    <dt>Reviewed content</dt>
                    <dd>
                      {importPlan.fileCount} entries · up to{" "}
                      {bytes(importPlan.expandedBytes)}
                    </dd>
                  </div>
                  <div>
                    <dt>Target Minecraft</dt>
                    <dd>{importPlan.version}</dd>
                  </div>
                  <div>
                    <dt>Loader</dt>
                    <dd>
                      {importPlan.loader
                        ? `Fabric ${importPlan.loader}`
                        : "Vanilla"}
                    </dd>
                  </div>
                </dl>
                {importPlan.notes.map((n) => (
                  <p className="muted" key={n}>
                    {n}
                  </p>
                ))}
                {importPlan.dependencies.length > 0 && (
                  <>
                    <h3>Declared dependencies</h3>
                    <ul className="dependency-list">
                      {importPlan.dependencies.map((d) => (
                        <li className="mono" key={d}>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="notice">
                  <Archive size={18} />
                  <p>{importPlan.backup}</p>
                </div>
                <div className="sheet-actions">
                  <button
                    className="primary"
                    onClick={() => {
                      void act("applyImport", { token: importPlan.token });
                      setSheet("");
                    }}
                  >
                    CONFIRM IMPORT
                    <Check size={17} />
                  </button>
                  <button className="text-button" onClick={() => setSheet("")}>
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          </Sheet>
        )}
        {sheet === "details" && game && (
          <Sheet
            title={game.name}
            eyebrow={`${game.version} / ${game.loader ? "FABRIC" : "VANILLA"}`}
            onClose={() => setSheet("")}
            wide
          >
            <div className="tabs">
              {["overview", "content", "settings", "backups", "logs"].map(
                (t) => (
                  <button
                    key={t}
                    className={detailsTab === t ? "selected" : ""}
                    onClick={() => setDetailsTab(t)}
                  >
                    {t.toUpperCase()}
                  </button>
                ),
              )}
            </div>
            {detailsTab === "overview" ? (
              <>
                <dl className="facts">
                  <div>
                    <dt>State</dt>
                    <dd>
                      {running
                        ? "Running"
                        : game.installed
                          ? "Installed & verified"
                          : "Not installed"}
                    </dd>
                  </div>
                  <div>
                    <dt>Memory</dt>
                    <dd>{game.memory / 1024} GB</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(game.created).toLocaleDateString()}</dd>
                  </div>
                </dl>
                <div className="action-grid">
                  <button
                    onClick={() => void act("openFolder", { id: game.id })}
                  >
                    <FolderOpen size={19} />
                    Open folder
                  </button>
                  <button
                    disabled={running || active}
                    onClick={() => {
                      void act("duplicate", { id: game.id });
                      setSheet("");
                    }}
                  >
                    <Copy size={19} />
                    Duplicate game
                  </button>
                  <button
                    disabled={running || active}
                    onClick={() => {
                      void act("install", { id: game.id });
                      setSheet("");
                    }}
                  >
                    <RefreshCw size={19} />
                    Verify / reinstall
                  </button>
                  <button
                    disabled={running || active}
                    onClick={() => setSheet("delete")}
                  >
                    <Trash2 size={19} />
                    Delete game
                  </button>
                </div>
              </>
            ) : detailsTab === "settings" ? (
              <>
                <label>
                  GAME NAME
                  <input
                    value={editName}
                    maxLength={64}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </label>
                <label>
                  MEMORY · {editMemory / 1024} GB
                  <input
                    type="range"
                    min={512}
                    max={Math.floor(snap.ramMB / 512) * 512}
                    step={512}
                    value={editMemory}
                    onChange={(e) => setEditMemory(+e.target.value)}
                  />
                </label>
                {editMemory > snap.ramMB * 0.75 && (
                  <p className="warning">This exceeds 75% of system RAM.</p>
                )}
                <div className="two-fields">
                  <label>
                    WINDOW WIDTH
                    <input
                      type="number"
                      min={640}
                      max={7680}
                      value={editWidth}
                      onChange={(e) => setEditWidth(+e.target.value)}
                    />
                  </label>
                  <label>
                    WINDOW HEIGHT
                    <input
                      type="number"
                      min={360}
                      max={4320}
                      value={editHeight}
                      onChange={(e) => setEditHeight(+e.target.value)}
                    />
                  </label>
                </div>
                <details>
                  <summary>Advanced JVM arguments</summary>
                  <p className="warning">
                    Incorrect options can prevent Minecraft from starting. Use
                    one -XX: or -D option per line. LOAM manages memory and
                    launch identity.
                  </p>
                  <label>
                    JVM OPTIONS
                    <textarea
                      value={editJvm}
                      onChange={(e) => setEditJvm(e.target.value)}
                      rows={4}
                    />
                  </label>
                </details>
                <button
                  className="primary"
                  disabled={running}
                  onClick={() =>
                    void act("gameSettings", {
                      id: game.id,
                      name: editName,
                      memory: editMemory,
                      width: editWidth,
                      height: editHeight,
                      jvmArgs: editJvm
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }).then((v) => {
                      if (v) setToast("Game settings saved.");
                    })
                  }
                >
                  SAVE CHANGES
                  <Check size={17} />
                </button>
                <p className="footnote">
                  To change Minecraft or loader versions, create a new game.
                  Existing worlds are never silently migrated.
                </p>
              </>
            ) : detailsTab === "content" ? (
              <>
                {content.length ? (
                  content.map((c) => (
                    <div className="content-row" key={c.path}>
                      <div>
                        <strong>{c.name}</strong>
                        <small>{c.kind}</small>
                      </div>
                      {c.kind !== "saves" && (
                        <button
                          className="text-button"
                          disabled={running || active}
                          onClick={() =>
                            void act("toggleContent", {
                              id: game.id,
                              path: c.path,
                            })
                              .then(() =>
                                call<typeof content>("content", {
                                  id: game.id,
                                }),
                              )
                              .then(setContent)
                              .catch(fail)
                          }
                        >
                          {c.enabled ? "DISABLE" : "ENABLE"}
                        </button>
                      )}
                      <button
                        className="text-button"
                        disabled={running || active}
                        onClick={() => {
                          setRemovePath(c.path);
                          setSheet("removeContent");
                        }}
                      >
                        REMOVE
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty>No imported content yet.</Empty>
                )}
                <button
                  className="text-button"
                  onClick={() => setSheet("import")}
                >
                  <Plus size={16} />
                  ADD CONTENT
                </button>
              </>
            ) : detailsTab === "backups" ? (
              <>
                <p className="muted">
                  Restoring first backs up your current content. Stop Minecraft
                  before making or restoring a backup.
                </p>
                <button
                  className="primary"
                  disabled={running || active}
                  onClick={() => {
                    void act("backup", { id: game.id });
                    setSheet("");
                  }}
                >
                  <Archive size={17} />
                  CREATE BACKUP
                </button>
                {backups.length ? (
                  backups.map((b) => (
                    <div className="content-row" key={b.id}>
                      <div>
                        <strong>{new Date(b.created).toLocaleString()}</strong>
                        <small className="mono">{b.id}</small>
                      </div>
                      <button
                        className="text-button"
                        disabled={running || active}
                        onClick={() => {
                          void act("restore", { id: game.id, backup: b.id });
                          setSheet("");
                        }}
                      >
                        RESTORE
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty>No backups yet.</Empty>
                )}
              </>
            ) : (
              <>
                <div className="inline-actions">
                  <button
                    className="text-button"
                    onClick={() => void readLog()}
                  >
                    <RefreshCw size={15} />
                    REFRESH
                  </button>
                  <button className="text-button" onClick={showReport}>
                    CREATE REPORT
                    <ArrowUpRight size={15} />
                  </button>
                </div>
                <pre className="log-view">
                  {logs ||
                    "No launcher log yet. Logs appear after you launch this game."}
                </pre>
              </>
            )}
          </Sheet>
        )}
        {sheet === "delete" && game && (
          <Sheet
            title="Remove this game?"
            eyebrow="YOUR WORLDS ARE INCLUDED"
            onClose={() => setSheet("")}
          >
            <p className="intro">
              This removes <strong>{game.name}</strong> from your library,
              including its worlds, mods, and settings. The folder is retained
              in LOAM’s trash for manual recovery.
            </p>
            <label>
              TYPE {game.name.toUpperCase()} TO CONFIRM
              <input
                value={deleteName}
                onChange={(e) => setDeleteName(e.target.value)}
              />
            </label>
            <div className="sheet-actions">
              <button
                className="primary"
                disabled={deleteName !== game.name}
                onClick={() =>
                  void act("deleteGame", {
                    id: game.id,
                    name: deleteName,
                  }).then((v) => {
                    if (v) {
                      setSheet("");
                      setDeleteName("");
                    }
                  })
                }
              >
                REMOVE GAME
                <Trash2 size={16} />
              </button>
              <button className="text-button" onClick={() => setSheet("")}>
                CANCEL
              </button>
            </div>
          </Sheet>
        )}
        {sheet === "stop" && game && (
          <Sheet
            title="Stop Minecraft?"
            eyebrow="GAME IS RUNNING"
            onClose={() => setSheet("")}
          >
            <p className="intro">
              Forcing the game to stop can lose unsaved progress. Save and quit
              from Minecraft when possible.
            </p>
            <div className="sheet-actions">
              <button
                className="primary"
                onClick={() => {
                  void act("stop", { id: game.id });
                  setSheet("");
                }}
              >
                STOP GAME
                <Square size={15} />
              </button>
              <button className="text-button" onClick={() => setSheet("")}>
                KEEP PLAYING
              </button>
            </div>
          </Sheet>
        )}
        {sheet === "report" && (
          <Sheet
            title="Let’s put it right."
            eyebrow="REPORT A PROBLEM"
            onClose={() => setSheet("")}
            wide
          >
            <div className="report-form">
              <div>
                <label>
                  TYPE
                  <select
                    value={report.type}
                    onChange={(e) =>
                      setReport({ ...report, type: e.target.value })
                    }
                  >
                    {[
                      "Crash on launch",
                      "Install failed",
                      "Import failed",
                      "Login problem",
                      "Visual glitch",
                      "Performance",
                      "Other / idea",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                {[
                  ["happened", "WHAT HAPPENED"],
                  ["expected", "WHAT YOU EXPECTED"],
                  ["steps", "STEPS TO REPRODUCE"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <textarea
                      rows={2}
                      maxLength={350}
                      value={report[key as "happened"]}
                      onChange={(e) =>
                        setReport({ ...report, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <div className="report-checks">
                  {[
                    ["log", "Redacted latest log"],
                    ["launchPlan", "Redacted launch plan"],
                    ["system", "System information"],
                    ["includeName", "Include profile name"],
                  ].map(([key, label]) => (
                    <label className="check-label" key={key}>
                      <input
                        type="checkbox"
                        checked={report[key as "log"]}
                        onChange={(e) =>
                          setReport({ ...report, [key]: e.target.checked })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="report-preview">
                <p className="eyebrow">EXACT EXPORT PREVIEW</p>
                {preview ? (
                  <>
                    <pre>{preview.summary}</pre>
                    <span className="mono">
                      {preview.summary.length} / 1,800 characters
                    </span>
                    {Object.entries(preview.files)
                      .filter(([n]) => n !== "summary.md")
                      .map(([n, b]) => (
                        <details key={n}>
                          <summary>{n}</summary>
                          <pre>{b}</pre>
                        </details>
                      ))}
                  </>
                ) : (
                  <p className="muted">Preparing your redacted report…</p>
                )}
              </div>
            </div>
            <div className="sheet-actions">
              <button
                className="primary"
                disabled={!preview}
                onClick={() => {
                  if (preview)
                    void navigator.clipboard
                      .writeText(preview.summary)
                      .then(() =>
                        setToast("Report copied. Review before posting."),
                      )
                      .catch(fail);
                }}
              >
                <Copy size={16} />
                COPY REPORT
              </button>
              <button
                className="secondary"
                disabled={!preview}
                onClick={() =>
                  void act("exportReport", report).then((v) => {
                    if (v)
                      setToast(
                        "Diagnostics ZIP saved and revealed in Explorer.",
                      );
                  })
                }
              >
                <Download size={16} />
                SAVE DIAGNOSTICS ZIP
              </button>
              <button
                className="text-button"
                onClick={() => void act("openLink", { kind: "discord" })}
              >
                OPEN DISCORD
                <ArrowUpRight size={15} />
              </button>
            </div>
            <p className="footnote">
              Nothing is uploaded. You decide what to share.
            </p>
          </Sheet>
        )}
        {sheet === "whatsnew" && (
          <Sheet
            title="Better, bit by bit."
            eyebrow="WHAT’S NEW"
            onClose={() => setSheet("")}
          >
            <div className="release-note">
              <span className="mono">0.1.0 · DEVELOPMENT</span>
              <h3>A new home for your worlds.</h3>
              <p>
                Isolated games, official vanilla installs, Fabric, local
                profiles, reviewed imports, and private diagnostics.
              </p>
            </div>
            {update?.available ? (
              <div className="notice">
                <div>
                  <h3>LOAM {update.version} is ready.</h3>
                  <p>{update.notes}</p>
                  <button
                    className="primary"
                    onClick={() =>
                      void invoke("install_update")
                        .then(() => setToast("Update installation started."))
                        .catch(fail)
                    }
                  >
                    INSTALL SIGNED UPDATE
                  </button>
                </div>
              </div>
            ) : (
              update && <p>You're using the latest available release.</p>
            )}
            {issues.length ? (
              issues.map((i) => (
                <div className="content-row" key={i.id}>
                  <div>
                    <span className="eyebrow">
                      {i.status}
                      {i.fixedIn ? ` · FIXED IN ${i.fixedIn}` : ""}
                    </span>
                    <h3>{i.title}</h3>
                    <p>{i.workaround}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">
                No cached known issues. The live feed will be available when
                configured.
              </p>
            )}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void checkUpdates()}
            >
              CHECK FOR UPDATES
              <RefreshCw size={16} />
            </button>
          </Sheet>
        )}
        {sheet === "migrate" && (
          <Sheet title="Move your storage." onClose={() => setSheet("")}>
            <p>A verified copy of all LOAM data will be made at:</p>
            <p className="path">{migrationTarget}</p>
            <p>
              The destination must be empty. The original stays intact. Restart
              LOAM when complete; do not change either copy until then.
            </p>
            <button
              className="primary"
              onClick={() => {
                void act("migrateStorage", { destination: migrationTarget });
                setSheet("");
              }}
            >
              COPY AND VERIFY
            </button>
          </Sheet>
        )}
        {sheet === "cleanCache" && (
          <Sheet title="Clear cached downloads?" onClose={() => setSheet("")}>
            <p>
              This removes downloaded import sources and runtime ZIP archives.
              Installed libraries, Java runtimes, worlds and resumable game
              downloads stay available. Pending import reviews must be repeated.
            </p>
            <button
              className="primary"
              onClick={() => {
                void act("cleanCache");
                setSheet("");
              }}
            >
              CLEAR DOWNLOAD CACHE
            </button>
          </Sheet>
        )}
        {dragging && (
          <div className="drag-overlay">
            <Download size={48} />
            <h1>Drop to review.</h1>
            <p>Nothing changes until you confirm.</p>
          </div>
        )}
        {sheet === "licenses" && (
          <Sheet title="Third-party notices" wide onClose={() => setSheet("")}>
            <pre className="log-view">
              {licenses || "Loading local license notices…"}
            </pre>
          </Sheet>
        )}
        {sheet === "removeContent" && game && (
          <Sheet
            title="Remove this content?"
            onClose={() => setSheet("details")}
          >
            <p className="path">{removePath}</p>
            <p>
              A full content backup is created first. Worlds contain saved
              progress. The item is moved into LOAM’s retained trash.
            </p>
            <button
              className="primary"
              onClick={() => {
                void act("removeContent", { id: game.id, path: removePath });
                setSheet("");
              }}
            >
              BACK UP AND REMOVE
            </button>
          </Sheet>
        )}
        {toast && (
          <div
            className="toast"
            role="status"
            onMouseEnter={() => setToastPaused(true)}
            onMouseLeave={() => setToastPaused(false)}
            onFocus={() => setToastPaused(true)}
            onBlur={() => setToastPaused(false)}
          >
            <CheckCircle2 size={18} />
            {toast}
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </DialogError.Provider>
  );
}
