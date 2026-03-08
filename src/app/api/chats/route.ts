import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  void req;
  const session = await auth();

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
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
        languageCode: true,
        rootMessageId: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          select: {
            id: true,
            role: true,
            content: true,
            parentMessageId: true,
            branchId: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 1, // Get the root message if needed, or just to show preview
        },
      },
    });

    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { title, languageCode } = body;

    const chat = await prisma.chat.create({
      data: {
        userId,
        title: title || "New Chat",
        languageCode: languageCode || "en",
      },
    });

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}
