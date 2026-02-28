import type { ThemePreference } from "@/lib/theme-preference"

type ThemeClassList = {
  add: (token: string) => void
  remove: (token: string) => void
}

type ThemeRootElement = {
  classList: ThemeClassList
}

export const applyThemePreferenceToRoot = (
  rootElement: ThemeRootElement,
  themePreference: ThemePreference
) => {
  if (themePreference === "dark") {
    rootElement.classList.add("dark")
    return
  }

  rootElement.classList.remove("dark")
}
