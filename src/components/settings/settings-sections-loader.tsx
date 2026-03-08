"use client"

import { useEffect, useState } from "react"
import { SettingsSections } from "@/components/settings/settings-sections"
import { createTranslator } from "@/lib/i18n"
import type { LocaleCode } from "@/lib/i18n/types"
import type { SettingsViewData } from "@/lib/settings-view"

type SettingsSectionsLoaderProps = {
  locale: LocaleCode
}

type SettingsErrorResponse = {
  error?: string
}

type SettingsResponse = SettingsViewData | SettingsErrorResponse

export function SettingsSectionsLoader({ locale }: SettingsSectionsLoaderProps) {
  const t = createTranslator(locale)
  const [settings, setSettings] = useState<SettingsViewData | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let isActive = true
    const translate = createTranslator(locale)

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" })
        const payload = (await response.json().catch(() => ({}))) as SettingsResponse

        if (!response.ok) {
          const errorMessage =
            "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Failed to load settings"
          throw new Error(errorMessage)
        }

        if (!isActive) {
          return
        }

        setSettings(payload as SettingsViewData)
        setError("")
      } catch (loadError) {
        if (!isActive) {
          return
        }

        console.error("Failed to load settings sections:", loadError)
        setError(translate("errors.fetchResponseFailed"))
      }
    }

    void loadSettings()

    return () => {
      isActive = false
    }
  }, [locale])

  if (settings) {
    return <SettingsSections locale={locale} settings={settings} />
  }

  if (error) {
    return <p className="px-2 text-sm text-main-muted">{error}</p>
  }

  return <p className="px-2 text-sm text-main-muted">{t("user.loading")}</p>
}
