import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { cookHistoryId, text } = await request.json()
  if (!cookHistoryId || !text?.trim()) {
    return NextResponse.json({ error: "cookHistoryId and text are required" }, { status: 400 })
  }

  const comment = await prisma.comment.create({
    data: { cookHistoryId, userId, text: text.trim() },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  })
  return NextResponse.json(comment)
}

export async function DELETE(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await request.json()
  await prisma.comment.deleteMany({ where: { id, userId } })
  return NextResponse.json({ ok: true })
}
