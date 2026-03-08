import { Prisma } from "@prisma/client"
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

  const branchMessages = await prisma.$queryRaw<ConversationHistorySourceMessage[]>(Prisma.sql`
    WITH RECURSIVE message_chain AS (
      SELECT
        id,
        role,
        content,
        parent_message_id AS "parentMessageId",
        0 AS depth
      FROM messages
      WHERE id = ${parentMessageId}
        AND chat_id = ${chatId}

      UNION ALL

      SELECT
        parent_message.id,
        parent_message.role,
        parent_message.content,
        parent_message.parent_message_id AS "parentMessageId",
        child_chain.depth + 1
      FROM messages AS parent_message
      INNER JOIN message_chain AS child_chain
        ON parent_message.id = child_chain."parentMessageId"
      WHERE parent_message.chat_id = ${chatId}
    )
    SELECT
      id,
      role,
      content,
      "parentMessageId"
    FROM message_chain
    ORDER BY depth DESC
  `)

  return branchMessages.map((message) => toHistoryMessage(message))
}
