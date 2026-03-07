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
        branchSectionTitle: t("login.branchSectionTitle"),
        branchSectionDescription: t("login.branchSectionDescription"),
        branchFeature1Title: t("login.branchFeature1Title"),
        branchFeature1Description: t("login.branchFeature1Description"),
        branchFeature2Title: t("login.branchFeature2Title"),
        branchFeature2Description: t("login.branchFeature2Description"),
        branchFeature3Title: t("login.branchFeature3Title"),
        branchFeature3Description: t("login.branchFeature3Description"),
        pricingSectionTitle: t("login.pricingSectionTitle"),
        pricingSectionDescription: t("login.pricingSectionDescription"),
        freePlanSummary: t("login.freePlanSummary"),
        freePlanPrice: t("login.freePlanPrice"),
        freePlanFeature1: t("login.freePlanFeature1"),
        freePlanFeature2: t("login.freePlanFeature2"),
        freePlanFeature3: t("login.freePlanFeature3"),
        proPlanTitle: t("login.proPlanTitle"),
        proPlanSummary: t("login.proPlanSummary"),
        proPlanPrice: t("login.proPlanPrice"),
        proPlanFeature1: t("login.proPlanFeature1"),
        proPlanFeature2: t("login.proPlanFeature2"),
        proPlanFeature3: t("login.proPlanFeature3"),
        proPlanFeature4: t("login.proPlanFeature4"),
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
