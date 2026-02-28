import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { assertWithinDailyLimit, incrementDailyUsage } from "@/lib/usage-limiter";
import { ChatActionError } from "@/lib/chat-errors";
import { NextResponse } from "next/server";

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
      modelReasoningEffort,
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

    const usageDay = await assertWithinDailyLimit(session.user.id, user?.planType);

    // 2. Create Message
    const message = await prisma.message.create({
      data: {
        chatId,
        role,
        content,
        modelProvider,
        modelName,
        modelReasoningEffort,
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
    await incrementDailyUsage(session.user.id, user?.planType, {
      usageDay: usageDay ?? undefined,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    if (error instanceof ChatActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
