import type { LucideIcon } from "lucide-react"
import { Coins, FileText, Gauge, GitBranch, MessageSquare, Sparkles } from "lucide-react"

type PricingPlanFeature = {
  icon: LucideIcon
  label: string
}

export type PricingPlan = {
  id: "free" | "pro"
  name: string
  price: string
  summary: string
  iconWrapperClass: string
  features: PricingPlanFeature[]
}

type LoginPricingKey =
  | "login.free"
  | "login.freePlanPrice"
  | "login.freePlanSummary"
  | "login.freePlanFeature1"
  | "login.freePlanFeature2"
  | "login.freePlanFeature3"
  | "login.proPlanTitle"
  | "login.proPlanPrice"
  | "login.proPlanSummary"
  | "login.proPlanFeature1"
  | "login.proPlanFeature2"
  | "login.proPlanFeature3"
  | "login.proPlanFeature4"

type PricingTranslator = (key: LoginPricingKey) => string

export function getLoginPricingPlans(t: PricingTranslator): PricingPlan[] {
  return [
    {
      id: "free",
      name: t("login.free"),
      price: t("login.freePlanPrice"),
      summary: t("login.freePlanSummary"),
      iconWrapperClass: "bg-black/5 text-main-soft",
      features: [
        {
          label: t("login.freePlanFeature1"),
          icon: MessageSquare,
        },
        {
          label: t("login.freePlanFeature2"),
          icon: Coins,
        },
        {
          label: t("login.freePlanFeature3"),
          icon: GitBranch,
        },
      ],
    },
    {
      id: "pro",
      name: t("login.proPlanTitle"),
      price: t("login.proPlanPrice"),
      summary: t("login.proPlanSummary"),
      iconWrapperClass: "bg-theme-main text-main",
      features: [
        {
          label: t("login.proPlanFeature1"),
          icon: Gauge,
        },
        {
          label: t("login.proPlanFeature2"),
          icon: Sparkles,
        },
        {
          label: t("login.proPlanFeature3"),
          icon: FileText,
        },
        {
          label: t("login.proPlanFeature4"),
          icon: GitBranch,
        },
      ],
    },
  ]
}
