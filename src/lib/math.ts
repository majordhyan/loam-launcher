/** Binary units, with bounded output for invalid or unmeasured values. */
export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 MiB";
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GiB`;
  const mib = value / 1024 ** 2;
  return `${mib >= 100 ? Math.round(mib) : mib.toFixed(1)} MiB`;
}

/** Nearest-rank percentile; excludes invalid samples, never mutates input. */
export function percentile(
  samples: readonly number[],
  quantile: number,
): number | null {
  if (!Number.isFinite(quantile) || quantile < 0 || quantile > 1) return null;
  const sorted = samples
    .filter((v) => Number.isFinite(v) && v >= 0)
    .sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.max(0, Math.ceil(quantile * sorted.length) - 1)];
}
