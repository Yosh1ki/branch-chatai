import { auth } from "@/auth"
import { ChatActionError, sendChatMessage } from "@/lib/chat-service"
import { createChatHandler } from "@/app/api/chat/handler"

export const { POST } = createChatHandler({ auth, sendChatMessage, ChatActionError })
