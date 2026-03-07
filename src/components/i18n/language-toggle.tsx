"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useI18n } from "@/components/i18n/i18n-provider"
import type { LocaleCode } from "@/lib/i18n/types"

function JapanFlagIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 overflow-hidden rounded-full"
    >
      <rect width="24" height="24" fill="#ffffff" />
      <circle cx="12" cy="12" r="5.2" fill="#bc002d" />
    </svg>
  )
}

function UnitedStatesFlagIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 overflow-hidden rounded-full"
    >
      <rect width="24" height="24" fill="#ffffff" />
      <rect width="24" height="2.4" y="0" fill="#b22234" />
      <rect width="24" height="2.4" y="4.8" fill="#b22234" />
      <rect width="24" height="2.4" y="9.6" fill="#b22234" />
      <rect width="24" height="2.4" y="14.4" fill="#b22234" />
      <rect width="24" height="2.4" y="19.2" fill="#b22234" />
      <rect width="10.5" height="10.5" fill="#3c3b6e" />
      <circle cx="2.4" cy="2.4" r="0.6" fill="#ffffff" />
      <circle cx="5.2" cy="2.4" r="0.6" fill="#ffffff" />
      <circle cx="8" cy="2.4" r="0.6" fill="#ffffff" />
      <circle cx="3.8" cy="4.8" r="0.6" fill="#ffffff" />
      <circle cx="6.6" cy="4.8" r="0.6" fill="#ffffff" />
      <circle cx="2.4" cy="7.2" r="0.6" fill="#ffffff" />
      <circle cx="5.2" cy="7.2" r="0.6" fill="#ffffff" />
      <circle cx="8" cy="7.2" r="0.6" fill="#ffffff" />
    </svg>
  )
}

function LanguageToggleLabel({ compact, locale, label }: {
  compact: boolean
  locale: LocaleCode
  label: string
}) {
  const icon = locale === "ja" ? <JapanFlagIcon /> : <UnitedStatesFlagIcon />

  if (compact) {
    return icon
  }

  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </span>
  )
}

type LanguageToggleButtonProps = {
  locale: LocaleCode
  selectedLocale: LocaleCode
  onClick: (nextLocale: LocaleCode) => void
  disabled: boolean
  compact: boolean
  label: ReactNode
  ariaLabel: string
}

function LanguageToggleButton({
  locale,
  selectedLocale,
  onClick,
  disabled,
  compact,
  label,
  ariaLabel,
}: LanguageToggleButtonProps) {
  const isActive = selectedLocale === locale

  return (
    <button
      type="button"
      onClick={() => onClick(locale)}
      disabled={disabled}
      aria-pressed={isActive}
      aria-label={ariaLabel}
      className={`rounded-full font-semibold transition ${
        isActive
          ? "bg-theme-main text-main shadow-sm"
          : "bg-(--color-surface-soft) text-main-muted hover:text-main"
      } ${
        compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {label}
    </button>
  )
}

type LanguageToggleProps = {
  compact?: boolean
}

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { locale, t } = useI18n()
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>(locale)
  const [saveError, setSaveError] = useState("")
  const [isPending, startTransition] = useTransition()

  const persistLocale = (nextLocale: LocaleCode) => {
    if (selectedLocale === nextLocale || isPending) {
      return
    }

    const previousLocale = selectedLocale
    setSaveError("")
    setSelectedLocale(nextLocale)

    startTransition(async () => {
      try {
        const response = await fetch("/api/locale", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ locale: nextLocale }),
        })

        if (!response.ok) {
          throw new Error(`Locale save failed with status ${response.status}`)
        }

        window.location.reload()
      } catch (error) {
        console.error("Failed to save locale:", error)
        setSelectedLocale(previousLocale)
        setSaveError(t("errors.localeSaveFailed"))
      }
    })
  }

  return (
    <div className={compact ? "" : "space-y-3"}>
      <div className="inline-flex rounded-full border border-(--color-border-soft) bg-(--color-surface) p-1">
        <LanguageToggleButton
          locale="ja"
          selectedLocale={selectedLocale}
          onClick={persistLocale}
          disabled={isPending}
          compact={compact}
          label={<LanguageToggleLabel compact={compact} locale="ja" label={t("language.ja")} />}
          ariaLabel={t("language.ja")}
        />
        <LanguageToggleButton
          locale="en"
          selectedLocale={selectedLocale}
          onClick={persistLocale}
          disabled={isPending}
          compact={compact}
          label={<LanguageToggleLabel compact={compact} locale="en" label={t("language.en")} />}
          ariaLabel={t("language.en")}
        />
      </div>

      {!compact && saveError ? <p className="text-xs text-red-500">{saveError}</p> : null}
    </div>
  )
}
