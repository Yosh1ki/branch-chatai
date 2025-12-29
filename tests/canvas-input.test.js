import test from "node:test";
import assert from "node:assert/strict";
import { getPointerDragBehavior, getWheelBehavior } from "../src/lib/canvas-input.js";

test("getPointerDragBehavior allows drag only with meta key", () => {
  assert.deepEqual(
    getPointerDragBehavior({ isMetaPressed: true, isSelectableTarget: false }),
    { allowDrag: true, allowSelection: false }
  );
  assert.deepEqual(
    getPointerDragBehavior({ isMetaPressed: false, isSelectableTarget: false }),
    { allowDrag: false, allowSelection: false }
  );
});

test("getPointerDragBehavior allows selection only on selectable targets", () => {
  assert.deepEqual(
    getPointerDragBehavior({ isMetaPressed: false, isSelectableTarget: true }),
    { allowDrag: false, allowSelection: true }
  );
  assert.deepEqual(
    getPointerDragBehavior({ isMetaPressed: true, isSelectableTarget: true }),
    { allowDrag: true, allowSelection: false }
  );
});

test("getWheelBehavior pans without ctrlKey", () => {
  assert.deepEqual(getWheelBehavior({ isCtrlPressed: false }), { mode: "pan" });
});

test("getWheelBehavior zooms with ctrlKey", () => {
  assert.deepEqual(getWheelBehavior({ isCtrlPressed: true }), { mode: "zoom" });
});
