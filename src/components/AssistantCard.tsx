"use client";

import { useEffect, useState } from "react";
import { Copy, MoreHorizontal } from "lucide-react";
import { copyToClipboard, toggleMenu } from "@/lib/chat-screen-state";

type AssistantCardProps = {
  chatId: string;
};

type ChatMessage = {
  role: string;
  content: string;
};

type ChatResponse = {
  messages?: ChatMessage[];
};

export function AssistantCard({ chatId }: AssistantCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAssistantMessage = async () => {
      try {
        const response = await fetch(`/api/chats/${chatId}`);

        const data: ChatResponse = await response.json();

        if (!response.ok) {
          const errorText =
            (data as { error?: string })?.error || "レスポンスの取得に失敗しました。";
          if (isMounted) {
            setErrorMessage(errorText);
            setAssistantText("");
          }
          return;
        }

        const messages = data.messages ?? [];
        const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
        const content = lastAssistant?.content || "";
        if (isMounted) {
          setAssistantText(content);
          setErrorMessage("");
        }
      } catch {
        if (isMounted) {
          setErrorMessage("通信に失敗しました。");
          setAssistantText("");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAssistantMessage();

    return () => {
      isMounted = false;
    };
  }, [chatId]);

  const handleCopy = async () => {
    if (!assistantText) return;
    await copyToClipboard(assistantText);
  };

  return (
    <div className="relative w-full max-w-3xl rounded-[28px] border border-[#efe5dc] bg-white p-8 text-main">
      <div className="space-y-6 text-sm leading-relaxed">
        {isLoading ? (
          <p className="text-base text-main-soft">回答を取得中です...</p>
        ) : errorMessage ? (
          <p className="text-base text-red-500">エラー: {errorMessage}</p>
        ) : assistantText ? (
          <p className="whitespace-pre-wrap text-base text-main-soft">{assistantText}</p>
        ) : (
          <p className="text-base text-main-soft">まだ回答がありません。</p>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between text-xs text-main-muted">
        <span>ChatGPT 5.2</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMenuOpen((value) => toggleMenu(value))}
            aria-label="Open menu"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-[#e6ddd3] bg-white text-main-muted transition hover:text-main"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy assistant message"
            disabled={!assistantText}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-[#e6ddd3] bg-white text-main-muted transition hover:text-main"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="absolute right-8 top-6 w-32 rounded-2xl border border-[#efe5dc] bg-white p-2 text-xs text-main">
          <button type="button" className="w-full rounded-xl px-3 py-2 text-left hover:bg-[#f8f3ee]">
            再生成
          </button>
          <button type="button" className="w-full rounded-xl px-3 py-2 text-left hover:bg-[#f8f3ee]">
            共有
          </button>
          <button type="button" className="w-full rounded-xl px-3 py-2 text-left text-red-500 hover:bg-[#f8f3ee]">
            削除
          </button>
        </div>
      ) : null}
    </div>
  );
}
