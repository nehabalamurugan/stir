import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = process.env.INVITE_TOKEN
  if (!token) return NextResponse.json({ link: null })

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const link = `${origin}/signup?token=${encodeURIComponent(token)}`
  return NextResponse.json({ link })
}
