"use client"

import { useState } from "react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

type UpgradeActionButtonProps = {
  planType: "free" | "pro"
  className?: string
}

export function UpgradeActionButton({ planType, className }: UpgradeActionButtonProps) {
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(false)

  const isPro = planType === "pro"

  const handleClick = async () => {
    if (isLoading) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(isPro ? "/api/billing/portal" : "/api/billing/checkout", {
        method: "POST",
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || typeof payload?.url !== "string") {
        throw new Error(typeof payload?.error === "string" ? payload.error : "billing_action_failed")
      }

      window.location.href = payload.url
    } catch {
      alert(isPro ? t("billing.portalFailed") : t("billing.checkoutFailed"))
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center rounded-full bg-theme-main px-6 text-base font-bold text-main transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]",
        className
      )}
    >
      {isLoading
        ? t("billing.processing")
        : isPro
          ? t("billing.manageBilling")
          : t("billing.startProCheckout")}
    </button>
  )
}
