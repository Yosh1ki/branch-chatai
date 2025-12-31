"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, MoreHorizontal } from "lucide-react";
import { toggleMenu } from "@/lib/chat-screen-state";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";

type AssistantCardProps = {
  content: string;
  isLoading: boolean;
  errorMessage: string;
  showPromptInput: boolean;
  onBranchSelect?: (value: BranchSelection) => void;
  activeBranchSide?: BranchSelection | null;
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

export function AssistantCard({
  content,
  isLoading,
  errorMessage,
  showPromptInput,
  onBranchSelect,
  activeBranchSide = null,
}: AssistantCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchSelection>("left");
  const [hiddenBranchSide, setHiddenBranchSide] = useState<BranchSelection | null>(null);
  const { isCopied, handleCopy } = useCopyFeedback(content);
  const shouldShowBranchPills = showPromptInput;

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

  const handleBranchSelect = useCallback(
    (value: BranchSelection) => {
      setSelectedBranch(value);
      setHiddenBranchSide(value);
      onBranchSelect?.(value);
    },
    [onBranchSelect]
  );

  useEffect(() => {
    if (!activeBranchSide) return;
    setSelectedBranch(activeBranchSide);
    setHiddenBranchSide(activeBranchSide);
  }, [activeBranchSide]);

  useEffect(() => {
    if (!activeBranchSide) {
      setHiddenBranchSide(null);
    }
  }, [activeBranchSide]);

  return (
    <>
      <div className="relative w-full max-w-3xl rounded-[28px] border border-[#efe5dc] bg-white p-8 text-main">
        <div className="space-y-6 text-sm leading-relaxed" data-allow-selection="true">
          {isLoading ? (
            <p className="text-base text-main-soft">回答を取得中です...</p>
          ) : errorMessage ? (
            <p className="text-base text-red-500">エラー: {errorMessage}</p>
          ) : content ? (
            <p className="whitespace-pre-wrap text-base text-main-soft">{content}</p>
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
              disabled={!content}
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
      {showPromptInput ? (
        <div className="branch-stack w-full max-w-3xl">
          <span className="branch-connector branch-connector-top" aria-hidden="true" />
          <div className="branch-grid">
            <span className="branch-connector-rail" aria-hidden="true" />
            {BRANCH_OPTIONS.map((option) => {
              if (hiddenBranchSide === option.value) return null;
              return (
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
              );
            })}
          </div>
          <span className="branch-connector branch-connector-bottom" aria-hidden="true" />
        </div>
      ) : null}
    </>
  );
}
