import test from "node:test";
import assert from "node:assert/strict";
import {
  createChatPromptState,
  chatPromptReducer,
} from "../src/lib/chat-prompt-state.js";

test("submit trims prompt and clears input", () => {
  const state = {
    ...createChatPromptState(),
    promptText: " こんにちは ",
  };

  const next = chatPromptReducer(state, { type: "submit" });

  assert.equal(next.userMessage, "こんにちは");
  assert.equal(next.promptText, "");
  assert.equal(next.isSubmitting, true);
  assert.equal(next.errorMessage, "");
  assert.equal(next.hasSubmitted, true);
});

test("receive stores assistant response and stops loading", () => {
  const state = {
    ...createChatPromptState(),
    isSubmitting: true,
  };

  const next = chatPromptReducer(state, {
    type: "receive",
    userMessage: "質問です",
    assistantMessage: "回答です",
  });

  assert.equal(next.userMessage, "質問です");
  assert.equal(next.assistantMessage, "回答です");
  assert.equal(next.isSubmitting, false);
  assert.equal(next.errorMessage, "");
  assert.equal(next.hasSubmitted, true);
});

test("sync-latest updates when there is no local submission", () => {
  const state = createChatPromptState();

  const next = chatPromptReducer(state, {
    type: "sync-latest",
    userMessage: "既存ユーザー",
    assistantMessage: "既存アシスタント",
  });

  assert.equal(next.userMessage, "既存ユーザー");
  assert.equal(next.assistantMessage, "既存アシスタント");
});

test("sync-latest does not override after submission", () => {
  const state = {
    ...createChatPromptState(),
    hasSubmitted: true,
    userMessage: "ローカル",
    assistantMessage: "ローカル応答",
  };

  const next = chatPromptReducer(state, {
    type: "sync-latest",
    userMessage: "サーバー",
    assistantMessage: "サーバー応答",
  });

  assert.equal(next.userMessage, "ローカル");
  assert.equal(next.assistantMessage, "ローカル応答");
});
