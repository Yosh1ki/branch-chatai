import { FREE_PLAN_DAILY_MESSAGE_LIMIT } from "./usage-limits"

export const DEFAULT_DAILY_LIMIT = FREE_PLAN_DAILY_MESSAGE_LIMIT

export const isDailyLimitReached = (
  messageCount: number,
  limit = DEFAULT_DAILY_LIMIT
) => messageCount >= limit
