import Link from "next/link"
import { PromptCard } from "@/components/chats/prompt-card"
import { ChatListSection } from "@/components/chats/chat-list-section"
import { auth, signOut } from "@/auth"
import prisma from "@/lib/prisma"
import { textStyle } from "@/styles/typography"
import { redirect } from "next/navigation"
import { AccountMenu } from "@/components/chats/account-menu"
import { ChatActionError, sendChatMessage } from "@/lib/chat-service"

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

  const rootIds = chats.map((chat) => chat.rootMessageId).filter(Boolean) as string[]

  const branchCounts = rootIds.length
    ? await prisma.message.groupBy({
        by: ["chatId", "parentMessageId"],
        where: {
          parentMessageId: { in: rootIds },
        },
        _count: {
          id: true,
        },
      })
    : []

  const countByRootId = new Map(branchCounts.map((item) => [item.parentMessageId, item._count.id]))

  return chats.map((chat) => ({
    ...chat,
    branchCount: chat.rootMessageId ? countByRootId.get(chat.rootMessageId) ?? 0 : 0,
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
  const model = formData.get("model")

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Prompt is required")
  }

  try {
    const { chat } = await sendChatMessage({
      userId: session.user.id,
      content: prompt,
      modelName: typeof model === "string" ? model : undefined,
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
