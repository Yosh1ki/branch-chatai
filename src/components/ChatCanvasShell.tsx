"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useReducer } from "react";
import { ArrowRight } from "lucide-react";
import { AssistantCard } from "@/components/AssistantCard";
import { CanvasControls } from "@/components/CanvasControls";
import { CanvasViewport } from "@/components/CanvasViewport";
import { ChatHeader } from "@/components/ChatHeader";
import { DisableCanvasNavigation } from "@/components/DisableCanvasNavigation";
import { UserBubble } from "@/components/UserBubble";
import { createCanvasState, resetCanvasState } from "@/lib/canvas-state";
import { fetchChatMessages } from "@/lib/chat-messages";
import { groupConversationPairs } from "@/lib/chat-conversation";
import { insertAfterMessage } from "@/lib/chat-message-insert";
import {
  branchDraftReducer,
  createBranchDraftState,
} from "@/lib/chat-branch-state";

type ChatCanvasShellProps = {
  chatId: string;
};

type ChatMessage = {
  id?: string;
  role: string;
  content: string;
};

export function ChatCanvasShell({ chatId }: ChatCanvasShellProps) {
  const [state, setState] = useState(createCanvasState());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [promptText, setPromptText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [branchState, dispatchBranch] = useReducer(
    branchDraftReducer,
    undefined,
    createBranchDraftState
  );
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasContentRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const isPanningRef = useRef(false);
  const [connectorPaths, setConnectorPaths] = useState<string[]>([]);
  const lastPathsRef = useRef<string[]>([]);
  const branchTextareaRef = useRef<HTMLTextAreaElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleReset = () => {
    setState(resetCanvasState());
  };

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setLoadError("");

    fetchChatMessages(chatId)
      .then((data) => {
        if (!isActive) return;
        setMessages((data.messages ?? []) as ChatMessage[]);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!isActive) return;
        setLoadError(error instanceof Error ? error.message : "読み込みに失敗しました。");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [chatId]);

  useEffect(() => {
    if (!branchState.active || !branchTextareaRef.current) return;
    const textarea = branchTextareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [branchState.active, branchState.text]);

  useEffect(() => {
    if (!promptTextareaRef.current) return;
    const textarea = promptTextareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [promptText]);

  const handleBranchOpen = (parentMessageId: string, side: "left" | "right") => {
    if (
      branchState.active?.parentMessageId === parentMessageId &&
      branchState.active?.side === side
    ) {
      dispatchBranch({ type: "close-branch" });
      return;
    }
    dispatchBranch({ type: "open-branch", parentMessageId, side });
    setSendError("");
  };

  const handleBranchClose = () => {
    dispatchBranch({ type: "close-branch" });
  };

  const handleSend = async () => {
    const trimmed = promptText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSendError("");
    setPromptText("");
    const tempId = `temp-${Date.now()}`;
    const tempMessage = { id: tempId, role: "user", content: trimmed };
    setPendingUserId(tempId);
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, chatId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : "送信に失敗しました。";
        setSendError(errorMessage);
        setIsSending(false);
        return;
      }

      setMessages((prev) => {
        const filtered = prev.filter((message) => message.id !== tempId);
        const nextMessages: ChatMessage[] = [...filtered];
        if (payload?.userMessage) {
          nextMessages.push(payload.userMessage);
        } else {
          nextMessages.push(tempMessage);
        }
        if (payload?.assistantMessage) {
          nextMessages.push(payload.assistantMessage);
        }
        return nextMessages;
      });
      setPendingUserId(null);
      setIsSending(false);
    } catch {
      setSendError("送信に失敗しました。");
      setIsSending(false);
    }
  };

  const pairs = useMemo(() => groupConversationPairs(messages), [messages]);
  const displayPairs = pairs.length ? pairs : [{ user: null, assistant: null }];
  const promptInputEnabled = true;
  const branchOffset = "clamp(160px, 20vw, 320px)";
  const showBranchCenterGuide = false;

  const normalizeBranchShift = (value: number | string) =>
    typeof value === "number" ? `${value}px` : value;

  const setNodeRef = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (!node) {
        nodeRefs.current.delete(id);
        return;
      }
      nodeRefs.current.set(id, node);
    },
    []
  );

  const connectors = useMemo(() => {
    const entries: Array<{ from: string; to: string }> = [];

    displayPairs.forEach((pair, index) => {
      if (!pair.user && !pair.assistant) return;
      const userId = pair.user?.id ?? `user-${index}`;
      const assistantId = pair.assistant?.id ?? `assistant-${index}`;

      const nextPair = displayPairs[index + 1];
      if (pair.assistant?.content && nextPair?.user?.content) {
        const nextUserId = nextPair.user?.id ?? `user-${index + 1}`;
        entries.push({ from: `assistant-${assistantId}`, to: `user-${nextUserId}` });
      }
    });

    if (branchState.active?.parentMessageId) {
      const parentId = branchState.active.parentMessageId;
      entries.push({ from: `assistant-${parentId}`, to: `branch-${parentId}` });
    }

    return entries;
  }, [displayPairs, branchState.active]);

  const updateConnectorPaths = useCallback(() => {
    if (isPanningRef.current) return;
    const content = canvasContentRef.current;
    if (!content) return;
    const contentRect = content.getBoundingClientRect();
    const scale = Number.isFinite(state.scale) && state.scale !== 0 ? state.scale : 1;

    const nextPaths = connectors.flatMap((connector) => {
      const fromNode = nodeRefs.current.get(connector.from);
      const toNode = nodeRefs.current.get(connector.to);
      if (!fromNode || !toNode) return [];

      const fromRect = fromNode.getBoundingClientRect();
      const toRect = toNode.getBoundingClientRect();
      const fromLeft = (fromRect.left - contentRect.left) / scale;
      const toLeft = (toRect.left - contentRect.left) / scale;
      const fromWidth = fromRect.width / scale;
      const toWidth = toRect.width / scale;
      const fromTop = (fromRect.top - contentRect.top) / scale;
      const toTop = (toRect.top - contentRect.top) / scale;
      const fromHeight = fromRect.height / scale;
      const toHeight = toRect.height / scale;
      const fromX = fromLeft + fromWidth / 2;
      const toX = toLeft + toWidth / 2;
      const fromY = fromTop + fromHeight;
      const toY = toTop;
      const midY = (fromY + toY) / 2;

      return [`M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`];
    });

    const prevPaths = lastPathsRef.current;
    const pathsChanged =
      prevPaths.length !== nextPaths.length ||
      nextPaths.some((path, index) => prevPaths[index] !== path);

    if (pathsChanged) {
      lastPathsRef.current = nextPaths;
      setConnectorPaths(nextPaths);
    }
  }, [connectors, state.scale]);

  useLayoutEffect(() => {
    updateConnectorPaths();
  }, [updateConnectorPaths, messages.length]);

  useEffect(() => {
    const content = canvasContentRef.current;
    if (!content) return;
    const resizeObserver = new ResizeObserver(() => updateConnectorPaths());
    resizeObserver.observe(content);
    nodeRefs.current.forEach((node) => resizeObserver.observe(node));
    window.addEventListener("resize", updateConnectorPaths);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateConnectorPaths);
    };
  }, [displayPairs, branchState.active, updateConnectorPaths]);

  const handlePanStateChange = useCallback(
    (isPanning: boolean) => {
      isPanningRef.current = isPanning;
      if (!isPanning) {
        updateConnectorPaths();
      }
    },
    [updateConnectorPaths]
  );

  const handleBranchSend = async (parentMessageId: string) => {
    const trimmed = branchState.text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSendError("");
    dispatchBranch({ type: "set-text", value: "" });
    const tempId = `temp-${Date.now()}`;
    const tempMessage = { id: tempId, role: "user", content: trimmed };
    setPendingUserId(tempId);
    setMessages((prev) => insertAfterMessage(prev, parentMessageId, [tempMessage]));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, chatId, parentMessageId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : "送信に失敗しました。";
        setSendError(errorMessage);
        setIsSending(false);
        return;
      }

      setMessages((prev) => {
        const filtered = prev.filter((message) => message.id !== tempId);
        const additions: ChatMessage[] = [];
        if (payload?.userMessage) {
          additions.push(payload.userMessage);
        } else {
          additions.push(tempMessage);
        }
        if (payload?.assistantMessage) {
          additions.push(payload.assistantMessage);
        }
        return insertAfterMessage(filtered, parentMessageId, additions);
      });
      setPendingUserId(null);
      setIsSending(false);
      handleBranchClose();
    } catch {
      setSendError("送信に失敗しました。");
      setIsSending(false);
    }
  };

  const handleCanvasClick = () => {
    if (branchState.active) {
      handleBranchClose();
    }
  };

  const connectorsOverlay = (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {connectorPaths.map((path, index) => (
        <path key={`connector-${index}`} d={path} fill="none" stroke="#e2d8cf" strokeWidth="1" />
      ))}
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#f7f3ef] text-main">
      <DisableCanvasNavigation />
      <CanvasControls scale={state.scale} onReset={handleReset} />
      <div className="fixed left-0 right-0 top-0 z-40 bg-[#f7f3ef]/80 backdrop-blur">
        <div className="mx-auto w-full px-0">
          <ChatHeader />
        </div>
      </div>
      <div className="relative min-h-screen">
        <CanvasViewport
          state={state}
          onStateChange={setState}
          minScale={0.3}
          maxScale={2}
          containerRef={canvasContainerRef}
          contentRef={canvasContentRef}
          overlay={connectorsOverlay}
          onPanStateChange={handlePanStateChange}
        >
          <div className="min-h-screen px-6 pb-24 pt-28" onClick={handleCanvasClick}>
            <main className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-10">
              {displayPairs.map((pair, index) => {
                const isLast = index === displayPairs.length - 1;
                const userContent = pair.user?.content ?? "";
                const assistantContent = pair.assistant?.content ?? "";
                const assistantId = pair.assistant?.id ?? null;
                const assistantLoading =
                  (pendingUserId && pendingUserId === pair.user?.id) ||
                  (isLast && (isSending || (isLoading && !assistantContent)));
                const assistantError =
                  pendingUserId && pendingUserId === pair.user?.id
                    ? sendError
                    : isLast
                      ? sendError || loadError
                      : "";
                const userLoading =
                  isLast && isLoading && !userContent && !pendingUserId;
                const parentAssistantId =
                  index > 0 ? displayPairs[index - 1]?.assistant?.id : null;
                const isActiveBranchHere =
                  assistantId && branchState.active?.parentMessageId === assistantId;
                const branchSide = branchState.active?.side ?? "left";
                const branchShift = normalizeBranchShift(branchOffset);
                // Unify anchor + single translateX to avoid asymmetry from mixed anchors,
                // double-translate math, and parent padding/layout offsets.
                const branchTransform =
                  branchSide === "left"
                    ? `translateX(calc(-100% - ${branchShift}))`
                    : `translateX(${branchShift})`;
                const userNodeId = pair.user?.id ?? `user-${index}`;
                const assistantNodeId = pair.assistant?.id ?? `assistant-${index}`;
                const activeBranchId =
                  isActiveBranchHere && assistantId ? assistantId : null;

                return (
                  <div
                    key={pair.user?.id ?? pair.assistant?.id ?? `pair-${index}`}
                    className="flex w-full flex-col items-center"
                  >
                    {index > 0 ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={!parentAssistantId}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (parentAssistantId) {
                              handleBranchOpen(parentAssistantId, "left");
                            }
                          }}
                          aria-pressed={
                            branchState.active?.parentMessageId === parentAssistantId &&
                            branchState.active?.side === "left"
                          }
                          className={`branch-pill ${
                            branchState.active?.parentMessageId === parentAssistantId &&
                            branchState.active?.side === "left"
                              ? "branch-pill-selected"
                              : ""
                          }`}
                        >
                          新しいブランチ
                        </button>
                        <div className="h-10 w-px bg-[#e2d8cf]" />
                        <button
                          type="button"
                          disabled={!parentAssistantId}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (parentAssistantId) {
                              handleBranchOpen(parentAssistantId, "right");
                            }
                          }}
                          aria-pressed={
                            branchState.active?.parentMessageId === parentAssistantId &&
                            branchState.active?.side === "right"
                          }
                          className={`branch-pill ${
                            branchState.active?.parentMessageId === parentAssistantId &&
                            branchState.active?.side === "right"
                              ? "branch-pill-selected"
                              : ""
                          }`}
                        >
                          新しいブランチ
                        </button>
                      </div>
                    ) : null}
                    <div ref={setNodeRef(`user-${userNodeId}`)}>
                      <UserBubble
                        content={userContent}
                        isLoading={userLoading}
                        errorMessage=""
                      />
                    </div>
                    {userContent || userLoading ? (
                      <div className="message-connector" aria-hidden="true">
                        <span className="message-connector-line" />
                      </div>
                    ) : null}
                    <div ref={setNodeRef(`assistant-${assistantNodeId}`)} className="w-full">
                      <AssistantCard
                        content={assistantContent}
                        isLoading={assistantLoading}
                        errorMessage={assistantError}
                        showPromptInput={isLast && promptInputEnabled}
                        onBranchSelect={(side) => {
                          if (!assistantId) return;
                          handleBranchOpen(assistantId, side);
                        }}
                        activeBranchSide={isActiveBranchHere ? branchState.active?.side : null}
                      />
                    </div>
                    {activeBranchId ? (
                      <div
                        className="relative mt-6 flex h-[140px] w-full items-start"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div
                          className="absolute left-1/2 top-0 h-full w-0"
                        >
                          {showBranchCenterGuide ? (
                            <div
                              className="pointer-events-none absolute left-0 top-0 h-full w-px bg-[#b7da82]/70"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div
                            ref={setNodeRef(`branch-${activeBranchId}`)}
                            className="absolute left-0 top-0"
                            style={{
                              transform: branchTransform,
                              width: "clamp(280px, 50vw, 560px)",
                            }}
                          >
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                handleBranchSend(activeBranchId);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              className="flex items-end gap-3"
                            >
                              <textarea
                                ref={branchTextareaRef}
                                value={branchState.text}
                                onChange={(event) =>
                                  dispatchBranch({
                                    type: "set-text",
                                    value: event.currentTarget.value,
                                  })
                                }
                              placeholder="なんでも聞いてみましょう"
                              rows={1}
                              className="w-full resize-none rounded-2xl border border-[#efe5dc] bg-white px-4 py-2 text-sm leading-5 text-main shadow-[0_8px_18px_rgba(239,229,220,0.6)] transition-[height] duration-150 ease-out focus:border-[#d9c9bb] focus:outline-none"
                            />
                              <button
                                type="submit"
                                aria-label="Send branch prompt"
                                disabled={!branchState.text.trim() || isSending}
                                className="flex h-10 w-10 items-center justify-center rounded-lg bg-theme-main text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </main>
          </div>
        </CanvasViewport>
      </div>
    </div>
  );
}
