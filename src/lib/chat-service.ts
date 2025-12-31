import prisma from "@/lib/prisma"
import OpenAI from "openai"
import type { Chat, Message } from "@prisma/client"
import {
  getModelsForProvider,
  isModelProvider,
  MODEL_OPTIONS,
  type ModelProvider,
} from "@/lib/model-catalog"
import {
  parseMessageContent,
  richTextDocToPlainText,
  serializeMarkdownContent,
  serializeRichTextContent,
} from "@/lib/rich-text"
import type { RichTextDoc } from "@/lib/rich-text"

const FREE_PLAN_DAILY_LIMIT = 10
const SYSTEM_PROMPT = "You are a helpful AI assistant."
const DEV_ASSISTANT_DOC: RichTextDoc = {
  version: "1.0",
  blocks: [
    { type: "heading", level: 2, text: "白ワインのおすすめ" },
    {
      type: "paragraph",
      text: "好みによって選ぶと良いでしょう。代表的な白ワインを5つ挙げます。",
    },
    {
      type: "numbered",
      items: [
        {
          title: "ソーヴィニヨン・ブラン",
          lines: [
            "代表的な産地: ニュージーランド、フランス（ロワール渓谷）",
            "特徴: フレッシュで爽やかな酸味、柑橘系の香りやトロピカルフルーツの風味。",
          ],
        },
        {
          title: "シャルドネ",
          lines: [
            "代表的な産地: フランス（ブルゴーニュ）、アメリカ（カリフォルニア）",
            "特徴: 豊かでクリーミーな味わい、樽熟成によるバターやバニラのニュアンス。",
          ],
        },
        {
          title: "リースリング",
          lines: [
            "代表的な産地: ドイツ、オーストラリア",
            "特徴: 甘口から辛口まで幅広いスタイルがあり、蜜や桃の香りが特徴的。",
          ],
        },
        {
          title: "ピノ・グリージョ",
          lines: [
            "代表的な産地: イタリア、アメリカ",
            "特徴: 軽やかで飲みやすい、洋梨やリンゴの香り。",
          ],
        },
        {
          title: "グルナッシュ・ブラン",
          lines: [
            "代表的な産地: フランス（ローヌ地方）",
            "特徴: 果実味とハーブのニュアンス。",
          ],
        },
      ],
    },
    {
      type: "paragraph",
      text: "料理やシチュエーションに応じて楽しめます。好みに合わせて選んでみてください。",
    },
  ],
}

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  return new OpenAI({ apiKey })
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

const DEFAULT_MODEL = { provider: "openai" as ModelProvider, name: "gpt-5.2-chat-latest" }

type ResolvedModel = {
  provider: ModelProvider
  name: string
}

const resolveModelSelection = (
  provider: ModelProvider | undefined,
  modelName: string | undefined
): ResolvedModel => {
  if (provider && modelName) {
    return { provider, name: modelName }
  }

  if (!provider && modelName) {
    const match = MODEL_OPTIONS.find((option) => option.model === modelName)
    if (match) {
      return { provider: match.provider, name: match.model }
    }
  }

  if (provider) {
    const models = getModelsForProvider(provider)
    if (models.length) {
      return { provider, name: models[0].model }
    }
  }

  return DEFAULT_MODEL
}

export class ChatActionError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

type MessageForTree = Pick<Message, "id" | "role" | "content" | "parentMessageId">

type SendChatMessageArgs = {
  userId: string
  content: string
  chatId?: string
  parentMessageId?: string | null
  branchId?: string | null
  branchSide?: "left" | "right" | null
  modelProvider?: string | null
  modelName?: string | null
}

type SendChatMessageResult = {
  chat: Chat
  userMessage: Message
  assistantMessage: Message
}

export async function sendChatMessage({
  userId,
  content,
  chatId,
  parentMessageId,
  branchId,
  branchSide,
  modelProvider,
  modelName,
}: SendChatMessageArgs): Promise<SendChatMessageResult> {
  const trimmedContent = content?.trim()
  if (!trimmedContent) {
    throw new ChatActionError("Content is required", 400)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planType: true },
  })

  const disableDailyLimit = process.env.DISABLE_DAILY_LIMIT === "true"
  if (user?.planType === "free" && !disableDailyLimit) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const usage = await prisma.usageStat.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    })

    if (usage && usage.messageCount >= FREE_PLAN_DAILY_LIMIT) {
      throw new ChatActionError("Daily message limit reached", 429)
    }
  }

  let chatRecord: Chat
  if (chatId) {
    const existing = await prisma.chat.findUnique({
      where: { id: chatId, userId },
    })
    if (!existing) {
      throw new ChatActionError("Chat not found", 404)
    }
    chatRecord = existing
  } else {
    chatRecord = await prisma.chat.create({
      data: {
        userId,
        title: trimmedContent.slice(0, 50),
        languageCode: "en",
      },
    })
  }

  let resolvedBranchId = branchId ?? null
  if (resolvedBranchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: resolvedBranchId },
      select: { id: true, chatId: true, parentMessageId: true },
    })
    if (!branch || branch.chatId !== chatRecord.id) {
      throw new ChatActionError("Branch not found", 404)
    }
    if (parentMessageId && branch.parentMessageId !== parentMessageId) {
      throw new ChatActionError("Branch parent mismatch", 400)
    }
  }
  if (parentMessageId && !resolvedBranchId && branchSide) {
    const branch = await prisma.branch.create({
      data: {
        chatId: chatRecord.id,
        parentMessageId,
        side: branchSide,
      },
    })
    resolvedBranchId = branch.id
  }

  const resolvedProvider = isModelProvider(modelProvider) ? modelProvider : undefined
  const resolvedModelName = typeof modelName === "string" ? modelName : undefined
  const resolvedModel = resolveModelSelection(resolvedProvider, resolvedModelName)

  const userMessage = await prisma.message.create({
    data: {
      chatId: chatRecord.id,
      role: "user",
      content: trimmedContent,
      parentMessageId,
      branchId: resolvedBranchId,
      modelProvider: resolvedModel.provider,
      modelName: resolvedModel.name,
    },
  })

  if (!chatRecord.rootMessageId && !parentMessageId) {
    await prisma.chat.update({
      where: { id: chatRecord.id },
      data: { rootMessageId: userMessage.id },
    })
  }

  const allMessages: MessageForTree[] = await prisma.message.findMany({
    where: { chatId: chatRecord.id },
    select: {
      id: true,
      role: true,
      content: true,
      parentMessageId: true,
    },
  })

  const path: MessageForTree[] = [
    {
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      parentMessageId: userMessage.parentMessageId,
    },
  ]

  let parentId = userMessage.parentMessageId

  while (parentId) {
    const parent = allMessages.find((m) => m.id === parentId)
    if (parent) {
      path.unshift(parent)
      parentId = parent.parentMessageId
    } else {
      break
    }
  }

  const messagesForLLM = [
    ...path.map((m) => ({
      role: m.role as "user" | "assistant",
      content: parseMessageContent(m.content).text,
    })),
  ]

  const useDevResponse = process.env.USE_DEV_ASSISTANT_RESPONSE === "true"
  const assistantText =
    (useDevResponse
      ? richTextDocToPlainText(DEV_ASSISTANT_DOC)
      : await generateAssistantResponse(resolvedModel, messagesForLLM)) || ""
  const assistantContent = useDevResponse
    ? serializeRichTextContent(DEV_ASSISTANT_DOC)
    : serializeMarkdownContent(assistantText)

  const assistantMessage = await prisma.message.create({
    data: {
      chatId: chatRecord.id,
      role: "assistant",
      content: assistantContent,
      parentMessageId: userMessage.id,
      branchId: resolvedBranchId,
      modelProvider: resolvedModel.provider,
      modelName: resolvedModel.name,
    },
  })

  if (user?.planType === "free") {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.usageStat.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        messageCount: { increment: 1 },
      },
      create: {
        userId,
        date: today,
        messageCount: 1,
      },
    })
  }

  return { chat: chatRecord, userMessage, assistantMessage }
}

async function generateAssistantResponse(
  resolvedModel: ResolvedModel,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>
) {
  switch (resolvedModel.provider) {
    case "openai":
      return generateOpenAIResponse(resolvedModel.name, messagesForLLM)
    case "anthropic":
      return generateAnthropicResponse(resolvedModel.name, messagesForLLM)
    case "gemini":
      return generateGeminiResponse(resolvedModel.name, messagesForLLM)
    default:
      return generateOpenAIResponse(resolvedModel.name, messagesForLLM)
  }
}

async function generateOpenAIResponse(
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>
) {
  const completion = await getOpenAIClient().chat.completions.create({
    model,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messagesForLLM],
  })
  return completion.choices[0]?.message?.content || ""
}

async function generateAnthropicResponse(
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>
) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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

async function generateGeminiResponse(
  model: string,
  messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getGeminiApiKey()}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: messagesForLLM.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          maxOutputTokens: 1024,
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
