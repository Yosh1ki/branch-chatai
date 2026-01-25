import { getOpenAIClient } from "@/lib/openai-client"

const TITLE_MODEL = "gpt-4o-mini"

export const generateChatTitle = async (content: string) => {
  const response = await getOpenAIClient().chat.completions.create({
    model: TITLE_MODEL,
    messages: [
      {
        role: "system",
        content: "Generate a concise chat title in the user's language. Return only the title.",
      },
      { role: "user", content },
    ],
    max_tokens: 40,
  })

  return response.choices[0]?.message?.content?.trim() || content.slice(0, 50)
}
