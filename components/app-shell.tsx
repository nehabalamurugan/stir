"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNav, SidebarNav } from "@/components/navigation"

const AUTH_ROUTES = ["/login", "/signup"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))

  if (isAuthRoute) {
    return <>{children}</>
  }

  return (
    <>
      <Header />
      <SidebarNav />
      <main className="pt-20 pb-24 md:pb-8 px-5 md:px-8 md:ml-64 max-w-4xl">{children}</main>
      <BottomNav />
    </>
  )
}
