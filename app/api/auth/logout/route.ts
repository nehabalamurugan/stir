import { NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIE_NAME } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const loginUrl = new URL("/login", url.origin)
  const res = NextResponse.redirect(loginUrl)
  res.cookies.set(AUTH_COOKIE_NAME, "", { maxAge: 0, path: "/" })
  return res
}

export async function POST(request: NextRequest) {
  return GET(request)
}
