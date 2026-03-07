import { LegalPageShell } from "@/components/legal/legal-page-shell"
import { createLegalFooterLinks } from "@/lib/legal-links"
import { getLegalOperatorProfile } from "@/lib/legal-profile"
import { resolveRequestLocale } from "@/lib/i18n/locale"

export default async function CommercialTransactionsPage() {
  const locale = await resolveRequestLocale()
  const profile = getLegalOperatorProfile(locale)

  if (locale === "en") {
    return (
      <LegalPageShell
        backHref="/login"
        backLabel="Back to login"
        brandLabel="Branch"
        title="Commercial Transactions Disclosure"
        updatedAt="Last updated: March 7, 2026"
        intro="This page discloses the information required for paid plans offered through Branch under Japan's Act on Specified Commercial Transactions. Replace any placeholders with your actual operator details before launch."
        detailItems={[
          { label: "Service name", value: profile.serviceName },
          { label: "Seller", value: profile.operatorName },
          { label: "Representative / Operations manager", value: profile.representativeName },
          { label: "Address", value: profile.postalAddress },
          { label: "Phone number", value: profile.phoneNumber },
          { label: "Email", value: profile.supportEmail },
          {
            label: "Selling price",
            value: [
              "Free plan: no charge.",
              "Paid plans: the monthly price displayed on the purchase screen, tax included.",
            ],
          },
          {
            label: "Additional fees",
            value:
              "Internet connection fees, communication charges, and any bank transfer fees are borne by the user.",
          },
          { label: "Payment method", value: "Credit card payment via Stripe." },
          {
            label: "Payment timing",
            value:
              "The first charge occurs when you subscribe. After that, the fee is charged automatically on each renewal date.",
          },
          {
            label: "Service delivery timing",
            value: "The service becomes available immediately after payment is completed.",
          },
          {
            label: "Application validity period",
            value: "None unless a separate campaign or offer page states otherwise.",
          },
          {
            label: "How to cancel",
            value:
              "You can cancel from the settings screen through the Stripe Billing Portal before the next renewal date.",
          },
          {
            label: "Returns / refunds",
            value:
              "Because this is a digital service, refunds are generally not provided after payment except where required by law.",
          },
          {
            label: "Recommended environment",
            value: "Use the latest version of a major modern web browser.",
          },
        ]}
        sections={[
          {
            title: "1. About recurring billing",
            paragraphs: [
              "Paid plans renew automatically unless you complete the cancellation procedure before the next billing date.",
              "If you cancel during an active billing period, you can continue using the paid plan until the current paid period ends.",
            ],
          },
          {
            title: "2. Before going live",
            paragraphs: [
              "The operator name, representative name, address, phone number, and contact email on this page are currently placeholder fields if you have not filled them in yet.",
              "Do not publish paid plans until every placeholder on this page has been replaced with your real operator information.",
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
      title="特定商取引法に基づく表記"
      updatedAt="最終更新日: 2026年3月7日"
      intro="Branch の有料プランに関する、特定商取引法に基づく表示です。プレースホルダーは公開前に実際の運営者情報へ置き換えてください。"
      detailItems={[
        { label: "サービス名", value: profile.serviceName },
        { label: "販売事業者", value: profile.operatorName },
        { label: "運営統括責任者", value: profile.representativeName },
        { label: "所在地", value: profile.postalAddress },
        { label: "電話番号", value: profile.phoneNumber },
        { label: "メールアドレス", value: profile.supportEmail },
        {
          label: "販売価格",
          value: [
            "Freeプラン: 無料",
            "有料プラン: 購入画面に表示する月額料金（税込）",
          ],
        },
        {
          label: "商品代金以外の必要料金",
          value:
            "インターネット接続料金、通信料金、振込手数料等は利用者の負担となります。",
        },
        { label: "支払方法", value: "Stripe を通じたクレジットカード決済" },
        {
          label: "支払時期",
          value:
            "申込時に初回課金が行われ、その後は各契約更新日に自動で課金されます。",
        },
        {
          label: "サービス提供時期",
          value: "決済完了後、直ちに利用を開始できます。",
        },
        {
          label: "申込みの有効期限",
          value: "別途キャンペーン等で定める場合を除き、特に定めはありません。",
        },
        {
          label: "解約方法",
          value:
            "次回更新日前までに、設定画面から Stripe Billing Portal を開いて解約手続きを行ってください。",
        },
        {
          label: "返品・返金",
          value:
            "デジタルサービスの性質上、法令上必要な場合を除き、決済完了後の返金には原則対応していません。",
        },
        {
          label: "推奨動作環境",
          value: "主要なモダンブラウザの最新版をご利用ください。",
        },
      ]}
      sections={[
        {
          title: "1. 継続課金について",
          paragraphs: [
            "有料プランは、解約手続きが完了するまで自動更新されます。",
            "契約期間の途中で解約した場合でも、当該契約期間の満了までは有料プランを利用できます。",
          ],
        },
        {
          title: "2. 公開前の確認事項",
          paragraphs: [
            "販売事業者名、運営統括責任者、所在地、電話番号、メールアドレスは、未入力の場合はプレースホルダーが表示されます。",
            "有料プランを公開する前に、このページのプレースホルダーをすべて実際の運営者情報へ差し替えてください。",
          ],
        },
      ]}
      footerLinks={createLegalFooterLinks(locale)}
    />
  )
}
