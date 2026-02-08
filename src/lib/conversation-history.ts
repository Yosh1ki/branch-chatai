import prisma from "@/lib/prisma"
import { parseMessageContent } from "@/lib/rich-text"

type HistoryMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  parentMessageId: string | null
}

const toHistoryMessage = (message: {
  id: string
  role: string
  content: string
  parentMessageId: string | null
}): HistoryMessage => ({
  id: message.id,
  role: message.role as "user" | "assistant",
  content: parseMessageContent(message.content).text,
  parentMessageId: message.parentMessageId,
})

export const buildParentChain = (
  messages: Array<{
    id: string
    role: string
    content: string
    parentMessageId: string | null
  }>,
  parentMessageId?: string | null
) => {
  if (!parentMessageId) {
    return []
  }

  const messageById = new Map(messages.map((message) => [message.id, message]))
  const chain: HistoryMessage[] = []
  let currentId: string | null = parentMessageId

  while (currentId) {
    const current = messageById.get(currentId)
    if (!current) {
      break
    }
    chain.unshift(toHistoryMessage(current))
    currentId = current.parentMessageId ?? null
  }

  return chain
}

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
