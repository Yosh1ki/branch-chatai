import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const FREE_PLAN_DAILY_LIMIT = 10;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth();
  const { messageId } = await params;

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      conversationId, // Should be passed, or we can look it up from parent
      role,
      content,
      modelProvider,
      modelName,
    } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify parent message exists
    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!parentMessage) {
      return NextResponse.json(
        { error: "Parent message not found" },
        { status: 404 }
      );
    }

    // Use conversationId from parent if not provided
    const targetConversationId = conversationId || parentMessage.conversationId;

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

    // 2. Create Message (Branch)
    const message = await prisma.message.create({
      data: {
        conversationId: targetConversationId,
        role,
        content,
        modelProvider,
        modelName,
        parentMessageId: messageId,
      },
    });

    // 3. Update Usage Stats
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
    console.error("Error creating branch:", error);
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}
