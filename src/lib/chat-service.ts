import prisma from "@/lib/prisma"
import OpenAI from "openai"
import type { Chat, Message } from "@prisma/client"

const FREE_PLAN_DAILY_LIMIT = 10
const DEV_ASSISTANT_RESPONSE =
  "白ワインのおすすめは以下の通りです。好みによって選ぶと良いでしょう。 1. **ソーヴィニヨン・ブラン**： - **代表的な産地**：ニュージーランド、フランス（ロワール渓谷） - **特徴**：フレッシュで爽やかな酸味、柑橘系の香りやトロピカルフルーツの風味。魚料理やサラダとも相性抜群です。 2. **シャルドネ**： - **代表的な産地**：フランス（ブルゴーニュ）、アメリカ（カリフォルニア） - **特徴**：豊かでクリーミーな味わい、樽熟成によるバターやバニラのニュアンス。チキンやクリームソースの料理に合います。 3. **リースリング**： - **代表的な産地**：ドイツ、オーストラリア - **特徴**：甘口から辛口まで幅広いスタイルがあり、蜜や桃の香りが特徴的。辛口のリースリングはアジア料理とよく合います。 4. **ピノ・グリージョ**： - **代表的な産地**：イタリア、アメリカ - **特徴**：軽やかで飲みやすい、洋梨やリンゴの香り。前菜や軽い料理と相性が良いです。 5. **グルナッシュ・ブラン**： - **代表的な産地**：フランス（ローヌ地方） - **特徴**：果実味とハーブのニュアンス。魚料理や野菜料理によく合います。 これらの白ワインは、料理やシチュエーションに応じて楽しむことができるので、ぜひ試してみてください。好みに合わせて選ぶと良いでしょう。"

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  return new OpenAI({ apiKey })
}

export class ChatActionError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

type MessageForTree = Pick<Message, "id" | "role" | "content" | "parentMessageId">

type SendChatMessageArgs = {
  userId: string
  content: string
  chatId?: string
  parentMessageId?: string | null
  modelProvider?: string | null
  modelName?: string | null
}

type SendChatMessageResult = {
  chat: Chat
  userMessage: Message
  assistantMessage: Message
}

export async function sendChatMessage({
  userId,
  content,
  chatId,
  parentMessageId,
  modelProvider,
  modelName,
}: SendChatMessageArgs): Promise<SendChatMessageResult> {
  const trimmedContent = content?.trim()
  if (!trimmedContent) {
    throw new ChatActionError("Content is required", 400)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planType: true },
  })

  if (user?.planType === "free") {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const usage = await prisma.usageStat.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    })

    if (usage && usage.messageCount >= FREE_PLAN_DAILY_LIMIT) {
      throw new ChatActionError("Daily message limit reached", 429)
    }
  }

  let chatRecord: Chat
  if (chatId) {
    const existing = await prisma.chat.findUnique({
      where: { id: chatId, userId },
    })
    if (!existing) {
      throw new ChatActionError("Chat not found", 404)
    }
    chatRecord = existing
  } else {
    chatRecord = await prisma.chat.create({
      data: {
        userId,
        title: trimmedContent.slice(0, 50),
        languageCode: "en",
      },
    })
  }

  const userMessage = await prisma.message.create({
    data: {
      chatId: chatRecord.id,
      role: "user",
      content: trimmedContent,
      parentMessageId,
      modelProvider,
      modelName,
    },
  })

  if (!chatRecord.rootMessageId && !parentMessageId) {
    await prisma.chat.update({
      where: { id: chatRecord.id },
      data: { rootMessageId: userMessage.id },
    })
  }

  const allMessages: MessageForTree[] = await prisma.message.findMany({
    where: { chatId: chatRecord.id },
    select: {
      id: true,
      role: true,
      content: true,
      parentMessageId: true,
    },
  })

  const path: MessageForTree[] = [
    {
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      parentMessageId: userMessage.parentMessageId,
    },
  ]

  let parentId = userMessage.parentMessageId

  while (parentId) {
    const parent = allMessages.find((m) => m.id === parentId)
    if (parent) {
      path.unshift(parent)
      parentId = parent.parentMessageId
    } else {
      break
    }
  }

  const messagesForLLM = [
    { role: "system" as const, content: "You are a helpful AI assistant." },
    ...path.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ]

  const assistantContent =
    (
      process.env.NODE_ENV === "development"
        ? DEV_ASSISTANT_RESPONSE
        : (await getOpenAIClient().chat.completions.create({
            model: "gpt-4o-mini",
            messages: messagesForLLM,
          })).choices[0].message.content
    ) || ""

  const assistantMessage = await prisma.message.create({
    data: {
      chatId: chatRecord.id,
      role: "assistant",
      content: assistantContent,
      parentMessageId: userMessage.id,
      modelProvider: "openai",
      modelName: "gpt-4o-mini",
    },
  })

  if (user?.planType === "free") {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.usageStat.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        messageCount: { increment: 1 },
      },
      create: {
        userId,
        date: today,
        messageCount: 1,
      },
    })
  }

  return { chat: chatRecord, userMessage, assistantMessage }
}
