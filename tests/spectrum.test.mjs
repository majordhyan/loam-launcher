import { test } from "node:test";
import assert from "node:assert/strict";
import { ease, smooth, bands } from "../src/v19/spectrum.ts";

test("ease is 1 − exp(−dt/τ) and frame-rate independent", () => {
  assert.equal(ease(0, 100), 0);
  assert.equal(ease(16, 0), 1);
  assert.ok(Math.abs(ease(100, 100) - (1 - Math.exp(-1))) < 1e-12);
  // Two 16 ms steps close the same gap as one 32 ms step.
  const two = 1 - (1 - ease(16, 80)) ** 2;
  assert.ok(Math.abs(two - ease(32, 80)) < 1e-12);
});

test("smooth rises faster than it falls and reports when it settles", () => {
  const up = new Float32Array([0]), down = new Float32Array([1]);
  smooth(up, [1], 33);
  smooth(down, [0], 33);
  assert.ok(up[0] > 1 - down[0]);
  const s = new Float32Array([0.5]);
  for (let i = 0; i < 400; i++) smooth(s, [0.5], 33);
  assert.equal(smooth(s, [0.5], 33), false);
});

test("bands follow where the energy is, low to high", () => {
  const n = 1024, rate = 48000;
  const bins = new Uint8Array(n);
  const at = (hz) => Math.round(hz / (rate / 2 / n));
  bins[at(60)] = 255; // a bass note
  const b = bands(bins, rate, 24);
  assert.equal(b.length, 24);
  assert.ok(b[0] + b[1] + b[2] > 0.8, "energy lands in the lowest bands");
  assert.ok(b.slice(8).every((v) => v === 0), "nothing higher up");
  assert.ok(bands(new Uint8Array(n).fill(255), rate, 24).every((v) => v > 0.8 && v <= 1));
  assert.equal(bands([], rate, 8).every((v) => v === 0), true);
});
