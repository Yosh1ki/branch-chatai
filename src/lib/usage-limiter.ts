import prisma from "@/lib/prisma"
import { FREE_PLAN_DAILY_LIMIT, getStartOfToday } from "@/lib/usage-limits"
import { ChatActionError } from "@/lib/chat-errors"

export const isDailyLimitReached = (messageCount: number, limit = FREE_PLAN_DAILY_LIMIT) =>
  messageCount >= limit

export const assertWithinDailyLimit = async (userId: string, planType?: string | null) => {
  const disableDailyLimit = process.env.DISABLE_DAILY_LIMIT === "true"
  if (planType !== "free" || disableDailyLimit) {
    return
  }

  const today = getStartOfToday()
  const usage = await prisma.usageStat.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  })

  if (usage && isDailyLimitReached(usage.messageCount)) {
    throw new ChatActionError("Daily message limit reached", 429)
  }
}
