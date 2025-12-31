"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components, ExtraProps } from "react-markdown";
import { Check, Copy, MoreHorizontal } from "lucide-react";
import { toggleMenu } from "@/lib/chat-screen-state";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { getModelLabel, isModelProvider } from "@/lib/model-catalog";
import { parseMessageContent } from "@/lib/rich-text";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { cn } from "@/lib/utils";

type AssistantCardProps = {
  content: string;
  isLoading: boolean;
  errorMessage: string;
  showPromptInput: boolean;
  modelProvider?: string | null;
  modelName?: string | null;
  cardRef?: (node: HTMLDivElement | null) => void;
  showAllBranchPills?: boolean;
  hiddenBranchSides?: BranchSelection[];
  promptInput?: ReactNode;
  onBranchSelect?: (value: BranchSelection) => void;
  activeBranchSides?: BranchSelection[] | null;
};

type BranchSelection = "left" | "right";

type CodeProps = ComponentPropsWithoutRef<"code"> &
  ExtraProps & {
    inline?: boolean;
  };

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

const markdownComponents = {
  a: ({ ...props }) => (
    <a {...props} target="_blank" rel="noreferrer" className="underline" />
  ),
  pre: ({ ...props }) => (
    <pre
      {...props}
      className={cn(
        "overflow-x-auto rounded-md bg-[#f8f3ee] p-3 text-xs text-main",
        props.className
      )}
    />
  ),
  code: ({ inline, className, children, ...rest }: CodeProps) => {
    if (inline) {
      return (
        <code
          {...rest}
          className={cn(
            "rounded bg-[#f8f3ee] px-1 py-0.5 text-xs font-semibold text-main",
            className
          )}
        >
          {children}
        </code>
      );
    }
    return (
      <code {...rest} className={cn("text-xs text-main", className)}>
        {children}
      </code>
    );
  },
} satisfies Components;

export function AssistantCard({
  content,
  isLoading,
  errorMessage,
  showPromptInput,
  modelProvider,
  modelName,
  cardRef,
  showAllBranchPills = false,
  hiddenBranchSides,
  promptInput,
  onBranchSelect,
  activeBranchSides = null,
}: AssistantCardProps) {
  const hiddenBranchSideSet = useMemo(
    () => new Set(hiddenBranchSides ?? []),
    [hiddenBranchSides]
  );
  const parsedContent = useMemo(() => parseMessageContent(content), [content]);
  const modelLabel = useMemo(() => {
    const providerValue = modelProvider ?? undefined;
    const provider = isModelProvider(providerValue) ? providerValue : undefined;
    return getModelLabel(provider, modelName);
  }, [modelProvider, modelName]);
  const selectedBranches = useMemo(
    () => activeBranchSides ?? [],
    [activeBranchSides]
  );
  const hiddenBranchSide =
    selectedBranches.length > 0
      ? selectedBranches[selectedBranches.length - 1]
      : null;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState<BranchSelection | null>(null);
  const copyContent = parsedContent.text || content;
  const { isCopied, handleCopy } = useCopyFeedback(copyContent);
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

      if (!activeBranch) {
        const nextSelection = event.key === "ArrowRight" ? "right" : "left";
        event.preventDefault();
        setActiveBranch(nextSelection);
        return;
      }

      const currentIndex = BRANCH_ORDER.indexOf(activeBranch);
      if (currentIndex === -1) return;

      const nextIndex =
        event.key === "ArrowLeft"
          ? Math.max(0, currentIndex - 1)
          : Math.min(BRANCH_ORDER.length - 1, currentIndex + 1);

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        setActiveBranch(BRANCH_ORDER[nextIndex]);
      }
    },
    [activeBranch]
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
      if (selectedBranches.includes(value)) {
        onBranchSelect?.(value);
        if (activeBranch === value) {
          setActiveBranch(null);
        }
        return;
      }
      setActiveBranch(value);
      onBranchSelect?.(value);
    },
    [activeBranch, onBranchSelect, selectedBranches]
  );

  return (
    <>
      <div
        ref={cardRef}
        className="relative w-full max-w-3xl rounded-xl border border-[#efe5dc] bg-white p-8 text-main"
      >
        <div className="space-y-6 text-sm leading-relaxed" data-allow-selection="true">
          {isLoading ? (
            <p className="text-base text-main-soft">回答を取得中です...</p>
          ) : errorMessage ? (
            <p className="text-base text-red-500">エラー: {errorMessage}</p>
          ) : content ? (
            parsedContent.format === "richjson" && parsedContent.doc ? (
              <RichTextRenderer value={parsedContent.doc} className="text-main-soft" />
            ) : (
              <div className="prose prose-sm max-w-none text-main-soft">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {parsedContent.text}
                </ReactMarkdown>
              </div>
            )
          ) : (
            <p className="text-base text-main-soft">まだ回答がありません。</p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between text-xs text-main-muted">
          <span>{modelLabel}</span>
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
              const isHidden = hiddenBranchSideSet.has(option.value);
              const isSuppressed = !showAllBranchPills && hiddenBranchSide === option.value;
              if (isHidden || isSuppressed) {
                return (
                  <span
                    key={option.value}
                    aria-hidden="true"
                    className={`branch-pill ${option.className} invisible pointer-events-none`}
                  >
                    {option.label}
                  </span>
                );
              }
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleBranchSelect(option.value)}
                  aria-pressed={selectedBranches.includes(option.value)}
                  className={`branch-pill ${option.className} ${
                    selectedBranches.includes(option.value) ? "branch-pill-selected" : ""
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <span className="branch-connector branch-connector-bottom" aria-hidden="true" />
          {promptInput ? (
            <div className="mt-0 flex w-full justify-center">{promptInput}</div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
