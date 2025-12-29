import test from "node:test";
import assert from "node:assert/strict";
import {
  copyToClipboard,
  normalizeBranch,
  selectBranch,
  toggleMenu,
} from "../src/lib/chat-screen-state.js";

test("normalizeBranch falls back to main", () => {
  assert.equal(normalizeBranch("main"), "main");
  assert.equal(normalizeBranch("left"), "left");
  assert.equal(normalizeBranch("right"), "right");
  assert.equal(normalizeBranch("invalid"), "main");
  assert.equal(normalizeBranch(null), "main");
});

test("selectBranch returns a valid selection", () => {
  assert.equal(selectBranch("main", "left"), "left");
  assert.equal(selectBranch("left", "right"), "right");
  assert.equal(selectBranch("right", "invalid"), "main");
});

test("toggleMenu flips the state", () => {
  assert.equal(toggleMenu(false), true);
  assert.equal(toggleMenu(true), false);
});

test("copyToClipboard writes via provided clipboard", async () => {
  const calls = [];
  const clipboard = {
    writeText: async (text) => {
      calls.push(text);
    },
  };

  const result = await copyToClipboard("hello", clipboard);
  assert.equal(result, true);
  assert.deepEqual(calls, ["hello"]);
});

test("copyToClipboard returns false when clipboard is unavailable", async () => {
  const result = await copyToClipboard("hello", null);
  assert.equal(result, false);
});
