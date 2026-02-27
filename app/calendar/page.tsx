"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay } from "date-fns"
import { MemberAvatar } from "@/components/member-avatar"
import { LogCookDialog } from "@/components/log-cook-dialog"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"

type CalendarEntry = {
  id: string
  date: string
  mealSlot: string
  isLogged: boolean
  note: string | null
  recipe: { id: string; title: string } | null
}

const MEAL_SLOTS = ["breakfast", "lunch", "dinner"] as const

function getCalendarDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date))
  const end = endOfWeek(endOfMonth(date))
  const days: Date[] = []
  let cur = start
  while (cur <= end) {
    days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
}

export default function CalendarPage() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; mealSlot: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const month = format(currentMonth, "yyyy-MM")
      const res = await fetch(`/api/calendar?month=${month}`)
      if (res.ok) setEntries(await res.json())
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Build a lookup map: "YYYY-MM-DD-mealSlot" -> CalendarEntry
  const entryMap = useMemo(() => {
    const map = new Map<string, CalendarEntry>()
    for (const e of entries) {
      const key = `${e.date.split("T")[0]}-${e.mealSlot}`
      map.set(key, e)
    }
    return map
  }, [entries])

  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth])

  function openSlot(date: Date, mealSlot: string) {
    setSelectedSlot({ date, mealSlot })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-base font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd")
          const dayEntryList = MEAL_SLOTS.map((slot) => entryMap.get(`${dateStr}-${slot}`)).filter(Boolean) as CalendarEntry[]
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isTodayDay = isToday(day)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={cn(
                "min-h-[64px] p-1 rounded-xl flex flex-col items-start gap-0.5 text-left transition-colors border",
                isCurrentMonth ? "bg-card border-border hover:border-primary/40" : "bg-transparent border-transparent opacity-40",
                isTodayDay && "border-primary/60",
                isSelected && "border-primary bg-primary/5"
              )}
            >
              <span className={cn(
                "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
                isTodayDay && "bg-primary text-primary-foreground"
              )}>
                {format(day, "d")}
              </span>
              {/* Show dots for entries */}
              {dayEntryList.length > 0 && (
                <div className="flex gap-0.5 flex-wrap px-0.5">
                  {dayEntryList.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className={cn("h-1.5 w-1.5 rounded-full", e.isLogged ? "opacity-100" : "opacity-50")}
                      style={{ backgroundColor: user?.avatarColor || "#6366f1" }}
                    />
                  ))}
                </div>
              )}
              {/* First entry label on desktop */}
              {dayEntryList[0]?.recipe && (
                <p className="text-[9px] leading-tight text-muted-foreground truncate w-full hidden sm:block px-0.5">
                  {dayEntryList[0].recipe.title}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="mt-2 border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{format(selectedDay, "EEEE, MMMM d")}</h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="space-y-2">
            {MEAL_SLOTS.map((slot) => {
              const entry = entryMap.get(`${format(selectedDay, "yyyy-MM-dd")}-${slot}`)
              return (
                <div key={slot} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground capitalize w-16 flex-shrink-0">{slot}</span>
                  {entry ? (
                    <div className={cn(
                      "flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm",
                      entry.isLogged ? "bg-muted/60 border-border" : "border-dashed border-border bg-transparent"
                    )}>
                      <MemberAvatar member={user} size="xs" />
                      <span className="flex-1 truncate font-medium">{entry.recipe?.title ?? entry.note ?? "—"}</span>
                      {!entry.isLogged && <span className="text-xs text-muted-foreground">planned</span>}
                    </div>
                  ) : (
                    <button
                      onClick={() => openSlot(selectedDay, slot)}
                      className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => {
          setSelectedSlot({ date: new Date(), mealSlot: "dinner" })
          setDialogOpen(true)
        }}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-30"
      >
        <Plus className="h-6 w-6" />
      </button>

      <LogCookDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prefilledSlot={selectedSlot}
        onSaved={fetchEntries}
      />
    </div>
  )
}
