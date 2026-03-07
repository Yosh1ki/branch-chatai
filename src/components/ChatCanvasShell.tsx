"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { AssistantCard } from "@/components/AssistantCard";
import { CanvasControls } from "@/components/CanvasControls";
import { CanvasViewport } from "@/components/CanvasViewport";
import { ChatHeader } from "@/components/ChatHeader";
import { DisableCanvasNavigation } from "@/components/DisableCanvasNavigation";
import { UsageQuotaNotice } from "@/components/usage/usage-quota-notice";
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
import {
  useChatSessionStore,
  type BranchDraft,
  type BranchSide,
  type ChatMessage,
  type SelectedModel,
} from "@/stores/chat-session-store";
import { getUsageLimitErrorMessageKey } from "@/lib/usage-quota-messages";
import type { UsageQuotaStatus } from "@/lib/usage-quota";

type ChatCanvasShellProps = {
  chatId: string;
  initialPrompt?: string;
  initialRequestId?: string;
  initialModelProvider?: string;
  initialModelName?: string;
  initialModelReasoningEffort?: string;
  initialQuotaStatus: UsageQuotaStatus;
  settingsContent: ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
  };
  onLogout: () => void | Promise<void>;
};

type ChatBranch = {
  id: string;
  parentMessageId: string;
  side: BranchSide;
  createdAt?: string;
};

type IndicatorItem = {
  id: string;
  nodeId: string | null;
  index: number;
  kind: "main" | "branch";
  side?: BranchSide;
};

type ConnectorEntry = {
  id: string;
  from: string;
  to: string;
  kind: "thread" | "branch";
  branchKey?: string;
};

type ConnectorPath = {
  id: string;
  d: string;
  kind: "thread" | "branch";
  branchKey?: string;
};

const isBranchSide = (value: string): value is BranchSide =>
  value === "left" || value === "right";
const BRANCH_CONNECTOR_DRAW_DURATION_MS = 980;
const BRANCH_ANCHOR_OFFSET_PX = 24;
const BRANCH_STACK_GAP_PX = 24;
const BRANCH_MIN_VERTICAL_LEAD_PX = 40;
const BRANCH_MAX_VERTICAL_LEAD_PX = 120;
const BRANCH_VERTICAL_LEAD_RATIO = 0.4;

export function ChatCanvasShell({
  chatId,
  initialPrompt,
  initialRequestId,
  initialModelProvider,
  initialModelName,
  initialModelReasoningEffort,
  initialQuotaStatus,
  settingsContent,
  user,
  onLogout,
}: ChatCanvasShellProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState(createCanvasState());
  const [isVerticalMode, setIsVerticalMode] = useState(false);
  const latestCanvasStateRef = useRef(state);
  const messages = useChatSessionStore((store) => store.messages);
  const setMessages = useChatSessionStore((store) => store.setMessages);
  const selectedModel = useChatSessionStore((store) => store.selectedModel);
  const setSelectedModel = useChatSessionStore((store) => store.setSelectedModel);
  const [promptText, setPromptText] = useState("");
  const [quotaStatus, setQuotaStatus] = useState(initialQuotaStatus);
  const isSending = useChatSessionStore((store) => store.isSending);
  const setIsSending = useChatSessionStore((store) => store.setIsSending);
  const sendError = useChatSessionStore((store) => store.sendError);
  const setSendError = useChatSessionStore((store) => store.setSendError);
  const isLoading = useChatSessionStore((store) => store.isLoading);
  const setIsLoading = useChatSessionStore((store) => store.setIsLoading);
  const loadError = useChatSessionStore((store) => store.loadError);
  const setLoadError = useChatSessionStore((store) => store.setLoadError);
  const pendingUserId = useChatSessionStore((store) => store.pendingUserId);
  const setPendingUserId = useChatSessionStore((store) => store.setPendingUserId);
  const branches = useChatSessionStore((store) => store.branches);
  const setBranches = useChatSessionStore((store) => store.setBranches);
  const resetSession = useChatSessionStore((store) => store.resetSession);
  const [expandedBranchCards, setExpandedBranchCards] = useState<Record<string, boolean>>({});
  const [branchVerticalOffsets, setBranchVerticalOffsets] = useState<Record<string, number>>({});
  const [activeIndicatorId, setActiveIndicatorId] = useState<string | null>(null);
  const [isBranchIndicatorIdle, setIsBranchIndicatorIdle] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasContentRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const branchIndicatorContainerRef = useRef<HTMLDivElement | null>(null);
  const branchIndicatorIdleTimerRef = useRef<number | null>(null);
  const isPanningRef = useRef(false);
  const focusAnimationFrameRef = useRef<number | null>(null);
  const verticalModeFocusFrameRef = useRef<number | null>(null);
  const focusedTextareaStateRef = useRef<{
    element: HTMLTextAreaElement;
    targetViewportYRatio: number;
  } | null>(null);
  const viewportAlignFrameRef = useRef<number | null>(null);
  const viewportAlignTimeoutIdsRef = useRef<number[]>([]);
  const tempIdRef = useRef(0);
  const [connectorPaths, setConnectorPaths] = useState<ConnectorPath[]>([]);
  const lastPathsRef = useRef<ConnectorPath[]>([]);
  const [pendingBranchAnimationKeys, setPendingBranchAnimationKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [animatedBranchConnectorIds, setAnimatedBranchConnectorIds] = useState<Set<string>>(
    () => new Set()
  );
  const branchConnectorAnimationTimersRef = useRef(new Map<string, number>());
  const branchConnectorAnimationFramesRef = useRef(new Map<string, number>());
  const branchTextareaRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const branchLayoutFrameRef = useRef<number | null>(null);
  const pendingBranchFocusKeyRef = useRef<string | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSentInitialPromptRef = useRef(false);

  const mergeLoadedMessages = useCallback(
    (loadedMessages: ChatMessage[], currentMessages: ChatMessage[]) => {
      const nextMessages = [...loadedMessages];
      const loadedIds = new Set(
        loadedMessages
          .map((message) => message.id)
          .filter((messageId): messageId is string => typeof messageId === "string")
      );

      currentMessages.forEach((message) => {
        if (typeof message.id === "string" && loadedIds.has(message.id)) {
          return;
        }
        nextMessages.push(message);
      });

      return nextMessages;
    },
    []
  );

  const mergeBranchState = useCallback(
    (
      loadedBranchState: Record<string, BranchDraft>,
      currentBranchState: Record<string, BranchDraft>
    ) => {
      const optimisticBranchEntries = Object.entries(currentBranchState).filter(
        ([, branch]) => !branch.hasSubmitted || branch.reply.isLoading
      );

      if (!optimisticBranchEntries.length) {
        return loadedBranchState;
      }

      return {
        ...loadedBranchState,
        ...Object.fromEntries(optimisticBranchEntries),
      };
    },
    []
  );

  const readChatStream = useCallback(
    async (
      response: Response,
      onDelta: (text: string) => void
    ): Promise<{
      payload?: {
        assistantMessage?: ChatMessage;
        quotaStatus?: UsageQuotaStatus;
        userMessage?: ChatMessage;
      };
    }> => {
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
            throw Object.assign(new Error(message), {
              code: typeof parsed.code === "string" ? parsed.code : undefined,
              details: parsed.details,
            });
          }
          if (parsed?.type === "final") {
            return {
              payload: parsed.payload as
                | {
                    assistantMessage?: ChatMessage;
                    quotaStatus?: UsageQuotaStatus;
                    userMessage?: ChatMessage;
                  }
                | undefined,
            };
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
            throw Object.assign(new Error(message), {
              code: typeof parsed.code === "string" ? parsed.code : undefined,
              details: parsed.details,
            });
          }
          if (parsed?.type === "final") {
            return {
              payload: parsed.payload as
                | {
                    assistantMessage?: ChatMessage;
                    quotaStatus?: UsageQuotaStatus;
                    userMessage?: ChatMessage;
                  }
                | undefined,
            };
          }
        }
      }
      return {};
    },
    [t]
  );

  const resolveApiErrorMessage = useCallback(
    (payload: { error?: unknown; code?: unknown }) => {
      const messageKey =
        typeof payload.code === "string" ? getUsageLimitErrorMessageKey(payload.code) : null;
      if (messageKey) {
        return t(messageKey);
      }
      return typeof payload.error === "string" ? payload.error : t("chat.sendFailed");
    },
    [t]
  );

  const isUsageBlocked = quotaStatus.isBlocked;

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
  }, [setMessages]);

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

  const resolveSelectedModelFromMessage = useCallback(
    (message: ChatMessage | null | undefined): SelectedModel | null => {
      if (
        !message?.modelName ||
        !isModelProvider(message.modelProvider ?? undefined)
      ) {
        return null;
      }

      const reasoningEffort: ReasoningEffort | null = isReasoningEffort(
        message.modelReasoningEffort ?? undefined
      )
        ? (message.modelReasoningEffort as ReasoningEffort)
        : null;

      return {
        provider: message.modelProvider as ModelProvider,
        name: message.modelName,
        reasoningEffort,
      };
    },
    []
  );

  useLayoutEffect(() => {
    resetSession(chatId);
    hasAutoSentInitialPromptRef.current = false;
    pendingBranchFocusKeyRef.current = null;
  }, [chatId, resetSession]);

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
      if (viewportAlignFrameRef.current != null) {
        window.cancelAnimationFrame(viewportAlignFrameRef.current);
        viewportAlignFrameRef.current = null;
      }
      if (viewportAlignTimeoutIdsRef.current.length) {
        viewportAlignTimeoutIdsRef.current.forEach((timeoutId) => {
          window.clearTimeout(timeoutId);
        });
        viewportAlignTimeoutIdsRef.current = [];
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
      const safeTargetViewportYRatio = Math.min(Math.max(targetViewportYRatio, 0.1), 0.9);
      const visualViewportTop = window.visualViewport
        ? viewportRect.top + window.visualViewport.offsetTop
        : viewportRect.top;
      const visibleViewportHeight = window.visualViewport
        ? Math.min(viewportRect.height, window.visualViewport.height)
        : viewportRect.height;
      const headerSafeTopPx = 96;
      const bottomSafePaddingPx = 24;
      const availableTop = Math.min(
        visualViewportTop + headerSafeTopPx,
        visualViewportTop + Math.max(visibleViewportHeight - 120, 0)
      );
      const availableBottom = Math.max(
        availableTop + 40,
        visualViewportTop + visibleViewportHeight - bottomSafePaddingPx
      );
      const viewportCenterX = viewportRect.left + viewportRect.width / 2;
      const viewportTargetY =
        availableTop + (availableBottom - availableTop) * safeTargetViewportYRatio;
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

  const alignFocusedTextareaToViewport = useCallback(() => {
    const focused = focusedTextareaStateRef.current;
    if (!focused) {
      return;
    }
    if (document.activeElement !== focused.element) {
      focusedTextareaStateRef.current = null;
      return;
    }
    focusElementToViewportCenter(focused.element, focused.targetViewportYRatio);
  }, [focusElementToViewportCenter]);

  const scheduleFocusedTextareaAlignment = useCallback(() => {
    if (viewportAlignFrameRef.current != null) {
      return;
    }
    viewportAlignFrameRef.current = window.requestAnimationFrame(() => {
      viewportAlignFrameRef.current = null;
      alignFocusedTextareaToViewport();
    });
  }, [alignFocusedTextareaToViewport]);

  const handleTextareaFocus = useCallback(
    (textarea: HTMLTextAreaElement, targetViewportYRatio = 0.58) => {
      focusedTextareaStateRef.current = { element: textarea, targetViewportYRatio };
      focusElementToViewportCenter(textarea, targetViewportYRatio);
      scheduleFocusedTextareaAlignment();
      if (viewportAlignTimeoutIdsRef.current.length) {
        viewportAlignTimeoutIdsRef.current.forEach((timeoutId) => {
          window.clearTimeout(timeoutId);
        });
      }
      viewportAlignTimeoutIdsRef.current = [120, 280].map((delay) =>
        window.setTimeout(() => {
          scheduleFocusedTextareaAlignment();
        }, delay)
      );
    },
    [focusElementToViewportCenter, scheduleFocusedTextareaAlignment]
  );

  const handleTextareaBlur = useCallback((textarea: HTMLTextAreaElement) => {
    if (focusedTextareaStateRef.current?.element === textarea) {
      focusedTextareaStateRef.current = null;
    }
    if (viewportAlignTimeoutIdsRef.current.length) {
      viewportAlignTimeoutIdsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      viewportAlignTimeoutIdsRef.current = [];
    }
  }, []);

  const focusTextareaWithoutBrowserScroll = useCallback(
    (textarea: HTMLTextAreaElement, targetViewportYRatio = 0.58) => {
      textarea.focus({ preventScroll: true });
      handleTextareaFocus(textarea, targetViewportYRatio);
    },
    [handleTextareaFocus]
  );

  useEffect(() => {
    const pendingBranchFocusKey = pendingBranchFocusKeyRef.current;
    if (!pendingBranchFocusKey) {
      return;
    }

    const branch = branches[pendingBranchFocusKey];
    if (!branch || branch.hasSubmitted) {
      pendingBranchFocusKeyRef.current = null;
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(branchVerticalOffsets, pendingBranchFocusKey)) {
      return;
    }

    const textarea = branchTextareaRefs.current.get(pendingBranchFocusKey);
    if (!textarea) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      focusTextareaWithoutBrowserScroll(textarea, 0.66);
      pendingBranchFocusKeyRef.current = null;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [branchVerticalOffsets, branches, focusTextareaWithoutBrowserScroll]);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) {
      return;
    }
    const handleViewportChange = () => {
      scheduleFocusedTextareaAlignment();
    };
    visualViewport.addEventListener("resize", handleViewportChange);
    visualViewport.addEventListener("scroll", handleViewportChange);
    return () => {
      visualViewport.removeEventListener("resize", handleViewportChange);
      visualViewport.removeEventListener("scroll", handleViewportChange);
    };
  }, [scheduleFocusedTextareaAlignment]);

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
        const mergedMessages = mergeLoadedMessages(loadedMessages, useChatSessionStore.getState().messages);
        setMessages(mergedMessages);
        setBranches((currentBranches) =>
          mergeBranchState(buildBranchState(mergedMessages, loadedBranches), currentBranches)
        );
        const latestModel = [...mergedMessages]
          .reverse()
          .find(
            (message) =>
              typeof message.modelName === "string" &&
              isModelProvider(message.modelProvider ?? undefined)
          );
        const nextSelectedModel = resolveSelectedModelFromMessage(latestModel);
        if (nextSelectedModel) {
          setSelectedModel(nextSelectedModel);
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
  }, [
    chatId,
    buildBranchState,
    mergeBranchState,
    mergeLoadedMessages,
    resolveSelectedModelFromMessage,
    setBranches,
    setIsLoading,
    setLoadError,
    setMessages,
    setSelectedModel,
    t,
  ]);

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
    const existingBranch = branches[key];
    if (existingBranch) {
      if (existingBranch.hasSubmitted) {
        return;
      }
      if (pendingBranchFocusKeyRef.current === key) {
        pendingBranchFocusKeyRef.current = null;
      }
      setPendingBranchAnimationKeys((prev) => {
        if (!prev.has(key)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setBranches((prev) => {
        const existing = prev[key];
        if (!existing || existing.hasSubmitted) {
          return prev;
        }
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSendError("");
      return;
    }
    setPendingBranchAnimationKeys((prev) => {
      if (prev.has(key)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    pendingBranchFocusKeyRef.current = key;
    setBranches((prev) => ({
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
    }));
    setSendError("");
  };

  const handleBranchCardExpandChange = useCallback((branchKey: string, isExpanded: boolean) => {
    setExpandedBranchCards((prev) => {
      const current = prev[branchKey] ?? false;
      if (current === isExpanded) {
        return prev;
      }

      if (!isExpanded) {
        if (!(branchKey in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[branchKey];
        return next;
      }

      return {
        ...prev,
        [branchKey]: true,
      };
    });
  }, []);

  const handleSend = useCallback(
    async (
      overridePrompt?: string,
      overrideModel?: SelectedModel | null,
      overrideRequestId?: string
    ) => {
      const trimmed = (overridePrompt ?? promptText).trim();
      if (!trimmed || isSending || isUsageBlocked) return;

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
            requestId: overrideRequestId,
            stream: true,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const quotaDetails = payload?.details?.quotaStatus;
          if (quotaDetails) {
            setQuotaStatus(quotaDetails);
          }
          const errorMessage = resolveApiErrorMessage(payload);
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
        if (payload?.quotaStatus) {
          setQuotaStatus(payload.quotaStatus);
        }
        const nextSelectedModel = resolveSelectedModelFromMessage(payload?.assistantMessage);

        if (nextSelectedModel) {
          setSelectedModel(nextSelectedModel);
        }

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
        const quotaDetails = (error as { details?: { quotaStatus?: UsageQuotaStatus } })?.details
          ?.quotaStatus;
        if (quotaDetails) {
          setQuotaStatus(quotaDetails);
        }
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
      resolveSelectedModelFromMessage,
      setIsSending,
      setMessages,
      setPendingUserId,
      setSelectedModel,
      setSendError,
      selectedModel,
      isUsageBlocked,
      resolveApiErrorMessage,
      setQuotaStatus,
      t,
    ]
  );

  useEffect(() => {
    if (!initialPrompt || hasAutoSentInitialPromptRef.current) {
      return;
    }
    hasAutoSentInitialPromptRef.current = true;
    const timer = window.setTimeout(() => {
      void handleSend(initialPrompt, initialModelSelection, initialRequestId);
      router.replace(`/chats/${chatId}`, { scroll: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [chatId, handleSend, initialModelSelection, initialPrompt, initialRequestId, router]);

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
  const sortedBranches = useMemo(
    () =>
      Object.values(branches)
        .slice()
        .sort((a, b) => {
          if (a.createdAt !== b.createdAt) {
            return a.createdAt - b.createdAt;
          }
          return a.key.localeCompare(b.key);
        }),
    [branches]
  );
  const leftIndicatorNodeId = useMemo(() => {
    const leftBranch = sortedBranches.find((branch) => branch.side === "left");
    return leftBranch ? `branch-${leftBranch.key}` : null;
  }, [sortedBranches]);
  const rightIndicatorNodeId = useMemo(() => {
    const rightBranch = sortedBranches.find((branch) => branch.side === "right");
    return rightBranch ? `branch-${rightBranch.key}` : null;
  }, [sortedBranches]);
  const indicatorItems = useMemo<IndicatorItem[]>(
    () => {
      const hasLeftColumn = leftIndicatorNodeId !== null;
      const hasRightColumn = rightIndicatorNodeId !== null;

      return [
        ...(hasLeftColumn
          ? [
              {
                id: "branch:left",
                kind: "branch" as const,
                nodeId: leftIndicatorNodeId,
                side: "left" as const,
                index: 1,
              },
            ]
          : []),
        {
          id: "main",
          kind: "main" as const,
          nodeId: mainIndicatorNodeId,
          index: hasLeftColumn ? 2 : 1,
        },
        ...(hasRightColumn
          ? [
              {
                id: "branch:right",
                kind: "branch" as const,
                nodeId: rightIndicatorNodeId,
                side: "right" as const,
                index: hasLeftColumn ? 3 : 2,
              },
            ]
          : []),
      ];
    },
    [leftIndicatorNodeId, mainIndicatorNodeId, rightIndicatorNodeId]
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
    (id: string) => (node: HTMLElement | null) => {
      if (!node) {
        nodeRefs.current.delete(id);
        return;
      }
      nodeRefs.current.set(id, node);
    },
    []
  );

  const measureBranchLayout = useCallback(() => {
    const content = canvasContentRef.current;
    if (!content) {
      return {} as Record<string, number>;
    }

    const contentRect = content.getBoundingClientRect();
    const scale = Number.isFinite(state.scale) && state.scale !== 0 ? state.scale : 1;
    const nextOffsets: Record<string, number> = {};
    const sideBottoms: Record<BranchSide, number> = {
      left: Number.NEGATIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
    };

    displayPairs.forEach((pair, index) => {
      const assistantId = pair.assistant?.id;
      if (!assistantId) {
        return;
      }

      const branchesForAssistant = branchesByParent.get(assistantId) ?? [];
      if (!branchesForAssistant.length) {
        return;
      }

      const parentNode = nodeRefs.current.get(`assistant-${assistantId}`);
      if (!parentNode) {
        return;
      }

      const parentRect = parentNode.getBoundingClientRect();
      const parentTop = (parentRect.top - contentRect.top) / scale;
      const parentHeight = parentRect.height / scale;
      const parentBottom = parentTop + parentHeight;
      const nextAssistantId = displayPairs[index + 1]?.assistant?.id ?? null;
      const nextAssistantNode = nextAssistantId
        ? nodeRefs.current.get(`assistant-${nextAssistantId}`)
        : null;
      const nextAssistantHeight = nextAssistantNode
        ? nextAssistantNode.getBoundingClientRect().height / scale
        : null;
      const branchLaneHeight = nextAssistantHeight ?? parentHeight;
      const baseTop = parentBottom + BRANCH_ANCHOR_OFFSET_PX;
      const desiredTop =
        baseTop +
        Math.min(
          BRANCH_MAX_VERTICAL_LEAD_PX,
          Math.max(
            BRANCH_MIN_VERTICAL_LEAD_PX,
            branchLaneHeight * BRANCH_VERTICAL_LEAD_RATIO
          )
        );

      branchesForAssistant.forEach((branch) => {
        const branchNode = nodeRefs.current.get(`branch-${branch.key}`);
        if (!branchNode) {
          return;
        }

        const branchHeight = branchNode.getBoundingClientRect().height / scale;
        const stackedTop = Math.max(
          desiredTop,
          sideBottoms[branch.side] + BRANCH_STACK_GAP_PX
        );

        nextOffsets[branch.key] = stackedTop - baseTop;
        sideBottoms[branch.side] = stackedTop + branchHeight;
      });
    });

    return nextOffsets;
  }, [branchesByParent, displayPairs, state.scale]);

  const scheduleBranchLayoutUpdate = useCallback(() => {
    if (branchLayoutFrameRef.current != null) {
      window.cancelAnimationFrame(branchLayoutFrameRef.current);
    }

    branchLayoutFrameRef.current = window.requestAnimationFrame(() => {
      branchLayoutFrameRef.current = null;
      const nextOffsets = measureBranchLayout();
      setBranchVerticalOffsets((prev) => {
        const prevEntries = Object.entries(prev);
        const nextEntries = Object.entries(nextOffsets);
        if (prevEntries.length === nextEntries.length) {
          const hasChanges = nextEntries.some(([key, value]) => prev[key] !== value);
          if (!hasChanges) {
            return prev;
          }
        }
        return nextOffsets;
      });
    });
  }, [measureBranchLayout]);

  const connectors = useMemo(() => {
    const entries: ConnectorEntry[] = [];

    displayPairs.forEach((pair, index) => {
      if (!pair.user && !pair.assistant) return;
      const assistantId = pair.assistant?.id ?? `assistant-${index}`;

      const nextPair = displayPairs[index + 1];
      if (pair.assistant?.content && nextPair?.user?.content) {
        const nextUserId = nextPair.user?.id ?? `user-${index + 1}`;
        entries.push({
          id: `thread:${assistantId}->${nextUserId}`,
          from: `assistant-${assistantId}`,
          to: `user-${nextUserId}`,
          kind: "thread",
        });
      }
    });

    Object.values(branches).forEach((branch) => {
      entries.push({
        id: `branch:${branch.key}`,
        from: `assistant-${branch.parentMessageId}`,
        to: `branch-${branch.key}`,
        kind: "branch",
        branchKey: branch.key,
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

    const nextPaths = connectors.flatMap((connector): ConnectorPath[] => {
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
      const toY = toTop;
      const fromY = fromTop + fromHeight;

      if (connector.kind === "branch") {
        const horizontalDistance = Math.abs(toX - fromX);
        const verticalDistance = toY - fromY;
        const direction = toX >= fromX ? 1 : -1;
        const desiredLaneY = fromY + 28;
        const laneY = Math.min(desiredLaneY, toY - 8);
        const cornerRadius = Math.max(
          0,
          Math.min(12, horizontalDistance / 2 - 1, laneY - fromY, toY - laneY)
        );

        if (cornerRadius >= 2 && verticalDistance > 10) {
          const startTurnY = laneY - cornerRadius;
          const endTurnY = laneY + cornerRadius;
          const startCurveEndX = fromX + direction * cornerRadius;
          const endCurveStartX = toX - direction * cornerRadius;

          return [
            {
              id: connector.id,
              kind: connector.kind,
              branchKey: connector.branchKey,
              d: `M ${fromX} ${fromY} L ${fromX} ${startTurnY} Q ${fromX} ${laneY} ${startCurveEndX} ${laneY} L ${endCurveStartX} ${laneY} Q ${toX} ${laneY} ${toX} ${endTurnY} L ${toX} ${toY}`,
            },
          ];
        }

        return [
          {
            id: connector.id,
            kind: connector.kind,
            branchKey: connector.branchKey,
            d: `M ${fromX} ${fromY} C ${fromX} ${fromY + 20} ${toX} ${toY - 20} ${toX} ${toY}`,
          },
        ];
      }

      const baseMidY = (fromY + toY) / 2;
      const midY = Math.max(fromY + 8, baseMidY);

      return [
        {
          id: connector.id,
          kind: connector.kind,
          branchKey: connector.branchKey,
          d: `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`,
        },
      ];
    });

    const prevPaths = lastPathsRef.current;
    const pathsChanged =
      prevPaths.length !== nextPaths.length ||
      nextPaths.some((path, index) => {
        const prevPath = prevPaths[index];
        return !prevPath || prevPath.id !== path.id || prevPath.d !== path.d;
      });

    if (pathsChanged) {
      lastPathsRef.current = nextPaths;
      setConnectorPaths(nextPaths);
    }
  }, [connectors, state.scale]);

  useEffect(() => {
    scheduleBranchLayoutUpdate();

    return () => {
      if (branchLayoutFrameRef.current != null) {
        window.cancelAnimationFrame(branchLayoutFrameRef.current);
        branchLayoutFrameRef.current = null;
      }
    };
  }, [scheduleBranchLayoutUpdate]);

  useLayoutEffect(() => {
    updateConnectorPaths();
  }, [branchVerticalOffsets, messages.length, updateConnectorPaths]);

  useEffect(() => {
    const content = canvasContentRef.current;
    if (!content) return;
    const resizeObserver = new ResizeObserver(() => {
      scheduleBranchLayoutUpdate();
      updateConnectorPaths();
    });
    resizeObserver.observe(content);
    nodeRefs.current.forEach((node) => resizeObserver.observe(node));
    const handleWindowResize = () => {
      scheduleBranchLayoutUpdate();
      updateConnectorPaths();
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [branches, displayPairs, scheduleBranchLayoutUpdate, updateConnectorPaths]);

  const triggerConnectorDrawAnimation = useCallback((connectorId: string) => {
    const existingFrame = branchConnectorAnimationFramesRef.current.get(connectorId);
    if (existingFrame != null) {
      window.cancelAnimationFrame(existingFrame);
    }
    setAnimatedBranchConnectorIds((prev) => {
      if (!prev.has(connectorId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(connectorId);
      return next;
    });
    const frame = window.requestAnimationFrame(() => {
      branchConnectorAnimationFramesRef.current.delete(connectorId);
      setAnimatedBranchConnectorIds((prev) => {
        const next = new Set(prev);
        next.add(connectorId);
        return next;
      });
    });
    branchConnectorAnimationFramesRef.current.set(connectorId, frame);

    const existingTimer = branchConnectorAnimationTimersRef.current.get(connectorId);
    if (existingTimer != null) {
      window.clearTimeout(existingTimer);
    }
    const timer = window.setTimeout(() => {
      setAnimatedBranchConnectorIds((prev) => {
        if (!prev.has(connectorId)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(connectorId);
        return next;
      });
      branchConnectorAnimationTimersRef.current.delete(connectorId);
    }, BRANCH_CONNECTOR_DRAW_DURATION_MS);
    branchConnectorAnimationTimersRef.current.set(connectorId, timer);
  }, []);

  useEffect(() => {
    if (connectorPaths.length === 0 || pendingBranchAnimationKeys.size === 0) {
      return;
    }

    const consumedKeys: string[] = [];
    connectorPaths.forEach((connectorPath) => {
      if (connectorPath.kind !== "branch" || !connectorPath.branchKey) {
        return;
      }
      if (!pendingBranchAnimationKeys.has(connectorPath.branchKey)) {
        return;
      }
      triggerConnectorDrawAnimation(connectorPath.id);
      consumedKeys.push(connectorPath.branchKey);
    });
    if (consumedKeys.length === 0) {
      return;
    }
    const consumedKeySet = new Set(consumedKeys);
    const cleanupFrameId = window.requestAnimationFrame(() => {
      setPendingBranchAnimationKeys((prev) => {
        const next = new Set(prev);
        consumedKeySet.forEach((key) => next.delete(key));
        return next;
      });
    });
    return () => {
      window.cancelAnimationFrame(cleanupFrameId);
    };
  }, [connectorPaths, pendingBranchAnimationKeys, triggerConnectorDrawAnimation]);

  useEffect(() => {
    const timerMap = branchConnectorAnimationTimersRef.current;
    const frameMap = branchConnectorAnimationFramesRef.current;
    return () => {
      frameMap.forEach((frame) => {
        window.cancelAnimationFrame(frame);
      });
      frameMap.clear();
      timerMap.forEach((timer) => {
        window.clearTimeout(timer);
      });
      timerMap.clear();
    };
  }, [setBranches]);

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

  const focusNodeHorizontally = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) {
        return;
      }
      const viewport = canvasContainerRef.current;
      const targetNode = nodeRefs.current.get(nodeId);
      if (!viewport || !targetNode) {
        return;
      }
      const viewportRect = viewport.getBoundingClientRect();
      const nodeRect = targetNode.getBoundingClientRect();
      const viewportCenterX = viewportRect.left + viewportRect.width / 2;
      const nodeCenterX = nodeRect.left + nodeRect.width / 2;
      const currentState = latestCanvasStateRef.current;
      animateCanvasOffset(
        currentState.offsetX + (viewportCenterX - nodeCenterX),
        currentState.offsetY
      );
    },
    [animateCanvasOffset]
  );

  const focusIndicatorItem = useCallback(
    (item: IndicatorItem) => {
      if (item.kind === "main" && !isVerticalMode) {
        focusNodeToViewportCenter(item.nodeId);
        return;
      }
      focusNodeHorizontally(item.nodeId);
    },
    [focusNodeHorizontally, focusNodeToViewportCenter, isVerticalMode]
  );

  const handleIndicatorSelect = useCallback(
    (item: IndicatorItem) => {
      setActiveIndicatorId(item.id);
      focusIndicatorItem(item);
    },
    [focusIndicatorItem]
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
      const branch = branches[branchKey];
      if (!branch) {
        return;
      }
      setActiveIndicatorId(`branch:${branch.side}`);
      if (isVerticalMode) {
        focusNodeHorizontally(`branch-${branchKey}`);
        return;
      }
      focusNodeToViewportCenter(`branch-${branchKey}`);
    },
    [branches, focusNodeHorizontally, focusNodeToViewportCenter, isVerticalMode]
  );

  const focusMainLatest = useCallback(() => {
    if (!mainIndicatorNodeId) {
      return;
    }
    setActiveIndicatorId("main");
    if (isVerticalMode) {
      focusNodeHorizontally(mainIndicatorNodeId);
      return;
    }
    focusNodeToViewportCenter(mainIndicatorNodeId);
  }, [focusNodeHorizontally, focusNodeToViewportCenter, isVerticalMode, mainIndicatorNodeId]);

  const findNearestIndicator = useCallback(() => {
    const viewport = canvasContainerRef.current;
    if (!viewport) return null;

    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenterX = viewportRect.left + viewportRect.width / 2;
    const viewportCenterY = viewportRect.top + viewportRect.height / 2;

    let nearestItem: IndicatorItem | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const item of indicatorItems) {
      if (!item.nodeId) {
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
        item.kind === "main"
          ? (nodeCenterX - viewportCenterX) * (nodeCenterX - viewportCenterX) +
            (nodeCenterY - viewportCenterY) * (nodeCenterY - viewportCenterY)
          : (nodeCenterX - viewportCenterX) * (nodeCenterX - viewportCenterX);

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
      const nearestIndicator = findNearestIndicator();
      if (!nearestIndicator) {
        return;
      }
      setActiveIndicatorId(nearestIndicator.id);
      focusNodeHorizontally(nearestIndicator.nodeId);
    });
  }, [findNearestIndicator, focusNodeHorizontally, isVerticalMode]);

  const handleBranchSend = async (branchKey: string) => {
    if (isUsageBlocked) {
      return;
    }
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
        const quotaDetails = payload?.details?.quotaStatus;
        if (quotaDetails) {
          setQuotaStatus(quotaDetails);
        }
        const errorMessage = resolveApiErrorMessage(payload);
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
      if (payload?.quotaStatus) {
        setQuotaStatus(payload.quotaStatus);
      }
      const nextSelectedModel = resolveSelectedModelFromMessage(payload?.assistantMessage);

      if (nextSelectedModel) {
        setSelectedModel(nextSelectedModel);
      }

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
      const quotaDetails = (error as { details?: { quotaStatus?: UsageQuotaStatus } })?.details
        ?.quotaStatus;
      if (quotaDetails) {
        setQuotaStatus(quotaDetails);
      }
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
  }, [setBranches]);

  const focusMainPromptInput = useCallback(() => {
    const textarea = promptTextareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.focus({ preventScroll: true });
  }, []);

  const promptInput = (
    <div
      className="relative z-0 w-full max-w-3xl"
      data-prevent-viewport-jump="true"
    >
      <div className="grid gap-3">
        <UsageQuotaNotice quotaStatus={quotaStatus} showUsageDetails={false} />
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
            onPointerDown={(event) => {
              focusTextareaWithoutBrowserScroll(event.currentTarget, 0.72);
            }}
            onChange={(event) => {
              closeOpenBranchesForAssistant(latestAssistantId);
              const nextValue = event.currentTarget.value;
              setPromptText(nextValue);
              resizeTextarea(event.currentTarget);
            }}
            onFocus={(event) => {
              closeOpenBranchesForAssistant(latestAssistantId);
              handleTextareaFocus(event.currentTarget, 0.72);
            }}
            onBlur={(event) => {
              handleTextareaBlur(event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                if (!promptText.trim() || isSending || isUsageBlocked) {
                  event.preventDefault();
                  return;
                }
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder={t("prompt.placeholder")}
            rows={1}
            disabled={isUsageBlocked}
            className="w-full resize-none rounded-xl border border-(--color-border-muted) bg-(--color-surface) px-4 py-3 text-base leading-6 text-main shadow-(--color-shadow-soft) transition-[height] duration-150 ease-out focus:border-(--color-border-soft) focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="Send prompt"
            disabled={!promptText.trim() || isSending || isUsageBlocked}
            className="flex h-11 w-11 self-end items-center justify-center rounded-lg bg-theme-main text-main transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </div>
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
        className="absolute left-0 right-0 top-full z-0 h-100 translate-y-2 rounded-2xl bg-transparent"
      />
    </div>
  );

  const connectorsOverlay = (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {connectorPaths.map((connectorPath) => {
        const isPendingBranchConnector =
          connectorPath.kind === "branch" &&
          connectorPath.branchKey !== undefined &&
          pendingBranchAnimationKeys.has(connectorPath.branchKey);
        const connectorClassName =
          [
            isPendingBranchConnector ? "branch-connector-pending" : "",
            animatedBranchConnectorIds.has(connectorPath.id)
              ? "branch-connector-draw"
              : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined;
        return (
          <path
            key={connectorPath.id}
            className={connectorClassName}
            d={connectorPath.d}
            fill="none"
            stroke={
              connectorPath.kind === "branch"
                ? "var(--color-connector-branch)"
                : "var(--color-connector)"
            }
            strokeWidth={connectorPath.kind === "branch" ? 1.25 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
          />
        );
      })}
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
    <div className="min-h-screen bg-(--color-app-bg) text-main">
      <DisableCanvasNavigation />
      <CanvasControls
        scale={state.scale}
        isVerticalMode={isVerticalMode}
        onToggleVerticalMode={handleToggleVerticalMode}
      />
      <div className="fixed left-0 right-0 top-0 z-40">
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
          className={`pointer-events-none fixed inset-x-0 bottom-20 z-45 flex justify-center px-4 transition-opacity duration-300 ${
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
                if (!isVerticalMode) {
                  return;
                }
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
                const shouldShowInlinePromptInput = isLast && promptInputEnabled;
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
                      <div className="-mt-8 mb- flex items-center gap-3">
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
                            <Plus className="h-3 w-3" aria-hidden="true" />
                            <span>{t("chat.newBranch")}</span>
                          </button>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="branch-pill invisible pointer-events-none"
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                            <span>{t("chat.newBranch")}</span>
                          </span>
                        )}
                        <div
                          aria-hidden="true"
                          className="mt-6 h-10 w-px bg-(--color-connector)"
                        />
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
                            <Plus className="h-3 w-3" aria-hidden="true" />
                            <span>{t("chat.newBranch")}</span>
                          </button>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="branch-pill invisible pointer-events-none"
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                            <span>{t("chat.newBranch")}</span>
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
                        showPromptInput={shouldShowInlinePromptInput}
                        showAllBranchPills={shouldShowInlinePromptInput}
                        hiddenBranchSides={isLast ? hiddenBranchSides : undefined}
                        promptInput={shouldShowInlinePromptInput ? promptInput : null}
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
                            const branchVerticalOffset =
                              branchVerticalOffsets[branch.key] ?? 0;
                            const isBranchLayoutReady =
                              branch.hasSubmitted ||
                              Object.prototype.hasOwnProperty.call(
                                branchVerticalOffsets,
                                branch.key
                              );
                            const branchTransform =
                              branch.side === "left"
                                ? `translate(calc(-100% - ${branchShift}), ${branchVerticalOffset}px)`
                                : `translate(${branchShift}, ${branchVerticalOffset}px)`;
                            const showBranchReply =
                              !!branch.reply.assistantMessage ||
                              !!branch.reply.error ||
                              branch.reply.isLoading;

                            return (
                              <div
                                key={branch.key}
                                ref={setNodeRef(`branch-${branch.key}`)}
                                data-branch-region="true"
                                className={`absolute left-0 top-0 ${
                                  expandedBranchCards[branch.key] ? "z-20" : "z-0"
                                } ${
                                  isBranchLayoutReady ? "" : "invisible pointer-events-none"
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (event.metaKey || event.ctrlKey) {
                                    return;
                                  }
                                  if (!isVerticalMode) {
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
                                {isVerticalMode ? (
                                  <button
                                    type="button"
                                    aria-label={t("chat.branchList")}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      focusBranchByKey(branch.key);
                                    }}
                                    className="absolute -inset-x-6 -inset-y-4 z-0 block cursor-pointer rounded-[28px] bg-transparent"
                                  />
                                ) : null}
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
                                        focusTextareaWithoutBrowserScroll(event.currentTarget, 0.66);
                                      }}
                                      onFocus={(event) => {
                                        handleTextareaFocus(event.currentTarget, 0.66);
                                      }}
                                      onBlur={(event) => {
                                        handleTextareaBlur(event.currentTarget);
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.nativeEvent.isComposing) return;
                                        if (
                                          event.key === "Enter" &&
                                          (event.metaKey || event.ctrlKey)
                                        ) {
                                          if (
                                            !branch.text.trim() ||
                                            branch.reply.isLoading ||
                                            isUsageBlocked
                                          ) {
                                            event.preventDefault();
                                            return;
                                          }
                                          event.preventDefault();
                                          handleBranchSend(branch.key);
                                        }
                                      }}
                                      placeholder={t("prompt.placeholder")}
                                      rows={1}
                                      disabled={isUsageBlocked}
                                      className="w-full resize-none rounded-xl border border-(--color-border-muted) bg-(--color-surface) px-4 py-2 text-sm leading-5 text-main shadow-(--color-shadow-soft) transition-[height] duration-150 ease-out focus:border-(--color-border-soft) focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                    <button
                                      type="submit"
                                      aria-label="Send branch prompt"
                                      disabled={
                                        !branch.text.trim() ||
                                        branch.reply.isLoading ||
                                        isUsageBlocked
                                      }
                                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-theme-main text-main transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82] disabled:cursor-not-allowed disabled:opacity-60"
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
                                      scrollBody
                                      canToggleExpand
                                      modelProvider={branch.reply.assistantMessage?.modelProvider}
                                      modelName={branch.reply.assistantMessage?.modelName}
                                      modelReasoningEffort={
                                        branch.reply.assistantMessage?.modelReasoningEffort
                                      }
                                      showPromptInput={false}
                                      onExpandChange={(isExpanded) => {
                                        handleBranchCardExpandChange(branch.key, isExpanded);
                                      }}
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
