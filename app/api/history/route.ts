import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const history = await prisma.cookHistory.findMany({
    include: {
      recipe: {
        include: { tags: true, ingredients: { orderBy: { order: "asc" } }, instructions: { orderBy: { order: "asc" } } },
      },
      user: { select: { id: true, name: true, avatarColor: true } },
      reactions: { include: { user: { select: { id: true, name: true, avatarColor: true } } } },
      comments: {
        include: { user: { select: { id: true, name: true, avatarColor: true } } },
        orderBy: { createdAt: "asc" },
      },
      coCooks: { include: { user: { select: { id: true, name: true, avatarColor: true } } } },
    },
    orderBy: { date: "desc" },
  })
  return NextResponse.json(history)
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { recipeId, date, rating, note, image, coUserIds } = body

  if (!recipeId || !date || !rating) {
    return NextResponse.json({ error: "recipeId, date, and rating are required" }, { status: 400 })
  }

  const entry = await prisma.cookHistory.create({
    data: {
      userId,
      recipeId,
      date: new Date(date),
      rating: parseInt(rating),
      note: note || null,
      image: image || null,
    },
  })

  // Add co-cooks (exclude self)
  if (Array.isArray(coUserIds) && coUserIds.length > 0) {
    const others = (coUserIds as string[]).filter((id) => id !== userId)
    if (others.length > 0) {
      await prisma.cookHistoryMember.createMany({
        data: others.map((id) => ({ cookHistoryId: entry.id, userId: id })),
        skipDuplicates: true,
      })
    }
  }

  await prisma.recipe.updateMany({ where: { id: recipeId, userId }, data: { isTried: true } })
  return NextResponse.json(entry)
}
