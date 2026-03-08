import type { ModelProvider } from "./model-catalog"

export const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com"
export const ANTHROPIC_API_BASE_URL = "https://api.anthropic.com"
export const OPENAI_API_BASE_URL = "https://api.openai.com/v1"

export const readErrorStatus = (error: unknown) => {
  const status = (error as { status?: unknown })?.status
  if (typeof status === "number" && Number.isFinite(status)) {
    return status
  }

  const code = (error as { code?: unknown })?.code
  return typeof code === "number" && Number.isFinite(code) ? code : null
}

export const toUpstreamErrorStatus = (status: number | null) =>
  status != null && status >= 400 && status < 600 ? status : 502

export const formatModelInvocationError = (provider: ModelProvider, error: unknown) => {
  const message = (error as { message?: string })?.message
  const status = readErrorStatus(error)

  if (status != null && status >= 300 && status < 400) {
    if (provider === "gemini") {
      return `Gemini upstream returned redirect status ${status}. Check deployment proxy settings and GEMINI_NEXT_GEN_API_BASE_URL.`
    }

    if (provider === "anthropic") {
      return `Anthropic upstream returned redirect status ${status}. Check deployment proxy settings for requests to api.anthropic.com.`
    }

    if (provider === "openai") {
      return `OpenAI upstream returned redirect status ${status}. Check deployment proxy settings and OPENAI_BASE_URL.`
    }
  }

  if (typeof message === "string" && message.trim()) {
    return message
  }

  return `${provider} API error`
}
