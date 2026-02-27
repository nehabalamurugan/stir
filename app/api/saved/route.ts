import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const saved = await prisma.savedRecipe.findMany({
    where: { userId },
    include: {
      recipe: {
        include: { tags: true, ingredients: { orderBy: { order: "asc" } }, instructions: { orderBy: { order: "asc" } }, user: { select: { id: true, name: true, avatarColor: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(saved)
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { recipeId, wantToTry } = await request.json()
  if (!recipeId) return NextResponse.json({ error: "recipeId required" }, { status: 400 })

  const saved = await prisma.savedRecipe.upsert({
    where: { userId_recipeId: { userId, recipeId } },
    update: { wantToTry: wantToTry ?? false },
    create: { userId, recipeId, wantToTry: wantToTry ?? false },
    include: { recipe: { include: { tags: true } } },
  })
  return NextResponse.json(saved)
}

export async function DELETE(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { recipeId } = await request.json()
  await prisma.savedRecipe.deleteMany({ where: { recipeId, userId } })
  return NextResponse.json({ ok: true })
}
