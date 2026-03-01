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

export type PlanTier = "free" | "pro"

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
    id: "gemini-2.5-pro",
    provider: "gemini",
    model: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
  },
  {
    id: "gemini-2.5-flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
  },
]

const FREE_PLAN_MODEL_IDS = new Set([
  "gpt-5.2",
  "claude-sonnet-4-5",
  "gemini-2.5-flash",
])

export const normalizePlanTier = (planType: string | null | undefined): PlanTier =>
  planType === "pro" ? "pro" : "free"

export const isModelOptionAvailableForPlan = (
  option: ModelOption,
  planType: string | null | undefined
) => normalizePlanTier(planType) === "pro" || FREE_PLAN_MODEL_IDS.has(option.id)

export const findModelOption = (
  provider: ModelProvider,
  model: string,
  reasoningEffort?: ReasoningEffort | null
) =>
  MODEL_OPTIONS.find(
    (option) =>
      option.provider === provider &&
      option.model === model &&
      (option.reasoningEffort ?? null) === (reasoningEffort ?? null)
  ) ?? null

export const isModelSelectionAvailableForPlan = (
  provider: ModelProvider,
  model: string,
  reasoningEffort: ReasoningEffort | null | undefined,
  planType: string | null | undefined
) => {
  if (normalizePlanTier(planType) === "pro") {
    return true
  }
  const option = findModelOption(provider, model, reasoningEffort)
  return option ? isModelOptionAvailableForPlan(option, planType) : false
}

export const getDefaultModelSelectionForPlan = (
  planType: string | null | undefined
): { provider: ModelProvider; model: string; reasoningEffort: ReasoningEffort | null } => {
  if (normalizePlanTier(planType) === "pro") {
    return {
      provider: "openai",
      model: "gpt-5.2",
      reasoningEffort: null,
    }
  }
  return {
    provider: "openai",
    model: "gpt-5.2",
    reasoningEffort: null,
  }
}

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
