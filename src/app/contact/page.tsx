import { LegalPageShell } from "@/components/legal/legal-page-shell"
import { createLegalFooterLinks } from "@/lib/legal-links"
import { getLegalOperatorProfile } from "@/lib/legal-profile"
import { resolveRequestLocale } from "@/lib/i18n/locale"

export default async function ContactPage() {
  const locale = await resolveRequestLocale()
  const profile = getLegalOperatorProfile(locale)

  if (locale === "en") {
    return (
      <LegalPageShell
        backHref="/login"
        backLabel="Back to login"
        brandLabel="Branch"
        title="Contact"
        updatedAt="Last updated: March 7, 2026"
        intro="This page lists the public support contact for Branch. Replace the placeholders with your real support details before launch."
        detailItems={[
          { label: "Operator", value: profile.operatorName },
          { label: "Support email", value: profile.supportEmail },
          { label: "Phone number", value: profile.phoneNumber },
          { label: "Support hours", value: profile.supportHours },
          { label: "Address", value: profile.postalAddress },
        ]}
        sections={[
          {
            title: "1. What you can contact us about",
            paragraphs: [
              "You can use this contact channel for questions about login, billing, usage limits, product issues, and general inquiries about Branch.",
              "Requests related to personal information should be sent according to the guidance on the Privacy Requests page.",
            ],
          },
          {
            title: "2. Helpful details to include",
            paragraphs: [
              "For login issues, include the screen where the issue occurred, the type of Google account you used, and when the issue happened.",
              "For billing issues, include the date, the plan status shown in the product, and any relevant information visible in the payment provider screen.",
            ],
          },
          {
            title: "3. Before going live",
            paragraphs: [
              "The operator, support email, phone number, support hours, and address shown above are placeholder values until you fill them in.",
              "Do not treat this page as final until the real support contact details are published.",
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
      title="お問い合わせ"
      updatedAt="最終更新日: 2026年3月7日"
      intro="Branch の公開用サポート窓口ページです。プレースホルダーは公開前に実際の連絡先情報へ置き換えてください。"
      detailItems={[
        { label: "運営者名", value: profile.operatorName },
        { label: "サポートメールアドレス", value: profile.supportEmail },
        { label: "電話番号", value: profile.phoneNumber },
        { label: "対応時間", value: profile.supportHours },
        { label: "住所", value: profile.postalAddress },
      ]}
      sections={[
        {
          title: "1. 受け付けるお問い合わせ",
          paragraphs: [
            "ログイン、課金、利用制限、不具合、その他 Branch に関する一般的なお問い合わせを受け付けます。",
            "個人情報に関する開示・訂正・削除・利用停止等の請求は、個人情報請求窓口ページの案内に従って連絡してください。",
          ],
        },
        {
          title: "2. 連絡時にあると助かる情報",
          paragraphs: [
            "ログインに関する問題であれば、発生した画面、使用した Google アカウントの種別、発生時刻などを記載してください。",
            "課金に関する問題であれば、発生日、表示されたプラン状態、決済画面上の情報などを記載すると確認がスムーズです。",
          ],
        },
        {
          title: "3. 公開前の確認事項",
          paragraphs: [
            "上部に表示している運営者名、メールアドレス、電話番号、対応時間、住所は、未入力の場合はプレースホルダーが表示されます。",
            "公開前に、実際に利用者が連絡できる窓口情報へ差し替えてください。",
          ],
        },
      ]}
      footerLinks={createLegalFooterLinks(locale)}
    />
  )
}
