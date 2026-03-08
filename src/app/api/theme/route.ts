import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import {
  THEME_PREFERENCE_COOKIE_KEY,
  getStoredThemePreference,
  parseThemePreference,
  saveThemePreference,
} from "@/lib/theme-preference"
import { NextResponse } from "next/server"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ themePreference: parseThemePreference(undefined) })
  }

  const userId = session.user.id;

  try {
    const themePreference = await getStoredThemePreference(prisma, userId)
    return NextResponse.json({ themePreference })
  } catch (error) {
    console.error("Failed to load theme preference:", error)
    return NextResponse.json({ error: "Failed to load theme preference" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()

  let body: { themePreference?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const nextThemePreference = parseThemePreference(body.themePreference)
  const userId = session?.user?.id

  try {
    const themePreference = userId
      ? await saveThemePreference(prisma, userId, nextThemePreference)
      : nextThemePreference

    const response = NextResponse.json({ themePreference })
    response.cookies.set(THEME_PREFERENCE_COOKIE_KEY, themePreference, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR_SECONDS,
      httpOnly: true,
    })

    return response
  } catch (error) {
    console.error("Failed to save theme preference:", error)
    return NextResponse.json({ error: "Failed to save theme preference" }, { status: 500 })
  }
}
