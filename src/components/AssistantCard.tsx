"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, MoreHorizontal } from "lucide-react";
import { toggleMenu } from "@/lib/chat-screen-state";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { useLatestChatMessage } from "@/hooks/use-latest-chat-message";

type AssistantCardProps = {
  chatId: string;
};

type BranchSelection = "left" | "right";

const BRANCH_ORDER: BranchSelection[] = ["left", "right"];
const BRANCH_OPTIONS: Array<{
  value: BranchSelection;
  label: string;
  className: string;
}> = [
  {
    value: "left",
    label: "新しいブランチ",
    className: "branch-pill-delay-1 branch-col-left",
  },
  {
    value: "right",
    label: "新しいブランチ",
    className: "branch-pill-delay-2 branch-col-right",
  },
];

export function AssistantCard({ chatId }: AssistantCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchSelection>("left");
  const [promptText, setPromptText] = useState("");
  const { content: assistantText, errorMessage, isLoading } = useLatestChatMessage(
    chatId,
    "assistant"
  );
  const { isCopied, handleCopy } = useCopyFeedback(assistantText);
  const shouldShowBranchPills = !isLoading && !errorMessage && assistantText.length > 0;

  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen((value) => toggleMenu(value));
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLTextAreaElement) return;
      if (activeElement instanceof HTMLInputElement) return;
      if (activeElement instanceof HTMLElement && activeElement.isContentEditable) return;

      const currentIndex = BRANCH_ORDER.indexOf(selectedBranch);
      if (currentIndex === -1) return;

      const nextIndex =
        event.key === "ArrowLeft"
          ? Math.max(0, currentIndex - 1)
          : Math.min(BRANCH_ORDER.length - 1, currentIndex + 1);

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        setSelectedBranch(BRANCH_ORDER[nextIndex]);
      }
    },
    [selectedBranch]
  );

  useEffect(() => {
    if (!shouldShowBranchPills) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, shouldShowBranchPills]);

  const handleBranchSelect = useCallback((value: BranchSelection) => {
    setSelectedBranch(value);
  }, []);

  return (
    <>
      <div className="relative w-full max-w-3xl rounded-[28px] border border-[#efe5dc] bg-white p-8 text-main">
        <div className="space-y-6 text-sm leading-relaxed" data-allow-selection="true">
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
              onClick={handleMenuToggle}
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
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#e6ddd3] bg-white text-main-muted transition-colors duration-150 hover:border-[#d6c9be] hover:bg-[#f8f3ee] hover:text-main active:border-[#cbb9aa]"
            >
              {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
        <div className="branch-stack w-full max-w-3xl">
          <span className="branch-connector branch-connector-top" aria-hidden="true" />
          <div className="branch-grid">
            <span className="branch-connector-rail" aria-hidden="true" />
            {BRANCH_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleBranchSelect(option.value)}
                aria-pressed={selectedBranch === option.value}
                className={`branch-pill ${option.className} ${
                  selectedBranch === option.value ? "branch-pill-selected" : ""
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="branch-connector branch-connector-bottom" aria-hidden="true" />
          <div className="mt-0 w-full max-w-3xl">
            <textarea
              value={promptText}
              onChange={(event) => setPromptText(event.currentTarget.value)}
              placeholder="なんでも聞いてみましょう"
              rows={2}
              className="w-full resize-none rounded-2xl border border-[#efe5dc] bg-white px-4 py-3 text-sm text-main shadow-[0_8px_18px_rgba(239,229,220,0.6)] focus:border-[#d9c9bb] focus:outline-none"
            />
          </div>
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

        @keyframes branch-pill-enter {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .branch-connector-rail {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 1px;
          background: #e2d8cf;
          transform: translateX(-50%);
        }

        .branch-connector {
          display: block;
          width: 1px;
          height: 20px;
          margin: 0 auto;
          background: #e2d8cf;
        }

        .branch-grid {
          display: grid;
          grid-template-columns: repeat(3, max-content);
          justify-content: center;
          column-gap: 12px;
          row-gap: 0px;
          position: relative;
        }

        .branch-col-left {
          grid-column: 1;
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
