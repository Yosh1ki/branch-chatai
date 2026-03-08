import type { PlanType } from "@prisma/client"
import {
  FREE_PLAN_DAILY_MESSAGE_LIMIT,
  FREE_PLAN_MONTHLY_TOKEN_LIMIT,
  PRO_PLAN_ROLLING_30_DAY_TOKEN_LIMIT,
  PRO_PLAN_WEEKLY_TOKEN_LIMIT,
  USAGE_WARNING_THRESHOLD_HIGH,
  USAGE_WARNING_THRESHOLD_LOW,
} from "@/lib/usage-limits"
import { applyQuotaBypassFlagsToStatus, type UsageLimitReason } from "@/lib/usage-quota-core"

export type { UsageLimitReason } from "@/lib/usage-quota-core"

export type UsageWarningLevel = "none" | "80" | "95"

export type UsageTokenTotals = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type UsageQuotaWindow = {
  hoursUntilReset: number | null
  limit: number
  nextResetAt: string | null
  percentUsed: number
  remaining: number
  used: number
  warningLevel: UsageWarningLevel
}

export type UsageQuotaStatus = {
  blockReason: UsageLimitReason | null
  dailyMessages: UsageQuotaWindow | null
  isBlocked: boolean
  monthlyTokens: UsageQuotaWindow | null
  planType: PlanType
  rolling30DayTokens: UsageQuotaWindow | null
  sourceNow: string
  weeklyTokens: UsageQuotaWindow | null
}

type FreeDailyQuotaWindow = NonNullable<UsageQuotaStatus["dailyMessages"]>
type FreeMonthlyQuotaWindow = NonNullable<UsageQuotaStatus["monthlyTokens"]>
type ProWeeklyQuotaWindow = NonNullable<UsageQuotaStatus["weeklyTokens"]>
type ProRollingQuotaWindow = NonNullable<UsageQuotaStatus["rolling30DayTokens"]>

const clampRemaining = (limit: number, used: number) => Math.max(limit - used, 0)

const getWarningLevel = (used: number, limit: number): UsageWarningLevel => {
  if (limit <= 0) {
    return "none"
  }

  const ratio = used / limit
  if (ratio >= USAGE_WARNING_THRESHOLD_HIGH) {
    return "95"
  }
  if (ratio >= USAGE_WARNING_THRESHOLD_LOW) {
    return "80"
  }
  return "none"
}

export const buildQuotaWindow = ({
  hoursUntilReset = null,
  limit,
  nextResetAt = null,
  used,
}: {
  hoursUntilReset?: number | null
  limit: number
  nextResetAt?: string | null
  used: number
}): UsageQuotaWindow => ({
  hoursUntilReset,
  limit,
  nextResetAt,
  percentUsed: limit > 0 ? Math.min(used / limit, 1) : 0,
  remaining: clampRemaining(limit, used),
  used,
  warningLevel: getWarningLevel(used, limit),
})

export const normalizePlanType = (planType: string | null | undefined): PlanType =>
  planType === "pro" ? "pro" : "free"

export const createEmptyTokenTotals = (): UsageTokenTotals => ({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
})

export const sanitizeTokenTotals = (usage?: Partial<UsageTokenTotals> | null): UsageTokenTotals => {
  const inputTokens = Math.max(0, Math.floor(usage?.inputTokens ?? 0))
  const outputTokens = Math.max(0, Math.floor(usage?.outputTokens ?? 0))
  const computedTotal = inputTokens + outputTokens
  const totalTokens = Math.max(
    computedTotal,
    Math.floor(usage?.totalTokens ?? computedTotal)
  )

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  }
}

const resolveHoursUntilReset = (window: {
  hoursUntilReset: number | null
  nextResetAt: string | null
}) => {
  if (typeof window.hoursUntilReset === "number") {
    return window.hoursUntilReset
  }

  if (!window.nextResetAt) {
    return 0
  }

  const resetAt = new Date(window.nextResetAt)
  if (Number.isNaN(resetAt.getTime())) {
    return 0
  }

  return Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / (60 * 60 * 1000)))
}

export const createFreeQuotaStatus = ({
  dailyMessagesUsed,
  hoursUntilDailyReset,
  hoursUntilMonthlyReset,
  monthlyTokensUsed,
  nextDailyResetAt,
  nextMonthlyResetAt,
  sourceNow,
}: {
  dailyMessagesUsed: number
  hoursUntilDailyReset: number
  hoursUntilMonthlyReset: number
  monthlyTokensUsed: number
  nextDailyResetAt: string
  nextMonthlyResetAt: string
  sourceNow: string
}): UsageQuotaStatus => {
  const dailyMessages = buildQuotaWindow({
    hoursUntilReset: hoursUntilDailyReset,
    limit: FREE_PLAN_DAILY_MESSAGE_LIMIT,
    nextResetAt: nextDailyResetAt,
    used: dailyMessagesUsed,
  })
  const monthlyTokens = buildQuotaWindow({
    hoursUntilReset: hoursUntilMonthlyReset,
    limit: FREE_PLAN_MONTHLY_TOKEN_LIMIT,
    nextResetAt: nextMonthlyResetAt,
    used: monthlyTokensUsed,
  })
  const blockReason = dailyMessages.remaining === 0
    ? "free_daily_messages"
    : monthlyTokens.remaining === 0
      ? "free_monthly_tokens"
      : null

  return {
    blockReason,
    dailyMessages,
    isBlocked: blockReason !== null,
    monthlyTokens,
    planType: "free",
    rolling30DayTokens: null,
    sourceNow,
    weeklyTokens: null,
  }
}

export const createProQuotaStatus = ({
  hoursUntilWeeklyReset,
  nextWeeklyResetAt,
  rolling30DayTokensUsed,
  sourceNow,
  weeklyTokensUsed,
}: {
  hoursUntilWeeklyReset: number
  nextWeeklyResetAt: string
  rolling30DayTokensUsed: number
  sourceNow: string
  weeklyTokensUsed: number
}): UsageQuotaStatus => {
  const weeklyTokens = buildQuotaWindow({
    hoursUntilReset: hoursUntilWeeklyReset,
    limit: PRO_PLAN_WEEKLY_TOKEN_LIMIT,
    nextResetAt: nextWeeklyResetAt,
    used: weeklyTokensUsed,
  })
  const rolling30DayTokens = buildQuotaWindow({
    limit: PRO_PLAN_ROLLING_30_DAY_TOKEN_LIMIT,
    used: rolling30DayTokensUsed,
  })
  const blockReason = weeklyTokens.remaining === 0
    ? "pro_weekly_tokens"
    : rolling30DayTokens.remaining === 0
      ? "pro_rolling_30_day_tokens"
      : null

  return {
    blockReason,
    dailyMessages: null,
    isBlocked: blockReason !== null,
    monthlyTokens: null,
    planType: "pro",
    rolling30DayTokens,
    sourceNow,
    weeklyTokens,
  }
}

export const applyQuotaBypassFlags = (
  quotaStatus: UsageQuotaStatus,
  options: { disableDailyLimit?: boolean } = {}
): UsageQuotaStatus => applyQuotaBypassFlagsToStatus(quotaStatus, options)

export const sanitizeQuotaStatusForClient = (
  quotaStatus: UsageQuotaStatus
): UsageQuotaStatus => {
  if (quotaStatus.planType !== "pro") {
    return quotaStatus
  }

  return {
    ...quotaStatus,
    blockReason:
      quotaStatus.blockReason === "pro_rolling_30_day_tokens" ? null : quotaStatus.blockReason,
    rolling30DayTokens: null,
  }
}

export const applyUsageToQuotaStatus = (
  quotaStatus: UsageQuotaStatus | null | undefined,
  usage?: Partial<UsageTokenTotals> | null
): UsageQuotaStatus | undefined => {
  if (!quotaStatus) {
    return undefined
  }

  const tokenTotals = sanitizeTokenTotals(usage)

  if (quotaStatus.planType === "free") {
    const dailyMessages = quotaStatus.dailyMessages as FreeDailyQuotaWindow | null
    const monthlyTokens = quotaStatus.monthlyTokens as FreeMonthlyQuotaWindow | null

    if (!dailyMessages || !monthlyTokens) {
      return quotaStatus
    }

    return createFreeQuotaStatus({
      dailyMessagesUsed: dailyMessages.used + 1,
      hoursUntilDailyReset: resolveHoursUntilReset(dailyMessages),
      hoursUntilMonthlyReset: resolveHoursUntilReset(monthlyTokens),
      monthlyTokensUsed: monthlyTokens.used + tokenTotals.totalTokens,
      nextDailyResetAt: dailyMessages.nextResetAt ?? quotaStatus.sourceNow,
      nextMonthlyResetAt: monthlyTokens.nextResetAt ?? quotaStatus.sourceNow,
      sourceNow: new Date().toISOString(),
    })
  }

  const weeklyTokens = quotaStatus.weeklyTokens as ProWeeklyQuotaWindow | null
  const rolling30DayTokens = quotaStatus.rolling30DayTokens as ProRollingQuotaWindow | null

  if (!weeklyTokens || !rolling30DayTokens) {
    return quotaStatus
  }

  return createProQuotaStatus({
    hoursUntilWeeklyReset: resolveHoursUntilReset(weeklyTokens),
    nextWeeklyResetAt: weeklyTokens.nextResetAt ?? quotaStatus.sourceNow,
    rolling30DayTokensUsed: rolling30DayTokens.used + tokenTotals.totalTokens,
    sourceNow: new Date().toISOString(),
    weeklyTokensUsed: weeklyTokens.used + tokenTotals.totalTokens,
  })
}
