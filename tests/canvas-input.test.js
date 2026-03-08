import test from "node:test";
import assert from "node:assert/strict";
import { getPointerDragBehavior, getWheelBehavior } from "../src/lib/canvas-input.js";

test("getPointerDragBehavior allows desktop drag only with meta key", () => {
  assert.deepEqual(
    getPointerDragBehavior({ isMetaPressed: true, isInteractiveTarget: false }),
    { allowDrag: true, allowSelection: false }
  );
  assert.deepEqual(
    getPointerDragBehavior({
      isMetaPressed: false,
      isInteractiveTarget: false,
      pointerType: "mouse",
    }),
    { allowDrag: false, allowSelection: false }
  );
});

test("getPointerDragBehavior allows touch drag on non-interactive targets", () => {
  assert.deepEqual(
    getPointerDragBehavior({
      isMetaPressed: false,
      isInteractiveTarget: false,
      pointerType: "touch",
    }),
    { allowDrag: true, allowSelection: false }
  );
});

test("getPointerDragBehavior blocks drag on interactive targets", () => {
  assert.deepEqual(
    getPointerDragBehavior({ isMetaPressed: false, isInteractiveTarget: true }),
    { allowDrag: false, allowSelection: true }
  );
  assert.deepEqual(
    getPointerDragBehavior({ isMetaPressed: true, isInteractiveTarget: true }),
    { allowDrag: true, allowSelection: false }
  );
});

test("getWheelBehavior pans without ctrlKey", () => {
  assert.deepEqual(getWheelBehavior({ isCtrlPressed: false }), { mode: "pan" });
});

test("getWheelBehavior zooms with ctrlKey", () => {
  assert.deepEqual(getWheelBehavior({ isCtrlPressed: true }), { mode: "zoom" });
});
