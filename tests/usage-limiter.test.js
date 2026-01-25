import test from "node:test";
import assert from "node:assert/strict";
import { isDailyLimitReached } from "../src/lib/usage-limiter.js";

test("isDailyLimitReached returns true at limit", () => {
  assert.equal(isDailyLimitReached(10, 10), true);
});

test("isDailyLimitReached returns false below limit", () => {
  assert.equal(isDailyLimitReached(9, 10), false);
});
