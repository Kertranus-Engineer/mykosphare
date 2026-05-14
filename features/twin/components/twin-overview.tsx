"use client"

import { useUnifiedOperationalState } from "@/lib/unified/use-unified"
import { useTwin } from "@/lib/twin/use-twin"
import { useCommands } from "@/lib/commands/use-commands"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CARD_HOVER } from "@/lib/styles/tokens"
import { Gauge, Terminal, ListOrdered, Activity, Wifi, WifiOff, Send, CheckCircle, XCircle } from "lucide-react"
import { COMMAND_LABELS, COMMAND_STATUS_COLORS, COMMAND_STATUS_BG } from "@/lib/commands/types"
import type { CommandType } from "@/lib/commands/types"
import { ChamberTwinCard, CommandBadgeSmall } from "./chamber-card"

const TARGET_NODE = "MYK-CH-001"
const TARGET_SYSTEM = "chamber-environment"

const COMMAND_ACTIONS: { type: CommandType; label: string; description: string }[] = [
  { type: "airflow", label: "Adjust Airflow", description: "FAE adjustment" },
  { type: "lighting", label: "Lighting Control", description: "Cycle control" },
  { type: "sterilization", label: "Sterilize", description: "Decon cycle" },
  { type: "relay-power", label: "Relay Power", description: "Toggle relay" },
  { type: "mesh-restart", label: "Restart Mesh", description: "Network reset" },
  { type: "emergency-isolation", label: "Emergency Isolation", description: "Full isolation" },
]

export function TwinOverview() {
  const unified = useUnifiedOperationalState()
  const twin = useTwin()
  const cmds = useCommands()

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Digital Twin
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Active chamber state modeling and operational command layer
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cmds.activeCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1">
              <Terminal className="size-3 text-amber-500" />
              <span className="text-[10px] font-medium text-amber-500">{cmds.activeCount} active</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
            {unified.connected ? (
              <Wifi className="size-3 text-emerald-500/60" />
            ) : (
              <WifiOff className="size-3 text-muted-foreground/40" />
            )}
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
              {unified.connected ? "TWIN LIVE" : "LOCAL"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChamberTwinCard state={twin.chamberState} health={twin.health} onSwitchMode={twin.switchMode} />
        </div>

        <Card className={cn(CARD_HOVER)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Terminal className="size-4 text-cyan-500" />
              Issue Command
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {COMMAND_ACTIONS.map((action) => (
              <button
                key={action.type}
                onClick={() => cmds.issueCommand(action.type, TARGET_NODE, TARGET_SYSTEM)}
                className="w-full flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-2.5 py-2 text-left hover:bg-muted/40 transition-colors"
              >
                <div>
                  <span className="text-[11px] font-medium text-foreground block">{action.label}</span>
                  <span className="text-[9px] text-muted-foreground/50">{action.description}</span>
                </div>
                <Send className="size-3 text-muted-foreground/40" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className={cn(CARD_HOVER)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ListOrdered className="size-4 text-violet-500" />
            Command Queue ({cmds.commands.length})
            {cmds.commands.some((c) => c.status !== "completed" && c.status !== "failed") && (
              <button
                onClick={cmds.clearCompleted}
                className="ml-auto text-[9px] text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                Clear completed
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cmds.commands.length === 0 ? (
            <div className="py-6 text-center">
              <Terminal className="size-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-[11px] text-muted-foreground/50">No commands issued yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {cmds.commands.slice(0, 20).map((cmd) => {
                const color = COMMAND_STATUS_COLORS[cmd.status]
                const bg = COMMAND_STATUS_BG[cmd.status]
                return (
                  <div key={cmd.id} className={cn("flex items-center justify-between rounded-lg px-2.5 py-1.5", bg)}>
                    <div className="flex items-center gap-2 min-w-0">
                      {cmd.status === "completed" ? (
                        <CheckCircle className={cn("size-3 shrink-0", color)} />
                      ) : cmd.status === "failed" ? (
                        <XCircle className={cn("size-3 shrink-0", color)} />
                      ) : (
                        <Activity className={cn("size-3 shrink-0", color)} />
                      )}
                      <span className="text-[10px] text-foreground truncate">{COMMAND_LABELS[cmd.type]}</span>
                      <span className="text-[9px] text-muted-foreground/50 truncate">{cmd.targetNodeId}</span>
                    </div>
                    <span className={cn("text-[9px] font-medium capitalize shrink-0", color)}>{cmd.status}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
