import test from "node:test"
import assert from "node:assert/strict"
import { applyQuotaBypassFlagsToStatus } from "../src/lib/usage-quota-core.ts"

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
