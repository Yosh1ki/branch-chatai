export type UsageLimitReason =
  | "free_daily_messages"
  | "free_monthly_tokens"
  | "pro_weekly_tokens"
  | "pro_rolling_30_day_tokens"

export const applyQuotaBypassFlagsToStatus = <
  T extends { blockReason: UsageLimitReason | null; isBlocked: boolean }
>(
  quotaStatus: T,
  options: { disableDailyLimit?: boolean } = {}
): T => {
  if (!options.disableDailyLimit || quotaStatus.blockReason !== "free_daily_messages") {
    return quotaStatus
  }

  return {
    ...quotaStatus,
    blockReason: null,
    isBlocked: false,
  }
}
