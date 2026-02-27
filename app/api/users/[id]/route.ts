import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUserId = await getSessionUserId()
  if (!sessionUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, avatarColor: true, createdAt: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const [recipes, cookHistory] = await Promise.all([
    prisma.recipe.findMany({
      where: { userId: id },
      include: {
        tags: true,
        ingredients: { orderBy: { order: "asc" } },
        instructions: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cookHistory.findMany({
      where: { userId: id },
      include: {
        recipe: { include: { tags: true } },
        coCooks: { include: { user: { select: { id: true, name: true, avatarColor: true } } } },
      },
      orderBy: { date: "desc" },
      take: 20,
    }),
  ])

  return NextResponse.json({ user, recipes, cookHistory })
}
