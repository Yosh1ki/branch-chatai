import type { LegalLocale } from "@/lib/legal-profile"

export const createLegalFooterLinks = (locale: LegalLocale) =>
  locale === "en"
    ? [
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Service" },
        {
          href: "/commercial-transactions",
          label: "Commercial Transactions Disclosure",
        },
        { href: "/privacy-requests", label: "Privacy Requests" },
        { href: "/contact", label: "Contact" },
        { href: "/login", label: "Back to login" },
      ]
    : [
        { href: "/privacy", label: "プライバシーポリシー" },
        { href: "/terms", label: "利用規約" },
        {
          href: "/commercial-transactions",
          label: "特定商取引法に基づく表記",
        },
        { href: "/privacy-requests", label: "個人情報請求窓口" },
        { href: "/contact", label: "お問い合わせ" },
        { href: "/login", label: "ログインに戻る" },
      ]
