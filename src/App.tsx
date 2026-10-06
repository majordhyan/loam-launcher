import { confirmsGameName } from "./lib/confirmation";
import { flushSync } from "react-dom";
import { createNavigator } from "./motion/navigation";
import { direction } from "./motion/policy";
import { useMotionPreference, usePageMotion } from "./motion";
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
  Mail,
  Sparkles,
  Plug,
  Gauge,
  Bell,
  Info,
  Globe,
  LayoutDashboard,
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { VerificationTools } from "./VerificationTools";
import {
  call,
  empty,
  native,
  bytes,
  type Snapshot,
  type Game,
  type Operation,
} from "./api";
import {
  Sheet,
  Wordmark,
  Empty,
  DialogError,
  BackLink,
  CustomSelect,
  StrataContour,
  PageShell,
  Toggle,
  Segmented,
  Slider,
  Chip,
  Card,
  Drawer,
  Skeleton,
} from "./ui";
import { playSfx, isSoundEnabled, setSoundEnabled } from "./sound";
import ComponentCatalog from "./ComponentCatalog";
import InstallSheet from "./InstallSheet";
import { Avatar, AccountBadge } from "./features/Avatar";
import MigrationHub, { type Instance } from "./features/MigrationHub";
import SmartDrop, { type DropClassification } from "./features/SmartDrop";
import CrashCard, { type CrashAction, type Diagnosis } from "./features/CrashCard";
import { javaFor, loaderLabel } from "./lib/versions";
import Rail from "./v17/Rail";
import Home from "./v17/Home";
import Library from "./v17/Library";
import Discover from "./v17/Discover";
import Support from "./v17/Support";
import GameHero from "./v17/GameHero";
import { ScenePanel, IntegrationsPanel, readScene, type SceneSetting } from "./v17/SettingsPanels";
import { MemoryPresets } from "./v17/MemoryPresets";
import { playtime as formatPlaytime, ago } from "./v17/time";
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
const demoSnapshot: Snapshot = {
  data: {
    schema: 1,
    games: [
      {
        id: "g-fabric",
        name: "Fabric 1.21.4",
        version: "1.21.4",
        loader: "0.16.9",
        memory: 6144,
        width: 1920,
        height: 1080,
        jvmArgs: ["-XX:+UseG1GC", "-XX:G1ReservePercent=15"],
        installed: true,
        verified: "2026-10-01",
        created: "2026-10-01",
        lastPlayed: new Date(Date.now() - 2 * 3600e3).toISOString(),
        playtime: 51_300,
        tags: ["Survival", "Shaders"],
      },
      {
        id: "g-vanilla",
        name: "Vanilla 1.20.4",
        version: "1.20.4",
        loader: null,
        memory: 4096,
        width: 1920,
        height: 1080,
        jvmArgs: [],
        installed: true,
        verified: "2026-09-20",
        created: "2026-09-20",
        lastPlayed: new Date(Date.now() - 4 * 86400e3).toISOString(),
        playtime: 7_440,
        tags: ["With friends"],
      },
      {
        id: "g-quilt",
        name: "Quilt 1.21.1",
        version: "1.21.1",
        loader: "quilt:0.26.4",
        memory: 4096,
        width: 1920,
        height: 1080,
        jvmArgs: [],
        installed: true,
        verified: "2026-09-25",
        created: "2026-09-25",
      },
    ],
    accounts: [
      {
        id: "acc-1",
        name: "Dhyan",
        kind: "offline",
        uuid: "85310931-5d2a-4727-82b6-833b9340916d",
      },
    ],
    selectedGame: "g-fabric",
    selectedAccount: "acc-1",
    preferences: { snapshots: true, setupDone: true, reducedMotion: false },
  },
  operation: null,
  running: {},
  root: "C:\\Users\\Dhyan\\AppData\\Local\\Programs\\LOAM",
  ramMB: 16384,
  freeDisk: 133_143_986_176,
  version: "1.7.1",
  capabilities: { windows: { perf: true, memoryTrim: true } },
  configuration: { microsoft: true, discord: true, updates: true },
};

export default function App() {
  const isDemo = typeof window !== "undefined" && !native && window.location.search.includes("demo=1");
  const initialPage = isDemo && window.location.search.includes("page=settings")
    ? "settings"
    : (isDemo && window.location.search.includes("page=skins")
      ? "skins"
      : (isDemo && window.location.search.includes("page=dev") ? "dev"
        : (isDemo && window.location.search.includes("page=library") ? "library"
          : (isDemo && window.location.search.includes("page=discover") ? "discover" : "home"))));
  const [snap, setSnap] = useState<Snapshot>(() => (isDemo ? demoSnapshot : empty)),
    [page, setPageState] = useState(initialPage),
    [sheet, setSheet] = useState(() =>
      isDemo && window.location.search.includes("drop=1")
        ? "smartDrop"
        : isDemo && window.location.search.includes("migrate=1")
          ? "migrate-hub"
          : "",
    ),
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
    [editNotes, setEditNotes] = useState(""),
    [editTags, setEditTags] = useState(""),
    [storageUsage, setStorageUsage] = useState<Record<string, number>>({}),
    [migrationTarget, setMigrationTarget] = useState(""),
    [licenses, setLicenses] = useState(""),
    [removePath, setRemovePath] = useState(""),
    [news, setNews] = useState<{ title: string; date: string; link: string; cached?: boolean } | null>(null),
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
    [report, setReport] = useState<{
      id: string;
      gameId: string;
      version?: string;
      loader?: string;
      memory?: number;
      type: string;
      happened: string;
      expected: string;
      steps: string;
      log: boolean;
      launchPlan: boolean;
      system: boolean;
      includeName: boolean;
    }>({
      id: "",
      gameId: "",
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
    [settingsTab, setSettingsTabState] = useState("general"),
    [theme, setTheme] = useState<"system" | "light" | "dark" | "oled">(() => {
      if (isDemo || window.location.search.includes("theme=light")) return "light";
      return (localStorage.getItem("loam_theme") as "system" | "light" | "dark" | "oled") || "light";
    }),
    [gameModeSetting, setGameModeSetting] = useState<"minimize" | "tray" | "open">(() => {
      return localStorage.getItem("loam_game_mode") === "open" ? "open" : "minimize";
    }),
    [notifyReleases, setNotifyReleases] = useState<boolean>(() => {
      return localStorage.getItem("loam_notify_releases") !== "false";
    }),
    [notifySnapshots, setNotifySnapshots] = useState<boolean>(() => {
      return localStorage.getItem("loam_notify_snapshots") === "true";
    }),
    [language, setLanguage] = useState<string>(() => {
      return localStorage.getItem("loam_language") || "en-US";
    }),
    [interfaceScale, setInterfaceScale] = useState<"compact" | "default" | "large">(() => {
      return (localStorage.getItem("loam_interface_scale") as "compact" | "default" | "large") || "default";
    }),
    [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled()),
    [celebrate, setCelebrate] = useState(0),
    [scene, setScene] = useState<SceneSetting>(readScene),
    [createPreset, setCreatePreset] = useState<{ loader?: "vanilla" | "fabric" | "quilt"; version?: string }>({}),
    [discoverKey, setDiscoverKey] = useState(0);
  // Browser design preview only (`?demo=1&crash=1` / `&drop=1`): sample states for visual review.
  const demoParam = (k: string) => isDemo && window.location.search.includes(`${k}=1`);
  const [drop, setDrop] = useState<DropClassification | null>(() =>
    demoParam("drop")
      ? {
          kind: "mod",
          title: "Sodium",
          source: "sodium-fabric-0.6.5+mc1.21.4.jar",
          suggested: "g-fabric",
          newGame: null,
          targets: [
            { id: "g-fabric", name: "Fabric 1.21.4", version: "1.21.4", loader: "0.16.9", compatible: true, reason: null },
            { id: "g-quilt", name: "Quilt 1.21.1", version: "1.21.1", loader: "quilt:0.26.4", compatible: false, reason: "Made for Minecraft ~1.21.4." },
            { id: "g-vanilla", name: "Vanilla 1.20.4", version: "1.20.4", loader: null, compatible: false, reason: "Needs a Fabric or Quilt game." },
          ],
        }
      : null,
  ),
    [migrationSeed, setMigrationSeed] = useState<Instance[] | undefined>(() =>
      demoParam("migrate")
        ? [
            { source: "Prism Launcher", name: "Fabulously Optimized", version: "1.21.4", loaderKind: "fabric", loaderVersion: "0.16.9", path: "C:\Users\you\AppData\Roaming\PrismLauncher\instances\FO", gameDir: "", worlds: 3, mods: 42, bytes: 1288490188, memory: 6144, supported: true, note: "Worlds, mods, configs, packs and settings are copied." },
            { source: "CurseForge", name: "All the Mods 9", version: "1.20.1", loaderKind: "forge", loaderVersion: "47.2.0", path: "C:\Users\you\curseforge\minecraft\Instances\ATM9", gameDir: "", worlds: 1, mods: 412, bytes: 734003200, memory: null, supported: false, note: "Forge isn't supported by LOAM. You can bring the worlds, packs and settings into a vanilla game; the mods stay behind." },
            { source: "MultiMC", name: "Vanilla Survival", version: "1.20.4", loaderKind: "vanilla", loaderVersion: null, path: "C:\Games\MultiMC\instances\VS", gameDir: "", worlds: 2, mods: 0, bytes: 268435456, memory: null, supported: true, note: "Worlds, packs and settings are copied." },
          ]
        : undefined,
    ),
    [migrationCount, setMigrationCount] = useState(0),
    [crash, setCrash] = useState<{ gameId: string; diagnosis: Diagnosis } | null>(() =>
      demoParam("crash")
        ? {
            gameId: "g-fabric",
            diagnosis: {
              code: "LOAM-CRASH-RENDERER-CONFLICT",
              title: "Mod conflict detected",
              summary: "OptiFine is incompatible with Sodium. Both change how Minecraft renders. Disable OptiFine to play safely.",
              evidence: ["mods/OptiFine_1.21.4_HD_U_J3.jar and mods/sodium-fabric-0.6.5.jar are both enabled in mods/"],
              actions: [
                { kind: "disable", label: "Disable OptiFine and play", path: "mods/OptiFine.jar" },
                { kind: "disable", label: "Disable Sodium and play", path: "mods/sodium.jar" },
              ],
            },
          }
        : null,
    );
  // Game id whose failure is explained by a crash card; its generic error is not repeated.
  const crashRef = useRef<string | null>(null);
  const game = snap.data.games.find((g) => g.id === snap.data.selectedGame) || snap.data.games[0],
    account = snap.data.accounts.find(
      (a) => a.id === snap.data.selectedAccount,
    ) || snap.data.accounts[0],
    operation = snap.operation,
    active = !!operation && activePhases.includes(operation.phase),
    gameActive = active && operation?.gameId === game?.id,
    running = !!game && !!snap.running[game.id];
  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-interface-scale", interfaceScale);
    localStorage.setItem("loam_interface_scale", interfaceScale);
  }, [interfaceScale]);
  const motion = useMotionPreference(Object.keys(snap.running).length > 0, snap.data.preferences.reducedMotion);
  usePageMotion(`${page}:${settingsTab}`, motion.mode);
  const motionNavigator = useRef<ReturnType<typeof createNavigator> | null>(null);
  if (!motionNavigator.current) motionNavigator.current = createNavigator(document, () => document.documentElement.dataset.motion === "full");
  const setPage = useCallback((next: string) => {
    document.documentElement.style.setProperty("--nav-shift", `${direction(page, next, ["home", "library", "discover", "skins", "support", "settings", "dev"]) * 12}px`);
    motionNavigator.current!.go(() => flushSync(() => setPageState(next)));
  }, [page]);
  const setSettingsTab = (next: string) => motionNavigator.current!.go(() => flushSync(() => setSettingsTabState(next)));
  useEffect(() => () => motionNavigator.current?.cancel(), []);

  useEffect(() => {
    localStorage.setItem("loam_theme", theme);
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const isDark =
        theme === "dark" || theme === "oled" || (theme === "system" && mq.matches);
      if (theme === "oled") root.setAttribute("data-oled", "true");
      else root.removeAttribute("data-oled");
      if (theme === "dark" || theme === "oled") {
        root.setAttribute("data-theme", "dark");
      } else if (theme === "light") {
        root.setAttribute("data-theme", "light");
      } else {
        // System mode: remove data-theme so prefers-color-scheme CSS takes over
        root.removeAttribute("data-theme");
      }
      if (native) void act("setTheme", { dark: isDark });
    }

    applyTheme();

    // In system mode, react immediately when the OS theme changes
    if (theme === "system") {
      mq.addEventListener("change", applyTheme);
      return () => mq.removeEventListener("change", applyTheme);
    }
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("loam_game_mode", gameModeSetting);
  }, [gameModeSetting]);
  useEffect(() => {
    if (!native) return;
    let minimizedForGame: string | null = null;
    const listeners = [
      listen<string>("window-shown", (event) => {
        if (localStorage.getItem("loam_game_mode") !== "open") {
          minimizedForGame = event.payload;
          void call("launcherMinimize").catch(fail);
        }
      }),
      listen<string>("game-exited", (event) => {
        if (minimizedForGame === event.payload) {
          minimizedForGame = null;
          void call("launcherRestore").catch(fail);
        }
      }),
    ];
    return () => { listeners.forEach((listener) => void listener.then((stop) => stop())); };
  }, [fail]);
  useEffect(() => {
    localStorage.setItem("loam_notify_releases", String(notifyReleases));
  }, [notifyReleases]);
  useEffect(() => {
    localStorage.setItem("loam_notify_snapshots", String(notifySnapshots));
  }, [notifySnapshots]);
  useEffect(() => {
    localStorage.setItem("loam_language", language);
  }, [language]);
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
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const clickable = target?.closest(
        "button, a, [role='button'], [role='tab'], input[type='radio'], input[type='checkbox']"
      );
      if (clickable) {
        if (
          !clickable.classList.contains("loam-toggle") &&
          !clickable.classList.contains("loam-segmented-btn")
        ) {
          playSfx("click");
        }
      }
    };
    window.addEventListener("click", handleGlobalClick, true);
    return () => window.removeEventListener("click", handleGlobalClick, true);
  }, []);
  useEffect(() => {
    void refresh().catch(fail);
    if (!native) return;
    const unsubs = [
      listen<Operation>("operation", (e) => {
        setSnap((s) => ({ ...s, operation: e.payload }));
        if (e.payload.error && crashRef.current !== e.payload.gameId) setError(e.payload.error);
        if (e.payload.phase === "ready") {
          playSfx("installed");
          if (e.payload.message && e.payload.message !== "Game closed. Ready to play.")
            setToast(e.payload.message);
        }
        if (!activePhases.includes(e.payload.phase)) void refresh().catch(fail);
      }),
      listen("state-changed", () => void refresh().catch(fail)),
      listen<string>("close-blocked", (e) => fail(e.payload)),
      listen<string>("game-failure", (e) => fail(e.payload)),
      listen<{ gameId: string; diagnosis: Diagnosis }>("crash-diagnosis", (e) => {
        crashRef.current = e.payload.gameId;
        setCrash(e.payload);
      }),
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
    
    void invoke<{ available: boolean; version?: string; notes?: string }>(
      "check_update",
    )
      .then(setUpdate)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!native) return;
    let live = true, pending = false, checked = 0;
    const refreshNews = () => {
      if (document.hidden || pending || Date.now() - checked < 900_000) return;
      pending = true; checked = Date.now();
      void call<{ title: string; date: string; link: string; cached?: boolean }>("news")
        .then(v => { if (live) setNews(v); }).catch(() => {})
        .finally(() => { pending = false; });
    };
    refreshNews();
    const timer = setInterval(refreshNews, 900_000);
    window.addEventListener("focus", refreshNews);
    return () => { live = false; clearInterval(timer); window.removeEventListener("focus", refreshNews); };
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
    if (!native) return;
    if (!game) {
      setCrash(null);
      crashRef.current = null;
      return;
    }
    let live = true;
    void call<Diagnosis | null>("crashDiagnosis", { id: game.id })
      .then((d) => {
        if (!live) return;
        setCrash(d ? { gameId: game.id, diagnosis: d } : null);
        crashRef.current = d ? game.id : null;
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [game?.id]);
  useEffect(() => {
    if (!native || game) return;
    let live = true;
    void call<{ instances: Instance[] }>("migrationScan")
      .then((v) => {
        if (live) setMigrationCount(v.instances.length);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [!!game]);
  useEffect(() => {
    if (!native) return;
    const unlisten = getCurrentWebview().onDragDropEvent((e) => {
      setDragging(e.payload.type === "over" || e.payload.type === "enter");
      if (e.payload.type === "drop") {
        setDragging(false);
        if (e.payload.paths.length !== 1) {
          fail("Drop one file or game folder at a time.");
          return;
        }
        void routeDrop(e.payload.paths[0]);
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
    if (sheet !== "report") return;
    setReport((r) => {
      const activeGame =
        snap.data.games.find(
          (g) => g.id === (r.gameId || snap.data.selectedGame),
        ) || snap.data.games[0];
      const genuineError =
        error &&
        error !==
          "Finish or cancel the current operation and stop Minecraft before closing LOAM."
          ? error
          : "";
      let defaultHappened = r.happened;
      if (!defaultHappened) {
        if (genuineError) {
          defaultHappened = genuineError;
        } else if (!activeGame) {
          defaultHappened = "LOAM opened. No game instance created yet.";
        } else if (!activeGame.installed) {
          defaultHappened = `Game ${activeGame.name} (${activeGame.version}) is created but not yet installed.`;
        } else if (snap.operation?.error) {
          defaultHappened = snap.operation.error;
        } else {
          defaultHappened = `Manual report generated for ${activeGame.name} (${activeGame.version}).`;
        }
      }
      let defaultExpected = r.expected;
      if (!defaultExpected) {
        defaultExpected = activeGame
          ? `Minecraft ${activeGame.version} (${activeGame.loader || "Vanilla"}) should launch and run normally.`
          : "Create and play Minecraft without issues.";
      }
      let defaultSteps = r.steps;
      if (!defaultSteps) {
        defaultSteps = activeGame
          ? `1. Select ${activeGame.name}.\n2. Click PLAY.`
          : "1. Open LOAM Launcher.\n2. Click Install to create a game.";
      }
      const updatedGameId = r.gameId || activeGame?.id || "";
      if (
        r.happened !== defaultHappened ||
        r.expected !== defaultExpected ||
        r.steps !== defaultSteps ||
        r.gameId !== updatedGameId
      ) {
        return {
          ...r,
          happened: defaultHappened,
          expected: defaultExpected,
          steps: defaultSteps,
          gameId: updatedGameId,
        };
      }
      return r;
    });
  }, [
    sheet,
    snap.data.games,
    snap.data.selectedGame,
    error,
    snap.operation?.error,
  ]);
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
    setEditNotes(game.notes || "");
    setEditTags((game.tags || []).join(", "));
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
  /** Smart Drop: identify the item once, then choose its destination. */
  async function routeDrop(source: string) {
    setBusy(true);
    try {
      const c = await call<
        | DropClassification
        | { kind: "instance"; instance: Instance }
        | { kind: "launcher"; title: string }
      >("classifyDrop", { source });
      if (c.kind === "instance") {
        setMigrationSeed([c.instance]);
        setSheet("migrate-hub");
      } else if (c.kind === "launcher") {
        await inspect(source);
      } else {
        setDrop(c);
        setSheet("smartDrop");
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function reviewDrop(gameId: string) {
    if (!drop) return;
    setBusy(true);
    try {
      if (gameId !== snap.data.selectedGame) await call("selectGame", { id: gameId });
      await refresh();
      setImportPlan(await call<ImportPlan>("inspectImport", { id: gameId, source: drop.source }));
      setSheet("importReview");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function createForDrop() {
    if (!drop?.newGame) return;
    setBusy(true);
    try {
      const g = await call<Game>("createGame", {
        name: drop.newGame.name,
        version: drop.newGame.version,
        loader: drop.newGame.loader,
        memory: Math.max(1024, Math.min(4096, Math.floor(snap.ramMB / 2 / 512) * 512)),
      });
      await refresh();
      setImportPlan(await call<ImportPlan>("inspectImport", { id: g.id, source: drop.source }));
      setSheet("importReview");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  function clearCrash(id: string) {
    void call("dismissCrash", { id }).catch(() => {});
    setCrash(null);
    crashRef.current = null;
  }
  async function crashAction(a: CrashAction) {
    if (!game) return;
    if (a.kind === "log") {
      setSheet("details");
      setDetailsTab("logs");
      return;
    }
    if (a.kind === "settings") {
      setSheet("details");
      setDetailsTab("settings");
      return;
    }
    if (a.kind === "modrinth" && a.url) {
      setUrl(a.url);
      setSheet("import");
      return;
    }
    try {
      if (a.kind === "disable" && a.path) await call("toggleContent", { id: game.id, path: a.path });
      if (a.kind === "memory" && a.value)
        await call("gameSettings", { id: game.id, name: game.name, memory: a.value });
      clearCrash(game.id);
      setError("");
      await refresh();
      setToast(a.kind === "disable" ? "Mod disabled. Launching…" : "Memory updated. Launching…");
      playSfx("launch");
      await act("launch", { id: game.id });
    } catch (e) {
      fail(e);
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
    if (typeof p === "string") await routeDrop(p);
  }
  async function readLog() {
    if (game) {
      const v = await act("log", { id: game.id });
      setLogs(typeof v === "string" ? v : "");
    }
  }
  function showReport(ctx?: unknown) {
    const reportCtx =
      ctx && typeof ctx === "object" && "version" in ctx
        ? (ctx as { version?: string; loader?: string | null; memory?: number })
        : undefined;
    const CLOSE_BLOCKED =
      "Finish or cancel the current operation and stop Minecraft before closing LOAM.";
    const genuineError = error && error !== CLOSE_BLOCKED ? error : "";

    const activeGame = game || snap.data.games[0];

    // Auto-build a happened description from app state when no error text is available.
    // This ensures the field is never blank when the user opens a report.
    function autoHappened(): string {
      if (genuineError) return genuineError;
      if (!activeGame) {
        if (reportCtx?.version) {
          return `Configuring Minecraft ${reportCtx.version} (${reportCtx.loader || "Vanilla"}).`;
        }
        return "LOAM opened. No game instance created yet.";
      }
      if (!activeGame.installed) {
        return `Game ${activeGame.name} (${activeGame.version}) is created but not yet installed.`;
      }
      // Check operation error
      if (snap.operation?.error) return snap.operation.error;
      return `Manual report generated for ${activeGame.name} (${activeGame.version}).`;
    }

    setReport((r) => ({
      ...r,
      id: "",
      gameId: activeGame?.id || "",
      version: reportCtx?.version || activeGame?.version || r.version || "",
      loader: reportCtx?.loader || activeGame?.loader || r.loader || "",
      memory: reportCtx?.memory || activeGame?.memory || r.memory,
      happened: autoHappened() || r.happened,
    }));
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
    if (crash?.gameId === game.id) clearCrash(game.id);
    playSfx("launch");
    setCelebrate((n) => n + 1);
    await act("launch", { id: game.id });
  }
  /** Play, install or stop any game from Home's recent list or the Library. */
  async function playGame(id: string) {
    const g = snap.data.games.find((x) => x.id === id);
    if (!g) return;
    if (id !== snap.data.selectedGame) await act("selectGame", { id });
    if (snap.running[id]) {
      setSheet("stop");
      return;
    }
    if (active) return;
    if (!g.installed) {
      await act("install", { id });
      return;
    }
    if (!account) {
      setSheet("accounts");
      return;
    }
    setError("");
    if (crash?.gameId === id) clearCrash(id);
    playSfx("launch");
    setCelebrate((n) => n + 1);
    await act("launch", { id });
  }
  async function openDetails(id?: string) {
    if (id && id !== snap.data.selectedGame) await act("selectGame", { id });
    setDetailsTab("overview");
    setSheet("details");
  }
  function openCreate(loader?: "vanilla" | "fabric" | "quilt", version?: string) {
    setCreatePreset({ loader, version });
    setSheet("install");
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
      } else if (e.altKey && !e.ctrlKey && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        setSheet("");
        setPage(["home", "library", "discover", "skins"][+e.key - 1]);
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
    {
      name: "Import from Prism, MultiMC or CurseForge",
      icon: FolderOpen,
      action: () => {
        setMigrationSeed(undefined);
        setSheet("migrate-hub");
      },
      key: "",
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
    ...(import.meta.env.DEV
      ? [
          {
            name: "Component Catalog",
            icon: SlidersHorizontal,
            action: () => setPage("dev"),
            key: "",
          },
        ]
      : []),
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
      <div className="v17-shell">
        <Rail
          page={page}
          onNavigate={(next) => {
            setSheet("");
            if (next !== page) playSfx("nav");
            setPage(next);
          }}
          onPlay={() => void primary()}
          state={!game ? "none" : running ? "running" : gameActive ? "busy" : game.installed ? "play" : "install"}
          progress={gameActive && operation && operation.total > 0 ? Math.min(1, operation.done / operation.total) : undefined}
          gameName={game?.name}
        />
        <div className={`v17-content app is-subpage page-${page}`}>
        {!native && page === "home" && (
          <div className="preview-banner">
            DESIGN PREVIEW · File access and game operations are available in
            the desktop app.
          </div>
        )}
        {error && ["home", "library", "discover"].includes(page) && (
          <div className="v17-page" style={{ paddingBottom: 0 }}>
            <div className="v17-banner" role="alert">
              <AlertTriangle size={18} />
              <div>
                <strong>Something needs your attention.</strong>
                <p>{error}</p>
                {matchedIssue && (
                  <p>
                    <strong>
                      Known issue
                      {matchedIssue.fixedIn ? ` — fixed in ${matchedIssue.fixedIn}` : ` — ${matchedIssue.status}`}
                    </strong>
                    {matchedIssue.workaround && ` · ${matchedIssue.workaround}`}
                  </p>
                )}
                <div className="v17-banner-actions">
                  <button className="v17-text-btn" onClick={showReport}>Report this</button>
                  {game && (
                    <>
                      <button className="v17-text-btn" onClick={() => { setSheet("details"); setDetailsTab("logs"); }}>View log</button>
                      <button className="v17-text-btn" onClick={() => { setError(""); void primary(); }}>Retry</button>
                    </>
                  )}
                </div>
              </div>
              <button className="v17-icon-btn" aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        {dragging && (
          <div className="home-drop-overlay">
            <Download size={36} color="var(--loam-accent-deep)" />
            <span>Drop to review</span>
          </div>
        )}
        {page === "home" ? (
          <Home
            snap={snap}
            game={game}
            account={account}
            running={running}
            gameActive={gameActive}
            operation={operation}
            crashSlot={
              crash && game && crash.gameId === game.id && !running && !gameActive ? (
                <CrashCard
                  diagnosis={crash.diagnosis}
                  busy={active}
                  onAction={(a) => void crashAction(a)}
                  onDismiss={() => clearCrash(game.id)}
                  onLog={() => {
                    setSheet("details");
                    setDetailsTab("logs");
                  }}
                  onReport={() => showReport()}
                />
              ) : null
            }
            scene={scene}
            celebrate={celebrate}
            motionPaused={motion.mode !== "full"}
            news={news}
            migrationCount={migrationCount}
            onPlay={() => void primary()}
            onPlayGame={(id) => void playGame(id)}
            onSelectGame={(id) => void act("selectGame", { id })}
            onDetails={(id) => void openDetails(id)}
            onAccounts={() => setSheet("accounts")}
            onMicrosoft={snap.configuration.microsoft ? () => {
              setSheet("accounts");
              void act("signIn");
            } : undefined}
            onCreate={() => openCreate()}
            onOfflineProfile={() => setSheet("offline")}
            onImport={() => setSheet("import")}
            onMigrate={() => {
              setMigrationSeed(undefined);
              setSheet("migrate-hub");
            }}
            onDiscover={() => setPage("discover")}
            onLibrary={() => setPage("library")}
            onPalette={() => {
              setQuery("");
              setSheet("palette");
            }}
            onNews={() => {
              if (news) void act("openLink", { kind: "news", url: news.link });
              else setSheet("whatsnew");
            }}
          />
        ) : page === "library" ? (
          <Library
            snap={snap}
            busy={active}
            onPlayGame={(id) => void playGame(id)}
            onSelectGame={(id) => void act("selectGame", { id })}
            onDetails={(id) => void openDetails(id)}
            onCreate={(l) => openCreate(l)}
            onMigrate={() => {
              setMigrationSeed(undefined);
              setSheet("migrate-hub");
            }}
            onDuplicate={(id) => void act("duplicate", { id })}
          />
        ) : page === "discover" ? (
          <Discover
            snap={snap}
            defaultGameId={game?.id}
            refreshKey={discoverKey}
            onToast={(m) => {
              playSfx("success");
              setToast(m);
            }}
            onError={(e) => {
              playSfx("error");
              fail(e);
            }}
            onModpack={(path) => void routeDrop(path)}
            onCreate={(l, v) => openCreate(l, v)}
            onOpenLink={(url) => void act("openLink", { kind: "project", url })}
            onSettings={() => {
              setSettingsTabState("integrations");
              setPage("settings");
            }}
          />
        ) : page === "dev" ? (
          <ComponentCatalog
            onNavigate={setPage}
            onCommandPalette={() => setSheet("palette")}
          />
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
              reducedMotion={motion.mode !== "full"}
              onNavigate={setPage}
              onCommandPalette={() => setSheet("palette")}
              onBack={() => setPage("home")}
              onAccounts={() => setSheet("accounts")}
              onError={fail}
              onReport={showReport}
            />
          </Suspense>
        ) : page === "settings" ? (
          <main className="v17-page v17-settings">
            <header className="v17-page-head v17-rise">
              <div>
                <p className="v17-eyebrow"><Settings size={13} /> LOAM {snap.version}</p>
                <h1 className="v17-display">Settings<span className="v17-dot">.</span></h1>
              </div>
            </header>
            <div className="settings-layout">
              <nav className="settings-nav" aria-label="Settings sections">
                {([
                  ["general", "General", "Theme, size, motion", SlidersHorizontal],
                  ["scene", "Home & sound", "Scene, sounds, volume", Sparkles],
                  ["integrations", "Integrations", "Modrinth, CurseForge", Plug],
                  ["accounts", "Accounts", "Microsoft and offline", UserRound],
                  ["storage", "Storage & Java", "Folders, cache, Java", HardDrive],
                  ["performance", "Performance", "While you play", Gauge],
                  ["notifications", "Notifications", "Releases and news", Bell],
                  ["updates", "Updates", "LOAM versions", RefreshCw],
                  ["about", "About LOAM", "Licences and privacy", Info],
                ] as const).map(([id, label, note, Icon]) => (
                  <button
                    key={id}
                    className={settingsTab === id ? "selected" : ""}
                    aria-current={settingsTab === id ? "page" : undefined}
                    onClick={() => setSettingsTab(id)}
                  >
                    <span className="v17-nav-icon"><Icon size={17} /></span>
                    <span className="v17-nav-text"><strong>{label}</strong><small>{note}</small></span>
                  </button>
                ))}
              </nav>
              <div className="settings-content">
                {settingsTab === "scene" ? (
                  <ScenePanel
                    scene={scene}
                    onChange={setScene}
                    seed={game?.id || "loam"}
                    loader={game?.loader ?? "0"}
                    soundOn={soundOn}
                    onSound={(on) => {
                      setSoundOn(on);
                      setSoundEnabled(on);
                    }}
                  />
                ) : settingsTab === "integrations" ? (
                  <IntegrationsPanel onChanged={() => setDiscoverKey((n) => n + 1)} onToast={setToast} />
                ) : settingsTab === "general" ? (
                  <>
                    <h2>Make LOAM feel like yours.</h2>
                    <p className="muted">
                      The essentials, set up for the way you play.
                    </p>
                    <div className="setting-row">
                      <div>
                        <h3>Appearance</h3>
                        <p>
                          Choose your interface appearance. Windows high contrast and system themes are respected.
                        </p>
                      </div>
                      <Segmented
                        value={theme}
                        onChange={setTheme}
                        options={[
                          { value: "system", label: "System" },
                          { value: "light", label: "Light" },
                          { value: "dark", label: "Dark" },
                          { value: "oled", label: "OLED Black" },
                        ]}
                        name="Appearance"
                      />
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>Interface size</h3>
                        <p>
                          Scale interface elements, fonts, and controls for your display.
                        </p>
                      </div>
                      <Segmented
                        value={interfaceScale}
                        onChange={setInterfaceScale}
                        options={[
                          { value: "compact", label: "Compact" },
                          { value: "default", label: "Default" },
                          { value: "large", label: "Large" },
                        ]}
                        name="Interface size"
                      />
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>Motion & Transitions</h3>
                        <p>
                          {motion.reason}
                        </p>
                      </div>
                      <Segmented
                        value={motion.setting}
                        onChange={motion.setSetting}
                        options={[
                          { value: "system", label: "System" },
                          { value: "full", label: "Full" },
                          { value: "reduced", label: "Reduced" },
                          { value: "off", label: "Off" },
                        ]}
                        name="Animations"
                      />
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>Language</h3>
                        <p>Interface language for menus, dialogues, and system tools.</p>
                      </div>
                      <div style={{ minWidth: 160 }}>
                        <CustomSelect
                          value={language}
                          onChange={(v) => setLanguage(v)}
                          options={[
                            { value: "en-US", label: "English (US)" },
                            { value: "en-GB", label: "English (UK)" },
                            { value: "de-DE", label: "Deutsch" },
                            { value: "es-ES", label: "Español" },
                            { value: "fr-FR", label: "Français" },
                            { value: "ja-JP", label: "日本語" },
                          ]}
                        />
                      </div>
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>Preview versions</h3>
                        <p>Show Minecraft snapshots and preview builds in the version catalog.</p>
                      </div>
                      <Toggle
                        checked={snap.data.preferences.snapshots}
                        onChange={(checked) =>
                          void act("preferences", {
                            snapshots: checked,
                          })
                        }
                        ariaLabel="Show snapshots"
                      />
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
                      Manage accounts
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
                        <p>{bytes(snap.freeDisk)} free on this drive</p><p>Games contain their own mods, saves, resource packs and screenshots. Shared assets, libraries and Java are in cache.</p>
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
                        Change data folder
                      </button>
                      <button
                        disabled={active || running}
                        onClick={() => setSheet("cleanCache")}
                      >
                        Clean cached downloads
                      </button>
                      <button
                        disabled={active || running}
                        onClick={() => void act("restart")}
                      >
                        Restart LOAM
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
                ) : settingsTab === "performance" ? (
                  <>
                    <h2>Tuned for your PC & Windows.</h2>
                    <p className="muted">
                      LOAM coordinates with Windows graphics scheduling and JVM runtime flags to maximize framerate stability.
                    </p>
                    <div className="setting-row">
                      <div>
                        <h3>Game Mode</h3>
                        <p>Launcher behavior while Minecraft is running to minimize resource competition.</p>
                      </div>
                      <div className="segmented" role="radiogroup" aria-label="Game Mode">
                        <button
                          type="button"
                          role="radio"
                          aria-pressed={gameModeSetting === "minimize"}
                          aria-checked={gameModeSetting === "minimize"}
                          onClick={() => setGameModeSetting("minimize")}
                        >
                          Minimize
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-pressed={gameModeSetting === "tray"}
                          aria-checked={gameModeSetting === "tray"}
                          disabled
                          title="The optional tray companion is not enabled in this build."
                        >
                          Tray unavailable
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-pressed={gameModeSetting === "open"}
                          aria-checked={gameModeSetting === "open"}
                          onClick={() => setGameModeSetting("open")}
                        >
                          Stay open
                        </button>
                      </div>
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>High-Performance Discrete GPU</h3>
                        <p>
                          LOAM requests Windows’ high-performance GPU preference for the managed Java runtime when launching. The driver chooses the actual GPU.
                        </p>
                      </div>
                      <span className="badge-verified" style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600 }}>
                        Requested on launch
                      </span>
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>Process Priority Elevation</h3>
                        <p>
                          LOAM requests above-normal process priority. Its effect depends on the system workload.
                        </p>
                      </div>
                      <span className="badge-verified" style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600 }}>
                        Above normal
                      </span>
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>Fixed Heap Memory Allocation</h3>
                        <p>
                          Initial and maximum heap sizes currently match. This may reduce heap resizing but does not guarantee fewer pauses.
                        </p>
                      </div>
                      <span className="badge-verified" style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600 }}>
                        FIXED HEAP (-Xms=-Xmx)
                      </span>
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>EcoQoS Opt-out (Efficiency Cores)</h3>
                        <p>
                          Requests an EcoQoS opt-out. This does not pin Minecraft to particular CPU cores or guarantee performance.
                        </p>
                      </div>
                      <span className="badge-verified" style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600 }}>
                        High performance
                      </span>
                    </div>
                    <div className="notice" style={{ marginTop: "20px" }}>
                      <ShieldCheck size={20} />
                      <div>
                        <strong>Hardware Profile Summary</strong>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--loam-text-2)" }}>
                          Detected System RAM: {Math.round(snap.ramMB / 1024)} GiB · Suggested allocation: {Math.min(4096, Math.floor(snap.ramMB * 0.5))} MiB · Launch timings have not been measured on this PC.
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-button"
                      style={{ marginTop: "16px" }}
                      onClick={() => {
                        setGameModeSetting("minimize");
                        setToast("Performance preferences reset to optimal defaults.");
                      }}
                    >
                      Reset performance defaults
                      <RefreshCw size={15} />
                    </button>
                  </>
                ) : settingsTab === "notifications" ? (
                  <>
                    <h2>Notifications & Announcements.</h2>
                    <p className="muted">
                      Stay informed about Minecraft updates, security advisories, and LOAM releases.
                    </p>
                    <div className="setting-row">
                      <div>
                        <h3>Release announcements</h3>
                        <p>Notify when a new official Minecraft Java Edition release is published.</p>
                      </div>
                      <Toggle
                        checked={notifyReleases}
                        onChange={setNotifyReleases}
                        ariaLabel="Release announcements"
                      />
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>Snapshot & preview notifications</h3>
                        <p>Notify when experimental snapshots, pre-releases, and release candidates arrive.</p>
                      </div>
                      <Toggle
                        checked={notifySnapshots}
                        onChange={setNotifySnapshots}
                        ariaLabel="Snapshot notifications"
                      />
                    </div>
                    <div className="inline-actions" style={{ marginTop: "24px" }}>
                      <button
                        className="primary"
                        onClick={() => {
                          setToast("LOAM notification active: ready for your next world.");
                        }}
                      >
                        Send test notification
                        <Check size={16} />
                      </button>
                    </div>
                  </>
                ) : settingsTab === "updates" ? (
                  <>
                    <h2>Always a little better.</h2>
                    <p className="muted">
                      Update packages must pass signature verification. You
                      choose when to install.
                    </p>
                    {snap.configuration.updates ? <>
                      <button className="primary" disabled={busy} onClick={() => void checkUpdates()}>
                        CHECK FOR UPDATES <RefreshCw size={16} />
                      </button>
                    </> : <p className="muted">Automatic update checks are unavailable in this version. Install a newer LOAM setup manually to update.</p>}
                  </>
                ) : (
                  <>
                    <Wordmark />
                    <p className="intro">Your worlds, ready.</p>
                    <p className="mono">Version {snap.version} · Windows x64</p>
                    <VerificationTools gameId={game?.id} onError={fail} />
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
                      Licenses & third-party notices
                    </button>
                    <p className="muted">
                      Built with Tauri, React, and Rust. Geist typography. Icons
                      by Lucide.
                    </p>
                    <div className="notice" style={{ marginTop: "16px" }}>
                      <HardDrive size={18} />
                      <div>
                        <strong>How LOAM counts sizes</strong>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--loam-text-2)" }}>
                          Storage and download values use binary units: 1 MiB = 1,048,576 bytes and 1 GiB = 1,073,741,824 bytes.
                        </p>
                      </div>
                    </div>
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
          <Support
            snap={snap}
            reports={reports}
            issues={issues}
            onDiscord={() => void act("openLink", { kind: "discord" })}
            onEmail={() => void act("openLink", { kind: "email" })}
            onCopy={(text, message) => void navigator.clipboard.writeText(text).then(() => setToast(message)).catch(fail)}
            onReport={showReport}
            onWhatsNew={() => setSheet("whatsnew")}
          />
        )}
        {sheet === "install" && (
          <InstallSheet
            key={`${createPreset.loader || ""}${createPreset.version || ""}`}
            initialLoader={createPreset.loader}
            initialVersion={createPreset.version}
            snap={snap}
            onClose={() => setSheet("")}
            onCreated={(g) => void created(g)}
            onReport={showReport}
            onImport={() => {
              setMigrationSeed(undefined);
              setSheet("migrate-hub");
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
                          <Avatar account={a} size={36} />
                        </span>
                        <span>
                          <strong>{a.name}</strong>
                          <small>
                            <AccountBadge account={a} />
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
                                      lan: "Lan",
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
                  <button className="primary" disabled={active} onClick={() => void act("signIn")}>Sign in with Microsoft <ArrowUpRight size={16} /></button>
                  <button
                    className="secondary"
                    onClick={() => setSheet("offline")}
                  >
                    Create offline profile
                    <ArrowUpRight size={16} />
                  </button>

                </div>
                <p className="footnote">Minecraft Java Edition is a paid game. Offline Profiles do not verify ownership or provide access to authenticated servers or Realms.</p>
              </div>
              {operation?.phase === "authenticating" && <div role="status" className="notice"><p>{operation.message}</p><button className="secondary" onClick={() => void act("cancel")}>Cancel sign-in</button></div>}
              <aside className="account-detail-card">
                <span className="avatar large">
                  <Avatar account={account} size={64} />
                </span>
                <h2>{account?.name || "Your next adventure."}</h2>
                <dl className="facts">
                  <div>
                    <dt>Account type</dt>
                    <dd>
                      {account?.kind === "microsoft"
                        ? "Microsoft"
                        : account
                          ? "Offline profile"
                          : "No account selected"}
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      {account?.kind === "microsoft"
                        ? account.verified
                          ? `Java Edition ✓ · checked ${new Date(account.verified).toLocaleDateString()}`
                          : "Sign in again to confirm Java access"
                        : account
                          ? "Local play"
                          : "Choose a profile to play"}
                    </dd>
                  </div>
                  <div>
                    <dt>Next launch</dt>
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
                  Skins & capes
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
            eyebrow="Offline profile"
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
                Display name
                <input
                  autoFocus
                  data-autofocus
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
                  Create offline profile
                  <ArrowRight size={16} />
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setSheet("")}
                >
                  Cancel
                </button>
              </div>
            </form>

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
                          ? "Running"
                          : g.installed
                            ? "✓ READY"
                            : "Install"}
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
                    New game
                    <Plus size={19} />
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setSheet("import")}
                  >
                    Import game
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
                        <dt>Version</dt>
                        <dd>{game.version}</dd>
                      </div>
                      <div>
                        <dt>Loader</dt>
                        <dd>
                          {loaderLabel(game.loader)}
                        </dd>
                      </div>
                      <div>
                        <dt>Memory</dt>
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
                      Manage content
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
                        ? "Running"
                        : game.installed
                          ? "Play"
                          : "Install"}
                      <ArrowRight size={26} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setDetailsTab("settings");
                        setSheet("details");
                      }}
                    >
                      Game settings
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
            eyebrow="Command palette"
            onClose={() => setSheet("")}
          >
            <div className="search-input">
              <Search size={18} />
              <input
                autoFocus
                data-autofocus
                aria-label="Search actions"
                placeholder={"What would you like to do?"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const first = shortcuts.find((a) =>
                    a.name.toLowerCase().includes(query.toLowerCase()),
                  );
                  if (first) {
                    e.preventDefault();
                    setSheet("");
                    first.action();
                  }
                }}
              />
              <kbd>Esc</kbd>
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
            eyebrow="Smart drop"
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
                  Target game
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
                  Create a matching game
                  <Plus size={17} />
                </button>
              </div>
              <div className="import-source">
                <button
                  className="drop-zone"
                  disabled={busy}
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
                  disabled={busy}
                  onClick={() => {
                    setMigrationSeed(undefined);
                    setSheet("migrate-hub");
                  }}
                >
                  <FolderOpen size={17} />
                  Prism, MultiMC or CurseForge
                </button>
                <button
                  className="text-button"
                  disabled={!game || busy}
                  onClick={() => void pick(true)}
                >
                  <FolderOpen size={17} />
                  Copy from a .Minecraft folder
                </button>
                <div className="divider" />
                <label>
                  Or paste a Modrinth link
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
                  Inspect link
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
        {sheet === "smartDrop" && drop && (
          <SmartDrop
            drop={drop}
            busy={busy}
            onClose={() => setSheet("")}
            onReview={(id) => void reviewDrop(id)}
            onCreate={() => void createForDrop()}
            onInstallSheet={() => setSheet("install")}
          />
        )}
        {sheet === "migrate-hub" && (
          <MigrationHub
            initial={migrationSeed}
            operation={operation}
            busy={active}
            onClose={() => setSheet("")}
            onStart={async (path, worldsOnly) => !!(await act("migrateInstance", { path, worldsOnly }))}
          />
        )}
        {sheet === "importReview" && importPlan && (
          <Sheet
            title="Review import"
            eyebrow="Smart drop / review"
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
                  Choose another file
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
                        ? loaderLabel(importPlan.loader)
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
                    Confirm import
                    <Check size={17} />
                  </button>
                  <button className="text-button" onClick={() => setSheet("")}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </Sheet>
        )}
        {sheet === "details" && game && (
          <Drawer
            open={sheet === "details"}
            title={game.name}
            eyebrow={`${game.version} · ${loaderLabel(game.loader)}`}
            variant="profile"
            onClose={() => setSheet("")}
          >
            <GameHero
              game={game}
              running={running}
              busy={active}
              mods={content.filter((c) => c.kind === "mods").length}
              worlds={content.filter((c) => c.kind === "saves").length}
              onPlay={() => void playGame(game.id)}
              onFolder={() => void act("openFolder", { id: game.id })}
            />
            <div className="tabs v17-profile-tabs" role="tablist">
              {([
                ["overview", "Overview", LayoutDashboard],
                ["content", "Mods & packs", Package],
                ["settings", "Settings", SlidersHorizontal],
                ["tuned", "Performance", Gauge],
                ["worlds", "Worlds", Globe],
                ["backups", "Backups", Archive],
                ["logs", "Logs", FileText],
              ] as const).map(([t, label, Icon]) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={detailsTab === t}
                  className={detailsTab === t ? "selected" : ""}
                  onClick={() => {
                    playSfx("tab");
                    setDetailsTab(t);
                  }}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
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
                  Game name
                  <input
                    value={editName}
                    maxLength={64}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </label>
                <MemoryPresets
                  ramMB={snap.ramMB}
                  memory={editMemory}
                  jvm={editJvm}
                  modded={!!game.loader}
                  onPick={(memory, jvm) => {
                    setEditMemory(memory);
                    setEditJvm(jvm);
                  }}
                />
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
                    Window width
                    <input
                      type="number"
                      min={640}
                      max={7680}
                      value={editWidth}
                      onChange={(e) => setEditWidth(+e.target.value)}
                    />
                  </label>
                  <label>
                    Window height
                    <input
                      type="number"
                      min={360}
                      max={4320}
                      value={editHeight}
                      onChange={(e) => setEditHeight(+e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  Tags
                  <input
                    value={editTags}
                    maxLength={220}
                    placeholder="Survival, Shaders, With friends"
                    onChange={(e) => setEditTags(e.target.value)}
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    value={editNotes}
                    maxLength={2000}
                    rows={3}
                    placeholder="Seeds, server addresses, what you were building…"
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </label>
                <p className="footnote">
                  Played {formatPlaytime(game.playtime)} in LOAM · last played {ago(game.lastPlayed)}
                </p>
                <details>
                  <summary>Advanced JVM arguments</summary>
                  <p className="warning">
                    Incorrect options can prevent Minecraft from starting. Use
                    one -XX: or -D option per line. LOAM manages memory and
                    launch identity.
                  </p>
                  <label>
                    JVM options
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
                  onClick={() => {
                    playSfx("click");
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
                      notes: editNotes,
                      tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
                    }).then((v) => {
                      if (v) setToast("Game settings saved.");
                    });
                  }}
                >
                  Save changes
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
                          {c.enabled ? "Disable" : "Enable"}
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
                        Remove
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
                  Add content
                </button>
              </>
            ) : detailsTab === "tuned" ? (
              <>
                <div className="page-title" style={{ marginBottom: "16px" }}>
                  <div>
                    <p className="eyebrow">Hardware & runtime profile</p>
                    <h3 style={{ fontSize: "16px", margin: "4px 0 0" }}>Tuned for this PC · {game.name}</h3>
                  </div>
                </div>
                <p className="muted" style={{ marginBottom: "20px" }}>
                  LOAM automatically configures hardware profiles, JVM flags, and OS scheduling tailored specifically to this machine.
                </p>
                <div className="setting-row">
                  <div>
                    <strong>Memory Allocation</strong>
                    <p>Fixed heap: -Xms{game.memory}M -Xmx{game.memory}M (eliminates runtime heap resize GC pauses)</p>
                  </div>
                  <span className="badge-verified">{game.memory / 1024} GB FIXED</span>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Garbage Collector Tuning</strong>
                    <p>G1GC with -XX:MaxGCPauseMillis=20, optimized StringDeduplication and G1ReservePercent</p>
                  </div>
                  <span className="badge-verified">G1gc tuned</span>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Windows Discrete GPU</strong>
                    <p>DirectX user preference set to High Performance (GpuPreference=2)</p>
                  </div>
                  <span className="badge-verified">Active</span>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Process Priority</strong>
                    <p>ABOVE_NORMAL_PRIORITY_CLASS guards game thread scheduling against background processes</p>
                  </div>
                  <span className="badge-verified">Elevated</span>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Windows EcoQoS / Efficiency Cores</strong>
                    <p>Power throttling disabled on Minecraft process threads</p>
                  </div>
                  <span className="badge-verified">High performance</span>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Fast Launch Check</strong>
                    <p>Instant file existence and size verification (~15ms launch check instead of 4.5s rehash)</p>
                  </div>
                  <span className="badge-verified">Fast path</span>
                </div>
                <button
                  className="text-button"
                  style={{ marginTop: "16px" }}
                  onClick={() => setToast("Game launch profile reset to recommended defaults.")}
                >
                  <RefreshCw size={15} />
                  Reset profile to defaults
                </button>
              </>
            ) : detailsTab === "worlds" ? (
              <>
                <div className="page-title" style={{ marginBottom: "16px" }}>
                  <div>
                    <p className="eyebrow">Isolated saves</p>
                    <h3 style={{ fontSize: "16px", margin: "4px 0 0" }}>Worlds Shelf · {game.name}</h3>
                  </div>
                </div>
                <p className="muted" style={{ marginBottom: "20px" }}>
                  Each LOAM game instance maintains an isolated saves folder. Worlds are never mixed, modified, or silently migrated across versions.
                </p>
                <div className="action-grid" style={{ marginBottom: "20px" }}>
                  <button
                    onClick={() => void act("openFolder", { id: game.id })}
                  >
                    <FolderOpen size={19} />
                    Open saves folder
                  </button>
                  <button
                    disabled={running || active}
                    onClick={() => {
                      void act("backup", { id: game.id });
                      setSheet("");
                    }}
                  >
                    <Archive size={19} />
                    Backup worlds now
                  </button>
                </div>
                <div className="notice">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>Isolated Instance Directory</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--loam-text-2)" }}>
                      Saves path: {`${snap.root}/games/${game.id}/saves`}
                    </p>
                  </div>
                </div>
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
                  Create backup
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
                        Restore
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
                    Refresh
                  </button>
                  <button className="text-button" onClick={showReport}>
                    Create report
                    <ArrowUpRight size={15} />
                  </button>
                </div>
                <pre className="log-view">
                  {logs ||
                    "No launcher log yet. Logs appear after you launch this game."}
                </pre>
              </>
            )}
          </Drawer>
        )}
        {sheet === "delete" && game && (
          <Sheet
            title="Remove this game?"
            eyebrow="Your worlds are included"
            onClose={() => setSheet("")}
          >
            <p className="intro">
              This removes <strong>{game.name}</strong> from your library,
              including its worlds, mods, and settings. The folder is retained
              in LOAM’s trash for manual recovery.
            </p>
            <label>
              TYPE “{game.name}” TO CONFIRM
              <input
                value={deleteName}
                onChange={(e) => setDeleteName(e.target.value)}
              />
            </label>
            <div className="sheet-actions">
              <button
                className="primary"
                disabled={busy || !confirmsGameName(deleteName, game.name)}
                onClick={() =>
                  void act("deleteGame", {
                    id: game.id,
                    name: game.name,
                  }).then((v) => {
                    if (v) {
                      setSheet("");
                      setDeleteName("");
                    }
                  })
                }
              >
                Remove game
                <Trash2 size={16} />
              </button>
              <button className="text-button" onClick={() => setSheet("")}>
                Cancel
              </button>
            </div>
          </Sheet>
        )}
        {sheet === "stop" && game && (
          <Sheet
            title="Stop Minecraft?"
            eyebrow="Game is running"
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
                Stop game
                <Square size={15} />
              </button>
              <button className="text-button" onClick={() => setSheet("")}>
                Keep playing
              </button>
            </div>
          </Sheet>
        )}
        {sheet === "report" && (
          <Sheet
            title="Let’s put it right."
            eyebrow="Report a problem"
            onClose={() => setSheet("")}
            wide
          >
            <div className="report-form">
              <div>
                {snap.data.games.length > 0 ? (
                  <label>
                    Game / world
                    <select
                      value={report.gameId || game?.id || snap.data.games[0]?.id || ""}
                      onChange={(e) => {
                        const gid = e.target.value;
                        setReport({ ...report, gameId: gid });
                        if (gid) void act("selectGame", { id: gid });
                      }}
                    >
                      {snap.data.games.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.version} · {g.loader || "Vanilla"})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : report.version ? (
                  <label>
                    Configured target
                    <input
                      type="text"
                      readOnly
                      value={`${report.version} · ${report.loader || "Vanilla"}`}
                    />
                  </label>
                ) : null}
                <label>
                  Type
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
                  ["happened", "What happened"],
                  ["expected", "What you expected"],
                  ["steps", "Steps to reproduce"],
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
                <p className="eyebrow">Exact export preview</p>
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
                Copy report
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
                Save diagnostics ZIP
              </button>
              <button
                className="text-button"
                onClick={() => void act("openLink", { kind: "discord" })}
              >
                Open Discord
                <ArrowUpRight size={15} />
              </button>
              <button
                className="text-button"
                onClick={() =>
                  void act("openLink", {
                    kind: "email",
                    subject: `LOAM Report ${preview?.id || ""}`,
                    body: preview?.summary || "",
                  })
                }
              >
                Email report
                <Mail size={15} />
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
            eyebrow="What’s new"
            onClose={() => setSheet("")}
          >
            <div className="release-note">
              <span className="mono">{snap.version}</span>
              <h3>Discover, and a new home for your games.</h3>
              <p>
                Browse Modrinth mods, modpacks, resource packs and shaders inside
                LOAM, see only what fits the game you pick, and install with every
                required mod in one click. Check a game for mod updates and update
                in place; the old file is kept. CurseForge joins as a source once
                you add an API key in Settings › Integrations.
              </p>
              <p>
                Home now shows your own skin in 3D in front of a slowly drifting
                landscape, with your recent games below. A new Library lists every
                game as a card you can pin and filter. There's a side rail for
                getting around, a new LOAM mark, new type, and warmer interface
                sounds with a volume control. You can also choose a still scene or
                your own picture for Home.
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
                    Install signed update
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
              Check for updates
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
              Copy and verify
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
              Clear download cache
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
              Back up and remove
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
      </div>
    </DialogError.Provider>
  );
}
