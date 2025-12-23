"use client"

import { useState, type MouseEvent } from "react"
import Link from "next/link"
import { MoreVertical, MessageSquare, Trash2, X } from "lucide-react"

type ChatSummary = {
  id: string
  title: string
  updatedAt: string
  branchCount: number
}

type ChatListProps = {
  initialChats: ChatSummary[]
}

export function ChatList({ initialChats }: ChatListProps) {
  const [chats, setChats] = useState<ChatSummary[]>(initialChats)

  const handleDeleted = (id: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== id))
  }

  if (chats.length === 0) {
    return <p className="text-center text-xl text-main-lite">No any chats. Let&apos;s grow branch!</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-5 md:grid-cols-2">
        {chats.map((chat) => (
          <ChatCard key={chat.id} chat={chat} onDeleted={handleDeleted} />
        ))}
      </div>
    </div>
  )
}

type ChatCardProps = {
  chat: ChatSummary
  onDeleted: (id: string) => void
}

function ChatCard({ chat, onDeleted }: ChatCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const branchCount = chat.branchCount ?? 0

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
      alert("チャットの削除に失敗しました。時間をおいて再度お試しください。")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Link
        href={`/chats/${chat.id}`}
        className="relative rounded-[24px] bg-white/90 p-6 shadow-[0_10px_40px_rgba(68,41,33,0.08)] transition hover:-translate-y-1"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold leading-tight">{chat.title}</div>
            <p className="mt-1 text-sm text-main-muted">
              {new Date(chat.updatedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
            </p>
          </div>
          <div className="relative" onMouseLeave={() => setMenuOpen(false)}>
            <button
              type="button"
              aria-label="Open chat actions"
              onClick={toggleMenu}
              className="rounded-md p-2 text-main-muted transition hover:bg-[#f6ece7]"
            >
              <MoreVertical className="h-5 w-5" aria-hidden />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-0 z-20 w-40 rounded-2xl border border-[#f1d0c7] bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={openConfirm}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#e56b6f] transition hover:bg-[#fbf7f3]"
                >
                  <Trash2 className="h-4 w-4 text-[#e56b6f]" />
                  削除する
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-main-lite">
          <MessageSquare className="h-4 w-4" />
          {branchCount} {branchCount === 1 ? "branch" : "branches"}
        </div>
      </Link>

      {confirmOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-main">チャットを削除しますか？</h2>
                <p className="mt-1 text-sm text-main-muted">この操作は取り消せません。</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeConfirm}
                className="rounded-full p-1 text-main-muted transition hover:bg-[#f6ece7]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-full border border-[#f1d0c7] px-3 py-2 text-sm font-semibold text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1d0c7]"
                disabled={isDeleting}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-full bg-[#e56b6f] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b5a2]"
                disabled={isDeleting}
              >
                {isDeleting ? "削除中..." : "削除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
