import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const recipe = await prisma.recipe.updateMany({
    where: { id, userId },
    data: {
      ...(body.isFavorite !== undefined ? { isFavorite: body.isFavorite } : {}),
      ...(body.isTried !== undefined ? { isTried: body.isTried } : {}),
      ...(body.title ? { title: body.title } : {}),
    },
  })
  return NextResponse.json(recipe)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.recipe.deleteMany({ where: { id, userId } })
  return NextResponse.json({ ok: true })
}
