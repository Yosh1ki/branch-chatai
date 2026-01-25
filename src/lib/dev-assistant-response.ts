import type { RichTextDoc } from "@/lib/rich-text"
import { richTextDocToPlainText, serializeRichTextContent } from "@/lib/rich-text"

const DEV_ASSISTANT_DOC: RichTextDoc = {
  version: "1.0",
  blocks: [
    { type: "heading", level: 2, text: "白ワインのおすすめ" },
    {
      type: "paragraph",
      text: "好みによって選ぶと良いでしょう。代表的な白ワインを5つ挙げます。",
    },
    {
      type: "numbered",
      items: [
        {
          title: "ソーヴィニヨン・ブラン",
          lines: [
            "代表的な産地: ニュージーランド、フランス（ロワール渓谷）",
            "特徴: フレッシュで爽やかな酸味、柑橘系の香りやトロピカルフルーツの風味。",
          ],
        },
        {
          title: "シャルドネ",
          lines: [
            "代表的な産地: フランス（ブルゴーニュ）、アメリカ（カリフォルニア）",
            "特徴: 豊かでクリーミーな味わい、樽熟成によるバターやバニラのニュアンス。",
          ],
        },
        {
          title: "リースリング",
          lines: [
            "代表的な産地: ドイツ、オーストラリア",
            "特徴: 甘口から辛口まで幅広いスタイルがあり、蜜や桃の香りが特徴的。",
          ],
        },
        {
          title: "ピノ・グリージョ",
          lines: [
            "代表的な産地: イタリア、アメリカ",
            "特徴: 軽やかで飲みやすい、洋梨やリンゴの香り。",
          ],
        },
        {
          title: "グルナッシュ・ブラン",
          lines: [
            "代表的な産地: フランス（ローヌ地方）",
            "特徴: 果実味とハーブのニュアンス。",
          ],
        },
      ],
    },
    {
      type: "paragraph",
      text: "料理やシチュエーションに応じて楽しめます。好みに合わせて選んでみてください。",
    },
  ],
}

export const buildDevAssistantResponse = () => {
  return {
    text: richTextDocToPlainText(DEV_ASSISTANT_DOC),
    content: serializeRichTextContent(DEV_ASSISTANT_DOC),
  }
}
