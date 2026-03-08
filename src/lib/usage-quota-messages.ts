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

  if (quotaStatus.blockReason === "pro_weekly_tokens") {
    return "chats.proBlockedWeekly"
  }
  if (quotaStatus.isBlocked) {
    return "chats.proBlockedRolling"
  }
  if (quotaStatus.weeklyTokens?.warningLevel === "95") {
    return "chats.proWarningWeekly95"
  }
  if (quotaStatus.weeklyTokens?.warningLevel === "80") {
    return "chats.proWarningWeekly80"
  }
  return null
}
