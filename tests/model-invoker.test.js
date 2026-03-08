import test from "node:test"
import assert from "node:assert/strict"
import {
  formatModelInvocationError,
  toUpstreamErrorStatus,
} from "../src/lib/model-invoker-errors.ts"

test("formatModelInvocationError explains Gemini redirect responses", () => {
  const message = formatModelInvocationError("gemini", {
    status: 303,
    message: "See Other",
  })

  assert.match(message, /Gemini upstream returned redirect status 303/)
  assert.match(message, /GEMINI_NEXT_GEN_API_BASE_URL/)
})

test("formatModelInvocationError explains Anthropic redirect responses", () => {
  const message = formatModelInvocationError("anthropic", {
    status: 303,
    message: "See Other",
  })

  assert.match(message, /Anthropic upstream returned redirect status 303/)
  assert.match(message, /api\.anthropic\.com/)
})

test("formatModelInvocationError falls back to upstream message for non-redirect errors", () => {
  const message = formatModelInvocationError("anthropic", {
    status: 429,
    message: "rate limit exceeded",
  })

  assert.equal(message, "rate limit exceeded")
})

test("toUpstreamErrorStatus maps redirects to bad gateway", () => {
  assert.equal(toUpstreamErrorStatus(303), 502)
  assert.equal(toUpstreamErrorStatus(429), 429)
  assert.equal(toUpstreamErrorStatus(null), 502)
})
