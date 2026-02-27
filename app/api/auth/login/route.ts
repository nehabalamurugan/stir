import { NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIE_NAME, verifyPassword, createSessionToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const token = createSessionToken(user.id)
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, avatarColor: user.avatarColor, email: user.email },
    })
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === "production",
    })
    return response
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
