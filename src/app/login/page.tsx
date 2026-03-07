import Image from "next/image";

import { signIn } from "@/auth";
import { textStyle } from "@/styles/typography";
import { createTranslator } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/locale";

export default async function LoginPage() {
    const locale = await resolveRequestLocale()
    const t = createTranslator(locale)
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
                            {t("login.aboutBranch")}
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
                                {t("login.mechanism")}
                            </button>
                            <button
                                type="button"
                                className="w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
                            >
                                {t("login.howToUse")}
                            </button>
                            <button
                                type="button"
                                className="w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
                            >
                                {t("login.features")}
                            </button>
                        </div>
                    </div>
                    <div className="group relative">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 transition-colors hover:text-main focus-visible:outline-none"
                            aria-haspopup="true"
                        >
                            {t("login.pricing")}
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
                                {t("login.free")}
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
                        className="rounded-full bg-theme-main px-4 py-2 text-sm text-main transition-[filter] hover:brightness-95"
                    >
                        {t("login.tryBranch")}
                    </button>
                </div>
            </header>
            <main className="grid w-full flex-1 gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:py-20">
                <section className="space-y-8 text-center">
                    <div className="space-y-6">
                        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl text-center">
                            {t("login.headline")}
                        </h1>
                        <p className="text-base text-main-soft sm:text-lg text-center m-0 p-0">
                            {t("login.subline1")}
                            <br />
                            {t("login.subline2")}
                        </p>
                    </div>
                    <form
                        className="pt-2 text-center"
                        action={async () => {
                            "use server";
                            await signIn("google", {
                                redirectTo: "/chats",
                            });
                        }}
                    >
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
                <div
                    className="flex items-center justify-center"
                    aria-hidden="true"
                >
                    <div className="h-80 w-full rounded-[28px] bg-theme-main sm:h-[380px] md:h-[520px]" />
                </div>
            </main>
        </div>
    );
}
