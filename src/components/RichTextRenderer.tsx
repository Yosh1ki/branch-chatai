import { cn } from "@/lib/utils"
import type { RichTextDoc } from "@/lib/rich-text"

type RichTextRendererProps = {
  value: RichTextDoc
  className?: string
}

const calloutToneClass = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
} as const

const headingTagByLevel = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
} as const

export function RichTextRenderer({ value, className }: RichTextRendererProps) {
  return (
    <div className={cn("space-y-3 text-sm text-foreground", className)}>
      {value.blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const Tag = headingTagByLevel[block.level]
            const sizeClass =
              block.level === 1
                ? "text-2xl"
                : block.level === 2
                  ? "text-xl"
                  : block.level === 3
                    ? "text-lg"
                    : "text-base"
            return (
              <Tag key={index} className={cn("font-semibold", sizeClass)}>
                {block.text}
              </Tag>
            )
          }
          case "paragraph":
            return (
              <p key={index} className="leading-6 text-foreground">
                {block.text}
              </p>
            )
          case "bullets":
            return (
              <ul key={index} className="list-disc space-y-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            )
          case "numbered":
            return (
              <ol key={index} className="list-decimal space-y-2 pl-5">
                {block.items.map((item, itemIndex) => {
                  if (typeof item === "string") {
                    return <li key={itemIndex}>{item}</li>
                  }
                  return (
                    <li key={itemIndex}>
                      {item.title && (
                        <div className="font-medium">{item.title}</div>
                      )}
                      {item.lines && item.lines.length > 0 && (
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {item.lines.map((line, lineIndex) => (
                            <li key={lineIndex}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ol>
            )
          case "callout":
            return (
              <div
                key={index}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  calloutToneClass[block.tone]
                )}
              >
                {block.text}
              </div>
            )
          case "code":
            return (
              <div key={index} className="rounded-md bg-muted p-3">
                {block.language && (
                  <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {block.language}
                  </div>
                )}
                <pre className="overflow-x-auto text-xs">
                  <code className="font-mono">{block.code}</code>
                </pre>
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
