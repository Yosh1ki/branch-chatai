import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { textStyle } from "@/styles/typography"
import { createTranslator } from "@/lib/i18n"
import { resolveRequestLocale } from "@/lib/i18n/locale"
import { getSettingsViewData } from "@/lib/settings-view"
import { SettingsSections } from "@/components/settings/settings-sections"

export default async function SettingsPage() {
  const locale = await resolveRequestLocale()
  const t = createTranslator(locale)
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const settings = await getSettingsViewData(session.user.id)

  return (
    <div className="min-h-screen bg-(--color-app-bg) text-main">
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
            className="inline-flex items-center gap-2 rounded-full border border-(--color-border-soft) bg-(--color-surface) px-4 py-2 text-sm font-semibold text-main transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("settings.backToChats")}
          </Link>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <SettingsSections locale={locale} settings={settings} />
      </main>
    </div>
  )
}
