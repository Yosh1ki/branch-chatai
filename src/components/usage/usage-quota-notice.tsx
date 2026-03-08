"use client"

import { UpgradeButton } from "@/components/billing/upgrade-button"
import { useI18n } from "@/components/i18n/i18n-provider"
import {
  getFreeWarningMessageKey,
  getProWarningMessageKey,
} from "@/lib/usage-quota-messages"
import type { UsageQuotaStatus } from "@/lib/usage-quota"

type UsageQuotaNoticeProps = {
  quotaStatus: UsageQuotaStatus
  showUsageDetails?: boolean
}

export function UsageQuotaNotice({
  quotaStatus,
  showUsageDetails = true,
}: UsageQuotaNoticeProps) {
  const { locale, t } = useI18n()
  const numberFormatter = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US")

  if (quotaStatus.planType === "free") {
    const warningMessageKey = getFreeWarningMessageKey(quotaStatus)
    const dailyMessages = quotaStatus.dailyMessages
    const monthlyTokens = quotaStatus.monthlyTokens

    if (!dailyMessages || !monthlyTokens) {
      return null
    }

    const shouldShowUsageDetails = showUsageDetails
    const shouldShowWarning = warningMessageKey !== null
    const shouldShowUpgrade = quotaStatus.isBlocked

    if (!shouldShowUsageDetails && !shouldShowWarning && !shouldShowUpgrade) {
      return null
    }

    return (
      <div className="grid gap-3 rounded-3xl bg-[color-mix(in_srgb,#f59e0b_10%,transparent)] p-4 text-[#b45309]">
        {shouldShowUsageDetails ? (
          <div className="grid gap-1 text-sm font-medium text-inherit">
            <p>
              {t("chats.freeRemainingMessages", {
                limit: numberFormatter.format(dailyMessages.limit),
                remaining: numberFormatter.format(dailyMessages.remaining),
              })}
            </p>
            <p>
              {t("chats.freeRemainingTokens", {
                limit: numberFormatter.format(monthlyTokens.limit),
                remaining: numberFormatter.format(monthlyTokens.remaining),
              })}
            </p>
          </div>
        ) : null}
        {shouldShowWarning ? (
          <p className="text-sm font-semibold text-inherit">{t(warningMessageKey)}</p>
        ) : null}
        {shouldShowUpgrade ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-inherit">{t("chats.freeUpsell")}</p>
            <UpgradeButton />
          </div>
        ) : null}
      </div>
    )
  }

  const warningMessageKey = getProWarningMessageKey(quotaStatus)
  if (!warningMessageKey) {
    return null
  }

  const showWeeklySubtext = quotaStatus.blockReason === "pro_weekly_tokens"
  const hours = quotaStatus.weeklyTokens?.hoursUntilReset ?? 0

  return (
    <div className="grid gap-2 rounded-3xl border border-[color-mix(in_srgb,var(--color-border-soft)_45%,#d97706_55%)] bg-[color-mix(in_srgb,#f59e0b_8%,transparent)] p-4 text-[#b45309]">
      <p className="text-sm font-semibold text-inherit">{t(warningMessageKey)}</p>
      {showWeeklySubtext ? (
        <p className="text-sm font-medium text-[#c2410c]">
          {t("chats.proBlockedWeeklySub", { hours: numberFormatter.format(hours) })}
        </p>
      ) : null}
      {showUsageDetails && !quotaStatus.isBlocked && quotaStatus.weeklyTokens ? (
        <p className="text-sm font-medium text-[#c2410c]">
          {numberFormatter.format(quotaStatus.weeklyTokens.remaining)} /{" "}
          {numberFormatter.format(quotaStatus.weeklyTokens.limit)}
        </p>
      ) : null}
    </div>
  )
}
