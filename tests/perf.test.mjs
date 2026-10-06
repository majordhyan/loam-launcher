import { test } from "node:test";
import assert from "node:assert/strict";
import { installPerfCapture } from "../src/perf.ts";

test("performance capture is opt-in, bounded, excludes private labels and stops", () => {
  globalThis.window = {};
  globalThis.localStorage = { getItem: () => null };
  installPerfCapture();
  assert.equal(window.__loamPerf, undefined);
  localStorage.getItem = () => "true";
  let callback;
  let visibility;
  let cancelled = 0;
  globalThis.requestAnimationFrame = (fn) => {
    callback = fn;
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {
    cancelled++;
  };
  globalThis.document = {
    hidden: false,
    addEventListener: (_, fn) => {
      visibility = fn;
    },
    removeEventListener() {},
  };
  globalThis.PerformanceObserver = class {
    static supportedEntryTypes = [];
  };
  installPerfCapture();
  for (let i = 1; i <= 12100; i++) callback(i * 16);
  window.__loamPerf.mark("private-token-canary");
  const report = JSON.parse(window.__loamPerf.export());
  assert.equal(report.samples.length, 12000);
  assert.equal(report.frames.p99, 16);
  assert.ok(!JSON.stringify(report).includes("private-token-canary"));
  document.hidden = true;
  visibility();
  document.hidden = false;
  visibility();
  callback(500000);
  assert.equal(JSON.parse(window.__loamPerf.export()).frames.max, 16);
  window.__loamPerf.stop();
  const stopped = window.__loamPerf.export();
  window.__loamPerf.mark("launch");
  assert.equal(window.__loamPerf.export(), stopped);
  assert.ok(cancelled >= 3);
});
