import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import {
  getStoredThemePreference,
  parseThemePreference,
  saveThemePreference,
} from "@/lib/theme-preference"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const themePreference = await getStoredThemePreference(prisma, session.user.id)
    return NextResponse.json({ themePreference })
  } catch (error) {
    console.error("Failed to load theme preference:", error)
    return NextResponse.json({ error: "Failed to load theme preference" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { themePreference?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const nextThemePreference = parseThemePreference(body.themePreference)

  try {
    const themePreference = await saveThemePreference(prisma, session.user.id, nextThemePreference)
    return NextResponse.json({ themePreference })
  } catch (error) {
    console.error("Failed to save theme preference:", error)
    return NextResponse.json({ error: "Failed to save theme preference" }, { status: 500 })
  }
}
