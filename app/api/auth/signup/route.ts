import { NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIE_NAME, hashPassword, createSessionToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, avatarColor, inviteToken } = await request.json()

    // Validate invite token
    if (!inviteToken || inviteToken !== process.env.INVITE_TOKEN) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 403 })
    }

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        avatarColor: avatarColor || "#6366f1",
      },
    })

    const token = createSessionToken(user.id)
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, avatarColor: user.avatarColor, email: user.email },
    })
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    })
    return response
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
