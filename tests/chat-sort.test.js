import test from "node:test"
import assert from "node:assert/strict"
import { normalizeSortOrder, sortChatsByUpdatedAt } from "../src/lib/chat-sort.js"

test("normalizeSortOrder falls back to newest", () => {
  assert.equal(normalizeSortOrder("newest"), "newest")
  assert.equal(normalizeSortOrder("oldest"), "oldest")
  assert.equal(normalizeSortOrder("invalid"), "newest")
  assert.equal(normalizeSortOrder(null), "newest")
})

test("sortChatsByUpdatedAt orders newest first and keeps missing dates last", () => {
  const chats = [
    { id: "a", updatedAt: "2024-01-01T00:00:00Z" },
    { id: "b", updatedAt: "2024-01-03T00:00:00Z" },
    { id: "c", updatedAt: null },
  ]

  const sorted = sortChatsByUpdatedAt(chats, "newest")
  assert.deepEqual(
    sorted.map((chat) => chat.id),
    ["b", "a", "c"]
  )
})

test("sortChatsByUpdatedAt orders oldest first and keeps missing dates last", () => {
  const chats = [
    { id: "a", updatedAt: "2024-01-01T00:00:00Z" },
    { id: "b", updatedAt: "2024-01-03T00:00:00Z" },
    { id: "c", updatedAt: undefined },
  ]

  const sorted = sortChatsByUpdatedAt(chats, "oldest")
  assert.deepEqual(
    sorted.map((chat) => chat.id),
    ["a", "b", "c"]
  )
})

test("sortChatsByUpdatedAt handles empty lists", () => {
  const sorted = sortChatsByUpdatedAt([], "newest")
  assert.deepEqual(sorted, [])
})
