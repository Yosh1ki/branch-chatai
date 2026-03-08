import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { UpgradeActionButton } from "@/components/billing/upgrade-action-button"
import { UpgradeBackButton } from "@/components/billing/upgrade-back-button"
import { createTranslator } from "@/lib/i18n"
import { resolveRequestLocale } from "@/lib/i18n/locale"
import { getLoginPricingPlans } from "@/lib/pricing-plans"
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
  const pricingPlans = getLoginPricingPlans(t)

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

        <div className="grid gap-5 md:grid-cols-2">
          {pricingPlans.map((plan) => {
            const isCurrentPlan = plan.id === planType

            return (
              <section
                key={plan.id}
                className="flex h-full flex-col rounded-[28px] border border-black/5 bg-white/80 p-6"
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
                      className="flex items-start gap-3 rounded-2xl bg-(--color-app-bg) px-4 py-2.5"
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
                  <div className="mt-5">
                    <UpgradeActionButton planType={planType} className="upgrade-cta" />
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
