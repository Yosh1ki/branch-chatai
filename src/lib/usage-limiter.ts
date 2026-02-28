import prisma from "@/lib/prisma"
import { FREE_PLAN_DAILY_LIMIT } from "@/lib/usage-limits"
import { ChatActionError } from "@/lib/chat-errors"
import { isDailyLimitReached as isDailyLimitReachedCore } from "@/lib/usage-limiter-core"
import { resolveDailyLimitUsageDay } from "@/lib/usage-day"

export const isDailyLimitReached = (messageCount: number, limit = FREE_PLAN_DAILY_LIMIT) =>
  isDailyLimitReachedCore(messageCount, limit)

type DailyLimitOptions = {
  usageDay?: Date
}

const resolveUsageDay = async (usageDay?: Date) => {
  if (usageDay) {
    return usageDay
  }
  const resolved = await resolveDailyLimitUsageDay()
  return resolved.usageDay
}

export const assertWithinDailyLimit = async (
  userId: string,
  planType?: string | null,
  options: DailyLimitOptions = {}
) => {
  const disableDailyLimit = process.env.DISABLE_DAILY_LIMIT === "true"
  if (planType !== "free" || disableDailyLimit) {
    return null
  }

  const usageDay = await resolveUsageDay(options.usageDay)
  const usage = await prisma.usageStat.findUnique({
    where: {
      userId_date: {
        userId,
        date: usageDay,
      },
    },
  })

  if (usage && isDailyLimitReached(usage.messageCount)) {
    throw new ChatActionError("Daily message limit reached", 429)
  }

  return usageDay
}

export const incrementDailyUsage = async (
  userId: string,
  planType?: string | null,
  options: DailyLimitOptions = {}
) => {
  if (planType !== "free") {
    return null
  }

  const usageDay = await resolveUsageDay(options.usageDay)
  await prisma.usageStat.upsert({
    where: {
      userId_date: {
        userId,
        date: usageDay,
      },
    },
    update: {
      messageCount: { increment: 1 },
    },
    create: {
      userId,
      date: usageDay,
      messageCount: 1,
    },
  })

  return usageDay
}
