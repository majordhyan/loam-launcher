// Servers (1.8): popular public servers and your own, pinged live. Join launches the chosen game
// straight into the server. LOAM doesn't run or vouch for any listed server.
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, ChevronDown, Copy, Globe, Loader2, Plus, RefreshCw, Server, Trash2, Users, Wifi, X, ShieldAlert } from "lucide-react";
import { call, native, type Account, type Game, type Snapshot } from "../api";
import { LoaderGlyph, loaderName } from "./art";

type Entry = { name: string; address: string; about?: string; tags?: string[]; featured?: boolean };
type Status = { online: boolean; players?: number; max?: number; version?: string; motd?: string; favicon?: string | null; latency?: number; error?: string };

const SAMPLE: Record<string, Status> = {
  "mc.hypixel.net": { online: true, players: 14803, max: 200000, version: "Requires MC 1.8 / 1.21", motd: "Hypixel Network [1.8-1.21]\nSKYBLOCK · BED WARS", latency: 96 },
  "play.cubecraft.net": { online: true, players: 319, max: 5000, version: "CubeCraft", motd: "CubeCraft Games\nNew: EggWars Duels", latency: 48 },
  "play.wynncraft.com": { online: true, players: 838, max: 4000, version: "1.9–26.3", motd: "The Minecraft MMORPG", latency: 122 },
  "play.mccisland.net": { online: true, players: 207, max: 10000, version: "1.21.11+", motd: "MCC Island", latency: 110 },
  "play.manacube.com": { online: true, players: 1060, max: 5000, version: "1.7.2–26.3", motd: "ManaCube · Skyblock, Parkour", latency: 88 },
  "minehut.com": { online: true, players: 2530, max: 10000, version: "1.7.2–26.3", motd: "Minehut · Free server hosting", latency: 74 },
  "play.originrealms.com": { online: true, players: 46, max: 500, version: "1.7.2–26.2", motd: "Origin Realms", latency: 140 },
  "play.pika-network.net": { online: true, players: 1152, max: 6000, version: "1.7.2–26.3", motd: "PikaNetwork", latency: 52 },
  "play.mineplex.com": { online: true, players: 1406, max: 5000, version: "1.8–26.3", motd: "Mineplex", latency: 68 },
  "play.jartexnetwork.com": { online: true, players: 1697, max: 5000, version: "1.8–26.3", motd: "Jartex Network", latency: 42 },
  "blocksmc.com": { online: true, players: 376, max: 5000, version: "1.8–26.3", motd: "BlocksMC", latency: 54 },
  "hub.mc-complex.com": { online: true, players: 1577, max: 5000, version: "1.8–26.3", motd: "Complex Gaming", latency: 44 },
  "play.fadecloud.com": { online: true, players: 2158, max: 5000, version: "1.8–26.3", motd: "FadeCloud", latency: 84 },
  "play.opblocks.com": { online: true, players: 233, max: 5000, version: "1.8–26.3", motd: "OPBlocks", latency: 52 },
  "lifesteal.net": { online: true, players: 1856, max: 5000, version: "1.8–26.3", motd: "Lifesteal SMP", latency: 137 },
  "org.earthmc.net": { online: true, players: 366, max: 5000, version: "1.8–26.3", motd: "EarthMC", latency: 91 },
  "play.craftyourtown.com": { online: true, players: 451, max: 5000, version: "1.8–26.3", motd: "CraftYourTown", latency: 138 },
  "play.minesuperior.com": { online: true, players: 322, max: 5000, version: "1.8–26.3", motd: "MineSuperior", latency: 61 },
  "play.extremecraft.net": { online: true, players: 994, max: 5000, version: "1.8–26.3", motd: "ExtremeCraft", latency: 45 },
  "play.lemoncloud.net": { online: true, players: 2443, max: 5000, version: "1.8–26.3", motd: "LemonCloud", latency: 131 },
  "play.wildprison.net": { online: true, players: 283, max: 5000, version: "1.8–26.3", motd: "Wild Prison", latency: 86 },
  "purpleprison.net": { online: true, players: 270, max: 5000, version: "1.8–26.3", motd: "Purple Prison", latency: 64 },
  "minemen.club": { online: true, players: 1266, max: 5000, version: "1.8–26.3", motd: "Minemen Club", latency: 137 },
  "hoplite.gg": { online: true, players: 670, max: 5000, version: "1.8–26.3", motd: "Hoplite", latency: 60 },
  "minewind.com": { online: true, players: 2418, max: 5000, version: "1.8–26.3", motd: "Minewind", latency: 108 },
  "2b2t.org": { online: true, players: 2374, max: 5000, version: "1.8–26.3", motd: "2b2t", latency: 76 },
  "play.minefort.com": { online: true, players: 502, max: 5000, version: "1.8–26.3", motd: "Minefort", latency: 78 },
};
const SAMPLE_LIST = {
  featured: [
    { name: "Hypixel", address: "mc.hypixel.net", about: "The biggest minigame network: SkyBlock, Bed Wars, SkyWars and more.", tags: ["Minigames", "SkyBlock"], featured: true },
    { name: "CubeCraft", address: "play.cubecraft.net", about: "Minigames like EggWars, SkyWars and Parkour.", tags: ["Minigames"], featured: true },
    { name: "Wynncraft", address: "play.wynncraft.com", about: "A full MMORPG with quests, classes and dungeons.", tags: ["RPG"], featured: true },
    { name: "MCC Island", address: "play.mccisland.net", about: "Games from the team behind Minecraft Championship.", tags: ["Minigames", "Events"], featured: true },
    { name: "ManaCube", address: "play.manacube.com", about: "Skyblock, Parkour, Survival and more.", tags: ["Skyblock", "Parkour"], featured: true },
    { name: "Minehut", address: "minehut.com", about: "Thousands of community-run servers, one address.", tags: ["Community"], featured: true },
    { name: "Origin Realms", address: "play.originrealms.com", about: "Survival with custom creatures, items and worlds.", tags: ["Survival", "Custom"], featured: true },
    { name: "PikaNetwork", address: "play.pika-network.net", about: "Survival, Skyblock, Bed Wars and Practice.", tags: ["Survival", "PvP"], featured: true },
    { name: "Mineplex", address: "play.mineplex.com", about: "The classic minigame network, back again.", tags: ["Minigames"], featured: true },
    { name: "Jartex Network", address: "play.jartexnetwork.com", about: "Bed Wars, SkyWars, Skyblock, Prison and more.", tags: ["Minigames", "Skyblock"], featured: true },
    { name: "BlocksMC", address: "blocksmc.com", about: "Bed Wars, SkyWars and quick minigames.", tags: ["Minigames", "PvP"], featured: true },
    { name: "Complex Gaming", address: "hub.mc-complex.com", about: "Pixelmon, Survival, Skyblock and more.", tags: ["Survival", "Pixelmon"], featured: true },
    { name: "FadeCloud", address: "play.fadecloud.com", about: "Skyblock, Prison and Lifesteal.", tags: ["Skyblock", "Prison"], featured: true },
    { name: "OPBlocks", address: "play.opblocks.com", about: "Skyblock, Prison and Factions.", tags: ["Skyblock", "Prison"], featured: true },
    { name: "Lifesteal SMP", address: "lifesteal.net", about: "Survival where every kill steals a heart.", tags: ["Survival", "PvP"], featured: true },
    { name: "EarthMC", address: "org.earthmc.net", about: "Towns and nations on a full-size map of Earth.", tags: ["Survival", "Towny"], featured: true },
    { name: "CraftYourTown", address: "play.craftyourtown.com", about: "Towny survival with shops and an economy.", tags: ["Survival", "Towny"], featured: true },
    { name: "MineSuperior", address: "play.minesuperior.com", about: "Survival, Skyblock and Prison.", tags: ["Survival", "Skyblock"], featured: true },
    { name: "ExtremeCraft", address: "play.extremecraft.net", about: "Factions, Skyblock and Survival.", tags: ["Factions", "Survival"], featured: true },
    { name: "LemonCloud", address: "play.lemoncloud.net", about: "Survival, Skyblock and Lifesteal.", tags: ["Survival", "Skyblock"], featured: true },
    { name: "Wild Prison", address: "play.wildprison.net", about: "Prison with mines, gangs and ranks.", tags: ["Prison"], featured: true },
    { name: "Purple Prison", address: "purpleprison.net", about: "A long-running prison server.", tags: ["Prison"], featured: true },
    { name: "Minemen Club", address: "minemen.club", about: "Competitive PvP practice and ranked duels.", tags: ["PvP"], featured: true },
    { name: "Hoplite", address: "hoplite.gg", about: "Battle royale, Minecraft style.", tags: ["PvP", "Minigames"], featured: true },
    { name: "Minewind", address: "minewind.com", about: "Semi-anarchy survival with few rules.", tags: ["Anarchy", "Survival"], featured: true },
    { name: "2b2t", address: "2b2t.org", about: "The oldest anarchy server: no rules, no resets.", tags: ["Anarchy"], featured: true },
    { name: "Minefort", address: "play.minefort.com", about: "A hub for free community-run servers.", tags: ["Community"], featured: true },
  ] as Entry[],
  custom: [] as Entry[],
};

/** A stable warm hue per server name, for the monogram tile. */
const hue = (name: string) => 8 + ([...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 40);
const fmt = (n?: number) => (n === undefined ? "–" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
function Bars({ ms }: { ms?: number }) {
  const lit = ms === undefined ? 0 : ms < 80 ? 4 : ms < 150 ? 3 : ms < 300 ? 2 : 1;
  return (
    <span className="v18-bars" title={ms === undefined ? "No reply" : `${ms} ms`} aria-label={ms === undefined ? "No reply" : `${ms} milliseconds`}>
      {[1, 2, 3, 4].map((i) => <i key={i} className={i <= lit ? "on" : ""} style={{ height: 3 + i * 3 }} />)}
    </span>
  );
}

export default function Servers({ snap, game, account, busy, onJoin, onError, onToast, onAccounts }: {
  snap: Snapshot; game?: Game; account?: Account; busy: boolean;
  onJoin: (gameId: string, address: string, name: string) => void;
  onError: (e: unknown) => void; onToast: (m: string) => void; onAccounts: () => void;
}) {
  const [list, setList] = useState<{ featured: Entry[]; custom: Entry[] }>(native ? { featured: [], custom: [] } : SAMPLE_LIST);
  const [status, setStatus] = useState<Record<string, Status>>(native ? {} : SAMPLE);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState(game?.id || snap.data.games[0]?.id || "");
  const [menu, setMenu] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState("");
  const target = snap.data.games.find((g) => g.id === gameId) || game;
  useEffect(() => { if (game && !snap.data.games.some((g) => g.id === gameId)) setGameId(game.id); }, [game?.id, snap.data.games.length]);

  const all = useMemo(() => [...list.custom.map((s) => ({ ...s, featured: false })), ...list.featured], [list]);
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"players" | "name">("players");
  // Categories by how many servers use them, so the common ones come first.
  const cats = useMemo(() => {
    const n = new Map<string, number>();
    for (const s of list.featured) for (const t of s.tags || []) n.set(t, (n.get(t) || 0) + 1);
    return ["All", ...[...n.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).map(([t]) => t)];
  }, [list.featured]);
  const featured = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = list.featured.filter((s) => (cat === "All" || s.tags?.includes(cat))
      && (!q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || s.tags?.some((t) => t.toLowerCase().includes(q))));
    return sort === "name" ? [...shown].sort((a, b) => a.name.localeCompare(b.name))
      : [...shown].sort((a, b) => (status[b.address]?.players ?? -1) - (status[a.address]?.players ?? -1));
  }, [list.featured, cat, query, sort, status]);
  const ping = useCallback(async (entries: Entry[]) => {
    if (!native || !entries.length) return;
    setLoading(true);
    try { setStatus((s) => ({ ...s })); setStatus(await call<Record<string, Status>>("serverPing", { addresses: entries.map((e) => e.address) })); }
    catch (e) { onError(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (!native) return;
    void call<typeof list>("servers").then((l) => { setList(l); void ping([...l.custom, ...l.featured]); }).catch(onError);
  }, []);
  // Refresh live counts every minute while this page is open and visible.
  useEffect(() => {
    if (!native) return;
    const t = window.setInterval(() => { if (!document.hidden) void ping(all); }, 60_000);
    return () => window.clearInterval(t);
  }, [all, ping]);

  async function add() {
    try {
      const l = await call<typeof list>("serverAdd", { name, address });
      setList(l); setAdding(false); setName(""); setAddress("");
      onToast("Server added.");
      void ping([...l.custom, ...l.featured]);
    } catch (e) { onError(e); }
  }
  async function remove(addr: string) {
    try { setList(await call<typeof list>("serverRemove", { address: addr })); } catch (e) { onError(e); }
  }
  const offline = account?.kind !== "microsoft";
  const totalOnline = Object.values(status).reduce((n, s) => n + (s.players || 0), 0);

  const card = (s: Entry, i: number) => {
    const st = status[s.address];
    const up = st?.online;
    return (
      <article key={s.address} className={`v18-server v17-rise ${up ? "is-up" : st ? "is-down" : ""}`} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
        <div className="v18-server-icon">
          {st?.favicon ? <img src={st.favicon} alt="" /> : <span className="v18-monogram" style={{ "--hue": hue(s.name) } as CSSProperties}>{s.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2) || <Server size={26} />}</span>}
          {up && <span className="v18-live" />}
        </div>
        <div className="v18-server-body">
          <div className="v18-server-title">
            <strong>{s.name}</strong>
            {!s.featured && <span className="v17-tag">Yours</span>}
          </div>
          <button type="button" className="v18-address mono" title="Copy address"
            onClick={() => void navigator.clipboard.writeText(s.address).then(() => { setCopied(s.address); window.setTimeout(() => setCopied(""), 1500); })}>
            {s.address} {copied === s.address ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <p className="v18-motd">{st?.online ? st.motd || s.about : st ? (st.error || "Not answering right now.") : s.about || "Checking…"}</p>
          <div className="v17-hit-meta">
            <span><Users size={12} /> {up ? `${fmt(st.players)} online` : "–"}</span>
            {up && st.version && <span className="v18-ver">{st.version}</span>}
            <span><Bars ms={up ? st.latency : undefined} /> {up ? `${st.latency} ms` : ""}</span>
            {(s.tags || []).slice(0, 2).map((t) => <span key={t} className="v17-tag">{t}</span>)}
          </div>
        </div>
        <div className="v18-server-actions">
          <button type="button" className="v17-btn v17-btn-sm v17-btn-go" disabled={busy || !target} onClick={() => target && onJoin(target.id, s.address, s.name)}>
            <Wifi size={14} /> Join
          </button>
          {!s.featured && (
            <button type="button" className="v17-icon-btn" aria-label={`Remove ${s.name}`} title="Remove" onClick={() => void remove(s.address)}><Trash2 size={15} /></button>
          )}
        </div>
      </article>
    );
  };

  return (
    <main className="v17-page v18-servers">
      <header className="v17-page-head v17-rise">
        <div>
          <p className="v17-eyebrow"><Globe size={13} /> {totalOnline ? `${totalOnline.toLocaleString()} players online across this list` : "Live servers, one click away"}</p>
          <h1 className="v17-display">Servers<span className="v17-dot">.</span></h1>
        </div>
        <div className="v17-head-actions">
          <div className="v17-menu">
            <button type="button" className="v17-target" onClick={() => setMenu((m) => !m)} aria-expanded={menu} disabled={!snap.data.games.length}>
              <span className="v17-target-label">Join with</span>
              <strong>{target ? <><LoaderGlyph loader={target.loader} size={14} /> {target.name}</> : "No games yet"}</strong>
              <ChevronDown size={15} />
            </button>
            {menu && (
              <div className="v17-menu-pop" role="listbox" onMouseLeave={() => setMenu(false)}>
                {snap.data.games.map((g) => (
                  <button key={g.id} type="button" role="option" aria-selected={g.id === gameId} className={g.id === gameId ? "active" : ""} onClick={() => { setGameId(g.id); setMenu(false); }}>
                    <LoaderGlyph loader={g.loader} size={15} />
                    <span><strong>{g.name}</strong><small>{loaderName(g.loader)} {g.version}</small></span>
                    {g.id === gameId && <Check size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="v17-btn v17-btn-ghost" onClick={() => void ping(all)} disabled={loading}>
            {loading ? <Loader2 size={15} className="v17-spin" /> : <RefreshCw size={15} />} Refresh
          </button>
          <button type="button" className="v17-btn v17-btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add server</button>
        </div>
      </header>

      {offline && (
        <div className="v18-note v17-rise">
          <ShieldAlert size={18} />
          <div>
            <strong>Most public servers need a Microsoft account.</strong>
            <p>{account ? `${account.name} is an offline profile, so servers that check accounts will refuse it.` : "Add an account to join servers."} Sign in with Microsoft to join any of these.</p>
          </div>
          <button type="button" className="v17-btn v17-btn-sm v17-btn-ghost" onClick={onAccounts}>Accounts</button>
        </div>
      )}

      {adding && (
        <form className="v18-add v17-rise" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <label className="v17-search"><Server size={15} /><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" maxLength={40} aria-label="Server name" /></label>
          <label className="v17-search v17-grow"><Globe size={15} /><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="play.example.net or play.example.net:25565" aria-label="Server address" /></label>
          <button type="submit" className="v17-btn v17-btn-primary" disabled={!address.trim()}>Add</button>
          <button type="button" className="v17-icon-btn" aria-label="Cancel" onClick={() => setAdding(false)}><X size={16} /></button>
        </form>
      )}

      {!!list.custom.length && <h3 className="v18-section">Your servers</h3>}
      {!!list.custom.length && <div className="v18-server-grid">{list.custom.map((s, i) => card({ ...s, featured: false }, i))}</div>}
      <h3 className="v18-section">Popular servers <small>{list.featured.length} servers, listed for convenience. Not run by or affiliated with LOAM.</small></h3>
      <div className="v18-server-filters">
        <div className="v18-chips" role="tablist" aria-label="Server type">
          {cats.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={cat === c} className={`v18-chip ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <label className="v17-search v18-server-search"><Globe size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search servers" aria-label="Search servers" /></label>
        <div className="v17-segment" role="radiogroup" aria-label="Sort servers">
          <button type="button" role="radio" aria-checked={sort === "players"} className={sort === "players" ? "active" : ""} onClick={() => setSort("players")}>Most players</button>
          <button type="button" role="radio" aria-checked={sort === "name"} className={sort === "name" ? "active" : ""} onClick={() => setSort("name")}>A–Z</button>
        </div>
      </div>
      <div className="v18-server-grid">{featured.map((s, i) => card(s, i + list.custom.length))}</div>
      {!featured.length && <p className="muted v18-server-none">No servers match. Try another category or search.</p>}
    </main>
  );
}
