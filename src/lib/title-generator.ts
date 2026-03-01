import { getOpenAIClient } from "@/lib/openai-client"
import { fallbackChatTitle, inferChatTitleLocale, isVerbatimTitle } from "@/lib/chat-title"
import type { LocaleCode } from "@/lib/i18n/types"

const TITLE_MODEL = "gpt-4o-mini"

type GenerateChatTitleOptions = {
  locale?: LocaleCode
}

export const generateChatTitle = async (content: string, options: GenerateChatTitleOptions = {}) => {
  const locale = options.locale ?? inferChatTitleLocale(content)
  const languageInstruction = locale === "ja" ? "Japanese" : "English"

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: TITLE_MODEL,
      messages: [
        {
          role: "system",
          content: `Generate a concise chat title in ${languageInstruction}. Return only the title. Do not copy the user message verbatim.`,
        },
        { role: "user", content },
      ],
      max_completion_tokens: 40,
    })

    const title = response.choices[0]?.message?.content?.trim()
    if (!title || isVerbatimTitle(title, content)) {
      return fallbackChatTitle(locale)
    }
    return title
  } catch (error) {
    console.error("Failed to generate chat title:", error)
    return fallbackChatTitle(locale)
  }
}
