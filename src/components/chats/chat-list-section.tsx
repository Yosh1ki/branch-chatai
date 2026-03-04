"use client"

import { useState } from "react"
import { ChatList } from "@/components/chats/chat-list"
import { ChatSortSelect } from "@/components/chats/chat-sort-select"
import { ChatViewModeToggle, type ChatViewMode } from "@/components/chats/chat-view-mode-toggle"
import { useI18n } from "@/components/i18n/i18n-provider"

type SortOrder = "newest" | "oldest"

type ChatSummary = {
  id: string
  title: string
  updatedAt?: string | null
  branchCount: number
}

type ChatListSectionProps = {
  initialChats: ChatSummary[]
}

export function ChatListSection({ initialChats }: ChatListSectionProps) {
  const { t } = useI18n()
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [viewMode, setViewMode] = useState<ChatViewMode>("detail")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-semibold text-2xl">{t("chats.recent")}</p>
        <div className="flex items-center gap-2">
          <ChatSortSelect value={sortOrder} onChange={setSortOrder} />
          <ChatViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>
      <ChatList initialChats={initialChats} sortOrder={sortOrder} viewMode={viewMode} />
    </div>
  )
}
