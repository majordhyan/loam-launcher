import { test } from "node:test";
import assert from "node:assert/strict";
import { formatBytes, percentile } from "../src/lib/math.ts";

test("binary byte formatting uses truthful units and finite output", () => {
  for (const value of [NaN, Infinity, -Infinity, -1, 0])
    assert.equal(formatBytes(value), "0 MiB");
  assert.equal(formatBytes(1024 ** 2), "1.0 MiB");
  assert.equal(formatBytes(1024 ** 3), "1.0 GiB");
  assert.equal(formatBytes(100 * 1024 ** 2), "100 MiB");
});
test("formatting preserves legacy rounding for measured finite byte counts", () => {
  const legacy = (n) =>
    n >= 1073741824
      ? `${(n / 1073741824).toFixed(1)} GB`
      : `${n / 1048576 >= 100 ? Math.round(n / 1048576) : (n / 1048576).toFixed(1)} MB`;
  for (let n = 1; n < 2 ** 45; n = n * 1.17 + 123) {
    assert.equal(
      formatBytes(n).replace("MiB", "MB").replace("GiB", "GB"),
      legacy(n),
    );
  }
});
test("percentiles are nearest-rank, bounded, nonmutating, and empty-aware", () => {
  const samples = [5, 1, 4, 2, 3];
  assert.equal(percentile(samples, 0.5), 3);
  assert.equal(percentile(samples, 0.95), 5);
  assert.equal(percentile(samples, 0), 1);
  assert.deepEqual(samples, [5, 1, 4, 2, 3]);
  assert.equal(percentile([], 0.5), null);
  assert.equal(percentile([NaN, Infinity, -1], 0.5), null);
  assert.equal(percentile(samples, NaN), null);
  assert.equal(percentile(samples, 2), null);
});
