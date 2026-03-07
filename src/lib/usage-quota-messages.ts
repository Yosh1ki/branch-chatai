import type { TranslationKey } from "@/lib/i18n"
import type { UsageQuotaStatus } from "@/lib/usage-quota"

export const getUsageLimitErrorMessageKey = (code?: string | null): TranslationKey | null => {
  switch (code) {
    case "freeDailyMessageLimitReached":
      return "errors.freeDailyMessageLimitReached"
    case "freeMonthlyTokenLimitReached":
      return "errors.freeMonthlyTokenLimitReached"
    case "proWeeklyTokenLimitReached":
      return "errors.proWeeklyTokenLimitReached"
    case "proRolling30DayTokenLimitReached":
      return "errors.proRolling30DayTokenLimitReached"
    default:
      return null
  }
}

export const getPrimaryProUsageWindow = (quotaStatus: UsageQuotaStatus) => {
  const weeklyPercent = quotaStatus.weeklyTokens?.percentUsed ?? 0
  const rollingPercent = quotaStatus.rolling30DayTokens?.percentUsed ?? 0

  if (quotaStatus.blockReason === "pro_rolling_30_day_tokens") {
    return "rolling30"
  }
  if (quotaStatus.blockReason === "pro_weekly_tokens") {
    return "weekly"
  }
  return rollingPercent > weeklyPercent ? "rolling30" : "weekly"
}

export const getFreeWarningMessageKey = (quotaStatus: UsageQuotaStatus): TranslationKey | null => {
  if (quotaStatus.planType !== "free") {
    return null
  }

  if (quotaStatus.blockReason === "free_daily_messages") {
    return "chats.freeBlockedMessage"
  }
  if (quotaStatus.blockReason === "free_monthly_tokens") {
    return "chats.freeBlockedToken"
  }
  if (quotaStatus.dailyMessages?.remaining === 1) {
    return "chats.freeWarningMessageLast"
  }
  if (quotaStatus.monthlyTokens?.warningLevel === "95") {
    return "chats.freeWarningToken95"
  }
  if (quotaStatus.monthlyTokens?.warningLevel === "80") {
    return "chats.freeWarningToken80"
  }
  return null
}

export const getProWarningMessageKey = (quotaStatus: UsageQuotaStatus): TranslationKey | null => {
  if (quotaStatus.planType !== "pro") {
    return null
  }

  const primaryWindow = getPrimaryProUsageWindow(quotaStatus)
  const warningLevel =
    primaryWindow === "weekly"
      ? quotaStatus.weeklyTokens?.warningLevel
      : quotaStatus.rolling30DayTokens?.warningLevel

  if (quotaStatus.blockReason === "pro_weekly_tokens") {
    return "chats.proBlockedWeekly"
  }
  if (quotaStatus.blockReason === "pro_rolling_30_day_tokens") {
    return "chats.proBlockedRolling"
  }
  if (warningLevel === "95") {
    return primaryWindow === "weekly"
      ? "chats.proWarningWeekly95"
      : "chats.proWarningRolling95"
  }
  if (warningLevel === "80") {
    return primaryWindow === "weekly"
      ? "chats.proWarningWeekly80"
      : "chats.proWarningRolling80"
  }
  return null
}
