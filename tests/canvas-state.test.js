import test from "node:test";
import assert from "node:assert/strict";
import {
  clampOffsets,
  clampScale,
  createCanvasState,
  getPanLimits,
  normalizeScaleRange,
  resetCanvasState,
} from "../src/lib/canvas-state.js";

test("normalizeScaleRange swaps invalid bounds", () => {
  assert.deepEqual(normalizeScaleRange(2, 1), { minScale: 1, maxScale: 2 });
});

test("clampScale enforces bounds", () => {
  assert.equal(clampScale(0.2, 0.6, 1.4), 0.6);
  assert.equal(clampScale(1.8, 0.6, 1.4), 1.4);
  assert.equal(clampScale(1.2, 0.6, 1.4), 1.2);
});

test("getPanLimits uses base pan and scale", () => {
  const limits = getPanLimits({ width: 800, height: 600 }, 1, 0.25);
  assert.deepEqual(limits, { maxX: 150, maxY: 150 });
});

test("clampOffsets keeps values inside limits", () => {
  const limits = { maxX: 120, maxY: 80 };
  assert.deepEqual(clampOffsets({ offsetX: 200, offsetY: -200 }, limits), {
    offsetX: 120,
    offsetY: -80,
  });
});

test("createCanvasState and resetCanvasState return defaults", () => {
  const state = createCanvasState();
  assert.deepEqual(state, { scale: 1, offsetX: 0, offsetY: 0 });
  assert.deepEqual(resetCanvasState(), { scale: 1, offsetX: 0, offsetY: 0 });
});
