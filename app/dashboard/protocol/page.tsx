"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  FlaskConical,
  Gauge,
  HeartPulse,
  RefreshCw,
  Network,
  Zap,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { PROTOCOL, PAYLOAD_EXAMPLES } from "@/lib/protocol"
import { validateTelemetryPayload, validateDeviceHeartbeat, validateEnvironmentalEvent } from "@/lib/ingestion"

interface SourcesData {
  timings: {
    source: string
    packetCount: number
    lastPacketAt: string | null
    firstPacketAt: string | null
    avgIntervalMs: number
    minIntervalMs: number
    maxIntervalMs: number
    lastIntervalMs: number | null
  }[]
  latencyStats: {
    min: number
    max: number
    avg: number
    p50: number
    p95: number
    p99: number
    sampleCount: number
  }
  heartbeats: {
    deviceId: string
    deviceType: string
    lastHeartbeatAt: string
    lastStatus: string
    lastHealth: number
    intervalMs: number | null
    expectedIntervalMs: number
    missedBeat: boolean
  }[]
  latencySamples: { timestamp: string; latencyMs: number; type: string }[]
  duplicateCount: number
  floodCounters: number
}

function formatTime(ts: string | null): string {
  if (!ts) return "—"
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 1000) return "just now"
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function formatMs(ms: number): string {
  if (ms === 0) return "—"
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function useSources(): SourcesData | null {
  const [data, setData] = useState<SourcesData | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/protocol/sources")
        if (res.ok) setData(await res.json())
      } catch {}
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [])

  return data
}

export default function ProtocolPage() {
  const sourcesData = useSources()
  const [payloadInput, setPayloadInput] = useState(
    JSON.stringify(PAYLOAD_EXAMPLES.telemetry, null, 2)
  )
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    detectedType?: string
    errors?: string[]
    normalized?: boolean
    data?: Record<string, unknown>
  } | null>(null)
  const [validating, setValidating] = useState(false)
  const [selectedTab, setSelectedTab] = useState<
    "spec" | "validate" | "sources" | "latency" | "heartbeats"
  >("spec")

  async function handleValidate() {
    setValidating(true)
    try {
      const res = await fetch("/api/protocol/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payloadInput,
      })
      const result = await res.json()
      setValidationResult(result)
    } catch {
      setValidationResult({
        valid: false,
        errors: ["Failed to reach validation endpoint"],
      })
    }
    setValidating(false)
  }

  function loadExample(type: keyof typeof PAYLOAD_EXAMPLES) {
    setPayloadInput(JSON.stringify(PAYLOAD_EXAMPLES[type], null, 2))
    setValidationResult(null)
  }

  const len = sourcesData?.latencySamples ?? []
  const maxLatency = len.length > 0 ? Math.max(...len.map((s) => s.latencyMs), 1) : 1

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Hardware Protocol
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Communication contract specification and diagnostics
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5">
          <Cpu className="size-3.5 text-muted-foreground/60" />
          <span className="text-xs tabular-nums text-muted-foreground/60">
            ESP32 Ready
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 border-b border-border/40 pb-2">
        {[
          { id: "spec" as const, label: "Specification", icon: Network },
          { id: "validate" as const, label: "Payload Inspector", icon: FlaskConical },
          { id: "sources" as const, label: "Source Timing", icon: Activity },
          { id: "latency" as const, label: "Latency", icon: Gauge },
          { id: "heartbeats" as const, label: "Heartbeats", icon: HeartPulse },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              selectedTab === tab.id
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/30"
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {selectedTab === "spec" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SpecCard
            title="Telemetry"
            specs={[
              { label: "Cadence", value: `${PROTOCOL.TELEMETRY_CADENCE_MS}ms`, desc: PROTOCOL.TELEMETRY_CADENCE_DESC },
              { label: "Batch Size", value: `${PROTOCOL.BATCH_MAX_SIZE}`, desc: PROTOCOL.BATCH_MAX_SIZE_DESC },
              { label: "Offline Buffer", value: `${PROTOCOL.OFFLINE_BUFFER_MAX}`, desc: PROTOCOL.OFFLINE_BUFFER_MAX_DESC },
              { label: "Flush Interval", value: `${PROTOCOL.BATCH_FLUSH_INTERVAL_MS}ms`, desc: PROTOCOL.BATCH_FLUSH_INTERVAL_DESC },
            ]}
          />
          <SpecCard
            title="Retry & Reconnect"
            specs={[
              { label: "Max Retries", value: `${PROTOCOL.MAX_RETRIES}`, desc: PROTOCOL.MAX_RETRIES_DESC },
              { label: "Base Delay", value: `${PROTOCOL.BASE_RETRY_DELAY_MS}ms`, desc: PROTOCOL.BASE_RETRY_DELAY_DESC },
              { label: "Max Delay", value: `${PROTOCOL.MAX_RETRY_DELAY_MS}ms`, desc: PROTOCOL.MAX_RETRY_DELAY_DESC },
              { label: "Reconnect Jitter", value: `±${Math.round(PROTOCOL.RECONNECT_JITTER_FACTOR * 100)}%`, desc: PROTOCOL.RECONNECT_JITTER_DESC },
            ]}
          />
          <SpecCard
            title="Security"
            specs={[
              { label: "Stale Threshold", value: `${PROTOCOL.STALE_THRESHOLD_MS / 1000 / 60}min`, desc: PROTOCOL.STALE_THRESHOLD_DESC },
              { label: "Flood Window", value: `${PROTOCOL.FLOOD_WINDOW_MS / 1000}s`, desc: PROTOCOL.FLOOD_WINDOW_DESC },
              { label: "Flood Limit", value: `${PROTOCOL.FLOOD_MAX_PACKETS} packets`, desc: PROTOCOL.FLOOD_MAX_PACKETS_DESC },
              { label: "Dedup Window", value: `${PROTOCOL.DUPLICATE_WINDOW_MS / 1000 / 60}min`, desc: PROTOCOL.DUPLICATE_WINDOW_DESC },
            ]}
          />
          <SpecCard
            title="Heartbeat"
            specs={[
              { label: "Cadence", value: `${PROTOCOL.HEARTBEAT_CADENCE_MS / 1000}s`, desc: PROTOCOL.HEARTBEAT_CADENCE_DESC },
              { label: "Dedup Active", value: sourcesData ? `${sourcesData.duplicateCount} keys` : "—" },
              { label: "Flood Active", value: sourcesData ? `${sourcesData.floodCounters} sources` : "—" },
            ]}
          />
        </div>
      )}

      {selectedTab === "validate" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FlaskConical className="size-4 text-muted-foreground" />
                Payload Inspector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(
                  Object.keys(PAYLOAD_EXAMPLES) as (keyof typeof PAYLOAD_EXAMPLES)[]
                ).map((key) => (
                  <button
                    key={key}
                    onClick={() => loadExample(key)}
                    className="rounded border border-border/40 px-2 py-1 text-[10px] text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/30 transition-colors"
                  >
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </button>
                ))}
              </div>
              <textarea
                value={payloadInput}
                onChange={(e) => {
                  setPayloadInput(e.target.value)
                  setValidationResult(null)
                }}
                className="w-full h-64 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs font-mono text-foreground/80 resize-y focus:outline-none focus:ring-1 focus:ring-foreground/20"
                spellCheck={false}
              />
              <button
                onClick={handleValidate}
                disabled={validating}
                className="mt-3 flex items-center gap-2 rounded-lg bg-foreground/10 px-4 py-2 text-xs font-medium text-foreground/80 hover:bg-foreground/20 transition-colors disabled:opacity-50"
              >
                {validating ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Zap className="size-3.5" />
                )}
                {validating ? "Validating..." : "Validate Payload"}
              </button>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-muted-foreground" />
                Validation Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validationResult ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "size-2 rounded-full",
                        validationResult.valid
                          ? "bg-emerald-500 shadow-[0_0_5px_1px] shadow-emerald-500/40"
                          : "bg-red-500 shadow-[0_0_5px_1px] shadow-red-500/40"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        validationResult.valid
                          ? "text-emerald-500"
                          : "text-red-500"
                      )}
                    >
                      {validationResult.valid ? "Valid" : "Invalid"}
                    </span>
                    {validationResult.detectedType && (
                      <span className="rounded bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground/60">
                        {validationResult.detectedType}
                      </span>
                    )}
                    {validationResult.normalized && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-500">
                        Normalized
                      </span>
                    )}
                  </div>

                  {validationResult.errors && validationResult.errors.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-muted-foreground/60">
                        Errors
                      </span>
                      {validationResult.errors.map((err, i) => (
                        <div
                          key={i}
                          className="rounded bg-red-500/5 px-2 py-1 text-[11px] text-red-400"
                        >
                          {err}
                        </div>
                      ))}
                    </div>
                  )}

                  {validationResult.data && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-muted-foreground/60">
                        Normalized Payload
                      </span>
                      <pre className="rounded bg-muted/20 p-2 text-[10px] font-mono text-foreground/60 overflow-x-auto max-h-48 overflow-y-auto">
                        {JSON.stringify(validationResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-muted-foreground/50">
                  Paste a payload and click Validate to test it against the
                  protocol schema.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTab === "sources" && (
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="size-4 text-muted-foreground" />
              Source Timing Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourcesData && sourcesData.timings.length > 0 ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_60px_80px_80px_80px_80px] gap-2 px-2 py-1 text-[10px] font-medium text-muted-foreground/50">
                  <span>Source</span>
                  <span className="text-right">Packets</span>
                  <span className="text-right">Avg Int.</span>
                  <span className="text-right">Min Int.</span>
                  <span className="text-right">Max Int.</span>
                  <span className="text-right">Last</span>
                </div>
                {sourcesData.timings.map((s) => (
                  <div
                    key={s.source}
                    className="grid grid-cols-[1fr_60px_80px_80px_80px_80px] gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-muted/20"
                  >
                    <span className="truncate font-medium text-foreground/80 font-mono">
                      {s.source}
                    </span>
                    <span className="text-right tabular-nums text-foreground/70">
                      {s.packetCount}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground/60">
                      {formatMs(s.avgIntervalMs)}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground/60">
                      {formatMs(s.minIntervalMs)}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground/60">
                      {formatMs(s.maxIntervalMs)}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground/50">
                      {formatTime(s.lastPacketAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No source timing data"
                description="Send telemetry via the ingestion API to populate."
              />
            )}
          </CardContent>
        </Card>
      )}

      {selectedTab === "latency" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Gauge className="size-4 text-muted-foreground" />
                Ingestion Latency
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sourcesData && sourcesData.latencyStats.sampleCount > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <LatencyStat label="Min" value={formatMs(sourcesData.latencyStats.min)} />
                    <LatencyStat label="Avg" value={formatMs(sourcesData.latencyStats.avg)} />
                    <LatencyStat label="Max" value={formatMs(sourcesData.latencyStats.max)} />
                    <LatencyStat label="P50" value={formatMs(sourcesData.latencyStats.p50)} />
                    <LatencyStat label="P95" value={formatMs(sourcesData.latencyStats.p95)} />
                    <LatencyStat label="P99" value={formatMs(sourcesData.latencyStats.p99)} />
                  </div>
                  <p className="text-[10px] text-muted-foreground/50">
                    Based on {sourcesData.latencyStats.sampleCount} samples
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={Gauge}
                  title="No latency data"
                  description="Latency metrics appear once telemetry flows through the pipeline."
                />
              )}
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="size-4 text-muted-foreground" />
                Recent Samples
              </CardTitle>
            </CardHeader>
            <CardContent>
              {len.length > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-end gap-px h-24">
                    {len.map((sample, i) => {
                      const height = Math.max(
                        4,
                        (sample.latencyMs / maxLatency) * 100
                      )
                      return (
                        <div
                          key={i}
                                          className="flex-1 rounded-t transition-all hover:opacity-80"
                                          style={{
                                            height: `${height}%`,
                                            background:
                                              sample.latencyMs > 1000
                                                ? "hsl(0, 70%, 50%)"
                                                : sample.latencyMs > 100
                                                  ? "hsl(40, 80%, 50%)"
                                                  : "hsl(160, 60%, 45%)",
                                          }}
                          title={`${sample.type}: ${formatMs(sample.latencyMs)}`}
                        />
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground/40">
                    <span>-60</span>
                    <span>now</span>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No samples yet"
                  description="Latency samples will appear as packets are ingested."
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTab === "heartbeats" && (
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <HeartPulse className="size-4 text-muted-foreground" />
              Heartbeat Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourcesData && sourcesData.heartbeats.length > 0 ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_80px_100px_80px_60px] gap-2 px-2 py-1 text-[10px] font-medium text-muted-foreground/50">
                  <span>Device</span>
                  <span className="text-right">Type</span>
                  <span className="text-right">Last Beat</span>
                  <span className="text-right">Interval</span>
                  <span className="text-right">Status</span>
                </div>
                {sourcesData.heartbeats.map((hb) => (
                  <div
                    key={hb.deviceId}
                    className="grid grid-cols-[1fr_80px_100px_80px_60px] gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-muted/20"
                  >
                    <span className="truncate font-medium text-foreground/80 font-mono">
                      {hb.deviceId}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground/60">
                      {hb.deviceType}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground/60">
                      {formatTime(hb.lastHeartbeatAt)}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground/60">
                      {hb.intervalMs ? formatMs(hb.intervalMs) : "—"}
                    </span>
                    <span className="text-right">
                      <div
                        className={cn(
                          "inline-block size-1.5 rounded-full",
                          hb.missedBeat
                            ? "bg-red-500 shadow-[0_0_4px_1px] shadow-red-500/40"
                            : "bg-emerald-500 shadow-[0_0_4px_1px] shadow-emerald-500/40"
                        )}
                      />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={HeartPulse}
                title="No heartbeat data"
                description="Device heartbeats appear when devices send heartbeats via the ingestion API."
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SpecCard({
  title,
  specs,
}: {
  title: string
  specs: { label: string; value: string; desc?: string }[]
}) {
  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Network className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {specs.map((spec) => (
            <div
              key={spec.label}
              className="flex items-baseline justify-between gap-4 rounded px-2 py-1 transition-colors hover:bg-muted/20"
            >
              <div className="min-w-0">
                <span className="text-xs font-medium text-foreground/70">
                  {spec.label}
                </span>
                {spec.desc && (
                  <p className="text-[10px] text-muted-foreground/50 leading-tight mt-0.5">
                    {spec.desc}
                  </p>
                )}
              </div>
              <code className="shrink-0 text-xs font-mono tabular-nums text-foreground/80">
                {spec.value}
              </code>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LatencyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/20 p-2.5 text-center">
      <div className="text-[10px] font-medium text-muted-foreground/50">
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums text-foreground/80">
        {value}
      </div>
    </div>
  )
}
