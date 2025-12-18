import { PromptCard } from "@/components/chats/prompt-card"
import { ChatList } from "@/components/chats/chat-list"
import { auth, signOut } from "@/auth"
import prisma from "@/lib/prisma"
import { textStyle } from "@/styles/typography"
import { redirect } from "next/navigation"
import { AccountMenu } from "@/components/chats/account-menu"

async function getChats(userId: string) {
  return await prisma.chat.findMany({
    where: {
      userId,
      isArchived: false,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  })
}

async function createChatAction() {
  "use server"
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const chat = await prisma.chat.create({
    data: {
      userId: session.user.id,
      title: "New Chat",
      languageCode: "en",
    },
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
            messagesCount: chat._count.messages,
          }))}
        />
      </div>
    </div>
  )
}
