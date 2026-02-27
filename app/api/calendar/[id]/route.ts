import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const entry = await prisma.calendarEntry.updateMany({
    where: { id, userId },
    data: {
      ...(body.isLogged !== undefined ? { isLogged: body.isLogged } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.recipeId !== undefined ? { recipeId: body.recipeId } : {}),
      ...(body.mealSlot ? { mealSlot: body.mealSlot } : {}),
    },
  })
  return NextResponse.json(entry)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.calendarEntry.deleteMany({ where: { id, userId } })
  return NextResponse.json({ ok: true })
}
