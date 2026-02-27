import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { COOKIE_NAME, verifyAuthEdge } from "@/lib/auth-cookie"

const isPublicRoute = (pathname: string) =>
  pathname === "/login" ||
  pathname === "/signup" ||
  pathname === "/api/auth/login" ||
  pathname === "/api/auth/logout" ||
  pathname === "/api/auth/signup" ||
  pathname.startsWith("/_next") ||
  pathname.includes(".")

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    if (isPublicRoute(pathname)) return NextResponse.next()

    const token = request.cookies.get(COOKIE_NAME)?.value
    const userId = await verifyAuthEdge(token)
    if (!userId) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const login = new URL("/login", request.url)
      login.searchParams.set("from", pathname)
      return NextResponse.redirect(login)
    }
    return NextResponse.next()
  } catch (err) {
    console.error("[middleware]", err)
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
