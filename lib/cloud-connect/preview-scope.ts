/** Paths exposed by the isolated sensor-only preview. */
export type PreviewDecision = "allow" | "home" | "published-dashboard" | "gone" | "not-found"

export function isLegacyUnsafePath(path: string): boolean {
  return /^\/api\/(?:data|raw|command|config|demo|debug|network-info)(?:\/|$)/.test(path) ||
    path.startsWith("/api/ingest/") || path === "/api/protocol/sources"
}

export function previewDecision(path: string, method: string): PreviewDecision {
  if (isLegacyUnsafePath(path)) return "gone"
  if (path === "/" && (method === "GET" || method === "HEAD")) return "home"
  if ((path === "/dashboard" || path.startsWith("/dashboard/") || path === "/debug-network") &&
      (method === "GET" || method === "HEAD")) return "published-dashboard"
  if ((path === "/home" || path.startsWith("/home/")) && (method === "GET" || method === "HEAD")) return "allow"
  if (path === "/auth/login" || (path === "/api/auth/callback" && method === "GET")) return "allow"
  if (path === "/api/v2/home" && method === "GET") return "allow"
  if (path === "/api/v2/device/readings" && method === "POST") return "allow"
  if (path.startsWith("/api/v2/grow/") && method === "GET") return "allow"
  return "not-found"
}
