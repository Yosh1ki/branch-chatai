import type { PlanType } from "@prisma/client"
import prisma from "@/lib/prisma"
import { resolveDailyLimitUsageDay } from "@/lib/usage-day"
import {
  DAILY_LIMIT_RESET_HOUR,
  DAILY_LIMIT_RESET_MINUTE,
  FREE_PLAN_DAILY_LIMIT,
} from "@/lib/usage-limits"

export type SettingsViewData = {
  email: string | null
  messageCount: number
  name: string | null
  planType: PlanType
  resetTimeLabel: string
  usagePercent: number
}

export async function getSettingsViewData(userId: string): Promise<SettingsViewData> {
  const [user, usageDayResult] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        planType: true,
        email: true,
        name: true,
      },
    }),
    resolveDailyLimitUsageDay(),
  ])

  const usage = await prisma.usageStat.findUnique({
    where: {
      userId_date: {
        userId,
        date: usageDayResult.usageDay,
      },
    },
  })

  const messageCount = usage?.messageCount ?? 0

  return {
    email: user?.email ?? null,
    messageCount,
    name: user?.name ?? null,
    planType: user?.planType ?? "free",
    resetTimeLabel: `${String(DAILY_LIMIT_RESET_HOUR).padStart(2, "0")}:${String(
      DAILY_LIMIT_RESET_MINUTE
    ).padStart(2, "0")}`,
    usagePercent: Math.min((messageCount / FREE_PLAN_DAILY_LIMIT) * 100, 100),
  }
}
