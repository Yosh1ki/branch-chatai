export type ChatMessage = {
  id?: string;
  role: string;
  content: string;
  parentMessageId?: string | null;
  branchId?: string | null;
};

export type ChatBranch = {
  id: string;
  parentMessageId: string;
  side: "left" | "right";
  createdAt?: string;
};

export type ChatResponse = {
  messages?: ChatMessage[];
  branches?: ChatBranch[];
};

type ChatResponseErrorPayload = {
  error?: string;
};

export class ChatResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatResponseError";
  }
}

const responseCache = new Map<string, Promise<ChatResponse>>();

const DEFAULT_RESPONSE_ERROR = "レスポンスの取得に失敗しました。";

async function requestChatMessages(chatId: string): Promise<ChatResponse> {
  const response = await fetch(`/api/chats/${chatId}`);
  let data: ChatResponse | ChatResponseErrorPayload = {};
  try {
    data = (await response.json()) as ChatResponse;
  } catch {
    data = {};
  }

  if (!response.ok) {
    const errorText =
      (data as ChatResponseErrorPayload)?.error || DEFAULT_RESPONSE_ERROR;
    throw new ChatResponseError(errorText);
  }

  return data as ChatResponse;
}

export async function fetchChatMessages(chatId: string): Promise<ChatResponse> {
  if (!chatId) {
    return { messages: [] };
  }

  const cached = responseCache.get(chatId);
  if (cached) {
    return cached;
  }

  const request = requestChatMessages(chatId).finally(() => {
    responseCache.delete(chatId);
  });
  responseCache.set(chatId, request);
  return request;
}

export function findLastMessageByRole(messages: ChatMessage[], role: string) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === role) {
      return message;
    }
  }
  return undefined;
}
