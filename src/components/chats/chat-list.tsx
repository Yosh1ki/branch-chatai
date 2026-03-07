"use client"

import { useEffect, useMemo, useState, type MouseEvent } from "react"
import Link from "next/link"
import { MessageSquare, MoreHorizontal, Trash2, X } from "lucide-react"
import { sortChatsByUpdatedAt } from "@/lib/chat-sort"
import type { ChatViewMode } from "@/components/chats/chat-view-mode-toggle"
import { useI18n } from "@/components/i18n/i18n-provider"

type ChatSummary = {
  id: string
  title: string
  updatedAt?: string | null
  branchCount: number
}

type SortOrder = "newest" | "oldest"

type ChatListProps = {
  initialChats: ChatSummary[]
  sortOrder: SortOrder
  viewMode: ChatViewMode
}

const DETAIL_PAGE_SIZE = 12
const LIST_PAGE_SIZE = 36

export function ChatList({ initialChats, sortOrder, viewMode }: ChatListProps) {
  const { locale, t } = useI18n()
  const [chats, setChats] = useState<ChatSummary[]>(initialChats)
  const [visibleCount, setVisibleCount] = useState(DETAIL_PAGE_SIZE)
  const pageSize = viewMode === "list" ? LIST_PAGE_SIZE : DETAIL_PAGE_SIZE
  const sortedChats = useMemo(() => sortChatsByUpdatedAt(chats, sortOrder), [chats, sortOrder])
  const visibleChats = useMemo(
    () => sortedChats.slice(0, visibleCount),
    [sortedChats, visibleCount]
  )

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [pageSize])

  const handleDeleted = (id: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== id))
  }

  if (sortedChats.length === 0) {
    return <p className="text-center text-xl text-main-lite">No any chats. Let&apos;s grow branch!</p>
  }

  return (
    <div className="space-y-4">
      <div
        className={
          viewMode === "detail"
            ? "grid gap-5 md:grid-cols-2"
            : "overflow-hidden rounded-2xl border border-(--color-border-soft) bg-(--color-surface) shadow-(--color-shadow-soft)"
        }
      >
        {visibleChats.map((chat) => (
          <ChatCard
            key={chat.id}
            chat={chat}
            onDeleted={handleDeleted}
            locale={locale}
            viewMode={viewMode}
          />
        ))}
      </div>
      {visibleChats.length < sortedChats.length ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + pageSize)}
            className="rounded-full border border-(--color-border-soft) px-4 py-2 text-sm font-semibold text-main transition hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
          >
            {t("chats.showMore")}
          </button>
        </div>
      ) : null}
    </div>
  )
}

type ChatCardProps = {
  chat: ChatSummary
  onDeleted: (id: string) => void
  locale: "ja" | "en"
  viewMode: ChatViewMode
}

function ChatCard({ chat, onDeleted, locale, viewMode }: ChatCardProps) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const branchCount = chat.branchCount ?? 0
  const updatedAtLabel = useMemo(() => {
    if (!chat.updatedAt) {
      return t("chats.updatedAtUnknown")
    }
    const timestamp = new Date(chat.updatedAt)
    if (Number.isNaN(timestamp.getTime())) {
      return t("chats.updatedAtUnknown")
    }
    return timestamp.toLocaleDateString(locale === "en" ? "en-US" : "ja-JP", {
      timeZone: "Asia/Tokyo",
    })
  }, [chat.updatedAt, locale, t])

  const toggleMenu = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setMenuOpen((prev) => !prev)
  }

  const openConfirm = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setMenuOpen(false)
    setConfirmOpen(true)
  }

  const closeConfirm = () => {
    setConfirmOpen(false)
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/chats/${chat.id}`, {
        method: "DELETE",
      })

      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete chat")
      }

      onDeleted(chat.id)
      setConfirmOpen(false)
    } catch (error) {
      console.error(error)
      alert(t("chats.deleteFailed"))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Link
        href={`/chats/${chat.id}`}
        className={`group relative block transition ${
          viewMode === "detail"
            ? "rounded-3xl border border-(--color-border-muted) bg-(--color-surface) p-6 shadow-(--color-shadow-card) hover:-translate-y-1"
            : "border-b border-(--color-border-muted) px-4 py-3 last:border-b-0 hover:bg-(--color-surface-soft)"
        }`}
      >
        {viewMode === "detail" ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold leading-tight">{chat.title}</div>
              <p className="mt-1 text-sm text-main-muted">{updatedAtLabel}</p>
            </div>
            <div className="relative" onMouseLeave={() => setMenuOpen(false)}>
              <button
                type="button"
                aria-label="Open chat actions"
                onClick={toggleMenu}
                className="rounded-md p-2 text-main-muted transition hover:bg-(--color-surface-soft)"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-0 z-20 w-40 rounded-2xl border border-(--color-border-soft) bg-(--color-surface) p-2 shadow-(--color-shadow-card)">
                  <button
                    type="button"
                    onClick={openConfirm}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#e56b6f] transition hover:bg-(--color-surface-soft)"
                  >
                    <Trash2 className="h-4 w-4 text-[#e56b6f]" />
                    {t("chats.deleteAction")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-main">{chat.title}</p>
            <p className="shrink-0 text-xs text-main-muted tabular-nums">{updatedAtLabel}</p>
          </div>
        )}

        {viewMode === "detail" ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-main-lite">
            <MessageSquare className="h-4 w-4" />
            {branchCount} {branchCount === 1 ? "branch" : "branches"}
          </div>
        ) : null}
      </Link>

      {confirmOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-(--color-border-soft) bg-(--color-surface) p-5 shadow-(--color-shadow-card)">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-main">{t("chats.deleteConfirmTitle")}</h2>
                <p className="mt-1 text-sm text-main-muted">{t("chats.deleteConfirmDescription")}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeConfirm}
                className="rounded-full p-1 text-main-muted transition hover:bg-(--color-surface-soft)"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-full border border-(--color-border-soft) px-3 py-2 text-sm font-semibold text-main transition hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                disabled={isDeleting}
              >
                {t("chats.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-full bg-[#e56b6f] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                disabled={isDeleting}
              >
                {isDeleting ? t("chats.deleting") : t("chats.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
