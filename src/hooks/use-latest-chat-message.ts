import { useEffect, useState } from "react";
import {
  ChatResponseError,
  fetchChatMessages,
  findLastMessageByRole,
} from "@/lib/chat-messages";

type LatestChatMessageState = {
  chatId: string;
  role: string;
  content: string;
  errorMessage: string;
  isLoading: boolean;
};

const NETWORK_ERROR_MESSAGE = "通信に失敗しました。";

export function useLatestChatMessage(chatId: string, role: string) {
  const [state, setState] = useState<LatestChatMessageState>({
    chatId,
    role,
    content: "",
    errorMessage: "",
    isLoading: true,
  });

  const isStale = state.chatId !== chatId || state.role !== role;

  useEffect(() => {
    let isActive = true;

    fetchChatMessages(chatId)
      .then((data) => {
        if (!isActive) return;
        const messages = data.messages ?? [];
        const lastMessage = findLastMessageByRole(messages, role);
        setState({
          chatId,
          role,
          content: lastMessage?.content || "",
          errorMessage: "",
          isLoading: false,
        });
      })
      .catch((error) => {
        if (!isActive) return;
        const errorMessage =
          error instanceof ChatResponseError
            ? error.message
            : NETWORK_ERROR_MESSAGE;
        setState({
          chatId,
          role,
          content: "",
          errorMessage,
          isLoading: false,
        });
      });

    return () => {
      isActive = false;
    };
  }, [chatId, role]);

  return {
    content: isStale ? "" : state.content,
    errorMessage: isStale ? "" : state.errorMessage,
    isLoading: isStale ? true : state.isLoading,
  };
}
