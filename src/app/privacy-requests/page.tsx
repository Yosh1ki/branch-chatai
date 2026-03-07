import { LegalPageShell } from "@/components/legal/legal-page-shell"
import { createLegalFooterLinks } from "@/lib/legal-links"
import { getLegalOperatorProfile } from "@/lib/legal-profile"
import { resolveRequestLocale } from "@/lib/i18n/locale"

export default async function PrivacyRequestsPage() {
  const locale = await resolveRequestLocale()
  const profile = getLegalOperatorProfile(locale)

  if (locale === "en") {
    return (
      <LegalPageShell
        backHref="/login"
        backLabel="Back to login"
        brandLabel="Branch"
        title="Privacy Requests"
        updatedAt="Last updated: March 7, 2026"
        intro="This page explains how to submit requests related to personal information handled by Branch, including disclosure, correction, deletion, and suspension of use. Replace the placeholder contact fields before launch."
        detailItems={[
          { label: "Request contact", value: profile.privacyRequestEmail },
          { label: "Support email", value: profile.supportEmail },
          { label: "Phone number", value: profile.phoneNumber },
          { label: "Support hours", value: profile.supportHours },
          {
            label: "Available request types",
            value: [
              "Disclosure of retained personal information",
              "Correction, addition, or deletion",
              "Suspension of use or erasure",
              "Suspension of third-party provision where applicable",
            ],
          },
          {
            label: "Identity verification",
            value:
              "We may ask you to confirm your registered email address or provide other information reasonably necessary to verify your identity.",
          },
          {
            label: "Response timing",
            value:
              "After receiving the request and any required verification details, we will respond within a reasonable period under applicable law.",
          },
        ]}
        sections={[
          {
            title: "1. What to include in your request",
            paragraphs: [
              "Please include your name, the email address associated with your Branch account, the type of request you are making, and the details you want us to review.",
              "If the request concerns a specific account or billing action, including the relevant date, plan status, and a short description will help speed up the review.",
            ],
          },
          {
            title: "2. Cases where we may need more information",
            paragraphs: [
              "If we cannot verify your identity or understand the scope of your request, we may ask for additional information before proceeding.",
              "If a request cannot be fulfilled because of a legal exception, data retention duty, or a technical limitation, we will explain the reason in our response.",
            ],
          },
          {
            title: "3. Before going live",
            paragraphs: [
              "The request contact, support email, phone number, and support hours on this page are placeholder values until you fill them in.",
              "Do not treat this page as launch-ready until the contact destination is updated to your real privacy request channel.",
            ],
          },
        ]}
        footerLinks={createLegalFooterLinks(locale)}
      />
    )
  }

  return (
    <LegalPageShell
      backHref="/login"
      backLabel="ログインに戻る"
      brandLabel="Branch"
      title="個人情報請求窓口"
      updatedAt="最終更新日: 2026年3月7日"
      intro="Branch が取り扱う個人情報について、開示・訂正・削除・利用停止等の請求を行うための窓口案内です。連絡先のプレースホルダーは公開前に実際の情報へ置き換えてください。"
      detailItems={[
        { label: "請求受付メールアドレス", value: profile.privacyRequestEmail },
        { label: "サポートメールアドレス", value: profile.supportEmail },
        { label: "電話番号", value: profile.phoneNumber },
        { label: "対応時間", value: profile.supportHours },
        {
          label: "受け付ける請求の例",
          value: [
            "保有個人データの開示",
            "訂正、追加、削除",
            "利用停止、消去",
            "第三者提供停止の請求（該当する場合）",
          ],
        },
        {
          label: "本人確認",
          value:
            "登録済みメールアドレスの確認その他、本人確認に合理的に必要な情報の提示をお願いする場合があります。",
        },
        {
          label: "回答時期の目安",
          value:
            "請求内容と本人確認に必要な情報がそろい次第、法令に従って合理的な期間内に回答します。",
        },
      ]}
      sections={[
        {
          title: "1. 請求時に記載してほしい内容",
          paragraphs: [
            "氏名、Branch アカウントに登録しているメールアドレス、請求の種類、確認したい内容を記載してください。",
            "特定のアカウント操作や課金状態に関する請求の場合は、発生日、プラン状態、対象内容をあわせて記載すると確認がスムーズです。",
          ],
        },
        {
          title: "2. 追加確認が必要になる場合",
          paragraphs: [
            "本人確認ができない場合や請求内容の範囲が不明確な場合は、追加情報の提供をお願いすることがあります。",
            "法令上の例外、保存義務、技術的制約などにより請求に応じられない場合は、その理由を回答時に案内します。",
          ],
        },
        {
          title: "3. 公開前の確認事項",
          paragraphs: [
            "このページの請求受付メールアドレス、サポートメールアドレス、電話番号、対応時間は、未入力の場合はプレースホルダーが表示されます。",
            "公開前に、実際に受け付ける個人情報請求窓口の連絡先へ差し替えてください。",
          ],
        },
      ]}
      footerLinks={createLegalFooterLinks(locale)}
    />
  )
}
