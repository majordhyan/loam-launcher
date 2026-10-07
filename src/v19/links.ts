// Music links (1.9): recognise what a pasted link points at, and what LOAM can honestly do with it.
// Hosts are matched exactly (never "ends with"), and IDs are checked against each service's format.

export type Provider = "youtube" | "ytmusic" | "spotify" | "apple";
export type Kind = "video" | "playlist" | "track" | "album" | "artist" | "episode" | "show" | "song" | "station" | "music video";
export type MusicLink = {
  provider: Provider;
  kind: Kind;
  /** Stable identity for de-duplication: the same item pasted twice is the same key. */
  key: string;
  /** The tidy address LOAM stores and opens. */
  url: string;
  /** A readable name taken from the link itself (Apple Music), until real metadata arrives. */
  hint?: string;
};
export type ShortLink = { provider: "spotify"; short: true; url: string };

/** What each service can do in LOAM. The Music page and docs describe exactly this. */
export const CAPABILITIES: Record<Provider | "files" | "pc", { name: string; plays: "here" | "external" | "remote"; controls: string; metadata: string; spectrum: boolean; why?: string }> = {
  youtube: { name: "YouTube", plays: "here", controls: "Play, pause, skip, volume", metadata: "Title, channel, artwork", spectrum: false, why: "YouTube's player runs in its own sealed frame, so LOAM can't read its sound." },
  ytmusic: { name: "YouTube Music", plays: "here", controls: "Play, pause, skip, volume", metadata: "Title, channel, artwork", spectrum: false, why: "Plays in YouTube's player, the same as YouTube." },
  spotify: { name: "Spotify", plays: "external", controls: "In the Spotify app", metadata: "Title, artwork", spectrum: false, why: "Spotify only lets its own apps play its music, so LOAM opens the link in Spotify (the app if it's installed, otherwise the web player)." },
  apple: { name: "Apple Music", plays: "external", controls: "In Apple Music", metadata: "Name from the link", spectrum: false, why: "Playing Apple Music inside another app needs an Apple developer key, which LOAM doesn't have, so LOAM opens the link in Apple Music." },
  files: { name: "Files on this PC", plays: "here", controls: "Play, pause, skip, seek, volume", metadata: "File name", spectrum: true },
  pc: { name: "Other apps on this PC", plays: "remote", controls: "Play, pause, skip", metadata: "What Windows reports", spectrum: false, why: "LOAM only sends play, pause and skip through Windows' media controls; it never listens to other apps." },
};

export const PROVIDER_NAME: Record<Provider, string> = { youtube: "YouTube", ytmusic: "YouTube Music", spotify: "Spotify", apple: "Apple Music" };

const YT_VIDEO = /^[A-Za-z0-9_-]{11}$/;
const YT_LIST = /^[A-Za-z0-9_-]{10,64}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const APPLE_ID = /^(pl\.[A-Za-z0-9-]{8,64}|ra\.[A-Za-z0-9.-]{3,64}|\d{1,15})$/;

function toUrl(raw: string): URL | null {
  let text = raw.trim();
  if (!text) return null;
  if (!/^[a-z]+:\/\//i.test(text)) text = `https://${text}`;
  let u: URL;
  try { u = new URL(text); } catch { return null; }
  if (u.protocol === "http:") u.protocol = "https:";
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  return u;
}

/** Title-cases an Apple Music slug ("lofi-hip-hop" → "Lofi Hip Hop"). */
function fromSlug(slug: string) {
  let s = slug;
  try { s = decodeURIComponent(slug); } catch { /* keep as is */ }
  s = s.replace(/[-_]+/g, " ").trim();
  return s ? s.replace(/\b\p{L}/gu, (c) => c.toUpperCase()).slice(0, 120) : undefined;
}

export function parseMusicLink(raw: string): MusicLink | ShortLink | null {
  const u = toUrl(raw);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "spotify.link" || host === "spoti.fi") return parts.length ? { provider: "spotify", short: true, url: u.href } : null;

  if (host === "youtu.be" || host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const provider: Provider = host === "music.youtube.com" ? "ytmusic" : "youtube";
    const base = provider === "ytmusic" ? "https://music.youtube.com" : "https://www.youtube.com";
    const list = u.searchParams.get("list");
    let video = host === "youtu.be" ? parts[0] : parts[0] === "watch" ? u.searchParams.get("v") : parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed" ? parts[1] : null;
    if (video && !YT_VIDEO.test(video)) video = null;
    // Mixes ("RD…") are built per viewer and can't be embedded as a list; keep the video instead.
    if (list && YT_LIST.test(list) && !(list.startsWith("RD") && video)) {
      return { provider, kind: "playlist", key: `yt:list:${list}`, url: `${base}/playlist?list=${list}` };
    }
    if (video) return { provider, kind: "video", key: `yt:video:${video}`, url: `${base}/watch?v=${video}` };
    return null;
  }

  if (host === "open.spotify.com") {
    const p = parts[0]?.startsWith("intl-") ? parts.slice(1) : parts;
    const kind = p[0], id = p[1];
    if (["track", "album", "playlist", "artist", "episode", "show"].includes(kind) && id && SPOTIFY_ID.test(id)) {
      return { provider: "spotify", kind: kind as Kind, key: `sp:${kind}:${id}`, url: `https://open.spotify.com/${kind}/${id}` };
    }
    return null;
  }

  if (host === "music.apple.com") {
    // /{country}/{kind}/{slug}/{id}, or /{country}/{kind}/{id}; album?i=… is one song on the album.
    const [cc, kind, a, b] = parts;
    if (!cc || !/^[a-z]{2}$/.test(cc)) return null;
    const id = b ?? a, slug = b ? a : undefined;
    const kinds: Record<string, Kind> = { album: "album", playlist: "playlist", song: "song", artist: "artist", station: "station", "music-video": "music video" };
    if (!kinds[kind] || !id || !APPLE_ID.test(id)) return null;
    const song = kind === "album" ? u.searchParams.get("i") : null;
    if (song && /^\d{1,15}$/.test(song)) {
      return { provider: "apple", kind: "song", key: `am:song:${song}`, url: `https://music.apple.com/${cc}/album/${slug ? `${slug}/` : ""}${id}?i=${song}`, hint: slug && fromSlug(slug) };
    }
    return { provider: "apple", kind: kinds[kind], key: `am:${kind}:${id}`, url: `https://music.apple.com/${cc}/${kind}/${slug ? `${slug}/` : ""}${id}`, hint: slug && fromSlug(slug) };
  }
  return null;
}

/** What LOAM shows for an artwork address: only the services' own image hosts. */
export function safeThumb(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ["i.ytimg.com", "i.scdn.co", "image-cdn-ak.spotifycdn.com", "image-cdn-fa.spotifycdn.com", "mosaic.scdn.co"].includes(u.hostname) ? u.href : undefined;
  } catch { return undefined; }
}

/** A YouTube or YouTube Music link → what to embed (validated IDs only). */
export function youTubeIds(link: string): { list?: string; video?: string } | null {
  const p = parseMusicLink(link);
  if (!p || "short" in p || (p.provider !== "youtube" && p.provider !== "ytmusic")) return null;
  const id = p.key.split(":")[2];
  return p.kind === "playlist" ? { list: id } : { video: id };
}

export type SavedLink = MusicLink & { title?: string; author?: string; thumb?: string; added: number };
const STORE = "loam_music_links";
export function loadLinks(): SavedLink[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "[]");
    if (!Array.isArray(v)) return [];
    // Re-check stored entries: anything that no longer parses is dropped rather than trusted.
    return v.flatMap((x) => {
      const p = typeof x?.url === "string" ? parseMusicLink(x.url) : null;
      if (!p || "short" in p) return [];
      const text = (t: unknown) => (typeof t === "string" ? t.slice(0, 200) : undefined);
      return [{ ...p, title: text(x.title), author: text(x.author), thumb: safeThumb(x.thumb), added: Number(x.added) || 0 }];
    });
  } catch { return []; }
}
export function storeLinks(list: SavedLink[]) {
  try { localStorage.setItem(STORE, JSON.stringify(list.slice(0, 200))); } catch { /* storage unavailable */ }
}
/** Adds a link, newest first; a link already saved moves to the top with fresher details. */
export function addLink(list: SavedLink[], link: SavedLink): SavedLink[] {
  const old = list.find((l) => l.key === link.key);
  const merged = old ? { ...old, ...Object.fromEntries(Object.entries(link).filter(([, v]) => v !== undefined)) } as SavedLink : link;
  return [merged, ...list.filter((l) => l.key !== link.key)];
}
