import test from "node:test";
import assert from "node:assert/strict";
import { javaFor, loaderLabel } from "../src/lib/versions.ts";

test("Java majors follow Mojang's javaVersion ranges", () => {
  const cases = { "1.16.5": 8, "1.17.1": 16, "1.18.2": 17, "1.19.4": 17, "1.20.4": 17, "1.20.5": 21, "1.21.4": 21, "26.3": 25 };
  for (const [v, j] of Object.entries(cases)) assert.equal(javaFor(v), j, v);
  assert.equal(javaFor("25w14a"), null);
});

test("loader labels distinguish Fabric and Quilt", () => {
  assert.equal(loaderLabel(null), "Vanilla");
  assert.equal(loaderLabel("0.16.9"), "Fabric 0.16.9");
  assert.equal(loaderLabel("quilt:0.26.4"), "Quilt 0.26.4");
});
