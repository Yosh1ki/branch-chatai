import { z } from "zod"

const headingBlockSchema = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string(),
})

const paragraphBlockSchema = z.object({
  type: z.literal("paragraph"),
  text: z.string(),
})

const bulletsBlockSchema = z.object({
  type: z.literal("bullets"),
  items: z.array(z.string()),
})

const numberedItemSchema = z.union([
  z.string(),
  z.object({
    title: z.string().optional(),
    lines: z.array(z.string()).optional(),
  }),
])

const numberedBlockSchema = z.object({
  type: z.literal("numbered"),
  items: z.array(numberedItemSchema),
})

const calloutBlockSchema = z.object({
  type: z.literal("callout"),
  tone: z.enum(["info", "warning", "success", "danger"]),
  text: z.string(),
})

const codeBlockSchema = z.object({
  type: z.literal("code"),
  language: z.string().optional(),
  code: z.string(),
})

export const richTextBlockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  paragraphBlockSchema,
  bulletsBlockSchema,
  numberedBlockSchema,
  calloutBlockSchema,
  codeBlockSchema,
])

export const richTextDocSchema = z.object({
  version: z.literal("1.0"),
  blocks: z.array(richTextBlockSchema),
})

export type RichTextDoc = z.infer<typeof richTextDocSchema>
export type RichTextBlock = z.infer<typeof richTextBlockSchema>

const messageContentSchema = z.discriminatedUnion("format", [
  z.object({
    format: z.literal("markdown"),
    schemaVersion: z.string(),
    text: z.string(),
  }),
  z.object({
    format: z.literal("richjson"),
    schemaVersion: z.string(),
    doc: richTextDocSchema,
  }),
])

export type MessageContent = z.infer<typeof messageContentSchema>

const MESSAGE_SCHEMA_VERSION = "1.0"

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue: z.ZodIssue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root"
      return `${path}: ${issue.message}`
    })
    .join("; ")
}

export function parseRichTextDoc(value: unknown): {
  doc?: RichTextDoc
  error?: string
} {
  const result = richTextDocSchema.safeParse(value)
  if (result.success) {
    return { doc: result.data }
  }
  return { error: formatZodError(result.error) }
}

export function parseRichTextInput(value: unknown): {
  doc?: RichTextDoc
  fallbackText: string
  error?: string
} {
  let candidate: unknown = value
  let fallbackText = ""

  if (typeof value === "string") {
    fallbackText = value
    try {
      candidate = JSON.parse(value)
    } catch {
      return { fallbackText }
    }
  } else if (value != null) {
    fallbackText = JSON.stringify(value, null, 2)
  }

  const parsed = parseRichTextDoc(candidate)
  if (parsed.doc) {
    return { doc: parsed.doc, fallbackText }
  }
  return { fallbackText, error: parsed.error }
}

export function parseMessageContent(value: unknown): {
  format: "markdown" | "richjson"
  schemaVersion?: string
  text: string
  doc?: RichTextDoc
} {
  if (typeof value !== "string") {
    return { format: "markdown", text: "" }
  }

  try {
    const parsed = messageContentSchema.safeParse(JSON.parse(value))
    if (parsed.success) {
      if (parsed.data.format === "richjson") {
        return {
          format: "richjson",
          schemaVersion: parsed.data.schemaVersion,
          text: richTextDocToPlainText(parsed.data.doc),
          doc: parsed.data.doc,
        }
      }
      return {
        format: "markdown",
        schemaVersion: parsed.data.schemaVersion,
        text: parsed.data.text,
      }
    }
  } catch {
    return { format: "markdown", text: value }
  }

  return { format: "markdown", text: value }
}

export function serializeMarkdownContent(text: string): string {
  return JSON.stringify(
    { format: "markdown", schemaVersion: MESSAGE_SCHEMA_VERSION, text },
    null,
    2
  )
}

export function serializeRichTextContent(doc: RichTextDoc): string {
  return JSON.stringify(
    { format: "richjson", schemaVersion: MESSAGE_SCHEMA_VERSION, doc },
    null,
    2
  )
}

export function richTextDocToPlainText(doc: RichTextDoc): string {
  const lines: string[] = []

  doc.blocks.forEach((block) => {
    switch (block.type) {
      case "heading":
      case "paragraph":
      case "callout":
        lines.push(block.text)
        break
      case "bullets":
        block.items.forEach((item) => lines.push(`- ${item}`))
        break
      case "numbered":
        block.items.forEach((item, index) => {
          if (typeof item === "string") {
            lines.push(`${index + 1}. ${item}`)
            return
          }
          if (item.title) {
            lines.push(`${index + 1}. ${item.title}`)
          }
          item.lines?.forEach((line) => lines.push(`- ${line}`))
        })
        break
      case "code":
        lines.push(block.code)
        break
      default:
        break
    }
  })

  return lines.join("\n").trim()
}
