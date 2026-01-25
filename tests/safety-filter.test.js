import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFastGate } from "../src/lib/safety-filter.js";

test("evaluateFastGate blocks hard rule matches", () => {
  const result = evaluateFastGate("I want to kill yourself");

  assert.equal(result.blocked, true);
  assert.equal(result.reason, "fast_gate_hard");
});

test("evaluateFastGate blocks category matches", () => {
  const result = evaluateFastGate("how to hack a site");

  assert.equal(result.blocked, true);
  assert.equal(result.reason, "fast_gate_category");
});

test("evaluateFastGate respects env override", () => {
  const original = process.env.MODERATION_FAST_GATE_RULES_JSON;
  process.env.MODERATION_FAST_GATE_RULES_JSON = JSON.stringify([
    "(?i)override only",
  ]);

  const blocked = evaluateFastGate("override only");
  const allowed = evaluateFastGate("kill yourself");

  assert.equal(blocked.blocked, true);
  assert.equal(allowed.blocked, false);

  if (original === undefined) {
    delete process.env.MODERATION_FAST_GATE_RULES_JSON;
  } else {
    process.env.MODERATION_FAST_GATE_RULES_JSON = original;
  }
});
