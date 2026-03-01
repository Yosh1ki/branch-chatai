import type { LocaleCode } from "@/lib/i18n/types"

const JAPANESE_CHAR_REGEX = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u

const normalizeForComparison = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]/gu, "")

export const inferChatTitleLocale = (content: string): LocaleCode => {
  return JAPANESE_CHAR_REGEX.test(content) ? "ja" : "en"
}

export const fallbackChatTitle = (locale: LocaleCode): string => {
  return locale === "ja" ? "新しいチャット" : "New chat"
}

export const isVerbatimTitle = (title: string, source: string): boolean => {
  const normalizedTitle = normalizeForComparison(title)
  const normalizedSource = normalizeForComparison(source)
  return Boolean(normalizedTitle) && normalizedTitle === normalizedSource
}
