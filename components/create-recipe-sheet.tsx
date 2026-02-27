"use client"

import { useState, useEffect } from "react"
import { Plus, X, Clock, Users, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Ingredient {
  id: string
  name: string
  quantity: string
  unit: string
}

interface InitialRecipeData {
  title: string
  description?: string | null
  prepTime?: string | null
  servings?: number
  ingredients?: { name: string; quantity: string; unit: string }[]
  instructions?: { step: string }[] | string[]
  tags?: { name: string }[] | string[]
  source?: string | null
}

interface CreateRecipeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (recipe: {
    title: string
    description: string
    prepTime: string
    servings: number
    ingredients: Ingredient[]
    instructions: string[]
    tags: string[]
  }) => void
  initialData?: InitialRecipeData | null
}

const SUGGESTED_TAGS = ["quick", "vegetarian", "vegan", "high protein", "low carb", "spicy", "comfort food", "one pot", "grilled", "healthy"]
const UNITS = ["", "cups", "tbsp", "tsp", "oz", "lbs", "g", "kg", "ml", "L", "pieces", "cloves", "slices"]

export function CreateRecipeSheet({ open, onOpenChange, onSave, initialData }: CreateRecipeSheetProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [servings, setServings] = useState(4)
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ id: "1", name: "", quantity: "", unit: "" }])
  const [instructions, setInstructions] = useState<string[]>([""])
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState("")

  useEffect(() => {
    if (!open) return
    if (initialData) {
      setTitle(initialData.title || "")
      setDescription(initialData.description || "")
      setPrepTime(initialData.prepTime || "")
      setServings(initialData.servings || 4)
      if (initialData.ingredients?.length) {
        setIngredients(initialData.ingredients.map((ing, i) => ({
          id: String(i),
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
        })))
      } else {
        setIngredients([{ id: "1", name: "", quantity: "", unit: "" }])
      }
      if (initialData.instructions?.length) {
        setInstructions(initialData.instructions.map((inst) =>
          typeof inst === "string" ? inst : inst.step
        ))
      } else {
        setInstructions([""])
      }
      if (initialData.tags?.length) {
        setTags(initialData.tags.map((t) => typeof t === "string" ? t : t.name))
      } else {
        setTags([])
      }
    } else {
      setTitle(""); setDescription(""); setPrepTime(""); setServings(4)
      setIngredients([{ id: "1", name: "", quantity: "", unit: "" }])
      setInstructions([""]); setTags([])
    }
  }, [open, initialData])

  const addIngredient = () => setIngredients([...ingredients, { id: Date.now().toString(), name: "", quantity: "", unit: "" }])
  const updateIngredient = (id: string, field: keyof Ingredient, value: string) =>
    setIngredients(ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)))
  const removeIngredient = (id: string) => ingredients.length > 1 && setIngredients(ingredients.filter((i) => i.id !== id))

  const addInstruction = () => setInstructions([...instructions, ""])
  const updateInstruction = (i: number, v: string) => { const a = [...instructions]; a[i] = v; setInstructions(a) }
  const removeInstruction = (i: number) => instructions.length > 1 && setInstructions(instructions.filter((_, j) => j !== i))

  const toggleTag = (tag: string) => setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag])
  const addCustomTag = () => { if (customTag && !tags.includes(customTag)) { setTags([...tags, customTag]); setCustomTag("") } }

  const isEditing = !!initialData

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      title, description, prepTime, servings,
      ingredients: ingredients.filter((i) => i.name.trim()),
      instructions: instructions.filter((i) => i.trim()),
      tags,
    })
    onOpenChange(false)
  }

  const content = (
    <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-6rem)] pb-4">
      <div className="space-y-2">
        <Label>Recipe name *</Label>
        <Input placeholder="e.g., Grandma's Chicken Soup" className="rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea placeholder="A brief description…" className="rounded-xl resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Prep time</Label>
          <Input placeholder="e.g., 30 min" className="rounded-xl" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Servings</Label>
          <Input type="number" min={1} className="rounded-xl" value={servings} onChange={(e) => setServings(parseInt(e.target.value) || 1)} />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Ingredients</Label>
        {ingredients.map((ing) => (
          <div key={ing.id} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-12 gap-2">
              <Input placeholder="Qty" className="rounded-xl col-span-3" value={ing.quantity} onChange={(e) => updateIngredient(ing.id, "quantity", e.target.value)} />
              <Select value={ing.unit} onValueChange={(v) => updateIngredient(ing.id, "unit", v)}>
                <SelectTrigger className="rounded-xl col-span-4"><SelectValue placeholder="Unit" /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u || "none"} value={u || "none"}>{u || "—"}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Ingredient" className="rounded-xl col-span-5" value={ing.name} onChange={(e) => updateIngredient(ing.id, "name", e.target.value)} />
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeIngredient(ing.id)} disabled={ingredients.length === 1}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="rounded-xl w-full bg-transparent" onClick={addIngredient}>
          <Plus className="h-4 w-4 mr-1" />Add ingredient
        </Button>
      </div>

      <div className="space-y-3">
        <Label>Instructions</Label>
        {instructions.map((inst, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="h-10 w-6 flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">{i + 1}.</span>
            <Textarea placeholder={`Step ${i + 1}…`} className="rounded-xl resize-none flex-1" rows={2} value={inst} onChange={(e) => updateInstruction(i, e.target.value)} />
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeInstruction(i)} disabled={instructions.length === 1}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="rounded-xl w-full bg-transparent" onClick={addInstruction}>
          <Plus className="h-4 w-4 mr-1" />Add step
        </Button>
      </div>

      <div className="space-y-3">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TAGS.map((tag) => (
            <Badge key={tag} variant={tags.includes(tag) ? "default" : "outline"} className="cursor-pointer rounded-lg" onClick={() => toggleTag(tag)}>
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Custom tag…" className="rounded-xl" value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag() } }} />
          <Button variant="outline" className="rounded-xl shrink-0 bg-transparent" onClick={addCustomTag} disabled={!customTag}>Add</Button>
        </div>
      </div>

      <Button className="w-full rounded-xl" size="lg" onClick={handleSave} disabled={!title.trim()}>
        {isEditing ? "Update recipe" : "Save recipe"}
      </Button>
    </div>
  )

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" title={isEditing ? "Edit recipe" : "Create recipe"} className="h-[85vh] rounded-t-2xl md:hidden overflow-y-auto px-6 pt-6">
          <h2 className="text-lg font-semibold mb-4">{isEditing ? "Edit recipe" : "Create recipe"}</h2>
          {content}
        </SheetContent>
      </Sheet>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hidden md:flex max-w-lg max-h-[90vh] flex-col">
          <DialogTitle className="text-lg font-semibold">{isEditing ? "Edit recipe" : "Create recipe"}</DialogTitle>
          {content}
        </DialogContent>
      </Dialog>
    </>
  )
}
