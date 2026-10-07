// Discover (1.7): browse Modrinth and CurseForge, see what fits the chosen game, and install
// with required dependencies in one click. Modpacks become a new game through Smart Drop.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, Check, ChevronDown, Compass, Download, ExternalLink, Heart, Layers, Loader2, Lock, Package,
  Palette, RefreshCw, Search, Sparkles, SunMedium, X, AlertTriangle, Plus, Gauge, SlidersHorizontal,
} from "lucide-react";
import { call, native, type Game, type Snapshot } from "../api";
import { LoaderGlyph, loaderKind, loaderName } from "./art";
import { CurseForgeLogo, ModrinthLogo, ProviderLogo } from "./brands";

type Kind = "mod" | "modpack" | "resourcepack" | "shader";
type Provider = "modrinth" | "curseforge";
type Source = Provider | "both";
type Category = { id: string; label: string; group: string };
type Group = { hits: Hit[]; total: number; loading: boolean; error: string };
const emptyGroup: Group = { hits: [], total: 0, loading: false, error: "" };
const GROUP_NAME: Record<string, string> = { categories: "Categories", features: "Features", resolutions: "Resolution", "performance impact": "Performance impact" };

// Filters are remembered between visits (not the search text). Categories belong to one source
// and content type, so they reset when either changes.
type Saved = { source: Source; kind: Kind; sort: string; compatible: boolean; hideInstalled: boolean };
const SAVED = "loam_discover";
function loadSaved(): Saved {
  const d: Saved = { source: "modrinth", kind: "mod", sort: "relevance", compatible: true, hideInstalled: false };
  try {
    const v = JSON.parse(localStorage.getItem(SAVED) || "{}");
    return {
      source: ["modrinth", "curseforge", "both"].includes(v.source) ? v.source : d.source,
      kind: ["mod", "modpack", "resourcepack", "shader"].includes(v.kind) ? v.kind : d.kind,
      sort: ["relevance", "downloads", "follows", "updated", "newest"].includes(v.sort) ? v.sort : d.sort,
      compatible: v.compatible !== false,
      hideInstalled: v.hideInstalled === true,
    };
  } catch { return d; }
}
export type Hit = {
  provider: Provider; id: string; slug: string; kind: string; title: string; author?: string; description?: string;
  icon?: string | null; image?: string | null; downloads?: number; follows?: number; categories?: string[]; updated?: string; url?: string;
};
type Project = Hit & { body: string; gallery: { url: string; title?: string }[]; license?: string | null; links: Record<string, string | null> };
type Version = { id: string; name: string; number: string; type: string; date: string; downloads?: number; blocked?: boolean };
type Update = { path: string; kind: string; title?: string; icon?: string; current?: string; latest: string; versionId: string; name?: string };

const kinds: { id: Kind; label: string; icon: typeof Package }[] = [
  { id: "mod", label: "Mods", icon: Package },
  { id: "modpack", label: "Modpacks", icon: Layers },
  { id: "resourcepack", label: "Resource & texture packs", icon: Palette },
  { id: "shader", label: "Shaders", icon: SunMedium },
];
const sorts = [
  ["relevance", "Relevance"], ["downloads", "Most downloaded"], ["follows", "Most followed"], ["updated", "Recently updated"], ["newest", "Newest"],
] as const;

export const compact = (n?: number) =>
  n === undefined ? "" : n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : String(n);
const ago = (iso?: string) => {
  if (!iso) return "";
  const d = (Date.now() - Date.parse(iso)) / 86400000;
  return d < 1 ? "today" : d < 2 ? "yesterday" : d < 30 ? `${Math.floor(d)}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`;
};
const key = (h: { provider: string; id: string }) => `${h.provider}:${h.id}`;

/** Well-known Fabric performance mods that change no gameplay. Each is installed only if it has a build for the game. */
const PERFORMANCE_PACK = [
  ["sodium", "Sodium"], ["lithium", "Lithium"], ["ferrite-core", "FerriteCore"],
  ["immediatelyfast", "ImmediatelyFast"], ["entityculling", "Entity Culling"], ["modernfix", "ModernFix"],
] as const;

/** Browser preview only: read Modrinth's public API so the page can be reviewed with real data. */
async function previewSearch(q: string, kind: Kind, game: Game | undefined, sort: string, offset: number, cats: string[]) {
  const facets: string[][] = [[`project_type:${kind}`], ...cats.map((c) => [`categories:${c}`])];
  if (game && kind !== "modpack") {
    facets.push([`versions:${game.version}`]);
    if (kind === "mod" && game.loader) facets.push(loaderKind(game.loader) === "quilt" ? ["categories:quilt", "categories:fabric"] : ["categories:fabric"]);
  }
  if (kind === "modpack") facets.push(["categories:fabric", "categories:quilt"]);
  const u = new URL("https://api.modrinth.com/v2/search");
  u.searchParams.set("query", q); u.searchParams.set("facets", JSON.stringify(facets));
  u.searchParams.set("index", sort); u.searchParams.set("offset", String(offset)); u.searchParams.set("limit", "24");
  const r = await (await fetch(u)).json();
  return {
    total: r.total_hits as number,
    hits: (r.hits as Record<string, unknown>[]).map((h) => ({
      provider: "modrinth", id: h.project_id, slug: h.slug, kind: h.project_type, title: h.title, author: h.author,
      description: h.description, icon: h.icon_url || null, image: h.featured_gallery || (h.gallery as string[])?.[0] || null,
      downloads: h.downloads, follows: h.follows, categories: h.display_categories, updated: h.date_modified,
      url: `https://modrinth.com/${h.project_type}/${h.slug}`,
    })) as Hit[],
  };
}

/** A small, safe Markdown subset: headings, paragraphs, lists, emphasis, code and Modrinth CDN images. */
function Body({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const clean = text.replace(/<img[^>]*src="([^"]+)"[^>]*>/gi, "\n![]($1)\n").replace(/<br\s*\/?>/gi, "\n").replace(/<\/?[a-z][^>]*>/gi, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
    return clean.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).slice(0, 80);
  }, [text]);
  const inline = (s: string) => s
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
    .map((part, i) => part.startsWith("**") ? <strong key={i}>{part.slice(2, -2).replace(/(^|\s)[*_]([^*_]+)[*_]/g, "$1$2")}</strong>
      : part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code>
      : part.startsWith("[") ? <span key={i} className="v17-md-link">{part.slice(1, part.indexOf("]"))}</span>
      : part.replace(/(^|\s)[*_]([^*_]+)[*_]/g, "$1$2"));
  return (
    <div className="v17-md">
      {blocks.map((b, i) => {
        const img = b.match(/^!\[[^\]]*\]\((https:\/\/cdn\.modrinth\.com\/[^)\s]+)\)$/);
        if (img) return <img key={i} src={img[1]} alt="" loading="lazy" />;
        if (/^!\[/.test(b)) return null;
        const h = b.match(/^(#{1,4})\s+(.*)$/);
        if (h) return h[1].length <= 2 ? <h3 key={i}>{inline(h[2])}</h3> : <h4 key={i}>{inline(h[2])}</h4>;
        if (/^([-*]|\d+\.)\s/.test(b))
          return <ul key={i}>{b.split("\n").filter((l) => /^\s*([-*]|\d+\.)\s/.test(l)).map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>)}</ul>;
        if (/^---+$/.test(b)) return <hr key={i} />;
        return <p key={i}>{inline(b.replace(/\n/g, " "))}</p>;
      })}
    </div>
  );
}

export default function Discover({ snap, defaultGameId, onToast, onError, onModpack, onCreate, onOpenLink, onSettings, refreshKey }: {
  snap: Snapshot;
  defaultGameId?: string;
  onToast: (m: string) => void;
  onError: (e: unknown) => void;
  onModpack: (path: string) => void;
  onCreate: (loader?: "vanilla" | "fabric" | "quilt", version?: string) => void;
  onOpenLink: (url: string) => void;
  onSettings: () => void;
  refreshKey: number;
}) {
  const games = snap.data.games;
  const saved = useMemo(loadSaved, []);
  const [provider, setProviderState] = useState<Source>(saved.source);
  const [providers, setProviders] = useState({ modrinth: true, curseforge: false });
  const [kind, setKindState] = useState<Kind>(saved.kind);
  const [cats, setCats] = useState<string[]>([]);
  const [catList, setCatList] = useState<Category[] | null>(null);
  const [catMenu, setCatMenu] = useState(false);
  const [compatible, setCompatible] = useState(saved.compatible);
  const [hideInstalled, setHideInstalled] = useState(saved.hideInstalled);
  const setProvider = (p: Source) => { setProviderState(p); setCats([]); };
  const setKind = (k: Kind) => { setKindState(k); setCats([]); };
  const [gameId, setGameId] = useState(defaultGameId || games[0]?.id || "");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState(saved.sort);
  const [groups, setGroups] = useState<Record<Provider, Group>>({ modrinth: emptyGroup, curseforge: emptyGroup });
  // With both sources, each group starts with its top few so neither buries the other.
  const [expanded, setExpanded] = useState<Record<Provider, boolean>>({ modrinth: false, curseforge: false });
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<Record<string, "busy" | "done">>({});
  const [open, setOpen] = useState<Hit | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [shot, setShot] = useState(0);
  const [updates, setUpdates] = useState<Update[] | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number; current: string } | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(false);
  const [gameMenu, setGameMenu] = useState(false);
  const [perf, setPerf] = useState<string | null>(null);
  const request = useRef(0);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!gameMenu) return;
    const away = (e: PointerEvent) => { if (!menu.current?.contains(e.target as Node)) setGameMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setGameMenu(false); };
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", away, true); window.removeEventListener("keydown", esc); };
  }, [gameMenu]);
  const game = games.find((g) => g.id === gameId);
  const needsLoader = (kind === "mod" || kind === "shader") && game && loaderKind(game.loader) === "vanilla";

  useEffect(() => { if (!games.some((g) => g.id === gameId)) setGameId(defaultGameId || games[0]?.id || ""); }, [games.length, defaultGameId]);
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 280); return () => clearTimeout(t); }, [query]);
  useEffect(() => {
    if (!native) return;
    void call<{ modrinth: boolean; curseforge: boolean }>("discoverProviders").then(setProviders).catch(() => {});
  }, [refreshKey]);
  const loadInstalled = useCallback(() => {
    if (!native || !gameId) return setInstalled(new Set());
    void call<{ provider: string; project: string }[]>("discoverInstalled", { gameId })
      .then((items) => setInstalled(new Set(items.map((i) => `${i.provider}:${i.project}`))))
      .catch(() => setInstalled(new Set()));
  }, [gameId]);
  useEffect(() => { loadInstalled(); setUpdates(null); }, [loadInstalled, refreshKey]);

  // Which sources to query. CurseForge needs a key; without one, "Both" means Modrinth only.
  const sources: Provider[] = provider === "both" ? (providers.curseforge || !native ? ["modrinth", "curseforge"] : ["modrinth"]) : [provider];
  const both = sources.length > 1;
  useEffect(() => {
    try { localStorage.setItem(SAVED, JSON.stringify({ source: provider, kind, sort, compatible, hideInstalled })); } catch { /* storage unavailable */ }
  }, [provider, kind, sort, compatible, hideInstalled]);
  // Category lists for the chosen source and type. With both sources, categories aren't offered:
  // each service has its own list.
  useEffect(() => {
    setCatList(null);
    if (both) return;
    let live = true;
    const src = sources[0];
    const load = native
      ? call<Category[]>("discoverCategories", { provider: src, kind })
      : src === "modrinth"
        ? fetch("https://api.modrinth.com/v2/tag/category").then((r) => r.json()).then((t: { name: string; project_type: string; header: string }[]) =>
          t.filter((c) => c.project_type === kind).map((c) => ({ id: c.name, label: c.name.replace(/[-_]+/g, " ").replace(/\b\w/g, (x) => x.toUpperCase()), group: c.header })))
        : Promise.resolve([] as Category[]);
    void load.then((l) => live && setCatList(l)).catch(() => live && setCatList([]));
    return () => { live = false; };
  }, [provider, kind, both]); // eslint-disable-line react-hooks/exhaustive-deps
  const requests = useRef<Record<Provider, number>>({ modrinth: 0, curseforge: 0 });
  const searchOne = useCallback(async (src: Provider, offset: number) => {
    const id = ++requests.current[src];
    setGroups((g) => ({ ...g, [src]: { ...(offset ? g[src] : emptyGroup), loading: true, error: "" } }));
    if (!offset) setExpanded((x) => ({ ...x, [src]: false }));
    try {
      const target = kind === "modpack" ? undefined : game;
      const useCats = both ? [] : cats;
      const r = native
        ? await call<{ hits: Hit[]; total: number }>("discoverSearch", { provider: src, kind, query: debounced, sort, offset, gameId: target?.id ?? "", categories: useCats, compatible })
        : src === "modrinth"
          ? await previewSearch(debounced, kind, compatible ? target : undefined, sort, offset, useCats)
          : (() => { throw new Error("CurseForge results appear in the LOAM desktop app once it's connected in Settings › Integrations."); })();
      if (id !== requests.current[src]) return;
      setGroups((g) => ({ ...g, [src]: { hits: offset ? [...g[src].hits, ...r.hits] : r.hits, total: r.total || 0, loading: false, error: "" } }));
    } catch (e) {
      if (id !== requests.current[src]) return;
      setGroups((g) => ({ ...g, [src]: { ...(offset ? g[src] : emptyGroup), loading: false, error: e instanceof Error ? e.message : String(e) } }));
    }
  }, [kind, debounced, sort, game?.id, game?.version, game?.loader, cats.join(","), compatible, both]); // eslint-disable-line react-hooks/exhaustive-deps
  const search = useCallback((offset: number) => { for (const s of sources) void searchOne(s, offset); }, [searchOne, sources.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!needsLoader) search(0);
    else setGroups({ modrinth: emptyGroup, curseforge: emptyGroup });
  }, [search, needsLoader]);
  const one = groups[sources[0]];
  const hits = both ? [...groups.modrinth.hits, ...groups.curseforge.hits] : one.hits;
  const total = sources.reduce((n, s) => n + groups[s].total, 0);
  const loading = sources.some((s) => groups[s].loading);
  const error = both ? (sources.every((s) => groups[s].error) ? groups.modrinth.error : "") : one.error;
  const visible = (list: Hit[]) => (hideInstalled ? list.filter((h) => !installed.has(key(h))) : list);
  const catLabel = (id: string) => catList?.find((c) => c.id === id)?.label || id;
  const toggleCat = (id: string) => setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : sources[0] === "curseforge" ? [id] : [...c, id].slice(0, 8)));
  const filtersOn = cats.length > 0 || !compatible || hideInstalled;
  const clearFilters = () => { setCats([]); setCompatible(true); setHideInstalled(false); };
  const catBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!catMenu) return;
    const away = (e: PointerEvent) => { if (!catBox.current?.contains(e.target as Node)) setCatMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setCatMenu(false); };
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", away, true); window.removeEventListener("keydown", esc); };
  }, [catMenu]);

  useEffect(() => {
    if (!open) return;
    setProject(null); setVersions([]); setShot(0);
    let live = true;
    if (native) {
      void call<Project>("discoverProject", { provider: open.provider, id: open.id, kind: open.kind }).then((p) => live && setProject(p)).catch(onError);
      if (kind === "modpack" || game)
        void call<Version[]>("discoverVersions", { provider: open.provider, id: open.id, kind: open.kind, gameId: kind === "modpack" ? "" : gameId })
          .then((v) => live && setVersions(v)).catch(() => {});
    } else {
      void fetch(`https://api.modrinth.com/v2/project/${open.id}`).then((r) => r.json()).then((p) => live && setProject({
        ...open, body: p.body || "", gallery: (p.gallery || []).map((g: { url: string; title?: string }) => ({ url: g.url, title: g.title })),
        license: p.license?.id, links: { source: p.source_url, issues: p.issues_url, wiki: p.wiki_url, discord: p.discord_url },
      })).catch(() => {});
    }
    return () => { live = false; };
  }, [open?.id]);

  async function install(h: Hit, versionId?: string) {
    const k = key(h);
    if (!native) return onError("Install from Discover in the LOAM desktop app.");
    setWorking((w) => ({ ...w, [k]: "busy" }));
    try {
      if (kind === "modpack") {
        const r = await call<{ path: string }>("discoverModpack", { provider: h.provider, id: h.id, versionId });
        setWorking((w) => ({ ...w, [k]: "done" }));
        onModpack(r.path);
        return;
      }
      const r = await call<{ message: string; notes: string[] }>("discoverInstall", { provider: h.provider, kind, id: h.id, gameId, versionId });
      setWorking((w) => ({ ...w, [k]: "done" }));
      onToast([r.message, ...r.notes].join(" "));
      loadInstalled();
    } catch (e) {
      setWorking((w) => { const n = { ...w }; delete n[k]; return n; });
      onError(e);
    }
  }

  /** Install the performance pack one mod at a time; skip what's already there or has no build. */
  async function performancePack() {
    if (!native || !game) return onError("Install mods in the LOAM desktop app.");
    const added: string[] = [], skipped: string[] = [];
    for (const [slug, name] of PERFORMANCE_PACK) {
      setPerf(name);
      try {
        await call("discoverInstall", { provider: "modrinth", kind: "mod", id: slug, gameId });
        added.push(name);
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        skipped.push(m.includes("already") ? `${name} (already installed)` : `${name} (no build for ${game.version})`);
      }
    }
    setPerf(null);
    loadInstalled();
    onToast(added.length
      ? `Added ${added.join(", ")} to ${game.name}.${skipped.length ? ` Skipped: ${skipped.join(", ")}.` : ""}`
      : `Nothing new to add. ${skipped.join(", ")}.`);
  }

  async function checkUpdates() {
    if (!native) return onError("Check for updates in the LOAM desktop app.");
    setChecking(true);
    try { setUpdates(await call<Update[]>("discoverUpdates", { gameId })); } catch (e) { onError(e); } finally { setChecking(false); }
  }
  async function applyUpdate(u: Update, quiet = false): Promise<boolean> {
    setUpdating((w) => ({ ...w, [u.path]: true }));
    try {
      const r = await call<{ message: string }>("discoverUpdate", { gameId, path: u.path, versionId: u.versionId, title: u.title, icon: u.icon });
      if (!quiet) onToast(`${u.title || u.path}: ${r.message}`);
      setUpdates((list) => list?.filter((x) => x.path !== u.path) ?? null);
      return true;
    } catch (e) {
      if (!quiet) onError(e);
      return false;
    } finally {
      setUpdating((w) => { const n = { ...w }; delete n[u.path]; return n; });
      if (!quiet) loadInstalled();
    }
  }
  /** Updates everything at once, one by one; the old versions are deleted as each new one lands. */
  async function updateAll() {
    if (!updates?.length || bulk) return;
    const list = [...updates];
    const failed: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const u = list[i];
      setBulk({ done: i, total: list.length, current: u.title || u.path.split("/").pop() || "" });
      if (!(await applyUpdate(u, true))) failed.push(u.title || u.path.split("/").pop() || u.path);
    }
    setBulk(null);
    loadInstalled();
    const ok = list.length - failed.length;
    if (failed.length) onError(`Updated ${ok} of ${list.length}. Couldn't update: ${failed.join(", ")}.`);
    else onToast(`Updated all ${ok} in ${game?.name ?? "this game"}. Old versions were removed.`);
  }

  const state = (h: Hit) => working[key(h)] || (installed.has(key(h)) ? "done" : undefined);
  const installButton = (h: Hit, big = false) => {
    const s = state(h);
    const pack = kind === "modpack";
    return (
      <button type="button" className={`v17-btn ${big ? "v17-btn-primary v17-btn-lg" : "v17-btn-sm v17-btn-install"} ${s === "done" ? "is-done" : ""}`}
        disabled={!!s || (!pack && (!game || needsLoader))}
        onClick={(e) => { e.stopPropagation(); void install(h); }}>
        {s === "busy" ? <><Loader2 size={15} className="v17-spin" /> {pack ? "Preparing" : "Installing"}</>
          : s === "done" ? <><Check size={15} /> {pack ? "Opened" : "Installed"}</>
          : <><Download size={15} /> {pack ? "Create game" : "Install"}</>}
      </button>
    );
  };

  const hitRow = (h: Hit, i: number) => (
    // The row opens details on click; for keyboards the title is the details button, so the
    // Install button isn't nested inside another control.
    <article key={key(h)} className="v17-hit v17-rise" style={{ animationDelay: `${Math.min(i % 24, 12) * 25}ms` }}
      onClick={() => setOpen(h)}>
      {h.icon ? <img className="v17-hit-icon" src={h.icon} alt="" loading="lazy" /> : <span className="v17-hit-icon v17-hit-icon-fallback"><Package size={22} /></span>}
      <div className="v17-hit-text">
        <button type="button" className="v19-hit-title" onClick={(e) => { e.stopPropagation(); setOpen(h); }} aria-label={`${h.title}, details`}>{h.title}</button>
        {h.author && <small className="v18-hit-by"><ProviderLogo provider={h.provider} size={12} /> {h.author}</small>}
        <p>{h.description}</p>
        <div className="v17-hit-meta">
          <span><Download size={12} /> {compact(h.downloads)}</span>
          <span><Heart size={12} /> {compact(h.follows)}</span>
          {h.updated && <span>{ago(h.updated)}</span>}
          {(h.categories || []).filter((c) => !["fabric", "quilt", "forge", "neoforge", "minecraft"].includes(c)).slice(0, 2).map((c) => <span key={c} className="v17-tag">{c}</span>)}
        </div>
      </div>
      {installButton(h)}
    </article>
  );

  return (
    <main className="v17-page v17-discover">
      <header className="v17-page-head v17-rise">
        <div>
          <p className="v17-eyebrow"><Compass size={13} /> Mods, packs and shaders, checked before they reach your game</p>
          <h1 className="v17-display">Discover<span className="v17-dot">.</span></h1>
        </div>
        <div className="v17-head-actions">
          <div className="v17-segment" role="tablist" aria-label="Source">
            <button type="button" role="tab" aria-selected={provider === "modrinth"} className={provider === "modrinth" ? "active" : ""} onClick={() => setProvider("modrinth")}><ModrinthLogo size={15} /> Modrinth</button>
            <button type="button" role="tab" aria-selected={provider === "curseforge"} className={provider === "curseforge" ? "active" : ""}
              onClick={() => (providers.curseforge || !native ? setProvider("curseforge") : onSettings())}
              title={providers.curseforge ? "CurseForge" : "Connect CurseForge in Settings › Integrations"}>
              {providers.curseforge || !native ? <CurseForgeLogo size={15} /> : <Lock size={12} />} CurseForge
            </button>
            <button type="button" role="tab" aria-selected={provider === "both"} className={provider === "both" ? "active" : ""} onClick={() => setProvider("both")}
              title={providers.curseforge || !native ? "Modrinth and CurseForge, side by side" : "Modrinth only until CurseForge is connected in Settings › Integrations"}>
              Both
            </button>
          </div>
          {kind !== "modpack" && (
            <div className="v17-menu" ref={menu}>
              <button type="button" className="v17-target" onClick={() => setGameMenu((m) => !m)} aria-expanded={gameMenu} disabled={!games.length}>
                <span className="v17-target-label">Install into</span>
                <strong>{game ? <><LoaderGlyph loader={game.loader} size={14} /> {game.name}</> : "No games yet"}</strong>
                <ChevronDown size={15} />
              </button>
              {gameMenu && (
                <div className="v17-menu-pop" role="listbox">
                  {games.map((g) => (
                    <button key={g.id} type="button" role="option" aria-selected={g.id === gameId} className={g.id === gameId ? "active" : ""}
                      onClick={() => { setGameId(g.id); setGameMenu(false); }}>
                      <LoaderGlyph loader={g.loader} size={15} />
                      <span><strong>{g.name}</strong><small>{loaderName(g.loader)} {g.version}</small></span>
                      {g.id === gameId && <Check size={15} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="v17-toolbar v17-rise" style={{ animationDelay: "40ms" }}>
        <div className="v17-tabs v17-tabs-icons" role="tablist" aria-label="Content type">
          {kinds.map((k) => {
            const Icon = k.icon;
            return (
              <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} className={kind === k.id ? "active" : ""}
                onClick={() => setKind(k.id)}>
                <Icon size={15} /> {k.label}
              </button>
            );
          })}
        </div>
        <label className="v17-search v17-grow">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${kinds.find((k) => k.id === kind)!.label.toLowerCase()}${provider === "curseforge" ? " on CurseForge" : provider === "both" ? " on both" : " on Modrinth"}`} aria-label="Search" />
          {query && <button type="button" className="v17-clear" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}
        </label>
        <label className="v17-select">
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      <div className="v19-filters" role="group" aria-label="Filters">
        <div className="v17-menu" ref={catBox}>
          <button type="button" className={`v19-filter-btn ${cats.length ? "on" : ""}`} aria-expanded={catMenu} aria-haspopup="true"
            disabled={both} onClick={() => setCatMenu((v) => !v)}
            title={both ? "Modrinth and CurseForge have different categories. Choose one source to filter by category." : undefined}>
            <SlidersHorizontal size={15} /> Categories{cats.length ? ` · ${cats.length}` : ""} <ChevronDown size={14} />
          </button>
          {catMenu && (
            <div className="v17-menu-pop v19-cat-pop" role="group" aria-label="Categories">
              {catList === null ? <p className="muted v19-small" style={{ padding: 12 }}><Loader2 size={14} className="v17-spin" /> Loading categories…</p>
                : !catList.length ? <p className="muted v19-small" style={{ padding: 12 }}>No categories for this type.</p>
                : Object.entries(catList.reduce<Record<string, Category[]>>((acc, c) => { (acc[c.group] ||= []).push(c); return acc; }, {})).map(([g, list]) => (
                  <fieldset key={g} className="v19-cat-group">
                    <legend>{GROUP_NAME[g] || g}</legend>
                    {list.map((c) => (
                      <label key={c.id} className="v19-check v19-cat">
                        <input type={sources[0] === "curseforge" ? "radio" : "checkbox"} name="discover-cat" checked={cats.includes(c.id)} onChange={() => toggleCat(c.id)} />
                        <span>{c.label}</span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              {sources[0] === "curseforge" && !!catList?.length && <p className="muted v19-small v19-cat-note">CurseForge filters by one category at a time.</p>}
            </div>
          )}
        </div>
        {kind !== "modpack" && game && !needsLoader && (
          <label className={`v19-filter-btn v19-filter-toggle ${compatible ? "on" : ""}`} title={`Only show what has a build for ${loaderName(game.loader)} ${game.version}. Installing always checks.`}>
            <input type="checkbox" checked={compatible} onChange={(e) => setCompatible(e.target.checked)} /> Fits {game.name}
          </label>
        )}
        {kind !== "modpack" && game && (
          <label className={`v19-filter-btn v19-filter-toggle ${hideInstalled ? "on" : ""}`} title={`Hide what's already in ${game.name}`}>
            <input type="checkbox" checked={hideInstalled} onChange={(e) => setHideInstalled(e.target.checked)} /> Hide installed
          </label>
        )}
        {(cats.length > 0 || !compatible || hideInstalled) && (
          <div className="v19-chips" aria-label="Active filters">
            {cats.map((c) => (
              <button key={c} type="button" className="v19-chip" onClick={() => toggleCat(c)} aria-label={`Remove ${catLabel(c)}`}>{catLabel(c)} <X size={12} /></button>
            ))}
            {!compatible && <button type="button" className="v19-chip" onClick={() => setCompatible(true)} aria-label="Show only what fits again">Everything, not just what fits <X size={12} /></button>}
            {hideInstalled && <button type="button" className="v19-chip" onClick={() => setHideInstalled(false)} aria-label="Show installed again">Installed hidden <X size={12} /></button>}
            {filtersOn && <button type="button" className="v17-text-btn v19-chip-clear" onClick={clearFilters}>Clear all</button>}
          </div>
        )}
      </div>
      {both && !providers.curseforge && native && (
        <p className="muted v19-small v19-filter-note">Showing Modrinth only. <button type="button" className="v17-text-btn" onClick={onSettings}>Connect CurseForge</button> to see both.</p>
      )}

      {kind !== "modpack" && game && !needsLoader && (
        <div className="v17-strip v17-rise" style={{ animationDelay: "80ms" }}>
          <span>{compatible ? <>Showing what fits <strong>{loaderName(game.loader)} {game.version}</strong></> : <>Showing everything; installing into <strong>{game.name}</strong> still checks it fits</>}{total ? ` · ${compact(total)} results` : ""}</span>
          {kind === "mod" && (
            <button type="button" className="v17-text-btn v17-perf" onClick={() => void performancePack()} disabled={!!perf}
              title={`Adds ${PERFORMANCE_PACK.map(([, n]) => n).join(", ")}. They speed up rendering, memory and loading without changing gameplay.`}>
              {perf ? <><Loader2 size={14} className="v17-spin" /> Adding {perf}…</> : <><Gauge size={14} /> Add the performance pack</>}
            </button>
          )}
          {updates === null ? (
            <button type="button" className="v17-text-btn" onClick={() => void checkUpdates()} disabled={checking}>
              {checking ? <Loader2 size={14} className="v17-spin" /> : <RefreshCw size={14} />} Check {game.name} for updates
            </button>
          ) : (
            <span className="v17-muted">{updates.length ? `${updates.length} update${updates.length === 1 ? "" : "s"} available` : "Everything is up to date"}</span>
          )}
        </div>
      )}
      {kind === "modpack" && (
        <div className="v17-strip v17-rise"><span>A modpack becomes its own new game. LOAM shows you what's inside before anything is created.</span></div>
      )}

      {!!updates?.length && (
        <section className="v17-updates v18-updates v17-rise">
          <header className="v18-updates-head">
            <div>
              <strong>{updates.length} update{updates.length === 1 ? "" : "s"} for {game?.name}</strong>
              <small>{bulk ? `Updating ${bulk.current} · ${bulk.done + 1} of ${bulk.total}` : "Old versions are deleted once the new ones are in place."}</small>
            </div>
            <button type="button" className="v17-btn v17-btn-primary" disabled={!!bulk} onClick={() => void updateAll()}>
              {bulk ? <><Loader2 size={15} className="v17-spin" /> Updating…</> : <><RefreshCw size={15} /> Update all</>}
            </button>
          </header>
          {bulk && <div className="v18-updates-bar"><i style={{ width: `${Math.round((bulk.done / bulk.total) * 100)}%` }} /></div>}
          {updates.map((u) => (
            <div key={u.path} className="v17-update">
              {u.icon ? <img src={u.icon} alt="" /> : <span className="v17-hit-icon-fallback"><Package size={18} /></span>}
              <span><strong>{u.title || u.path.split("/").pop()}</strong><small className="mono">{u.current || "?"} → {u.latest}</small></span>
              <button type="button" className="v17-btn v17-btn-sm v17-btn-go" disabled={!!bulk || !!updating[u.path]} onClick={() => void applyUpdate(u)}>
                {updating[u.path] ? <Loader2 size={13} className="v17-spin" /> : <RefreshCw size={13} />} Update
              </button>
            </div>
          ))}
        </section>
      )}

      {!games.length && kind !== "modpack" ? (
        <div className="v17-empty v17-rise">
          <Sparkles size={26} />
          <strong>Create a game to install into.</strong>
          <p>Mods need a Fabric or Quilt game. Resource packs work in any game.</p>
          <div className="v17-head-actions"><button type="button" className="v17-btn v17-btn-primary" onClick={() => onCreate("fabric")}><Plus size={17} /> New Fabric game</button></div>
        </div>
      ) : needsLoader ? (
        <div className="v17-empty v17-rise">
          <AlertTriangle size={26} />
          <strong>{kind === "mod" ? "Mods" : "Shaders"} need a Fabric or Quilt game.</strong>
          <p>{game!.name} is Vanilla. Pick another game above, or create a Fabric game for Minecraft {game!.version}.</p>
          <div className="v17-head-actions">
            <button type="button" className="v17-btn v17-btn-primary" onClick={() => onCreate("fabric", game!.version)}><Plus size={17} /> Fabric {game!.version}</button>
            <button type="button" className="v17-btn v17-btn-ghost" onClick={() => setKind("resourcepack")}>Browse resource packs</button>
          </div>
        </div>
      ) : error && !hits.length ? (
        <div className="v17-empty v17-rise">
          <AlertTriangle size={26} />
          <strong>{provider === "curseforge" && error.includes("Settings") ? "Connect CurseForge first." : "Couldn't load results."}</strong>
          <p>{error}</p>
          <div className="v17-head-actions">
            {error.includes("Settings") ? <button type="button" className="v17-btn v17-btn-primary" onClick={onSettings}>Open Integrations</button>
              : <button type="button" className="v17-btn v17-btn-ghost" onClick={() => void search(0)}><RefreshCw size={15} /> Try again</button>}
          </div>
        </div>
      ) : (
        <>
          {both ? sources.map((src) => {
            const g = groups[src], list = visible(g.hits);
            return (
              <section key={src} className="v19-hit-group" aria-label={src === "modrinth" ? "Modrinth results" : "CurseForge results"}>
                <h2 className="v19-hit-group-head"><ProviderLogo provider={src} size={16} /> {src === "modrinth" ? "Modrinth" : "CurseForge"}<small>{g.total ? `${compact(g.total)} results` : g.loading ? "Searching…" : ""}</small></h2>
                {g.error ? <p className="muted v19-small">{g.error}</p> : (
                  <div className="v17-hits">
                    {(expanded[src] ? list : list.slice(0, 6)).map((h, i) => hitRow(h, i))}
                    {g.loading && !g.hits.length && Array.from({ length: 4 }, (_, i) => <div key={i} className="v17-hit v17-skeleton" />)}
                  </div>
                )}
                {!g.error && !g.loading && !g.hits.length && <p className="muted v19-small">Nothing found here.</p>}
                {!expanded[src] && list.length > 6 ? (
                  <div className="v17-more">
                    <button type="button" className="v17-btn v17-btn-ghost" onClick={() => setExpanded((x) => ({ ...x, [src]: true }))}>
                      <ChevronDown size={15} /> More from {src === "modrinth" ? "Modrinth" : "CurseForge"}
                    </button>
                  </div>
                ) : g.hits.length < g.total && (
                  <div className="v17-more">
                    <button type="button" className="v17-btn v17-btn-ghost" disabled={g.loading} onClick={() => void searchOne(src, g.hits.length)}>
                      {g.loading ? <Loader2 size={15} className="v17-spin" /> : <ChevronDown size={15} />} More from {src === "modrinth" ? "Modrinth" : "CurseForge"}
                    </button>
                  </div>
                )}
              </section>
            );
          }) : (<>
          <div className="v17-hits">
            {visible(hits).map((h, i) => hitRow(h, i))}
            {loading && !hits.length && Array.from({ length: 8 }, (_, i) => <div key={i} className="v17-hit v17-skeleton" />)}
          </div>
          {!loading && !hits.length && !error && (
            <div className="v17-empty"><strong>Nothing found.</strong><p>{filtersOn ? "Try removing a filter." : "Try fewer words, or another type."}</p>{filtersOn && <div className="v17-head-actions"><button type="button" className="v17-btn v17-btn-ghost" onClick={clearFilters}>Clear filters</button></div>}</div>
          )}
          {hideInstalled && hits.length > 0 && !visible(hits).length && <p className="muted v19-small">Everything on this page is installed already. Show more to keep looking.</p>}
          {hits.length < total && (
            <div className="v17-more">
              <button type="button" className="v17-btn v17-btn-ghost" disabled={loading} onClick={() => search(hits.length)}>
                {loading ? <Loader2 size={15} className="v17-spin" /> : <ChevronDown size={15} />} Show more
              </button>
            </div>
          )}
          </>)}
        </>
      )}
      {open && (
        <div className="v17-drawer-scrim" onClick={() => setOpen(null)}>
          <aside className="v17-drawer" role="dialog" aria-modal="true" aria-label={open.title} onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(null); }}>
            <header className="v17-drawer-head">
              {open.icon ? <img src={open.icon} alt="" /> : <span className="v17-hit-icon-fallback"><Package size={26} /></span>}
              <div>
                <h2>{open.title}</h2>
                <small>{open.author && <>by {open.author} · </>}{compact(open.downloads)} downloads{project?.license ? ` · ${project.license}` : ""}</small>
              </div>
              <button type="button" className="v17-icon-btn" aria-label="Close" onClick={() => setOpen(null)} autoFocus><X size={18} /></button>
            </header>
            <div className="v17-drawer-actions">
              {installButton(open, true)}
              {open.url && (
                <button type="button" className="v17-btn v17-btn-ghost" onClick={() => onOpenLink(open.url!)}>
                  <ProviderLogo provider={open.provider} size={15} /> {open.provider === "curseforge" ? "View on CurseForge" : "View on Modrinth"} <ExternalLink size={13} />
                </button>
              )}
            </div>
            {kind !== "modpack" && game && <p className="v17-drawer-note">Installs the newest version for {loaderName(game.loader)} {game.version}, with any mods it requires.</p>}
            <div className="v17-drawer-body">
              <p className="v17-lede">{open.description}</p>
              {!!project?.gallery.length && (
                <div className="v17-gallery">
                  <img src={project.gallery[shot]?.url} alt={project.gallery[shot]?.title || ""} />
                  {project.gallery.length > 1 && (
                    <div className="v17-gallery-dots">
                      {project.gallery.slice(0, 10).map((_, i) => <button key={i} type="button" className={i === shot ? "active" : ""} onClick={() => setShot(i)} aria-label={`Image ${i + 1}`} />)}
                    </div>
                  )}
                </div>
              )}
              {!!versions.length && (
                <section className="v17-versions">
                  <h4>Versions for this game</h4>
                  {versions.slice(0, 6).map((v) => (
                    <div key={v.id} className="v17-version">
                      <span><strong className="mono">{v.number}</strong><small>{v.type !== "release" ? `${v.type} · ` : ""}{ago(v.date)}</small></span>
                      <button type="button" className="v17-text-btn" disabled={!!state(open) || v.blocked} onClick={() => void install(open, v.id)}>
                        {v.blocked ? "CurseForge only" : <>Install <ArrowUpRight size={13} /></>}
                      </button>
                    </div>
                  ))}
                </section>
              )}
              {project ? (project.body ? <Body text={project.body} /> : null) : <div className="v17-skeleton v17-skeleton-text" />}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
