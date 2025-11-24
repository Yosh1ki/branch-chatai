import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Session } from "next-auth"
import prisma from "@/lib/prisma"

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
})

// google認証を無効にするためのラッパー
export const { handlers, signIn, signOut } = nextAuth
const { auth: baseAuth } = nextAuth

export async function auth(): Promise<Session | null> {
  if (process.env.AUTH_DISABLED === "true") {
    const id = process.env.AUTH_DISABLED_USER_ID ?? "dev-user-id"
    const email = process.env.AUTH_DISABLED_EMAIL ?? "dev@example.com"
    const name = process.env.AUTH_DISABLED_NAME ?? "Dev User"

    await prisma.user.upsert({
      where: { id },
      update: { email, name },
      create: { id, email, name, planType: "free" },
    })

    const mockSession: Session = {
      user: { id, email, name },
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    }
    return mockSession
  }

  return baseAuth()
}
