import type { ModelProvider, ReasoningEffort } from "@/lib/model-catalog"

export type MemorySummary = {
  summary: string
  key_facts: string[]
  user_goal: string
  action_items: string[]
  sentiment: "positive" | "neutral" | "negative" | "mixed"
  entities: string[]
  last_updated: string
  turn_count: number
}

export type ChatGraphState = {
  userId: string
  chatId?: string
  content: string
  parentMessageId?: string | null
  branchId?: string | null
  branchSide?: "left" | "right" | null
  requestId: string
  modelProvider?: ModelProvider | null
  modelName?: string | null
  modelReasoningEffort?: ReasoningEffort | null
  history: Array<{ role: "user" | "assistant"; content: string }>
  memorySummary?: MemorySummary | null
  assistantText?: string
  assistantContent?: string
  errors?: Array<{ step: string; message: string }>
}
