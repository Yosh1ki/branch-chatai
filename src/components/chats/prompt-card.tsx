"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { ArrowRight, Check, ChevronDown } from "lucide-react"

type PromptCardProps = {
  action: (formData: FormData) => Promise<void>
}

const MODELS = [
  { label: "ChatGPT 5.2 Thinking", value: "gpt-5.2-thinking" },
  { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet" },
  { label: "Gemini 3 Pro", value: "gemini-3-pro" },
]

export function PromptCard({ action }: PromptCardProps) {
  const [model, setModel] = useState(MODELS[0])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false)
      }
    }

    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleTextareaInput = (value: string) => {
    setPrompt(value)
    if (!textareaRef.current) return
    textareaRef.current.style.height = "auto"
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!prompt.trim()) {
      event.preventDefault()
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !prompt.trim()) {
      event.preventDefault()
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <form
        action={action}
        onSubmit={handleSubmit}
        className={`flex items-end gap-4 rounded-[32px] border ${isInputFocused ? "border-[#f1d0c7]" : "border-transparent"} bg-white px-5 py-4 shadow-[0_8px_30px_rgba(249,220,209,0.4)]`}
      >
        <div className="flex flex-1 flex-col gap-5">
          <textarea
            ref={textareaRef}
            name="prompt"
            placeholder="Branchを育てる"
            rows={1}
            value={prompt}
            onInput={(event) => handleTextareaInput(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            className="w-full resize-none bg-transparent text-lg font-normal text-main placeholder:text-main-muted focus:outline-none"
          />
          <div className="relative" ref={pickerRef}>
            <input type="hidden" name="model" value={model.value} />
            <button
              type="button"
              onClick={() => setPickerOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full bg-[#e4f3d4] px-3 py-1.5 text-xs font-semibold text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7da82]"
            >
              {model.label}
              <ChevronDown className="h-3 w-3" />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-10 w-52 rounded-2xl border border-[#f1d0c7] bg-white p-2 shadow-lg">
                {MODELS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setModel(option)
                      setPickerOpen(false)
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-main transition hover:bg-[#fbf7f3]"
                  >
                    {option.label}
                    {model.value === option.value && <Check className="h-3.5 w-3.5 text-main" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          type="submit"
          aria-label="Start a new chat"
          disabled={!prompt.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-main text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82]"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
