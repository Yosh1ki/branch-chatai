import OpenAI from "openai"
import { ChatActionError } from "@/lib/chat-errors"
import { getOpenAIClient } from "@/lib/openai-client"
import type { ModelProvider, ReasoningEffort } from "@/lib/model-catalog"

const SYSTEM_PROMPT = "You are a helpful AI assistant."
const MAX_OUTPUT_TOKENS = 2000

type ResolvedModel = {
  provider: ModelProvider
  name: string
  reasoningEffort?: ReasoningEffort | null
}

const isRetryableError = (error: unknown) => {
  const message = (error as Error)?.message ?? ""
  const code = (error as { code?: string })?.code
  return (
    code === "rate_limit" ||
    code === "ETIMEDOUT" ||
    message.toLowerCase().includes("timeout") ||
    message.toLowerCase().includes("rate limit")
  )
}

const withSingleRetry = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn()
  } catch (error) {
    if (isRetryableError(error)) {
      return await fn()
    }
    throw error
  }
}

const getAnthropicApiKey = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set")
  }
  return apiKey
}

const getGeminiApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set")
  }
  return apiKey
}

const generateOpenAIResponse = async (
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  reasoningEffort?: ReasoningEffort | null
) => {
  const params: OpenAI.Chat.ChatCompletionCreateParamsStreaming & {
    reasoning_effort?: ReasoningEffort
    max_completion_tokens?: number
  } = {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messagesForLLM],
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    stream: true,
  }
  if (reasoningEffort) {
    params.reasoning_effort = reasoningEffort
  }

  const stream = await getOpenAIClient().chat.completions.create(params)

  let text = ""
  for await (const part of stream) {
    text += part.choices?.[0]?.delta?.content ?? ""
  }
  return text
}

const generateAnthropicResponse = async (
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string
) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: messagesForLLM,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof data?.error?.message === "string" ? data.error.message : "Anthropic API error"
    throw new ChatActionError(message, response.status)
  }

  const contentParts = Array.isArray(data?.content) ? data.content : []
  const text = contentParts.map((part: { text?: string }) => part.text ?? "").join("")
  return text
}

const generateGeminiResponse = async (
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string
) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getGeminiApiKey()}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: messagesForLLM.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
    }
  )

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof data?.error?.message === "string" ? data.error.message : "Gemini API error"
    throw new ChatActionError(message, response.status)
  }

  const parts = data?.candidates?.[0]?.content?.parts ?? []
  const text = parts.map((part: { text?: string }) => part.text ?? "").join("")
  return text
}

const generateResponseByModel = async (
  resolvedModel: ResolvedModel,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string
) => {
  switch (resolvedModel.provider) {
    case "openai":
      return generateOpenAIResponse(
        resolvedModel.name,
        messagesForLLM,
        systemPrompt,
        resolvedModel.reasoningEffort ?? null
      )
    case "anthropic":
      return generateAnthropicResponse(resolvedModel.name, messagesForLLM, systemPrompt)
    case "gemini":
      return generateGeminiResponse(resolvedModel.name, messagesForLLM, systemPrompt)
    default:
      return generateOpenAIResponse(resolvedModel.name, messagesForLLM, systemPrompt)
  }
}

export const invokeWithFallback = async (
  primaryModel: ResolvedModel,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  memorySummaryJson?: string
) => {
  const systemPrompt = memorySummaryJson
    ? `${SYSTEM_PROMPT}\n\nMemory summary JSON:\n${memorySummaryJson}`
    : SYSTEM_PROMPT
  try {
    return await withSingleRetry(() =>
      generateResponseByModel(primaryModel, messagesForLLM, systemPrompt)
    )
  } catch (error) {
    const message =
      (error instanceof OpenAI.APIError ? error.message : undefined) ??
      (error as Error)?.message ??
      "Model invocation failed"
    throw new ChatActionError(message, 502)
  }
}
