import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json(user)
  } catch (err) {
    console.error("[/api/auth/me]", err)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
