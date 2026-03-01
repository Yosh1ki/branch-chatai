import test from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_LOCALE,
  resolveLocale,
  resolveLocaleFromAcceptLanguage,
} from "../src/lib/i18n/locale.ts"
import { createTranslator, translate } from "../src/lib/i18n/index.ts"
import { resolveErrorMessage } from "../src/lib/i18n/error-messages.ts"

test("resolveLocale prioritizes query, then cookie, then accept-language", () => {
  const locale = resolveLocale({
    queryLang: "en",
    cookieLocale: "ja",
    acceptLanguage: "ja-JP,ja;q=0.9",
  })

  assert.equal(locale, "en")
})

test("resolveLocaleFromAcceptLanguage resolves supported locale", () => {
  assert.equal(resolveLocaleFromAcceptLanguage("en-US,en;q=0.9,ja;q=0.8"), "en")
  assert.equal(resolveLocaleFromAcceptLanguage("ja-JP,ja;q=0.9,en;q=0.8"), "ja")
})

test("resolveLocale falls back to default for unsupported values", () => {
  const locale = resolveLocale({
    queryLang: "fr",
    cookieLocale: "de",
    acceptLanguage: "fr-FR,fr;q=0.9",
  })

  assert.equal(locale, DEFAULT_LOCALE)
})

test("translate returns dictionary string with interpolation", () => {
  assert.equal(
    translate("settings.dailyReset", {
      locale: "en",
      params: { resetTime: "09:00", timeZone: "UTC" },
    }),
    "Resets daily at 09:00 (UTC)."
  )
})

test("createTranslator returns locale-bound translator", () => {
  const t = createTranslator("ja")
  assert.equal(t("settings.title"), "設定")
})

test("resolveErrorMessage returns localized payload", () => {
  const payload = resolveErrorMessage("dailyLimitReached", {
    locale: "en",
    params: { limit: 10 },
  })

  assert.deepEqual(payload, {
    code: "dailyLimitReached",
    message: "You have reached the free plan daily limit (10). Please try again tomorrow.",
  })
})
