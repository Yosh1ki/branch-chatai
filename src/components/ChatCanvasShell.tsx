"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AssistantCard } from "@/components/AssistantCard";
import { CanvasControls } from "@/components/CanvasControls";
import { CanvasViewport } from "@/components/CanvasViewport";
import { ChatHeader } from "@/components/ChatHeader";
import { DisableCanvasNavigation } from "@/components/DisableCanvasNavigation";
import { UserBubble } from "@/components/UserBubble";
import { useI18n } from "@/components/i18n/i18n-provider";
import { createCanvasState } from "@/lib/canvas-state";
import { fetchChatMessages } from "@/lib/chat-messages";
import { groupConversationPairs } from "@/lib/chat-conversation";
import { insertAfterMessage } from "@/lib/chat-message-insert";
import {
  isModelProvider,
  isReasoningEffort,
  type ModelProvider,
  type ReasoningEffort,
} from "@/lib/model-catalog";
import { serializeMarkdownContent } from "@/lib/rich-text";
type BranchSide = "left" | "right";

type ChatCanvasShellProps = {
  chatId: string;
  initialPrompt?: string;
  initialModelProvider?: string;
  initialModelName?: string;
  initialModelReasoningEffort?: string;
  settingsContent: ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
  };
  onLogout: () => void | Promise<void>;
};

type ChatMessage = {
  id?: string;
  role: string;
  content: string;
  parentMessageId?: string | null;
  branchId?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  modelReasoningEffort?: string | null;
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
  reasoningEffort?: ReasoningEffort | null;
};

type IndicatorItem = {
  id: string;
  nodeId: string | null;
  index: number;
  kind: "main" | "branch";
  branchKey?: string;
};

const isBranchSide = (value: string): value is BranchSide =>
  value === "left" || value === "right";

export function ChatCanvasShell({
  chatId,
  initialPrompt,
  initialModelProvider,
  initialModelName,
  initialModelReasoningEffort,
  settingsContent,
  user,
  onLogout,
}: ChatCanvasShellProps) {
  const { t } = useI18n();
  const [state, setState] = useState(createCanvasState());
  const [isVerticalMode, setIsVerticalMode] = useState(false);
  const latestCanvasStateRef = useRef(state);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
  const [promptText, setPromptText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Record<string, BranchDraft>>({});
  const [activeIndicatorId, setActiveIndicatorId] = useState<string | null>(null);
  const [isBranchIndicatorIdle, setIsBranchIndicatorIdle] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasContentRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const branchIndicatorContainerRef = useRef<HTMLDivElement | null>(null);
  const branchIndicatorIdleTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const isPanningRef = useRef(false);
  const focusAnimationFrameRef = useRef<number | null>(null);
  const verticalModeFocusFrameRef = useRef<number | null>(null);
  const tempIdRef = useRef(0);
  const [connectorPaths, setConnectorPaths] = useState<string[]>([]);
  const lastPathsRef = useRef<string[]>([]);
  const branchTextareaRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSentInitialPromptRef = useRef(false);

  const readChatStream = useCallback(
    async (
      response: Response,
      onDelta: (text: string) => void
    ): Promise<{ payload?: { userMessage?: ChatMessage; assistantMessage?: ChatMessage } }> => {
      if (!response.body) {
        return {};
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const parseSseEvent = (rawEvent: string) => {
        const lines = rawEvent.split("\n");
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
          }
        }

        return dataLines.join("\n");
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        while (buffer.includes("\n\n")) {
          const splitIndex = buffer.indexOf("\n\n");
          const chunk = buffer.slice(0, splitIndex).trim();
          buffer = buffer.slice(splitIndex + 2);
          const data = parseSseEvent(chunk);
          if (!data) continue;
          if (data === "[DONE]") continue;
          let parsed: Record<string, unknown> | null = null;
          try {
            parsed = JSON.parse(data) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (!parsed) continue;
          if (parsed?.type === "delta" && typeof parsed.text === "string") {
            onDelta(parsed.text);
          }
          if (parsed?.type === "error") {
            const message =
              typeof parsed.error === "string" && parsed.error.length > 0
                ? parsed.error
                : t("chat.sendFailed");
            throw new Error(message);
          }
          if (parsed?.type === "final") {
            return { payload: parsed.payload as { userMessage?: ChatMessage; assistantMessage?: ChatMessage } | undefined };
          }
        }
      }

      const trailing = buffer.trim();
      if (trailing) {
        const data = parseSseEvent(trailing);
        if (data) {
          if (data === "[DONE]") {
            return {};
          }
          let parsed: Record<string, unknown> | null = null;
          try {
            parsed = JSON.parse(data) as Record<string, unknown>;
          } catch {
            return {};
          }
          if (!parsed) {
            return {};
          }
          if (parsed?.type === "delta" && typeof parsed.text === "string") {
            onDelta(parsed.text);
          }
          if (parsed?.type === "error") {
            const message =
              typeof parsed.error === "string" && parsed.error.length > 0
                ? parsed.error
                : t("chat.sendFailed");
            throw new Error(message);
          }
          if (parsed?.type === "final") {
            return { payload: parsed.payload as { userMessage?: ChatMessage; assistantMessage?: ChatMessage } | undefined };
          }
        }
      }
      return {};
    },
    [t]
  );

  const getNextTempId = useCallback((prefix: string) => {
    tempIdRef.current += 1;
    return `${prefix}-${tempIdRef.current}`;
  }, []);

  const createBranchKey = useCallback(
    (parentMessageId: string, side: BranchSide) => `${parentMessageId}:${side}`,
    []
  );

  const resizeTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const createStreamRenderer = useCallback((assistantId: string) => {
    let streamedText = "";
    let rafId: number | null = null;

    const render = () => {
      rafId = null;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, content: streamedText } : message
        )
      );
    };

    return {
      push: (delta: string) => {
        streamedText += delta;
        if (rafId != null) {
          return;
        }
        rafId = window.requestAnimationFrame(render);
      },
      flush: () => {
        if (rafId != null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        render();
      },
      text: () => streamedText,
    };
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

      const getBranchSummary = (branchMessages: ChatMessage[]) => {
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

        return { lastUserContent, lastAssistant };
      };

      const branchState = loadedBranches.reduce<Record<string, BranchDraft>>((acc, branch) => {
        if (!isBranchSide(branch.side)) {
          return acc;
        }
        const key = createBranchKey(branch.parentMessageId, branch.side);
        const branchMessages = messagesByBranch.get(branch.id) ?? [];
        const { lastUserContent, lastAssistant } = getBranchSummary(branchMessages);

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

      const branchIdsInTable = new Set(loadedBranches.map((branch) => branch.id));
      const usedSidesByParent = new Map<string, Set<BranchSide>>();
      Object.values(branchState).forEach((branch) => {
        const used = usedSidesByParent.get(branch.parentMessageId) ?? new Set<BranchSide>();
        used.add(branch.side);
        usedSidesByParent.set(branch.parentMessageId, used);
      });

      // Backfill branch state from message data when branch rows are missing.
      for (const [branchId, branchMessages] of messagesByBranch.entries()) {
        if (branchIdsInTable.has(branchId)) {
          continue;
        }

        const rootUserMessage = branchMessages.find(
          (message) => message.role === "user" && Boolean(message.parentMessageId)
        );
        const firstLinkedMessage = branchMessages.find((message) => Boolean(message.parentMessageId));
        const parentMessageId = rootUserMessage?.parentMessageId ?? firstLinkedMessage?.parentMessageId ?? null;
        if (!parentMessageId) {
          continue;
        }

        const used = usedSidesByParent.get(parentMessageId) ?? new Set<BranchSide>();
        let side: BranchSide = used.has("left") ? "right" : "left";
        if (used.has("left") && !used.has("right")) {
          side = "right";
        }
        if (used.has("left") && used.has("right")) {
          side = "right";
        }

        let key = createBranchKey(parentMessageId, side);
        if (branchState[key]) {
          const alternateSide: BranchSide = side === "left" ? "right" : "left";
          const alternateKey = createBranchKey(parentMessageId, alternateSide);
          if (!branchState[alternateKey]) {
            side = alternateSide;
            key = alternateKey;
          } else {
            key = `${createBranchKey(parentMessageId, side)}:${branchId}`;
          }
        }

        const { lastUserContent, lastAssistant } = getBranchSummary(branchMessages);
        const inferredCreatedAt = (() => {
          const firstMessageId = branchMessages[0]?.id;
          if (!firstMessageId) return Date.now();
          const index = loadedMessages.findIndex((message) => message.id === firstMessageId);
          if (index < 0) return Date.now();
          return Date.now() + index;
        })();

        branchState[key] = {
          key,
          parentMessageId,
          side,
          branchId,
          text: "",
          lastUserContent,
          reply: {
            assistantMessage: lastAssistant,
            isLoading: false,
            error: "",
          },
          hasSubmitted: Boolean(lastUserContent),
          createdAt: inferredCreatedAt,
        };
        used.add(side);
        usedSidesByParent.set(parentMessageId, used);
      }

      return branchState;
    },
    [createBranchKey]
  );

  useEffect(() => {
    latestCanvasStateRef.current = state;
  }, [state]);

  const cancelFocusAnimation = useCallback(() => {
    if (focusAnimationFrameRef.current == null) return;
    window.cancelAnimationFrame(focusAnimationFrameRef.current);
    focusAnimationFrameRef.current = null;
  }, []);

  useEffect(
    () => () => {
      cancelFocusAnimation();
      if (verticalModeFocusFrameRef.current != null) {
        window.cancelAnimationFrame(verticalModeFocusFrameRef.current);
        verticalModeFocusFrameRef.current = null;
      }
    },
    [cancelFocusAnimation]
  );

  const animateCanvasOffset = useCallback(
    (targetOffsetX: number, targetOffsetY: number) => {
      const startState = latestCanvasStateRef.current;
      const startOffsetX = startState.offsetX;
      const startOffsetY = startState.offsetY;
      const deltaX = targetOffsetX - startOffsetX;
      const deltaY = targetOffsetY - startOffsetY;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        const nextState = {
          ...startState,
          offsetX: targetOffsetX,
          offsetY: targetOffsetY,
        };
        latestCanvasStateRef.current = nextState;
        setState(nextState);
        return;
      }

      cancelFocusAnimation();
      const animationDurationMs = 320;
      const startTime = performance.now();

      const tick = (currentTime: number) => {
        const progress = Math.min(1, (currentTime - startTime) / animationDurationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextState = {
          ...startState,
          offsetX: startOffsetX + deltaX * eased,
          offsetY: startOffsetY + deltaY * eased,
        };
        latestCanvasStateRef.current = nextState;
        setState(nextState);

        if (progress < 1) {
          focusAnimationFrameRef.current = window.requestAnimationFrame(tick);
          return;
        }
        focusAnimationFrameRef.current = null;
      };

      focusAnimationFrameRef.current = window.requestAnimationFrame(tick);
    },
    [cancelFocusAnimation]
  );

  const focusNodeToViewportCenter = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) return;
      const targetNode = nodeRefs.current.get(nodeId);
      const viewport = canvasContainerRef.current;
      if (!targetNode || !viewport) {
        return;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const nodeRect = targetNode.getBoundingClientRect();
      const viewportCenterX = viewportRect.left + viewportRect.width / 2;
      const viewportCenterY = viewportRect.top + viewportRect.height / 2;
      const nodeCenterX = nodeRect.left + nodeRect.width / 2;
      const nodeCenterY = nodeRect.top + nodeRect.height / 2;
      const currentState = latestCanvasStateRef.current;

      animateCanvasOffset(
        currentState.offsetX + (viewportCenterX - nodeCenterX),
        currentState.offsetY + (viewportCenterY - nodeCenterY)
      );
    },
    [animateCanvasOffset]
  );

  const focusElementToViewportCenter = useCallback(
    (element: HTMLElement | null, targetViewportYRatio = 0.5) => {
      const viewport = canvasContainerRef.current;
      if (!element || !viewport) {
        return;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const viewportCenterX = viewportRect.left + viewportRect.width / 2;
      const viewportTargetY = viewportRect.top + viewportRect.height * targetViewportYRatio;
      const elementCenterX = elementRect.left + elementRect.width / 2;
      const elementCenterY = elementRect.top + elementRect.height / 2;
      const currentState = latestCanvasStateRef.current;

      animateCanvasOffset(
        currentState.offsetX + (viewportCenterX - elementCenterX),
        currentState.offsetY + (viewportTargetY - elementCenterY)
      );
    },
    [animateCanvasOffset]
  );

  useEffect(() => {
    let isActive = true;
    const loadMessages = async () => {
      setIsLoading(true);
      setLoadError("");
      setSelectedModel(null);

      try {
        const data = await fetchChatMessages(chatId);
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
          const latestReasoningEffort: ReasoningEffort | null = isReasoningEffort(
            latestModel.modelReasoningEffort ?? undefined
          )
            ? (latestModel.modelReasoningEffort as ReasoningEffort)
            : null;
          setSelectedModel({
            provider: latestModel.modelProvider as ModelProvider,
            name: latestModel.modelName as string,
            reasoningEffort: latestReasoningEffort,
          });
        }
        setIsLoading(false);
      } catch (error) {
        if (!isActive) return;
        setLoadError(error instanceof Error ? error.message : t("chat.loadFailed"));
        setIsLoading(false);
      }
    };

    loadMessages();

    return () => {
      isActive = false;
    };
  }, [chatId, buildBranchState, t]);

  useEffect(() => {
    if (!promptTextareaRef.current) return;
    const textarea = promptTextareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [promptText]);

  const initialModelSelection = useMemo(() => {
    if (
      !initialModelName ||
      !isModelProvider(initialModelProvider ?? undefined)
    ) {
      return null;
    }
    const reasoningEffort = isReasoningEffort(initialModelReasoningEffort ?? undefined)
      ? (initialModelReasoningEffort as ReasoningEffort)
      : null;
    return {
      provider: initialModelProvider as ModelProvider,
      name: initialModelName,
      reasoningEffort,
    } satisfies SelectedModel;
  }, [initialModelName, initialModelProvider, initialModelReasoningEffort]);

  const handleBranchOpen = (parentMessageId: string, side: BranchSide) => {
    const key = createBranchKey(parentMessageId, side);
    setBranches((prev) => {
      const existing = prev[key];
      if (existing) {
        if (existing.hasSubmitted) {
          return prev;
        }
        const next = { ...prev };
        delete next[key];
        return next;
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

  const handleSend = useCallback(
    async (overridePrompt?: string, overrideModel?: SelectedModel | null) => {
      const trimmed = (overridePrompt ?? promptText).trim();
      if (!trimmed || isSending) return;

      setIsSending(true);
      setSendError("");
      if (!overridePrompt) {
        setPromptText("");
      }
      const tempId = getNextTempId("temp");
      const tempMessage = { id: tempId, role: "user", content: trimmed, parentMessageId: null };
      const tempAssistantId = getNextTempId("temp-assistant");
      const tempAssistant = {
        id: tempAssistantId,
        role: "assistant",
        content: serializeMarkdownContent(""),
        parentMessageId: tempId,
      };
      setPendingUserId(tempId);
      setMessages((prev) => [...prev, tempMessage, tempAssistant]);

      const requestModel = overrideModel ?? selectedModel;
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: trimmed,
            chatId,
            modelProvider: requestModel?.provider,
            modelName: requestModel?.name,
            modelReasoningEffort: requestModel?.reasoningEffort ?? null,
            stream: true,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const errorMessage =
            typeof payload?.error === "string"
              ? payload.error
              : t("chat.sendFailed");
          setMessages((prev) =>
            prev.filter((message) => message.id !== tempId && message.id !== tempAssistantId)
          );
          setPendingUserId(null);
          setSendError(errorMessage);
          setIsSending(false);
          return;
        }

        const streamRenderer = createStreamRenderer(tempAssistantId);
        const responseClone = response.clone();
        let result = await readChatStream(response, (delta) => {
          streamRenderer.push(delta);
        });
        streamRenderer.flush();
        const streamedText = streamRenderer.text();
        if (!result.payload) {
          result = { payload: await responseClone.json().catch(() => ({})) };
        }
        const payload = result.payload ?? {};

        setMessages((prev) => {
          const filtered = prev.filter(
            (message) => message.id !== tempId && message.id !== tempAssistantId
          );
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
              const assistantReasoningEffort: ReasoningEffort | null = isReasoningEffort(
                assistantMessage.modelReasoningEffort ?? undefined
              )
                ? (assistantMessage.modelReasoningEffort as ReasoningEffort)
                : null;
              setSelectedModel({
                provider: assistantMessage.modelProvider as ModelProvider,
                name: assistantMessage.modelName as string,
                reasoningEffort: assistantReasoningEffort,
              });
            }
            if (!payload?.userMessage && assistantMessage?.parentMessageId == null) {
              nextMessages.push({ ...assistantMessage, parentMessageId: tempId });
            } else {
              nextMessages.push(assistantMessage);
            }
          } else if (streamedText) {
            nextMessages.push({
              ...tempAssistant,
              content: serializeMarkdownContent(streamedText),
            });
          }
          return nextMessages;
        });
        setPendingUserId(null);
        setIsSending(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error && error.message ? error.message : t("chat.sendFailed");
        setMessages((prev) =>
          prev.filter((message) => message.id !== tempId && message.id !== tempAssistantId)
        );
        setPendingUserId(null);
        setSendError(errorMessage);
        setIsSending(false);
      }
    },
    [
      chatId,
      createStreamRenderer,
      getNextTempId,
      isSending,
      promptText,
      readChatStream,
      selectedModel,
      t,
    ]
  );

  useEffect(() => {
    if (isLoading || !initialPrompt || hasAutoSentInitialPromptRef.current) {
      return;
    }
    hasAutoSentInitialPromptRef.current = true;
    const timer = window.setTimeout(() => {
      void handleSend(initialPrompt, initialModelSelection);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [handleSend, initialModelSelection, initialPrompt, isLoading]);

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
  const mainIndicatorNodeId = useMemo(() => {
    for (let index = displayPairs.length - 1; index >= 0; index -= 1) {
      const pair = displayPairs[index];
      if (!pair.user && !pair.assistant) {
        continue;
      }
      if (pair.assistant) {
        const assistantNodeId = pair.assistant.id ?? `assistant-${index}`;
        return `assistant-${assistantNodeId}`;
      }
      if (pair.user) {
        const userNodeId = pair.user.id ?? `user-${index}`;
        return `user-${userNodeId}`;
      }
    }
    return null;
  }, [displayPairs]);
  const branchIndicators = useMemo(
    () =>
      Object.values(branches)
        .slice()
        .sort((a, b) => {
          if (a.createdAt !== b.createdAt) {
            return a.createdAt - b.createdAt;
          }
          return a.key.localeCompare(b.key);
        })
        .map((branch, index) => ({
          index: index + 1,
          key: branch.key,
          side: branch.side,
        })),
    [branches]
  );
  const indicatorItems = useMemo<IndicatorItem[]>(
    () => {
      const leftBranches = branchIndicators.filter((branch) => branch.side === "left");
      const rightBranches = branchIndicators.filter((branch) => branch.side === "right");
      const orderedLeftBranches = leftBranches.slice().reverse();

      return [
        ...orderedLeftBranches.map((branch, index) => ({
          id: `branch:${branch.key}`,
          kind: "branch" as const,
          nodeId: `branch-${branch.key}`,
          branchKey: branch.key,
          index: index + 1,
        })),
        {
          id: "main",
          kind: "main" as const,
          nodeId: mainIndicatorNodeId,
          index: orderedLeftBranches.length + 1,
        },
        ...rightBranches.map((branch, index) => ({
          id: `branch:${branch.key}`,
          kind: "branch" as const,
          nodeId: `branch-${branch.key}`,
          branchKey: branch.key,
          index: leftBranches.length + 2 + index,
        })),
      ];
    },
    [branchIndicators, mainIndicatorNodeId]
  );
  const promptInputEnabled = true;
  const branchOffset = "clamp(380px, 35vw, 560px)";
  const showBranchCenterGuide = false;
  const resolvedActiveIndicatorId =
    activeIndicatorId && indicatorItems.some((item) => item.id === activeIndicatorId)
      ? activeIndicatorId
      : "main";

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

  const clearBranchIndicatorIdleTimer = useCallback(() => {
    if (!branchIndicatorIdleTimerRef.current) return;
    window.clearTimeout(branchIndicatorIdleTimerRef.current);
    branchIndicatorIdleTimerRef.current = null;
  }, []);

  const startBranchIndicatorIdleTimer = useCallback(() => {
    clearBranchIndicatorIdleTimer();
    branchIndicatorIdleTimerRef.current = window.setTimeout(() => {
      setIsBranchIndicatorIdle(true);
      branchIndicatorIdleTimerRef.current = null;
    }, 3000);
  }, [clearBranchIndicatorIdleTimer]);

  const handleIndicatorEngage = useCallback(() => {
    setIsBranchIndicatorIdle(false);
    clearBranchIndicatorIdleTimer();
  }, [clearBranchIndicatorIdleTimer]);

  const handleIndicatorDisengage = useCallback(() => {
    startBranchIndicatorIdleTimer();
  }, [startBranchIndicatorIdleTimer]);

  const handleIndicatorBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget;
      const container = branchIndicatorContainerRef.current;
      if (
        container &&
        nextTarget instanceof Node &&
        container.contains(nextTarget)
      ) {
        return;
      }
      startBranchIndicatorIdleTimer();
    },
    [startBranchIndicatorIdleTimer]
  );

  useEffect(() => {
    startBranchIndicatorIdleTimer();

    return () => {
      clearBranchIndicatorIdleTimer();
    };
  }, [clearBranchIndicatorIdleTimer, startBranchIndicatorIdleTimer]);

  const handleIndicatorSelect = useCallback(
    (item: IndicatorItem) => {
      setActiveIndicatorId(item.id);
      focusNodeToViewportCenter(item.nodeId);
    },
    [focusNodeToViewportCenter]
  );

  const isInteractiveTapTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return false;
    }
    const editableTarget = target instanceof HTMLElement ? target : null;
    return Boolean(
      target.closest(
        "button,textarea,input,a,[role='button'],[contenteditable='true'],[data-prevent-viewport-jump='true']"
      ) ||
      editableTarget?.isContentEditable
    );
  }, []);

  const focusBranchByKey = useCallback(
    (branchKey: string) => {
      setActiveIndicatorId(`branch:${branchKey}`);
      focusNodeToViewportCenter(`branch-${branchKey}`);
    },
    [focusNodeToViewportCenter]
  );

  const focusMainLatest = useCallback(() => {
    if (!mainIndicatorNodeId) {
      return;
    }
    setActiveIndicatorId("main");
    focusNodeToViewportCenter(mainIndicatorNodeId);
  }, [focusNodeToViewportCenter, mainIndicatorNodeId]);

  const findNearestBranchIndicator = useCallback(() => {
    const viewport = canvasContainerRef.current;
    if (!viewport) return null;

    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenterX = viewportRect.left + viewportRect.width / 2;
    const viewportCenterY = viewportRect.top + viewportRect.height / 2;

    let nearestItem: IndicatorItem | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const item of indicatorItems) {
      if (item.kind !== "branch" || !item.nodeId) {
        continue;
      }
      const node = nodeRefs.current.get(item.nodeId);
      if (!node) {
        continue;
      }
      const rect = node.getBoundingClientRect();
      const nodeCenterX = rect.left + rect.width / 2;
      const nodeCenterY = rect.top + rect.height / 2;
      const distance =
        (nodeCenterX - viewportCenterX) * (nodeCenterX - viewportCenterX) +
        (nodeCenterY - viewportCenterY) * (nodeCenterY - viewportCenterY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestItem = item;
      }
    }

    return nearestItem;
  }, [indicatorItems]);

  const handleToggleVerticalMode = useCallback(() => {
    if (isVerticalMode) {
      setIsVerticalMode(false);
      return;
    }

    if (verticalModeFocusFrameRef.current != null) {
      window.cancelAnimationFrame(verticalModeFocusFrameRef.current);
      verticalModeFocusFrameRef.current = null;
    }

    setState((prev) => ({ ...prev, scale: 1 }));
    setIsVerticalMode(true);
    verticalModeFocusFrameRef.current = window.requestAnimationFrame(() => {
      verticalModeFocusFrameRef.current = null;
      const nearestBranch = findNearestBranchIndicator();
      if (!nearestBranch) {
        return;
      }
      setActiveIndicatorId(nearestBranch.id);
      focusNodeToViewportCenter(nearestBranch.nodeId);
    });
  }, [findNearestBranchIndicator, focusNodeToViewportCenter, isVerticalMode]);

  const handleBranchSend = async (branchKey: string) => {
    const branch = branches[branchKey];
    if (!branch) return;
    const trimmed = branch.text.trim();
    if (!trimmed || branch.reply.isLoading) return;

    const tempId = getNextTempId("temp");
    const tempAssistantId = getNextTempId("temp-assistant");
    const tempMessage = {
      id: tempId,
      role: "user",
      content: trimmed,
      parentMessageId: branch.parentMessageId,
      branchId: branch.branchId,
    };
    const tempAssistant = {
      id: tempAssistantId,
      role: "assistant",
      content: serializeMarkdownContent(""),
      parentMessageId: tempId,
      branchId: branch.branchId,
    };

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
            assistantMessage: tempAssistant,
            isLoading: true,
            error: "",
          },
          hasSubmitted: true,
        },
      };
    });
    setMessages((prev) =>
      insertAfterMessage(prev, branch.parentMessageId, [tempMessage, tempAssistant])
    );

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
          modelReasoningEffort: selectedModel?.reasoningEffort ?? null,
          stream: true,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : t("chat.sendFailed");
        setMessages((prev) =>
          prev.filter((message) => message.id !== tempId && message.id !== tempAssistantId)
        );
        setBranches((prev) => {
          const current = prev[branchKey];
          if (!current) return prev;
          return {
            ...prev,
            [branchKey]: {
              ...current,
              reply: {
                ...current.reply,
                assistantMessage: null,
                isLoading: false,
                error: errorMessage,
              },
            },
          };
        });
        return;
      }

      let streamedText = "";
      let branchRafId: number | null = null;
      const renderBranchStream = () => {
        branchRafId = null;
        setBranches((prev) => {
          const current = prev[branchKey];
          if (!current || !current.reply.assistantMessage) return prev;
          return {
            ...prev,
            [branchKey]: {
              ...current,
              reply: {
                ...current.reply,
                assistantMessage: {
                  ...current.reply.assistantMessage,
                  content: streamedText,
                },
              },
            },
          };
        });
      };
      const queueBranchStreamRender = () => {
        if (branchRafId != null) return;
        branchRafId = window.requestAnimationFrame(renderBranchStream);
      };
      const flushBranchStreamRender = () => {
        if (branchRafId != null) {
          window.cancelAnimationFrame(branchRafId);
          branchRafId = null;
        }
        renderBranchStream();
      };

      const streamRenderer = createStreamRenderer(tempAssistantId);
      const responseClone = response.clone();
      let result = await readChatStream(response, (delta) => {
        streamedText += delta;
        queueBranchStreamRender();
        streamRenderer.push(delta);
      });
      streamRenderer.flush();
      flushBranchStreamRender();
      streamedText = streamRenderer.text();
      if (!result.payload) {
        result = { payload: await responseClone.json().catch(() => ({})) };
      }
      const payload = result.payload ?? {};

      setMessages((prev) => {
        const filtered = prev.filter(
          (message) => message.id !== tempId && message.id !== tempAssistantId
        );
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
            const assistantReasoningEffort: ReasoningEffort | null = isReasoningEffort(
              assistantMessage.modelReasoningEffort ?? undefined
            )
              ? (assistantMessage.modelReasoningEffort as ReasoningEffort)
              : null;
            setSelectedModel({
              provider: assistantMessage.modelProvider as ModelProvider,
              name: assistantMessage.modelName as string,
              reasoningEffort: assistantReasoningEffort,
            });
          }
          if (!payload?.userMessage && assistantMessage?.parentMessageId == null) {
            additions.push({ ...assistantMessage, parentMessageId: tempId });
          } else {
            additions.push(assistantMessage);
          }
        } else if (streamedText) {
          additions.push({
            ...tempAssistant,
            content: serializeMarkdownContent(streamedText),
          });
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
              assistantMessage:
                payload?.assistantMessage ??
                (streamedText
                  ? {
                      ...tempAssistant,
                      content: serializeMarkdownContent(streamedText),
                    }
                  : current.reply.assistantMessage),
              isLoading: false,
              error: "",
            },
          },
        };
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message ? error.message : t("chat.sendFailed");
      setMessages((prev) =>
        prev.filter((message) => message.id !== tempId && message.id !== tempAssistantId)
      );
      setBranches((prev) => {
        const current = prev[branchKey];
        if (!current) return prev;
        return {
          ...prev,
          [branchKey]: {
            ...current,
            reply: {
              ...current.reply,
              assistantMessage: null,
              isLoading: false,
              error: errorMessage,
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
        Object.entries(prev).filter(([, branch]) => {
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

  const focusMainPromptInput = useCallback(() => {
    const textarea = promptTextareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.focus({ preventScroll: true });
  }, []);

  const promptInput = (
    <div
      className="relative w-full max-w-3xl"
      data-prevent-viewport-jump="true"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
        className="flex w-full items-start gap-3"
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
        onFocus={(event) => {
          closeOpenBranchesForAssistant(latestAssistantId);
          focusElementToViewportCenter(event.currentTarget, 0.58);
        }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              if (!promptText.trim() || isSending) {
                event.preventDefault();
                return;
              }
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder={t("prompt.placeholder")}
          rows={1}
          className="w-full resize-none rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] px-4 py-3 text-base leading-6 text-main shadow-[var(--color-shadow-soft)] transition-[height] duration-150 ease-out focus:border-[var(--color-border-soft)] focus:outline-none"
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
      <button
        type="button"
        aria-label="Focus prompt input"
        onPointerDown={(event) => {
          event.stopPropagation();
          focusMainPromptInput();
        }}
        onClick={(event) => {
          event.stopPropagation();
          focusMainPromptInput();
        }}
        className="absolute left-0 right-0 top-full z-10 h-100 translate-y-2 rounded-2xl bg-transparent"
      />
    </div>
  );

  const connectorsOverlay = (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {connectorPaths.map((path, index) => (
        <path
          key={`connector-${index}`}
          d={path}
          fill="none"
          stroke="var(--color-connector)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
  const indicatorContent = indicatorItems.length ? (
    <nav className="branch-indicator-nav" aria-label={t("chat.branchList")}>
      <div className="branch-indicator-scroll">
        {indicatorItems.map((item) => {
          const isActive = item.id === resolvedActiveIndicatorId;
          const srLabel =
            item.kind === "main"
              ? `${t("chat.mainBranch")} ${item.index}`
              : `${t("chat.branchList")} ${item.index}`;
          return (
            <button
              key={item.id}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => handleIndicatorSelect(item)}
              aria-pressed={isActive}
              className={`branch-indicator-button ${
                isActive ? "branch-indicator-button-active" : ""
              }`}
            >
              <span className="sr-only">{srLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  ) : null;

  return (
    <div className="min-h-screen bg-[var(--color-app-bg)] text-main">
      <DisableCanvasNavigation />
      <CanvasControls
        scale={state.scale}
        isVerticalMode={isVerticalMode}
        onToggleVerticalMode={handleToggleVerticalMode}
      />
      <div className="fixed left-0 right-0 top-0 z-40 bg-[var(--color-app-bg)]/80 backdrop-blur">
        <div className="mx-auto w-full px-0">
          <ChatHeader
            settingsContent={settingsContent}
            user={user}
            onLogout={onLogout}
          />
        </div>
      </div>
      {indicatorContent ? (
        <div
          className={`pointer-events-none fixed inset-x-0 bottom-20 z-[45] flex justify-center px-4 transition-opacity duration-300 ${
            isBranchIndicatorIdle ? "opacity-15" : "opacity-100"
          }`}
        >
          <div
            ref={branchIndicatorContainerRef}
            className="pointer-events-auto w-full max-w-[560px]"
            onPointerEnter={handleIndicatorEngage}
            onPointerDown={handleIndicatorEngage}
            onPointerLeave={handleIndicatorDisengage}
            onFocusCapture={handleIndicatorEngage}
            onBlurCapture={handleIndicatorBlur}
          >
            {indicatorContent}
          </div>
        </div>
      ) : null}
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
          navigationMode={isVerticalMode ? "vertical" : "free"}
        >
          <div className="min-h-screen px-6 pb-24 pt-28">
            <main
              className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-10"
              onClick={(event) => {
                if (isInteractiveTapTarget(event.target)) {
                  return;
                }
                focusMainLatest();
              }}
            >
              {displayPairs.map((pair, index) => {
                const isLast = index === displayPairs.length - 1;
                const userContent = pair.user?.content ?? "";
                const assistantContent = pair.assistant?.content ?? "";
                const assistantModelProvider = pair.assistant?.modelProvider ?? null;
                const assistantModelName = pair.assistant?.modelName ?? null;
                const assistantModelReasoningEffort =
                  pair.assistant?.modelReasoningEffort ?? null;
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
                      <div className="-mt-8 mb-8 flex items-center gap-3">
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
                            {t("chat.newBranch")}
                          </button>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="branch-pill invisible pointer-events-none"
                          >
                            {t("chat.newBranch")}
                          </span>
                        )}
                        <div className="h-10 w-px bg-[var(--color-connector)]" />
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
                            {t("chat.newBranch")}
                          </button>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="branch-pill invisible pointer-events-none"
                          >
                            {t("chat.newBranch")}
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
                        modelReasoningEffort={assistantModelReasoningEffort}
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
                                data-branch-region="true"
                                className="absolute left-0 top-0"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (event.metaKey || event.ctrlKey) {
                                    return;
                                  }
                                  if (isInteractiveTapTarget(event.target)) {
                                    return;
                                  }
                                  focusBranchByKey(branch.key);
                                }}
                                style={{
                                  transform: branchTransform,
                                  width: "clamp(280px, 50vw, 560px)",
                                }}
                              >
                                <button
                                  type="button"
                                  aria-label={t("chat.branchList")}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    focusBranchByKey(branch.key);
                                  }}
                                  className="absolute -bottom-[18vh] -left-8 -right-8 -top-[40vh] z-0 block cursor-pointer rounded-[28px] bg-transparent"
                                />
                                {!branch.hasSubmitted ? (
                                  <form
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      handleBranchSend(branch.key);
                                    }}
                                    className="relative z-10 flex items-end gap-3"
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
                                      onPointerDown={(event) => {
                                        focusElementToViewportCenter(event.currentTarget);
                                      }}
                                      onFocus={(event) => {
                                        focusElementToViewportCenter(event.currentTarget);
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.nativeEvent.isComposing) return;
                                        if (
                                          event.key === "Enter" &&
                                          (event.metaKey || event.ctrlKey)
                                        ) {
                                          if (!branch.text.trim() || branch.reply.isLoading) {
                                            event.preventDefault();
                                            return;
                                          }
                                          event.preventDefault();
                                          handleBranchSend(branch.key);
                                        }
                                      }}
                                      placeholder={t("prompt.placeholder")}
                                      rows={1}
                                      className="w-full resize-none rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] px-4 py-2 text-sm leading-5 text-main shadow-[var(--color-shadow-soft)] transition-[height] duration-150 ease-out focus:border-[var(--color-border-soft)] focus:outline-none"
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
                                  <div className="relative z-10 mt-4 flex w-full justify-center">
                                    <UserBubble
                                      content={branch.lastUserContent}
                                      isLoading={false}
                                      errorMessage=""
                                    />
                                  </div>
                                ) : null}
                                {showBranchReply ? (
                                  <div className="relative z-10 mt-4 w-full">
                                    <AssistantCard
                                      content={branch.reply.assistantMessage?.content ?? ""}
                                      isLoading={branch.reply.isLoading}
                                      errorMessage={branch.reply.error}
                                      modelProvider={branch.reply.assistantMessage?.modelProvider}
                                      modelName={branch.reply.assistantMessage?.modelName}
                                      modelReasoningEffort={
                                        branch.reply.assistantMessage?.modelReasoningEffort
                                      }
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
