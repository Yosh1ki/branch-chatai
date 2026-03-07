import Link from "next/link"
import { PromptCard } from "@/components/chats/prompt-card"
import { ChatListSection } from "@/components/chats/chat-list-section"
import { auth, signOut } from "@/auth"
import prisma from "@/lib/prisma"
import { randomUUID } from "crypto"
import { textStyle } from "@/styles/typography"
import { redirect } from "next/navigation"
import { AccountMenu } from "@/components/chats/account-menu"
import { isModelProvider, isReasoningEffort } from "@/lib/model-catalog"
import { Prisma } from "@prisma/client"
import { assertWithinUsageLimits } from "@/lib/usage-limiter"
import { ChatActionError } from "@/lib/chat-errors"
import { resolveErrorMessage } from "@/lib/i18n/error-messages"
import { translate } from "@/lib/i18n"
import { resolveRequestLocale } from "@/lib/i18n/locale"
import { getSettingsViewData } from "@/lib/settings-view"
import { SettingsSections } from "@/components/settings/settings-sections"
import { fallbackChatTitle, inferChatTitleLocale } from "@/lib/chat-title"
import { getUsageLimitErrorMessageKey } from "@/lib/usage-quota-messages"

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
  const locale = await resolveRequestLocale()
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const prompt = formData.get("prompt")
  const modelProvider = formData.get("modelProvider")
  const modelName = formData.get("modelName")
  const modelReasoningEffort = formData.get("modelReasoningEffort")

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Prompt is required")
  }
  const trimmedPrompt = prompt.trim()
  const titleLocale = inferChatTitleLocale(trimmedPrompt)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { planType: true },
  })

  try {
    await assertWithinUsageLimits(session.user.id, user?.planType)
  } catch (error) {
    if (error instanceof ChatActionError && error.status === 429) {
      const errorCode = getUsageLimitErrorMessageKey(error.code)
      return {
        error: errorCode
          ? translate(errorCode, { locale })
          : resolveErrorMessage("sendFailed", { locale }).message,
      }
    }
    throw error
  }

  const chat = await prisma.chat.create({
    data: {
      userId: session.user.id,
      title: fallbackChatTitle(titleLocale),
      languageCode: titleLocale,
    },
    select: { id: true },
  })

  const params = new URLSearchParams({
    prompt: trimmedPrompt,
    requestId: randomUUID(),
  })
  if (typeof modelProvider === "string" && isModelProvider(modelProvider)) {
    params.set("modelProvider", modelProvider)
  }
  if (typeof modelName === "string" && modelName) {
    params.set("modelName", modelName)
  }
  if (typeof modelReasoningEffort === "string" && isReasoningEffort(modelReasoningEffort)) {
    params.set("modelReasoningEffort", modelReasoningEffort)
  }

  redirect(`/chats/${chat.id}?${params.toString()}`)
}

async function logoutAction() {
  "use server"
  await signOut({ redirectTo: "/login" })
}

export default async function ChatsPage() {
  const session = await auth()
  const locale = await resolveRequestLocale()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const [chats, settings] = await Promise.all([
    getChats(session.user.id),
    getSettingsViewData(session.user.id),
  ])

  return (
    <div className="min-h-screen bg-(--color-app-bg) text-main">
      <header className="flex w-full items-center justify-between px-2 py-6">
        <Link
          href="/chats"
          className="text-left font-title text-3xl tracking-wide text-main md:text-2xl"
          style={textStyle("pacifico")}
        >
          Branch
        </Link>
        <AccountMenu
          user={session.user}
          onLogout={logoutAction}
          settingsContent={<SettingsSections locale={locale} settings={settings} />}
        />
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-12">
        <PromptCard
          action={createChatAction}
          planType={settings.planType}
          quotaStatus={settings.quotaStatus}
        />
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
