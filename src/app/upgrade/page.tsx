import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { UpgradeActionButton } from "@/components/billing/upgrade-action-button"
import { UpgradeBackButton } from "@/components/billing/upgrade-back-button"
import { createTranslator } from "@/lib/i18n"
import { resolveRequestLocale } from "@/lib/i18n/locale"
import prisma from "@/lib/prisma"

export default async function UpgradePage() {
  const locale = await resolveRequestLocale()
  const t = createTranslator(locale)
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { planType: true },
  })

  const planType = user?.planType === "pro" ? "pro" : "free"

  return (
    <div className="min-h-screen bg-(--color-app-bg) px-5 py-6 text-main md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <UpgradeBackButton />
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{t("billing.upgradeTitle")}</h1>
          <p className="mt-2 text-sm text-main-muted">{t("billing.upgradeDescription")}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl border border-(--color-border-soft) bg-(--color-surface) p-6 shadow-(--color-shadow-card)">
            <p className="text-4xl font-black uppercase leading-none text-main">{t("billing.freePlanName")}</p>
            <p className="mt-2 text-sm text-main-muted">{t("billing.freePlanSubheading")}</p>
            <p className="mt-3 text-3xl font-semibold text-main">
              {t("billing.freePlanPriceAmount")}{" "}
              <span className="text-sm font-medium text-main-muted">{t("billing.freePlanPriceSuffix")}</span>
            </p>
            <ul className="mt-5 space-y-2 text-sm text-main">
              <li>{t("billing.freeFeatureUsage")}</li>
              <li>{t("billing.freeFeatureModels")}</li>
              <li>{t("billing.freeFeatureBranching")}</li>
            </ul>
          </section>

          <section className="rounded-3xl border border-main bg-(--color-surface) p-6 shadow-(--color-shadow-card) transition-[box-shadow,border-color] duration-200 [&:has(.upgrade-cta:hover)]:border-(--color-focus-ring) [&:has(.upgrade-cta:hover)]:shadow-[0_18px_42px_rgba(20,20,20,0.16)] [&:has(.upgrade-cta:hover)]:ring-2 [&:has(.upgrade-cta:hover)]:ring-(--color-focus-ring)">
            <div className="flex items-center justify-between gap-2">
              <p className="text-4xl font-black uppercase leading-none text-main">{t("billing.proPlanName")}</p>
              {planType === "pro" ? (
                <span className="rounded-full bg-(--color-surface-soft) px-3 py-1 text-xs font-semibold text-main">
                  {t("billing.currentPlanBadge")}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-main-muted">{t("billing.proPlanSubheading")}</p>
            <p className="mt-3 text-3xl font-semibold text-main">
              {t("billing.proPlanPriceAmount")}{" "}
              <span className="text-sm font-medium text-main-muted">{t("billing.proPlanPriceSuffix")}</span>
            </p>
            <p className="mt-2 text-sm font-semibold text-main">{t("billing.proHighlight")}</p>
            <p className="mt-1 text-sm text-main-muted">{t("billing.proHighlightSub")}</p>
            <ul className="mt-5 space-y-2 text-sm text-main">
              <li>{t("billing.proFeatureUsage")}</li>
              <li>{t("billing.proFeatureModels")}</li>
              <li>{t("billing.proFeatureBranching")}</li>
              <li>{t("billing.proFeatureBilling")}</li>
            </ul>
            <div className="mt-6">
              <UpgradeActionButton planType={planType} className="upgrade-cta" />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
