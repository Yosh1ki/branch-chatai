export const SUPPORTED_LOCALES = ["ja", "en"] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: LocaleCode = "ja"

export type TranslationParams = Record<string, string | number | boolean | null | undefined>

export type TranslationDictionary = Record<string, string>

export type LocalizedErrorPayload = {
  code: string
  message: string
  details?: string
}
