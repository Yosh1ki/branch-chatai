import test from "node:test"
import assert from "node:assert/strict"
import {
  resolveDailyLimitUsageDay,
  resolveUsageDayFromNow,
  validateDailyLimitWindow,
} from "../src/lib/usage-day.ts"

const toDateKey = (value) => value.toISOString().slice(0, 10)

test("resolveUsageDayFromNow returns previous day before reset boundary", () => {
  const usageDay = resolveUsageDayFromNow(new Date("2026-02-19T18:59:00.000Z"), {
    timeZone: "Asia/Tokyo",
    resetHour: 4,
    resetMinute: 0,
  })

  assert.equal(toDateKey(usageDay), "2026-02-19")
})

test("resolveUsageDayFromNow returns same day at reset boundary", () => {
  const usageDay = resolveUsageDayFromNow(new Date("2026-02-19T19:00:00.000Z"), {
    timeZone: "Asia/Tokyo",
    resetHour: 4,
    resetMinute: 0,
  })

  assert.equal(toDateKey(usageDay), "2026-02-20")
})

test("validateDailyLimitWindow rejects invalid timezone and reset time", () => {
  assert.throws(
    () =>
      validateDailyLimitWindow({
        timeZone: "Invalid/TZ",
        resetHour: 0,
        resetMinute: 0,
      }),
    /Invalid daily limit time zone/
  )

  assert.throws(
    () =>
      validateDailyLimitWindow({
        timeZone: "Asia/Tokyo",
        resetHour: 24,
        resetMinute: 0,
      }),
    /Invalid daily limit reset hour/
  )

  assert.throws(
    () =>
      validateDailyLimitWindow({
        timeZone: "Asia/Tokyo",
        resetHour: 0,
        resetMinute: 60,
      }),
    /Invalid daily limit reset minute/
  )
})

test("resolveDailyLimitUsageDay uses database now as source time", async () => {
  const result = await resolveDailyLimitUsageDay({
    prismaClient: {
      $queryRaw: async () => [{ db_now: new Date("2026-02-20T03:04:05.000Z") }],
    },
    window: {
      timeZone: "Asia/Tokyo",
      resetHour: 0,
      resetMinute: 0,
    },
  })

  assert.equal(toDateKey(result.usageDay), "2026-02-20")
  assert.equal(result.timeZone, "Asia/Tokyo")
  assert.equal(result.resetHour, 0)
  assert.equal(result.resetMinute, 0)
})
