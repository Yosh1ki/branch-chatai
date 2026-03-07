import { create } from "zustand";
import type { ModelProvider, ReasoningEffort } from "@/lib/model-catalog";

export type BranchSide = "left" | "right";

export type ChatMessage = {
  id?: string;
  role: string;
  content: string;
  parentMessageId?: string | null;
  branchId?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  modelReasoningEffort?: string | null;
};

export type BranchReply = {
  isLoading: boolean;
  error: string;
  assistantMessage: ChatMessage | null;
};

export type BranchDraft = {
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

export type SelectedModel = {
  provider: ModelProvider;
  name: string;
  reasoningEffort?: ReasoningEffort | null;
};

type Updater<T> = T | ((current: T) => T);

type ChatSessionState = {
  chatId: string | null;
  messages: ChatMessage[];
  selectedModel: SelectedModel | null;
  isSending: boolean;
  sendError: string;
  isLoading: boolean;
  loadError: string;
  pendingUserId: string | null;
  branches: Record<string, BranchDraft>;
};

type ChatSessionActions = {
  resetSession: (chatId: string) => void;
  setMessages: (updater: Updater<ChatMessage[]>) => void;
  setSelectedModel: (updater: Updater<SelectedModel | null>) => void;
  setIsSending: (isSending: boolean) => void;
  setSendError: (sendError: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setLoadError: (loadError: string) => void;
  setPendingUserId: (pendingUserId: string | null) => void;
  setBranches: (updater: Updater<Record<string, BranchDraft>>) => void;
};

export type ChatSessionStore = ChatSessionState & ChatSessionActions;

const resolveUpdater = <T>(current: T, updater: Updater<T>) =>
  typeof updater === "function"
    ? (updater as (current: T) => T)(current)
    : updater;

const createInitialSessionState = (chatId: string | null): ChatSessionState => ({
  chatId,
  messages: [],
  selectedModel: null,
  isSending: false,
  sendError: "",
  isLoading: true,
  loadError: "",
  pendingUserId: null,
  branches: {},
});

export const useChatSessionStore = create<ChatSessionStore>((set) => ({
  ...createInitialSessionState(null),
  resetSession: (chatId) => {
    set(createInitialSessionState(chatId));
  },
  setMessages: (updater) => {
    set((state) => ({ messages: resolveUpdater(state.messages, updater) }));
  },
  setSelectedModel: (updater) => {
    set((state) => ({ selectedModel: resolveUpdater(state.selectedModel, updater) }));
  },
  setIsSending: (isSending) => {
    set({ isSending });
  },
  setSendError: (sendError) => {
    set({ sendError });
  },
  setIsLoading: (isLoading) => {
    set({ isLoading });
  },
  setLoadError: (loadError) => {
    set({ loadError });
  },
  setPendingUserId: (pendingUserId) => {
    set({ pendingUserId });
  },
  setBranches: (updater) => {
    set((state) => ({ branches: resolveUpdater(state.branches, updater) }));
  },
}));
