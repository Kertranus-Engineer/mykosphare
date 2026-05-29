"use client"

import {
  Cpu,
  Radio,
  Cloud,
  BarChart3,
  Bell,
  Monitor,
  ChevronDown,
  Wifi,
  CircuitBoard,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface FlowBlock {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  status: "active" | "idle" | "processing"
}

const FLOW: FlowBlock[] = [
  {
    icon: Cpu,
    label: "Environmental Sensors",
    description: "DHT22 temperature and humidity sensors capture real-time environmental data.",
    status: "active",
  },
  {
    icon: CircuitBoard,
    label: "ESP32 Controller",
    description: "Collects environmental information from connected sensors and processes it locally.",
    status: "active",
  },
  {
    icon: Wifi,
    label: "Wireless Communication",
    description: "Data transmitted via WiFi to the cloud ingestion endpoint using HTTP protocol.",
    status: "processing",
  },
  {
    icon: Cloud,
    label: "MYKOSPHARE Cloud",
    description: "Receives, validates and stores telemetry data for further processing and analysis.",
    status: "active",
  },
  {
    icon: BarChart3,
    label: "Analytics Engine",
    description: "Processes data and identifies abnormal conditions through AI-driven analysis.",
    status: "active",
  },
  {
    icon: Bell,
    label: "Alert System",
    description: "Generates notifications when thresholds are exceeded or anomalies are detected.",
    status: "idle",
  },
  {
    icon: Monitor,
    label: "Operator Dashboard",
    description: "Visual interface for monitoring, analysis, and operational control of the system.",
    status: "active",
  },
]

const STATUS_STYLES: Record<FlowBlock["status"], { dot: string; ring: string; label: string }> = {
  active: { dot: "bg-emerald-500", ring: "ring-emerald-500/20 shadow-[0_0_12px_-4px] shadow-emerald-500/10", label: "ACTIVE" },
  processing: { dot: "bg-blue-500 animate-pulse", ring: "ring-blue-500/20 shadow-[0_0_12px_-4px] shadow-blue-500/10", label: "PROCESSING" },
  idle: { dot: "bg-muted-foreground/40", ring: "ring-muted-foreground/10", label: "STANDBY" },
}

export default function ArchitecturePage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            System Architecture
          </h1>
        </div>
        <p className="text-sm text-muted-foreground/70 max-w-2xl">
          Visual flow of how MYKOSPHARE captures, transmits, processes and visualizes environmental data from sensor to dashboard.
        </p>
      </div>

      <div className="flex flex-col gap-3 -mb-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">End-to-End Telemetry Pipeline</h2>
        </div>
        <p className="text-xs text-muted-foreground/60 max-w-2xl">
          Environmental data travels from physical sensors through ESP32 hardware, cloud ingestion services, analytics pipelines and finally into the operational dashboard.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {FLOW.map((block, i) => {
          const statusStyle = STATUS_STYLES[block.status]
          return (
            <div key={block.label} className="flex flex-col items-center gap-2">
              <Card
                className={cn(
                  "w-full max-w-2xl mx-auto transition-all duration-300 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]",
                  "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
                  statusStyle.ring,
                )}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={cn(
                    "relative flex size-10 shrink-0 items-center justify-center rounded-lg border",
                    block.status === "active" ? "bg-emerald-500/10 border-emerald-500/20" :
                    block.status === "processing" ? "bg-blue-500/10 border-blue-500/20" :
                    "bg-muted/30 border-border/30",
                  )}>
                    <block.icon className={cn(
                      "size-5",
                      block.status === "active" ? "text-emerald-500" :
                      block.status === "processing" ? "text-blue-500" :
                      "text-muted-foreground/50",
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tracking-tight text-foreground">
                        {block.label}
                      </span>
                      <span className={cn(
                        "text-[8px] font-medium tracking-[0.15em] px-1.5 py-0.5 rounded border",
                        block.status === "active" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                        block.status === "processing" ? "text-blue-500 bg-blue-500/10 border-blue-500/20" :
                        "text-muted-foreground/50 bg-muted/30 border-border/20",
                      )}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground/70 mt-0.5">
                      {block.description}
                    </p>
                  </div>
                  <div className={cn(
                    "size-2.5 rounded-full shrink-0",
                    statusStyle.dot,
                  )} />
                </CardContent>
              </Card>
              {i < FLOW.length - 1 && (
                <div className="flex flex-col items-center gap-0.5 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: `${i * 80 + 60}ms` }}>
                  <div className="h-6 w-px bg-gradient-to-b from-emerald-500/40 to-emerald-500/20" />
                  <ChevronDown className="size-3 text-emerald-500/30" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-2 p-4 rounded-lg bg-card/50 border border-border/30 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: "600ms" }}>
        <p className="text-xs leading-relaxed text-muted-foreground/60 text-center">
          Data flows from physical sensors through the ESP32 microcontroller, transmitted over WiFi to the cloud ingestion layer. The analytics engine continuously processes incoming telemetry, applying anomaly detection and threshold monitoring. Alerts are generated when environmental parameters exceed defined limits, and the operator dashboard provides real-time visualization and control capabilities.
        </p>
      </div>

      {/* ── End-to-End Flow ──────────────────── */}
      <div className="flex flex-col gap-3 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: "700ms" }}>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">End-to-End Flow</h2>
        </div>
        <Card className="border-emerald-500/10 shadow-[0_0_16px_-4px] shadow-emerald-500/5">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {[
                { label: "Sensor", icon: Cpu, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                { label: "ESP32", icon: CircuitBoard, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                { label: "WiFi", icon: Wifi, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                { label: "Cloud", icon: Cloud, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
                { label: "Analytics", icon: BarChart3, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
                { label: "Alerts", icon: Bell, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
                { label: "Dashboard", icon: Monitor, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              ].map((step, idx, arr) => (
                <div key={step.label} className="flex items-center gap-0">
                  <div className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-3 py-2 transition-all duration-200 hover:scale-[1.05]",
                    step.bg, step.border
                  )}>
                    <step.icon className={cn("size-4", step.color)} />
                    <span className={cn("text-[9px] font-semibold tracking-wider", step.color)}>{step.label}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <ChevronDown className="size-3 text-muted-foreground/30 rotate-[-90deg] sm:rotate-0 mx-0.5" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground/50 text-center mt-3">
              Complete environmental monitoring pipeline from data acquisition to decision making.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Flow Summary ────────────────── */}
      <div className="flex flex-col gap-2 rounded-lg bg-card/50 border border-border/30 p-4 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: "800ms" }}>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-1">
          <span>Data Flow</span>
          <span className="text-muted-foreground/20">·</span>
          <span className="text-[9px] font-mono font-medium tracking-[0.2em] text-emerald-500/60">End-to-End Telemetry Pipeline</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-[11px] text-foreground/60">
          {["Sensor", "ESP32", "WiFi", "Cloud", "Analytics", "Dashboard", "Alerts"].map((step, idx, arr) => (
            <span key={step} className="flex items-center gap-1">
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 font-medium text-emerald-500">{step}</span>
              {idx < arr.length - 1 && <span className="text-muted-foreground/20">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
