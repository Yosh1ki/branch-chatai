import test from "node:test";
import assert from "node:assert/strict";
import { parseMemorySummary } from "../src/lib/memory-summary.js";

test("parseMemorySummary extracts JSON payload", () => {
  const payload = {
    summary: "Summary text.",
    key_facts: ["A", "B"],
    user_goal: "Testing",
    action_items: ["Do something"],
    sentiment: "neutral",
    entities: ["Entity"],
    last_updated: "2026-01-24T12:34:56Z",
    turn_count: 12,
  };
  const text = `Here you go:\\n\\n${JSON.stringify(payload)}\\n`;

  const result = parseMemorySummary(text);

  assert.equal(result.summary, payload.summary);
  assert.equal(result.user_goal, payload.user_goal);
  assert.equal(result.turn_count, payload.turn_count);
});

test("parseMemorySummary handles fenced JSON", () => {
  const text = `\`\`\`json
{
  "summary": "ok",
  "key_facts": []
}
\`\`\``;
  const result = parseMemorySummary(text);

  assert.equal(result.summary, "ok");
  assert.deepEqual(result.key_facts, []);
});
