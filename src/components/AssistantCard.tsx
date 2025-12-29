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

type BranchSelection = "left" | "main" | "right";

export function AssistantCard({ chatId }: AssistantCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<BranchSelection>("main");
  const [promptText, setPromptText] = useState("");
  const shouldShowBranchPills = !isLoading && !errorMessage && assistantText.length > 0;

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

  useEffect(() => {
    if (!shouldShowBranchPills) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLTextAreaElement) return;
      if (activeElement instanceof HTMLInputElement) return;
      if (activeElement instanceof HTMLElement && activeElement.isContentEditable) return;

      const order: BranchSelection[] = ["left", "main", "right"];
      const currentIndex = order.indexOf(selectedBranch);
      if (currentIndex === -1) return;

      const nextIndex =
        event.key === "ArrowLeft"
          ? Math.max(0, currentIndex - 1)
          : Math.min(order.length - 1, currentIndex + 1);

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        setSelectedBranch(order[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedBranch, shouldShowBranchPills]);

  const handleCopy = async () => {
    if (!assistantText) return;
    await copyToClipboard(assistantText);
  };

  const handleBranchSelect = (value: BranchSelection) => {
    setSelectedBranch(value);
  };

  return (
    <>
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
      {shouldShowBranchPills ? (
        <div className="mt-0 w-full max-w-3xl">
          <div className="branch-grid">
            <span className="branch-line branch-line-top branch-col-left" aria-hidden="true" />
            <span className="branch-line branch-line-top branch-col-main" aria-hidden="true" />
            <span className="branch-line branch-line-top branch-col-right" aria-hidden="true" />
            <button
              type="button"
              onClick={() => handleBranchSelect("left")}
              aria-pressed={selectedBranch === "left"}
              className={`branch-pill branch-pill-delay-1 branch-col-left ${selectedBranch === "left" ? "branch-pill-selected" : ""}`}
            >
              新しいブランチ
            </button>
            <button
              type="button"
              onClick={() => handleBranchSelect("main")}
              aria-pressed={selectedBranch === "main"}
              className={`branch-pill branch-pill-delay-2 branch-col-main ${selectedBranch === "main" ? "branch-pill-selected" : ""}`}
            >
              メインブランチ
            </button>
            <button
              type="button"
              onClick={() => handleBranchSelect("right")}
              aria-pressed={selectedBranch === "right"}
              className={`branch-pill branch-pill-delay-3 branch-col-right ${selectedBranch === "right" ? "branch-pill-selected" : ""}`}
            >
              新しいブランチ
            </button>
            <span className="branch-line branch-line-bottom branch-col-left" aria-hidden="true" />
            <span className="branch-line branch-line-bottom branch-col-main" aria-hidden="true" />
            <span className="branch-line branch-line-bottom branch-col-right" aria-hidden="true" />
          </div>
        </div>
      ) : null}
      {shouldShowBranchPills ? (
        <div className="mt-0 w-full max-w-3xl mx-auto">
          <textarea
            value={promptText}
            onChange={(event) => setPromptText(event.currentTarget.value)}
            placeholder="プロンプトを入力"
            rows={2}
            className="w-full resize-none rounded-2xl border border-[#efe5dc] bg-white px-4 py-3 text-sm text-main shadow-[0_8px_18px_rgba(239,229,220,0.6)] focus:border-[#d9c9bb] focus:outline-none"
          />
        </div>
      ) : null}
      <style jsx>{`
        .branch-pill {
          border-radius: 999px;
          border: 1px solid #efe5dc;
          background: #f8f3ee;
          color: rgba(75, 36, 24, 0.9);
          padding: 6px 14px;
          font-size: 12px;
          letter-spacing: 0.02em;
          cursor: pointer;
          opacity: 0;
          transform: translateY(6px);
          animation: branch-pill-enter 420ms ease forwards;
        }

        .branch-pill-selected {
          border-color: #5a3326;
          background: #f1e8e0;
          color: #4b2418;
        }

        .branch-pill-delay-1 {
          animation-delay: 80ms;
        }

        .branch-pill-delay-2 {
          animation-delay: 160ms;
        }

        .branch-pill-delay-3 {
          animation-delay: 240ms;
        }

        @keyframes branch-pill-enter {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .branch-grid {
          display: grid;
          grid-template-columns: repeat(3, max-content);
          justify-content: center;
          column-gap: 12px;
          row-gap: 0px;
        }

        .branch-line {
          width: 1px;
          height: 20px;
          justify-self: center;
          background: #e2d8cf;
        }

        .branch-line-top {
          grid-row: 1;
        }

        .branch-line-bottom {
          grid-row: 3;
        }

        .branch-col-left {
          grid-column: 1;
        }

        .branch-col-main {
          grid-column: 2;
        }

        .branch-col-right {
          grid-column: 3;
        }

        .branch-pill {
          grid-row: 2;
        }
      `}</style>
    </>
  );
}
