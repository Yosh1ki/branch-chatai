import { getOpenAIClient } from "@/lib/openai-client"
import { buildMemorySummaryPrompt, parseMemorySummary } from "@/lib/memory-summary"
import type { MemorySummary } from "@/lib/chat-graph-state"

const SUMMARY_MODEL = "gpt-4o-mini"

export const summarizeHistory = async (
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  turnCount: number
): Promise<MemorySummary> => {
  const conversationText = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n")
  const prompt = buildMemorySummaryPrompt(conversationText, turnCount)

  const response = await getOpenAIClient().chat.completions.create({
    model: SUMMARY_MODEL,
    messages: [
      {
        role: "system",
        content: "Return only JSON that matches the provided schema.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 600,
  })

  const raw = response.choices[0]?.message?.content ?? ""
  const parsed = parseMemorySummary(raw)
  return {
    ...parsed,
    last_updated: parsed.last_updated || new Date().toISOString(),
    turn_count: parsed.turn_count || turnCount,
  }
}
