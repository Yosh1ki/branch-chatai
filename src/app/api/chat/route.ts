import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const FREE_PLAN_DAILY_LIMIT = 10;
const DEV_ASSISTANT_RESPONSE =
  "白ワインのおすすめは以下の通りです。好みによって選ぶと良いでしょう。 1. **ソーヴィニヨン・ブラン**： - **代表的な産地**：ニュージーランド、フランス（ロワール渓谷） - **特徴**：フレッシュで爽やかな酸味、柑橘系の香りやトロピカルフルーツの風味。魚料理やサラダとも相性抜群です。 2. **シャルドネ**： - **代表的な産地**：フランス（ブルゴーニュ）、アメリカ（カリフォルニア） - **特徴**：豊かでクリーミーな味わい、樽熟成によるバターやバニラのニュアンス。チキンやクリームソースの料理に合います。 3. **リースリング**： - **代表的な産地**：ドイツ、オーストラリア - **特徴**：甘口から辛口まで幅広いスタイルがあり、蜜や桃の香りが特徴的。辛口のリースリングはアジア料理とよく合います。 4. **ピノ・グリージョ**： - **代表的な産地**：イタリア、アメリカ - **特徴**：軽やかで飲みやすい、洋梨やリンゴの香り。前菜や軽い料理と相性が良いです。 5. **グルナッシュ・ブラン**： - **代表的な産地**：フランス（ローヌ地方） - **特徴**：果実味とハーブのニュアンス。魚料理や野菜料理によく合います。 これらの白ワインは、料理やシチュエーションに応じて楽しむことができるので、ぜひ試してみてください。好みに合わせて選ぶと良いでしょう。";

// Initialize OpenAI client lazily or check for key
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
};

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const json = await req.json()
  const { content, conversationId, parentMessageId, modelProvider, modelName } = json

  if (!content) {
    return new NextResponse("Content is required", { status: 400 })
  }

  try {
    // 1. Check Usage Limits for Free Plan
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { planType: true },
    });

    if (user?.planType === "free") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usage = await prisma.usageStat.findUnique({
        where: {
          userId_date: {
            userId: session.user.id,
            date: today,
          },
        },
      });

      if (usage && usage.messageCount >= FREE_PLAN_DAILY_LIMIT) {
        return NextResponse.json(
          { error: "Daily message limit reached" },
          { status: 429 }
        );
      }
    }

    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, userId: session.user.id },
      })
      if (!conversation) {
        return new NextResponse("Conversation not found", { status: 404 })
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: content.slice(0, 50),
          languageCode: "en",
        },
      })
    }

    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content,
        parentMessageId,
        modelProvider,
        modelName,
      },
    })

    if (!conversation.rootMessageId && !parentMessageId) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { rootMessageId: userMessage.id },
      })
    }

    // Call OpenAI
    // Build message history from tree
    // 1. Fetch all messages for this conversation to traverse the tree
    // (Optimization: In a real app, use a recursive CTE or store path/materialized view)
    const allMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      select: { id: true, role: true, content: true, parentMessageId: true }
    });

    // 2. Reconstruct path from current message (userMessage) back to root
    const path: typeof allMessages = [userMessage];
    let parentId = userMessage.parentMessageId;

    while (parentId) {
      const parent = allMessages.find(m => m.id === parentId);
      if (parent) {
        path.unshift(parent);
        parentId = parent.parentMessageId;
      } else {
        break;
      }
    }

    // 3. Format for OpenAI
    const messagesForLLM = [
      { role: "system" as const, content: "You are a helpful AI assistant." },
      ...path.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }))
    ];
    
    const assistantContent =
      (
        process.env.NODE_ENV === "development"
          ? DEV_ASSISTANT_RESPONSE
          : (
              await getOpenAIClient().chat.completions.create({
                model: "gpt-4o-mini", // Default model
                messages: messagesForLLM,
              })
            ).choices[0].message.content
      ) || "";

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantContent,
        parentMessageId: userMessage.id,
        modelProvider: "openai",
        modelName: "gpt-4o-mini",
      },
    })

    // Update Usage Stats
    if (user?.planType === "free") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.usageStat.upsert({
        where: {
          userId_date: {
            userId: session.user.id,
            date: today,
          },
        },
        update: {
          messageCount: { increment: 1 },
        },
        create: {
          userId: session.user.id,
          date: today,
          messageCount: 1,
        },
      });
    }

    return NextResponse.json({ conversation, userMessage, assistantMessage })
  } catch (error: unknown) {
    console.error("Error in chat API:", error);
    const err = error as { code?: string };

    // Handle OpenAI specific errors
    if (err?.code === "insufficient_quota") {
      return NextResponse.json(
        { error: "OpenAI API quota exceeded. Please check your billing details." },
        { status: 429 }
      );
    }

    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
