import { NextResponse } from "next/server"
import { getIngestionMetrics, resetIngestionMetrics } from "@/lib/ingestion/metrics"
import { getRateLimitStoreSize } from "@/lib/ingestion/rate-limit"
import { getIngestionLogs } from "@/lib/ingestion/ingestion-logger"

export async function GET(): Promise<NextResponse> {
  const metrics = getIngestionMetrics()
  const rateLimitSize = getRateLimitStoreSize()
  const recentLogs = getIngestionLogs(10)

  return NextResponse.json({
    ...metrics,
    rateLimitEntries: rateLimitSize,
    recentLogs,
  })
}

export async function DELETE(): Promise<NextResponse> {
  resetIngestionMetrics()
  return NextResponse.json({ reset: true })
}
