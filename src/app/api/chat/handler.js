import { NextResponse } from "next/server.js";
import { randomUUID } from "crypto";

const getTokenCallbackStore = () => {
  const storeKey = "__branchTokenCallbacks";
  if (!globalThis[storeKey]) {
    globalThis[storeKey] = new Map();
  }
  return globalThis[storeKey];
};

const registerTokenCallback = (requestId, callback) => {
  getTokenCallbackStore().set(requestId, callback);
};

const unregisterTokenCallback = (requestId) => {
  if (!requestId) return;
  getTokenCallbackStore().delete(requestId);
};

const extractPlainText = (content) => {
  if (typeof content !== "string") return "";
  try {
    const parsed = JSON.parse(content);
    if (parsed?.format === "markdown" && typeof parsed.text === "string") {
      return parsed.text;
    }
  } catch {
    return content;
  }
  return content;
};

const buildStreamResponse = ({
  sendChatMessage,
  ChatActionError,
  args,
  requestId,
}) => {
  const encoder = new TextEncoder();
  const fallbackChunkSize = 32;

  const streamBody = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let emittedDelta = false;
      const emit = (payload) => {
        if (isClosed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      const close = () => {
        if (isClosed) return;
        isClosed = true;
        controller.close();
      };

      (async () => {
        try {
          registerTokenCallback(requestId, (token) => {
            if (typeof token !== "string" || token.length === 0) {
              return;
            }
            emittedDelta = true;
            emit({ type: "delta", text: token });
          });
          const result = await sendChatMessage({
            ...args,
            requestId,
            onToken: (token) => {
              if (typeof token !== "string" || token.length === 0) {
                return;
              }
              emittedDelta = true;
              emit({ type: "delta", text: token });
            },
          });

          if (!emittedDelta) {
            const assistantText = extractPlainText(result.assistantMessage?.content);
            for (let index = 0; index < assistantText.length; index += fallbackChunkSize) {
              emit({
                type: "delta",
                text: assistantText.slice(index, index + fallbackChunkSize),
              });
            }
          }

          emit({ type: "final", payload: result });
        } catch (error) {
          console.error("Error in chat stream API:", error);
          const err = error;
          let errorMessage = "Internal Server Error";
          let status = 500;

          if (ChatActionError && error instanceof ChatActionError) {
            errorMessage = error.message;
            status = error.status;
          } else if (err?.code === "insufficient_quota") {
            errorMessage = "OpenAI API quota exceeded. Please check your billing details.";
            status = 429;
          }

          emit({ type: "error", error: errorMessage, status });
        } finally {
          unregisterTokenCallback(requestId);
          close();
        }
      })();
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
      modelReasoningEffort,
      requestId,
      stream,
    } = json;

    const resolvedRequestId = typeof requestId === "string" && requestId ? requestId : randomUUID();
    const args = {
      userId: session.user.id,
      content,
      chatId,
      parentMessageId,
      branchId,
      branchSide,
      modelProvider,
      modelName,
      modelReasoningEffort,
      requestId: resolvedRequestId,
    };

    if (stream) {
      return buildStreamResponse({
        sendChatMessage,
        ChatActionError,
        args,
        requestId: resolvedRequestId,
      });
    }

    try {
      const result = await sendChatMessage(args);

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
