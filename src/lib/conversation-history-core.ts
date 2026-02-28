export type ConversationRole = "user" | "assistant"

export type ConversationHistoryMessage = {
  id: string
  role: ConversationRole
  content: string
  parentMessageId: string | null
}

export type ConversationHistorySourceMessage = {
  id: string
  role: string
  content: string
  parentMessageId: string | null
}

type BuildParentChainOptions = {
  toHistoryMessage?: (message: ConversationHistorySourceMessage) => ConversationHistoryMessage
}

const toDefaultHistoryMessage = (
  message: ConversationHistorySourceMessage
): ConversationHistoryMessage => ({
  id: message.id,
  role: message.role as ConversationRole,
  content: message.content,
  parentMessageId: message.parentMessageId,
})

export const buildParentChain = (
  messages: ConversationHistorySourceMessage[],
  parentMessageId?: string | null,
  options?: BuildParentChainOptions
) => {
  if (!parentMessageId) {
    return []
  }

  const messageById = new Map(messages.map((message) => [message.id, message]))
  const chain: ConversationHistoryMessage[] = []
  const toHistoryMessage = options?.toHistoryMessage ?? toDefaultHistoryMessage
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
