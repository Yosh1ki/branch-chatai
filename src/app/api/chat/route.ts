import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const FREE_PLAN_DAILY_LIMIT = 10;

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
    // For MVP, we'll just send the current message. 
    // Ideally, we should traverse the tree back to root to build history.
    // TODO: Build message history from tree
    
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Default model
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: content }
      ],
    });

    const assistantContent = completion.choices[0].message.content || "";

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
  } catch (error) {
    console.error("Error in chat API:", error);
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
