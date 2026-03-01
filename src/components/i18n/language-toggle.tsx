"use client"

import { useState, useTransition } from "react"
import { useI18n } from "@/components/i18n/i18n-provider"
import type { LocaleCode } from "@/lib/i18n/types"

type LanguageToggleButtonProps = {
  locale: LocaleCode
  selectedLocale: LocaleCode
  onClick: (nextLocale: LocaleCode) => void
  disabled: boolean
  label: string
}

function LanguageToggleButton({
  locale,
  selectedLocale,
  onClick,
  disabled,
  label,
}: LanguageToggleButtonProps) {
  const isActive = selectedLocale === locale

  return (
    <button
      type="button"
      onClick={() => onClick(locale)}
      disabled={disabled}
      aria-pressed={isActive}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        isActive
          ? "bg-theme-main text-main shadow-sm"
          : "bg-[var(--color-surface-soft)] text-main-muted hover:text-main"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {label}
    </button>
  )
}

export function LanguageToggle() {
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
    <div className="space-y-3">
      <div className="inline-flex rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-1">
        <LanguageToggleButton
          locale="ja"
          selectedLocale={selectedLocale}
          onClick={persistLocale}
          disabled={isPending}
          label={t("language.ja")}
        />
        <LanguageToggleButton
          locale="en"
          selectedLocale={selectedLocale}
          onClick={persistLocale}
          disabled={isPending}
          label={t("language.en")}
        />
      </div>

      {saveError ? <p className="text-xs text-red-500">{saveError}</p> : null}
    </div>
  )
}
