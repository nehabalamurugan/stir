"use client"

import { useState, useEffect, useRef } from "react"
import { Star, X, ImagePlus, Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { CreateRecipeSheet } from "@/components/create-recipe-sheet"
import { MemberAvatar } from "@/components/member-avatar"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"

type Recipe = { id: string; title: string }
type UserRef = { id: string; name: string; avatarColor: string }

interface LogCookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefilledSlot?: { date: Date; mealSlot: string } | null
  onSaved?: () => void
}

const MEAL_SLOTS = ["breakfast", "lunch", "dinner"]

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)} onClick={() => onChange(star)}>
          <Star className="h-6 w-6 transition-colors" fill={(hover || value) >= star ? "currentColor" : "none"} color={(hover || value) >= star ? "#f59e0b" : "currentColor"} />
        </button>
      ))}
    </div>
  )
}

export function LogCookDialog({ open, onOpenChange, prefilledSlot, onSaved }: LogCookDialogProps) {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [allUsers, setAllUsers] = useState<UserRef[]>([])
  const [recipeId, setRecipeId] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [mealSlot, setMealSlot] = useState(prefilledSlot?.mealSlot || "dinner")
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState("")
  const [image, setImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [coUserIds, setCoUserIds] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [createRecipeOpen, setCreateRecipeOpen] = useState(false)

  useEffect(() => {
    if (prefilledSlot) {
      setDate(prefilledSlot.date.toISOString().split("T")[0])
      setMealSlot(prefilledSlot.mealSlot)
    }
  }, [prefilledSlot])

  useEffect(() => {
    if (!open) return
    fetch("/api/recipes").then((r) => r.json()).then(setRecipes).catch(() => {})
    fetch("/api/users").then((r) => r.json()).then(setAllUsers).catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open) {
      setRecipeId(""); setRating(0); setNote(""); setImage(null); setImagePreview(null)
      setCreateRecipeOpen(false); setCoUserIds([])
    }
  }, [open])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { const r = ev.target?.result as string; setImage(r); setImagePreview(r) }
    reader.readAsDataURL(file)
  }

  async function handleCreateRecipe(recipe: {
    title: string
    description: string
    prepTime: string
    servings: number
    ingredients: { id: string; name: string; quantity: string; unit: string }[]
    instructions: string[]
    tags: string[]
  }) {
    const body = {
      title: recipe.title.trim(),
      description: recipe.description || null,
      prepTime: recipe.prepTime || null,
      servings: recipe.servings,
      ingredients: recipe.ingredients.filter((i) => i.name.trim()).map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      instructions: recipe.instructions.filter((s) => s.trim()),
      tags: recipe.tags,
    }
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) return
    const created = await res.json()
    setRecipes((prev) => [{ id: created.id, title: created.title }, ...prev])
    setRecipeId(created.id)
    setCreateRecipeOpen(false)
  }

  function toggleCoUser(id: string) {
    setCoUserIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const availableCooks = allUsers.filter((u) => u.id !== user?.id)
  const isPast = new Date(date) <= new Date()

  async function handleSave() {
    if (!recipeId) return
    setSaving(true)
    try {
      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, mealSlot, recipeId, note: note || null, isLogged: isPast }),
      })
      if (isPast && rating > 0) {
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId, date, rating, note: note || null, image: image || null, coUserIds }),
        })
      }
      onSaved?.()
      onOpenChange(false)
    } finally { setSaving(false) }
  }

  const content = (
    <div className="space-y-5 pt-2">
      {/* Recipe */}
      <div className="space-y-2">
        <Label>Recipe</Label>
        <Select value={recipeId} onValueChange={setRecipeId}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose a recipe…" /></SelectTrigger>
          <SelectContent>{recipes.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
        </Select>
        <button type="button" onClick={() => setCreateRecipeOpen(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="h-3.5 w-3.5" />
          Add a new recipe
        </button>
        <CreateRecipeSheet open={createRecipeOpen} onOpenChange={setCreateRecipeOpen} onSave={handleCreateRecipe} />
      </div>

      {/* Date + Slot */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date</Label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-2">
          <Label>Meal</Label>
          <Select value={mealSlot} onValueChange={setMealSlot}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{MEAL_SLOTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Rating */}
      {isPast && (
        <div className="space-y-2">
          <Label>Rating <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <StarRating value={rating} onChange={setRating} />
        </div>
      )}

      {/* Co-cooks */}
      {isPast && availableCooks.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Who cooked with you? <span className="text-muted-foreground text-xs font-normal">(optional)</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {availableCooks.map((u) => {
              const selected = coUserIds.includes(u.id)
              return (
                <button key={u.id} type="button" onClick={() => toggleCoUser(u.id)}
                  className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                    selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}>
                  <MemberAvatar member={u} size="xs" />
                  {u.name}
                  {selected && <X className="h-3 w-3 ml-0.5" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Note */}
      <div className="space-y-2">
        <Label>Note <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Textarea placeholder={isPast ? "How did it turn out?" : "Any notes for this plan…"} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl resize-none" rows={2} />
      </div>

      {/* Photo */}
      {isPast && (
        <div className="space-y-2">
          <Label>Photo <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
              <button onClick={() => { setImage(null); setImagePreview(null) }} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors">
              <ImagePlus className="h-4 w-4" />
              Add a photo
            </button>
          )}
        </div>
      )}

      <Button className="w-full rounded-xl" disabled={!recipeId || saving} onClick={handleSave}>
        {saving ? "Saving…" : isPast ? "Log cook" : "Plan meal"}
      </Button>
    </div>
  )

  const title = isPast ? "Log a cook" : "Plan a meal"

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" title={title} className="h-[90vh] rounded-t-2xl md:hidden overflow-y-auto px-6 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={() => onOpenChange(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          {content}
        </SheetContent>
      </Sheet>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hidden md:block max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    </>
  )
}
