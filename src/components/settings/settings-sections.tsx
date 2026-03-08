import Link from "next/link"

import { UpgradeActionButton } from "@/components/billing/upgrade-action-button"
import { LanguageToggle } from "@/components/i18n/language-toggle"
import { DeleteAccountSection } from "@/components/settings/delete-account-section"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { createTranslator } from "@/lib/i18n"
import { createLegalFooterLinks } from "@/lib/legal-links"
import type { LocaleCode } from "@/lib/i18n/types"
import { getLoginPricingPlans } from "@/lib/pricing-plans"
import type { SettingsViewData } from "@/lib/settings-view"
import {
  DAILY_LIMIT_RESET_HOUR,
  DAILY_LIMIT_RESET_MINUTE,
  DAILY_LIMIT_TIME_ZONE,
} from "@/lib/usage-limits"

type SettingsSectionsProps = {
  locale: LocaleCode
  settings: SettingsViewData
}

export function SettingsSections({ locale, settings }: SettingsSectionsProps) {
  const t = createTranslator(locale)
  const numberFormatter = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US")
  const legalLinks = createLegalFooterLinks(locale).filter((link) => link.href !== "/login")
  const pricingPlans = getLoginPricingPlans(t)
  const resetTimeLabel = `${String(DAILY_LIMIT_RESET_HOUR).padStart(2, "0")}:${String(
    DAILY_LIMIT_RESET_MINUTE
  ).padStart(2, "0")}`

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-(--color-border-soft) bg-(--color-surface)/90 p-6 shadow-(--color-shadow-card)">
        <h2 className="text-xl font-semibold text-main">{t("settings.accountTitle")}</h2>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-main-muted">{t("settings.name")}</span>
            <span className="text-sm font-semibold text-main">{settings.name ?? t("settings.unset")}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-main-muted">{t("settings.email")}</span>
            <span className="text-sm font-semibold text-main">{settings.email ?? t("settings.unset")}</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-(--color-border-soft) bg-(--color-surface)/90 p-6 shadow-(--color-shadow-card)">
        <h2 className="text-xl font-semibold text-main">{t("settings.planTitle")}</h2>

        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm text-main-muted">{t("settings.currentPlan")}</span>
          <span className="rounded-full bg-(--color-surface-soft) px-3 py-1 text-xs font-bold uppercase tracking-wide text-main">
            {settings.planType}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {settings.planType === "free" && settings.quotaStatus.dailyMessages ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-main-muted">{t("settings.dailyMessagesLabel")}</span>
                <span className="font-semibold text-main">
                  {numberFormatter.format(settings.quotaStatus.dailyMessages.used)} /{" "}
                  {numberFormatter.format(settings.quotaStatus.dailyMessages.limit)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-surface-soft)">
                <div
                  className="h-full bg-main transition-all"
                  style={{
                    width: `${Math.round(settings.quotaStatus.dailyMessages.percentUsed * 100)}%`,
                  }}
                />
              </div>
            </>
          ) : null}
          {settings.planType === "free" && settings.quotaStatus.monthlyTokens ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-main-muted">{t("settings.monthlyTokensLabel")}</span>
              <span className="font-semibold text-main">
                {numberFormatter.format(settings.quotaStatus.monthlyTokens.used)} /{" "}
                {numberFormatter.format(settings.quotaStatus.monthlyTokens.limit)}
              </span>
            </div>
          ) : null}
          {settings.planType === "pro" && settings.quotaStatus.weeklyTokens ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-main-muted">{t("settings.weeklyTokensLabel")}</span>
              <span className="font-semibold text-main">
                {numberFormatter.format(settings.quotaStatus.weeklyTokens.used)} /{" "}
                {numberFormatter.format(settings.quotaStatus.weeklyTokens.limit)}
              </span>
            </div>
          ) : null}
          {settings.planType === "pro" && settings.quotaStatus.rolling30DayTokens ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-main-muted">{t("settings.rolling30DaysTokensLabel")}</span>
              <span className="font-semibold text-main">
                {numberFormatter.format(settings.quotaStatus.rolling30DayTokens.used)} /{" "}
                {numberFormatter.format(settings.quotaStatus.rolling30DayTokens.limit)}
              </span>
            </div>
          ) : null}
          {settings.planType === "free" ? (
            <>
              <p className="text-xs text-main-muted">
                {t("settings.dailyMessageReset", {
                  resetTime: resetTimeLabel,
                  timeZone: DAILY_LIMIT_TIME_ZONE,
                })}
              </p>
              <p className="text-xs text-main-muted">
                {t("settings.monthlyTokenReset", {
                  resetTime: resetTimeLabel,
                  timeZone: DAILY_LIMIT_TIME_ZONE,
                })}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-main-muted">
                {t("settings.weeklyTokenReset", {
                  resetTime: resetTimeLabel,
                  timeZone: DAILY_LIMIT_TIME_ZONE,
                })}
              </p>
              <p className="text-xs text-main-muted">{t("settings.rolling30DayDescription")}</p>
            </>
          )}
        </div>

        <div className="mt-6 border-t border-(--color-border-soft) pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {pricingPlans.map((plan) => {
              const isCurrentPlan = settings.planType === plan.id

              return (
                <article
                  key={plan.id}
                  className="flex h-full flex-col rounded-[28px] border border-(--color-border-soft) bg-(--color-app-bg) p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-3xl font-black uppercase text-main">{plan.name}</p>
                      <p className="mt-2 text-2xl font-semibold text-main">{plan.price}</p>
                      <p className="mt-2 text-sm leading-6 text-main-soft">{plan.summary}</p>
                    </div>
                    {isCurrentPlan ? (
                      <span className="rounded-full bg-(--color-surface-soft) px-3 py-1 text-xs font-semibold text-main">
                        {t("billing.currentPlanBadge")}
                      </span>
                    ) : null}
                  </div>

                  <ul className="mt-4 space-y-2.5 text-sm leading-6 text-main">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.label}
                        className="flex items-start gap-3 rounded-2xl bg-(--color-surface) px-4 py-2.5"
                      >
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${plan.iconWrapperClass}`}
                        >
                          <feature.icon className="h-4 w-4" strokeWidth={2.1} />
                        </span>
                        <span>{feature.label}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.id === "pro" ? (
                    <UpgradeActionButton planType={settings.planType} className="mt-5" />
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-(--color-border-soft) bg-(--color-surface)/90 p-6 shadow-(--color-shadow-card)">
        <h2 className="text-xl font-semibold text-main">{t("settings.themeTitle")}</h2>
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </section>

      <section className="rounded-3xl border border-(--color-border-soft) bg-(--color-surface)/90 p-6 shadow-(--color-shadow-card)">
        <h2 className="text-xl font-semibold text-main">{t("settings.languageTitle")}</h2>
        <div className="mt-4">
          <LanguageToggle />
        </div>
      </section>

      <section className="rounded-3xl border border-(--color-border-soft) bg-(--color-surface)/90 p-6 shadow-(--color-shadow-card)">
        <h2 className="text-xl font-semibold text-main">{t("settings.legalTitle")}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-(--color-border-soft) bg-(--color-app-bg) px-4 py-2 text-sm font-semibold text-main transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <DeleteAccountSection />
    </div>
  )
}
