"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Plus, ChefHat, Star, MessageCircle, Bookmark, BookmarkCheck, Utensils, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MemberAvatar } from "@/components/member-avatar"
import { LogCookDialog } from "@/components/log-cook-dialog"
import { RecipeDetailDialog } from "@/components/recipe-detail-dialog"
import { useAuth } from "@/components/auth-provider"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

const EMOJIS = ["🔥", "😍", "👏", "🤣"] as const

type UserRef = { id: string; name: string; avatarColor: string }

type Reaction = {
  id: string
  emoji: string
  userId: string
  user: UserRef
}

type Comment = {
  id: string
  text: string
  userId: string
  createdAt: string
  user: UserRef
}

type CookEntry = {
  id: string
  date: string
  createdAt: string
  rating: number
  note: string | null
  image: string | null
  recipe: {
    id: string
    title: string
    image: string | null
    tags: { name: string }[]
    ingredients: { name: string; quantity: string; unit: string }[]
    instructions: { step: string }[]
    description: string | null
    prepTime: string | null
    servings: number
    source: string | null
    isFavorite: boolean
    isTried: boolean
  }
  user: UserRef
  reactions: Reaction[]
  comments: Comment[]
  coCooks: { id: string; userId: string; user: UserRef }[]
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className="h-3.5 w-3.5"
          fill={s <= rating ? "currentColor" : "none"}
          color={s <= rating ? "#f59e0b" : "#d1d5db"} />
      ))}
    </div>
  )
}

function FeedCard({
  entry, currentUser, onReaction, onComment, onSave, onWantToTry,
  onDelete,
  savedRecipeIds, wantToTryIds, onViewRecipe,
}: {
  entry: CookEntry
  currentUser: UserRef | null
  onReaction: (cookHistoryId: string, emoji: string) => void
  onComment: (cookHistoryId: string, text: string) => Promise<void>
  onSave: (recipeId: string) => void
  onWantToTry: (recipeId: string) => void
  onDelete: (cookHistoryId: string) => void
  savedRecipeIds: Set<string>
  wantToTryIds: Set<string>
  onViewRecipe: (entry: CookEntry) => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reactionGroups = EMOJIS.map((emoji) => {
    const reactors = entry.reactions.filter((r) => r.emoji === emoji)
    const mine = reactors.some((r) => r.userId === currentUser?.id)
    return { emoji, count: reactors.length, mine }
  })

  async function submitComment() {
    if (!commentText.trim() || !currentUser) return
    setSubmittingComment(true)
    try {
      await onComment(entry.id, commentText.trim())
      setCommentText("")
    } finally {
      setSubmittingComment(false)
    }
  }

  const isSaved = savedRecipeIds.has(entry.recipe.id)
  const isWantToTry = wantToTryIds.has(entry.recipe.id)

  // Build author display
  const allCooks = [entry.user, ...entry.coCooks.map((c) => c.user)]
  const authorName = allCooks.map((u) => u.name).join(" & ")

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Author + date + rating */}
        <div className="flex items-center gap-3">
          {/* Stacked avatars */}
          <Link
            href={`/profile/${entry.user.id}`}
            className="relative flex-shrink-0 hover:opacity-80 transition-opacity"
            style={{ width: entry.coCooks.length > 0 ? `${28 + entry.coCooks.length * 14}px` : "28px", height: "28px" }}
          >
            <MemberAvatar member={entry.user} size="sm" className="absolute left-0 top-0 ring-2 ring-background z-10" />
            {entry.coCooks.map((cc, i) => (
              <MemberAvatar
                key={cc.id}
                member={cc.user}
                size="sm"
                className="absolute top-0 ring-2 ring-background"
                style={{ left: `${(i + 1) * 14}px`, zIndex: 9 - i }}
              />
            ))}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium leading-tight flex items-center gap-1 flex-wrap">
              {allCooks.map((u, i) => (
                <span key={u.id}>
                  <Link href={`/profile/${u.id}`} className="hover:text-primary transition-colors">{u.name}</Link>
                  {i < allCooks.length - 1 && <span className="text-muted-foreground"> & </span>}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            </p>
          </div>
          <StarDisplay rating={entry.rating} />
          {currentUser && currentUser.id === entry.user.id && (
            <button
              onClick={() => onDelete(entry.id)}
              className="ml-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button onClick={() => onViewRecipe(entry)} className="text-left w-full group">
          <p className="font-semibold text-lg leading-snug group-hover:text-primary transition-colors">
            {entry.recipe.title}
          </p>
        </button>

        {entry.recipe.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {entry.recipe.tags.map((t) => (
              <span key={t.name} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {t.name}
              </span>
            ))}
          </div>
        )}

        {entry.note && (
          <p className="text-sm text-muted-foreground italic">"{entry.note}"</p>
        )}
      </div>

      {entry.image && (
        <div className="w-full max-h-80 bg-muted flex items-center justify-center overflow-hidden">
          <img
            src={entry.image}
            alt={entry.recipe.title}
            className="max-h-80 w-auto object-contain"
          />
        </div>
      )}

      <div className="px-4 py-3 border-t border-border/60 space-y-3">
        <div className="flex items-center gap-1 flex-wrap">
          {reactionGroups.map(({ emoji, count, mine }) => (
            <button
              key={emoji}
              onClick={() => currentUser && onReaction(entry.id, emoji)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-all",
                mine
                  ? "bg-primary/10 border-primary/40 font-medium"
                  : "bg-transparent border-border hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
            </button>
          ))}

          <div className="flex-1" />

          <button
            onClick={() => { setShowComments((v) => !v); setTimeout(() => inputRef.current?.focus(), 100) }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1"
          >
            <MessageCircle className="h-4 w-4" />
            {entry.comments.length > 0 && <span className="text-xs">{entry.comments.length}</span>}
          </button>

          <button
            onClick={() => onSave(entry.recipe.id)}
            className={cn("px-1.5 py-1 transition-colors", isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>

          <button
            onClick={() => onWantToTry(entry.recipe.id)}
            className={cn("px-1.5 py-1 transition-colors", isWantToTry ? "text-amber-500" : "text-muted-foreground hover:text-foreground")}
          >
            <Utensils className="h-4 w-4" />
          </button>
        </div>

        {showComments && (
          <div className="space-y-3 pt-1 border-t border-border/50">
            {entry.comments.length > 0 && (
              <div className="space-y-2.5">
                {entry.comments.map((c) => (
                  <div key={c.id} className="flex gap-2 items-start">
                    <Link href={`/profile/${c.user.id}`}>
                      <MemberAvatar member={c.user} size="xs" className="mt-0.5 flex-shrink-0 hover:opacity-80 transition-opacity" />
                    </Link>
                    <p className="text-xs flex-1 min-w-0">
                      <Link href={`/profile/${c.user.id}`} className="font-medium hover:text-primary transition-colors">{c.user.name} </Link>
                      <span className="text-muted-foreground">{c.text}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <MemberAvatar member={currentUser} size="xs" className="flex-shrink-0" />
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                />
                <button onClick={submitComment} disabled={!commentText.trim() || submittingComment} className="text-primary disabled:opacity-40">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<CookEntry[]>([])
  const [allUsers, setAllUsers] = useState<UserRef[]>([])
  const [loading, setLoading] = useState(true)
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set())
  const [wantToTryIds, setWantToTryIds] = useState<Set<string>>(new Set())
  const [viewingRecipe, setViewingRecipe] = useState<CookEntry | null>(null)

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/history")
      if (res.ok) {
        const data = await res.json()
        setEntries(data)
        // Derive unique users from feed for filter chips
        const seen = new Map<string, UserRef>()
        for (const e of data) {
          if (e.user) seen.set(e.user.id, e.user)
          for (const cc of e.coCooks) seen.set(cc.user.id, cc.user)
        }
        setAllUsers(Array.from(seen.values()))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSaved = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch("/api/saved")
      if (res.ok) {
        const data = await res.json()
        setSavedRecipeIds(new Set(data.map((s: { recipeId: string }) => s.recipeId)))
        setWantToTryIds(new Set(data.filter((s: { wantToTry: boolean }) => s.wantToTry).map((s: { recipeId: string }) => s.recipeId)))
      }
    } catch {}
  }, [user])

  useEffect(() => { fetchFeed() }, [fetchFeed])
  useEffect(() => { fetchSaved() }, [fetchSaved])

  async function handleReaction(cookHistoryId: string, emoji: string) {
    if (!user) return
    await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookHistoryId, emoji }),
    })
    setEntries((prev) => prev.map((e) => {
      if (e.id !== cookHistoryId) return e
      const exists = e.reactions.find((r) => r.userId === user.id && r.emoji === emoji)
      return {
        ...e,
        reactions: exists
          ? e.reactions.filter((r) => !(r.userId === user.id && r.emoji === emoji))
          : [...e.reactions, { id: Date.now().toString(), emoji, userId: user.id, user }],
      }
    }))
  }

  async function handleComment(cookHistoryId: string, text: string) {
    if (!user) return
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookHistoryId, text }),
    })
    if (res.ok) {
      const newComment = await res.json()
      setEntries((prev) => prev.map((e) =>
        e.id === cookHistoryId ? { ...e, comments: [...e.comments, newComment] } : e
      ))
    }
  }

  async function handleSave(recipeId: string) {
    if (!user) return
    if (savedRecipeIds.has(recipeId)) {
      await fetch("/api/saved", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipeId }) })
      setSavedRecipeIds((prev) => { const s = new Set(prev); s.delete(recipeId); return s })
      setWantToTryIds((prev) => { const s = new Set(prev); s.delete(recipeId); return s })
      toast("Removed from saved")
    } else {
      await fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipeId, wantToTry: false }) })
      setSavedRecipeIds((prev) => new Set([...prev, recipeId]))
      toast.success("Recipe saved!")
    }
  }

  async function handleWantToTry(recipeId: string) {
    if (!user) return
    if (wantToTryIds.has(recipeId)) {
      await fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipeId, wantToTry: false }) })
      setWantToTryIds((prev) => { const s = new Set(prev); s.delete(recipeId); return s })
      toast("Removed from want-to-cook list")
    } else {
      await fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipeId, wantToTry: true }) })
      setSavedRecipeIds((prev) => new Set([...prev, recipeId]))
      setWantToTryIds((prev) => new Set([...prev, recipeId]))
      toast.success("Added to your want-to-cook list!")
    }
  }

  const filtered = filterUserId
    ? entries.filter((e) => e.user?.id === filterUserId || e.coCooks.some((cc) => cc.user.id === filterUserId))
    : entries

  async function handleDelete(cookHistoryId: string) {
    await fetch(`/api/history/${cookHistoryId}`, { method: "DELETE" })
    setEntries((prev) => prev.filter((e) => e.id !== cookHistoryId))
  }

  const detailRecipe = viewingRecipe ? { ...viewingRecipe.recipe, image: viewingRecipe.image ?? viewingRecipe.recipe.image ?? null } : null

  return (
    <div className="space-y-6">
      {/* Filter chips */}
      {allUsers.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          <button
            onClick={() => setFilterUserId(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!filterUserId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            Everyone
          </button>
          {allUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => setFilterUserId(filterUserId === u.id ? null : u.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterUserId === u.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              <MemberAvatar member={u} size="xs" />
              {u.name}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <ChefHat className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-lg">Nothing cooked yet</p>
            <p className="text-muted-foreground text-sm mt-1">Be the first to log a cook!</p>
          </div>
          <Button onClick={() => setLogOpen(true)} className="rounded-xl">Log a cook</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((entry) => (
            <FeedCard
              key={entry.id}
              entry={entry}
              currentUser={user}
              onReaction={handleReaction}
              onComment={handleComment}
              onSave={handleSave}
              onWantToTry={handleWantToTry}
              onDelete={handleDelete}
              savedRecipeIds={savedRecipeIds}
              wantToTryIds={wantToTryIds}
              onViewRecipe={setViewingRecipe}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => setLogOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-30"
      >
        <Plus className="h-6 w-6" />
      </button>

      <LogCookDialog open={logOpen} onOpenChange={setLogOpen} onSaved={fetchFeed} />

      <RecipeDetailDialog
        open={!!viewingRecipe}
        onOpenChange={(o) => !o && setViewingRecipe(null)}
        recipe={detailRecipe}
      />
    </div>
  )
}
