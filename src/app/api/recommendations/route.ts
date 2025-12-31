import { NextResponse } from "next/server"
import type { RichTextDoc } from "@/lib/rich-text"

export async function GET() {
  const content: RichTextDoc = {
    version: "1.0",
    blocks: [
      {
        type: "heading",
        level: 2,
        text: "White Wine Recommendations",
      },
      {
        type: "paragraph",
        text:
          "Here are three approachable white wines that pair well with light seafood and citrus-forward dishes.",
      },
      {
        type: "bullets",
        items: [
          "Sauvignon Blanc (New Zealand): crisp, herbal, and zesty.",
          "Albariño (Spain): briny, peachy, and great with shellfish.",
          "Riesling Kabinett (Germany): lightly sweet, high acid.",
        ],
      },
      {
        type: "numbered",
        items: [
          {
            title: "Serve temperature",
            lines: ["Sauvignon Blanc: 8-10°C", "Albariño: 8-10°C", "Riesling: 7-9°C"],
          },
          "Decanting is not required for these styles.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "If you prefer a rounder texture, look for wines with some lees aging.",
      },
      {
        type: "code",
        language: "json",
        code: JSON.stringify({ region: "Marlborough", grape: "Sauvignon Blanc" }, null, 2),
      },
    ],
  }

  return NextResponse.json({ content })
}
