"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check } from "lucide-react"
import Link from "next/link"

const AVATAR_COLORS = [
  "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
]

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("token") || ""

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[2])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, avatarColor, inviteToken }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }
      router.push("/")
      router.refresh()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            stir<span className="text-primary">.</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">food is better shared</p>
          <p className="mt-3 text-muted-foreground">Create your account</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Avatar color */}
          <div className="space-y-2">
            <Label>Your color</Label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                >
                  {avatarColor === color && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
            {/* Preview */}
            <div className="flex items-center gap-2 mt-1">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: avatarColor }}
              >
                {name ? name.charAt(0).toUpperCase() : "?"}
              </div>
              <span className="text-sm text-muted-foreground">{name || "Your name"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Neha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={loading}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              className="rounded-xl"
            />
          </div>

          {!inviteToken && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
              You need an invite link to sign up. Ask a friend to share one from their Settings page.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full rounded-xl"
            size="lg"
            disabled={loading || !inviteToken}
          >
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
