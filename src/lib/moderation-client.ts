import { getOpenAIClient } from "@/lib/openai-client"
import { evaluateModerationResult } from "@/lib/moderation-eval"

type ModerationCheck = {
  blocked: boolean
  reason: string
  category?: string
}

type ModerationResult = {
  flagged?: boolean
  category_scores?: Record<string, number>
}

export const runModerationCheck = async (
  input: string,
  options?: { criticalThreshold?: number; defaultThreshold?: number }
): Promise<ModerationCheck> => {
  const client = getOpenAIClient()
  const response = await client.moderations.create({
    model: "omni-moderation-latest",
    input,
  })

  const result = (response?.results?.[0] ?? {}) as ModerationResult
  return evaluateModerationResult(result, options)
}
