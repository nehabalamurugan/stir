"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Search, Star, BookOpen, Link2, X, Trash2, ExternalLink, Bookmark, UtensilsCrossed, ChefHat, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { CreateRecipeSheet } from "@/components/create-recipe-sheet"
import { RecipeDetailDialog } from "@/components/recipe-detail-dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Recipe = {
  id: string
  title: string
  description: string | null
  image: string | null
  servings: number
  prepTime: string | null
  source: string | null
  isFavorite: boolean
  isTried: boolean
  tags: { name: string }[]
  ingredients: { name: string; quantity: string; unit: string }[]
  instructions: { step: string }[]
  user: { name: string; avatarColor: string } | null
}

type SavedEntry = {
  id: string
  recipeId: string
  wantToTry: boolean
  recipe: Recipe
}

type FilterTab = "all" | "favorites" | "tried" | "saved"

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterTab>("all")
  const [savedSubFilter, setSavedSubFilter] = useState<"all" | "wantToTry">("all")
  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState<"url" | "create" | null>(null)
  const [urlInput, setUrlInput] = useState("")
  const [scraping, setScraping] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null)

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === "favorites") params.set("favorites", "true")
      if (filter === "tried") params.set("tried", "true")
      if (search) params.set("search", search)
      const res = await fetch(`/api/recipes?${params}`)
      if (res.ok) setRecipes(await res.json())
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  const fetchSaved = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/saved")
      if (res.ok) setSavedEntries(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (filter === "saved") {
      fetchSaved()
    } else {
      fetchRecipes()
    }
  }, [filter, fetchRecipes, fetchSaved])

  function isInspoUrl(url: string): { type: "instagram" | "tiktok" } | null {
    try {
      const u = new URL(url.trim())
      const host = u.hostname.replace("www.", "")
      if (host === "instagram.com" || host === "www.instagram.com" || host.endsWith(".instagram.com")) return { type: "instagram" }
      if (host === "tiktok.com" || host === "www.tiktok.com" || host.endsWith(".tiktok.com") || host === "vm.tiktok.com") return { type: "tiktok" }
      return null
    } catch {
      return null
    }
  }

  async function saveLinkOnly() {
    const url = urlInput.trim()
    if (!url) return
    let title = url
    try { title = new URL(url).hostname.replace("www.", "") } catch { /* use raw url */ }
    setScraping(true)
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, source: url, servings: 1 }),
      })
      if (res.ok) {
        toast.success("Link saved!")
        setUrlInput("")
        setAddOpen(false)
        setAddMode(null)
        fetchRecipes()
      }
    } finally {
      setScraping(false)
    }
  }

  async function saveUrlAsRecipe() {
    if (!urlInput.trim()) return
    const url = urlInput.trim()
    const inspo = isInspoUrl(url)
    setScraping(true)
    try {
      if (inspo) {
        const title = inspo.type === "instagram" ? "Instagram post" : "TikTok video"
        const saveRes = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            source: url,
            tags: ["food inspo", inspo.type],
            description: null,
            servings: 1,
          }),
        })
        if (saveRes.ok) {
          toast.success("Saved! No recipe data from this link — it’s in your collection as food inspo.")
          setUrlInput("")
          setAddOpen(false)
          setAddMode(null)
          fetchRecipes()
        } else {
          const d = await saveRes.json().catch(() => ({}))
          toast.error(d.error || "Couldn’t save")
        }
        return
      }
      const res = await fetch("/api/recipes/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Failed to scrape"); return }

      const saveRes = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (saveRes.ok) {
        toast.success("Recipe saved!")
        setUrlInput("")
        setAddOpen(false)
        setAddMode(null)
        fetchRecipes()
      }
    } finally {
      setScraping(false)
    }
  }

  async function handleCreate(recipe: { title: string; description: string; prepTime: string; servings: number; ingredients: { id: string; name: string; quantity: string; unit: string }[]; instructions: string[]; tags: string[] }) {
    const body = {
      title: recipe.title,
      description: recipe.description || null,
      prepTime: recipe.prepTime || null,
      servings: recipe.servings,
      ingredients: recipe.ingredients.filter((i) => i.name.trim()).map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      instructions: recipe.instructions.filter((s) => s.trim()),
      tags: recipe.tags,
    }

    if (editingRecipe) {
      const res = await fetch(`/api/recipes/${editingRecipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success("Recipe updated!")
        setEditingRecipe(null)
        fetchRecipes()
      }
    } else {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success("Recipe created!")
        fetchRecipes()
      }
    }
  }

  async function toggleFavorite(r: Recipe) {
    await fetch(`/api/recipes/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !r.isFavorite }),
    })
    fetchRecipes()
  }

  async function deleteRecipe(id: string) {
    await fetch(`/api/recipes/${id}`, { method: "DELETE" })
    toast.success("Recipe deleted")
    fetchRecipes()
  }

  async function unsaveRecipe(recipeId: string) {
    await fetch("/api/saved", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId }),
    })
    toast.success("Removed from saved")
    fetchSaved()
  }

  async function toggleWantToTry(entry: SavedEntry) {
    await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: entry.recipeId, wantToTry: !entry.wantToTry }),
    })
    fetchSaved()
  }

  const displayedSaved = savedSubFilter === "wantToTry"
    ? savedEntries.filter((e) => e.wantToTry)
    : savedEntries

  const filteredSaved = search
    ? displayedSaved.filter((e) => e.recipe.title.toLowerCase().includes(search.toLowerCase()))
    : displayedSaved

  const addContent = (
    <div className="space-y-4 pt-2">
      {!addMode && (
        <>
          <p className="text-muted-foreground text-sm">How would you like to add a recipe?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAddMode("url")}
              className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Link2 className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">From URL</span>
              <span className="text-xs text-muted-foreground text-center">Recipe sites, or Instagram & TikTok for food inspo</span>
            </button>
            <button
              onClick={() => { setAddOpen(false); setCreateOpen(true) }}
              className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Create my own</span>
              <span className="text-xs text-muted-foreground text-center">Write out your own recipe</span>
            </button>
          </div>
        </>
      )}
      {addMode === "url" && (
        <div className="space-y-4">
          <button onClick={() => setAddMode(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="h-3 w-3" /> Back
          </button>
          <div className="space-y-2">
            <p className="text-sm font-medium">Paste a link</p>
            <Input
              placeholder="Recipe URL, or Instagram / TikTok link for food inspo"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveUrlAsRecipe()}
              className="rounded-xl"
              autoFocus
            />
          </div>
          <Button onClick={saveUrlAsRecipe} disabled={!urlInput.trim() || scraping} className="w-full rounded-xl">
            {scraping ? "Saving…" : "Extract full recipe"}
          </Button>
          <button
            onClick={saveLinkOnly}
            disabled={!urlInput.trim() || scraping}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            Just save the link →
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "favorites", "tried", "saved"] as FilterTab[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors flex items-center gap-1.5",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f === "saved" && <Bookmark className="h-3 w-3" />}
            {f}
          </button>
        ))}
      </div>

      {/* Saved sub-filters */}
      {filter === "saved" && (
        <div className="flex gap-2">
          <button
            onClick={() => setSavedSubFilter("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              savedSubFilter === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All saved
          </button>
          <button
            onClick={() => setSavedSubFilter("wantToTry")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
              savedSubFilter === "wantToTry" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <UtensilsCrossed className="h-3 w-3" />
            Want to cook
          </button>
        </div>
      )}

      {/* Recipe list — My Recipes */}
      {filter !== "saved" && (
        loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No recipes yet</p>
              <p className="text-sm text-muted-foreground mt-1">Save recipes from the web or create your own</p>
            </div>
            <Button onClick={() => setAddOpen(true)} className="rounded-xl">Add a recipe</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recipes.map((r) => (
              <div
                key={r.id}
                className="bg-card border border-border rounded-2xl p-4 flex gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setDetailRecipe(r)}
              >
                {r.image && (
                  <img src={r.image} alt={r.title} className="h-16 w-16 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold leading-snug">{r.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.prepTime && <span className="text-xs text-muted-foreground">{r.prepTime}</span>}
                    {r.source && r.source !== "My Recipe" && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <ExternalLink className="h-2.5 w-2.5" />
                        {(() => { try { return new URL(r.source).hostname.replace("www.", "") } catch { return r.source } })()}
                      </span>
                    )}
                    {r.isTried && <Badge variant="secondary" className="text-[10px] py-0">tried</Badge>}
                  </div>
                  {r.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {r.tags.slice(0, 3).map((t) => (
                        <span key={t.name} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2 ml-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => toggleFavorite(r)} className="p-1">
                    <Star
                      className="h-4 w-4"
                      fill={r.isFavorite ? "currentColor" : "none"}
                      color={r.isFavorite ? "#f59e0b" : "currentColor"}
                    />
                  </button>
                  <button onClick={() => { setEditingRecipe(r); setCreateOpen(true) }} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteRecipe(r.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Saved recipes list */}
      {filter === "saved" && (
        loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : filteredSaved.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <Bookmark className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {savedSubFilter === "wantToTry" ? "No recipes on your want-to-cook list" : "No saved recipes yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {savedSubFilter === "wantToTry"
                  ? "Tap the fork icon on any saved recipe to add it here"
                  : "Save recipes from your friends' posts in the feed"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSaved.map((entry) => {
              const r = entry.recipe
              return (
                <div
                  key={entry.id}
                  className="bg-card border border-border rounded-2xl p-4 flex gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setDetailRecipe(r)}
                >
                  {r.image && (
                    <img src={r.image} alt={r.title} className="h-16 w-16 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-semibold leading-snug">{r.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.prepTime && <span className="text-xs text-muted-foreground">{r.prepTime}</span>}
                      {/* Attribution: who added this recipe */}
                      {r.user && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: r.user.avatarColor }}
                          />
                          {r.user.name}'s recipe
                        </span>
                      )}
                      {entry.wantToTry && (
                        <Badge variant="secondary" className="text-[10px] py-0 flex items-center gap-0.5">
                          <UtensilsCrossed className="h-2.5 w-2.5" />
                          want to cook
                        </Badge>
                      )}
                    </div>
                    {r.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {r.tags.slice(0, 3).map((t) => (
                          <span key={t.name} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-2 ml-1" onClick={(e) => e.stopPropagation()}>
                    {/* Want to cook toggle */}
                    <button
                      onClick={() => toggleWantToTry(entry)}
                      className={cn(
                        "p-1 transition-colors",
                        entry.wantToTry ? "text-primary" : "text-muted-foreground hover:text-primary"
                      )}
                      title={entry.wantToTry ? "Remove from want-to-cook" : "Mark as want to cook"}
                    >
                      <ChefHat className="h-4 w-4" fill={entry.wantToTry ? "currentColor" : "none"} />
                    </button>
                    {/* Unsave */}
                    <button
                      onClick={() => unsaveRecipe(entry.recipeId)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove from saved"
                    >
                      <Bookmark className="h-4 w-4" fill="currentColor" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* FAB — only show for non-saved tabs */}
      {filter !== "saved" && (
        <button
          onClick={() => setAddOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-30"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Add recipe modal */}
      <Sheet open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddMode(null) }}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl px-6 pt-6 pb-8 sm:max-w-md sm:mx-auto" title="Add a recipe">
          <h2 className="text-lg font-semibold mb-4">Add a recipe</h2>
          {addContent}
        </SheetContent>
      </Sheet>

      <CreateRecipeSheet
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setEditingRecipe(null)
          setCreateOpen(open)
        }}
        onSave={handleCreate}
        initialData={editingRecipe}
      />

      <RecipeDetailDialog
        open={!!detailRecipe}
        onOpenChange={(o) => !o && setDetailRecipe(null)}
        recipe={detailRecipe}
      />
    </div>
  )
}
