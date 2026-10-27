import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

/**
 * Per-device ingestion credentials (server-only).
 *
 * A device key is a high-entropy random token shown ONCE at issuance. Only its
 * SHA-256 is stored (a fast hash is appropriate for 256-bit random tokens; it
 * is not a human password). A device may hold several credentials so keys can
 * be rotated: issue a new one, flash it, then revoke the old one.
 *
 * Not enterprise PKI: no mutual TLS, no signed requests, no replay nonce.
 * See docs/architecture/grow-cultivation-loop.md → remaining hardening.
 */
export const DEVICE_KEY_PREFIX = "myk_"

export interface IssuedDeviceKey {
  /** Plaintext — give to the device once, never persist. */
  key: string
  /** Stored. */
  hash: string
  /** Stored; lets humans tell credentials apart without revealing the key. */
  hint: string
}

export function hashDeviceKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex")
}

export function issueDeviceKey(): IssuedDeviceKey {
  const secret = randomBytes(32).toString("base64url")
  const key = `${DEVICE_KEY_PREFIX}${secret}`
  return { key, hash: hashDeviceKey(key), hint: key.slice(0, DEVICE_KEY_PREFIX.length + 6) }
}

/** Constant-time comparison against every active credential hash of the device. */
export function deviceKeyMatches(key: string, activeHashes: readonly string[]): boolean {
  if (typeof key !== "string" || !key.startsWith(DEVICE_KEY_PREFIX) || key.length > 256) return false
  const supplied = Buffer.from(hashDeviceKey(key), "hex")
  let matched = false
  for (const stored of activeHashes) {
    if (!/^[0-9a-f]{64}$/.test(stored)) continue
    const candidate = Buffer.from(stored, "hex")
    if (candidate.length === supplied.length && timingSafeEqual(candidate, supplied)) matched = true
  }
  return matched
}
