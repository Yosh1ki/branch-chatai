"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components, ExtraProps } from "react-markdown";
import { Check, CheckCircle2, ChevronRight, Copy, Globe, MoreHorizontal, Search, X } from "lucide-react";
import { toggleMenu } from "@/lib/chat-screen-state";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { getModelLabel, isModelProvider, isReasoningEffort } from "@/lib/model-catalog";
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
  modelReasoningEffort?: string | null;
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

type ResearchHeading = {
  level: number;
  text: string;
};

type ResearchSource = {
  url: string;
  label: string;
  domain: string;
};

type ResearchStep = {
  title: string;
  queries: string[];
  sources: ResearchSource[];
  done: boolean;
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

const HEADING_PATTERN = /^(#{1,4})\s+(.+)$/;
const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

const normalizeHeadingText = (text: string) =>
  text
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const extractResearchHeadings = (markdown: string): ResearchHeading[] => {
  const lines = markdown.split("\n");

  return lines
    .map((line) => {
      const match = line.match(HEADING_PATTERN);
      if (!match) return null;

      const level = match[1].length;
      const text = normalizeHeadingText(match[2]);
      if (!text) return null;

      return { level, text };
    })
    .filter((item): item is ResearchHeading => item !== null);
};

const extractResearchSources = (markdown: string): ResearchSource[] => {
  const sourceMap = new Map<string, ResearchSource>();
  for (const match of markdown.matchAll(LINK_PATTERN)) {
    const label = match[1]?.trim();
    const url = match[2]?.trim();
    if (!url || sourceMap.has(url)) continue;

    let domain = "source";
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      domain = "source";
    }

    sourceMap.set(url, {
      url,
      label: label || domain,
      domain,
    });
  }
  return Array.from(sourceMap.values());
};

const extractResearchSummary = (markdown: string): string => {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const bodyLines = lines.filter((line) => {
    if (line.startsWith("#")) return false;
    if (line.startsWith("- ") || line.startsWith("* ")) return false;
    if (/^\d+\.\s+/.test(line)) return false;
    if (line.startsWith("```")) return false;
    return true;
  });

  const summary = normalizeHeadingText(bodyLines.join(" "));
  return summary.slice(0, 220).trim();
};

const isResearchEligibleModel = (
  modelName?: string | null,
  modelReasoningEffort?: string | null
) => {
  if (modelReasoningEffort) return true;
  const hint = (modelName ?? "").toLowerCase();
  return (
    hint.includes("pro") ||
    hint.includes("thinking") ||
    hint.includes("reason") ||
    hint.includes("o1") ||
    hint.includes("o3") ||
    hint.includes("o4")
  );
};

export function AssistantCard({
  content,
  isLoading,
  errorMessage,
  showPromptInput,
  modelProvider,
  modelName,
  modelReasoningEffort,
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
  const researchHeadings = useMemo(() => {
    if (!parsedContent.text || parsedContent.format === "richjson") return [];
    return extractResearchHeadings(parsedContent.text);
  }, [parsedContent]);
  const researchSources = useMemo(() => {
    if (!parsedContent.text || parsedContent.format === "richjson") return [];
    return extractResearchSources(parsedContent.text);
  }, [parsedContent]);
  const researchSummary = useMemo(() => {
    if (!parsedContent.text || parsedContent.format === "richjson") return "";
    return extractResearchSummary(parsedContent.text);
  }, [parsedContent]);
  const modelLabel = useMemo(() => {
    const providerValue = modelProvider ?? undefined;
    const provider = isModelProvider(providerValue) ? providerValue : undefined;
    const effortValue = modelReasoningEffort ?? undefined;
    const reasoningEffort = isReasoningEffort(effortValue) ? effortValue : undefined;
    return getModelLabel(provider, modelName, reasoningEffort);
  }, [modelProvider, modelName, modelReasoningEffort]);
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
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | null>(null);
  const [thinkingElapsedMs, setThinkingElapsedMs] = useState(0);
  const [lastThinkingMs, setLastThinkingMs] = useState<number | null>(null);
  const copyContent = parsedContent.text || content;
  const { isCopied, handleCopy } = useCopyFeedback(copyContent);
  const shouldShowBranchPills = showPromptInput;
  const hasResearchDetails =
    Boolean(researchSummary) || researchHeadings.length > 0 || researchSources.length > 0;
  const hasExternalSources = researchSources.length > 0;
  const canShowResearchUI =
    isResearchEligibleModel(modelName, modelReasoningEffort) && hasResearchDetails && hasExternalSources;
  const researchQueries = useMemo(() => {
    const candidateQueries = [
      researchSummary,
      ...researchHeadings.map((heading) => heading.text),
      (parsedContent.text ?? "").split("\n").find((line) => line.trim().length > 0) ?? "",
    ]
      .map((value) => normalizeHeadingText(value))
      .filter(Boolean)
      .map((value) => value.slice(0, 56));

    return Array.from(new Set(candidateQueries)).slice(0, 4);
  }, [parsedContent.text, researchHeadings, researchSummary]);
  const researchSteps = useMemo((): ResearchStep[] => {
    return [
      {
        title: "Searching the web",
        queries: researchQueries.slice(0, 3),
        sources: researchSources.slice(0, 6),
        done: true,
      },
      {
        title: "情報を整理",
        queries: researchHeadings.slice(0, 3).map((heading) => heading.text),
        sources: researchSources.slice(0, 3),
        done: true,
      },
      {
        title: "回答を作成",
        queries: [],
        sources: [],
        done: true,
      },
    ];
  }, [researchHeadings, researchQueries, researchSources]);
  const thinkingSeconds = Math.max(1, Math.ceil(thinkingElapsedMs / 1000));
  const lastThinkingSeconds =
    lastThinkingMs === null ? null : Math.max(1, Math.ceil(lastThinkingMs / 1000));

  useEffect(() => {
    let timerId: number | undefined;

    if (!isLoading) {
      if (thinkingStartedAt !== null) {
        const finishedMs = Date.now() - thinkingStartedAt;
        timerId = window.setTimeout(() => {
          setLastThinkingMs(finishedMs);
          setThinkingStartedAt(null);
          setThinkingElapsedMs(finishedMs);
        }, 0);
      }
    } else if (thinkingStartedAt === null) {
      const now = Date.now();
      timerId = window.setTimeout(() => {
        setThinkingStartedAt(now);
        setThinkingElapsedMs(0);
      }, 0);
    } else {
      timerId = window.setInterval(() => {
        setThinkingElapsedMs(Date.now() - thinkingStartedAt);
      }, 1000);
    }

    return () => {
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
  }, [isLoading, thinkingStartedAt]);

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
        <div className="space-y-6 cursor-text text-sm leading-relaxed" data-allow-selection="true">
          {isLoading && canShowResearchUI ? (
            <div className="inline-flex rounded-full border border-[#eadfd5] bg-[#f9f4ef] px-3 py-1 text-[11px] text-main-soft">
              考え中... {thinkingSeconds}秒
            </div>
          ) : content && canShowResearchUI ? (
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => setIsResearchModalOpen((value) => !value)}
                className="inline-flex rounded-full border border-[#eadfd5] bg-[#f9f4ef] px-3 py-1 text-[11px] text-main-soft transition hover:border-[#d6c9be] hover:text-main"
              >
                調査メモを見る
              </button>
              {isResearchModalOpen ? (
                <div
                  role="dialog"
                  aria-modal="false"
                  className="absolute left-full top-1/2 z-30 ml-2 w-[260px] -translate-y-1/2 rounded-xl border border-[#e9ddd2] bg-white p-3 text-main shadow-lg md:w-[320px]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold">調査メモ</p>
                    <button
                      type="button"
                      onClick={() => setIsResearchModalOpen(false)}
                      aria-label="Close research details"
                      className="rounded-md p-1 text-main-muted transition hover:bg-[#f8f3ee] hover:text-main"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-3 text-[11px] text-main-soft">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-left text-xs font-semibold text-main"
                    >
                      思考時間: {lastThinkingSeconds !== null ? `${lastThinkingSeconds}s` : "計測中"}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                    <div className="relative space-y-3 pl-6 before:absolute before:bottom-1 before:left-2 before:top-2 before:w-px before:bg-[#e8ddd3]">
                      {researchSteps.map((step, index) => (
                        <div key={step.title} className="relative">
                          <div className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                            {step.done ? (
                              index === researchSteps.length - 1 ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-main-soft" />
                              ) : (
                                <Globe className="h-3.5 w-3.5 text-main-soft" />
                              )
                            ) : (
                              <Search className="h-3.5 w-3.5 text-main-soft" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-main">{step.title}</p>
                          {step.queries.length ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {step.queries.map((query) => (
                                <span
                                  key={`${step.title}-${query}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-[#f3ece6] px-2 py-1 text-[11px]"
                                >
                                  <Search className="h-3 w-3" />
                                  {query}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {step.sources.length ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {step.sources.map((source) => (
                                <a
                                  key={`${step.title}-${source.url}`}
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full bg-[#f3ece6] px-2 py-1 text-[11px] hover:bg-[#ebe1d8]"
                                >
                                  <Globe className="h-3 w-3" />
                                  {source.domain}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {!hasResearchDetails ? <p>表示できる調査情報はありません。</p> : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {errorMessage ? (
            <p className="text-base text-red-500">エラー: {errorMessage}</p>
          ) : content ? (
            <>
              {parsedContent.format === "richjson" && parsedContent.doc ? (
                <RichTextRenderer value={parsedContent.doc} className="text-main-soft" />
              ) : (
                <div className="prose prose-sm max-w-none text-main-soft">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {parsedContent.text}
                  </ReactMarkdown>
                </div>
              )}
              {isLoading ? (
                <p className="text-xs text-main-muted" aria-live="polite">
                  生成中...
                </p>
              ) : null}
            </>
          ) : isLoading ? (
            <p className="text-base text-main-soft" aria-live="polite">
              回答を取得中です...
            </p>
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
