export const DEFAULT_DAILY_LIMIT = 10

export const isDailyLimitReached = (
  messageCount: number,
  limit = DEFAULT_DAILY_LIMIT
) => messageCount >= limit
