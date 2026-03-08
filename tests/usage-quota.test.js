import test from "node:test"
import assert from "node:assert/strict"
import { applyQuotaBypassFlagsToStatus } from "../src/lib/usage-quota-core.ts"
import { sanitizeQuotaStatusForClient } from "../src/lib/usage-quota.ts"
import { getProWarningMessageKey } from "../src/lib/usage-quota-messages.ts"

test("applyQuotaBypassFlags clears only the free daily block when daily limits are disabled", () => {
  const quotaStatus = {
    blockReason: "free_daily_messages",
    isBlocked: true,
    dailyMessages: { used: 5 },
  }

  const bypassed = applyQuotaBypassFlagsToStatus(quotaStatus, { disableDailyLimit: true })

  assert.equal(bypassed.blockReason, null)
  assert.equal(bypassed.isBlocked, false)
  assert.equal(bypassed.dailyMessages?.used, 5)
})

test("applyQuotaBypassFlags keeps monthly free token blocks intact", () => {
  const quotaStatus = {
    blockReason: "free_monthly_tokens",
    isBlocked: true,
  }

  const bypassed = applyQuotaBypassFlagsToStatus(quotaStatus, { disableDailyLimit: true })

  assert.equal(bypassed.blockReason, "free_monthly_tokens")
  assert.equal(bypassed.isBlocked, true)
})

test("applyQuotaBypassFlags does not bypass pro token blocks", () => {
  const quotaStatus = {
    blockReason: "pro_weekly_tokens",
    isBlocked: true,
  }

  const bypassed = applyQuotaBypassFlagsToStatus(quotaStatus, { disableDailyLimit: true })

  assert.equal(bypassed.blockReason, "pro_weekly_tokens")
  assert.equal(bypassed.isBlocked, true)
})

test("sanitizeQuotaStatusForClient hides pro rolling 30-day details", () => {
  const quotaStatus = {
    blockReason: "pro_rolling_30_day_tokens",
    dailyMessages: null,
    isBlocked: true,
    monthlyTokens: null,
    planType: "pro",
    rolling30DayTokens: {
      limit: 650000,
      percentUsed: 1,
      remaining: 0,
      used: 650000,
      warningLevel: "95",
    },
    sourceNow: "2026-03-08T00:00:00.000Z",
    weeklyTokens: {
      hoursUntilReset: 24,
      limit: 150000,
      nextResetAt: "2026-03-09T00:00:00.000Z",
      percentUsed: 0.4,
      remaining: 90000,
      used: 60000,
      warningLevel: "none",
    },
  }

  const sanitized = sanitizeQuotaStatusForClient(quotaStatus)

  assert.equal(sanitized.blockReason, null)
  assert.equal(sanitized.isBlocked, true)
  assert.equal(sanitized.rolling30DayTokens, null)
  assert.equal(sanitized.weeklyTokens?.used, 60000)
})

test("getProWarningMessageKey ignores rolling 30-day warning levels", () => {
  const warningKey = getProWarningMessageKey({
    blockReason: null,
    dailyMessages: null,
    isBlocked: false,
    monthlyTokens: null,
    planType: "pro",
    rolling30DayTokens: {
      limit: 650000,
      percentUsed: 0.95,
      remaining: 32500,
      used: 617500,
      warningLevel: "95",
    },
    sourceNow: "2026-03-08T00:00:00.000Z",
    weeklyTokens: {
      hoursUntilReset: 24,
      limit: 150000,
      nextResetAt: "2026-03-09T00:00:00.000Z",
      percentUsed: 0.3,
      remaining: 105000,
      used: 45000,
      warningLevel: "none",
    },
  })

  assert.equal(warningKey, null)
})

test("getProWarningMessageKey returns a generic block message for hidden pro caps", () => {
  const warningKey = getProWarningMessageKey({
    blockReason: null,
    dailyMessages: null,
    isBlocked: true,
    monthlyTokens: null,
    planType: "pro",
    rolling30DayTokens: null,
    sourceNow: "2026-03-08T00:00:00.000Z",
    weeklyTokens: {
      hoursUntilReset: 24,
      limit: 150000,
      nextResetAt: "2026-03-09T00:00:00.000Z",
      percentUsed: 0.4,
      remaining: 90000,
      used: 60000,
      warningLevel: "none",
    },
  })

  assert.equal(warningKey, "chats.proBlockedRolling")
})
