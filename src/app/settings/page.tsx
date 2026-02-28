import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  DAILY_LIMIT_RESET_HOUR,
  DAILY_LIMIT_RESET_MINUTE,
  DAILY_LIMIT_TIME_ZONE,
  FREE_PLAN_DAILY_LIMIT,
} from "@/lib/usage-limits"
import { resolveDailyLimitUsageDay } from "@/lib/usage-day"
import { textStyle } from "@/styles/typography"

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      planType: true,
      email: true,
      name: true,
    },
  })

  const { usageDay } = await resolveDailyLimitUsageDay()

  const usage = await prisma.usageStat.findUnique({
    where: {
        userId_date: {
          userId: session.user.id,
          date: usageDay,
        },
      },
  })

  const resetTimeLabel = `${String(DAILY_LIMIT_RESET_HOUR).padStart(2, "0")}:${String(
    DAILY_LIMIT_RESET_MINUTE
  ).padStart(2, "0")}`
  const messageCount = usage?.messageCount ?? 0
  const usagePercent = Math.min((messageCount / FREE_PLAN_DAILY_LIMIT) * 100, 100)

  return (
    <div className="min-h-screen bg-[#f9f7f7] text-main">
      <header className="flex w-full items-center justify-between px-2 py-6">
        <Link
          href="/chats"
          className="text-left font-title text-3xl tracking-wide text-main md:text-2xl"
          style={textStyle("pacifico")}
        >
          Branch
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-12">
        <div>
          <Link
            href="/chats"
            className="inline-flex items-center gap-2 rounded-full border border-[#f1d0c7] bg-white px-4 py-2 text-sm font-semibold text-main transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b5a2]"
          >
            <ArrowLeft className="h-4 w-4" />
            チャット一覧に戻る
          </Link>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">設定</h1>

        <div className="grid gap-5">
          <section className="rounded-3xl border border-[#f1d0c7] bg-white/90 p-6 shadow-[0_10px_40px_rgba(68,41,33,0.08)]">
            <h2 className="text-xl font-semibold text-main">アカウント</h2>
            <p className="mt-1 text-sm text-main-muted">アカウント情報を確認できます。</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-main-muted">名前</span>
                <span className="text-sm font-semibold text-main">{user?.name ?? "未設定"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-main-muted">メールアドレス</span>
                <span className="text-sm font-semibold text-main">{user?.email ?? "未設定"}</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#f1d0c7] bg-white/90 p-6 shadow-[0_10px_40px_rgba(68,41,33,0.08)]">
            <h2 className="text-xl font-semibold text-main">プランと利用状況</h2>
            <p className="mt-1 text-sm text-main-muted">
              現在のプランと本日のメッセージ利用数です。
            </p>

            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="text-sm text-main-muted">現在のプラン</span>
              <span className="rounded-full bg-[#f6ece7] px-3 py-1 text-xs font-bold uppercase tracking-wide text-main">
                {user?.planType ?? "FREE"}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-main-muted">本日のメッセージ数</span>
                <span className="font-semibold text-main">
                  {messageCount} / {FREE_PLAN_DAILY_LIMIT}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#f6ece7]">
                <div className="h-full bg-[#4b2418] transition-all" style={{ width: `${usagePercent}%` }} />
              </div>
              <p className="text-xs text-main-muted">
                毎日 {resetTimeLabel} ({DAILY_LIMIT_TIME_ZONE}) にリセットされます。
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
