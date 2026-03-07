import { LegalPageShell } from "@/components/legal/legal-page-shell"
import { resolveRequestLocale } from "@/lib/i18n/locale"

const jaContent = {
  backLabel: "ログインに戻る",
  brandLabel: "Branch",
  title: "プライバシーポリシー",
  updatedAt: "最終更新日: 2026年3月7日",
  intro:
    "本ポリシーは、Branchが提供するAIチャットサービスにおいて、利用者情報をどのように取得、利用、保存、共有するかを説明するものです。",
  sections: [
    {
      title: "1. 取得する情報",
      paragraphs: [
        "当サービスは、Googleログイン時に提供される氏名、メールアドレス、ユーザー識別子などのアカウント情報を取得する場合があります。",
        "また、チャット入力内容、生成結果、利用状況、トークン使用量、課金状態など、サービス提供に必要な利用データを保存する場合があります。",
      ],
    },
    {
      title: "2. 利用目的",
      paragraphs: [
        "取得した情報は、認証、チャット履歴の保存、利用制限の管理、課金状態の確認、サポート対応、サービス改善のために利用します。",
        "不正利用の防止、障害調査、重要なお知らせの通知など、サービス運営上必要な目的でも利用することがあります。",
      ],
    },
    {
      title: "3. 外部サービスとの連携",
      paragraphs: [
        "当サービスは、Google認証、AIモデル提供事業者、決済事業者などの外部サービスと連携する場合があります。",
        "利用者が入力した内容やアカウント関連情報の一部は、機能提供に必要な範囲でこれらの事業者に送信されることがあります。",
      ],
    },
    {
      title: "4. 保存と管理",
      paragraphs: [
        "取得した情報は、サービス提供に必要な期間保存し、不要になった情報は合理的な範囲で削除または匿名化します。",
        "運営者は、漏えい、滅失、改ざん、不正アクセスなどを防止するために、合理的な安全管理措置を講じます。",
      ],
    },
    {
      title: "5. 第三者提供",
      paragraphs: [
        "法令に基づく場合、またはサービス提供に必要な委託・連携先への共有を除き、利用者情報を第三者へ提供しません。",
        "決済、認証、AI推論などの外部処理に伴う共有は、本ポリシーに基づく提供に含まれます。",
      ],
    },
    {
      title: "6. 利用者の確認事項",
      paragraphs: [
        "機密情報、個人情報、業務上重要な情報を入力する際は、利用者自身の判断と責任で行ってください。",
        "AI出力の正確性や適法性は自動的に保証されないため、重要な用途では利用者自身で確認してください。",
      ],
    },
    {
      title: "7. 改定",
      paragraphs: [
        "本ポリシーは、必要に応じて改定されることがあります。",
        "重要な変更がある場合は、サービス上の表示その他合理的な方法で周知します。",
      ],
    },
  ],
  footerLinks: [
    { href: "/terms", label: "利用規約" },
    { href: "/contact", label: "お問い合わせ" },
    { href: "/login", label: "ログインに戻る" },
  ],
}

const enContent = {
  backLabel: "Back to login",
  brandLabel: "Branch",
  title: "Privacy Policy",
  updatedAt: "Last updated: March 7, 2026",
  intro:
    "This Policy explains how Branch collects, uses, stores, and shares user information in connection with its AI chat service.",
  sections: [
    {
      title: "1. Information we collect",
      paragraphs: [
        "We may collect account information provided through Google sign-in, including name, email address, and user identifiers.",
        "We may also store service usage data required to operate the product, such as chat inputs, generated outputs, usage records, token totals, and billing state.",
      ],
    },
    {
      title: "2. Purposes of use",
      paragraphs: [
        "Collected information is used for authentication, storing chat history, enforcing usage limits, checking billing status, support, and product improvement.",
        "It may also be used to prevent abuse, investigate incidents, and deliver important service notices.",
      ],
    },
    {
      title: "3. External services",
      paragraphs: [
        "The service may integrate with external providers such as Google authentication, AI model vendors, and payment processors.",
        "Some user inputs and account-related information may be sent to those providers to the extent necessary to provide the service.",
      ],
    },
    {
      title: "4. Storage and security",
      paragraphs: [
        "Information is retained for as long as reasonably necessary to provide the service, and may later be deleted or anonymized.",
        "The operator implements reasonable safeguards to prevent leakage, loss, tampering, and unauthorized access.",
      ],
    },
    {
      title: "5. Sharing with third parties",
      paragraphs: [
        "We do not provide user information to third parties except where required by law or necessary for entrusted processing and service integrations.",
        "Sharing related to payment, authentication, and AI inference is included within the scope of this Policy.",
      ],
    },
    {
      title: "6. User responsibility",
      paragraphs: [
        "Users should exercise their own judgment before submitting confidential, personal, or business-critical information.",
        "AI outputs are not automatically guaranteed to be accurate or compliant, so users must verify important uses on their own.",
      ],
    },
    {
      title: "7. Updates",
      paragraphs: [
        "This Policy may be updated when necessary.",
        "If material changes are made, notice will be provided through the service or another reasonable method.",
      ],
    },
  ],
  footerLinks: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/contact", label: "Contact" },
    { href: "/login", label: "Back to login" },
  ],
}

export default async function PrivacyPage() {
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
