import OpenAI from "openai"
import { GoogleGenAI } from "@google/genai"
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

const generateOpenAIResponse = async (
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  reasoningEffort?: ReasoningEffort | null,
  onToken?: (token: string) => void | Promise<void>
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
    const delta = part.choices?.[0]?.delta?.content ?? ""
    if (!delta) {
      continue
    }
    text += delta
    if (onToken) {
      await onToken(delta)
    }
  }
  return text
}

const generateAnthropicResponse = async (
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  onToken?: (token: string) => void | Promise<void>
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
  await readSseStream(response, async (_eventName, data) => {
    if (!data || data === "[DONE]") {
      return
    }

    const parsed = JSON.parse(data) as {
      type?: string
      delta?: { text?: string }
      error?: { message?: string }
    }

    if (parsed?.type === "error") {
      const message = parsed.error?.message || "Anthropic API stream error"
      throw new ChatActionError(message, response.status || 502)
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

  return text
}

const generateGeminiResponse = async (
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  onToken?: (token: string) => void | Promise<void>
) => {
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
      for await (const chunk of stream) {
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
        return text
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
      return fallbackText
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
) => {
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
