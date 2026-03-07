import { LegalPageShell } from "@/components/legal/legal-page-shell"
import { resolveRequestLocale } from "@/lib/i18n/locale"

const jaContent = {
  backLabel: "ログインに戻る",
  brandLabel: "Branch",
  title: "利用規約",
  updatedAt: "最終更新日: 2026年3月7日",
  intro:
    "本規約は、Branchが提供するAIチャットサービスの利用条件を定めるものです。利用者は、本サービスを利用した時点で本規約に同意したものとみなされます。",
  sections: [
    {
      title: "1. 適用範囲",
      paragraphs: [
        "本規約は、BranchのWebサービス、関連ページ、ならびにこれらに付随する機能の利用に適用されます。",
        "運営者が本サービス上で別途定めるルールや注意事項は、本規約の一部を構成します。",
      ],
    },
    {
      title: "2. アカウント",
      paragraphs: [
        "利用者は、Googleログインその他運営者が定める認証手段を通じて本サービスを利用できます。",
        "利用者は、自身のアカウント情報の管理責任を負い、不正利用が判明した場合は速やかに運営者へ通知するものとします。",
      ],
    },
    {
      title: "3. 禁止事項",
      paragraphs: [
        "法令または公序良俗に反する行為、第三者の権利侵害、サービス運営を妨害する行為を禁止します。",
        "本サービスの不具合、仕様、制限を意図的に悪用する行為、または過度な負荷を与える利用を禁止します。",
      ],
    },
    {
      title: "4. AI出力と利用者コンテンツ",
      paragraphs: [
        "本サービス上で入力されたテキストおよび生成結果は、モデル提供事業者を含む外部サービスを通じて処理される場合があります。",
        "AIの出力には誤り、不完全な情報、不適切な内容が含まれる可能性があります。重要な判断は利用者自身の責任で確認してください。",
      ],
    },
    {
      title: "5. 料金とプラン",
      paragraphs: [
        "本サービスには無料プランと有料プランがあり、利用上限、課金条件、提供機能はサービス画面または別途表示する内容に従います。",
        "有料プランの課金、更新、解約、返金の取扱いは、決済事業者の仕組みおよび運営者が別途定める条件に従います。",
      ],
    },
    {
      title: "6. 免責",
      paragraphs: [
        "運営者は、本サービスの継続性、完全性、正確性、特定目的適合性を保証しません。",
        "運営者は、本サービスの利用または利用不能により生じた損害について、運営者に故意または重過失がある場合を除き、責任を負いません。",
      ],
    },
    {
      title: "7. 変更・終了",
      paragraphs: [
        "運営者は、必要に応じて本サービスの内容を変更し、または提供を終了できるものとします。",
        "本規約を変更する場合、運営者は合理的な方法で周知し、変更後に利用が継続されたときは改定内容に同意したものとみなします。",
      ],
    },
  ],
  footerLinks: [
    { href: "/privacy", label: "プライバシーポリシー" },
    { href: "/contact", label: "お問い合わせ" },
    { href: "/login", label: "ログインに戻る" },
  ],
}

const enContent = {
  backLabel: "Back to login",
  brandLabel: "Branch",
  title: "Terms of Service",
  updatedAt: "Last updated: March 7, 2026",
  intro:
    "These Terms govern the use of Branch and its AI chat features. By using the service, you agree to these Terms.",
  sections: [
    {
      title: "1. Scope",
      paragraphs: [
        "These Terms apply to the Branch web service, related pages, and all associated features.",
        "Any separate rules or notices posted by the operator form part of these Terms.",
      ],
    },
    {
      title: "2. Accounts",
      paragraphs: [
        "Users may access the service through Google sign-in or other authentication methods designated by the operator.",
        "Users are responsible for managing their own account access and must promptly notify the operator of any unauthorized use.",
      ],
    },
    {
      title: "3. Prohibited conduct",
      paragraphs: [
        "Users may not violate laws, public policy, or third-party rights, or interfere with operation of the service.",
        "Users may not intentionally exploit bugs, limits, or specifications of the service, or impose excessive load on it.",
      ],
    },
    {
      title: "4. AI output and user content",
      paragraphs: [
        "Text submitted to the service and generated output may be processed through external providers, including model vendors.",
        "AI output may contain errors, incomplete information, or inappropriate content. Users are responsible for verifying important decisions.",
      ],
    },
    {
      title: "5. Plans and billing",
      paragraphs: [
        "The service may include free and paid plans. Usage limits, billing terms, and available features are governed by the information shown in the product.",
        "Billing, renewals, cancellations, and refunds for paid plans are subject to the payment provider workflow and any separate conditions published by the operator.",
      ],
    },
    {
      title: "6. Disclaimer",
      paragraphs: [
        "The operator does not guarantee uninterrupted availability, completeness, accuracy, or fitness for a particular purpose.",
        "Except in cases of willful misconduct or gross negligence, the operator is not liable for damages arising from the use of or inability to use the service.",
      ],
    },
    {
      title: "7. Changes and termination",
      paragraphs: [
        "The operator may modify or discontinue the service when necessary.",
        "If these Terms are updated, the operator will provide notice through a reasonable method. Continued use after the update constitutes acceptance of the revised Terms.",
      ],
    },
  ],
  footerLinks: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/contact", label: "Contact" },
    { href: "/login", label: "Back to login" },
  ],
}

export default async function TermsPage() {
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
