import test from "node:test";
import assert from "node:assert/strict";
import { createChatHandler } from "../src/app/api/chat/handler.js";

const buildRequest = (body) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const readStreamText = async (response) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
};

test("createChatHandler returns streaming response when requested", async () => {
  const handler = createChatHandler({
    auth: async () => ({ user: { id: "user-1" } }),
    ChatActionError: class ChatActionError extends Error {
      constructor(message, status) {
        super(message);
        this.status = status;
      }
    },
    sendChatMessage: async () => ({
      chat: { id: "chat-1" },
      userMessage: { id: "user-msg-1" },
      assistantMessage: {
        id: "assistant-msg-1",
        content: JSON.stringify({
          format: "markdown",
          schemaVersion: "1.0",
          text: "hello",
        }),
      },
    }),
  });

  const response = await handler.POST(buildRequest({ content: "hi", stream: true }));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/event-stream");

  const body = await readStreamText(response);
  assert.ok(body.includes("\"type\":\"delta\""));
  assert.ok(body.includes("\"type\":\"final\""));
});

test("createChatHandler returns json response when not streaming", async () => {
  const handler = createChatHandler({
    auth: async () => ({ user: { id: "user-1" } }),
    ChatActionError: class ChatActionError extends Error {
      constructor(message, status) {
        super(message);
        this.status = status;
      }
    },
    sendChatMessage: async () => ({
      chat: { id: "chat-1" },
      userMessage: { id: "user-msg-1" },
      assistantMessage: { id: "assistant-msg-1", content: "hello" },
    }),
  });

  const response = await handler.POST(buildRequest({ content: "hi" }));

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.chat.id, "chat-1");
});

test("createChatHandler maps ChatActionError to json error", async () => {
  class ChatActionError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }

  const handler = createChatHandler({
    auth: async () => ({ user: { id: "user-1" } }),
    ChatActionError,
    sendChatMessage: async () => {
      throw new ChatActionError("Nope", 429);
    },
  });

  const response = await handler.POST(buildRequest({ content: "hi" }));
  const payload = await response.json();

  assert.equal(response.status, 429);
  assert.equal(payload.error, "Nope");
});
