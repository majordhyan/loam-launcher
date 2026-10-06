// Discover (1.7): browse Modrinth and CurseForge, see what fits the chosen game, and install
// with required dependencies in one click. Modpacks become a new game through Smart Drop.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, Check, ChevronDown, Compass, Download, ExternalLink, Heart, Layers, Loader2, Lock, Package,
  Palette, RefreshCw, Search, Sparkles, SunMedium, X, AlertTriangle, Plus, Gauge,
} from "lucide-react";
import { call, native, type Game, type Snapshot } from "../api";
import { LoaderGlyph, loaderKind, loaderName } from "./art";

type Kind = "mod" | "modpack" | "resourcepack" | "shader";
type Provider = "modrinth" | "curseforge";
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
  { id: "resourcepack", label: "Resource packs", icon: Palette },
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
async function previewSearch(q: string, kind: Kind, game: Game | undefined, sort: string, offset: number) {
  const facets: string[][] = [[`project_type:${kind}`]];
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
  const [provider, setProvider] = useState<Provider>("modrinth");
  const [providers, setProviders] = useState({ modrinth: true, curseforge: false });
  const [kind, setKind] = useState<Kind>("mod");
  const [gameId, setGameId] = useState(defaultGameId || games[0]?.id || "");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("relevance");
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<Record<string, "busy" | "done">>({});
  const [open, setOpen] = useState<Hit | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [shot, setShot] = useState(0);
  const [updates, setUpdates] = useState<Update[] | null>(null);
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

  const search = useCallback(async (offset: number) => {
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const target = kind === "modpack" ? undefined : game;
      const r = native
        ? await call<{ hits: Hit[]; total: number }>("discoverSearch", { provider, kind, query: debounced, sort, offset, gameId: target?.id ?? "" })
        : await previewSearch(debounced, kind, target, sort, offset);
      if (id !== request.current) return;
      setHits((h) => (offset ? [...h, ...r.hits] : r.hits));
      setTotal(r.total || 0);
    } catch (e) {
      if (id !== request.current) return;
      if (!offset) setHits([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [provider, kind, debounced, sort, game?.id, game?.version, game?.loader]);
  useEffect(() => { if (!needsLoader) void search(0); else { setHits([]); setTotal(0); } }, [search, needsLoader]);

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
  async function applyUpdate(u: Update) {
    try {
      const r = await call<{ message: string }>("discoverUpdate", { gameId, path: u.path, versionId: u.versionId, title: u.title, icon: u.icon });
      onToast(`${u.title || u.path}: ${r.message}`);
      setUpdates((list) => list?.filter((x) => x.path !== u.path) ?? null);
      loadInstalled();
    } catch (e) { onError(e); }
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

  return (
    <main className="v17-page v17-discover">
      <header className="v17-page-head v17-rise">
        <div>
          <p className="v17-eyebrow"><Compass size={13} /> Mods, packs and shaders, checked before they reach your game</p>
          <h1 className="v17-display">Discover<span className="v17-dot">.</span></h1>
        </div>
        <div className="v17-head-actions">
          <div className="v17-segment" role="tablist" aria-label="Source">
            <button type="button" role="tab" aria-selected={provider === "modrinth"} className={provider === "modrinth" ? "active" : ""} onClick={() => setProvider("modrinth")}>Modrinth</button>
            <button type="button" role="tab" aria-selected={provider === "curseforge"} className={provider === "curseforge" ? "active" : ""}
              onClick={() => (providers.curseforge ? setProvider("curseforge") : onSettings())}
              title={providers.curseforge ? "CurseForge" : "Connect CurseForge in Settings › Integrations"}>
              {!providers.curseforge && <Lock size={12} />} CurseForge
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
                onClick={() => { setKind(k.id); setHits([]); }}>
                <Icon size={15} /> {k.label}
              </button>
            );
          })}
        </div>
        <label className="v17-search v17-grow">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${kinds.find((k) => k.id === kind)!.label.toLowerCase()}${provider === "curseforge" ? " on CurseForge" : " on Modrinth"}`} aria-label="Search" />
          {query && <button type="button" className="v17-clear" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}
        </label>
        <label className="v17-select">
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      {kind !== "modpack" && game && !needsLoader && (
        <div className="v17-strip v17-rise" style={{ animationDelay: "80ms" }}>
          <span>Showing what fits <strong>{loaderName(game.loader)} {game.version}</strong>{total ? ` · ${compact(total)} results` : ""}</span>
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
        <section className="v17-updates v17-rise">
          {updates.map((u) => (
            <div key={u.path} className="v17-update">
              {u.icon ? <img src={u.icon} alt="" /> : <span className="v17-hit-icon-fallback"><Package size={18} /></span>}
              <span><strong>{u.title || u.path.split("/").pop()}</strong><small className="mono">{u.current || "?"} → {u.latest}</small></span>
              <button type="button" className="v17-btn v17-btn-sm v17-btn-go" onClick={() => void applyUpdate(u)}><RefreshCw size={13} /> Update</button>
            </div>
          ))}
          {updates.length > 1 && (
            <button type="button" className="v17-text-btn" onClick={() => void (async () => { for (const u of updates) await applyUpdate(u); })()}>Update all</button>
          )}
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
          <div className="v17-hits">
            {hits.map((h, i) => (
              <article key={key(h)} className="v17-hit v17-rise" style={{ animationDelay: `${Math.min(i % 24, 12) * 25}ms` }}
                onClick={() => setOpen(h)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setOpen(h); }} role="button" aria-label={`${h.title}, details`}>
                {h.icon ? <img className="v17-hit-icon" src={h.icon} alt="" loading="lazy" /> : <span className="v17-hit-icon v17-hit-icon-fallback"><Package size={22} /></span>}
                <div className="v17-hit-text">
                  <strong>{h.title}</strong>
                  {h.author && <small>by {h.author}</small>}
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
            ))}
            {loading && !hits.length && Array.from({ length: 8 }, (_, i) => <div key={i} className="v17-hit v17-skeleton" />)}
          </div>
          {!loading && !hits.length && !error && (
            <div className="v17-empty"><strong>Nothing found.</strong><p>Try fewer words, or another type.</p></div>
          )}
          {hits.length < total && (
            <div className="v17-more">
              <button type="button" className="v17-btn v17-btn-ghost" disabled={loading} onClick={() => void search(hits.length)}>
                {loading ? <Loader2 size={15} className="v17-spin" /> : <ChevronDown size={15} />} Show more
              </button>
            </div>
          )}
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
                  <ExternalLink size={15} /> {open.provider === "curseforge" ? "CurseForge" : "Modrinth"}
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
