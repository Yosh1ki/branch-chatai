import test from "node:test"
import assert from "node:assert/strict"
import { applyThemePreferenceToRoot } from "../src/lib/theme-dom.ts"

const createMockRoot = () => {
  const classes = new Set()

  return {
    classList: {
      add: (className) => classes.add(className),
      remove: (className) => classes.delete(className),
      contains: (className) => classes.has(className),
    },
    has: (className) => classes.has(className),
  }
}

test("applyThemePreferenceToRoot adds dark class for dark theme", () => {
  const root = createMockRoot()
  applyThemePreferenceToRoot(root, "dark")

  assert.equal(root.has("dark"), true)
})

test("applyThemePreferenceToRoot removes dark class for light theme", () => {
  const root = createMockRoot()
  applyThemePreferenceToRoot(root, "dark")
  applyThemePreferenceToRoot(root, "light")

  assert.equal(root.has("dark"), false)
})
