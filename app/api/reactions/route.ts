import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { cookHistoryId, emoji } = await request.json()
  const existing = await prisma.reaction.findUnique({
    where: { cookHistoryId_userId_emoji: { cookHistoryId, userId, emoji } },
  })
  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } })
    return NextResponse.json({ toggled: "off" })
  } else {
    const reaction = await prisma.reaction.create({
      data: { cookHistoryId, userId, emoji },
      include: { user: { select: { id: true, name: true, avatarColor: true } } },
    })
    return NextResponse.json({ toggled: "on", reaction })
  }
}
