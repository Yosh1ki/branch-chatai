import { Annotation, END, StateGraph } from "@langchain/langgraph"
import { randomUUID } from "crypto"
import prisma from "@/lib/prisma"
import { ChatActionError } from "@/lib/chat-errors"
import {
  getDefaultModelSelectionForPlan,
  isModelProvider,
  isModelSelectionAvailableForPlan,
  isReasoningEffort,
  type ModelProvider,
  type ReasoningEffort,
} from "@/lib/model-catalog"
import { buildConversationHistory } from "@/lib/conversation-history"
import { summarizeHistory } from "@/lib/history-summarizer"
import { evaluateFastGate } from "@/lib/safety-filter"
import { runModerationCheck } from "@/lib/moderation-client"
import { assertWithinUsageLimits, recordUsageEvent } from "@/lib/usage-limiter"
import { invokeWithFallback } from "@/lib/model-invoker"
import type { ChatGraphState } from "@/lib/chat-graph-state"
import { serializeMarkdownContent } from "@/lib/rich-text"
import { buildDevAssistantResponse } from "@/lib/dev-assistant-response"
import { fallbackChatTitle, inferChatTitleLocale } from "@/lib/chat-title"
import {
  applyUsageToQuotaStatus,
  createEmptyTokenTotals,
  type UsageQuotaStatus,
  type UsageTokenTotals,
} from "@/lib/usage-quota"

type ChatRecord = Awaited<ReturnType<typeof prisma.chat.create>>
type MessageRecord = Awaited<ReturnType<typeof prisma.message.create>>
type UserPlanType = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>["planType"]

type GraphState = ChatGraphState & {
  chatRecord?: ChatRecord
  branchIdResolved?: string | null
  planType?: UserPlanType
  userMessage?: MessageRecord
  assistantMessage?: MessageRecord
  createdChat?: boolean
  idempotentHit?: boolean
  quotaStatus?: UsageQuotaStatus
  tokenUsage?: UsageTokenTotals
}

const ChatGraphAnnotation = Annotation.Root({
  userId: Annotation<string>(),
  chatId: Annotation<string | undefined>(),
  content: Annotation<string>(),
  parentMessageId: Annotation<string | null | undefined>(),
  branchId: Annotation<string | null | undefined>(),
  branchSide: Annotation<"left" | "right" | null | undefined>(),
  requestId: Annotation<string>(),
  modelProvider: Annotation<ModelProvider | null | undefined>(),
  modelName: Annotation<string | null | undefined>(),
  modelReasoningEffort: Annotation<ReasoningEffort | null | undefined>(),
  onToken: Annotation<((token: string) => void | Promise<void>) | undefined>(),
  history: Annotation<Array<{ role: "user" | "assistant"; content: string }>>({
    reducer: (prev, next) => next ?? prev ?? [],
  }),
  memorySummary: Annotation<ChatGraphState["memorySummary"] | null | undefined>({
    reducer: (prev, next) => next ?? prev ?? null,
  }),
  assistantText: Annotation<string | undefined>(),
  assistantContent: Annotation<string | undefined>(),
  chatRecord: Annotation<ChatRecord | undefined>(),
  branchIdResolved: Annotation<string | null | undefined>(),
  planType: Annotation<UserPlanType | undefined>(),
  userMessage: Annotation<MessageRecord | undefined>(),
  assistantMessage: Annotation<MessageRecord | undefined>(),
  createdChat: Annotation<boolean | undefined>(),
  idempotentHit: Annotation<boolean | undefined>(),
  quotaStatus: Annotation<UsageQuotaStatus | undefined>(),
  tokenUsage: Annotation<UsageTokenTotals | undefined>(),
  errors: Annotation<Array<{ step: string; message: string }> | undefined>({
    reducer: (prev, next) => next ?? prev ?? [],
  }),
})

const resolveModelSelection = async (
  planType: UserPlanType,
  chatId: string | null | undefined,
  modelProvider?: string | null,
  modelName?: string | null,
  modelReasoningEffort?: string | null
) => {
  const defaultModel = getDefaultModelSelectionForPlan(planType)

  const toSelection = (
    provider: ModelProvider,
    name: string,
    reasoningEffortValue: string | null | undefined
  ) => {
    const reasoningEffort = isReasoningEffort(reasoningEffortValue)
      ? reasoningEffortValue
      : null
    if (!isModelSelectionAvailableForPlan(provider, name, reasoningEffort, planType)) {
      return { provider: defaultModel.provider, name: defaultModel.model, reasoningEffort: null }
    }
    return { provider, name, reasoningEffort }
  }

  if (isModelProvider(modelProvider) && modelName) {
    return toSelection(modelProvider, modelName, modelReasoningEffort)
  }

  if (chatId) {
    const latestMessage = await prisma.message.findFirst({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      select: { modelProvider: true, modelName: true, modelReasoningEffort: true },
    })

    if (isModelProvider(latestMessage?.modelProvider) && latestMessage?.modelName) {
      return toSelection(
        latestMessage.modelProvider,
        latestMessage.modelName,
        latestMessage.modelReasoningEffort
      )
    }
  }

  return { provider: defaultModel.provider, name: defaultModel.model, reasoningEffort: null }
}

const validateNode = async (state: GraphState) => {
  const trimmedContent = state.content?.trim()
  if (!trimmedContent) {
    throw new ChatActionError("Content is required", 400)
  }

  const user = await prisma.user.findUnique({
    where: { id: state.userId },
    select: { planType: true },
  })
  const planType = user?.planType ?? "free"

  let chatRecord: ChatRecord | undefined
  let createdChat = false
  let resolvedChatId = state.chatId
  if (state.chatId) {
    const existing = await prisma.chat.findUnique({
      where: { id: state.chatId, userId: state.userId },
    })
    if (!existing) {
      throw new ChatActionError("Chat not found", 404)
    }
    chatRecord = existing
    resolvedChatId = existing.id
    // Chats pre-created from /chats have no root message yet.
    // Treat the first message as chat creation so auto-title generation runs.
    createdChat = !existing.rootMessageId
  } else {
    createdChat = true
  }

  const resolvedBranchId = state.branchId ?? null
  if (resolvedBranchId) {
    if (!resolvedChatId) {
      throw new ChatActionError("Chat not found", 404)
    }
    const branch = await prisma.branch.findUnique({
      where: { id: resolvedBranchId },
      select: { id: true, chatId: true, parentMessageId: true },
    })
    if (!branch || branch.chatId !== resolvedChatId) {
      throw new ChatActionError("Branch not found", 404)
    }
    if (state.parentMessageId && branch.parentMessageId !== state.parentMessageId) {
      throw new ChatActionError("Branch parent mismatch", 400)
    }
  }
  const requestId = state.requestId || randomUUID()
  const resolvedModel = await resolveModelSelection(
    planType,
    resolvedChatId,
    state.modelProvider ?? null,
    state.modelName ?? null,
    state.modelReasoningEffort ?? null
  )

  return {
    ...state,
    content: trimmedContent,
    requestId,
    chatId: resolvedChatId,
    chatRecord,
    branchIdResolved: resolvedBranchId,
    planType,
    modelProvider: resolvedModel.provider,
    modelName: resolvedModel.name,
    modelReasoningEffort: resolvedModel.reasoningEffort,
    createdChat,
  }
}

const usageNode = async (state: GraphState) => {
  const quotaStatus = await assertWithinUsageLimits(state.userId, state.planType)
  return {
    ...state,
    quotaStatus: quotaStatus ?? undefined,
  }
}

const historyNode = async (state: GraphState) => {
  if (!state.chatId) {
    return {
      ...state,
      history: [],
      memorySummary: null,
    }
  }

  const history = await buildConversationHistory(state.chatId, state.parentMessageId ?? null)
  const maxHistory = 40
  let memorySummary = null
  let trimmedHistory = history

  if (history.length > maxHistory) {
    const summaryInput = history.slice(0, history.length - maxHistory)
    memorySummary = await summarizeHistory(
      summaryInput.map((message) => ({ role: message.role, content: message.content })),
      history.length
    )
    trimmedHistory = history.slice(-maxHistory)
  }

  return {
    ...state,
    history: trimmedHistory.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    memorySummary,
  }
}

const safetyNode = async (state: GraphState) => {
  const fastGate = evaluateFastGate(state.content)
  if (fastGate.blocked) {
    throw new ChatActionError("Unsafe input detected", 400)
  }

  const moderation = await runModerationCheck(state.content, {
    criticalThreshold: 0.2,
    defaultThreshold: 0.5,
  })
  if (moderation.blocked) {
    throw new ChatActionError("Unsafe input detected", 400)
  }

  return state
}

const tokenCallbackStore = () => {
  const storeKey = "__branchTokenCallbacks"
  const globalStore = globalThis as typeof globalThis & {
    [storeKey]?: Map<string, (token: string) => void | Promise<void>>
  }
  if (!globalStore[storeKey]) {
    globalStore[storeKey] = new Map()
  }
  return globalStore[storeKey]
}

const getTokenCallback = (requestId: string | null | undefined) => {
  if (!requestId) {
    return undefined
  }
  return tokenCallbackStore().get(requestId)
}

const modelNode = async (state: GraphState) => {
  const memorySummaryJson = state.memorySummary ? JSON.stringify(state.memorySummary) : undefined
  const messagesForLLM = trimHistoryToTokenLimit(
    state.history ?? [],
    state.content,
    memorySummaryJson
  ).concat({ role: "user", content: state.content })
  const useDevResponse = process.env.USE_DEV_ASSISTANT_RESPONSE === "true"
  const devResponse = useDevResponse ? buildDevAssistantResponse() : null
  const streamCallback = state.onToken ?? getTokenCallback(state.requestId)
  const invocationResult = devResponse
    ? {
        text: devResponse.text,
        usage: createEmptyTokenTotals(),
      }
    : await invokeWithFallback(
        {
          provider: state.modelProvider ?? "openai",
          name: state.modelName ?? "gpt-5.2",
          reasoningEffort: state.modelReasoningEffort ?? null,
        },
        messagesForLLM,
        memorySummaryJson,
        streamCallback
      )
  const assistantText = invocationResult.text
  const assistantContent = devResponse
    ? devResponse.content
    : serializeMarkdownContent(assistantText)

  return {
    ...state,
    assistantText,
    assistantContent,
    tokenUsage: invocationResult.usage,
  }
}

const estimateTokens = (text: string) => Math.ceil(text.length / 4)

const trimHistoryToTokenLimit = (
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userContent: string,
  memorySummaryJson?: string,
  maxTokens = 8000
) => {
  const summaryTokens = memorySummaryJson ? estimateTokens(memorySummaryJson) : 0
  const userTokens = estimateTokens(userContent)
  let totalTokens =
    summaryTokens +
    userTokens +
    history.reduce((sum, message) => sum + estimateTokens(message.content), 0)
  const trimmed = [...history]

  while (trimmed.length > 0 && totalTokens > maxTokens) {
    const removed = trimmed.shift()
    if (removed) {
      totalTokens -= estimateTokens(removed.content)
    }
  }
  return trimmed
}

const outputModerationNode = async (state: GraphState) => {
  if (!state.assistantText) {
    throw new ChatActionError("Assistant response missing", 500)
  }
  const moderation = await runModerationCheck(state.assistantText, {
    criticalThreshold: 0.2,
    defaultThreshold: 0.5,
  })
  if (moderation.blocked) {
    throw new ChatActionError("Unsafe output detected", 400)
  }
  return state
}

const persistNode = async (state: GraphState) => {
  if (!state.assistantText || !state.assistantContent) {
    throw new ChatActionError("Assistant response missing", 500)
  }
  const titleLocale = inferChatTitleLocale(state.content)

  const existingUserMessage = await prisma.message.findUnique({
    where: { requestId: state.requestId },
  })
  if (existingUserMessage) {
    const assistantMessage = await prisma.message.findFirst({
      where: { parentMessageId: existingUserMessage.id, role: "assistant" },
    })
    if (!assistantMessage) {
      throw new ChatActionError("Idempotent response missing", 409)
    }
    const chatRecord =
      state.chatRecord ??
      (await prisma.chat.findUnique({
        where: { id: existingUserMessage.chatId, userId: state.userId },
      }))
    if (!chatRecord) {
      throw new ChatActionError("Chat not found", 404)
    }
    return {
      ...state,
      chatId: chatRecord.id,
      chatRecord,
      userMessage: existingUserMessage,
      assistantMessage,
      idempotentHit: true,
    }
  }

  const chatRecord =
    state.chatRecord ??
    (await prisma.chat.create({
      data: {
        userId: state.userId,
        title: fallbackChatTitle(titleLocale),
        languageCode: titleLocale,
      },
    }))
  const branchIdResolved =
    state.parentMessageId && !state.branchIdResolved && state.branchSide
      ? (
          await prisma.branch.create({
            data: {
              chatId: chatRecord.id,
              parentMessageId: state.parentMessageId,
              side: state.branchSide,
            },
          })
        ).id
      : state.branchIdResolved ?? null

  const userMessage = await prisma.message.create({
    data: {
      chatId: chatRecord.id,
      role: "user",
      content: state.content,
      parentMessageId: state.parentMessageId ?? null,
      branchId: branchIdResolved,
      modelProvider: state.modelProvider ?? null,
      modelName: state.modelName ?? null,
      modelReasoningEffort: state.modelReasoningEffort ?? null,
      requestId: state.requestId,
    },
  })

  if (!chatRecord.rootMessageId && !state.parentMessageId) {
    await prisma.chat.update({
      where: { id: chatRecord.id },
      data: { rootMessageId: userMessage.id },
    })
  }

  const assistantMessage = await prisma.message.create({
    data: {
      chatId: chatRecord.id,
      role: "assistant",
      content: state.assistantContent,
      parentMessageId: userMessage.id,
      branchId: branchIdResolved,
      modelProvider: state.modelProvider ?? null,
      modelName: state.modelName ?? null,
      modelReasoningEffort: state.modelReasoningEffort ?? null,
    },
  })

  await recordUsageEvent(
    state.userId,
    state.planType,
    state.tokenUsage ?? createEmptyTokenTotals(),
    { skipQuotaStatus: true }
  )

  return {
    ...state,
    chatId: chatRecord.id,
    chatRecord,
    branchIdResolved,
    userMessage,
    assistantMessage,
    quotaStatus: applyUsageToQuotaStatus(state.quotaStatus, state.tokenUsage) ?? state.quotaStatus,
  }
}

const graphBuilder = new StateGraph(ChatGraphAnnotation)
  .addNode("validate", validateNode)
  .addNode("usage", usageNode)
  .addNode("load_history", historyNode)
  .addNode("safety", safetyNode)
  .addNode("model", modelNode)
  .addNode("moderate_output", outputModerationNode)
  .addNode("persist", persistNode)
  .addEdge("validate", "usage")
  .addEdge("usage", "load_history")
  .addEdge("load_history", "safety")
  .addEdge("safety", "model")
  .addEdge("model", "moderate_output")
  .addEdge("moderate_output", "persist")
  .addEdge("persist", END)
graphBuilder.setEntryPoint("validate")

const chatGraph = graphBuilder.compile()

export const runChatGraph = async (state: GraphState) => {
  return (await chatGraph.invoke(state)) as GraphState
}
