export const THEME_PREFERENCES = ["light", "dark"] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light"

export const THEME_PREFERENCE_STORAGE_KEY = "branch.theme"
export const THEME_PREFERENCE_COOKIE_KEY = "themePreference"

export const isThemePreference = (value: unknown): value is ThemePreference => {
  return typeof value === "string" && THEME_PREFERENCES.includes(value as ThemePreference)
}

export const parseThemePreference = (
  value: unknown,
  fallback: ThemePreference = DEFAULT_THEME_PREFERENCE
): ThemePreference => {
  return isThemePreference(value) ? value : fallback
}

type ThemePreferenceReadClient = {
  user: {
    findUnique: (args: {
      where: { id: string }
      select: { themePreference: true }
    }) => Promise<{ themePreference: unknown } | null>
  }
}

type ThemePreferenceWriteClient = {
  user: {
    update: (args: {
      where: { id: string }
      data: { themePreference: ThemePreference }
      select: { themePreference: true }
    }) => Promise<{ themePreference: unknown }>
  }
}

export const getStoredThemePreference = async (
  prismaClient: ThemePreferenceReadClient,
  userId: string
): Promise<ThemePreference> => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { themePreference: true },
  })
  return parseThemePreference(user?.themePreference)
}

export const saveThemePreference = async (
  prismaClient: ThemePreferenceWriteClient,
  userId: string,
  theme: unknown
): Promise<ThemePreference> => {
  const normalizedTheme = parseThemePreference(theme)
  const user = await prismaClient.user.update({
    where: { id: userId },
    data: { themePreference: normalizedTheme },
    select: { themePreference: true },
  })

  return parseThemePreference(user.themePreference)
}
