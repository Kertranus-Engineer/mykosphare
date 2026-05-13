"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  ExternalLink,
  FlaskConical,
  HeartPulse,
  RefreshCw,
  Shield,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  Terminal,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { DEPLOYMENT_ID } from "@/mock/device-registry"
import { PROTOCOL } from "@/lib/protocol"
import {
  FIRMWARE,
  WIFI_CONNECTION_STEPS,
  TELEMETRY_POST_STEPS,
  HEARTBEAT_POST_STEPS,
  RETRY_BEHAVIOR_STEPS,
  RECONNECT_BEHAVIOR_STEPS,
  DEVICE_CONFIG_EXAMPLE,
  ESP32_PAYLOADS,
  ARDUINO_PSEUDOCODE,
} from "@/lib/firmware"

interface BridgeData {
  physicalSources: string[]
  sourceBreakdown: { physical: number; simulator: number }
  hasActivePhysicalSource: boolean
  lastPhysicalPacket: {
    id: string
    receivedAt: string
    source: string
    deviceId: string
    type: string
    ingestionLatencyMs: number
  } | null
  heartbeats: {
    deviceId: string
    deviceType: string
    lastHeartbeatAt: string
    missedBeat: boolean
  }[]
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

function useBridge(): BridgeData | null {
  const [data, setData] = useState<BridgeData | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/protocol/sources")
        if (res.ok) {
          const json = await res.json()
          setData(json.bridge)
        }
      } catch {}
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [])

  return data
}

export default function ESP32Page() {
  const bridge = useBridge()
  const [setupExpanded, setSetupExpanded] = useState(true)
  const [firmwareExpanded, setFirmwareExpanded] = useState(false)
  const [troubleshootingExpanded, setTroubleshootingExpanded] = useState(false)
  const [pseudocodeCopied, setPseudocodeCopied] = useState(false)

  const hasPhysicalSource = bridge?.hasActivePhysicalSource ?? false
  const physicalCount = bridge?.physicalSources.length ?? 0
  const lastPacket = bridge?.lastPhysicalPacket

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            ESP32 Bridge
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Onboarding, configuration, and hardware monitoring
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5">
          <Cpu className="size-3.5 text-muted-foreground/60" />
          <span className="text-xs tabular-nums text-muted-foreground/60">
            v1.0.0
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground/70">
              <Activity className="size-3.5 text-muted-foreground/50" />
              Bridge Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "size-2 rounded-full",
                  hasPhysicalSource
                    ? "bg-emerald-500 shadow-[0_0_5px_1px] shadow-emerald-500/40"
                    : "bg-muted-foreground/30"
                )}
              />
              <span
                className={cn(
                  "text-sm font-semibold",
                  hasPhysicalSource
                    ? "text-emerald-500"
                    : "text-muted-foreground/50"
                )}
              >
                {hasPhysicalSource ? "Connected" : "No Device"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/50">
              {physicalCount > 0
                ? `${physicalCount} physical source${physicalCount > 1 ? "s" : ""} detected`
                : "Waiting for ESP32 connection"}
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground/70">
              <Cpu className="size-3.5 text-muted-foreground/50" />
              Last Packet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastPacket ? (
              <>
                <div className="text-sm font-semibold tabular-nums text-foreground/80">
                  {lastPacket.deviceId}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground/50">
                    {formatTime(lastPacket.receivedAt)}
                  </span>
                  <span className="rounded bg-muted/30 px-1 py-0.5 text-[9px] text-muted-foreground/60">
                    {lastPacket.type}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold tabular-nums text-muted-foreground/50">
                  —
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground/40">
                  Awaiting first packet
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground/70">
              <Shield className="size-3.5 text-muted-foreground/50" />
              Source Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div>
                <div className="text-sm font-semibold tabular-nums text-foreground/80">
                  {bridge?.sourceBreakdown.physical ?? 0}
                </div>
                <p className="text-[10px] text-muted-foreground/50">Physical</p>
              </div>
              <div>
                <div className="text-sm font-semibold tabular-nums text-muted-foreground/60">
                  {bridge?.sourceBreakdown.simulator ?? 0}
                </div>
                <p className="text-[10px] text-muted-foreground/50">
                  Simulator
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground/70">
              <HeartPulse className="size-3.5 text-muted-foreground/50" />
              Heartbeat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold tabular-nums text-foreground/80">
              {bridge?.heartbeats.length ?? 0}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground/50">
              {`Every ${PROTOCOL.HEARTBEAT_CADENCE_MS / 1000}s cadence`}
            </p>
          </CardContent>
        </Card>
      </div>

      <CollapsibleCard
        title="Setup Instructions"
        icon={Wifi}
        expanded={setupExpanded}
        onToggle={() => setSetupExpanded(!setupExpanded)}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-medium text-foreground/80 mb-2">
              Prerequisites
            </h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground/70">
              <li className="flex items-start gap-2">
                <div className="size-1.5 mt-1 shrink-0 rounded-full bg-emerald-500/60" />
                ESP32 development board (ESP32-WROOM-32 or later)
              </li>
              <li className="flex items-start gap-2">
                <div className="size-1.5 mt-1 shrink-0 rounded-full bg-emerald-500/60" />
                Sensors: SHT31 (temp/humidity), MH-Z19B (CO₂), SCT-013 (energy)
              </li>
              <li className="flex items-start gap-2">
                <div className="size-1.5 mt-1 shrink-0 rounded-full bg-emerald-500/60" />
                Arduino IDE with ESP32 board support (or PlatformIO)
              </li>
              <li className="flex items-start gap-2">
                <div className="size-1.5 mt-1 shrink-0 rounded-full bg-emerald-500/60" />
                Libraries: WiFi.h, HTTPClient.h, ArduinoJson.h
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium text-foreground/80 mb-2">
              Ingestion Endpoints
            </h3>
            <div className="space-y-1.5">
              <EndpointLine method="POST" path="/api/ingest/telemetry" />
              <EndpointLine method="POST" path="/api/ingest/device-heartbeat" />
              <EndpointLine method="POST" path="/api/ingest/environmental-event" />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-foreground/80 mb-2">
              Device Configuration
            </h3>
            <pre className="rounded-lg bg-muted/20 p-3 text-[11px] font-mono text-foreground/70 overflow-x-auto">
              {JSON.stringify(DEVICE_CONFIG_EXAMPLE, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="text-xs font-medium text-foreground/80 mb-2">
              Required Headers
            </h3>
            <div className="space-y-1.5">
              <HeaderLine header="Content-Type: application/json" desc="All ingestion requests" />
              <HeaderLine header="x-ingestion-key: &lt;your_key&gt;" desc="Authentication (see Settings)" />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-foreground/80 mb-2">
              Deployment
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/20 p-2.5">
                <p className="text-[10px] text-muted-foreground/50">Deployment ID</p>
                <code className="text-xs font-mono text-foreground/80">{DEPLOYMENT_ID}</code>
              </div>
              <div className="rounded-lg bg-muted/20 p-2.5">
                <p className="text-[10px] text-muted-foreground/50">Protocol Version</p>
                <code className="text-xs font-mono text-foreground/80">v1</code>
              </div>
              <div className="rounded-lg bg-muted/20 p-2.5">
                <p className="text-[10px] text-muted-foreground/50">Telemetry Cadence</p>
                <code className="text-xs font-mono text-foreground/80">{PROTOCOL.TELEMETRY_CADENCE_MS}ms</code>
              </div>
              <div className="rounded-lg bg-muted/20 p-2.5">
                <p className="text-[10px] text-muted-foreground/50">Heartbeat Cadence</p>
                <code className="text-xs font-mono text-foreground/80">{PROTOCOL.HEARTBEAT_CADENCE_MS / 1000}s</code>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Firmware Reference"
        icon={Terminal}
        expanded={firmwareExpanded}
        onToggle={() => setFirmwareExpanded(!firmwareExpanded)}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-medium text-foreground/80 mb-2">
              WiFi Connection Flow
            </h3>
            <ul className="space-y-1">
              {WIFI_CONNECTION_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground/70">
                  <span className="w-4 shrink-0 text-right text-[10px] text-muted-foreground/40">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium text-foreground/80 mb-2">
              Telemetry POST Flow
            </h3>
            <ul className="space-y-1">
              {TELEMETRY_POST_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground/70">
                  <span className="w-4 shrink-0 text-right text-[10px] text-muted-foreground/40">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium text-foreground/80 mb-2">
              Retry Strategy
            </h3>
            <ul className="space-y-1">
              {RETRY_BEHAVIOR_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground/70">
                  <span className="w-4 shrink-0 text-right text-[10px] text-muted-foreground/40">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium text-foreground/80 mb-2">
              Reconnect Behavior
            </h3>
            <ul className="space-y-1">
              {RECONNECT_BEHAVIOR_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground/70">
                  <span className="w-4 shrink-0 text-right text-[10px] text-muted-foreground/40">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-foreground/80">
                Reference Pseudocode
              </h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(ARDUINO_PSEUDOCODE)
                  setPseudocodeCopied(true)
                  setTimeout(() => setPseudocodeCopied(false), 2000)
                }}
                className="flex items-center gap-1 rounded border border-border/40 px-2 py-1 text-[10px] text-muted-foreground/60 hover:text-foreground/80 transition-colors"
              >
                {pseudocodeCopied ? (
                  <CheckCircle2 className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
                {pseudocodeCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="rounded-lg bg-muted/20 p-3 text-[11px] font-mono text-foreground/70 overflow-x-auto whitespace-pre-wrap">
              {ARDUINO_PSEUDOCODE}
            </pre>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Payload Examples"
        icon={FlaskConical}
        expanded={false}
        onToggle={() => {}}
      >
        <ESP32PayloadSection />
      </CollapsibleCard>

      <CollapsibleCard
        title="Troubleshooting"
        icon={AlertTriangle}
        expanded={troubleshootingExpanded}
        onToggle={() => setTroubleshootingExpanded(!troubleshootingExpanded)}
      >
        <div className="space-y-3">
          <TroubleshootItem
            problem="ESP32 cannot connect to WiFi"
            solutions={[
              "Verify SSID and password in firmware config",
              "Check that WiFi network is 2.4GHz (ESP32 does not support 5GHz)",
              "Ensure WiFi credentials match exactly (case-sensitive)",
              "Check router DHCP pool — ensure IP addresses available",
              "Power cycle the ESP32 and router",
            ]}
          />
          <TroubleshootItem
            problem="POST requests return 401 Unauthorized"
            solutions={[
              "Verify x-ingestion-key header matches the key configured in deployment settings",
              "Check that INGESTION_KEY in firmware matches the expected key",
              "Ensure the key is not empty or default value in production",
            ]}
          />
          <TroubleshootItem
            problem="Telemetry accepted but no data in dashboard"
            solutions={[
              "Check that deploymentId in payload matches " + DEPLOYMENT_ID,
              "Verify deviceId uses correct naming convention (e.g., SHT31-01)",
              "Wait for next dashboard refresh cycle (up to 3s)",
              "Check Ingestion dashboard for accepted/rejected counts",
            ]}
          />
          <TroubleshootItem
            problem="Payloads rejected as stale"
            solutions={[
              `Timestamps older than ${PROTOCOL.STALE_THRESHOLD_MS / 1000 / 60} minutes are rejected`,
              "Ensure ESP32 clock is synced (NTP) before sending telemetry",
              "Check that timestamp format is ISO 8601 (e.g., 2026-05-13T12:00:00.000Z)",
              "If using millis() for timestamp, convert to absolute UTC time",
            ]}
          />
          <TroubleshootItem
            problem="Rate limited (HTTP 429)"
            solutions={[
              `Max ${PROTOCOL.FLOOD_MAX_PACKETS} packets per ${PROTOCOL.FLOOD_WINDOW_MS / 1000}s window after reconnect`,
              "Ensure telemetry cadence respects the 2.5s minimum interval",
              "After reconnect, buffer flush rate should not exceed 100ms between requests",
              "Wait for rate limit window to reset before retrying",
            ]}
          />
          <TroubleshootItem
            problem="Offline buffering not working"
            solutions={[
              "Enable SPIFFS in Arduino IDE (Tools → Partition Scheme → SPIFFS)",
              `${FIRMWARE.OFFLINE.BUFFER_FILENAME_DESC}: ${FIRMWARE.OFFLINE.BUFFER_FILENAME}`,
              `Max buffer size: ${PROTOCOL.OFFLINE_BUFFER_MAX} packets (oldest dropped first)`,
              "Buffered packets are flushed in FIFO order on reconnect",
            ]}
          />
        </div>
      </CollapsibleCard>
    </div>
  )
}

function CollapsibleCard({
  title,
  icon: Icon,
  children,
  expanded,
  onToggle,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={onToggle}
      >
        <CardTitle className="flex items-center gap-2 text-sm">
          {expanded ? (
            <ChevronDown className="size-3.5 text-muted-foreground/50" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
          )}
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      {expanded && <CardContent>{children}</CardContent>}
    </Card>
  )
}

function EndpointLine({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex items-center gap-2 rounded bg-muted/20 px-2.5 py-1.5">
      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500">
        {method}
      </span>
      <code className="text-xs font-mono text-foreground/70">{path}</code>
    </div>
  )
}

function HeaderLine({ header, desc }: { header: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 rounded bg-muted/20 px-2.5 py-1.5">
      <code className="text-xs font-mono text-foreground/70">{header}</code>
      <span className="text-[10px] text-muted-foreground/50">{desc}</span>
    </div>
  )
}

function TroubleshootItem({
  problem,
  solutions,
}: {
  problem: string
  solutions: string[]
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
        <div>
          <p className="text-xs font-medium text-foreground/80">{problem}</p>
          <ul className="mt-1.5 space-y-1">
            {solutions.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground/70">
                <span className="mt-0.5 size-1 shrink-0 rounded-full bg-emerald-500/50" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function ESP32PayloadSection() {
  const [selectedPayload, setSelectedPayload] = useState<keyof typeof ESP32_PAYLOADS>("telemetry")

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(Object.keys(ESP32_PAYLOADS) as (keyof typeof ESP32_PAYLOADS)[]).map(
          (key) => (
            <button
              key={key}
              onClick={() => setSelectedPayload(key)}
              className={cn(
                "rounded px-2 py-1 text-[10px] transition-colors",
                selectedPayload === key
                  ? "bg-foreground/10 text-foreground font-medium"
                  : "border border-border/40 text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/30"
              )}
            >
              {key.replace(/([A-Z])/g, " $1").trim()}
            </button>
          )
        )}
      </div>
      <div className="relative">
        <pre className="rounded-lg bg-muted/20 p-3 text-[11px] font-mono text-foreground/70 overflow-x-auto whitespace-pre-wrap">
          {ESP32_PAYLOADS[selectedPayload]}
        </pre>
        <button
          onClick={() => {
            navigator.clipboard.writeText(ESP32_PAYLOADS[selectedPayload])
          }}
          className="absolute top-2 right-2 flex items-center gap-1 rounded border border-border/40 bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground/60 hover:text-foreground/80 transition-colors"
        >
          <Copy className="size-3" />
          Copy
        </button>
      </div>
    </div>
  )
}
