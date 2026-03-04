"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"

type SortOrder = "newest" | "oldest"

type SortOption = {
  label: string
  value: SortOrder
}

type ChatSortSelectProps = {
  value: SortOrder
  onChange: (value: SortOrder) => void
}

export function ChatSortSelect({ value, onChange }: ChatSortSelectProps) {
  const { t } = useI18n()
  const sortOptions: SortOption[] = [
    { label: t("sort.newest"), value: "newest" },
    { label: t("sort.oldest"), value: "oldest" },
  ]
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const selectedOption = sortOptions.find((option) => option.value === value) ?? sortOptions[0]

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false)
      }
    }

    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative" ref={pickerRef}>
      <span className="sr-only">{t("sort.label")}</span>
      <button
        type="button"
        onClick={() => setPickerOpen((prev) => !prev)}
        aria-expanded={pickerOpen}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-main shadow-[var(--color-shadow-soft)] transition hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
      >
        {selectedOption.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {pickerOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-10 w-36 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-2 shadow-[var(--color-shadow-card)]"
        >
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setPickerOpen(false)
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-main transition hover:bg-[var(--color-surface-soft)]"
            >
              {option.label}
              {value === option.value && <Check className="h-3.5 w-3.5 text-main" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
