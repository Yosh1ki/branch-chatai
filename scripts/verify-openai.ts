import { auth } from "@/auth"
import { POST } from "@/app/api/chat/route"

// Mock request and auth for testing
// This is a bit complex to mock fully in a script without running the server.
// Instead, let's just create a simple script that uses the OpenAI SDK directly to verify the key works.
// And another script to check if the DB models are accessible.

import OpenAI from "openai"

async function verifyOpenAI() {
  console.log("Verifying OpenAI API Key...")
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY is not set")
    process.exit(1)
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello, are you working?" }],
    })
    console.log("OpenAI Response:", completion.choices[0].message.content)
    console.log("OpenAI Verification Successful!")
  } catch (error) {
    console.error("OpenAI Verification Failed:", error)
    process.exit(1)
  }
}

verifyOpenAI()
