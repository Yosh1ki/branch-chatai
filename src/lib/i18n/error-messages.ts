import { translate, type TranslationKey } from "./index"
import type { LocaleCode, LocalizedErrorPayload, TranslationParams } from "./types"

const ERROR_MESSAGE_KEYS = {
  dailyLimitReached: "errors.dailyLimitReached",
  fetchResponseFailed: "errors.fetchResponseFailed",
  freeDailyMessageLimitReached: "errors.freeDailyMessageLimitReached",
  freeMonthlyTokenLimitReached: "errors.freeMonthlyTokenLimitReached",
  networkFailed: "errors.networkFailed",
  proRolling30DayTokenLimitReached: "errors.proRolling30DayTokenLimitReached",
  proWeeklyTokenLimitReached: "errors.proWeeklyTokenLimitReached",
  sendFailed: "chat.sendFailed",
  loadFailed: "chat.loadFailed",
  themeSaveFailed: "errors.themeSaveFailed",
} as const satisfies Record<string, TranslationKey>

export type ErrorMessageCode = keyof typeof ERROR_MESSAGE_KEYS

type ResolveErrorMessageOptions = {
  locale?: LocaleCode
  params?: TranslationParams
}

export function resolveErrorMessage(
  code: ErrorMessageCode,
  options: ResolveErrorMessageOptions = {}
): LocalizedErrorPayload {
  return {
    code,
    message: translate(ERROR_MESSAGE_KEYS[code], {
      locale: options.locale,
      params: options.params,
    }),
  }
}
