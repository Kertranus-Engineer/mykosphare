// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

vi.mock("@/lib/supabase/middleware", () => ({ updateSession: vi.fn(async () => NextResponse.next()) }))

import { updateSession } from "@/lib/supabase/middleware"
import { proxy } from "@/proxy"

const previous = process.env.CLOUD_CONNECT_PREVIEW_ONLY
afterEach(() => {
  if (previous === undefined) delete process.env.CLOUD_CONNECT_PREVIEW_ONLY
  else process.env.CLOUD_CONNECT_PREVIEW_ONLY = previous
  vi.mocked(updateSession).mockClear()
})

describe("preview proxy boundary", () => {
  it("returns 410 from legacy endpoints and 404 from preview writes", async () => {
    process.env.CLOUD_CONNECT_PREVIEW_ONLY = "1"
    expect((await proxy(new NextRequest("https://preview.invalid/api/data"))).status).toBe(410)
    expect((await proxy(new NextRequest("https://preview.invalid/api/command", { method: "POST" }))).status).toBe(410)
    expect((await proxy(new NextRequest("https://preview.invalid/api/v2/grow/runs", { method: "POST" }))).status).toBe(404)
    expect(updateSession).not.toHaveBeenCalled()
  })

  it("keeps HOME and redirects dashboard links to the published site", async () => {
    process.env.CLOUD_CONNECT_PREVIEW_ONLY = "1"
    expect((await proxy(new NextRequest("https://preview.invalid/home"))).status).toBe(200)
    const dashboard = await proxy(new NextRequest("https://preview.invalid/dashboard/alerts"))
    expect(dashboard.headers.get("location")).toBe("https://mykosphare.vercel.app/dashboard/alerts")
    const login = await proxy(new NextRequest("https://preview.invalid/auth/login"))
    expect(login.headers.get("location")).toContain("/auth/login?next=")
  })

  it("does not close the legacy dashboard routes outside the isolated preview", async () => {
    process.env.CLOUD_CONNECT_PREVIEW_ONLY = "0"
    expect((await proxy(new NextRequest("https://published.invalid/api/data"))).status).toBe(200)
    expect(updateSession).toHaveBeenCalledOnce()
  })
})
