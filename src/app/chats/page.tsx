import Link from "next/link"
import { PromptCard } from "@/components/chats/prompt-card"
import { ChatListSection } from "@/components/chats/chat-list-section"
import { auth, signOut } from "@/auth"
import prisma from "@/lib/prisma"
import { textStyle } from "@/styles/typography"
import { redirect } from "next/navigation"
import { AccountMenu } from "@/components/chats/account-menu"
import { ChatActionError, sendChatMessage } from "@/lib/chat-service"
import { Prisma } from "@prisma/client"

async function getChats(userId: string) {
  const chats = await prisma.chat.findMany({
    where: {
      userId,
      isArchived: false,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      rootMessageId: true,
    },
  })

  const chatIds = chats.map((chat) => chat.id)

  const branchCounts = chatIds.length
    ? await prisma.$queryRaw<{ chatId: string; count: number }[]>(
        Prisma.sql`SELECT chat_id AS "chatId", COUNT(*)::int AS count
                   FROM branches
                   WHERE chat_id IN (${Prisma.join(chatIds)})
                   GROUP BY chat_id`
      )
    : []

  const countByChatId = new Map(branchCounts.map((item) => [item.chatId, item.count]))

  return chats.map((chat) => ({
    ...chat,
    branchCount: 1 + (countByChatId.get(chat.id) ?? 0),
  }))
}

type ChatActionState = {
  error?: string
}

async function createChatAction(
  _prevState: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  "use server"
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const prompt = formData.get("prompt")
  const modelProvider = formData.get("modelProvider")
  const modelName = formData.get("modelName")

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Prompt is required")
  }

  try {
    const { chat } = await sendChatMessage({
      userId: session.user.id,
      content: prompt,
      modelProvider: typeof modelProvider === "string" ? modelProvider : undefined,
      modelName: typeof modelName === "string" ? modelName : undefined,
    })

    redirect(`/chats/${chat.id}`)
  } catch (error) {
    if (error instanceof ChatActionError && error.status === 429) {
      return { error: "上限に達しました" }
    }
    throw error
  }
}

async function logoutAction() {
  "use server"
  await signOut({ redirectTo: "/login" })
}

export default async function ChatsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const chats = await getChats(session.user.id)

  return (
    <div className="min-h-screen bg-[#f9f7f7] text-main">
      <header className="flex w-full items-center justify-between px-2 py-6">
        <Link
          href="/chats"
          className="text-left font-title text-3xl tracking-wide text-main md:text-2xl"
          style={textStyle("pacifico")}
        >
          Branch
        </Link>
        <AccountMenu user={session.user} onLogout={logoutAction} />
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-12">
        <PromptCard action={createChatAction} />
        <ChatListSection
          initialChats={chats.map((chat) => ({
            id: chat.id,
            title: chat.title,
            updatedAt: chat.updatedAt.toISOString(),
            branchCount: chat.branchCount,
          }))}
        />
      </div>
    </div>
  )
}
