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
      <h3 className="v18-section">Popular servers <small>Listed for convenience. Not run by or affiliated with LOAM.</small></h3>
      <div className="v18-server-grid">{list.featured.map((s, i) => card(s, i + list.custom.length))}</div>
    </main>
  );
}
