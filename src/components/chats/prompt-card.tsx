"use client"

import Image from "next/image"
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { ArrowRight, Check, ChevronDown } from "lucide-react"
import { MODEL_OPTIONS, type ModelOption } from "@/lib/model-catalog"

type PromptCardActionState = {
  error?: string
}

type PromptCardProps = {
  action: (state: PromptCardActionState, formData: FormData) => Promise<PromptCardActionState>
}

const TAGLINES = [
  "思考を止めたくないんじゃないですか？",
  "今のひらめきを枝分かれさせよう。",
  "話題が広がるほど、整理は美しくなる。",
  "気になる分岐点を、今ここで。",
  "考えの地図を一緒に広げよう。",
]

export function PromptCard({ action }: PromptCardProps) {
  const [state, formAction] = useActionState(action, { error: "" })
  const [model, setModel] = useState<ModelOption>(MODEL_OPTIONS[0])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const taglineId = useId()
  const pickerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const tagline = useMemo(() => {
    let hash = 0
    for (let i = 0; i < taglineId.length; i += 1) {
      hash = (hash + taglineId.charCodeAt(i)) % TAGLINES.length
    }
    return TAGLINES[hash]
  }, [taglineId])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      if (!pickerRef.current?.contains(target)) {
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
    <div className="w-full">
      <div className="my-6 flex flex-col items-center">
        <Image
          src="/icons/Branch-logo.svg"
          alt="Branch logo"
          width={160}
          height={160}
          className="mb-3 h-20 w-20 md:h-28 md:w-28"
        />
        <p className="text-center text-xl font-semibold text-main md:text-2xl">{tagline}</p>
      </div>
      <form
        action={formAction}
        onSubmit={handleSubmit}
        className={`flex items-end gap-4 rounded-[32px] border ${isInputFocused ? "border-[#f1d0c7]" : "border-transparent"} bg-white px-5 py-4 shadow-[0_8px_30px_rgba(249,220,209,0.4)]`}
      >
        <div className="flex flex-1 flex-col gap-5">
          <textarea
            ref={textareaRef}
            name="prompt"
            placeholder="なんでも聞いてみましょう"
            rows={1}
            value={prompt}
            onInput={(event) => handleTextareaInput(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            className="w-full resize-none bg-transparent text-lg font-normal text-main placeholder:text-main-muted focus:outline-none"
          />
          <div className="relative" ref={pickerRef}>
            <input type="hidden" name="modelProvider" value={model.provider} />
            <input type="hidden" name="modelName" value={model.model} />
            <input
              type="hidden"
              name="modelReasoningEffort"
              value={model.reasoningEffort ?? ""}
            />
            <button
              type="button"
              onClick={() => setPickerOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full bg-theme-main px-3 py-1.5 text-xs font-semibold text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7da82]"
            >
              {model.label}
              <ChevronDown className="h-3 w-3" />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-10 w-56 rounded-2xl border border-[#f1d0c7] bg-white p-2 shadow-lg">
                {MODEL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setModel(option)
                      setPickerOpen(false)
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-main transition hover:bg-[#fbf7f3]"
                  >
                    {option.label}
                    {model.id === option.id && <Check className="h-3.5 w-3.5 text-main" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {state.error ? (
            <p className="text-sm text-red-500" role="status">
              {state.error}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          aria-label="Start a new chat"
          disabled={!prompt.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-theme-main text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82]"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
