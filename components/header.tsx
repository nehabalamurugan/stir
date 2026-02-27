"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"

export function Header() {
  const { user, isLoading } = useAuth()

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="h-full flex items-center justify-between px-4 md:px-8 md:ml-64 max-w-4xl">
        <div className="flex flex-col min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground leading-tight">
            stir<span className="text-primary">.</span>
          </h1>
          <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">food is better shared</span>
        </div>
        <div className="flex items-center gap-4">
          {!isLoading && (
            user ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <a href="/login">Sign In</a>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  )
}
