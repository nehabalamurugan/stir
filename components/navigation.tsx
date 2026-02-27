"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, Calendar, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Feed",     href: "/",          icon: Home },
  { label: "Recipes",  href: "/recipes",   icon: BookOpen },
  { label: "Calendar", href: "/calendar",  icon: Calendar },
  { label: "Settings", href: "/settings",  icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/90 backdrop-blur-md border-t border-border">
      <div className="flex">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function SidebarNav() {
  const pathname = usePathname()
  return (
    <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col border-r border-border bg-background/80 backdrop-blur-md z-40 pt-20 pb-6 px-3">
      <div className="flex-1 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "stroke-[2.5]")} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
