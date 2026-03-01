"use client"

import Link from "next/link"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

type UpgradeButtonProps = {
  className?: string
}

export function UpgradeButton({ className }: UpgradeButtonProps) {
  const { t } = useI18n()

  return (
    <Link
      href="/upgrade"
      className={cn(
        "inline-flex items-center bg-transparent p-0 text-xs text-main underline underline-offset-2 transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {t("billing.upgrade")}
    </Link>
  )
}
