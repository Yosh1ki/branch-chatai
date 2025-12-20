import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { ChatActionError, sendChatMessage } from "@/lib/chat-service"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const json = await req.json()
  const { content, chatId, parentMessageId, modelProvider, modelName } = json

  try {
    const result = await sendChatMessage({
      userId: session.user.id,
      content,
      chatId,
      parentMessageId,
      modelProvider,
      modelName,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("Error in chat API:", error);
    const err = error as { code?: string };

    if (error instanceof ChatActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

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
