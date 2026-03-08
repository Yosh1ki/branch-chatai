import { auth } from "@/auth"
import { ChatActionError, sendChatMessage, updateChatTitleAfterSend } from "@/lib/chat-service"
import { createChatHandler } from "@/app/api/chat/handler"

const sendChatMessageWithAfterSend = Object.assign(sendChatMessage, {
  afterSend: async (
    result: Awaited<ReturnType<typeof sendChatMessage>>,
    args: { content: string }
  ) => {
    await updateChatTitleAfterSend({
      chatId: result.chat.id,
      content: args.content,
      createdChat: result.createdChat,
      idempotentHit: result.idempotentHit,
    })
  },
})

export const { POST } = createChatHandler({
  auth,
  sendChatMessage: sendChatMessageWithAfterSend,
  ChatActionError,
})
