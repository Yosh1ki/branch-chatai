"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

type SortOrder = "newest" | "oldest"

type SortOption = {
  label: string
  value: SortOrder
}

const SORT_OPTIONS: SortOption[] = [
  { label: "新しい順", value: "newest" },
  { label: "古い順", value: "oldest" },
]

type ChatSortSelectProps = {
  value: SortOrder
  onChange: (value: SortOrder) => void
}

export function ChatSortSelect({ value, onChange }: ChatSortSelectProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const selectedOption = SORT_OPTIONS.find((option) => option.value === value) ?? SORT_OPTIONS[0]

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
      <span className="sr-only">並び順</span>
      <button
        type="button"
        onClick={() => setPickerOpen((prev) => !prev)}
        aria-expanded={pickerOpen}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-2 rounded-full border border-[#E2E2E2] px-3 py-1.5 text-xs font-semibold text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7da82]"
      >
        {selectedOption.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {pickerOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-10 w-36 rounded-2xl border border-[#f1d0c7] bg-white p-2 shadow-lg"
        >
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setPickerOpen(false)
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-main transition hover:bg-[#fbf7f3]"
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
