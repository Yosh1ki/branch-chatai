import test from "node:test"
import assert from "node:assert/strict"
import {
  MODEL_OPTIONS,
  getDefaultModelSelectionForPlan,
  isModelOptionAvailableForPlan,
  isModelSelectionAvailableForPlan,
} from "../src/lib/model-catalog.ts"

test("free plan only allows GPT-5.2, Claude Sonnet 4.5, and Gemini 2.5 Flash", () => {
  const freeAllowedIds = MODEL_OPTIONS.filter((option) =>
    isModelOptionAvailableForPlan(option, "free")
  ).map((option) => option.id)

  assert.deepEqual(freeAllowedIds, ["gpt-5.2", "claude-sonnet-4-5", "gemini-2.5-flash"])
})

test("free plan blocks GPT-5.2 Thinking while pro allows it", () => {
  const freeAllowed = isModelSelectionAvailableForPlan("openai", "gpt-5.2", "high", "free")
  const proAllowed = isModelSelectionAvailableForPlan("openai", "gpt-5.2", "high", "pro")

  assert.equal(freeAllowed, false)
  assert.equal(proAllowed, true)
})

test("default model selection remains GPT-5.2", () => {
  assert.deepEqual(getDefaultModelSelectionForPlan("free"), {
    provider: "openai",
    model: "gpt-5.2",
    reasoningEffort: null,
  })
})
