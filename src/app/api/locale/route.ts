import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { SUPPORTED_LOCALES, type LocaleCode } from "@/lib/i18n/types"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

const isLocaleCode = (value: unknown): value is LocaleCode =>
  typeof value === "string" &&
  (SUPPORTED_LOCALES as readonly string[]).includes(value)

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { locale?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!isLocaleCode(body.locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 })
  }

  const response = NextResponse.json({ locale: body.locale })
  response.cookies.set("locale", body.locale, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: true,
  })

  return response
}
