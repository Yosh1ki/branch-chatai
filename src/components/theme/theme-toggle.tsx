"use client"

import { useState, useTransition } from "react"
import { parseThemePreference, type ThemePreference } from "@/lib/theme-preference"
import { useThemePreference } from "./theme-provider"
import { useI18n } from "@/components/i18n/i18n-provider"

type ThemeToggleButtonProps = {
  themePreference: ThemePreference
  selectedThemePreference: ThemePreference
  onClick: (nextThemePreference: ThemePreference) => void
  disabled: boolean
  labels: {
    light: string
    dark: string
  }
}

function ThemeToggleButton({
  themePreference,
  selectedThemePreference,
  onClick,
  disabled,
  labels,
}: ThemeToggleButtonProps) {
  const isActive = selectedThemePreference === themePreference

  return (
    <button
      type="button"
      onClick={() => onClick(themePreference)}
      disabled={disabled}
      aria-pressed={isActive}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        isActive
          ? "bg-theme-main text-main shadow-sm"
          : "bg-[var(--color-surface-soft)] text-main-muted hover:text-main"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {themePreference === "light" ? labels.light : labels.dark}
    </button>
  )
}

export function ThemeToggle() {
  const { t } = useI18n()
  const { themePreference, setThemePreference } = useThemePreference()
  const [saveError, setSaveError] = useState("")
  const [isPending, startTransition] = useTransition()
  const labels = {
    light: t("theme.light"),
    dark: t("theme.dark"),
  }

  const persistThemePreference = (nextThemePreference: ThemePreference) => {
    if (themePreference === nextThemePreference || isPending) {
      return
    }

    const previousThemePreference = themePreference
    setSaveError("")
    setThemePreference(nextThemePreference)

    startTransition(async () => {
      try {
        const response = await fetch("/api/theme", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ themePreference: nextThemePreference }),
        })

        if (!response.ok) {
          throw new Error(`Theme save failed with status ${response.status}`)
        }

        const payload = await response.json()
        setThemePreference(parseThemePreference(payload.themePreference, nextThemePreference))
      } catch (error) {
        console.error("Failed to save theme preference:", error)
        setThemePreference(previousThemePreference)
        setSaveError(t("errors.themeSaveFailed"))
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-1">
        <ThemeToggleButton
          themePreference="light"
          selectedThemePreference={themePreference}
          onClick={persistThemePreference}
          disabled={isPending}
          labels={labels}
        />
        <ThemeToggleButton
          themePreference="dark"
          selectedThemePreference={themePreference}
          onClick={persistThemePreference}
          disabled={isPending}
          labels={labels}
        />
      </div>

      {saveError ? <p className="text-xs text-red-500">{saveError}</p> : null}
    </div>
  )
}
