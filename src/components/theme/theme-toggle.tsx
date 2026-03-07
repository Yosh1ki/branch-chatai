"use client"

import { Moon, Sun } from "lucide-react"
import { useState, useTransition, type ReactNode } from "react"
import { parseThemePreference, type ThemePreference } from "@/lib/theme-preference"
import { useThemePreference } from "./theme-provider"
import { useI18n } from "@/components/i18n/i18n-provider"

type ThemeToggleButtonProps = {
  themePreference: ThemePreference
  selectedThemePreference: ThemePreference
  onClick: (nextThemePreference: ThemePreference) => void
  disabled: boolean
  compact: boolean
  label: ReactNode
  ariaLabel: string
}

function ThemeToggleLabel({
  compact,
  themePreference,
  label,
}: {
  compact: boolean
  themePreference: ThemePreference
  label: string
}) {
  const icon =
    themePreference === "light" ? (
      <Sun aria-hidden="true" className="h-4 w-4" />
    ) : (
      <Moon aria-hidden="true" className="h-4 w-4" />
    )

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

function ThemeToggleButton({
  themePreference,
  selectedThemePreference,
  onClick,
  disabled,
  compact,
  label,
  ariaLabel,
}: ThemeToggleButtonProps) {
  const isActive = selectedThemePreference === themePreference

  return (
    <button
      type="button"
      onClick={() => onClick(themePreference)}
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

type ThemeToggleProps = {
  compact?: boolean
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
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
    <div className={compact ? "" : "space-y-3"}>
      <div className="inline-flex rounded-full border border-(--color-border-soft) bg-(--color-surface) p-1">
        <ThemeToggleButton
          themePreference="light"
          selectedThemePreference={themePreference}
          onClick={persistThemePreference}
          disabled={isPending}
          compact={compact}
          label={
            <ThemeToggleLabel compact={compact} themePreference="light" label={labels.light} />
          }
          ariaLabel={labels.light}
        />
        <ThemeToggleButton
          themePreference="dark"
          selectedThemePreference={themePreference}
          onClick={persistThemePreference}
          disabled={isPending}
          compact={compact}
          label={
            <ThemeToggleLabel compact={compact} themePreference="dark" label={labels.dark} />
          }
          ariaLabel={labels.dark}
        />
      </div>

      {!compact && saveError ? <p className="text-xs text-red-500">{saveError}</p> : null}
    </div>
  )
}
