"use client";

import Image from "next/image";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";

import { LanguageToggle } from "@/components/i18n/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { createLegalFooterLinks } from "@/lib/legal-links";
import type { LegalLocale } from "@/lib/legal-profile";
import { getLoginPricingPlans } from "@/lib/pricing-plans";
import { textStyle } from "@/styles/typography";

type LoginPageViewLabels = {
  aboutBranch: string
  mechanism: string
  howToUse: string
  features: string
  pricing: string
  free: string
  tryBranch: string
  tryFreePlan: string
  tryProPlan: string
  headline: string
  subline1: string
  subline2: string
  branchSectionTitle: string
  branchSectionDescription: string
  branchFeature1Title: string
  branchFeature1Description: string
  branchFeature2Title: string
  branchFeature2Description: string
  branchFeature3Title: string
  branchFeature3Description: string
  pricingSectionTitle: string
  pricingSectionDescription: string
  freePlanSummary: string
  freePlanPrice: string
  freePlanFeature1: string
  freePlanFeature2: string
  freePlanFeature3: string
  proPlanTitle: string
  proPlanSummary: string
  proPlanPrice: string
  proPlanFeature1: string
  proPlanFeature2: string
  proPlanFeature3: string
  proPlanFeature4: string
  modalWelcome: string
  emailLabel: string
  emailPlaceholder: string
  passwordLabel: string
  passwordPlaceholder: string
  loginButton: string
  googleOnlyNotice: string
  or: string
  noAccount: string
  privacyNoticePrefix: string
  privacyNoticeLink: string
  privacyNoticeSuffix: string
  closeModal: string
  showPassword: string
  hidePassword: string
  footerTagline: string
  footerOrigin: string
  footerUpdates: string
  footerFaq: string
  footerTerms: string
}

type BranchHighlight = {
  title: string
  description: string
  image?: {
    lightSrc: string
    darkSrc: string
    alt: string
    width: number
    height: number
  }
}

type LoginPageViewProps = {
  locale: LegalLocale
  labels: LoginPageViewLabels
  googleSignInAction: () => Promise<void>
}

export function LoginPageView({
  locale,
  labels,
  googleSignInAction,
}: LoginPageViewProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [expandedBranchImage, setExpandedBranchImage] = useState<BranchHighlight["image"] | null>(null)
  const branchHighlights: BranchHighlight[] = [
    {
      title: labels.branchFeature1Title,
      description: labels.branchFeature1Description,
      image: {
        lightSrc: "/pictures/branching-light.png",
        darkSrc: "/pictures/branching-dark.png",
        alt: labels.branchFeature1Title,
        width: 1804,
        height: 1114,
      },
    },
    {
      title: labels.branchFeature2Title,
      description: labels.branchFeature2Description,
      image: {
        lightSrc: "/pictures/multi-conversations-light.png",
        darkSrc: "/pictures/multi-conversations-dark.png",
        alt: labels.branchFeature2Title,
        width: 1804,
        height: 1114,
      },
    },
    {
      title: labels.branchFeature3Title,
      description: labels.branchFeature3Description,
      image: {
        lightSrc: "/pictures/model-select-light.png",
        darkSrc: "/pictures/model-select-dark.png",
        alt: labels.branchFeature3Title,
        width: 478,
        height: 474,
      },
    },
  ]
  const pricingPlans = getLoginPricingPlans((key) => {
    const labelMap = {
      "login.free": labels.free,
      "login.freePlanPrice": labels.freePlanPrice,
      "login.freePlanSummary": labels.freePlanSummary,
      "login.freePlanFeature1": labels.freePlanFeature1,
      "login.freePlanFeature2": labels.freePlanFeature2,
      "login.freePlanFeature3": labels.freePlanFeature3,
      "login.proPlanTitle": labels.proPlanTitle,
      "login.proPlanPrice": labels.proPlanPrice,
      "login.proPlanSummary": labels.proPlanSummary,
      "login.proPlanFeature1": labels.proPlanFeature1,
      "login.proPlanFeature2": labels.proPlanFeature2,
      "login.proPlanFeature3": labels.proPlanFeature3,
      "login.proPlanFeature4": labels.proPlanFeature4,
    } as const

    return labelMap[key]
  }).map((plan) => ({
    ...plan,
    ctaLabel: plan.id === "free" ? labels.tryFreePlan : labels.tryProPlan,
  }))
  const legalLinks = createLegalFooterLinks(locale).filter((item) => item.href !== "/login")
  const footerItems = [
    { label: labels.aboutBranch, href: "#branch-overview" },
    { label: labels.pricing, href: "#pricing-plans" },
    { label: labels.footerOrigin },
    { label: labels.footerUpdates },
    { label: labels.footerFaq },
    ...legalLinks,
  ]

  useEffect(() => {
    if (!isLoginModalOpen && !expandedBranchImage) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (expandedBranchImage) {
          setExpandedBranchImage(null)
          return
        }

        setIsLoginModalOpen(false)
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [expandedBranchImage, isLoginModalOpen])

  return (
    <div className="min-h-screen bg-(--color-app-bg) text-main">
      <header className="relative flex w-full items-center justify-between gap-6 px-2 py-6">
        <p
          className="text-left font-title text-3xl tracking-wide text-main md:text-2xl"
          style={textStyle("pacifico")}
        >
          Branch
        </p>
        <div className="hidden items-center gap-4 text-xs text-main-soft sm:flex sm:gap-6 sm:text-sm">
          <div className="flex items-center gap-2">
            <LanguageToggle compact />
            <ThemeToggle compact />
          </div>
          <Link
            href="#branch-overview"
            className="inline-flex items-center transition-colors hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
          >
            {labels.aboutBranch}
          </Link>
          <Link
            href="#pricing-plans"
            className="inline-flex items-center transition-colors hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
          >
            {labels.pricing}
          </Link>
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="inline-flex min-w-24 items-center justify-center rounded-full bg-theme-main px-4 py-2 text-center text-sm leading-none text-main transition-[filter] hover:brightness-95"
          >
            {labels.tryBranch}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          aria-expanded={isMobileMenuOpen}
          aria-label="Open navigation menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-(--color-border-soft) text-main transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) sm:hidden"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" strokeWidth={2.2} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={2.2} />
          )}
        </button>
        {isMobileMenuOpen ? (
          <div className="absolute right-0 top-full z-20 mt-2 w-[220px] rounded-[14px] border border-(--color-border-soft) bg-(--color-surface) p-3 shadow-(--color-shadow-card) sm:hidden">
            <nav aria-label="Mobile navigation">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2 px-3 py-1">
                  <LanguageToggle compact />
                  <ThemeToggle compact />
                </div>
                <Link
                  href="#branch-overview"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-main transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                >
                  {labels.aboutBranch}
                </Link>
                <Link
                  href="#pricing-plans"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-main transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                >
                  {labels.pricing}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setIsLoginModalOpen(true)
                  }}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-theme-main px-3 py-2 text-center text-sm font-medium leading-none text-main transition-[filter] hover:brightness-95"
                >
                  {labels.tryBranch}
                </button>
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="w-full px-6 py-16 md:py-20">
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-8 text-center">
            <div className="space-y-6">
              <div className="flex justify-center" aria-hidden="true">
                <Image
                  src="/icons/Branch_logo_48px_light.svg"
                  alt=""
                  width={104}
                  height={104}
                  className="h-24 w-24 dark:hidden sm:h-[104px] sm:w-[104px]"
                  priority
                />
                <Image
                  src="/icons/Branch_logo_48px_dark.svg"
                  alt=""
                  width={104}
                  height={104}
                  className="hidden h-24 w-24 dark:block sm:h-[104px] sm:w-[104px]"
                  priority
                />
              </div>
              <h1 className="text-center text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                {labels.headline}
              </h1>
              <p className="m-0 p-0 text-center text-base text-main-soft sm:text-lg">
                {labels.subline1}
                <br />
                {labels.subline2}
              </p>
            </div>
            <form action={googleSignInAction} className="pt-2 text-center">
              <GoogleSignInSubmitButton className="rounded-full transition-[filter] duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82]" />
            </form>
          </div>
          <div className="flex items-center justify-center" aria-hidden="true">
            <div className="h-80 w-full rounded-[28px] bg-theme-main sm:h-[380px] md:h-[520px]" />
          </div>
        </section>

        <section className="mx-auto mt-24 flex w-full max-w-6xl flex-col gap-20">
          <section
            id="branch-overview"
            className="px-2 py-2 sm:px-0"
          >
            <div className="max-w-3xl">
              <p className="text-base font-bold text-main-soft sm:text-lg">
                {labels.aboutBranch}
              </p>
              <h2 className="mt-3 text-xl font-bold leading-relaxed tracking-tight sm:text-2xl">
                {labels.branchSectionTitle}
              </h2>
              {labels.branchSectionDescription ? (
                <p className="mt-4 text-sm leading-7 text-main-soft sm:text-base">
                  {labels.branchSectionDescription}
                </p>
              ) : null}
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {branchHighlights.map((highlight) => (
                <article
                  key={highlight.title}
                  className="rounded-[28px] border border-(--color-border-soft) bg-(--color-surface) p-5 shadow-[var(--color-shadow-card)]"
                >
                  {highlight.image ? (
                    <button
                      type="button"
                      onClick={() => setExpandedBranchImage(highlight.image ?? null)}
                      aria-label={`${highlight.image.alt} image preview`}
                      className="mb-5 block w-full overflow-hidden rounded-[22px] border border-(--color-border-soft) bg-(--color-surface-soft) text-left transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                    >
                      <Image
                        src={highlight.image.lightSrc}
                        alt={highlight.image.alt}
                        width={highlight.image.width}
                        height={highlight.image.height}
                        className="h-auto w-full dark:hidden"
                      />
                      <Image
                        src={highlight.image.darkSrc}
                        alt={highlight.image.alt}
                        width={highlight.image.width}
                        height={highlight.image.height}
                        className="hidden h-auto w-full dark:block"
                      />
                    </button>
                  ) : null}
                  <p className="text-lg font-semibold text-main">
                    {highlight.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-main-soft">
                    {highlight.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            id="pricing-plans"
            className="px-2 py-2 sm:px-0"
          >
            <div className="mx-auto max-w-3xl">
              <p className="text-center text-lg font-bold text-main sm:text-xl">
                {labels.pricing}
              </p>
              {labels.pricingSectionTitle ? (
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {labels.pricingSectionTitle}
                </h2>
              ) : null}
              {labels.pricingSectionDescription ? (
                <p className="mt-4 text-sm leading-7 text-main-soft sm:text-base">
                  {labels.pricingSectionDescription}
                </p>
              ) : null}
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className="flex h-full flex-col rounded-[28px] border border-black/5 bg-white/80 p-6"
                >
                  <div>
                    <p className="text-3xl font-black uppercase text-main">
                      {plan.name}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-main">
                      {plan.price}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-main-soft">
                      {plan.summary}
                    </p>
                  </div>
                  <ul className="mt-4 space-y-2.5 text-sm leading-6 text-main">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.label}
                        className="flex items-start gap-3 rounded-2xl bg-(--color-app-bg) px-4 py-2.5"
                      >
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${plan.iconWrapperClass}`}
                        >
                          <feature.icon className="h-4 w-4" strokeWidth={2.1} />
                        </span>
                        <span>{feature.label}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(true)}
                    className="mt-5 rounded-full bg-theme-main px-5 py-3 text-sm font-semibold text-main transition-[filter] hover:brightness-95"
                  >
                    {plan.ctaLabel}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>

      <footer className="mt-16 border-t border-(--color-border-soft) px-6 py-12">
        <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/icons/Branch_logo_48px_light.svg"
                alt="Branch"
                width={48}
                height={48}
                className="h-12 w-12 dark:hidden"
              />
              <Image
                src="/icons/Branch_logo_48px_dark.svg"
                alt="Branch"
                width={48}
                height={48}
                className="hidden h-12 w-12 dark:block"
              />
              <span
                className="font-title text-3xl leading-none tracking-wide text-main"
                style={textStyle("pacifico")}
              >
                Branch
              </span>
            </div>
            <p className="text-sm text-main-soft sm:text-base">
              {labels.footerTagline}
            </p>
          </div>

          <nav aria-label="Footer" className="md:justify-self-end">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-4">
              {footerItems.map((item) => (
                <li key={item.label} className="text-sm font-medium text-main-soft sm:text-base">
                  {"href" in item ? (
                    <Link
                      href={item.href || "#"}
                      className="transition-colors hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>

      {expandedBranchImage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={expandedBranchImage.alt}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label={labels.closeModal}
            onClick={() => setExpandedBranchImage(null)}
            className="absolute inset-0 bg-black/65"
          />
          <div className="relative z-10 w-full max-w-6xl">
            <button
              type="button"
              onClick={() => setExpandedBranchImage(null)}
              aria-label={labels.closeModal}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <X className="h-5 w-5" strokeWidth={2.2} />
            </button>
            <div className="overflow-hidden rounded-[24px] border border-white/15 bg-(--color-app-bg) shadow-2xl">
              <Image
                src={expandedBranchImage.lightSrc}
                alt={expandedBranchImage.alt}
                width={expandedBranchImage.width}
                height={expandedBranchImage.height}
                className="h-auto max-h-[85vh] w-full object-contain dark:hidden"
                priority
              />
              <Image
                src={expandedBranchImage.darkSrc}
                alt={expandedBranchImage.alt}
                width={expandedBranchImage.width}
                height={expandedBranchImage.height}
                className="hidden h-auto max-h-[85vh] w-full object-contain dark:block"
                priority
              />
            </div>
          </div>
        </div>
      ) : null}

      {isLoginModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label={labels.closeModal}
            onClick={() => setIsLoginModalOpen(false)}
            className="absolute inset-0 bg-[#d9d9d9]/55"
          />
          <div className="relative z-10 max-h-[78vh] w-full max-w-[520px] overflow-y-auto rounded-[20px] bg-(--color-app-bg) px-4 py-4 shadow-2xl sm:px-6 sm:py-5">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              aria-label={labels.closeModal}
              className="absolute right-3 top-3 rounded-full p-1 text-[#1f1f1f] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
            >
              <X className="h-5 w-5" strokeWidth={2.2} />
            </button>

            <div className="mx-auto flex max-w-[360px] flex-col items-center text-main">
              <div className="flex items-center gap-3 pt-3 sm:pt-1">
                <Image
                  src="/icons/Branch_logo_48px_light.svg"
                  alt="Branch"
                  width={48}
                  height={48}
                  className="h-20 w-20 dark:hidden"
                  priority
                />
                <Image
                  src="/icons/Branch_logo_48px_dark.svg"
                  alt="Branch"
                  width={48}
                  height={48}
                  className="hidden h-20 w-20 dark:block"
                  priority
                />
                <span
                  className="font-title text-[36px] leading-none tracking-wide text-main"
                  style={textStyle("pacifico")}
                >
                  Branch
                </span>
              </div>

              <h2
                id="login-modal-title"
                className="mt-4 text-center text-lg font-semibold tracking-tight sm:mt-5 sm:text-2xl"
              >
                {labels.modalWelcome}
              </h2>

              <div className="mt-5 w-full max-w-[360px] space-y-3 sm:mt-6">
                <label className="block space-y-1.5">
                  <span className="block text-base font-semibold tracking-tight sm:text-lg">
                    {labels.emailLabel}
                  </span>
                  <input
                    type="email"
                    placeholder={labels.emailPlaceholder}
                    className="h-10 w-full rounded-full border border-[#d7d1cf] bg-white px-4 text-sm text-main placeholder:text-(--color-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="block text-base font-semibold tracking-tight sm:text-lg">
                    {labels.passwordLabel}
                  </span>
                  <div className="relative">
                    <input
                      type={isPasswordVisible ? "text" : "password"}
                      placeholder={labels.passwordPlaceholder}
                      className="h-10 w-full rounded-full border border-[#d7d1cf] bg-white px-4 pr-12 text-sm text-main placeholder:text-(--color-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible((current) => !current)}
                      aria-label={
                        isPasswordVisible
                          ? labels.hidePassword
                          : labels.showPassword
                      }
                      className="absolute inset-y-0 right-1 flex items-center justify-center rounded-full px-3 text-[#1f1f1f] transition-colors hover:text-main-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="h-4 w-4" strokeWidth={2.2} />
                      ) : (
                        <Eye className="h-4 w-4" strokeWidth={2.2} />
                      )}
                    </button>
                  </div>
                </label>
              </div>

              <div className="mt-5 flex w-full flex-col items-center sm:mt-6">
                <button
                  type="button"
                  disabled
                  className="min-w-[160px] rounded-full bg-theme-main px-6 py-2 text-sm font-semibold text-main opacity-70 sm:min-w-[180px]"
                >
                  {labels.loginButton}
                </button>

                <p className="mt-2 text-sm font-semibold">
                  {labels.or}
                </p>

                <form action={googleSignInAction} className="mt-2">
                  <GoogleSignInSubmitButton
                    className="rounded-full transition-[filter] duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82]"
                    imageClassName="h-auto w-[175px]"
                  />
                </form>

                <p
                  aria-disabled="true"
                  className="mt-5 cursor-not-allowed text-center text-sm font-semibold underline decoration-[1.5px] underline-offset-4 opacity-55 select-none"
                >
                  {labels.noAccount}
                </p>

                <p className="mt-2 text-center text-xs text-main-muted">
                  {labels.googleOnlyNotice}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-main-muted">
                  {legalLinks.map((item, index) => (
                    <div key={item.href} className="contents">
                      {index > 0 ? <span>·</span> : null}
                      <Link
                        href={item.href}
                        className="underline underline-offset-4 transition-colors hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                      >
                        {item.label}
                      </Link>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-center text-[11px] text-main-muted">
                  {labels.privacyNoticePrefix}
                  <Link
                    href="/privacy"
                    className="underline underline-offset-4 transition-colors hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                  >
                    {labels.privacyNoticeLink}
                  </Link>
                  {labels.privacyNoticeSuffix}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type GoogleSignInSubmitButtonProps = {
  className: string
  imageClassName?: string
}

function GoogleSignInSubmitButton({
  className,
  imageClassName,
}: GoogleSignInSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      aria-label="Sign in with Google"
      aria-busy={pending}
      disabled={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-80`}
    >
      <span className="relative inline-flex items-center justify-center">
        <span className={pending ? "opacity-0" : "opacity-100"}>
          <Image
            src="/icons/signin_light.svg"
            alt="Sign in with Google"
            width={175}
            height={40}
            className={imageClassName ? `${imageClassName} dark:hidden` : "dark:hidden"}
            priority
          />
          <Image
            src="/icons/singin_dark.svg"
            alt="Sign in with Google"
            width={175}
            height={40}
            className={imageClassName ? `${imageClassName} hidden dark:block` : "hidden dark:block"}
            priority
          />
        </span>
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" />
          </span>
        ) : null}
      </span>
    </button>
  )
}
