export type DailyLimitWindow = {
  timeZone: string
  resetHour: number
  resetMinute: number
}

export type DailyLimitUsageDay = DailyLimitWindow & {
  sourceNow: Date
  usageDay: Date
}

export type UsagePeriodContext = DailyLimitUsageDay & {
  monthStartAt: Date
  nextDailyResetAt: Date
  nextMonthlyResetAt: Date
  nextWeeklyResetAt: Date
  rolling30DaysStartAt: Date
  weekStartAt: Date
}

type QueryRawClient = {
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<Array<{ db_now: unknown }>>
}

export const DEFAULT_DAILY_LIMIT_WINDOW: DailyLimitWindow = {
  timeZone: "Asia/Tokyo",
  resetHour: 0,
  resetMinute: 0,
}

export const validateDailyLimitWindow = (window: DailyLimitWindow): DailyLimitWindow => {
  if (!Number.isInteger(window.resetHour) || window.resetHour < 0 || window.resetHour > 23) {
    throw new Error(`Invalid daily limit reset hour: ${window.resetHour}`)
  }
  if (
    !Number.isInteger(window.resetMinute) ||
    window.resetMinute < 0 ||
    window.resetMinute > 59
  ) {
    throw new Error(`Invalid daily limit reset minute: ${window.resetMinute}`)
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: window.timeZone }).format(new Date())
  } catch {
    throw new Error(`Invalid daily limit time zone: ${window.timeZone}`)
  }

  return window
}

const extractDatePart = (
  parts: Intl.DateTimeFormatPart[],
  type: "year" | "month" | "day" | "hour" | "minute"
) => {
  const value = parts.find((part) => part.type === type)?.value
  if (!value) {
    throw new Error(`Failed to resolve ${type} from date parts`)
  }
  return Number.parseInt(value, 10)
}

const getWindowDateParts = (now: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const parts = formatter.formatToParts(now)

  return {
    year: extractDatePart(parts, "year"),
    month: extractDatePart(parts, "month"),
    day: extractDatePart(parts, "day"),
    hour: extractDatePart(parts, "hour"),
    minute: extractDatePart(parts, "minute"),
    second: extractDatePart(parts, "second"),
  }
}

const addUtcDays = (value: Date, days: number) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days))

const getTimeZoneOffsetMilliseconds = (value: Date, timeZone: string) => {
  const parts = getWindowDateParts(value, timeZone)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )
  return asUtc - value.getTime()
}

const toUtcDateTime = (
  value: {
    year: number
    month: number
    day: number
    hour?: number
    minute?: number
    second?: number
  },
  timeZone: string
) => {
  const utcGuess = new Date(
    Date.UTC(
      value.year,
      value.month - 1,
      value.day,
      value.hour ?? 0,
      value.minute ?? 0,
      value.second ?? 0
    )
  )
  const offsetMilliseconds = getTimeZoneOffsetMilliseconds(utcGuess, timeZone)
  return new Date(utcGuess.getTime() - offsetMilliseconds)
}

const getDatePartsFromUsageDay = (usageDay: Date) => ({
  year: usageDay.getUTCFullYear(),
  month: usageDay.getUTCMonth() + 1,
  day: usageDay.getUTCDate(),
})

export const resolveWeekStartUsageDay = (usageDay: Date, weekStartsOn = 1) => {
  const offset = (usageDay.getUTCDay() - weekStartsOn + 7) % 7
  return addUtcDays(usageDay, -offset)
}

export const resolveMonthStartUsageDay = (usageDay: Date) =>
  new Date(Date.UTC(usageDay.getUTCFullYear(), usageDay.getUTCMonth(), 1))

export const resolveRolling30DaysStartAt = (sourceNow: Date) =>
  new Date(sourceNow.getTime() - 30 * 24 * 60 * 60 * 1000)

const hoursUntil = (target: Date, sourceNow: Date) =>
  Math.max(0, Math.ceil((target.getTime() - sourceNow.getTime()) / (60 * 60 * 1000)))

export const getHoursUntil = hoursUntil

export const resolveUsageDayFromNow = (
  now: Date,
  window: DailyLimitWindow = DEFAULT_DAILY_LIMIT_WINDOW
) => {
  const validatedWindow = validateDailyLimitWindow(window)
  const parts = getWindowDateParts(now, validatedWindow.timeZone)

  const usageDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  const isBeforeReset =
    parts.hour < validatedWindow.resetHour ||
    (parts.hour === validatedWindow.resetHour && parts.minute < validatedWindow.resetMinute)

  if (isBeforeReset) {
    usageDay.setUTCDate(usageDay.getUTCDate() - 1)
  }

  return usageDay
}

const toDate = (rawValue: unknown) => {
  if (rawValue instanceof Date) {
    return rawValue
  }
  if (typeof rawValue === "string" || typeof rawValue === "number") {
    const parsed = new Date(rawValue)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  throw new Error("Database now() returned invalid date value")
}

export const fetchDatabaseNow = async (prismaClient: QueryRawClient) => {
  const rows = await prismaClient.$queryRaw`SELECT NOW() AS db_now`
  const current = rows.at(0)?.db_now
  if (!current) {
    throw new Error("Database now() returned empty result")
  }
  return toDate(current)
}

type ResolveDailyLimitUsageDayOptions = {
  prismaClient?: QueryRawClient
  window?: DailyLimitWindow
}

const loadDefaultPrismaClient = async (): Promise<QueryRawClient> => {
  const prismaModule = await import("@/lib/prisma")
  return prismaModule.default as QueryRawClient
}

export const resolveDailyLimitUsageDay = async ({
  window = DEFAULT_DAILY_LIMIT_WINDOW,
  prismaClient,
}: ResolveDailyLimitUsageDayOptions = {}): Promise<DailyLimitUsageDay> => {
  const validatedWindow = validateDailyLimitWindow(window)
  const sourceNow = await fetchDatabaseNow(prismaClient ?? (await loadDefaultPrismaClient()))
  const usageDay = resolveUsageDayFromNow(sourceNow, validatedWindow)

  return {
    ...validatedWindow,
    sourceNow,
    usageDay,
  }
}

export const resolveUsagePeriodContextFromNow = (
  now: Date,
  window: DailyLimitWindow = DEFAULT_DAILY_LIMIT_WINDOW,
  weekStartsOn = 1
): UsagePeriodContext => {
  const validatedWindow = validateDailyLimitWindow(window)
  const usageDay = resolveUsageDayFromNow(now, validatedWindow)
  const nextUsageDay = addUtcDays(usageDay, 1)
  const weekStartUsageDay = resolveWeekStartUsageDay(usageDay, weekStartsOn)
  const nextWeekStartUsageDay = addUtcDays(weekStartUsageDay, 7)
  const monthStartUsageDay = resolveMonthStartUsageDay(usageDay)
  const nextMonthStartUsageDay = new Date(
    Date.UTC(monthStartUsageDay.getUTCFullYear(), monthStartUsageDay.getUTCMonth() + 1, 1)
  )

  return {
    ...validatedWindow,
    monthStartAt: toUtcDateTime(getDatePartsFromUsageDay(monthStartUsageDay), validatedWindow.timeZone),
    nextDailyResetAt: toUtcDateTime(
      {
        ...getDatePartsFromUsageDay(nextUsageDay),
        hour: validatedWindow.resetHour,
        minute: validatedWindow.resetMinute,
      },
      validatedWindow.timeZone
    ),
    nextMonthlyResetAt: toUtcDateTime(
      getDatePartsFromUsageDay(nextMonthStartUsageDay),
      validatedWindow.timeZone
    ),
    nextWeeklyResetAt: toUtcDateTime(
      getDatePartsFromUsageDay(nextWeekStartUsageDay),
      validatedWindow.timeZone
    ),
    rolling30DaysStartAt: resolveRolling30DaysStartAt(now),
    sourceNow: now,
    usageDay,
    weekStartAt: toUtcDateTime(getDatePartsFromUsageDay(weekStartUsageDay), validatedWindow.timeZone),
  }
}

type ResolveUsagePeriodContextOptions = ResolveDailyLimitUsageDayOptions & {
  weekStartsOn?: number
}

export const resolveUsagePeriodContext = async ({
  prismaClient,
  weekStartsOn = 1,
  window = DEFAULT_DAILY_LIMIT_WINDOW,
}: ResolveUsagePeriodContextOptions = {}): Promise<UsagePeriodContext> => {
  const validatedWindow = validateDailyLimitWindow(window)
  const sourceNow = await fetchDatabaseNow(prismaClient ?? (await loadDefaultPrismaClient()))
  return resolveUsagePeriodContextFromNow(sourceNow, validatedWindow, weekStartsOn)
}
