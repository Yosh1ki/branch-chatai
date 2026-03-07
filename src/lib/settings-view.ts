import type { PlanType } from "@prisma/client"
import prisma from "@/lib/prisma"
import { getUsageQuotaStatus } from "@/lib/usage-limiter"
import type { UsageQuotaStatus } from "@/lib/usage-quota"

export type SettingsViewData = {
  email: string | null
  name: string | null
  planType: PlanType
  quotaStatus: UsageQuotaStatus
}

export async function getSettingsViewData(userId: string): Promise<SettingsViewData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planType: true,
      email: true,
      name: true,
    },
  })

  const planType = user?.planType ?? "free"
  const quotaStatus = await getUsageQuotaStatus(userId, planType)

  return {
    email: user?.email ?? null,
    name: user?.name ?? null,
    planType,
    quotaStatus,
  }
}
