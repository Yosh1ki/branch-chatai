import prisma from "@/lib/prisma"
import { parseMessageContent } from "@/lib/rich-text"
import {
  buildParentChain as buildParentChainCore,
  type ConversationHistoryMessage,
  type ConversationHistorySourceMessage,
} from "@/lib/conversation-history-core"

type HistoryMessage = ConversationHistoryMessage

const toHistoryMessage = (message: ConversationHistorySourceMessage): HistoryMessage => ({
  id: message.id,
  role: message.role as "user" | "assistant",
  content: parseMessageContent(message.content).text,
  parentMessageId: message.parentMessageId,
})

export const buildParentChain = (
  messages: ConversationHistorySourceMessage[],
  parentMessageId?: string | null
) =>
  buildParentChainCore(messages, parentMessageId, {
    toHistoryMessage,
  })

export const buildConversationHistory = async (
  chatId: string,
  parentMessageId?: string | null
): Promise<HistoryMessage[]> => {
  if (!parentMessageId) {
    const mainMessages = await prisma.message.findMany({
      where: { chatId, branchId: null },
      select: {
        id: true,
        role: true,
        content: true,
        parentMessageId: true,
      },
      orderBy: { createdAt: "asc" },
    })
    return mainMessages.map((message) => toHistoryMessage(message))
  }

  const allMessages = await prisma.message.findMany({
    where: { chatId },
    select: {
      id: true,
      role: true,
      content: true,
      parentMessageId: true,
    },
  })

  return buildParentChain(allMessages, parentMessageId)
}
