import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  const { title, description, prepTime, servings, source, isFavorite, isTried, tags, ingredients, instructions } = body

  const recipe = await prisma.recipe.update({
    where: { id, userId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(prepTime !== undefined ? { prepTime: prepTime || null } : {}),
      ...(servings !== undefined ? { servings } : {}),
      ...(source !== undefined ? { source: source || null } : {}),
      ...(isFavorite !== undefined ? { isFavorite } : {}),
      ...(isTried !== undefined ? { isTried } : {}),
    },
  })

  if (tags !== undefined) {
    await prisma.recipeTag.deleteMany({ where: { recipeId: id } })
    if (tags.length > 0) {
      await prisma.recipeTag.createMany({
        data: tags.map((name: string) => ({ recipeId: id, name })),
      })
    }
  }

  if (ingredients !== undefined) {
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } })
    if (ingredients.length > 0) {
      await prisma.recipeIngredient.createMany({
        data: ingredients.map((ing: { name: string; quantity: string; unit: string }, i: number) => ({
          recipeId: id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          order: i,
        })),
      })
    }
  }

  if (instructions !== undefined) {
    await prisma.recipeInstruction.deleteMany({ where: { recipeId: id } })
    if (instructions.length > 0) {
      await prisma.recipeInstruction.createMany({
        data: instructions.map((step: string, i: number) => ({
          recipeId: id,
          step,
          order: i,
        })),
      })
    }
  }

  const updated = await prisma.recipe.findUnique({
    where: { id },
    include: {
      tags: true,
      ingredients: { orderBy: { order: "asc" } },
      instructions: { orderBy: { order: "asc" } },
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.recipe.deleteMany({ where: { id, userId } })
  return NextResponse.json({ ok: true })
}
