"use client"

import { useState, useMemo } from "react"
import {
  Terminal,
  Send,
  Clock,
  AlertTriangle,
  Shield,
  Zap,
  Wind,
  RotateCcw,
  FlaskConical,
  Sun,
  CheckCircle2,
  XCircle,
  Loader2,
  Radio,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useCommands } from "@/lib/commands/use-commands"
import { useUnifiedOperationalState } from "@/lib/unified/use-unified"
import type { CommandType } from "@/lib/commands/types"
import { COMMAND_LABELS } from "@/lib/commands/types"
import { CARD_HOVER } from "@/lib/styles/tokens"

const COMMAND_OPTIONS: {
  type: CommandType
  icon: typeof Terminal
  color: string
  bg: string
}[] = [
  { type: "airflow", icon: Wind, color: "text-blue-500", bg: "bg-blue-500/10" },
  { type: "lighting", icon: Sun, color: "text-amber-500", bg: "bg-amber-500/10" },
  { type: "sterilization", icon: FlaskConical, color: "text-violet-500", bg: "bg-violet-500/10" },
  { type: "relay-power", icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
  { type: "mesh-restart", icon: Radio, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { type: "emergency-isolation", icon: Shield, color: "text-red-500", bg: "bg-red-500/10" },
]

const STATUS_META: Record<string, { color: string; bg: string; icon: typeof Terminal }> = {
  queued: { color: "text-muted-foreground", bg: "bg-muted/30", icon: Clock },
  acknowledged: { color: "text-blue-500", bg: "bg-blue-500/10", icon: Loader2 },
  executing: { color: "text-amber-500", bg: "bg-amber-500/10", icon: Loader2 },
  completed: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  failed: { color: "text-red-500", bg: "bg-red-500/10", icon: XCircle },
}

export function CommandCenter() {
  const unified = useUnifiedOperationalState()
  const { commands, issueCommand, clearCompleted, activeCount } = useCommands()
  const [selectedTarget, setSelectedTarget] = useState("MYK-CH-001")
  const [selectedPriority, setSelectedPriority] = useState<"low" | "normal" | "high" | "critical">("normal")

  const targets = useMemo(() => {
    const nodes = unified.topologyGraph.nodes.map((n) => n.id)
    return [...new Set(nodes)]
  }, [unified.topologyGraph.nodes])

  const maxSeverity = useMemo(() => {
    const sev = unified.systemHealth.map((s) => s.impact)
    if (sev.includes("critical")) return "critical"
    if (sev.includes("severe")) return "severe"
    if (sev.includes("moderate")) return "moderate"
    return "none"
  }, [unified.systemHealth])

  const recentCommands = useMemo(() => commands.slice(0, 20), [commands])

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Operational command execution and control
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 animate-[command-pulse_2s_ease-in-out_infinite]">
              <Loader2 className="size-3 text-amber-500 animate-spin" />
              <span className="text-[10px] font-medium text-amber-500">
                {activeCount} active
              </span>
            </div>
          )}
          {maxSeverity === "critical" && (
            <div className="flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1">
              <AlertTriangle className="size-3 text-red-500" />
              <span className="text-[10px] font-medium text-red-500">CRITICAL</span>
            </div>
          )}
          <button
            onClick={clearCompleted}
            className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <RotateCcw className="size-3" />
            Clear Completed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className={cn(CARD_HOVER)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Send className="size-4 text-emerald-500" />
                Issue Command
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {COMMAND_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.type}
                      onClick={() =>
                        issueCommand(opt.type, selectedTarget, COMMAND_LABELS[opt.type], {}, selectedPriority)
                      }
                      className={cn(
                        "flex items-center gap-2 rounded-lg border border-border/50 p-3 text-left transition-all duration-150 hover:border-foreground/20",
                        opt.bg
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", opt.color)} />
                      <span className="text-[11px] font-medium text-foreground/80">
                        {COMMAND_LABELS[opt.type]}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/60">Target:</span>
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-[11px] text-foreground/80 outline-none"
                  >
                    {targets.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/60">Priority:</span>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value as typeof selectedPriority)}
                    className="rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-[11px] text-foreground/80 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(CARD_HOVER)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Terminal className="size-4 text-cyan-500" />
                Command Queue & Execution Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentCommands.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground/50">
                  <Terminal className="size-8" />
                  <span className="text-[11px]">No commands issued yet</span>
                </div>
              ) : (
                <div className="space-y-1 max-h-[360px] overflow-y-auto">
                  {recentCommands.map((cmd) => {
                    const sm = STATUS_META[cmd.status] ?? STATUS_META.queued
                    const Icon = sm.icon
                    return (
                      <div
                        key={cmd.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-200",
                          cmd.status === "executing" && "animate-[command-pulse_2s_ease-in-out_infinite]",
                          cmd.status === "failed" ? "border-red-500/20 bg-red-500/5" : "border-border/40"
                        )}
                      >
                        <Icon className={cn("size-3.5 shrink-0", sm.color, cmd.status === "executing" && "animate-spin")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-foreground/80">
                              {COMMAND_LABELS[cmd.type]}
                            </span>
                            <span className={cn("text-[9px] font-medium capitalize", sm.color)}>
                              {cmd.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/50">
                            <span>{cmd.targetNodeId}</span>
                            <span>·</span>
                            <span className="capitalize">{cmd.priority}</span>
                            <span>·</span>
                            <span>{new Date(cmd.issuedAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        {cmd.status === "completed" && (
                          <CheckCircle2 className="size-3 text-emerald-500/60 shrink-0" />
                        )}
                        {cmd.status === "failed" && (
                          <XCircle className="size-3 text-red-500/60 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className={cn(CARD_HOVER)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="size-4 text-red-500" />
                Emergency Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() =>
                  issueCommand("emergency-isolation", selectedTarget, "Emergency Isolation", { isolate: true }, "critical")
                }
                className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[11px] font-semibold text-red-500 transition-all duration-150 hover:bg-red-500/20 hover:shadow-[0_0_16px_-4px] hover:shadow-red-500/20"
              >
                <div className="flex items-center justify-center gap-2">
                  <Shield className="size-4" />
                  EMERGENCY ISOLATION
                </div>
              </button>
              <button
                onClick={() =>
                  issueCommand("mesh-restart", selectedTarget, "Mesh Network Restart", { restart: true }, "high")
                }
                className="w-full rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-[11px] font-semibold text-orange-500 transition-all duration-150 hover:bg-orange-500/20"
              >
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw className="size-4" />
                  RESTART MESH NETWORK
                </div>
              </button>
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 mb-2">
                  <AlertTriangle className="size-3" />
                  System Status
                </div>
                <div className="space-y-1.5">
                  {unified.systemHealth.slice(0, 4).map((sys) => {
                    const sevColor =
                      sys.impact === "critical"
                        ? "text-red-500"
                        : sys.impact === "severe"
                          ? "text-orange-500"
                          : sys.impact === "moderate"
                            ? "text-amber-500"
                            : "text-muted-foreground/50"
                    return (
                      <div key={sys.system} className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground/60 capitalize">{sys.system}</span>
                        <span className={cn("font-medium", sevColor)}>{sys.score}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(CARD_HOVER)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="size-4 text-emerald-500" />
                Active Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                <span className="text-[10px] text-muted-foreground/60">Active Commands</span>
                <span className="text-sm font-bold tabular-nums text-foreground">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                <span className="text-[10px] text-muted-foreground/60">Open Incidents</span>
                <span className="text-sm font-bold tabular-nums text-red-500">{unified.incidentSummary.openIncidents}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                <span className="text-[10px] text-muted-foreground/60">Pending Maintenance</span>
                <span className="text-sm font-bold tabular-nums text-orange-500">{unified.maintenanceSummary.pending}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                <span className="text-[10px] text-muted-foreground/60">System Cohesion</span>
                <span className="text-sm font-bold tabular-nums text-emerald-500">{unified.crossLayer.overallCohesion}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
