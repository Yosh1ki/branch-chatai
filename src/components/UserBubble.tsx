"use client";

import { Check, Copy } from "lucide-react";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";

type UserBubbleProps = {
  content: string;
  isLoading: boolean;
  errorMessage: string;
};

export function UserBubble({ content, errorMessage, isLoading }: UserBubbleProps) {
  const { isCopied, handleCopy } = useCopyFeedback(content);

  return (
    <div className="relative inline-block pb-4 pr-4">
      <div
        data-allow-selection="true"
        className="rounded-xl bg-white px-5 py-2 text-base text-main ring-1 ring-[#efe5dc]"
      >
        {isLoading ? (
          "読み込み中..."
        ) : errorMessage ? (
          <span className="text-red-500">エラー: {errorMessage}</span>
        ) : content ? (
          content
        ) : (
          "まだメッセージがありません。"
        )}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy user message"
        disabled={!content}
        className="absolute -bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-lg border border-[#e6ddd3] bg-white text-main-muted transition-colors duration-150 hover:border-[#d6c9be] hover:bg-[#f8f3ee] hover:text-main active:border-[#cbb9aa]"
      >
        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}
