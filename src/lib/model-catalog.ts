export const MODEL_PROVIDERS = ["openai", "anthropic", "gemini"] as const

export type ModelProvider = (typeof MODEL_PROVIDERS)[number]

export type ModelOption = {
  provider: ModelProvider
  model: string
  label: string
}

export const PROVIDER_LABELS: Record<ModelProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google",
}

export const MODEL_OPTIONS: ModelOption[] = [
  { provider: "openai", model: "gpt-4.1-latest", label: "GPT-4.1" },
  { provider: "openai", model: "gpt-4o", label: "GPT-4o" },
  { provider: "openai", model: "gpt-5.2-chat-latest", label: "GPT-5.2" },
  { provider: "openai", model: "gpt-5.2", label: "GPT-5.2 Thinking" },
  { provider: "anthropic", model: "claude-opus-4-5", label: "Claude Opus 4.5" },
  { provider: "anthropic", model: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { provider: "gemini", model: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { provider: "gemini", model: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
  { provider: "gemini", model: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
]

export const isModelProvider = (value: string | null | undefined): value is ModelProvider =>
  MODEL_PROVIDERS.includes(value as ModelProvider)

export const getModelsForProvider = (provider: ModelProvider) =>
  MODEL_OPTIONS.filter((option) => option.provider === provider)

export const getProviderLabel = (provider: ModelProvider | null | undefined) =>
  provider ? PROVIDER_LABELS[provider] ?? provider : "Provider"

export const getModelLabel = (
  provider: ModelProvider | null | undefined,
  model: string | null | undefined
) => {
  if (!model) return "Assistant"
  if (!provider) return model
  return MODEL_OPTIONS.find(
    (option) => option.provider === provider && option.model === model
  )?.label ?? model
}
