import { cookies, headers } from "next/headers.js"
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type LocaleCode } from "./types"

type ResolveLocaleInput = {
  queryLang?: string | null
  cookieLocale?: string | null
  acceptLanguage?: string | null
  fallback?: LocaleCode
}

function isLocaleCode(value: string): value is LocaleCode {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

function parseLocaleCandidate(value: string | null | undefined): LocaleCode | undefined {
  if (!value) {
    return undefined
  }
  const normalized = value.toLowerCase().trim().replace(/_/g, "-")
  if (!normalized) {
    return undefined
  }
  const base = normalized.split("-")[0]
  return isLocaleCode(base) ? base : undefined
}

export function resolveLocaleFromAcceptLanguage(
  acceptLanguage: string | null | undefined
): LocaleCode | undefined {
  if (!acceptLanguage) {
    return undefined
  }
  const candidates = acceptLanguage.split(",").map((part) => part.trim())
  for (const candidate of candidates) {
    const localeToken = candidate.split(";")[0]?.trim()
    const parsed = parseLocaleCandidate(localeToken)
    if (parsed) {
      return parsed
    }
  }
  return undefined
}

export function resolveLocale(input: ResolveLocaleInput = {}): LocaleCode {
  const fallback = input.fallback ?? DEFAULT_LOCALE
  const queryLocale = parseLocaleCandidate(input.queryLang)
  if (queryLocale) {
    return queryLocale
  }
  const cookieLocale = parseLocaleCandidate(input.cookieLocale)
  if (cookieLocale) {
    return cookieLocale
  }
  const acceptLanguageLocale = resolveLocaleFromAcceptLanguage(input.acceptLanguage)
  if (acceptLanguageLocale) {
    return acceptLanguageLocale
  }
  return fallback
}

export function resolveLocaleFromDocument(documentLanguage: string | null | undefined): LocaleCode {
  return resolveLocale({
    queryLang: documentLanguage,
  })
}

export async function resolveRequestLocale(options: { queryLang?: string | null } = {}) {
  const headerStore = await Promise.resolve(headers())
  const cookieStore = await Promise.resolve(cookies())
  const acceptLanguage = headerStore.get("accept-language")
  const cookieLocale = cookieStore.get("locale")?.value

  return resolveLocale({
    queryLang: options.queryLang,
    cookieLocale,
    acceptLanguage,
    fallback: DEFAULT_LOCALE,
  })
}

export { DEFAULT_LOCALE }
