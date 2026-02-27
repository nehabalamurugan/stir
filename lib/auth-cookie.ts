// Edge-compatible auth verification (used in middleware)
// Token format: `${userId}.${hmac(userId)}`

export const COOKIE_NAME = "stir_auth"

function getSecret(): string {
  return process.env.SESSION_SECRET || "fallback-dev-secret"
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

// Returns userId if valid, null otherwise
export async function verifyAuthEdge(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null
  const lastDot = cookieValue.lastIndexOf(".")
  if (lastDot === -1) return null
  const userId = cookieValue.slice(0, lastDot)
  const sig = cookieValue.slice(lastDot + 1)
  if (!userId || !sig) return null
  const expected = await hmacHex(getSecret(), userId)
  return timingSafeEqual(sig, expected) ? userId : null
}
