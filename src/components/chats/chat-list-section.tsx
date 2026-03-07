"use client"

import { useState } from "react"
import { ChatList } from "@/components/chats/chat-list"
import { ChatSortSelect } from "@/components/chats/chat-sort-select"
import { ChatViewModeToggle, type ChatViewMode } from "@/components/chats/chat-view-mode-toggle"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

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
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-semibold text-2xl">{t("chats.recent")}</p>
        <div className="flex items-center gap-2">
          <ChatSortSelect value={sortOrder} onChange={setSortOrder} />
          <ChatViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
        <div className="relative min-w-56 flex-1 rounded-full border border-(--color-border-soft) bg-(--color-surface) sm:ml-auto sm:max-w-xs sm:flex-none">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-main-muted"
            aria-hidden
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("chats.searchPlaceholder")}
            aria-label={t("chats.searchPlaceholder")}
            className="h-9 rounded-full border-transparent bg-transparent pl-9 text-sm text-main shadow-none placeholder:text-main-muted focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
      </div>
      <ChatList
        key={`${viewMode}:${searchQuery.trim()}`}
        initialChats={initialChats}
        sortOrder={sortOrder}
        viewMode={viewMode}
        searchQuery={searchQuery}
      />
    </div>
  )
}
