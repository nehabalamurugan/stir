import { NextRequest, NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")

  let dateFrom: Date, dateTo: Date
  if (month) {
    const [year, mon] = month.split("-").map(Number)
    dateFrom = new Date(year, mon - 1, 1)
    dateTo = new Date(year, mon, 1)
  } else {
    const now = new Date()
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }

  const entries = await prisma.calendarEntry.findMany({
    where: { userId, date: { gte: dateFrom, lt: dateTo } },
    include: { recipe: { include: { tags: true } } },
    orderBy: { date: "asc" },
  })
  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { date, mealSlot, recipeId, note, isLogged } = body

  if (!date || !mealSlot) {
    return NextResponse.json({ error: "date and mealSlot are required" }, { status: 400 })
  }

  const entry = await prisma.calendarEntry.create({
    data: {
      userId,
      date: new Date(date),
      mealSlot,
      recipeId: recipeId || null,
      note: note || null,
      isLogged: isLogged ?? false,
    },
    include: { recipe: { include: { tags: true } } },
  })
  return NextResponse.json(entry)
}
