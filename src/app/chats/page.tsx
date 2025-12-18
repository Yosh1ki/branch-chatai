import { auth, signOut } from "@/auth"
import prisma from "@/lib/prisma"
import { textStyle } from "@/styles/typography"
import { ArrowRight, MessageSquare, Menu } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

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
        <div className="flex items-center gap-3 justify-start">
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#f1d0c7] bg-white text-main shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b5a2]"
          >
            <Menu className="h-6 w-6" />
          </button>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full border border-[#f1d0c7] bg-white px-5 py-2 text-sm font-semibold text-main shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a091]"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      <p
        className="mx-auto max-w-4xl px-6 text-center font-title text-5xl tracking-wide text-main md:text-6xl"
        style={textStyle("pacifico")}
      >
        Branch
      </p>

      <div className="mx-auto mt-6 flex w-full max-w-4xl flex-col gap-16 px-6 pb-12">
        <section className="rounded-[32px] bg-white/90 p-8 shadow-[0_20px_80px_rgba(68,41,33,0.08)] backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex-1">
              <p className="font-small text-2xl text-main-muted">Branchを育てる</p>
              <span className="mt-5 inline-flex items-center rounded-full bg-theme-main px-4 py-1 text-sm font-semibold text-[#417539]">
                ChatGPT 5.2 Thinking
              </span>
            </div>
            <form action={createChatAction}>
              <button
                type="submit"
                aria-label="Start a new chat"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-main text-white transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c5a091]"
              >
                <ArrowRight className="h-6 w-6" />
              </button>
            </form>
          </div>
        </section>

        {chats.length === 0 ? (
          <p className="text-center text-2xl text-main-lite">No any chats. Let&apos;s grow branch!</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-5 md:grid-cols-2">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chats/${chat.id}`}
                  className="rounded-[24px] bg-white/90 p-6 shadow-[0_10px_40px_rgba(68,41,33,0.08)] transition hover:-translate-y-1"
                >
                  <div className="text-lg font-semibold leading-tight">{chat.title}</div>
                  <p className="mt-1 text-sm text-main-muted">
                    {new Date(chat.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-main-lite">
                    <MessageSquare className="h-4 w-4" />
                    {chat._count.messages} messages
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
