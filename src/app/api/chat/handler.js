import { NextResponse } from "next/server.js";

const extractPlainText = (content) => {
  if (typeof content !== "string") return "";
  try {
    const parsed = JSON.parse(content);
    if (parsed?.format === "markdown" && typeof parsed.text === "string") {
      return parsed.text;
    }
    if (parsed?.format === "richjson" && parsed.doc?.blocks) {
      const lines = [];
      parsed.doc.blocks.forEach((block) => {
        switch (block.type) {
          case "heading":
          case "paragraph":
          case "callout":
            if (block.text) lines.push(block.text);
            break;
          case "bullets":
            block.items?.forEach((item) => lines.push(`- ${item}`));
            break;
          case "numbered":
            block.items?.forEach((item, index) => {
              if (typeof item === "string") {
                lines.push(`${index + 1}. ${item}`);
                return;
              }
              if (item.title) lines.push(`${index + 1}. ${item.title}`);
              item.lines?.forEach((line) => lines.push(`- ${line}`));
            });
            break;
          case "code":
            if (block.code) lines.push(block.code);
            break;
          default:
            break;
        }
      });
      return lines.join("\n").trim();
    }
  } catch {
    return content;
  }
  return content;
};

const buildStreamResponse = (result) => {
  const assistantText = extractPlainText(result.assistantMessage?.content);
  const encoder = new TextEncoder();
  const chunkSize = 32;

  const streamBody = new ReadableStream({
    start(controller) {
      for (let index = 0; index < assistantText.length; index += chunkSize) {
        const chunk = assistantText.slice(index, index + chunkSize);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "delta", text: chunk })}\n\n`)
        );
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "final", payload: result })}\n\n`)
      );
      controller.close();
    },
  });

  return new NextResponse(streamBody, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

export const createChatHandler = ({ auth, sendChatMessage, ChatActionError }) => {
  const POST = async (req) => {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json();
    const {
      content,
      chatId,
      parentMessageId,
      branchId,
      branchSide,
      modelProvider,
      modelName,
      requestId,
      stream,
    } = json;

    try {
      const result = await sendChatMessage({
        userId: session.user.id,
        content,
        chatId,
        parentMessageId,
        branchId,
        branchSide,
        modelProvider,
        modelName,
        requestId,
      });

      if (stream) {
        return buildStreamResponse(result);
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("Error in chat API:", error);
      const err = error;

      if (ChatActionError && error instanceof ChatActionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      if (err?.code === "insufficient_quota") {
        return NextResponse.json(
          { error: "OpenAI API quota exceeded. Please check your billing details." },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };

  return { POST };
};
