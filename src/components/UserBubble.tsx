"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/chat-screen-state";

type UserBubbleProps = {
  chatId: string;
};

type ChatMessage = {
  role: string;
  content: string;
};

type ChatResponse = {
  messages?: ChatMessage[];
};

export function UserBubble({ chatId }: UserBubbleProps) {
  const [userText, setUserText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUserMessage = async () => {
      try {
        const response = await fetch(`/api/chats/${chatId}`);
        const data: ChatResponse = await response.json();

        if (!response.ok) {
          const errorText =
            (data as { error?: string })?.error || "レスポンスの取得に失敗しました。";
          if (isMounted) {
            setErrorMessage(errorText);
            setUserText("");
          }
          return;
        }

        const messages = data.messages ?? [];
        const lastUser = [...messages].reverse().find((message) => message.role === "user");
        const content = lastUser?.content || "";
        if (isMounted) {
          setUserText(content);
          setErrorMessage("");
        }
      } catch {
        if (isMounted) {
          setErrorMessage("通信に失敗しました。");
          setUserText("");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUserMessage();

    return () => {
      isMounted = false;
    };
  }, [chatId]);

  const handleCopy = async () => {
    if (!userText) return;
    await copyToClipboard(userText);
  };

  return (
    <div className="relative">
      <div className="rounded-full bg-white px-5 py-2 text-base text-main ring-1 ring-[#efe5dc]">
        {isLoading ? (
          "読み込み中..."
        ) : errorMessage ? (
          <span className="text-red-500">エラー: {errorMessage}</span>
        ) : userText ? (
          userText
        ) : (
          "まだメッセージがありません。"
        )}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy user message"
        disabled={!userText}
        className="absolute -bottom-2 right-3 flex h-6 w-6 items-center justify-center rounded-lg border border-[#e6ddd3] bg-white text-main-muted transition hover:text-main"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}
