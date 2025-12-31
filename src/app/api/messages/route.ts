import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const FREE_PLAN_DAILY_LIMIT = 10;

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      chatId,
      role,
      content,
      modelProvider,
      modelName,
      parentMessageId,
      branchId,
    } = body;

    if (!chatId || !role || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    // 2. Create Message
    const message = await prisma.message.create({
      data: {
        chatId,
        role,
        content,
        modelProvider,
        modelName,
        parentMessageId,
        branchId,
      },
    });

    // 3. Update chat rootMessageId if it's the first message
    // (Optional optimization: check if chat.rootMessageId is null)
    // For now, if parentMessageId is null, we can assume it might be a root candidate.
    // But usually the client knows if it's starting a chat thread.
    // Let's just rely on the client or check if it's the first one.
    if (!parentMessageId) {
       const chat = await prisma.chat.findUnique({
         where: { id: chatId },
         select: { rootMessageId: true }
       });
       if (!chat?.rootMessageId) {
         await prisma.chat.update({
           where: { id: chatId },
           data: { rootMessageId: message.id }
         });
       }
    }

    // 4. Update Usage Stats
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

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
