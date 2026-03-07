import { enDictionary } from "./dictionaries/en"
import { jaDictionary, type TranslationKey } from "./dictionaries/ja"
import { DEFAULT_LOCALE, type LocaleCode, type TranslationParams } from "./types"

type TranslateOptions = {
  locale?: LocaleCode
  params?: TranslationParams
  fallbackLocale?: LocaleCode
}

const catalogs = {
  ja: jaDictionary,
  en: enDictionary,
} as const

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g

function formatTemplate(template: string, params: TranslationParams = {}): string {
  return template.replace(VARIABLE_PATTERN, (_, key: string) => {
    const value = params[key]
    if (value === null || value === undefined) {
      return ""
    }
    return String(value)
  })
}

export function getDictionary(locale: LocaleCode) {
  return catalogs[locale]
}

export function translate(key: TranslationKey, options: TranslateOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE
  const fallbackLocale = options.fallbackLocale ?? DEFAULT_LOCALE
  const primary = catalogs[locale][key]
  const fallback = catalogs[fallbackLocale][key]
  const resolved = primary ?? fallback ?? key
  return formatTemplate(resolved, options.params)
}

export function createTranslator(locale: LocaleCode) {
  return (key: TranslationKey, params?: TranslationParams) =>
    translate(key, {
      locale,
      params,
    })
}

export type { TranslationKey }
