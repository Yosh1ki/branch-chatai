import test from "node:test"
import assert from "node:assert/strict"
import { isDailyLimitReached } from "../src/lib/usage-limiter-core.ts"
import { FREE_PLAN_DAILY_MESSAGE_LIMIT } from "../src/lib/usage-limits.ts"

test("isDailyLimitReached returns true at limit", () => {
  assert.equal(isDailyLimitReached(5, 5), true)
})

test("isDailyLimitReached returns false below limit", () => {
  assert.equal(isDailyLimitReached(4, 5), false)
})

test("isDailyLimitReached uses free-plan default limit", () => {
  assert.equal(isDailyLimitReached(5), true)
  assert.equal(isDailyLimitReached(4), false)
})

test("free-plan default limit constant remains 5", () => {
  assert.equal(FREE_PLAN_DAILY_MESSAGE_LIMIT, 5)
})
