import { LegalPageShell } from "@/components/legal/legal-page-shell"
import { resolveRequestLocale } from "@/lib/i18n/locale"

const jaContent = {
  backLabel: "ログインに戻る",
  brandLabel: "Branch",
  title: "お問い合わせ",
  updatedAt: "最終更新日: 2026年3月7日",
  intro:
    "Branchに関するお問い合わせ窓口ページです。現在は正式なサポート窓口の公開準備中のため、公開後にこのページへ連絡先情報を掲載します。",
  sections: [
    {
      title: "1. 現在の受付状況",
      paragraphs: [
        "現在、お問い合わせ窓口は準備中です。連絡先が確定し次第、このページに掲載します。",
        "課金、ログイン、利用制限などの重要なお知らせは、今後このページまたはサービス内で案内します。",
      ],
    },
    {
      title: "2. 公開予定の情報",
      paragraphs: [
        "今後、サポート用メールアドレスや対応時間など、必要な連絡先情報を掲載予定です。",
        "運営に関する法務情報が必要になった場合は、利用規約や今後追加されるポリシーページとあわせて案内します。",
      ],
    },
    {
      title: "3. お問い合わせ時にあると助かる情報",
      paragraphs: [
        "ログインに関する問題であれば、発生した画面、使用したGoogleアカウントの種別、発生時刻などを控えておくと確認がしやすくなります。",
        "課金に関する問題であれば、発生日、表示されたプラン状態、決済プロバイダ画面の情報などをまとめておくと対応が進めやすくなります。",
      ],
    },
  ],
  footerLinks: [
    { href: "/privacy", label: "プライバシーポリシー" },
    { href: "/terms", label: "利用規約" },
    { href: "/login", label: "ログインに戻る" },
  ],
}

const enContent = {
  backLabel: "Back to login",
  brandLabel: "Branch",
  title: "Contact",
  updatedAt: "Last updated: March 7, 2026",
  intro:
    "This is the contact page for Branch. The official support channel is not yet published, and contact details will be added here once available.",
  sections: [
    {
      title: "1. Current status",
      paragraphs: [
        "The support contact channel is currently being prepared. Once finalized, the details will be posted on this page.",
        "Important notices related to billing, login, and usage limits may also be announced here or within the product.",
      ],
    },
    {
      title: "2. Information planned for publication",
      paragraphs: [
        "Support email and response hours will be published here when available.",
        "If additional legal information becomes necessary, it will be published together with the Terms or other policy pages.",
      ],
    },
    {
      title: "3. Helpful information to prepare",
      paragraphs: [
        "For login issues, it helps to keep the screen where the issue occurred, the type of Google account used, and the time of occurrence.",
        "For billing issues, it helps to keep the date, the plan state shown in the product, and any relevant details visible in the payment provider screen.",
      ],
    },
  ],
  footerLinks: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/login", label: "Back to login" },
  ],
}

export default async function ContactPage() {
  const locale = await resolveRequestLocale()
  const content = locale === "en" ? enContent : jaContent

  return (
    <LegalPageShell
      backHref="/login"
      backLabel={content.backLabel}
      brandLabel={content.brandLabel}
      title={content.title}
      updatedAt={content.updatedAt}
      intro={content.intro}
      sections={content.sections}
      footerLinks={content.footerLinks}
    />
  )
}
