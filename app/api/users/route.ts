import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET all users (public-safe fields only) — used for co-cook picker and feed filter chips
export async function GET(_request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, avatarColor: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(users)
}

// PATCH — update own profile (name, avatarColor)
export async function PATCH(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, avatarColor } = await request.json()
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(avatarColor ? { avatarColor } : {}),
    },
    select: { id: true, name: true, avatarColor: true, email: true },
  })
  return NextResponse.json(user)
}
