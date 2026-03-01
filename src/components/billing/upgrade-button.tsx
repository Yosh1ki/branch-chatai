"use client"

import { useState } from "react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

type UpgradeButtonProps = {
  className?: string
}

export function UpgradeButton({ className }: UpgradeButtonProps) {
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    if (isLoading) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || typeof payload?.url !== "string") {
        throw new Error(typeof payload?.error === "string" ? payload.error : "checkout_failed")
      }

      window.location.href = payload.url
    } catch {
      alert(t("billing.upgradeFailed"))
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleUpgrade}
      disabled={isLoading}
      className={cn(
        "inline-flex items-center bg-transparent p-0 text-xs text-main underline underline-offset-2 transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {isLoading ? t("billing.upgrading") : t("billing.upgrade")}
    </button>
  )
}
