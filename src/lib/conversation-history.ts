import prisma from "@/lib/prisma"
import { parseMessageContent } from "@/lib/rich-text"

type HistoryMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  parentMessageId: string | null
}

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
  let currentId = parentMessageId

  while (currentId) {
    const current = messageById.get(currentId)
    if (!current) {
      break
    }
    chain.unshift({
      id: current.id,
      role: current.role as "user" | "assistant",
      content: parseMessageContent(current.content).text,
      parentMessageId: current.parentMessageId,
    })
    currentId = current.parentMessageId ?? null
  }

  return chain
}

export const buildConversationHistory = async (
  chatId: string,
  parentMessageId?: string | null
): Promise<HistoryMessage[]> => {
  if (!parentMessageId) {
    return []
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
