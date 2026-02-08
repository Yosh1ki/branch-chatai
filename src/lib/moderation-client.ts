import OpenAI from "openai"
import { getOpenAIClient } from "@/lib/openai-client"
import { ChatActionError } from "@/lib/chat-errors"
import { evaluateModerationResult } from "@/lib/moderation-eval"
import type { Moderation } from "openai/resources/moderations"

type ModerationCheck = {
  blocked: boolean
  reason: string
  category?: string
}

type ModerationResult = Moderation

export const runModerationCheck = async (
  input: string,
  options?: { criticalThreshold?: number; defaultThreshold?: number }
): Promise<ModerationCheck> => {
  if (process.env.DISABLE_MODERATION === "true") {
    return { blocked: false, reason: "Moderation disabled" }
  }

  const client = getOpenAIClient()
  let response: Awaited<ReturnType<typeof client.moderations.create>>

  try {
    response = await client.moderations.create({
      model: "omni-moderation-latest",
      input,
    })
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 500
      let message = "OpenAI moderation request failed."
      if (status === 401) {
        message = "OpenAI API key is invalid or missing."
      } else if (status === 403) {
        message = "OpenAI moderation request forbidden. Check API key permissions or project access."
      } else if (status === 429) {
        message = "OpenAI moderation rate limited. Please retry shortly."
      } else if (error.message) {
        message = `OpenAI moderation request failed: ${error.message}`
      }
      console.log("--- Debug OpenAI Request ---");
      console.log("Key Length:", process.env.OPENAI_API_KEY?.length || 0);
      console.log("Key Prefix:", process.env.OPENAI_API_KEY?.substring(0, 7));
      throw new ChatActionError(message, status)
    }
    if (error instanceof Error) {
      throw new ChatActionError(`OpenAI moderation request failed: ${error.message}`, 502)
    }
    throw new ChatActionError("OpenAI moderation request failed.", 502)
  }

  const result = (response?.results?.[0] ?? {}) as ModerationResult
  return evaluateModerationResult(result, options)
}
