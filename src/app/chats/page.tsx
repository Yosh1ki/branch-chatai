import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, MessageSquare } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

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

export default async function ChatsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const chats = await getChats(session.user.id)

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
          <p className="text-muted-foreground">Pick a chat to continue branching ideas.</p>
        </div>
        <form
          action={async () => {
            "use server"
            const session = await auth()
            if (!session?.user?.id) return

            const chat = await prisma.chat.create({
              data: {
                userId: session.user.id,
                title: "New Chat",
                languageCode: "en",
              },
            })
            redirect(`/chats/${chat.id}`)
          }}
        >
          <Button type="submit">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {chats.map((chat) => (
          <Link key={chat.id} href={`/chats/${chat.id}`}>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg truncate">{chat.title}</CardTitle>
                <CardDescription>
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {chat._count.messages} messages
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {chats.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No chats yet. Start a new one!
          </div>
        )}
      </div>
    </div>
  )
}
