import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  DAILY_LIMIT_RESET_HOUR,
  DAILY_LIMIT_RESET_MINUTE,
  DAILY_LIMIT_TIME_ZONE,
  FREE_PLAN_DAILY_LIMIT,
} from "@/lib/usage-limits"
import { resolveDailyLimitUsageDay } from "@/lib/usage-day"
import { textStyle } from "@/styles/typography"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { LanguageToggle } from "@/components/i18n/language-toggle"
import { createTranslator } from "@/lib/i18n"
import { resolveRequestLocale } from "@/lib/i18n/locale"

export default async function SettingsPage() {
  const locale = await resolveRequestLocale()
  const t = createTranslator(locale)
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      planType: true,
      email: true,
      name: true,
    },
  })

  const { usageDay } = await resolveDailyLimitUsageDay()

  const usage = await prisma.usageStat.findUnique({
    where: {
        userId_date: {
          userId: session.user.id,
          date: usageDay,
        },
      },
  })

  const resetTimeLabel = `${String(DAILY_LIMIT_RESET_HOUR).padStart(2, "0")}:${String(
    DAILY_LIMIT_RESET_MINUTE
  ).padStart(2, "0")}`
  const messageCount = usage?.messageCount ?? 0
  const usagePercent = Math.min((messageCount / FREE_PLAN_DAILY_LIMIT) * 100, 100)

  return (
    <div className="min-h-screen bg-[var(--color-app-bg)] text-main">
      <header className="flex w-full items-center justify-between px-2 py-6">
        <Link
          href="/chats"
          className="text-left font-title text-3xl tracking-wide text-main md:text-2xl"
          style={textStyle("pacifico")}
        >
          Branch
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-12">
        <div>
          <Link
            href="/chats"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("settings.backToChats")}
          </Link>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>

        <div className="grid gap-5">
          <section className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]/90 p-6 shadow-[var(--color-shadow-card)]">
            <h2 className="text-xl font-semibold text-main">{t("settings.accountTitle")}</h2>
            <p className="mt-1 text-sm text-main-muted">{t("settings.accountDescription")}</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-main-muted">{t("settings.name")}</span>
                <span className="text-sm font-semibold text-main">
                  {user?.name ?? t("settings.unset")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-main-muted">{t("settings.email")}</span>
                <span className="text-sm font-semibold text-main">
                  {user?.email ?? t("settings.unset")}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]/90 p-6 shadow-[var(--color-shadow-card)]">
            <h2 className="text-xl font-semibold text-main">{t("settings.planTitle")}</h2>
            <p className="mt-1 text-sm text-main-muted">
              {t("settings.planDescription")}
            </p>

            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="text-sm text-main-muted">{t("settings.currentPlan")}</span>
              <span className="rounded-full bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-main">
                {user?.planType ?? "FREE"}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-main-muted">{t("settings.todayMessages")}</span>
                <span className="font-semibold text-main">
                  {messageCount} / {FREE_PLAN_DAILY_LIMIT}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
                <div
                  className="h-full bg-main transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-xs text-main-muted">
                {t("settings.dailyReset", {
                  resetTime: resetTimeLabel,
                  timeZone: DAILY_LIMIT_TIME_ZONE,
                })}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]/90 p-6 shadow-[var(--color-shadow-card)]">
            <h2 className="text-xl font-semibold text-main">{t("settings.themeTitle")}</h2>
            <p className="mt-1 text-sm text-main-muted">
              {t("settings.themeDescription")}
            </p>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]/90 p-6 shadow-[var(--color-shadow-card)]">
            <h2 className="text-xl font-semibold text-main">{t("settings.languageTitle")}</h2>
            <p className="mt-1 text-sm text-main-muted">
              {t("settings.languageDescription")}
            </p>
            <div className="mt-4">
              <LanguageToggle />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
