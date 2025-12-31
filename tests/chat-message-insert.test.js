import test from "node:test";
import assert from "node:assert/strict";
import { insertAfterMessage } from "../src/lib/chat-message-insert.js";

test("insertAfterMessage inserts after target id", () => {
  const messages = [
    { id: "1", role: "user", content: "A" },
    { id: "2", role: "assistant", content: "B" },
    { id: "3", role: "user", content: "C" },
  ];

  const next = insertAfterMessage(messages, "2", [
    { id: "4", role: "user", content: "branch" },
    { id: "5", role: "assistant", content: "reply" },
  ]);

  assert.deepEqual(next.map((m) => m.id), ["1", "2", "4", "5", "3"]);
});

test("insertAfterMessage appends when target is missing", () => {
  const messages = [{ id: "1", role: "user", content: "A" }];

  const next = insertAfterMessage(messages, "missing", [
    { id: "2", role: "assistant", content: "B" },
  ]);

  assert.deepEqual(next.map((m) => m.id), ["1", "2"]);
});
