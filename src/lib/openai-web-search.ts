import type { Responses } from "openai/resources/responses/responses"

type WebSource = {
  title: string | null
  url: string
  publishedOrUpdatedDate: string | null
}

const FRESHNESS_PATTERNS = [
  /\b(latest|recent|current|today|yesterday|breaking|up[- ]to[- ]date)\b/i,
  /\b(this|last)\s+(week|month|year)\b/i,
  /\bnews\b/i,
  /最新/,
  /最近の/,
  /直近/,
  /今日|きょう|昨日/,
  /今週|今月|今年/,
  /速報/,
  /ニュース/,
  /動向/,
  /トレンド/,
  /アップデート/,
  /\d+\s*(日|週間|週|か月|ヶ月|ヵ月|年)\s*(以内|間|の)/,
]

const NON_FRESHNESS_PATTERNS = [/最近傍/, /最近接/]

const dateFields = ["published_date", "published_at", "updated_date", "updated_at", "date"] as const

const extractYyyyMmDd = (value: string) => {
  const ymd = value.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!ymd) {
    return null
  }
  const year = ymd[1]
  const month = ymd[2].padStart(2, "0")
  const day = ymd[3].padStart(2, "0")
  return `${year}-${month}-${day}`
}

const extractDateFromUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    return extractYyyyMmDd(`${parsed.pathname}${parsed.search}`) ?? null
  } catch {
    return extractYyyyMmDd(url) ?? null
  }
}

const normalizeUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    parsed.hash = ""
    return parsed.toString()
  } catch {
    return url.trim()
  }
}

const pickDateFromResult = (result: Record<string, unknown>) => {
  for (const key of dateFields) {
    const value = result[key]
    if (typeof value === "string" && value.trim()) {
      return extractYyyyMmDd(value) ?? value.trim()
    }
  }
  if (typeof result.url === "string") {
    return extractDateFromUrl(result.url)
  }
  return null
}

const upsertSource = (
  bucket: Map<string, WebSource>,
  source: { title?: string | null; url?: string | null; date?: string | null }
) => {
  if (!source.url || typeof source.url !== "string") {
    return
  }
  const normalizedUrl = normalizeUrl(source.url)
  if (!normalizedUrl) {
    return
  }

  const existing = bucket.get(normalizedUrl)
  if (!existing) {
    bucket.set(normalizedUrl, {
      title: source.title?.trim() || null,
      url: normalizedUrl,
      publishedOrUpdatedDate: source.date?.trim() || extractDateFromUrl(normalizedUrl),
    })
    return
  }

  if (!existing.title && source.title?.trim()) {
    existing.title = source.title.trim()
  }
  if (!existing.publishedOrUpdatedDate && source.date?.trim()) {
    existing.publishedOrUpdatedDate = source.date.trim()
  }
  if (!existing.publishedOrUpdatedDate) {
    existing.publishedOrUpdatedDate = extractDateFromUrl(normalizedUrl)
  }
}

export const shouldUseWebSearchForPrompt = (prompt: string) => {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return false
  }
  if (NON_FRESHNESS_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return false
  }
  return FRESHNESS_PATTERNS.some((pattern) => pattern.test(trimmed))
}

export const extractWebSourcesFromResponse = (response: Pick<Responses.Response, "output">): WebSource[] => {
  const sources = new Map<string, WebSource>()

  for (const item of response.output ?? []) {
    if (item.type === "message") {
      const content = Array.isArray(item.content) ? item.content : []
      for (const part of content) {
        if (part.type !== "output_text") {
          continue
        }
        for (const annotation of part.annotations ?? []) {
          if (annotation.type !== "url_citation") {
            continue
          }
          upsertSource(sources, { title: annotation.title, url: annotation.url })
        }
      }
      continue
    }

    if (item.type !== "web_search_call") {
      continue
    }

    const action = (item as { action?: unknown }).action
    if (action && typeof action === "object") {
      const actionData = action as { sources?: unknown }
      if (Array.isArray(actionData.sources)) {
        for (const source of actionData.sources) {
          if (!source || typeof source !== "object") {
            continue
          }
          const sourceData = source as { url?: unknown; title?: unknown }
          upsertSource(sources, {
            url: typeof sourceData.url === "string" ? sourceData.url : null,
            title: typeof sourceData.title === "string" ? sourceData.title : null,
          })
        }
      }
    }

    const results = (item as { results?: unknown }).results
    if (!Array.isArray(results)) {
      continue
    }

    for (const result of results) {
      if (!result || typeof result !== "object") {
        continue
      }
      const resultData = result as Record<string, unknown>
      const url = typeof resultData.url === "string" ? resultData.url : null
      const title = typeof resultData.title === "string" ? resultData.title : null
      upsertSource(sources, { url, title, date: pickDateFromResult(resultData) })
    }
  }

  return [...sources.values()]
}

export const appendSourcesSection = (
  answer: string,
  sources: WebSource[],
  now: Date = new Date()
) => {
  const trimmedAnswer = answer.trim()
  if (sources.length === 0) {
    return trimmedAnswer
  }

  const accessDate = now.toISOString().slice(0, 10)
  const sectionLines = ["", "参考ソース:"]
  for (const source of sources.slice(0, 8)) {
    const titlePrefix = source.title ? `${source.title} - ` : ""
    const publishedDate = source.publishedOrUpdatedDate ?? "不明"
    sectionLines.push(
      `- ${titlePrefix}${source.url} | 発行/更新日: ${publishedDate} | 参照日: ${accessDate}`
    )
  }

  return `${trimmedAnswer}\n${sectionLines.join("\n")}`
}
