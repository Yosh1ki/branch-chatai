"use client"

import { LayoutGrid, List } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"

export type ChatViewMode = "detail" | "list"

type ChatViewModeToggleProps = {
  value: ChatViewMode
  onChange: (value: ChatViewMode) => void
}

export function ChatViewModeToggle({ value, onChange }: ChatViewModeToggleProps) {
  const { t } = useI18n()

  return (
    <div className="grid h-9 min-w-[6.5rem] grid-cols-2 gap-1 rounded-full border border-(--color-border-soft) bg-(--color-surface) p-1 shadow-(--color-shadow-soft)">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label={t("chats.viewList")}
        title={t("chats.viewList")}
        aria-pressed={value === "list"}
        className={`inline-flex h-7 w-full items-center justify-center rounded-full text-main-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) ${
          value === "list"
            ? "bg-(--color-surface-soft) text-main"
            : "hover:bg-(--color-surface-soft)"
        }`}
      >
        <List className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onChange("detail")}
        aria-label={t("chats.viewDetail")}
        title={t("chats.viewDetail")}
        aria-pressed={value === "detail"}
        className={`inline-flex h-7 w-full items-center justify-center rounded-full text-main-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) ${
          value === "detail"
            ? "bg-(--color-surface-soft) text-main"
            : "hover:bg-(--color-surface-soft)"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}
