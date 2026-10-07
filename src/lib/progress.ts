// Download/install progress from measured work only.
// • fraction = completedBytes / totalBytes, or null when the total is unknown (show indeterminate).
// • speed: a time-weighted exponential moving average of byte deltas, so uneven sample spacing
//   doesn't skew it: α = 1 − exp(−Δt / τ).
// • ETA only when the remaining bytes and the speed are both meaningful.

export type Sample = { at: number; done: number };
export type Rate = { at: number; done: number; bps: number | null };

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** completed / total in [0, 1], or null when it can't be known. */
export function fraction(done: unknown, total: unknown): number | null {
  if (!finite(done) || !finite(total) || total <= 0 || done < 0) return null;
  return Math.min(1, done / total);
}

/**
 * Feeds one measurement into the speed estimate. `tauMs` is the smoothing time constant.
 * A drop in `done` (a new file or phase) or a non-increasing clock resets the estimate.
 */
export function updateRate(prev: Rate | null, sample: Sample, tauMs = 3000): Rate {
  if (!finite(sample.at) || !finite(sample.done) || sample.done < 0) return prev ?? { at: 0, done: 0, bps: null };
  if (!prev || sample.done < prev.done || sample.at <= prev.at) return { at: sample.at, done: sample.done, bps: prev && sample.done >= prev.done ? prev.bps : null };
  const dt = sample.at - prev.at;
  const instant = ((sample.done - prev.done) / dt) * 1000;
  const alpha = 1 - Math.exp(-dt / tauMs);
  const bps = prev.bps === null ? instant : prev.bps + alpha * (instant - prev.bps);
  return { at: sample.at, done: sample.done, bps: Math.max(0, bps) };
}

/** Seconds left, or null when it would be a guess (unknown total, stalled or barely started). */
export function eta(done: number, total: number, bps: number | null, minBps = 1024): number | null {
  if (!finite(done) || !finite(total) || total <= 0 || bps === null || !finite(bps) || bps < minBps) return null;
  const left = total - done;
  if (left <= 0) return 0;
  return Math.ceil(left / bps);
}

export function formatRate(bps: number | null): string {
  if (bps === null || !finite(bps) || bps <= 0) return "";
  if (bps >= 1048576) return `${(bps / 1048576).toFixed(bps >= 10 * 1048576 ? 0 : 1)} MB/s`;
  return `${Math.max(1, Math.round(bps / 1024))} KB/s`;
}

export function formatEta(seconds: number | null): string {
  if (seconds === null || !finite(seconds) || seconds < 0) return "";
  if (seconds < 60) return seconds <= 5 ? "a few seconds left" : `${Math.round(seconds / 5) * 5} s left`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `about ${m} min left`;
  const h = Math.floor(m / 60);
  return `about ${h} h ${m % 60} min left`;
}

/** Install phases as LOAM reports them, in order, with plain names. */
export const PHASES: Record<string, string> = {
  planning: "Preparing",
  preparing: "Preparing",
  runtime: "Getting Java",
  backup: "Backing up",
  copying: "Copying files",
  downloading: "Downloading",
  verifying: "Verifying",
  extracting: "Extracting",
  installing: "Installing",
  launching: "Starting Minecraft",
  authenticating: "Signing in",
  migrating: "Moving files",
  importing: "Importing",
  repairing: "Repairing",
  ready: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};
export const phaseName = (p: string) => PHASES[p] ?? (p ? p[0].toUpperCase() + p.slice(1) : "");
