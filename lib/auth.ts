import { cookies } from "next/headers"
import { createHmac, timingSafeEqual } from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const AUTH_COOKIE_NAME = "stir_auth"

// ─── Password hashing ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─── Session token ────────────────────────────────────────────────────────────
// Token format: `${userId}.${hmac(userId)}`

function getSecret(): string {
  return process.env.SESSION_SECRET || "fallback-dev-secret"
}

export function createSessionToken(userId: string): string {
  const sig = createHmac("sha256", getSecret()).update(userId).digest("hex")
  return `${userId}.${sig}`
}

export function verifySessionToken(token: string): string | null {
  const lastDot = token.lastIndexOf(".")
  if (lastDot === -1) return null
  const userId = token.slice(0, lastDot)
  const sig = token.slice(lastDot + 1)
  if (!userId || !sig) return null
  const expected = createHmac("sha256", getSecret()).update(userId).digest("hex")
  if (sig.length !== expected.length) return null
  try {
    const valid = timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))
    return valid ? userId : null
  } catch {
    return null
  }
}

// ─── Server-side session helpers ─────────────────────────────────────────────

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function getSessionUser() {
  const userId = await getSessionUserId()
  if (!userId) return null
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, avatarColor: true },
  })
}
