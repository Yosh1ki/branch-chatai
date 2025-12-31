import { PrismaClient } from "@prisma/client"

const LEGACY_DEV_ASSISTANT_RESPONSE =
  "白ワインのおすすめは以下の通りです。好みによって選ぶと良いでしょう。 1. **ソーヴィニヨン・ブラン**： - **代表的な産地**：ニュージーランド、フランス（ロワール渓谷） - **特徴**：フレッシュで爽やかな酸味、柑橘系の香りやトロピカルフルーツの風味。魚料理やサラダとも相性抜群です。 2. **シャルドネ**： - **代表的な産地**：フランス（ブルゴーニュ）、アメリカ（カリフォルニア） - **特徴**：豊かでクリーミーな味わい、樽熟成によるバターやバニラのニュアンス。チキンやクリームソースの料理に合います。 3. **リースリング**： - **代表的な産地**：ドイツ、オーストラリア - **特徴**：甘口から辛口まで幅広いスタイルがあり、蜜や桃の香りが特徴的。辛口のリースリングはアジア料理とよく合います。 4. **ピノ・グリージョ**： - **代表的な産地**：イタリア、アメリカ - **特徴**：軽やかで飲みやすい、洋梨やリンゴの香り。前菜や軽い料理と相性が良いです。 5. **グルナッシュ・ブラン**： - **代表的な産地**：フランス（ローヌ地方） - **特徴**：果実味とハーブのニュアンス。魚料理や野菜料理によく合います。 これらの白ワインは、料理やシチュエーションに応じて楽しむことができるので、ぜひ試してみてください。好みに合わせて選ぶと良いでしょう。"

const LEGACY_DEV_ASSISTANT_DOC = {
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

const LEGACY_DEV_ASSISTANT_DOC_JSON = JSON.stringify(LEGACY_DEV_ASSISTANT_DOC, null, 2)

const UPDATED_DEV_ASSISTANT_RESPONSE = JSON.stringify(
  {
    format: "richjson",
    schemaVersion: "1.0",
    doc: LEGACY_DEV_ASSISTANT_DOC,
  },
  null,
  2
)

async function main() {
  const prisma = new PrismaClient()
  const result = await prisma.message.updateMany({
    where: {
      role: "assistant",
      content: {
        in: [LEGACY_DEV_ASSISTANT_RESPONSE, LEGACY_DEV_ASSISTANT_DOC_JSON],
      },
    },
    data: {
      content: UPDATED_DEV_ASSISTANT_RESPONSE,
    },
  })
  console.log(`Updated ${result.count} messages.`)
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error("Backfill failed:", error)
  process.exitCode = 1
})
