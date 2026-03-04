import test from "node:test"
import assert from "node:assert/strict"
import {
  appendSourcesSection,
  extractWebSourcesFromResponse,
  shouldUseWebSearchForPrompt,
} from "../src/lib/openai-web-search.ts"

test("shouldUseWebSearchForPrompt detects freshness-required Japanese queries", () => {
  assert.equal(shouldUseWebSearchForPrompt("最新ニュースを教えて"), true)
  assert.equal(shouldUseWebSearchForPrompt("最近のアーティスト動向をまとめて"), true)
  assert.equal(shouldUseWebSearchForPrompt("直近1週間の出来事は？"), true)
})

test("shouldUseWebSearchForPrompt detects freshness-required English queries", () => {
  assert.equal(shouldUseWebSearchForPrompt("What are the latest updates from OpenAI this week?"), true)
  assert.equal(shouldUseWebSearchForPrompt("Any breaking news about NVIDIA today?"), true)
})

test("shouldUseWebSearchForPrompt skips evergreen and non-freshness terms", () => {
  assert.equal(shouldUseWebSearchForPrompt("量子コンピュータとは何ですか"), false)
  assert.equal(shouldUseWebSearchForPrompt("最近傍探索アルゴリズムを説明して"), false)
})

test("extractWebSourcesFromResponse collects and deduplicates url citations and search results", () => {
  const response = {
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            annotations: [
              {
                type: "url_citation",
                title: "Example News",
                url: "https://example.com/news/2026/03/03/story",
              },
            ],
          },
        ],
      },
      {
        type: "web_search_call",
        action: {
          type: "search",
          sources: [{ type: "url", url: "https://example.com/news/2026/03/03/story" }],
        },
        results: [
          {
            url: "https://another.example.com/post",
            title: "Another Source",
            published_date: "2026-03-01T09:00:00Z",
          },
        ],
      },
    ],
  }

  const sources = extractWebSourcesFromResponse(response)

  assert.equal(sources.length, 2)
  assert.equal(sources[0].url, "https://example.com/news/2026/03/03/story")
  assert.equal(sources[0].publishedOrUpdatedDate, "2026-03-03")
  assert.equal(sources[1].publishedOrUpdatedDate, "2026-03-01")
})

test("appendSourcesSection renders URL and date metadata", () => {
  const rendered = appendSourcesSection(
    "本文です。",
    [
      {
        title: "Another Source",
        url: "https://another.example.com/post",
        publishedOrUpdatedDate: "2026-03-01",
      },
      {
        title: null,
        url: "https://example.com/without-date",
        publishedOrUpdatedDate: null,
      },
    ],
    new Date("2026-03-04T12:34:56Z")
  )

  assert.ok(rendered.includes("参考ソース:"))
  assert.ok(rendered.includes("https://another.example.com/post"))
  assert.ok(rendered.includes("発行/更新日: 2026-03-01"))
  assert.ok(rendered.includes("発行/更新日: 不明"))
  assert.ok(rendered.includes("参照日: 2026-03-04"))
})
