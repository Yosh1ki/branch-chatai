import { PromptCard } from "@/components/chats/prompt-card"
import { ChatList } from "@/components/chats/chat-list"
import { auth, signOut } from "@/auth"
import prisma from "@/lib/prisma"
import { textStyle } from "@/styles/typography"
import { redirect } from "next/navigation"
import { AccountMenu } from "@/components/chats/account-menu"
import { sendChatMessage } from "@/lib/chat-service"

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

  return chats.map((chat, index) => ({
    ...chat,
    branchCount: chat.rootMessageId ? countByRootId.get(chat.rootMessageId) ?? 0 : 0,
  }))
}

async function createChatAction(formData: FormData) {
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

  const { chat } = await sendChatMessage({
    userId: session.user.id,
    content: prompt,
    modelName: typeof model === "string" ? model : undefined,
  })

  redirect(`/chats/${chat.id}`)
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
    <div className="min-h-screen bg-[#f8f4f1] text-main">
      <header className="flex w-full max-w-4xl items-center mx-5 py-4">
        <AccountMenu user={session.user} onLogout={logoutAction} />
      </header>
      <p
        className="mx-auto max-w-4xl px-6 text-center font-title text-5xl tracking-wide text-main md:text-6xl"
        style={textStyle("pacifico")}
      >
        Branch
      </p>

      <div className="mx-auto mt-6 flex w-full max-w-4xl flex-col gap-16 px-6 pb-12">
        <PromptCard action={createChatAction} />

        <ChatList
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
