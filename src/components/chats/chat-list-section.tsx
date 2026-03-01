"use client"

import { useState } from "react"
import { ChatList } from "@/components/chats/chat-list"
import { ChatSortSelect } from "@/components/chats/chat-sort-select"
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <p className="font-semibold text-2xl">{t("chats.recent")}</p>
        <ChatSortSelect value={sortOrder} onChange={setSortOrder} />
      </div>
      <ChatList initialChats={initialChats} sortOrder={sortOrder} />
    </div>
  )
}
