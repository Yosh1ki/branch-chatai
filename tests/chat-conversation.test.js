import test from "node:test";
import assert from "node:assert/strict";
import { groupConversationPairs } from "../src/lib/chat-conversation.js";

test("groupConversationPairs pairs user and assistant messages in order", () => {
  const messages = [
    { id: "1", role: "user", content: "A" },
    { id: "2", role: "assistant", content: "B" },
    { id: "3", role: "user", content: "C" },
    { id: "4", role: "assistant", content: "D" },
  ];

  const pairs = groupConversationPairs(messages);

  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].user?.content, "A");
  assert.equal(pairs[0].assistant?.content, "B");
  assert.equal(pairs[1].user?.content, "C");
  assert.equal(pairs[1].assistant?.content, "D");
});

test("groupConversationPairs keeps unmatched trailing user message", () => {
  const messages = [
    { id: "1", role: "user", content: "A" },
    { id: "2", role: "assistant", content: "B" },
    { id: "3", role: "user", content: "C" },
  ];

  const pairs = groupConversationPairs(messages);

  assert.equal(pairs.length, 2);
  assert.equal(pairs[1].user?.content, "C");
  assert.equal(pairs[1].assistant, null);
});

test("groupConversationPairs keeps assistant message without preceding user", () => {
  const messages = [{ id: "1", role: "assistant", content: "B" }];

  const pairs = groupConversationPairs(messages);

  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].user, null);
  assert.equal(pairs[0].assistant?.content, "B");
});
