import { translate, type TranslationKey } from "./index.ts"
import type { LocaleCode, LocalizedErrorPayload, TranslationParams } from "./types.ts"

const ERROR_MESSAGE_KEYS = {
  dailyLimitReached: "errors.dailyLimitReached",
  fetchResponseFailed: "errors.fetchResponseFailed",
  networkFailed: "errors.networkFailed",
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
