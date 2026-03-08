import type { Chat, Message } from "@prisma/client"
import { runChatGraph } from "@/lib/chat-request-graph"
import { ChatActionError } from "@/lib/chat-errors"
import type { ModelProvider, ReasoningEffort } from "@/lib/model-catalog"
import type { UsageQuotaStatus } from "@/lib/usage-quota"
import prisma from "@/lib/prisma"
import { inferChatTitleLocale } from "@/lib/chat-title"
import { generateChatTitle } from "@/lib/title-generator"

type SendChatMessageArgs = {
  userId: string
  content: string
  chatId?: string
  parentMessageId?: string | null
  branchId?: string | null
  branchSide?: "left" | "right" | null
  modelProvider?: ModelProvider | null
  modelName?: string | null
  modelReasoningEffort?: ReasoningEffort | null
  requestId?: string | null
  onToken?: (token: string) => void | Promise<void>
}

type SendChatMessageResult = {
  chat: Chat
  userMessage: Message
  assistantMessage: Message
  quotaStatus?: UsageQuotaStatus
  createdChat?: boolean
  idempotentHit?: boolean
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
  modelReasoningEffort,
  requestId,
  onToken,
}: SendChatMessageArgs): Promise<SendChatMessageResult> {
  const result = await runChatGraph({
    userId,
    content,
    chatId,
    parentMessageId,
    branchId,
    branchSide,
    modelProvider,
    modelName,
    modelReasoningEffort,
    requestId: requestId ?? "",
    onToken,
    history: [],
  })

  if (!result.chatRecord || !result.userMessage || !result.assistantMessage) {
    throw new ChatActionError("Chat processing failed", 500)
  }

  return {
    chat: result.chatRecord,
    userMessage: result.userMessage,
    assistantMessage: result.assistantMessage,
    quotaStatus: result.quotaStatus,
    createdChat: result.createdChat,
    idempotentHit: result.idempotentHit,
  }
}

export async function updateChatTitleAfterSend({
  chatId,
  content,
  createdChat,
  idempotentHit,
}: {
  chatId: string
  content: string
  createdChat?: boolean
  idempotentHit?: boolean
}) {
  if (!createdChat || idempotentHit) {
    return
  }

  const titleLocale = inferChatTitleLocale(content)
  const title = await generateChatTitle(content, { locale: titleLocale })

  await prisma.chat.update({
    where: { id: chatId },
    data: {
      title,
      languageCode: titleLocale,
    },
  })
}

export { ChatActionError }
