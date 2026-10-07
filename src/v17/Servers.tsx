// Servers (1.8): your saved servers and a list of popular public ones LOAM keeps, each pinged
// directly from this PC. Values are what the server answered and when; a missed ping is shown as
// "No answer", never as "offline". Join starts the chosen game straight into the server (Quick
// Play on 1.20+, the older join arguments before that). LOAM doesn't run or vouch for any server.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BedDouble, Castle, Check, ChevronDown, ChevronRight, Cloud, CloudLightning, Copy, Crosshair, Egg, Footprints, Gamepad2, HeartCrack, Landmark, LayoutGrid, Loader2, Pickaxe, Plus, RefreshCw, Search, Server, ShieldAlert, Skull, Sparkles, Swords, Trash2, Trees, Trophy, UserRoundCheck, Users, WandSparkles, X, type LucideIcon } from "lucide-react";
import { CATALOG, MODES, OFFLINE_CHECKED, type Mode } from "../v19/serverCatalog";
import { call, native, type Account, type Game, type Snapshot } from "../api";
import { LoaderGlyph, loaderName } from "./art";
import { ago } from "./time";
import { menuKeys, useFocusTrap } from "../v19/a11y";

type Entry = { name: string; address: string; about?: string; tags?: string[]; modes?: Mode[]; offline?: boolean; featured?: boolean };
const MODE_ICON: Record<Mode, LucideIcon> = {
  BedWars: BedDouble, SkyWars: CloudLightning, SkyBlock: Cloud, Survival: Trees, Lifesteal: HeartCrack, Prison: Pickaxe, Practice: Swords,
  Factions: Castle, Towny: Landmark, Anarchy: Skull, RPG: WandSparkles, Minigames: Gamepad2, Parkour: Footprints, Pixelmon: Sparkles,
  "Battle royale": Crosshair, EggWars: Egg, Events: Trophy, Community: Users,
};
const FEATURED: Entry[] = CATALOG.map((c) => ({ ...c, tags: c.modes, featured: true }));
const checkedOn = new Date(`${OFFLINE_CHECKED}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
type Status = { online: boolean; players?: number; max?: number; version?: string; motd?: string; favicon?: string | null; latency?: number; error?: string; checked?: string };
/** The latest answer plus the last time the server did answer. */
type Known = Status & { lastOnline?: Status };

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
const num = (n?: number) => (n === undefined ? "—" : n.toLocaleString());
const REFRESH_MS = 60_000;

function Icon({ s, st }: { s: Entry; st?: Known }) {
  const fav = st?.favicon || st?.lastOnline?.favicon;
  return (
    <span className="v19-srv-icon">
      {fav ? <img src={fav} alt="" /> : <span className="v18-monogram" style={{ "--hue": hue(s.name) } as CSSProperties}>{s.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2) || <Server size={18} />}</span>}
    </span>
  );
}

function StatusText({ st, checking }: { st?: Known; checking: boolean }) {
  if (!st) return <span className="v19-srv-status is-idle">{checking ? "Checking…" : "Not checked"}</span>;
  if (st.online) return <span className="v19-srv-status is-good"><i aria-hidden="true" />Online<span className="muted"> · {st.latency} ms</span></span>;
  return (
    <span className="v19-srv-status is-warn" title={st.error || ""}>
      <i aria-hidden="true" />No answer{st.lastOnline?.checked ? <span className="muted"> · seen {ago(st.lastOnline.checked)}</span> : null}
    </span>
  );
}

export default function Servers({ snap, game, account, busy, active = true, onJoin, onError, onToast, onAccounts }: {
  snap: Snapshot; game?: Game; account?: Account; busy: boolean; active?: boolean;
  onJoin: (gameId: string, address: string, name: string) => void;
  onError: (e: unknown) => void; onToast: (m: string) => void; onAccounts: () => void;
}) {
  const [list, setListState] = useState<{ featured: Entry[]; custom: Entry[] }>({ featured: FEATURED, custom: native ? [] : SAMPLE_LIST.custom });
  const setList = (l: { featured: Entry[]; custom: Entry[] }) => setListState({ featured: FEATURED, custom: l.custom });
  const [status, setStatus] = useState<Record<string, Known>>(() => (native ? {} : Object.fromEntries(Object.entries(SAMPLE).map(([k, v]) => [k, { ...v, checked: new Date().toISOString() }]))));
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number>(native ? 0 : Date.now());
  const [gameId, setGameId] = useState(game?.id || snap.data.games[0]?.id || "");
  const [menu, setMenu] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState("");
  const [open, setOpen] = useState<Entry | null>(null);
  const [cat, setCat] = useState<"All" | Mode>("All");
  const [allModes, setAllModes] = useState(false);
  // Offline profiles can only join servers that accept them; show those first for offline players.
  const [offlineOnly, setOfflineOnly] = useState(account?.kind !== "microsoft");
  useEffect(() => { setOfflineOnly(account?.kind !== "microsoft"); }, [account?.kind]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"players" | "name">("players");
  const menuBox = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const drawer = useRef<HTMLElement>(null);
  useFocusTrap(drawer, !!open);
  const target = snap.data.games.find((g) => g.id === gameId) || game;
  useEffect(() => { if (game && !snap.data.games.some((g) => g.id === gameId)) setGameId(game.id); }, [game?.id, snap.data.games.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useMemo(() => [...list.custom.map((s) => ({ ...s, featured: false })), ...list.featured], [list]);
  const modeCounts = useMemo(() => {
    const n = new Map<Mode, number>();
    for (const sv of list.featured) if (!offlineOnly || sv.offline) for (const m of sv.modes || []) n.set(m, (n.get(m) || 0) + 1);
    return n;
  }, [list.featured, offlineOnly]);
  const players = (a: string) => (status[a]?.online ? status[a]!.players ?? -1 : -1);
  const featured = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = list.featured.filter((s) => (cat === "All" || s.modes?.includes(cat)) && (!offlineOnly || s.offline)
      && (!q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || s.tags?.some((t) => t.toLowerCase().includes(q))));
    return sort === "name" ? [...shown].sort((a, b) => a.name.localeCompare(b.name)) : [...shown].sort((a, b) => players(b.address) - players(a.address));
  }, [list.featured, cat, query, sort, status, offlineOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // One ping at a time; answers merge into what's known, keeping the last good values.
  const pinging = useRef(false);
  const ping = useCallback(async (entries: Entry[]) => {
    if (!native || !entries.length || pinging.current) return;
    pinging.current = true;
    setLoading(true);
    try {
      const fresh = await call<Record<string, Status>>("serverPing", { addresses: entries.map((e) => e.address) });
      setStatus((prev) => {
        const next = { ...prev };
        for (const [a, s] of Object.entries(fresh)) next[a] = { ...s, lastOnline: s.online ? s : prev[a]?.online ? prev[a] : prev[a]?.lastOnline };
        return next;
      });
      setCheckedAt(Date.now());
    } catch (e) { onError(e); } finally { pinging.current = false; setLoading(false); }
  }, [onError]);
  useEffect(() => {
    if (!native) return;
    void call<typeof list>("servers").then(setList).catch(onError);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const checkedAtRef = useRef(checkedAt);
  checkedAtRef.current = checkedAt;
  // Refresh while the page is open and LOAM is visible; nothing runs in the background.
  useEffect(() => {
    if (!native || !active || !all.length) return;
    const due = () => { if (!document.hidden && Date.now() - checkedAtRef.current >= REFRESH_MS - 500) void ping(all); };
    due();
    const t = window.setInterval(due, REFRESH_MS);
    document.addEventListener("visibilitychange", due);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", due); };
  }, [active, all, ping]);

  // Menu and drawer: Escape closes, outside clicks close the menu, focus returns where it was.
  useEffect(() => {
    if (!menu && !open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(false); setOpen(null); } };
    const away = (e: PointerEvent) => { if (menu && !menuBox.current?.contains(e.target as Node)) setMenu(false); };
    window.addEventListener("keydown", esc);
    window.addEventListener("pointerdown", away, true);
    return () => { window.removeEventListener("keydown", esc); window.removeEventListener("pointerdown", away, true); };
  }, [menu, open]);
  useEffect(() => { if (!open) returnFocus.current?.focus(); }, [open]);

  async function add() {
    try {
      const l = await call<typeof list>("serverAdd", { name, address });
      setList(l); setAdding(false); setName(""); setAddress("");
      onToast("Server added.");
      const added = l.custom.find((c) => !list.custom.some((o) => o.address === c.address));
      if (added) void ping([added]);
    } catch (e) { onError(e); }
  }
  async function remove(addr: string) {
    try { setList(await call<typeof list>("serverRemove", { address: addr })); setOpen(null); onToast("Server removed."); } catch (e) { onError(e); }
  }
  const copy = (a: string) => void navigator.clipboard.writeText(a).then(() => { setCopied(a); window.setTimeout(() => setCopied(""), 1500); });
  const offline = account?.kind !== "microsoft";
  const join = (s: Entry) => target && onJoin(target.id, s.address, s.name);

  const row = (s: Entry) => {
    const st = status[s.address];
    return (
      <li key={s.address} className="v19-list-row v19-srv-row">
        <button type="button" className="v19-srv-main" onClick={(e) => { returnFocus.current = e.currentTarget; setOpen(s); }} aria-label={`${s.name}, details`}>
          <Icon s={s} st={st} />
          <span className="v19-list-main">
            <strong>{s.name}{s.offline && <span className="v19-badge-offline" title={`Accepted offline profiles when LOAM checked on ${checkedOn}`}>Offline OK</span>}</strong>
            <small className="mono">{s.address}</small>
          </span>
        </button>
        <span className="v19-srv-col v19-srv-col-status"><StatusText st={st} checking={loading} /></span>
        <span className="v19-srv-col v19-srv-col-players">{st?.online ? <>{num(st.players)}<span className="muted"> online</span></> : <span className="muted">—</span>}</span>
        <span className="v19-srv-col v19-srv-col-version muted" title={st?.version || st?.lastOnline?.version || ""}>{st?.version || st?.lastOnline?.version || "—"}</span>
        <span className="v19-srv-actions">
          <button type="button" className="v19-icon" aria-label={`Copy ${s.address}`} title={copied === s.address ? "Copied" : "Copy address"} onClick={() => copy(s.address)}>
            {copied === s.address ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button type="button" className="v17-btn v17-btn-sm v17-btn-ghost" disabled={busy || !target} onClick={() => join(s)}>Join</button>
          <ChevronRight size={16} className="v19-srv-chev" aria-hidden="true" />
        </span>
      </li>
    );
  };
  const head = (
    <li className="v19-srv-head" aria-hidden="true">
      <span>Server</span><span>Status</span><span>Players</span><span>Version (server reports)</span><span />
    </li>
  );
  const st = open ? status[open.address] : undefined;
  const shown = st?.online ? st : st?.lastOnline;

  return (
    <main className="v17-page v19-servers">
      <header className="v17-page-head">
        <div>
          <h1 className="v17-display">Servers</h1>
          <p className="v19-subtitle">{checkedAt ? `Checked from this PC ${ago(new Date(checkedAt).toISOString())}.` : "Checking from this PC…"} Join starts your game straight into the server.</p>
        </div>
        <div className="v17-head-actions">
          <div className="v19-target" ref={menuBox}>
            <button type="button" className="v19-target-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="listbox" disabled={!snap.data.games.length}>
              <span className="v19-target-label">Join with</span>
              <strong>{target ? <><LoaderGlyph loader={target.loader} size={14} /> {target.name}</> : "No games yet"}</strong>
              <ChevronDown size={15} />
            </button>
            {menu && (
              <div className="v19-menu v19-menu-right" role="listbox" aria-label="Game to join with" onKeyDown={menuKeys}>
                {snap.data.games.map((g) => (
                  <button key={g.id} type="button" role="option" aria-selected={g.id === gameId} className="v19-menu-item" onClick={() => { setGameId(g.id); setMenu(false); }}>
                    <LoaderGlyph loader={g.loader} size={14} />
                    <span>{g.name}<small>{loaderName(g.loader)} {g.version}</small></span>
                    {g.id === gameId && <Check size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="v17-btn" onClick={() => void ping(all)} disabled={loading || !native} title="Check every server again">
            {loading ? <Loader2 size={15} className="v17-spin" /> : <RefreshCw size={15} />} Refresh
          </button>
          <button type="button" className="v17-btn v17-btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add server</button>
        </div>
      </header>

      {offline && (
        <div className="v19-inline-note" role="note">
          <ShieldAlert size={17} />
          <p><strong>Most public servers need a Microsoft account.</strong> {account ? `${account.name} is an offline profile, so only servers that accept offline profiles will let it in; the list below shows those.` : "Add an account to join."}</p>
          <button type="button" className="v17-btn v17-btn-sm v17-btn-ghost" onClick={onAccounts}>Accounts</button>
        </div>
      )}

      {adding && (
        <form className="v19-add-server" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <label className="v19-field"><span>Name</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" maxLength={40} /></label>
          <label className="v19-field v17-grow"><span>Address</span><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="play.example.net or play.example.net:25565" /></label>
          <div className="v19-row v19-add-actions">
            <button type="button" className="v17-btn v17-btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="v17-btn v17-btn-primary" disabled={!address.trim()}>Save server</button>
          </div>
        </form>
      )}

      <h2 className="v19-section-title">Your servers</h2>
      {list.custom.length ? (
        <ul className="v19-list v19-srv-list">{head}{list.custom.map((s) => row({ ...s, featured: false }))}</ul>
      ) : (
        <p className="muted">Servers you add are saved here. <button type="button" className="v17-text-btn" onClick={() => setAdding(true)}>Add a server</button></p>
      )}

      <div className="v19-section-row v19-srv-featured-head">
        <div>
          <h2 className="v19-section-title">Popular servers</h2>
          <p className="muted v19-small">A list of {list.featured.length} well-known public servers kept by LOAM. It isn't a live directory, and LOAM doesn't run or vouch for them.</p>
        </div>
      </div>
      <div className="v19-modes" role="tablist" aria-label="Game mode">
        <button type="button" role="tab" aria-selected={cat === "All"} className={`v19-mode ${cat === "All" ? "active" : ""}`} onClick={() => setCat("All")}>
          <LayoutGrid size={18} /><span><strong>All modes</strong><small>{list.featured.filter((x) => !offlineOnly || x.offline).length} servers</small></span>
        </button>
        {MODES.filter((m) => modeCounts.get(m.id)).filter((m, i) => allModes || i < 9 || m.id === cat).map((m) => {
          const Icon = MODE_ICON[m.id];
          return (
            <button key={m.id} type="button" role="tab" aria-selected={cat === m.id} title={m.blurb} className={`v19-mode ${cat === m.id ? "active" : ""}`} onClick={() => setCat(m.id)}>
              <Icon size={18} /><span><strong>{m.id}</strong><small>{modeCounts.get(m.id)} {modeCounts.get(m.id) === 1 ? "server" : "servers"}</small></span>
            </button>
          );
        })}
        {MODES.filter((m) => modeCounts.get(m.id)).length > 9 && (
          <button type="button" className="v19-mode v19-mode-more" aria-expanded={allModes} onClick={() => setAllModes((v) => !v)}>
            <span><strong>{allModes ? "Fewer modes" : "More modes"}</strong><small>{allModes ? "Show the main ones" : `${MODES.filter((m) => modeCounts.get(m.id)).length - 9} more`}</small></span>
          </button>
        )}
      </div>
      <div className="v18-server-filters">
        <label className={`v19-offline-toggle ${offlineOnly ? "on" : ""}`} title={`Servers that accepted an offline profile when LOAM checked on ${checkedOn}. Servers can change this at any time.`}>
          <input type="checkbox" checked={offlineOnly} onChange={(e) => { setOfflineOnly(e.target.checked); setCat("All"); }} />
          <UserRoundCheck size={16} /> Works with offline profiles
        </label>
        <label className="v17-search v18-server-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this list" aria-label="Search popular servers" /></label>
        <div className="v17-segment" role="radiogroup" aria-label="Sort servers">
          <button type="button" role="radio" aria-checked={sort === "players"} className={sort === "players" ? "active" : ""} onClick={() => setSort("players")}>Most players</button>
          <button type="button" role="radio" aria-checked={sort === "name"} className={sort === "name" ? "active" : ""} onClick={() => setSort("name")}>A–Z</button>
        </div>
      </div>
      {offlineOnly && <p className="muted v19-small v19-offline-note">Showing servers that let an offline profile log in when LOAM checked on {checkedOn}. Servers can change this, and many ask you to register with a password once you join. Minecraft: Java Edition is a paid game; a Microsoft account works on every server here.</p>}
      {featured.length ? <ul className="v19-list v19-srv-list">{head}{featured.map(row)}</ul> : <p className="muted">No servers match. Try another type or search.</p>}

      {open && (
        <>
          <div className="v19-scrim" onClick={() => setOpen(null)} />
          <aside ref={drawer} className="v19-drawer" role="dialog" aria-modal="true" aria-label={`${open.name} details`}>
            <header className="v19-drawer-head">
              <Icon s={open} st={st} />
              <div className="v19-list-main"><strong>{open.name}</strong><small className="mono">{open.address}</small></div>
              <button type="button" className="v19-icon" aria-label="Close" autoFocus onClick={() => setOpen(null)}><X size={17} /></button>
            </header>
            <div className="v19-drawer-body">
              <StatusText st={st} checking={loading} />
              {shown?.motd && <p className="v19-motd">{shown.motd}</p>}
              {open.about && <p className="muted">{open.about}</p>}
              <dl className="v19-facts">
                <div><dt>Players</dt><dd>{st?.online ? `${num(st.players)} of ${num(st.max)}` : "—"}</dd></div>
                <div><dt>Ping from this PC</dt><dd>{st?.online ? `${st.latency} ms` : "—"}</dd></div>
                <div><dt>Version (as the server reports it)</dt><dd>{shown?.version || "—"}</dd></div>
                <div><dt>Last checked</dt><dd>{st?.checked ? ago(st.checked) : "Not yet"}</dd></div>
                {open.featured !== false && <div><dt>Offline profiles</dt><dd>{open.offline === true ? `Accepted (checked ${checkedOn})` : open.offline === false ? "Microsoft account needed" : "Not known"}</dd></div>}
                {!!open.modes?.length && <div><dt>Game modes</dt><dd>{open.modes.join(", ")}</dd></div>}
              </dl>
              {!st?.online && st?.error && <p className="muted v19-small">Last attempt: {st.error} A server that doesn't answer once may just be busy or restarting.</p>}
              {!!open.tags?.length && <p className="v19-tags">{open.tags.map((t) => <span key={t}>{t}</span>)}</p>}
            </div>
            <footer className="v19-drawer-foot">
              {open.featured === false && <button type="button" className="v17-btn v17-btn-ghost" onClick={() => void remove(open.address)}><Trash2 size={15} /> Remove</button>}
              <span className="v17-grow" />
              <button type="button" className="v17-btn" onClick={() => copy(open.address)}>{copied === open.address ? <Check size={15} /> : <Copy size={15} />} Copy address</button>
              <button type="button" className="v17-btn v17-btn-primary" disabled={busy || !target} onClick={() => { join(open); setOpen(null); }}>
                Join with {target?.name ?? "a game"}
              </button>
            </footer>
          </aside>
        </>
      )}
    </main>
  );
}
