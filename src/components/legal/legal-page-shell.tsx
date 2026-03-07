import Link from "next/link"

import { textStyle } from "@/styles/typography"

type LegalSection = {
  title: string
  paragraphs: string[]
}

type LegalPageShellProps = {
  backHref: string
  backLabel: string
  brandLabel: string
  title: string
  updatedAt: string
  intro: string
  sections: LegalSection[]
  footerLinks: Array<{
    href: string
    label: string
  }>
}

export function LegalPageShell({
  backHref,
  backLabel,
  brandLabel,
  title,
  updatedAt,
  intro,
  sections,
  footerLinks,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-(--color-app-bg) text-main">
      <header className="flex w-full items-center justify-between px-2 py-6">
        <Link
          href={backHref}
          className="rounded-full border border-(--color-border-soft) bg-(--color-surface) px-4 py-2 text-sm font-semibold text-main transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
        >
          {backLabel}
        </Link>
        <Link
          href="/login"
          className="text-left font-title text-3xl tracking-wide text-main md:text-2xl"
          style={textStyle("pacifico")}
        >
          {brandLabel}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-16">
        <div className="rounded-[28px] border border-(--color-border-soft) bg-(--color-surface) p-6 shadow-(--color-shadow-card) sm:p-8">
          <p className="text-sm text-main-muted">{updatedAt}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-main-soft sm:text-base">
            {intro}
          </p>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold tracking-tight">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-main-soft sm:text-base">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <nav className="mt-10 flex flex-wrap gap-3 border-t border-(--color-border-muted) pt-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-(--color-border-soft) bg-(--color-app-bg) px-4 py-2 text-sm font-semibold text-main transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </div>
  )
}
