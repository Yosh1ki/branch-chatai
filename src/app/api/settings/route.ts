import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSettingsViewData } from "@/lib/settings-view"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await getSettingsViewData(session.user.id)
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Failed to load settings:", error)
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })
  }
}
