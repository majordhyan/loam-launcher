// Minecraft news (1.8): Mojang's official Java news and patch notes, merged and refreshed every
// ten minutes. Articles open on minecraft.net; release and snapshot notes open right here.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Loader2, Newspaper, RefreshCw } from "lucide-react";
import { call } from "../api";

export type NewsItem = {
  id: string; kind: "news" | "release" | "snapshot"; title: string; date: string; text?: string;
  image?: string | null; link?: string; contentPath?: string; version?: string;
};
const KIND: Record<NewsItem["kind"], string> = { news: "News", release: "Release", snapshot: "Snapshot" };
export const newsKind = (k: NewsItem["kind"]) => KIND[k];
export const newsDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Mojang's patch-note HTML as plain React elements: headings, paragraphs, lists and emphasis only. */
function renderHtml(html: string): ReactNode[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  let key = 0;
  const walk = (n: Node): ReactNode => {
    if (n.nodeType === Node.TEXT_NODE) return n.textContent;
    if (n.nodeType !== Node.ELEMENT_NODE) return null;
    const el = n as Element;
    const kids = Array.from(el.childNodes).map(walk);
    const k = key++;
    switch (el.tagName.toLowerCase()) {
      case "h1": case "h2": return <h3 key={k}>{kids}</h3>;
      case "h3": case "h4": case "h5": return <h4 key={k}>{kids}</h4>;
      case "p": return <p key={k}>{kids}</p>;
      case "ul": case "ol": return <ul key={k}>{kids}</ul>;
      case "li": return <li key={k}>{kids}</li>;
      case "strong": case "b": return <strong key={k}>{kids}</strong>;
      case "em": case "i": return <em key={k}>{kids}</em>;
      case "code": return <code key={k}>{kids}</code>;
      case "br": return <br key={k} />;
      case "img": case "script": case "style": case "iframe": return null;
      default: return <span key={k}>{kids}</span>;
    }
  };
  return Array.from(doc.body.childNodes).map(walk);
}

export default function NewsSheet({ items, cached, onRefresh, onOpenLink, onError }: {
  items: NewsItem[]; cached: boolean; onRefresh: () => Promise<void>; onOpenLink: (url: string) => void; onError: (e: unknown) => void;
}) {
  const [filter, setFilter] = useState<"all" | NewsItem["kind"]>("all");
  const [open, setOpen] = useState<NewsItem | null>(null);
  const [notes, setNotes] = useState<{ body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // "All" keeps snapshots from the current cycle only (newer than the latest release), so
  // articles and releases aren't buried; the Snapshots tab has them all.
  const shown = useMemo(() => {
    if (filter !== "all") return items.filter((i) => i.kind === filter);
    const release = items.find((i) => i.kind === "release")?.date || "";
    return items.filter((i) => i.kind !== "snapshot" || i.date > release);
  }, [items, filter]);

  useEffect(() => {
    if (!open?.contentPath) { setNotes(null); return; }
    setLoading(true);
    let live = true;
    void call<{ body: string }>("patchNotes", { path: open.contentPath })
      .then((v) => live && setNotes(v)).catch((e) => { onError(e); setOpen(null); })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [open, onError]);

  const choose = (i: NewsItem) => (i.link ? onOpenLink(i.link) : setOpen(i));

  if (open) {
    return (
      <div className="v18-news-detail">
        <button type="button" className="v17-text-btn" onClick={() => setOpen(null)}><ArrowLeft size={15} /> All news</button>
        {open.image && <img className="v18-news-hero" src={open.image} alt="" />}
        <span className={`v18-news-kind is-${open.kind}`}>{newsKind(open.kind)}</span>
        <h2>{open.title}</h2>
        <p className="muted">{newsDate(open.date)}{open.version ? ` · ${open.version}` : ""}</p>
        {loading ? <p className="muted"><Loader2 size={15} className="v17-spin" /> Loading the patch notes…</p> : notes && <div className="v18-news-body">{renderHtml(notes.body)}</div>}
      </div>
    );
  }
  return (
    <div className="v18-news">
      <div className="v18-news-bar">
        <div className="v17-segment" role="tablist" aria-label="News type">
          {(["all", "news", "release", "snapshot"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>
              {k === "all" ? "All" : k === "news" ? "Articles" : k === "release" ? "Releases" : "Snapshots"}
            </button>
          ))}
        </div>
        <button type="button" className="v17-btn v17-btn-sm" disabled={refreshing} onClick={() => { setRefreshing(true); void onRefresh().finally(() => setRefreshing(false)); }}>
          {refreshing ? <Loader2 size={14} className="v17-spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>
      {cached && <p className="muted v18-news-offline">Showing saved news. LOAM refreshes it when you're back online.</p>}
      {!shown.length && <div className="v18-news-empty"><Newspaper size={28} /><p>No news here yet.</p></div>}
      <div className="v18-news-grid">
        {shown.map((i, n) => (
          <button key={i.id} type="button" className={`v18-news-card ${n === 0 && filter === "all" ? "is-lead" : ""}`} onClick={() => choose(i)}>
            <span className="v18-news-img">{i.image ? <img src={i.image} alt="" loading="lazy" /> : <Newspaper size={26} />}</span>
            <span className="v18-news-text">
              <span className="v18-news-meta"><span className={`v18-news-kind is-${i.kind}`}>{newsKind(i.kind)}</span>{newsDate(i.date)}</span>
              <strong>{i.title}</strong>
              {i.text && <small>{i.text}</small>}
              <span className="v18-news-go">{i.link ? <>Read on minecraft.net <ArrowUpRight size={13} /></> : "Read the patch notes"}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
