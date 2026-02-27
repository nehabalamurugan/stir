import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const favorites = searchParams.get("favorites") === "true"
  const tried = searchParams.get("tried") === "true"
  const search = searchParams.get("search") || ""

  const recipes = await prisma.recipe.findMany({
    where: {
      userId,
      ...(favorites ? { isFavorite: true } : {}),
      ...(tried ? { isTried: true } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      tags: true,
      ingredients: { orderBy: { order: "asc" } },
      instructions: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(recipes)
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { title, description, image, servings, prepTime, source, tags, ingredients, instructions } = body

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })

  const recipe = await prisma.recipe.create({
    data: {
      userId,
      title,
      description: description || null,
      image: image || null,
      servings: servings || 4,
      prepTime: prepTime || null,
      source: source || null,
      tags: tags?.length ? { create: tags.map((name: string) => ({ name })) } : undefined,
      ingredients: ingredients?.length
        ? { create: ingredients.map((ing: { name: string; quantity: string; unit: string }, i: number) => ({ ...ing, order: i })) }
        : undefined,
      instructions: instructions?.length
        ? { create: instructions.map((step: string, i: number) => ({ step, order: i })) }
        : undefined,
    },
    include: { tags: true, ingredients: { orderBy: { order: "asc" } }, instructions: { orderBy: { order: "asc" } } },
  })
  return NextResponse.json(recipe)
}
