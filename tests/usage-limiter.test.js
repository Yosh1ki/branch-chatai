import test from "node:test";
import assert from "node:assert/strict";
import { isDailyLimitReached } from "../src/lib/usage-limiter-core.ts";

test("isDailyLimitReached returns true at limit", () => {
  assert.equal(isDailyLimitReached(10, 10), true);
});

test("isDailyLimitReached returns false below limit", () => {
  assert.equal(isDailyLimitReached(9, 10), false);
});

test("isDailyLimitReached uses free-plan default limit", () => {
  assert.equal(isDailyLimitReached(10), true);
  assert.equal(isDailyLimitReached(9), false);
});
