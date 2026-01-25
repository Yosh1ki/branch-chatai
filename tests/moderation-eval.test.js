import test from "node:test";
import assert from "node:assert/strict";
import { evaluateModerationResult } from "../src/lib/moderation-eval.js";

test("evaluateModerationResult blocks when flagged", () => {
  const result = evaluateModerationResult({
    flagged: true,
    category_scores: {},
  });

  assert.equal(result.blocked, true);
  assert.equal(result.reason, "flagged");
});

test("evaluateModerationResult blocks critical categories at low threshold", () => {
  const result = evaluateModerationResult({
    flagged: false,
    category_scores: {
      "sexual/minors": 0.25,
    },
  });

  assert.equal(result.blocked, true);
  assert.equal(result.reason, "critical_threshold");
});

test("evaluateModerationResult blocks non-critical at higher threshold", () => {
  const result = evaluateModerationResult({
    flagged: false,
    category_scores: {
      harassment: 0.6,
    },
  });

  assert.equal(result.blocked, true);
  assert.equal(result.reason, "default_threshold");
});
