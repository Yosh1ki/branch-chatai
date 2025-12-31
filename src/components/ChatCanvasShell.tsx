"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { isModelProvider, type ModelProvider } from "@/lib/model-catalog";
type BranchSide = "left" | "right";

type ChatCanvasShellProps = {
  chatId: string;
};

type ChatMessage = {
  id?: string;
  role: string;
  content: string;
  parentMessageId?: string | null;
  branchId?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
};

type ChatBranch = {
  id: string;
  parentMessageId: string;
  side: BranchSide;
  createdAt?: string;
};

type BranchReply = {
  isLoading: boolean;
  error: string;
  assistantMessage: ChatMessage | null;
};

type BranchDraft = {
  key: string;
  parentMessageId: string;
  side: BranchSide;
  branchId: string | null;
  text: string;
  lastUserContent: string;
  reply: BranchReply;
  hasSubmitted: boolean;
  createdAt: number;
};

type SelectedModel = {
  provider: ModelProvider;
  name: string;
};

export function ChatCanvasShell({ chatId }: ChatCanvasShellProps) {
  const [state, setState] = useState(createCanvasState());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
  const [promptText, setPromptText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Record<string, BranchDraft>>({});
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasContentRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const isPanningRef = useRef(false);
  const [connectorPaths, setConnectorPaths] = useState<string[]>([]);
  const lastPathsRef = useRef<string[]>([]);
  const branchTextareaRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const createBranchKey = useCallback(
    (parentMessageId: string, side: BranchSide) => `${parentMessageId}:${side}`,
    []
  );

  const resizeTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const setBranchTextareaRef = useCallback(
    (key: string) => (node: HTMLTextAreaElement | null) => {
      if (!node) {
        branchTextareaRefs.current.delete(key);
        return;
      }
      branchTextareaRefs.current.set(key, node);
      resizeTextarea(node);
    },
    [resizeTextarea]
  );

  const buildBranchState = useCallback(
    (loadedMessages: ChatMessage[], loadedBranches: ChatBranch[] = []) => {
      const messagesByBranch = new Map<string, ChatMessage[]>();
      loadedMessages.forEach((message) => {
        if (!message.branchId) return;
        const list = messagesByBranch.get(message.branchId) ?? [];
        list.push(message);
        messagesByBranch.set(message.branchId, list);
      });

      return loadedBranches.reduce<Record<string, BranchDraft>>((acc, branch) => {
        const key = createBranchKey(branch.parentMessageId, branch.side);
        const branchMessages = messagesByBranch.get(branch.id) ?? [];
        let lastUserContent = "";
        let lastAssistant: ChatMessage | null = null;

        branchMessages.forEach((message) => {
          if (message.role === "user") {
            lastUserContent = message.content;
          }
          if (message.role === "assistant") {
            lastAssistant = message;
          }
        });

        acc[key] = {
          key,
          parentMessageId: branch.parentMessageId,
          side: branch.side,
          branchId: branch.id,
          text: "",
          lastUserContent,
          reply: {
            assistantMessage: lastAssistant,
            isLoading: false,
            error: "",
          },
          hasSubmitted: Boolean(lastUserContent),
          createdAt: branch.createdAt ? new Date(branch.createdAt).getTime() : Date.now(),
        };
        return acc;
      }, {});
    },
    [createBranchKey]
  );

  const handleReset = () => {
    setState(resetCanvasState());
  };

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setLoadError("");
    setSelectedModel(null);

    fetchChatMessages(chatId)
      .then((data) => {
        if (!isActive) return;
        const loadedMessages = (data.messages ?? []) as ChatMessage[];
        const loadedBranches = (data.branches ?? []) as ChatBranch[];
        setMessages(loadedMessages);
        setBranches(buildBranchState(loadedMessages, loadedBranches));
        const latestModel = [...loadedMessages]
          .reverse()
          .find(
            (message) =>
              typeof message.modelName === "string" &&
              isModelProvider(message.modelProvider ?? undefined)
          );
        if (latestModel && isModelProvider(latestModel.modelProvider ?? undefined)) {
          setSelectedModel({
            provider: latestModel.modelProvider as ModelProvider,
            name: latestModel.modelName as string,
          });
        }
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
  }, [chatId, buildBranchState]);

  useEffect(() => {
    if (!promptTextareaRef.current) return;
    const textarea = promptTextareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [promptText]);

  const handleBranchOpen = (parentMessageId: string, side: BranchSide) => {
    const key = createBranchKey(parentMessageId, side);
    setBranches((prev) => {
      const existing = prev[key];
      if (existing) {
        if (existing.hasSubmitted) {
          return prev;
        }
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [key]: {
          key,
          parentMessageId,
          side,
          branchId: null,
          text: "",
          lastUserContent: "",
          reply: { isLoading: false, error: "", assistantMessage: null },
          hasSubmitted: false,
          createdAt: Date.now(),
        },
      };
    });
    setSendError("");
  };

  const handleSend = async () => {
    const trimmed = promptText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSendError("");
    setPromptText("");
    const tempId = `temp-${Date.now()}`;
    const tempMessage = { id: tempId, role: "user", content: trimmed, parentMessageId: null };
    setPendingUserId(tempId);
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          chatId,
          modelProvider: selectedModel?.provider,
          modelName: selectedModel?.name,
        }),
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
          const assistantMessage = payload.assistantMessage;
          if (
            assistantMessage?.modelName &&
            isModelProvider(assistantMessage.modelProvider ?? undefined)
          ) {
            setSelectedModel({
              provider: assistantMessage.modelProvider as ModelProvider,
              name: assistantMessage.modelName as string,
            });
          }
          if (!payload?.userMessage && assistantMessage?.parentMessageId == null) {
            nextMessages.push({ ...assistantMessage, parentMessageId: tempId });
          } else {
            nextMessages.push(assistantMessage);
          }
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

  const mainThreadMessages = useMemo(() => {
    const mainUserIds = new Set<string>();
    messages.forEach((message) => {
      if (message.role === "user" && !message.parentMessageId && message.id) {
        mainUserIds.add(message.id);
      }
    });

    return messages.filter((message) => {
      if (message.role === "user") {
        return !message.parentMessageId;
      }
      if (message.role === "assistant") {
        return (
          !!message.parentMessageId &&
          mainUserIds.has(message.parentMessageId) &&
          !message.branchId
        );
      }
      return false;
    });
  }, [messages]);

  const pairs = useMemo(() => groupConversationPairs(mainThreadMessages), [mainThreadMessages]);
  const displayPairs = useMemo(
    () => (pairs.length ? pairs : [{ user: null, assistant: null }]),
    [pairs]
  );
  const branchesByParent = useMemo(() => {
    const map = new Map<string, BranchDraft[]>();
    Object.values(branches).forEach((branch) => {
      const list = map.get(branch.parentMessageId) ?? [];
      list.push(branch);
      map.set(branch.parentMessageId, list);
    });
    map.forEach((list) => {
      list.sort((a, b) => a.createdAt - b.createdAt);
    });
    return map;
  }, [branches]);
  const promptInputEnabled = true;
  const branchOffset = "clamp(380px, 35vw, 560px)";
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
    const entries: Array<{ from: string; to: string; kind: "thread" | "branch" }> = [];

    displayPairs.forEach((pair, index) => {
      if (!pair.user && !pair.assistant) return;
      const userId = pair.user?.id ?? `user-${index}`;
      const assistantId = pair.assistant?.id ?? `assistant-${index}`;

      const nextPair = displayPairs[index + 1];
      if (pair.assistant?.content && nextPair?.user?.content) {
        const nextUserId = nextPair.user?.id ?? `user-${index + 1}`;
        entries.push({ from: `assistant-${assistantId}`, to: `user-${nextUserId}`, kind: "thread" });
      }
    });

    Object.values(branches).forEach((branch) => {
      entries.push({
        from: `assistant-${branch.parentMessageId}`,
        to: `branch-${branch.key}`,
        kind: "branch",
      });
    });

    return entries;
  }, [displayPairs, branches]);

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
      const baseMidY = (fromY + toY) / 2;
      const midYOffset = connector.kind === "branch" ? -64 : 0;
      const midY = Math.max(fromY + 8, baseMidY + midYOffset);

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
  }, [displayPairs, branches, updateConnectorPaths]);

  const handlePanStateChange = useCallback(
    (isPanning: boolean) => {
      isPanningRef.current = isPanning;
      if (!isPanning) {
        updateConnectorPaths();
      }
    },
    [updateConnectorPaths]
  );

  const handleBranchSend = async (branchKey: string) => {
    const branch = branches[branchKey];
    if (!branch) return;
    const trimmed = branch.text.trim();
    if (!trimmed || branch.reply.isLoading) return;

    setBranches((prev) => {
      const current = prev[branchKey];
      if (!current) return prev;
      return {
        ...prev,
        [branchKey]: {
          ...current,
          text: "",
          lastUserContent: trimmed,
          reply: {
            ...current.reply,
            isLoading: true,
            error: "",
          },
          hasSubmitted: true,
        },
      };
    });
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      role: "user",
      content: trimmed,
      parentMessageId: branch.parentMessageId,
      branchId: branch.branchId,
    };
    setMessages((prev) => insertAfterMessage(prev, branch.parentMessageId, [tempMessage]));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          chatId,
          parentMessageId: branch.parentMessageId,
          branchId: branch.branchId,
          branchSide: branch.side,
          modelProvider: selectedModel?.provider,
          modelName: selectedModel?.name,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : "送信に失敗しました。";
        setBranches((prev) => {
          const current = prev[branchKey];
          if (!current) return prev;
          return {
            ...prev,
            [branchKey]: {
              ...current,
              reply: {
                ...current.reply,
                isLoading: false,
                error: errorMessage,
              },
            },
          };
        });
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
          const assistantMessage = payload.assistantMessage;
          if (
            assistantMessage?.modelName &&
            isModelProvider(assistantMessage.modelProvider ?? undefined)
          ) {
            setSelectedModel({
              provider: assistantMessage.modelProvider as ModelProvider,
              name: assistantMessage.modelName as string,
            });
          }
          if (!payload?.userMessage && assistantMessage?.parentMessageId == null) {
            additions.push({ ...assistantMessage, parentMessageId: tempId });
          } else {
            additions.push(assistantMessage);
          }
        }
        return insertAfterMessage(filtered, branch.parentMessageId, additions);
      });
      setBranches((prev) => {
        const current = prev[branchKey];
        if (!current) return prev;
        return {
          ...prev,
          [branchKey]: {
            ...current,
            branchId:
              payload?.userMessage?.branchId ??
              payload?.assistantMessage?.branchId ??
              current.branchId,
            reply: {
              assistantMessage: payload?.assistantMessage ?? null,
              isLoading: false,
              error: "",
            },
          },
        };
      });
    } catch {
      setBranches((prev) => {
        const current = prev[branchKey];
        if (!current) return prev;
        return {
          ...prev,
          [branchKey]: {
            ...current,
            reply: {
              ...current.reply,
              isLoading: false,
              error: "送信に失敗しました。",
            },
          },
        };
      });
    }
  };

  const latestAssistantId = useMemo(() => {
    const lastPair = displayPairs[displayPairs.length - 1];
    return lastPair?.assistant?.id ?? null;
  }, [displayPairs]);

  const closeOpenBranchesForAssistant = useCallback((assistantId: string | null) => {
    if (!assistantId) return;
    setBranches((prev) => {
      let hasChanges = false;
      const next = Object.fromEntries(
        Object.entries(prev).filter(([_, branch]) => {
          const shouldKeep = !(
            branch.parentMessageId === assistantId && !branch.hasSubmitted
          );
          if (!shouldKeep) {
            hasChanges = true;
          }
          return shouldKeep;
        })
      ) as Record<string, BranchDraft>;
      return hasChanges ? next : prev;
    });
  }, []);

  const promptInput = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSend();
      }}
      className="flex w-full max-w-3xl items-start gap-3"
    >
      <textarea
        ref={promptTextareaRef}
        value={promptText}
        onChange={(event) => {
          closeOpenBranchesForAssistant(latestAssistantId);
          const nextValue = event.currentTarget.value;
          setPromptText(nextValue);
          resizeTextarea(event.currentTarget);
        }}
        onFocus={() => closeOpenBranchesForAssistant(latestAssistantId)}
        placeholder="なんでも聞いてみましょう"
        rows={1}
        className="w-full resize-none rounded-xl border border-[#efe5dc] bg-white px-4 py-3 text-base leading-6 text-main shadow-[0_8px_18px_rgba(239,229,220,0.6)] transition-[height] duration-150 ease-out focus:border-[#d9c9bb] focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Send prompt"
        disabled={!promptText.trim() || isSending}
        className="flex h-11 w-11 self-end items-center justify-center rounded-lg bg-theme-main text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ArrowRight className="h-5 w-5" />
      </button>
    </form>
  );

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
          <div className="min-h-screen px-6 pb-24 pt-28">
            <main className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-10">
              {displayPairs.map((pair, index) => {
                const isLast = index === displayPairs.length - 1;
                const userContent = pair.user?.content ?? "";
                const assistantContent = pair.assistant?.content ?? "";
                const assistantModelProvider = pair.assistant?.modelProvider ?? null;
                const assistantModelName = pair.assistant?.modelName ?? null;
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
                const branchShift = normalizeBranchShift(branchOffset);
                const userNodeId = pair.user?.id ?? `user-${index}`;
                const assistantNodeId = pair.assistant?.id ?? `assistant-${index}`;
                const branchesForAssistant = assistantId
                  ? branchesByParent.get(assistantId) ?? []
                  : [];
                const hiddenBranchSides = branchesForAssistant
                  .filter((branch) => branch.hasSubmitted)
                  .map((branch) => branch.side);
                const activeBranchSides = (() => {
                  const openBranches = branchesForAssistant.filter(
                    (branch) => !branch.hasSubmitted
                  );
                  return openBranches.map((branch) => branch.side);
                })();
                const parentLeftBranch = parentAssistantId
                  ? branches[createBranchKey(parentAssistantId, "left")]
                  : null;
                const parentRightBranch = parentAssistantId
                  ? branches[createBranchKey(parentAssistantId, "right")]
                  : null;

                return (
                  <div
                    key={pair.user?.id ?? pair.assistant?.id ?? `pair-${index}`}
                    className="flex w-full flex-col items-center"
                  >
                    {index > 0 ? (
                      <div className="flex items-center gap-3">
                        {!parentLeftBranch?.hasSubmitted ? (
                          <button
                            type="button"
                            disabled={!parentAssistantId}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (parentAssistantId) {
                                handleBranchOpen(parentAssistantId, "left");
                              }
                            }}
                            aria-pressed={!!parentLeftBranch}
                            className={`branch-pill ${
                              parentLeftBranch ? "branch-pill-selected" : ""
                            }`}
                          >
                            新しいブランチ
                          </button>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="branch-pill invisible pointer-events-none"
                          >
                            新しいブランチ
                          </span>
                        )}
                        <div className="h-10 w-px bg-[#e2d8cf]" />
                        {!parentRightBranch?.hasSubmitted ? (
                          <button
                            type="button"
                            disabled={!parentAssistantId}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (parentAssistantId) {
                                handleBranchOpen(parentAssistantId, "right");
                              }
                            }}
                            aria-pressed={!!parentRightBranch}
                            className={`branch-pill ${
                              parentRightBranch ? "branch-pill-selected" : ""
                            }`}
                          >
                            新しいブランチ
                          </button>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="branch-pill invisible pointer-events-none"
                          >
                            新しいブランチ
                          </span>
                        )}
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
                    <div className="w-full">
                      <AssistantCard
                        content={assistantContent}
                        isLoading={assistantLoading}
                        errorMessage={assistantError}
                        modelProvider={assistantModelProvider}
                        modelName={assistantModelName}
                        showPromptInput={isLast && promptInputEnabled}
                        showAllBranchPills={isLast && promptInputEnabled}
                        hiddenBranchSides={isLast ? hiddenBranchSides : undefined}
                        promptInput={isLast && promptInputEnabled ? promptInput : null}
                        activeBranchSides={isLast ? activeBranchSides : null}
                        cardRef={setNodeRef(`assistant-${assistantNodeId}`)}
                        onBranchSelect={(side) => {
                          if (!assistantId) return;
                          handleBranchOpen(assistantId, side);
                        }}
                      />
                    </div>
                    {branchesForAssistant.length ? (
                      <div className="relative h-0 w-full">
                        <div className="absolute left-1/2 top-6 w-0">
                          {showBranchCenterGuide ? (
                            <div
                              className="pointer-events-none absolute left-0 top-0 h-full w-px bg-[#b7da82]/70"
                              aria-hidden="true"
                            />
                          ) : null}
                          {branchesForAssistant.map((branch) => {
                            const branchTransform =
                              branch.side === "left"
                                ? `translateX(calc(-100% - ${branchShift}))`
                                : `translateX(${branchShift})`;
                            const showBranchReply =
                              !!branch.reply.assistantMessage ||
                              !!branch.reply.error ||
                              branch.reply.isLoading;

                            return (
                              <div
                                key={branch.key}
                                ref={setNodeRef(`branch-${branch.key}`)}
                                className="absolute left-0 top-0"
                                style={{
                                  transform: branchTransform,
                                  width: "clamp(280px, 50vw, 560px)",
                                }}
                              >
                                {!branch.hasSubmitted ? (
                                  <form
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      handleBranchSend(branch.key);
                                    }}
                                    className="flex items-end gap-3"
                                  >
                                    <textarea
                                      ref={setBranchTextareaRef(branch.key)}
                                      value={branch.text}
                                      onChange={(event) => {
                                        const nextValue = event.currentTarget.value;
                                        setBranches((prev) => {
                                          const current = prev[branch.key];
                                          if (!current) return prev;
                                          return {
                                            ...prev,
                                            [branch.key]: {
                                              ...current,
                                              text: nextValue,
                                            },
                                          };
                                        });
                                        resizeTextarea(event.currentTarget);
                                      }}
                                      placeholder="なんでも聞いてみましょう"
                                      rows={1}
                                      className="w-full resize-none rounded-xl border border-[#efe5dc] bg-white px-4 py-2 text-sm leading-5 text-main shadow-[0_8px_18px_rgba(239,229,220,0.6)] transition-[height] duration-150 ease-out focus:border-[#d9c9bb] focus:outline-none"
                                    />
                                    <button
                                      type="submit"
                                      aria-label="Send branch prompt"
                                      disabled={!branch.text.trim() || branch.reply.isLoading}
                                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-theme-main text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <ArrowRight className="h-4 w-4" />
                                    </button>
                                  </form>
                                ) : null}
                                {branch.hasSubmitted && branch.lastUserContent ? (
                                  <div className="mt-4 flex w-full justify-center">
                                    <UserBubble
                                      content={branch.lastUserContent}
                                      isLoading={false}
                                      errorMessage=""
                                    />
                                  </div>
                                ) : null}
                                {showBranchReply ? (
                                  <div className="mt-4 w-full">
                                    <AssistantCard
                                      content={branch.reply.assistantMessage?.content ?? ""}
                                      isLoading={branch.reply.isLoading}
                                      errorMessage={branch.reply.error}
                                      modelProvider={branch.reply.assistantMessage?.modelProvider}
                                      modelName={branch.reply.assistantMessage?.modelName}
                                      showPromptInput={false}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
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
