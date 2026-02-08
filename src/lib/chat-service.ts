import type { Chat, Message } from "@prisma/client"
import { runChatGraph } from "@/lib/chat-request-graph"
import { ChatActionError } from "@/lib/chat-errors"
import type { ModelProvider, ReasoningEffort } from "@/lib/model-catalog"

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
  modelReasoningEffort,
  requestId,
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
    history: [],
  })

  if (!result.chatRecord || !result.userMessage || !result.assistantMessage) {
    throw new ChatActionError("Chat processing failed", 500)
  }

  return {
    chat: result.chatRecord,
    userMessage: result.userMessage,
    assistantMessage: result.assistantMessage,
  }
}

export { ChatActionError }
