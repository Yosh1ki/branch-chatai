export type DailyLimitWindow = {
  timeZone: string
  resetHour: number
  resetMinute: number
}

export type DailyLimitUsageDay = DailyLimitWindow & {
  sourceNow: Date
  usageDay: Date
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
    hourCycle: "h23",
  })
  const parts = formatter.formatToParts(now)

  return {
    year: extractDatePart(parts, "year"),
    month: extractDatePart(parts, "month"),
    day: extractDatePart(parts, "day"),
    hour: extractDatePart(parts, "hour"),
    minute: extractDatePart(parts, "minute"),
  }
}

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
