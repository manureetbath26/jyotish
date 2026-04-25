/**
 * Anonymous chat-session cookie.
 *
 * Lets non-logged-in users use the "Ask AI Astrologer" 2-question free
 * trial without signing up. The cookie holds a server-issued UUID;
 * ChatSession.anonSessionId carries the same value so quota lookups
 * are scoped per browser without revealing identity.
 *
 * Only used by API routes (server-only). Client never reads or writes
 * this cookie directly.
 */

import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

export const ANON_COOKIE_NAME = "jyotish_anon_id";
const COOKIE_MAX_AGE_DAYS = 30;

export async function readAnonId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ANON_COOKIE_NAME)?.value ?? null;
}

/**
 * Returns the existing anon id from the cookie, or generates a new one
 * AND sets the cookie. Use in routes that establish a guest session
 * (e.g. POST /api/chat/session for anonymous users).
 */
export async function getOrSetAnonId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(ANON_COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = randomUUID();
  jar.set(ANON_COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
    path: "/",
  });
  return id;
}
