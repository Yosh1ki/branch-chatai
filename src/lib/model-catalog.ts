export const MODEL_PROVIDERS = ["openai", "anthropic", "gemini"] as const

export type ModelProvider = (typeof MODEL_PROVIDERS)[number]

export const REASONING_EFFORTS = ["low", "medium", "high"] as const

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]

export type ModelOption = {
  id: string
  provider: ModelProvider
  model: string
  label: string
  reasoningEffort?: ReasoningEffort
}

export const PROVIDER_LABELS: Record<ModelProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google",
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "gpt-5.2", provider: "openai", model: "gpt-5.2", label: "GPT-5.2" },
  {
    id: "gpt-5.2-thinking",
    provider: "openai",
    model: "gpt-5.2",
    label: "GPT-5.2 Thinking",
    reasoningEffort: "high",
  },
  {
    id: "claude-opus-4-5",
    provider: "anthropic",
    model: "claude-opus-4-5",
    label: "Claude Opus 4.5",
  },
  {
    id: "claude-sonnet-4-5",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
  },
  {
    id: "gemini-3-pro-preview",
    provider: "gemini",
    model: "gemini-3-pro-preview",
    label: "Gemini 3 Pro",
  },
  {
    id: "gemini-3-flash-preview",
    provider: "gemini",
    model: "gemini-3-flash-preview",
    label: "Gemini 3 Flash",
  },
]

export const isModelProvider = (value: string | null | undefined): value is ModelProvider =>
  MODEL_PROVIDERS.includes(value as ModelProvider)

export const isReasoningEffort = (
  value: string | null | undefined
): value is ReasoningEffort => REASONING_EFFORTS.includes(value as ReasoningEffort)

export const getModelsForProvider = (provider: ModelProvider) =>
  MODEL_OPTIONS.filter((option) => option.provider === provider)

export const getProviderLabel = (provider: ModelProvider | null | undefined) =>
  provider ? PROVIDER_LABELS[provider] ?? provider : "Provider"

export const getModelLabel = (
  provider: ModelProvider | null | undefined,
  model: string | null | undefined,
  reasoningEffort?: ReasoningEffort | null
) => {
  if (!model) return "Assistant"
  if (!provider) return model
  return (
    MODEL_OPTIONS.find(
      (option) =>
        option.provider === provider &&
        option.model === model &&
        (option.reasoningEffort ?? null) === (reasoningEffort ?? null)
    )?.label ?? model
  )
}
