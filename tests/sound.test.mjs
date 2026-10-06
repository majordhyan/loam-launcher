import { test } from "node:test";
import assert from "node:assert/strict";

test("audio denial cannot escape into the click handler", async () => {
  globalThis.window = {
    AudioContext: class {
      constructor() {
        throw new Error("device unavailable");
      }
    },
  };
  const sound = await import("../src/sound.ts?denied");
  assert.doesNotThrow(() => sound.playSfx("click"));
});

test("rapid clicks are bounded and ended voices disconnect their graph", async () => {
  const nodes = [];
  const param = {
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
  };
  const node = () => {
    const n = {
      gain: param,
      frequency: param,
      connect() {},
      disconnect() {
        this.disconnected = true;
      },
      start() {},
      stop() {},
      addEventListener(_, callback) {
        this.ended = callback;
      },
    };
    nodes.push(n);
    return n;
  };
  globalThis.window = {
    AudioContext: class {
      state = "running";
      currentTime = 0;
      destination = {};
      createOscillator = node;
      createGain = node;
      createBiquadFilter = node;
    },
  };
  const sound = await import("../src/sound.ts?bounded");
  for (let i = 0; i < 30; i++) sound.playSfx("click");
  assert.equal(nodes.length, 8 * 3);
  nodes.forEach((n) => n.ended?.());
  assert.ok(nodes.every((n) => n.disconnected));
  sound.playSfx("click");
  assert.equal(nodes.length, 9 * 3);
});
