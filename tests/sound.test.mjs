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
  assert.doesNotThrow(() => sound.playSfx("launch"));
});

test("voices are capped and every finished voice releases its nodes", async () => {
  const nodes = [];
  const param = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} };
  const node = () => {
    const n = {
      gain: param, frequency: param, detune: param, Q: param, delayTime: param, threshold: param, ratio: param,
      connect() {}, start() {}, stop() {},
      disconnect() { this.disconnected = true; },
      addEventListener(_, callback) { this.ended = callback; },
    };
    nodes.push(n);
    return n;
  };
  globalThis.window = {
    AudioContext: class {
      state = "running";
      currentTime = 0;
      sampleRate = 48000;
      destination = {};
      createOscillator = node;
      createGain = node;
      createBiquadFilter = node;
      createDynamicsCompressor = node;
      createDelay = node;
      createBufferSource = node;
      createBuffer = () => ({ sampleRate: 48000, getChannelData: () => new Float32Array(16) });
    },
  };
  // Repeats closer than 45 ms collapse, so step the clock between clicks.
  let now = 0;
  const realNow = performance.now;
  performance.now = () => (now += 50);
  try {
    const sound = await import("../src/sound.ts?bounded");
    sound.playSfx("click");
    // The first sound also builds the master bus (6 nodes) that lives for the session.
    const bus = nodes.slice(0, 6);
    const perClick = nodes.length - bus.length;
    for (let i = 0; i < 30; i++) sound.playSfx("click");
    assert.equal(nodes.length, bus.length + perClick * 10, "at most 10 voices at once");
    nodes.forEach((n) => n.ended?.());
    assert.ok(nodes.slice(6).every((n) => n.disconnected), "finished voices disconnect");
    assert.ok(bus.every((n) => !n.disconnected), "the master bus stays connected");
    sound.playSfx("click");
    assert.equal(nodes.length, bus.length + perClick * 11, "a new voice plays after release");
  } finally {
    performance.now = realNow;
  }
});
