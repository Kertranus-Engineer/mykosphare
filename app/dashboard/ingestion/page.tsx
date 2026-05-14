"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { getIngestionLogs, type IngestionLogEntry } from "@/lib/ingestion"

interface MetricsSnapshot {
  totalAccepted: number
  totalRejected: number
  malformedPayloads: number
  staleTimestamps: number
  rateLimitHits: number
  authFailures: number
  lastIngestionTimestamp: string | null
  perSource: Record<string, {
    accepted: number
    rejected: number
    lastAcceptedTimestamp: string | null
    lastRejectedTimestamp: string | null
  }>
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "—"
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 1000) return "just now"
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function useMetrics(): MetricsSnapshot {
  const [metrics, setMetrics] = useState<MetricsSnapshot>({
    totalAccepted: 0, totalRejected: 0, malformedPayloads: 0,
    staleTimestamps: 0, rateLimitHits: 0, authFailures: 0,
    lastIngestionTimestamp: null, perSource: {},
  })

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/ingest/metrics")
        if (res.ok) {
          const data = await res.json()
          setMetrics(data)
        }
      } catch {}
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [])

  return metrics
}

export default function IngestionPage() {
  const metrics = useMetrics()
  const [ingestionLogs, setIngestionLogs] = useState<IngestionLogEntry[]>([])
  const [showAllSources, setShowAllSources] = useState(false)

  useEffect(() => {
    const logs = getIngestionLogs(50)
    const t = setTimeout(() => setIngestionLogs(logs), 0)
    return () => clearTimeout(t)
  }, [metrics.totalAccepted + metrics.totalRejected])

  const totalRequests = metrics.totalAccepted + metrics.totalRejected
  const acceptRate = totalRequests > 0
    ? Math.round((metrics.totalAccepted / totalRequests) * 100)
    : 100
  const isHealthy = acceptRate >= 80

  const sources = Object.entries(metrics.perSource)
  const displayedSources = showAllSources ? sources : sources.slice(0, 4)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Ingestion
          </h1>
          <p className="text-sm text-muted-foreground/70">
            External telemetry transport monitoring and diagnostics
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5">
          <div
            className={cn(
              "size-2 rounded-full",
              isHealthy
                ? "bg-emerald-500 shadow-[0_0_5px_1px] shadow-emerald-500/40"
                : "bg-amber-500 shadow-[0_0_5px_1px] shadow-amber-500/40"
            )}
          />
          <span className="text-xs tabular-nums text-muted-foreground/60">
            {isHealthy ? "Healthy" : "Degraded"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={TrendingUp}
          label="Accepted"
          value={metrics.totalAccepted.toLocaleString()}
          sub={acceptRate >= 90 ? "Normal" : "Monitor"}
          intent={acceptRate >= 90 ? "success" : "warning"}
        />
        <MetricCard
          icon={TrendingDown}
          label="Rejected"
          value={metrics.totalRejected.toLocaleString()}
          sub={`${acceptRate}% acceptance`}
          intent={acceptRate >= 80 ? "muted" : "danger"}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Malformed"
          value={metrics.malformedPayloads.toLocaleString()}
          sub={`${metrics.staleTimestamps} stale`}
          intent={metrics.malformedPayloads > 0 ? "warning" : "muted"}
        />
        <MetricCard
          icon={Shield}
          label="Blocked"
          value={(metrics.rateLimitHits + metrics.authFailures).toLocaleString()}
          sub={`${metrics.rateLimitHits} rate / ${metrics.authFailures} auth`}
          intent={
            metrics.rateLimitHits + metrics.authFailures > 0
              ? "danger"
              : "muted"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="size-4 text-muted-foreground" />
              Source Activity
              {sources.length > 4 && (
                <button
                  onClick={() => setShowAllSources(!showAllSources)}
                  className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-foreground/70 transition-colors"
                >
                  {showAllSources ? (
                    <EyeOff className="size-3" />
                  ) : (
                    <Eye className="size-3" />
                  )}
                  {showAllSources ? "Less" : `${sources.length - 4} more`}
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayedSources.length > 0 ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_60px_60px_80px] gap-2 px-2 py-1 text-[10px] font-medium text-muted-foreground/50">
                  <span>Source</span>
                  <span className="text-right">OK</span>
                  <span className="text-right">Fail</span>
                  <span className="text-right">Last</span>
                </div>
                {displayedSources.map(([key, src]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[1fr_60px_60px_80px] gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-muted/20"
                  >
                    <span className="truncate font-medium text-foreground/80 font-mono">
                      {key}
                    </span>
                    <span className="text-right tabular-nums text-emerald-500">
                      {src.accepted}
                    </span>
                    <span
                      className={cn(
                        "text-right tabular-nums",
                        src.rejected > 0
                          ? "text-red-500"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {src.rejected}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground/60">
                      {formatTimestamp(src.lastAcceptedTimestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Zap}
                title="No external sources detected"
                description='POST to /api/ingest/telemetry to begin.'
              />
            )}
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-muted-foreground" />
              Ingestion Event Log
              {metrics.lastIngestionTimestamp && (
                <span className="ml-auto text-[10px] font-normal text-muted-foreground/50">
                  Last: {formatTimestamp(metrics.lastIngestionTimestamp)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ingestionLogs.length > 0 ? (
              <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
                {ingestionLogs.slice(0, 30).map((log, i) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-muted/20"
                  >
                    <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground/50">
                      {new Date(log.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <div
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        log.accepted
                          ? "bg-emerald-500 shadow-[0_0_4px_1px] shadow-emerald-500/30"
                          : "bg-red-500 shadow-[0_0_4px_1px] shadow-red-500/30"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-foreground/80">
                        {log.eventType}
                      </span>
                      {log.reason && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground/50">
                          — {log.reason}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground/40 font-mono">
                      {log.source}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No ingestion events"
                description="Events appear as data flows through the ingestion pipeline."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="size-4 text-muted-foreground" />
            Ingestion API Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <EndpointRow
              method="POST"
              path="/api/ingest/telemetry"
              desc="Submit environmental telemetry readings (temperature, humidity, CO₂, energy)"
              example={`{\n  "version": 1,\n  "source": "esp32",\n  "timestamp": "2026-05-13T...",\n  "deviceId": "SHT31-01",\n  "deploymentId": "MYK-CH-001",\n  "metrics": {\n    "temperature": 24.6,\n    "humidity": 61.2,\n    "co2": 412,\n    "energyUsage": 1.8\n  },\n  "environmentalState": "STABLE",\n  "operationalMode": "OPERATIONAL"\n}`}
            />
            <EndpointRow
              method="POST"
              path="/api/ingest/device-heartbeat"
              desc="Register or update device status and health"
              example={`{\n  "version": 1,\n  "source": "esp32",\n  "timestamp": "2026-05-13T...",\n  "deviceId": "MH-Z19B-02",\n  "deviceType": "MH-Z19B",\n  "status": "online",\n  "health": 97.2,\n  "uptime": 84600,\n  "deploymentId": "MYK-CH-001"\n}`}
            />
            <EndpointRow
              method="POST"
              path="/api/ingest/environmental-event"
              desc="Send environmental state change or threshold breach events"
              example={`{\n  "version": 1,\n  "source": "esp32",\n  "timestamp": "2026-05-13T...",\n  "type": "state_change",\n  "deploymentId": "MYK-CH-001",\n  "currentState": "WARNING",\n  "severity": "warning",\n  "description": "CO₂ exceeded threshold"\n}`}
            />
            <div className="mt-3 rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                <Zap className="size-3.5 text-amber-500" />
                All endpoints require
                <code className="rounded bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono">
                  x-ingestion-key
                </code>
                header for authentication.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  intent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
  intent: "success" | "warning" | "danger" | "muted"
}) {
  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground/70">
          <Icon
            className={cn(
              "size-3.5",
              intent === "success" && "text-emerald-500",
              intent === "warning" && "text-amber-500",
              intent === "danger" && "text-red-500",
              intent === "muted" && "text-muted-foreground/50"
            )}
          />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground/50">{sub}</p>
      </CardContent>
    </Card>
  )
}

function EndpointRow({
  method,
  path,
  desc,
  example,
}: {
  method: string
  path: string
  desc: string
  example: string
}) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-3 transition-colors hover:bg-muted/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500">
              {method}
            </span>
            <code className="text-xs font-mono text-foreground/80">{path}</code>
          </div>
          <p className="mt-1 text-xs text-muted-foreground/70">{desc}</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(example)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="shrink-0 flex items-center gap-1 rounded border border-border/40 px-2 py-1 text-[10px] text-muted-foreground/60 hover:text-foreground/80 transition-colors"
        >
          {copied ? (
            <CheckCircle2 className="size-3 text-emerald-500" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          {copied ? "Copied" : "Example"}
        </button>
      </div>
    </div>
  )
}
