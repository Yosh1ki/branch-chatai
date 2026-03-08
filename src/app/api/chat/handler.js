import { NextResponse } from "next/server.js";
import { randomUUID } from "crypto";
import { logChatTiming } from "@/lib/chat-timing";

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
  const streamStartedAt =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();

  const streamBody = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let emittedDelta = false;
      let firstTokenLogged = false;
      const emit = (payload) => {
        if (isClosed) return;
        if (!firstTokenLogged && payload?.type === "delta") {
          firstTokenLogged = true;
          const nowValue =
            typeof performance !== "undefined" && typeof performance.now === "function"
              ? performance.now()
              : Date.now();
          logChatTiming("chat_api_stream_first_token", {
            chatId: args.chatId ?? null,
            durationMs: Math.round((nowValue - streamStartedAt) * 100) / 100,
            requestId,
          });
        }
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
          if (typeof sendChatMessage.afterSend === "function") {
            void Promise.resolve()
              .then(() => sendChatMessage.afterSend(result, args))
              .catch((error) => {
                console.error("Post-response chat task failed:", error);
              });
          }

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
          const nowValue =
            typeof performance !== "undefined" && typeof performance.now === "function"
              ? performance.now()
              : Date.now();
          logChatTiming("chat_api_stream_complete", {
            chatId: result?.chat?.id ?? args.chatId ?? null,
            durationMs: Math.round((nowValue - streamStartedAt) * 100) / 100,
            emittedDelta,
            requestId,
          });
        } catch (error) {
          console.error("Error in chat stream API:", error);
          const err = error;
          let errorMessage = "Internal Server Error";
          let status = 500;
          let code;
          let details;

          if (ChatActionError && error instanceof ChatActionError) {
            errorMessage = error.message;
            status = error.status;
            code = error.code;
            details = error.details;
          } else if (err?.code === "insufficient_quota") {
            errorMessage = "OpenAI API quota exceeded. Please check your billing details.";
            status = 429;
          }

          emit({ type: "error", error: errorMessage, status, code, details });
          const nowValue =
            typeof performance !== "undefined" && typeof performance.now === "function"
              ? performance.now()
              : Date.now();
          logChatTiming("chat_api_stream_error", {
            chatId: args.chatId ?? null,
            durationMs: Math.round((nowValue - streamStartedAt) * 100) / 100,
            errorMessage,
            requestId,
            status,
          });
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
  const runAfterResponse = (result, args) => {
    if (typeof sendChatMessage.afterSend !== "function") {
      return;
    }

    void Promise.resolve()
      .then(() => sendChatMessage.afterSend(result, args))
      .catch((error) => {
        console.error("Post-response chat task failed:", error);
      });
  };

  const POST = async (req) => {
    const requestStartedAt =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
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
      const nowValue =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      logChatTiming("chat_api_request", {
        chatId: chatId ?? null,
        durationMs: Math.round((nowValue - requestStartedAt) * 100) / 100,
        mode: "stream_setup",
        requestId: resolvedRequestId,
      });
      return buildStreamResponse({
        sendChatMessage,
        ChatActionError,
        args,
        requestId: resolvedRequestId,
      });
    }

    try {
      const result = await sendChatMessage(args);
      runAfterResponse(result, args);
      const nowValue =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      logChatTiming("chat_api_request", {
        chatId: result?.chat?.id ?? chatId ?? null,
        durationMs: Math.round((nowValue - requestStartedAt) * 100) / 100,
        mode: "json",
        requestId: resolvedRequestId,
      });

      return NextResponse.json(result);
    } catch (error) {
      console.error("Error in chat API:", error);
      const err = error;
      const nowValue =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      logChatTiming("chat_api_error", {
        chatId: chatId ?? null,
        durationMs: Math.round((nowValue - requestStartedAt) * 100) / 100,
        errorMessage: error instanceof Error ? error.message : String(error),
        requestId: resolvedRequestId,
      });

      if (ChatActionError && error instanceof ChatActionError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            details: error.details,
          },
          { status: error.status }
        );
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
