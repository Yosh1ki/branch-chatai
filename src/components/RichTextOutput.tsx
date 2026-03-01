"use client"

import { cn } from "@/lib/utils"
import { parseRichTextInput } from "@/lib/rich-text"
import { RichTextRenderer } from "@/components/RichTextRenderer"
import { useI18n } from "@/components/i18n/i18n-provider"

type RichTextOutputProps = {
  value: unknown
  className?: string
}

export function RichTextOutput({ value, className }: RichTextOutputProps) {
  const { t } = useI18n()
  const { doc, fallbackText, error } = parseRichTextInput(value)

  if (doc) {
    return <RichTextRenderer value={doc} className={className} />
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">
        {t("richText.fallbackPlainText")}
      </p>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <pre className="whitespace-pre-wrap rounded-md bg-muted px-3 py-2 text-sm text-foreground">
        {fallbackText}
      </pre>
    </div>
  )
}
