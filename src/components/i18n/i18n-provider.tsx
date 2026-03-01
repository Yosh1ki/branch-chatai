"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import {
  createTranslator,
  type TranslationKey,
} from "@/lib/i18n"
import type { LocaleCode, TranslationParams } from "@/lib/i18n/types"

type I18nContextValue = {
  locale: LocaleCode
  t: (key: TranslationKey, params?: TranslationParams) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

type I18nProviderProps = {
  locale: LocaleCode
  children: ReactNode
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const translate = useMemo(() => createTranslator(locale), [locale])
  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(key, params),
    [translate]
  )

  const value = useMemo(
    () => ({
      locale,
      t,
    }),
    [locale, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider")
  }
  return context
}
