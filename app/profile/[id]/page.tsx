"use client"

import { useEffect, useState, useCallback, use } from "react"
import { ChefHat, BookOpen, Star, ExternalLink, ArrowLeft } from "lucide-react"
import { MemberAvatar } from "@/components/member-avatar"
import { RecipeDetailDialog } from "@/components/recipe-detail-dialog"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-provider"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"

type UserProfile = {
  id: string
  name: string
  avatarColor: string
  createdAt: string
}

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
}

type CookEntry = {
  id: string
  date: string
  rating: number
  note: string | null
  image: string | null
  recipe: { id: string; title: string; tags: { name: string }[] } | null
  coCooks: { id: string; user: { id: string; name: string; avatarColor: string } }[]
}

type Tab = "recipes" | "cooks"

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [cookHistory, setCookHistory] = useState<CookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("recipes")
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${id}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data.user)
        setRecipes(data.recipes)
        setCookHistory(data.cookHistory)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const isMe = currentUser?.id === id

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 rounded-2xl bg-muted animate-pulse" />
        <div className="h-40 rounded-2xl bg-muted animate-pulse" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <p className="font-medium text-lg">User not found</p>
        <Link href="/" className="text-sm text-primary hover:underline">Back to feed</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Profile header */}
      <div className="flex items-center gap-4">
        <MemberAvatar member={profile} size="lg" />
        <div>
          <h1 className="text-xl font-semibold">{profile.name}{isMe && " (you)"}</h1>
          <p className="text-sm text-muted-foreground">
            {recipes.length} recipe{recipes.length !== 1 && "s"} · {cookHistory.length} cook{cookHistory.length !== 1 && "s"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("recipes")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            tab === "recipes" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Recipes
        </button>
        <button
          onClick={() => setTab("cooks")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            tab === "cooks" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <ChefHat className="h-3.5 w-3.5" />
          Cooks
        </button>
      </div>

      {/* Recipes tab */}
      {tab === "recipes" && (
        recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{profile.name} hasn't added any recipes yet</p>
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
                <div className="flex items-center ml-1">
                  {r.isFavorite && (
                    <Star className="h-4 w-4" fill="currentColor" color="#f59e0b" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Cooks tab */}
      {tab === "cooks" && (
        cookHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <ChefHat className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{profile.name} hasn't logged any cooks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cookHistory.map((entry) => (
              <div key={entry.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{entry.recipe?.title ?? "Unknown recipe"}</p>
                  {entry.rating > 0 && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-3 w-3" fill={s <= entry.rating ? "currentColor" : "none"} color={s <= entry.rating ? "#f59e0b" : "#d1d5db"} />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
                  {entry.coCooks.length > 0 && (
                    <> · with {entry.coCooks.map((c) => c.user.name).join(", ")}</>
                  )}
                </p>
                {entry.note && <p className="text-sm text-muted-foreground italic">"{entry.note}"</p>}
                {entry.image && (
                  <div className="w-full max-h-48 bg-muted flex items-center justify-center overflow-hidden rounded-xl">
                    <img src={entry.image} alt="" className="max-h-48 w-auto object-contain" />
                  </div>
                )}
                {entry.recipe?.tags && entry.recipe.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {entry.recipe.tags.map((t) => (
                      <span key={t.name} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      <RecipeDetailDialog
        open={!!detailRecipe}
        onOpenChange={(o) => !o && setDetailRecipe(null)}
        recipe={detailRecipe}
      />
    </div>
  )
}
