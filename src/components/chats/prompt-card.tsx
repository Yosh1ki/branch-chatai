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
import { UpgradeButton } from "@/components/billing/upgrade-button"
import {
  MODEL_OPTIONS,
  isModelOptionAvailableForPlan,
  normalizePlanTier,
  type ModelOption,
} from "@/lib/model-catalog"
import { useI18n } from "@/components/i18n/i18n-provider"

type PromptCardActionState = {
  error?: string
}

type PromptCardProps = {
  action: (state: PromptCardActionState, formData: FormData) => Promise<PromptCardActionState>
  planType: string | null | undefined
}

export function PromptCard({ action, planType }: PromptCardProps) {
  const { t } = useI18n()
  const normalizedPlan = normalizePlanTier(planType)
  const isFreePlan = normalizedPlan === "free"
  const currentPlanLabel = normalizedPlan
  const taglines = useMemo(
    () => [
      t("prompt.tagline1"),
      t("prompt.tagline2"),
      t("prompt.tagline3"),
      t("prompt.tagline4"),
      t("prompt.tagline5"),
    ],
    [t]
  )
  const [state, formAction] = useActionState(action, { error: "" })
  const [model, setModel] = useState<ModelOption>(MODEL_OPTIONS[0])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const taglineId = useId()
  const pickerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const tagline = useMemo(() => {
    let hash = 0
    for (let i = 0; i < taglineId.length; i += 1) {
      hash = (hash + taglineId.charCodeAt(i)) % taglines.length
    }
    return taglines[hash]
  }, [taglineId, taglines])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      if (!pickerRef.current?.contains(target)) {
        setPickerOpen(false)
        setHoveredModelId(null)
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
    if (event.nativeEvent.isComposing) {
      return
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      if (!prompt.trim()) {
        event.preventDefault()
        return
      }
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
      return
    }
    if (event.key === "Enter" && !prompt.trim()) {
      event.preventDefault()
    }
  }

  const hoveredModel = useMemo(
    () => MODEL_OPTIONS.find((option) => option.id === hoveredModelId) ?? null,
    [hoveredModelId]
  )
  const hoveredModelLocked =
    hoveredModel !== null && !isModelOptionAvailableForPlan(hoveredModel, normalizedPlan)

  const getModelDescription = (modelId: string) => {
    switch (modelId) {
      case "gpt-5.2":
        return t("prompt.modelHint.gpt52")
      case "gpt-5.2-thinking":
        return t("prompt.modelHint.gpt52Thinking")
      case "claude-opus-4-5":
        return t("prompt.modelHint.claudeOpus45")
      case "claude-sonnet-4-5":
        return t("prompt.modelHint.claudeSonnet45")
      case "gemini-2.5-pro":
        return t("prompt.modelHint.gemini25Pro")
      case "gemini-2.5-flash":
        return t("prompt.modelHint.gemini25Flash")
      default:
        return ""
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
          className="mb-3 h-20 w-20 dark:hidden md:h-28 md:w-28"
        />
        <Image
          src="/icons/Branch_logo_48px_dark.svg"
          alt="Branch logo dark"
          width={160}
          height={160}
          className="mb-3 hidden h-20 w-20 dark:block md:h-28 md:w-28"
        />
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-main">{t("settings.currentPlan")} :</span>
          <span className="rounded-full bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-main">
            {currentPlanLabel}
          </span>
          {isFreePlan ? <UpgradeButton /> : null}
        </div>
        <p className="text-center text-xl font-semibold text-main md:text-2xl">{tagline}</p>
      </div>
      <form
        action={formAction}
        onSubmit={handleSubmit}
        className={`flex items-end gap-4 rounded-[32px] border ${isInputFocused ? "border-[var(--color-border-soft)]" : "border-transparent"} bg-[var(--color-surface)] px-5 py-4 shadow-[var(--color-shadow-input)]`}
      >
        <div className="flex flex-1 flex-col gap-5">
          <textarea
            ref={textareaRef}
            name="prompt"
            placeholder={t("prompt.placeholder")}
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
              onClick={() =>
                setPickerOpen((prev) => {
                  const next = !prev
                  setHoveredModelId(null)
                  return next
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-theme-main px-3 py-1.5 text-xs font-semibold text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7da82]"
            >
              {model.label}
              <ChevronDown className="h-3 w-3" />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-10">
                <div
                  className="flex flex-col gap-0 md:flex-row"
                  onMouseLeave={() => setHoveredModelId(null)}
                >
                  <div
                    className="w-56 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-2 shadow-lg"
                  >
                    {MODEL_OPTIONS.map((option) => {
                      const isLocked = !isModelOptionAvailableForPlan(option, normalizedPlan)
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onMouseEnter={() => setHoveredModelId(option.id)}
                          onFocus={() => setHoveredModelId(option.id)}
                          onClick={() => {
                            if (isLocked) {
                              return
                            }
                            setModel(option)
                            setPickerOpen(false)
                            setHoveredModelId(null)
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                            isLocked
                              ? "cursor-not-allowed text-main-muted"
                              : "text-main hover:bg-[var(--color-surface-soft)]"
                          }`}
                        >
                          <span>{option.label}</span>
                          {isLocked ? (
                            <span className="rounded-full border border-[var(--color-border-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              Pro
                            </span>
                          ) : null}
                          {model.id === option.id && <Check className="h-3.5 w-3.5 text-main" />}
                        </button>
                      )
                    })}
                  </div>
                  {hoveredModel ? (
                    <div className="w-56 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-3 text-xs text-main-muted shadow-lg">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-main">
                        {hoveredModel.label}
                      </p>
                      <p>{getModelDescription(hoveredModel.id)}</p>
                      {hoveredModelLocked ? (
                        <div className="mt-3">
                          <UpgradeButton />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
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
