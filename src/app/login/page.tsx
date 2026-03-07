import { signIn } from "@/auth";
import { createTranslator } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/locale";
import { LoginPageView } from "./login-page-view";

export default async function LoginPage() {
  const locale = await resolveRequestLocale()
  const t = createTranslator(locale)

  const googleSignInAction = async () => {
    "use server";
    await signIn("google", {
      redirectTo: "/chats",
    })
  }

  return (
    <LoginPageView
      googleSignInAction={googleSignInAction}
      labels={{
        aboutBranch: t("login.aboutBranch"),
        mechanism: t("login.mechanism"),
        howToUse: t("login.howToUse"),
        features: t("login.features"),
        pricing: t("login.pricing"),
        free: t("login.free"),
        tryBranch: t("login.tryBranch"),
        headline: t("login.headline"),
        subline1: t("login.subline1"),
        subline2: t("login.subline2"),
        modalWelcome: t("login.modalWelcome"),
        emailLabel: t("login.emailLabel"),
        emailPlaceholder: t("login.emailPlaceholder"),
        passwordLabel: t("login.passwordLabel"),
        passwordPlaceholder: t("login.passwordPlaceholder"),
        loginButton: t("login.loginButton"),
        googleOnlyNotice: t("login.googleOnlyNotice"),
        or: t("login.or"),
        noAccount: t("login.noAccount"),
        privacyNoticePrefix: t("login.privacyNoticePrefix"),
        privacyNoticeLink: t("login.privacyNoticeLink"),
        privacyNoticeSuffix: t("login.privacyNoticeSuffix"),
        closeModal: t("login.closeModal"),
        showPassword: t("login.showPassword"),
        hidePassword: t("login.hidePassword"),
      }}
    />
  )
}
