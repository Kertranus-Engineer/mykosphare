export interface AuthResult {
  authorized: boolean
  source: string
  reason?: string
}

const AUTH_HEADER = "x-ingestion-key"

function getSecret(): string | null {
  const secret = process.env.INGESTION_SECRET
  if (secret === undefined || secret === null) return null
  if (secret.length === 0) return null
  return secret
}

function isDevDefault(key: string): boolean {
  return key === "myk-dev-secret"
}

export function verifyIngestionKey(request: Request): AuthResult {
  const secret = getSecret()
  const key = request.headers.get(AUTH_HEADER)

  if (process.env.NODE_ENV === "development" && !secret && (!key || isDevDefault(key))) {
    return { authorized: true, source: "dev-unknown" }
  }

  if (!key) {
    return { authorized: false, source: "unknown", reason: "missing ingestion key" }
  }

  if (secret && key !== secret) {
    return { authorized: false, source: "unknown", reason: "invalid ingestion key" }
  }

  return { authorized: true, source: key.length > 16 ? key.substring(0, 8) : key }
}
