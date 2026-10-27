import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { previewDecision } from "@/lib/cloud-connect/preview-scope"

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (process.env.CLOUD_CONNECT_PREVIEW_ONLY === "1") {
    if (path === "/auth/login" && request.method === "GET" && !request.nextUrl.searchParams.has("next")) {
      return NextResponse.redirect(new URL("/auth/login?next=%2Fhome%2Fconectar%3Fview%3Dreal", request.url))
    }
    const decision = previewDecision(path, request.method)
    if (decision === "home") return NextResponse.redirect(new URL("/home", request.url))
    if (decision === "published-dashboard") {
      return NextResponse.redirect(new URL(`${path}${request.nextUrl.search}`, "https://mykosphare.vercel.app"))
    }
    if (decision === "gone") return NextResponse.json({ error: "legacy bridge disabled" }, { status: 410, headers: { "Cache-Control": "no-store" } })
    if (decision === "not-found") return new NextResponse("Not available in Cloud Connect preview", { status: 404 })
  }
  // Device credentials are checked by the v2 handler, not by browser cookies.
  if (path === "/api/v2/device/readings" || path === "/api/v2/device/sync") return NextResponse.next()
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
