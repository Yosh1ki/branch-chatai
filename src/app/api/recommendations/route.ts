import { NextResponse } from "next/server"
import { recommendationsDoc } from "@/lib/recommendations-data"

export async function GET() {
  return NextResponse.json({ content: recommendationsDoc })
}
