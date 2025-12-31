import test from "node:test";
import assert from "node:assert/strict";
import {
  createBranchDraftState,
  branchDraftReducer,
} from "../src/lib/chat-branch-state.js";

test("open-branch sets active branch and clears text", () => {
  const state = {
    ...createBranchDraftState(),
    text: "old",
  };

  const next = branchDraftReducer(state, {
    type: "open-branch",
    parentMessageId: "parent-1",
    side: "left",
  });

  assert.equal(next.active?.parentMessageId, "parent-1");
  assert.equal(next.active?.side, "left");
  assert.equal(next.text, "");
});

test("set-text updates the draft text", () => {
  const state = createBranchDraftState();
  const next = branchDraftReducer(state, {
    type: "set-text",
    value: "hello",
  });

  assert.equal(next.text, "hello");
});

test("close-branch clears active branch and text", () => {
  const state = {
    active: { parentMessageId: "parent-1", side: "right" },
    text: "draft",
  };

  const next = branchDraftReducer(state, { type: "close-branch" });

  assert.equal(next.active, null);
  assert.equal(next.text, "");
});
