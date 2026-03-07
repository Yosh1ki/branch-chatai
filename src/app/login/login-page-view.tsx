"use client";

import Image from "next/image";
import { Eye, EyeOff, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { textStyle } from "@/styles/typography";

type LoginPageViewLabels = {
  aboutBranch: string
  mechanism: string
  howToUse: string
  features: string
  pricing: string
  free: string
  tryBranch: string
  headline: string
  subline1: string
  subline2: string
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
}

type LoginPageViewProps = {
  labels: LoginPageViewLabels
  googleSignInAction: () => Promise<void>
}

export function LoginPageView({
  labels,
  googleSignInAction,
}: LoginPageViewProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  useEffect(() => {
    if (!isLoginModalOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLoginModalOpen(false)
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isLoginModalOpen])

  return (
    <div className="min-h-screen bg-(--color-app-bg) text-main">
      <header className="flex w-full items-center justify-between gap-6 px-2 py-6">
        <p
          className="text-left font-title text-3xl tracking-wide text-main md:text-2xl"
          style={textStyle("pacifico")}
        >
          Branch
        </p>
        <div className="flex items-center gap-4 text-xs text-main-soft sm:gap-6 sm:text-sm">
          <div className="group relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 transition-colors hover:text-main focus-visible:outline-none"
              aria-haspopup="true"
            >
              {labels.aboutBranch}
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3 w-3 transition-colors"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.7a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div className="absolute left-0 top-full z-10 mt-0 hidden w-40 rounded-xl border border-black/5 bg-white/95 p-2 text-main shadow-lg backdrop-blur-sm group-hover:block group-focus-within:block">
              <button
                type="button"
                className="w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
              >
                {labels.mechanism}
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
              >
                {labels.howToUse}
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
              >
                {labels.features}
              </button>
            </div>
          </div>
          <div className="group relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 transition-colors hover:text-main focus-visible:outline-none"
              aria-haspopup="true"
            >
              {labels.pricing}
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3 w-3 transition-colors"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.7a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div className="absolute left-0 top-full z-10 mt-0 hidden w-36 rounded-xl border border-black/5 bg-white/95 p-2 text-main shadow-lg backdrop-blur-sm group-hover:block group-focus-within:block">
              <button
                type="button"
                className="w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
              >
                {labels.free}
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
              >
                Pro
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
              >
                FAQ
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="rounded-full bg-theme-main px-4 py-2 text-sm text-main transition-[filter] hover:brightness-95"
          >
            {labels.tryBranch}
          </button>
        </div>
      </header>

      <main className="grid w-full flex-1 gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:py-20">
        <section className="space-y-8 text-center">
          <div className="space-y-6">
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
            <button
              type="submit"
              aria-label="Sign in with Google"
              className="rounded-full transition-[filter] duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82]"
            >
              <Image
                src="/icons/signin_light.svg"
                alt="Sign in with Google"
                width={175}
                height={40}
                className="dark:hidden"
                priority
              />
              <Image
                src="/icons/singin_dark.svg"
                alt="Sign in with Google"
                width={175}
                height={40}
                className="hidden dark:block"
                priority
              />
            </button>
          </form>
        </section>
        <div className="flex items-center justify-center" aria-hidden="true">
          <div className="h-80 w-full rounded-[28px] bg-theme-main sm:h-[380px] md:h-[520px]" />
        </div>
      </main>

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
                  <button
                    type="submit"
                    aria-label="Sign in with Google"
                    className="rounded-full transition-[filter] duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82]"
                  >
                    <Image
                      src="/icons/signin_light.svg"
                      alt="Sign in with Google"
                      width={175}
                      height={40}
                      className="h-auto w-[175px] dark:hidden"
                    />
                    <Image
                      src="/icons/singin_dark.svg"
                      alt="Sign in with Google"
                      width={175}
                      height={40}
                      className="hidden h-auto w-[175px] dark:block"
                    />
                  </button>
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
                  <Link
                    href="/terms"
                    className="underline underline-offset-4 transition-colors hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                  >
                    利用規約
                  </Link>
                  <span>·</span>
                  <Link
                    href="/contact"
                    className="underline underline-offset-4 transition-colors hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
                  >
                    お問い合わせ
                  </Link>
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
