// Downloads (1.8): what LOAM is downloading or installing right now, from measured bytes, plus
// this session's finished and failed jobs.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, X } from "lucide-react";
import type { Operation, Snapshot } from "../api";
import { eta, formatEta, formatRate, fraction, phaseName, updateRate, type Rate } from "../lib/progress";
import { formatBytes } from "../lib/math";

export type Job = { id: string; gameId: string; game: string; phase: string; message: string; done: number; total: number; at: number; error?: string | null };
// The phases LOAM reports for work that moves files (sign-in is shown in Accounts instead).
const ACTIVE = new Set(["planning", "downloading", "runtime", "verifying", "launching", "importing", "backup", "copying"]);
export const isActive = (op: Operation | null | undefined) => !!op && ACTIVE.has(op.phase);

/** Tracks the current operation's measured speed and keeps a short session history. */
export function useDownloads(snap: Snapshot) {
  const op = snap.operation;
  const [rate, setRate] = useState<Rate | null>(null);
  const [history, setHistory] = useState<Job[]>([]);
  const last = useRef<Operation | null>(null);
  useEffect(() => {
    const prev = last.current;
    last.current = op;
    if (op && isActive(op)) {
      setRate((r) => (prev && prev.phase !== op.phase ? updateRate(null, { at: performance.now(), done: op.done }) : updateRate(r, { at: performance.now(), done: op.done })));
    } else setRate(null);
    // An operation ended (finished, failed or cancelled): remember it.
    if (prev && isActive(prev) && (!op || !isActive(op) || op.id !== prev.id)) {
      const game = snap.data.games.find((g) => g.id === prev.gameId)?.name || "LOAM";
      const end = op && op.id === prev.id ? op : null;
      const phase = end?.phase === "failed" || end?.error ? "failed" : end?.phase === "cancelled" ? "cancelled" : "ready";
      setHistory((h) => [{ id: `${prev.id}-${Date.now()}`, gameId: prev.gameId, game, phase, message: end?.error || end?.message || prev.message, done: prev.done, total: prev.total, at: Date.now(), error: end?.error }, ...h].slice(0, 20));
    }
  }, [op, snap.data.games]);
  return { op: isActive(op) ? op : null, rate, history };
}

export function ProgressBar({ value, label }: { value: number | null; label: string }) {
  return (
    <div className={`v19-progress ${value === null ? "is-indeterminate" : ""}`} role="progressbar" aria-label={label}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={value === null ? undefined : Math.round(value * 100)}>
      <i style={value === null ? undefined : { width: `${(value * 100).toFixed(1)}%` }} />
    </div>
  );
}

export default function DownloadsPage({ snap, onCancel, onOpenGame }: { snap: Snapshot; onCancel: () => void; onOpenGame: (id: string) => void }) {
  const { op, rate, history } = useDownloadsContext();
  const f = op ? fraction(op.done, op.total) : null;
  const left = op ? eta(op.done, op.total, rate?.bps ?? null) : null;
  const game = op ? snap.data.games.find((g) => g.id === op.gameId) : undefined;
  return (
    <main className="v17-page v19-downloads">
      <header className="v17-page-head">
        <div>
          <h1 className="v17-display">Downloads</h1>
          <p className="v19-subtitle">Game files, mods and packs LOAM is getting for you. Everything is checked before it's used.</p>
        </div>
      </header>
      <section className="v19-panel v19-job-now" aria-live="polite">
        {op ? (
          <>
            <div className="v19-job-head">
              <Loader2 size={18} className="v17-spin" aria-hidden="true" />
              <div>
                <strong>{phaseName(op.phase)}{game ? ` · ${game.name}` : ""}</strong>
                <small>{op.message}</small>
              </div>
              <button type="button" className="v17-btn v17-btn-sm v17-btn-ghost" onClick={onCancel}><X size={14} /> Cancel</button>
            </div>
            <ProgressBar value={f} label={`${phaseName(op.phase)} progress`} />
            <div className="v19-job-meta">
              <span>{f !== null ? `${formatBytes(op.done)} of ${formatBytes(op.total)}` : op.done > 0 ? `${formatBytes(op.done)} so far` : "Working…"}</span>
              <span>{[formatRate(rate?.bps ?? null), formatEta(left)].filter(Boolean).join(" · ")}</span>
            </div>
          </>
        ) : (
          <div className="v19-empty-row"><Download size={18} /> <span>Nothing is downloading right now.</span></div>
        )}
      </section>
      <h2 className="v19-section-title">This session</h2>
      {history.length ? (
        <ul className="v19-list">
          {history.map((j) => (
            <li key={j.id} className="v19-list-row">
              {j.phase === "failed" ? <AlertTriangle size={17} className="is-bad" /> : j.phase === "cancelled" ? <X size={17} className="muted" /> : <CheckCircle2 size={17} className="is-good" />}
              <div className="v19-list-main">
                <strong>{j.game}</strong>
                <small>{j.phase === "failed" ? `Failed: ${j.message}` : j.phase === "cancelled" ? "Cancelled" : j.total > 0 ? `Finished · ${formatBytes(j.total)}` : "Finished"}</small>
              </div>
              <time className="muted">{new Date(j.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              {snap.data.games.some((g) => g.id === j.gameId) && <button type="button" className="v17-btn v17-btn-sm v17-btn-ghost" onClick={() => onOpenGame(j.gameId)}>Open game</button>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Finished and failed downloads from this session show here.</p>
      )}
    </main>
  );
}

// The hook's state must outlive the page, so App provides it.
export const DownloadsCtx = createContext<ReturnType<typeof useDownloads>>({ op: null, rate: null, history: [] });
const useDownloadsContext = () => useContext(DownloadsCtx);
