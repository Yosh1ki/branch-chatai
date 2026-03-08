import OpenAI from "openai"
import { OPENAI_API_BASE_URL } from "@/lib/model-invoker-errors"

let openAIClient: OpenAI | null = null

export const getOpenAIClient = () => {
  if (openAIClient) {
    return openAIClient
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  openAIClient = new OpenAI({
    apiKey,
    baseURL: OPENAI_API_BASE_URL,
  })
  return openAIClient
}
