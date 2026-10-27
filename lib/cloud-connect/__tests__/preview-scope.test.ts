import { describe, expect, it } from "vitest"
import { previewDecision } from "../preview-scope"

describe("isolated cloud preview", () => {
  it("serves HOME, owner-scoped reads, login and device ingestion", () => {
    for (const [path, method] of [["/home", "GET"], ["/home/conectar", "GET"], ["/api/v2/home", "GET"],
      ["/api/v2/grow/chamber", "GET"], ["/api/v2/device/readings", "POST"], ["/auth/login", "POST"]]) {
      expect(previewDecision(path, method)).toBe("allow")
    }
  })

  it("blocks legacy APIs and write surfaces", () => {
    for (const path of ["/api/data", "/api/raw", "/api/command", "/api/config", "/api/demo",
      "/api/ingest/telemetry", "/api/debug/telemetry", "/api/network-info", "/api/protocol/sources"]) {
      expect(previewDecision(path, "GET")).toBe("gone")
      expect(previewDecision(path, "POST")).toBe("gone")
    }
    expect(previewDecision("/api/v2/grow/runs", "POST")).toBe("not-found")
    expect(previewDecision("/auth/register", "POST")).toBe("not-found")
  })

  it("sends existing advanced dashboard links to the unchanged published site", () => {
    expect(previewDecision("/dashboard/alerts", "GET")).toBe("published-dashboard")
    expect(previewDecision("/", "GET")).toBe("home")
  })
})
