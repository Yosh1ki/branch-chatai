import type { PlanType } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { randomUUID } from "crypto"
import prisma from "@/lib/prisma"
import { ChatActionError } from "@/lib/chat-errors"
import { resolveUsagePeriodContext, type UsagePeriodContext } from "@/lib/usage-day"
import {
  createEmptyTokenTotals,
  createFreeQuotaStatus,
  createProQuotaStatus,
  normalizePlanType,
  sanitizeTokenTotals,
  type UsageLimitReason,
  type UsageQuotaStatus,
  type UsageTokenTotals,
} from "@/lib/usage-quota"
import { DAILY_LIMIT_TIME_ZONE, WEEKLY_LIMIT_RESET_DAY } from "@/lib/usage-limits"

type UsageLimitOptions = {
  periodContext?: UsagePeriodContext
  skipQuotaStatus?: boolean
}

type UsageAggregateRow = {
  inputTokens: number | null
  messageCount: number | null
  outputTokens: number | null
  totalTokens: number | null
}

const createQuotaStatusDetails = (quotaStatus: UsageQuotaStatus) => ({
  quotaStatus,
  timeZone: DAILY_LIMIT_TIME_ZONE,
})

const buildLimitError = (reason: UsageLimitReason, quotaStatus: UsageQuotaStatus) => {
  const codeByReason: Record<UsageLimitReason, string> = {
    free_daily_messages: "freeDailyMessageLimitReached",
    free_monthly_tokens: "freeMonthlyTokenLimitReached",
    pro_rolling_30_day_tokens: "proRolling30DayTokenLimitReached",
    pro_weekly_tokens: "proWeeklyTokenLimitReached",
  }

  return new ChatActionError("Usage limit reached", 429, {
    code: codeByReason[reason],
    details: createQuotaStatusDetails(quotaStatus),
  })
}

const isUsageEventsTableUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes("usage_events") &&
    (message.includes("does not exist") ||
      message.includes("relation") ||
      message.includes("no such table"))
  )
}

const aggregateFromLegacyUsageStats = async ({
  endAt,
  planType,
  startAt,
  usageDay,
  userId,
}: {
  endAt?: Date
  planType: PlanType
  startAt?: Date
  usageDay?: Date
  userId: string
}) => {
  if (planType !== "free") {
    return {
      inputTokens: 0,
      messageCount: 0,
      outputTokens: 0,
      totalTokens: 0,
    }
  }

  if (usageDay) {
    const usage = await prisma.usageStat.findUnique({
      where: {
        userId_date: {
          userId,
          date: usageDay,
        },
      },
    })

    return {
      inputTokens: 0,
      messageCount: usage?.messageCount ?? 0,
      outputTokens: 0,
      totalTokens: 0,
    }
  }

  const usage = await prisma.usageStat.aggregate({
    _sum: { messageCount: true },
    where: {
      date:
        startAt || endAt
          ? {
              ...(startAt ? { gte: startAt } : {}),
              ...(endAt ? { lt: endAt } : {}),
            }
          : undefined,
      userId,
    },
  })

  return {
    inputTokens: 0,
    messageCount: usage._sum.messageCount ?? 0,
    outputTokens: 0,
    totalTokens: 0,
  }
}

const aggregateTotals = async ({
  endAt,
  planType,
  startAt,
  usageDay,
  userId,
}: {
  endAt?: Date
  planType: PlanType
  startAt?: Date
  usageDay?: Date
  userId: string
}) => {
  try {
    const rows = await prisma.$queryRaw<UsageAggregateRow[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(input_tokens), 0)::int AS "inputTokens",
        COALESCE(SUM(message_count), 0)::int AS "messageCount",
        COALESCE(SUM(output_tokens), 0)::int AS "outputTokens",
        COALESCE(SUM(total_tokens), 0)::int AS "totalTokens"
      FROM usage_events
      WHERE user_id = ${userId}
        AND plan_type = ${planType}::"PlanType"
        ${usageDay ? Prisma.sql`AND usage_day = ${usageDay}::date` : Prisma.empty}
        ${startAt ? Prisma.sql`AND occurred_at >= ${startAt}` : Prisma.empty}
        ${endAt ? Prisma.sql`AND occurred_at < ${endAt}` : Prisma.empty}
    `)
    const result = rows[0]

    return {
      inputTokens: result?.inputTokens ?? 0,
      messageCount: result?.messageCount ?? 0,
      outputTokens: result?.outputTokens ?? 0,
      totalTokens: result?.totalTokens ?? 0,
    }
  } catch (error) {
    if (!isUsageEventsTableUnavailable(error)) {
      throw error
    }
    return aggregateFromLegacyUsageStats({ endAt, planType, startAt, usageDay, userId })
  }
}

export const getUsageQuotaStatus = async (
  userId: string,
  planType?: string | null,
  options: UsageLimitOptions = {}
): Promise<UsageQuotaStatus> => {
  const normalizedPlanType = normalizePlanType(planType)
  const periodContext =
    options.periodContext ??
    (await resolveUsagePeriodContext({ weekStartsOn: WEEKLY_LIMIT_RESET_DAY }))

  if (normalizedPlanType === "free") {
    const [dailyUsage, monthlyUsage] = await Promise.all([
      aggregateTotals({
        planType: "free",
        usageDay: periodContext.usageDay,
        userId,
      }),
      aggregateTotals({
        endAt: periodContext.nextMonthlyResetAt,
        planType: "free",
        startAt: periodContext.monthStartAt,
        userId,
      }),
    ])

    return createFreeQuotaStatus({
      dailyMessagesUsed: dailyUsage.messageCount,
      hoursUntilDailyReset: periodContext.nextDailyResetAt
        ? Math.max(
            0,
            Math.ceil(
              (periodContext.nextDailyResetAt.getTime() - periodContext.sourceNow.getTime()) /
                (60 * 60 * 1000)
            )
          )
        : 0,
      hoursUntilMonthlyReset: Math.max(
        0,
        Math.ceil(
          (periodContext.nextMonthlyResetAt.getTime() - periodContext.sourceNow.getTime()) /
            (60 * 60 * 1000)
        )
      ),
      monthlyTokensUsed: monthlyUsage.totalTokens,
      nextDailyResetAt: periodContext.nextDailyResetAt.toISOString(),
      nextMonthlyResetAt: periodContext.nextMonthlyResetAt.toISOString(),
      sourceNow: periodContext.sourceNow.toISOString(),
    })
  }

  const [weeklyUsage, rolling30DayUsage] = await Promise.all([
    aggregateTotals({
      endAt: periodContext.nextWeeklyResetAt,
      planType: "pro",
      startAt: periodContext.weekStartAt,
      userId,
    }),
    aggregateTotals({
      planType: "pro",
      startAt: periodContext.rolling30DaysStartAt,
      userId,
    }),
  ])

  return createProQuotaStatus({
    hoursUntilWeeklyReset: Math.max(
      0,
      Math.ceil(
        (periodContext.nextWeeklyResetAt.getTime() - periodContext.sourceNow.getTime()) /
          (60 * 60 * 1000)
      )
    ),
    nextWeeklyResetAt: periodContext.nextWeeklyResetAt.toISOString(),
    rolling30DayTokensUsed: rolling30DayUsage.totalTokens,
    sourceNow: periodContext.sourceNow.toISOString(),
    weeklyTokensUsed: weeklyUsage.totalTokens,
  })
}

export const assertWithinUsageLimits = async (
  userId: string,
  planType?: string | null,
  options: UsageLimitOptions = {}
) => {
  const disableDailyLimit = process.env.DISABLE_DAILY_LIMIT === "true"
  if (disableDailyLimit) {
    return null
  }

  const quotaStatus = await getUsageQuotaStatus(userId, planType, options)
  if (quotaStatus.blockReason) {
    throw buildLimitError(quotaStatus.blockReason, quotaStatus)
  }

  return quotaStatus
}

export const recordUsageEvent = async (
  userId: string,
  planType: string | null | undefined,
  usage: Partial<UsageTokenTotals> | null | undefined,
  options: UsageLimitOptions = {}
) => {
  const normalizedPlanType = normalizePlanType(planType)
  const tokenTotals = sanitizeTokenTotals(usage)
  const periodContext =
    options.periodContext ??
    (await resolveUsagePeriodContext({ weekStartsOn: WEEKLY_LIMIT_RESET_DAY }))

  try {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO usage_events (
        id,
        user_id,
        plan_type,
        usage_day,
        occurred_at,
        message_count,
        input_tokens,
        output_tokens,
        total_tokens,
        created_at
      ) VALUES (
        ${randomUUID()},
        ${userId},
        ${normalizedPlanType}::"PlanType",
        ${periodContext.usageDay}::date,
        ${periodContext.sourceNow},
        1,
        ${tokenTotals.inputTokens},
        ${tokenTotals.outputTokens},
        ${tokenTotals.totalTokens},
        NOW()
      )
    `)
  } catch (error) {
    if (!isUsageEventsTableUnavailable(error)) {
      throw error
    }

    if (normalizedPlanType === "free") {
      await prisma.usageStat.upsert({
        where: {
          userId_date: {
            userId,
            date: periodContext.usageDay,
          },
        },
        update: {
          messageCount: { increment: 1 },
        },
        create: {
          userId,
          date: periodContext.usageDay,
          messageCount: 1,
        },
      })
    }
  }

  if (options.skipQuotaStatus) {
    return null
  }

  return getUsageQuotaStatus(userId, normalizedPlanType, { periodContext })
}

export const createEmptyUsageTokenTotals = createEmptyTokenTotals
