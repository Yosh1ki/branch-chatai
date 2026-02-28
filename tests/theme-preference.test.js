import test from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_PREFERENCE_STORAGE_KEY,
  getStoredThemePreference,
  isThemePreference,
  parseThemePreference,
  saveThemePreference,
} from "../src/lib/theme-preference.ts"

test("isThemePreference identifies valid values", () => {
  assert.equal(isThemePreference("light"), true)
  assert.equal(isThemePreference("dark"), true)
  assert.equal(isThemePreference("system"), false)
  assert.equal(isThemePreference(undefined), false)
})

test("parseThemePreference returns fallback for invalid values", () => {
  assert.equal(parseThemePreference("dark"), "dark")
  assert.equal(parseThemePreference("light"), "light")
  assert.equal(parseThemePreference("invalid"), "light")
  assert.equal(parseThemePreference("invalid", "dark"), "dark")
})

test("theme constants stay stable", () => {
  assert.equal(DEFAULT_THEME_PREFERENCE, "light")
  assert.equal(THEME_PREFERENCE_STORAGE_KEY, "branch.theme")
})

test("getStoredThemePreference returns default when user setting is absent", async () => {
  const theme = await getStoredThemePreference(
    {
      user: {
        findUnique: async () => null,
      },
    },
    "user-1"
  )

  assert.equal(theme, "light")
})

test("getStoredThemePreference sanitizes stored value", async () => {
  const theme = await getStoredThemePreference(
    {
      user: {
        findUnique: async () => ({ themePreference: "dark" }),
      },
    },
    "user-1"
  )

  assert.equal(theme, "dark")
})

test("saveThemePreference persists normalized theme", async () => {
  const calls = []
  const saved = await saveThemePreference(
    {
      user: {
        update: async (args) => {
          calls.push(args)
          return { themePreference: args.data.themePreference }
        },
      },
    },
    "user-1",
    "dark"
  )

  assert.equal(saved, "dark")
  assert.deepEqual(calls, [
    {
      where: { id: "user-1" },
      data: { themePreference: "dark" },
      select: { themePreference: true },
    },
  ])
})
