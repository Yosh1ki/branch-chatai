"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { applyThemePreferenceToRoot } from "@/lib/theme-dom"
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_PREFERENCE_STORAGE_KEY,
  parseThemePreference,
  type ThemePreference,
} from "@/lib/theme-preference"

type ThemeContextValue = {
  themePreference: ThemePreference
  setThemePreference: (nextThemePreference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

type ThemeProviderProps = {
  children: ReactNode
  initialThemePreference?: ThemePreference
}

export function ThemeProvider({ children, initialThemePreference }: ThemeProviderProps) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    if (initialThemePreference) {
      return parseThemePreference(initialThemePreference)
    }

    if (typeof window !== "undefined") {
      return parseThemePreference(
        window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY),
        DEFAULT_THEME_PREFERENCE
      )
    }

    return DEFAULT_THEME_PREFERENCE
  })

  useEffect(() => {
    const rootElement = document.documentElement
    applyThemePreferenceToRoot(rootElement, themePreference)
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, themePreference)
  }, [themePreference])

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      setThemePreference: setThemePreferenceState,
    }),
    [themePreference]
  )

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

export const useThemePreference = () => {
  const contextValue = useContext(ThemeContext)
  if (!contextValue) {
    throw new Error("useThemePreference must be used within ThemeProvider")
  }
  return contextValue
}
