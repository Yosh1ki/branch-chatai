"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/components/i18n/i18n-provider"

export function UpgradeBackButton() {
  const router = useRouter()
  const { t } = useI18n()

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push("/chats")
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={t("billing.back")}
      className="inline-flex h-10 w-10 items-center justify-center text-main transition hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  )
}
