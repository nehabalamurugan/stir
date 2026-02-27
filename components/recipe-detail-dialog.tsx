"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, ExternalLink } from "lucide-react"

type Recipe = {
  id: string
  title: string
  image?: string | null
  tags: { name: string }[] | string[]
  servings: number
  prepTime?: string | null
  source?: string | null
  isFavorite: boolean
  isTried: boolean
  description?: string | null
  ingredients: { name: string; quantity: string; unit: string }[] | { id: string; name: string; quantity: string; unit: string }[]
  instructions: { step: string }[] | string[]
}

interface RecipeDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: Recipe | null
}

export function RecipeDetailDialog({ open, onOpenChange, recipe }: RecipeDetailDialogProps) {
  if (!recipe) return null

  const tags: string[] = Array.isArray(recipe.tags)
    ? (recipe.tags[0] && typeof recipe.tags[0] === "object" && "name" in recipe.tags[0]
        ? recipe.tags.map((t) => (t as { name: string }).name)
        : (recipe.tags as string[]))
    : []

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((ing) =>
        typeof ing === "string"
          ? { name: ing, quantity: "", unit: "" }
          : "id" in ing
          ? { name: ing.name, quantity: ing.quantity, unit: ing.unit }
          : ing
      )
    : []

  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions.map((inst) => (typeof inst === "string" ? inst : inst.step))
    : []

  const sourceHost = recipe.source && recipe.source !== "My Recipe"
    ? (() => { try { return new URL(recipe.source).hostname.replace("www.", "") } catch { return recipe.source } })()
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{recipe.title}</DialogTitle>
        </DialogHeader>

        {recipe.image && (
          <img src={recipe.image} alt={recipe.title} className="w-full rounded-xl object-cover max-h-48" />
        )}

        <div className="space-y-6 pt-2">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {recipe.prepTime && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{recipe.prepTime}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{recipe.servings} servings</span>
            </div>
            {sourceHost && (
              <a
                href={recipe.source!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
                <span>{sourceHost}</span>
              </a>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          {recipe.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{recipe.description}</p>
          )}

          {ingredients.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Ingredients</h3>
              <ul className="space-y-2">
                {ingredients.map((ingredient, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span className="flex-1">
                      {ingredient.quantity && <span className="font-medium">{ingredient.quantity} </span>}
                      {ingredient.unit && <span className="font-medium">{ingredient.unit} </span>}
                      <span>{ingredient.name}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {instructions.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Instructions</h3>
              <ol className="space-y-4">
                {instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-sm leading-relaxed pt-0.5">{instruction}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {ingredients.length === 0 && instructions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recipe details available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
