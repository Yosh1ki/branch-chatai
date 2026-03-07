import { GoogleGenAI } from "@google/genai"
import OpenAI from "openai"
import type { Responses } from "openai/resources/responses/responses"
import { ChatActionError } from "@/lib/chat-errors"
import type { ModelProvider, ReasoningEffort } from "@/lib/model-catalog"
import { getOpenAIClient } from "@/lib/openai-client"
import {
  appendSourcesSection,
  extractWebSourcesFromResponse,
  shouldUseWebSearchForPrompt,
} from "@/lib/openai-web-search"
import {
  createEmptyTokenTotals,
  sanitizeTokenTotals,
  type UsageTokenTotals,
} from "@/lib/usage-quota"

const SYSTEM_PROMPT = "You are a helpful AI assistant."
const MAX_OUTPUT_TOKENS = 6000

type ResolvedModel = {
  provider: ModelProvider
  name: string
  reasoningEffort?: ReasoningEffort | null
}

export type ModelInvocationResult = {
  text: string
  usage: UsageTokenTotals
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

let geminiClient: GoogleGenAI | null = null
const getGeminiClient = () => {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: getGeminiApiKey() })
  }
  return geminiClient
}

const GEMINI_MODEL_ALIASES: Record<string, string> = {
  "gemini-3-flash-preview": "gemini-2.5-flash",
  "gemini-3-pro-preview": "gemini-2.5-pro",
}

const normalizeGeminiModelName = (model: string) => GEMINI_MODEL_ALIASES[model] ?? model

const getGeminiFallbackModels = (model: string) => {
  if (model.includes("flash")) {
    return ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
  }
  if (model.includes("pro")) {
    return ["gemini-2.5-pro", "gemini-1.5-pro"]
  }
  return ["gemini-2.5-flash", "gemini-2.0-flash"]
}

const parseSseEvent = (rawEvent: string) => {
  const lines = rawEvent.split("\n")
  let eventName = ""
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim()
      continue
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  const data = dataLines.join("\n")
  return { eventName, data }
}

const readSseStream = async (
  response: Response,
  onEvent: (eventName: string, data: string) => Promise<void> | void
) => {
  if (!response.body) {
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n").replace(/\r/g, "\n")

    let splitIndex = buffer.indexOf("\n\n")
    while (splitIndex !== -1) {
      const rawEvent = buffer.slice(0, splitIndex).trim()
      buffer = buffer.slice(splitIndex + 2)
      if (rawEvent) {
        const { eventName, data } = parseSseEvent(rawEvent)
        await onEvent(eventName, data)
      }
      splitIndex = buffer.indexOf("\n\n")
    }
  }

  const trailing = buffer.trim()
  if (trailing) {
    const { eventName, data } = parseSseEvent(trailing)
    await onEvent(eventName, data)
  }
}

const WEB_SEARCH_INCLUDE_FIELDS: Responses.ResponseIncludable[] = [
  "web_search_call.action.sources",
  "web_search_call.results",
]

const WEB_SEARCH_INSTRUCTION_SUFFIX = `
When answering questions that require fresh information:
- Use web search results.
- Prioritize factual accuracy over fluency.
- Include citation URLs and available publication/update dates.
`

const shouldFallbackToWebSearchPreview = (error: unknown) => {
  if (!(error instanceof OpenAI.APIError)) {
    return false
  }
  if (error.status !== 400) {
    return false
  }
  const message = error.message.toLowerCase()
  return message.includes("web_search") && !message.includes("web_search_preview")
}

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0

const sumNumbers = (...values: unknown[]) =>
  values.reduce((sum, value) => sum + readNumber(value), 0)

const resolveOpenAIUsage = (response: unknown) => {
  const usage = (response as { usage?: Record<string, unknown> } | null)?.usage
  return sanitizeTokenTotals({
    inputTokens: readNumber(usage?.input_tokens),
    outputTokens: readNumber(usage?.output_tokens),
    totalTokens: readNumber(usage?.total_tokens),
  })
}

const resolveAnthropicUsage = (usage: Record<string, unknown> | undefined, outputTokens = 0) =>
  sanitizeTokenTotals({
    inputTokens: sumNumbers(
      usage?.input_tokens,
      usage?.cache_creation_input_tokens,
      usage?.cache_read_input_tokens
    ),
    outputTokens,
    totalTokens: sumNumbers(
      usage?.input_tokens,
      usage?.cache_creation_input_tokens,
      usage?.cache_read_input_tokens,
      outputTokens
    ),
  })

const resolveGeminiUsage = (usage: Record<string, unknown> | undefined) =>
  sanitizeTokenTotals({
    inputTokens: sumNumbers(usage?.promptTokenCount, usage?.cachedContentTokenCount),
    outputTokens: sumNumbers(usage?.candidatesTokenCount, usage?.thoughtsTokenCount),
    totalTokens:
      readNumber(usage?.totalTokenCount) ||
      sumNumbers(
        usage?.promptTokenCount,
        usage?.cachedContentTokenCount,
        usage?.candidatesTokenCount,
        usage?.thoughtsTokenCount
      ),
  })

const generateOpenAIResponse = async (
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  reasoningEffort?: ReasoningEffort | null,
  onToken?: (token: string) => void | Promise<void>
): Promise<ModelInvocationResult> => {
  const latestUserInput = [...messagesForLLM].reverse().find((message) => message.role === "user")
  const useWebSearch = shouldUseWebSearchForPrompt(latestUserInput?.content ?? "")
  const baseParams: Omit<Responses.ResponseCreateParams, "stream" | "tools"> = {
    model,
    input: messagesForLLM,
    instructions: useWebSearch
      ? `${systemPrompt}\n\n${WEB_SEARCH_INSTRUCTION_SUFFIX.trim()}`
      : systemPrompt,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    include: useWebSearch ? WEB_SEARCH_INCLUDE_FIELDS : undefined,
  }

  if (reasoningEffort) {
    baseParams.reasoning = { effort: reasoningEffort }
  }

  const createNonStreaming = async (toolType: "web_search" | "web_search_preview") =>
    getOpenAIClient().responses.create({
      ...baseParams,
      stream: false,
      tools: useWebSearch ? [{ type: toolType }] : undefined,
    })

  const createStreaming = async (toolType: "web_search" | "web_search_preview") =>
    getOpenAIClient().responses.create({
      ...baseParams,
      stream: true,
      tools: useWebSearch ? [{ type: toolType }] : undefined,
    })

  const withWebSearchToolFallback = async <T>(
    fn: (toolType: "web_search" | "web_search_preview") => Promise<T>
  ) => {
    try {
      return await fn("web_search")
    } catch (error) {
      if (!useWebSearch || !shouldFallbackToWebSearchPreview(error)) {
        throw error
      }
      return await fn("web_search_preview")
    }
  }

  if (!onToken) {
    const response = await withWebSearchToolFallback(createNonStreaming)
    const rawText = response.output_text?.trim() ?? ""
    return {
      text: useWebSearch
        ? appendSourcesSection(rawText, extractWebSourcesFromResponse(response))
        : rawText,
      usage: resolveOpenAIUsage(response),
    }
  }

  const stream = await withWebSearchToolFallback(createStreaming)
  let streamedText = ""
  let completedResponse: Responses.Response | null = null

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      const delta = event.delta ?? ""
      if (!delta) {
        continue
      }
      streamedText += delta
      await onToken(delta)
      continue
    }
    if (event.type === "response.completed") {
      completedResponse = event.response
    }
  }

  const rawText = completedResponse?.output_text?.trim() ?? streamedText.trim()
  const finalText = useWebSearch
    ? appendSourcesSection(rawText, extractWebSourcesFromResponse(completedResponse ?? { output: [] }))
    : rawText

  const streamedTextNormalized = streamedText.trim()
  if (finalText && finalText !== streamedTextNormalized && finalText.startsWith(streamedTextNormalized)) {
    const tail = finalText.slice(streamedTextNormalized.length)
    if (tail) {
      await onToken(tail)
    }
  }

  return {
    text: finalText,
    usage: resolveOpenAIUsage(completedResponse),
  }
}

const generateAnthropicResponse = async (
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  onToken?: (token: string) => void | Promise<void>
): Promise<ModelInvocationResult> => {
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
      stream: true,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message =
      typeof data?.error?.message === "string" ? data.error.message : "Anthropic API error"
    throw new ChatActionError(message, response.status)
  }

  let text = ""
  let latestInputUsage: Record<string, unknown> | undefined
  let outputTokens = 0

  await readSseStream(response, async (_eventName, data) => {
    if (!data || data === "[DONE]") {
      return
    }

    const parsed = JSON.parse(data) as {
      type?: string
      delta?: { text?: string }
      error?: { message?: string }
      message?: { usage?: Record<string, unknown> }
      usage?: Record<string, unknown>
    }

    if (parsed?.type === "error") {
      const message = parsed.error?.message || "Anthropic API stream error"
      throw new ChatActionError(message, response.status || 502)
    }

    if (parsed?.type === "message_start") {
      latestInputUsage = parsed.message?.usage
      return
    }

    if (parsed?.type === "message_delta") {
      outputTokens = Math.max(outputTokens, readNumber(parsed.usage?.output_tokens))
      return
    }

    if (parsed?.type !== "content_block_delta") {
      return
    }

    const token = parsed.delta?.text ?? ""
    if (!token) {
      return
    }
    text += token
    if (onToken) {
      await onToken(token)
    }
  })

  return {
    text,
    usage: resolveAnthropicUsage(latestInputUsage, outputTokens),
  }
}

const generateGeminiResponse = async (
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  onToken?: (token: string) => void | Promise<void>
): Promise<ModelInvocationResult> => {
  const requestModel = normalizeGeminiModelName(model)
  const candidateModels = Array.from(
    new Set([requestModel, ...getGeminiFallbackModels(requestModel)])
  )

  let lastErrorMessage = "Gemini API error"
  let lastStatus = 502

  for (const candidateModel of candidateModels) {
    try {
      const stream = await getGeminiClient().models.generateContentStream({
        model: candidateModel,
        contents: messagesForLLM.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        config: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      })

      let text = ""
      let latestUsage = createEmptyTokenTotals()
      for await (const chunk of stream) {
        latestUsage = resolveGeminiUsage(
          (chunk as { usageMetadata?: Record<string, unknown> }).usageMetadata
        )
        const token = chunk.text ?? ""
        if (!token) {
          continue
        }
        text += token
        if (onToken) {
          await onToken(token)
        }
      }

      if (text) {
        return {
          text,
          usage: latestUsage,
        }
      }

      const fallbackResponse = await getGeminiClient().models.generateContent({
        model: candidateModel,
        contents: messagesForLLM.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        config: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      })
      const fallbackText = fallbackResponse.text ?? ""
      if (onToken && fallbackText) {
        await onToken(fallbackText)
      }
      return {
        text: fallbackText,
        usage: resolveGeminiUsage(
          (fallbackResponse as { usageMetadata?: Record<string, unknown> }).usageMetadata
        ),
      }
    } catch (error) {
      const message = (error as { message?: string })?.message
      const status = (error as { status?: number; code?: number })?.status
      lastErrorMessage = typeof message === "string" ? message : "Gemini API error"
      lastStatus = typeof status === "number" ? status : 502
    }
  }

  throw new ChatActionError(lastErrorMessage, lastStatus)
}

const generateResponseByModel = async (
  resolvedModel: ResolvedModel,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  onToken?: (token: string) => void | Promise<void>
) => {
  switch (resolvedModel.provider) {
    case "openai":
      return generateOpenAIResponse(
        resolvedModel.name,
        messagesForLLM,
        systemPrompt,
        resolvedModel.reasoningEffort ?? null,
        onToken
      )
    case "anthropic":
      return generateAnthropicResponse(resolvedModel.name, messagesForLLM, systemPrompt, onToken)
    case "gemini":
      return generateGeminiResponse(resolvedModel.name, messagesForLLM, systemPrompt, onToken)
    default:
      return generateOpenAIResponse(
        resolvedModel.name,
        messagesForLLM,
        systemPrompt,
        undefined,
        onToken
      )
  }
}

export const invokeWithFallback = async (
  primaryModel: ResolvedModel,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  memorySummaryJson?: string,
  onToken?: (token: string) => void | Promise<void>
): Promise<ModelInvocationResult> => {
  const systemPrompt = memorySummaryJson
    ? `${SYSTEM_PROMPT}\n\nMemory summary JSON:\n${memorySummaryJson}`
    : SYSTEM_PROMPT
  try {
    return await withSingleRetry(() =>
      generateResponseByModel(primaryModel, messagesForLLM, systemPrompt, onToken)
    )
  } catch (error) {
    const message =
      (error instanceof OpenAI.APIError ? error.message : undefined) ??
      (error as Error)?.message ??
      "Model invocation failed"
    throw new ChatActionError(message, 502)
  }
}
