// Small, locale-aware helpers for "last played" and playtime.
export function playtime(seconds?: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  if (s < 60) return s ? "under a minute" : "not played yet";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

export function ago(iso?: string | null): string {
  if (!iso) return "never";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "never";
  const s = (Date.now() - t) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (s < 60) return "just now";
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  if (s < 86400 * 30) return rtf.format(-Math.round(s / 86400), "day");
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Most recently played first; never-played games keep their creation order after them. */
export function byRecent<T extends { lastPlayed?: string | null; created: string }>(a: T, b: T) {
  return (Date.parse(b.lastPlayed || "") || 0) - (Date.parse(a.lastPlayed || "") || 0) || Date.parse(b.created) - Date.parse(a.created);
}
