import { percentile } from "./lib/math.ts";

type Sample = { kind: string; start: number; duration: number };
const LIMIT = 12_000;
// Fixed labels only: no account names, file paths, URLs, arguments or tokens.
const LABELS = new Set([
  "frontend-start",
  "first-render",
  "snapshot",
  "launch",
  "stop",
  "operation",
]);

export function installPerfCapture(): void {
  if (localStorage.getItem("loam_perf_enabled") !== "true") return;
  const samples: Sample[] = [];
  let cursor = 0;
  let frame = 0;
  let previous = 0;
  let stopped = false;
  const observers: PerformanceObserver[] = [];
  const push = (sample: Sample) => {
    if (stopped || !Number.isFinite(sample.duration)) return;
    if (samples.length < LIMIT) samples.push(sample);
    else {
      samples[cursor] = sample;
      cursor = (cursor + 1) % LIMIT;
    }
  };
  const tick = (now: number) => {
    if (previous)
      push({ kind: "frame", start: previous, duration: now - previous });
    previous = now;
    frame = requestAnimationFrame(tick);
  };
  const visibility = () => {
    cancelAnimationFrame(frame);
    previous = 0;
    if (!document.hidden && !stopped) frame = requestAnimationFrame(tick);
  };
  for (const type of ["longtask", "event", "layout-shift", "paint"]) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        push({ kind: type, start: entry.startTime, duration: entry.duration });
    });
    observer.observe({ type, buffered: true });
    observers.push(observer);
  }
  document.addEventListener("visibilitychange", visibility);
  window.__loamPerf = {
    mark(label, start = performance.now()) {
      if (LABELS.has(label))
        push({ kind: label, start, duration: performance.now() - start });
    },
    export() {
      const ordered = [...samples].sort((a, b) => a.start - b.start);
      const frames = ordered
        .filter((s) => s.kind === "frame")
        .map((s) => s.duration);
      return JSON.stringify(
        {
          schema: 1,
          scope: "LOAM frontend only",
          capacity: LIMIT,
          frames: {
            count: frames.length,
            median: percentile(frames, 0.5),
            p95: percentile(frames, 0.95),
            p99: percentile(frames, 0.99),
            max: percentile(frames, 1),
          },
          samples: ordered,
        },
        null,
        2,
      );
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      observers.forEach((observer) => observer.disconnect());
    },
  };
  window.__loamPerf.mark("frontend-start");
  visibility();
}

declare global {
  interface Window {
    __loamPerf?: {
      mark(label: string, start?: number): void;
      export(): string;
      stop(): void;
    };
  }
}
