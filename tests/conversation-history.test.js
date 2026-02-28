import test from "node:test";
import assert from "node:assert/strict";
import { buildParentChain } from "../src/lib/conversation-history-core.ts";

test("buildParentChain returns ordered parent chain", () => {
  const messages = [
    {
      id: "1",
      role: "user",
      content: "A",
      parentMessageId: null,
    },
    {
      id: "2",
      role: "assistant",
      content: "B",
      parentMessageId: "1",
    },
    {
      id: "3",
      role: "user",
      content: "C",
      parentMessageId: "2",
    },
  ];

  const chain = buildParentChain(messages, "3");

  assert.deepEqual(
    chain.map((message) => message.id),
    ["1", "2", "3"]
  );
});

test("buildParentChain returns empty array when parent id is missing", () => {
  const messages = [
    { id: "1", role: "user", content: "A", parentMessageId: null },
  ];

  const chain = buildParentChain(messages, "missing");

  assert.deepEqual(chain, []);
});
