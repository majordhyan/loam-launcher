import { test } from "node:test";
import assert from "node:assert/strict";
import { fraction, updateRate, eta, formatRate, formatEta } from "../src/lib/progress.ts";

test("fraction is completed / total, null when unknown, clamped to 1", () => {
  assert.equal(fraction(50, 200), 0.25);
  assert.equal(fraction(300, 200), 1);
  for (const [d, t] of [[0, 0], [5, -1], [NaN, 10], [10, NaN], [-1, 10], [undefined, 10]]) assert.equal(fraction(d, t), null);
});

test("byte-weighted progress: one large file dominates, files are not averaged", () => {
  // 1 MB of a 9 MB file + a finished 1 MB file = 2 / 10, not (11% + 100%) / 2.
  assert.equal(fraction(1 + 1, 9 + 1), 0.2);
});

test("speed is a time-weighted moving average of byte deltas", () => {
  let r = updateRate(null, { at: 0, done: 0 });
  assert.equal(r.bps, null);
  r = updateRate(r, { at: 1000, done: 1_000_000 });
  assert.equal(r.bps, 1_000_000); // first measured rate
  // A noisy 3 MB/s burst over 1 s moves the estimate only part of the way (τ = 3 s).
  r = updateRate(r, { at: 2000, done: 4_000_000 });
  assert.ok(r.bps > 1_000_000 && r.bps < 3_000_000, String(r.bps));
  // Uneven spacing: a long gap weighs more than a short one.
  const short = updateRate({ at: 0, done: 0, bps: 1_000_000 }, { at: 100, done: 300_000 });
  const long = updateRate({ at: 0, done: 0, bps: 1_000_000 }, { at: 5000, done: 15_000_000 });
  assert.ok(Math.abs(long.bps - 3_000_000) < Math.abs(short.bps - 3_000_000));
});

test("speed resets on a new phase and ignores bad clocks and values", () => {
  const r = { at: 1000, done: 5_000_000, bps: 2_000_000 };
  assert.equal(updateRate(r, { at: 2000, done: 100 }).bps, null); // done went backwards: new file/phase
  assert.equal(updateRate(r, { at: 900, done: 6_000_000 }).bps, 2_000_000); // clock went backwards
  assert.equal(updateRate(r, { at: NaN, done: 1 }), r);
  assert.equal(updateRate(r, { at: 3000, done: -5 }), r);
});

test("ETA only when meaningful", () => {
  assert.equal(eta(50, 100, 10_000), 1);
  assert.equal(eta(0, 10_000_000, 1_000_000), 10);
  assert.equal(eta(100, 100, 5000), 0);
  assert.equal(eta(10, 0, 5000), null); // unknown total
  assert.equal(eta(10, 100, null), null); // no speed yet
  assert.equal(eta(10, 100, 100), null); // stalled (below 1 KB/s)
  assert.equal(eta(10, 100, NaN), null);
});

test("formatting stays honest", () => {
  assert.equal(formatRate(null), "");
  assert.equal(formatRate(0), "");
  assert.equal(formatRate(512 * 1024), "512 KB/s");
  assert.equal(formatRate(2.5 * 1048576), "2.5 MB/s");
  assert.equal(formatEta(null), "");
  assert.equal(formatEta(3), "a few seconds left");
  assert.equal(formatEta(42), "40 s left");
  assert.equal(formatEta(600), "about 10 min left");
  assert.equal(formatEta(3900), "about 1 h 5 min left");
});
