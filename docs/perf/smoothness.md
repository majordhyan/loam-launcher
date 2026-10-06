# Smoothness evidence — v1.5 work in progress

Historical docs/perf/report.md is retained as prior work. Its FPS and timing claims have not
been reproduced or linked to raw traces in this audit; do not use them as release evidence.

The frontend recorder is opt-in: set localStorage `loam_perf_enabled` to `true` in a development
session and reload. `window.__loamPerf.export()` returns local JSON; `stop()` stops observers
and frame sampling. Remove the flag to disable it on the next launch. It performs no uploads.
This is a developer harness, not a new product screen. Capture at most 12,000 samples;
hidden-window intervals are excluded. Only fixed operation labels are accepted; no paths,
account names, URLs, DOM contents, authorization codes or IPC arguments are captured.

| Scenario | Before | After | Status |
|---|---|---|---|
| Cold / warm open | — | — | Not measured |
| Play to spawn/window/title screen | — | — | Not measured |
| Stop / exit to launcher | — | — | Not measured |
| Idle / downloading / game-running close | — | — | Not measured |

Mock tests establish bounded recording, percentiles, hidden-gap handling and stop behavior only.
Native spans, PresentMon/WPR, 20-run scenario orchestration, quiet gate, and multi-hardware
measurements remain required. Do not interpret frontend IPC durations as native phase timings.
