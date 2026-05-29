"use client"

import { Fan, Droplets, Flame, Zap, Power, ShieldAlert } from "lucide-react"

import { useAutomation } from "@/lib/automation/use-automation"
import type { ActuatorStatus } from "@/lib/automation/use-automation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const ACTUATOR_ICONS: Record<string, typeof Fan> = {
  fan: Fan,
  humidifier: Droplets,
  heater: Flame,
}

const ACTUATOR_COLORS: Record<string, { active: string; glow: string; bg: string }> = {
  fan: { active: "text-cyan-400", glow: "shadow-[0_0_10px_-2px] shadow-cyan-500/30", bg: "bg-cyan-500/5" },
  humidifier: { active: "text-blue-400", glow: "shadow-[0_0_10px_-2px] shadow-blue-500/30", bg: "bg-blue-500/5" },
  heater: { active: "text-orange-400", glow: "shadow-[0_0_10px_-2px] shadow-orange-500/30", bg: "bg-orange-500/5" },
}

function formatToggled(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
}

function ActuatorRow({ actuator }: { actuator: ActuatorStatus }) {
  const Icon = ACTUATOR_ICONS[actuator.type] ?? Zap
  const colors = ACTUATOR_COLORS[actuator.type] ?? { active: "text-emerald-400", glow: "", bg: "" }
  const isActive = actuator.state === "on"
  const isAuto = actuator.mode === "automatic"
  const isDisabled = actuator.type === "heater"

  return (
    <div
      className={cn(
        "flex flex-col rounded-md px-2.5 py-1.5 transition-all duration-300",
        isActive && [colors.glow, colors.bg],
        actuator.justToggled && "animate-pulse"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "size-3.5 transition-all duration-300",
              isActive
                ? `${colors.active} ${actuator.type === "fan" ? "animate-spin" : actuator.type === "humidifier" ? "animate-pulse" : ""}`
                : isAuto && !isDisabled
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground/20"
            )}
            style={isActive && actuator.type === "fan" ? { animationDuration: "3s" } : undefined}
          />
          <div>
            <span className="text-[11px] text-muted-foreground/70">
              {actuator.label}
            </span>
            <span className="ml-1.5 text-[9px] text-muted-foreground/30 font-mono">
              GPIO{actuator.gpio}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-[9px] font-medium tracking-wider",
            isActive ? colors.active : isDisabled ? "text-muted-foreground/20" : "text-muted-foreground/30"
          )}>
            {isActive ? "ACTIVE" : isDisabled ? "DISABLED" : isAuto ? "AUTO" : "MANUAL"}
          </span>
          <div className={cn(
            "size-1 rounded-full",
            isActive
              ? `bg-current ${colors.active}`
              : isAuto && !isDisabled
                ? "bg-emerald-500/50"
                : isDisabled
                  ? "bg-muted-foreground/15"
                  : "bg-muted-foreground/20"
          )} />
        </div>
      </div>
      {actuator.lastToggled && (
        <div className="mt-0.5 flex items-center gap-1">
          <span className={cn(
            "text-[8px] font-mono",
            actuator.lastCommand?.includes("_on") ? "text-emerald-500/40" : "text-muted-foreground/25"
          )}>
            {actuator.lastCommand?.replace("_", " ").toUpperCase() ?? "--"}
          </span>
          <span className="text-[8px] text-muted-foreground/20">@</span>
          <span className="text-[8px] text-muted-foreground/25 tabular-nums">
            {formatToggled(actuator.lastToggled)}
          </span>
          <span className="text-[8px] text-muted-foreground/15 ml-auto">
            GPIO{actuator.gpio} · {actuator.state === "on" ? "HIGH" : "LOW"}
          </span>
        </div>
      )}
    </div>
  )
}

export function ActuatorBar() {
  const {
    actuators,
    isAnyActive,
    automationActive,
    failsafeState,
    relayMode,
    toggleRelayMode,
    toggleManual,
    setAutoMode,
    allOff,
  } = useAutomation()

  const isFailsafe = failsafeState === "failsafe_active"
  const isRecovering = failsafeState === "recovering"

  return (
    <Card className={cn(
      "transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10",
      isFailsafe && "ring-1 ring-red-500/20 shadow-[0_0_16px_-4px] shadow-red-500/10"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className={cn(
            "size-4 transition-all duration-300",
            isAnyActive ? "text-emerald-500" : isFailsafe ? "text-red-500" : "text-muted-foreground"
          )} />
          Actuators
          <span className="ml-auto flex items-center gap-2">
            {isFailsafe && (
              <span className="flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[8px] font-medium text-red-500 ring-1 ring-red-500/20">
                <ShieldAlert className="size-2" />
                FAILSAFE
              </span>
            )}
            {isRecovering && (
              <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[8px] font-medium text-teal-500 ring-1 ring-teal-500/20">
                RECOVERING
              </span>
            )}
            <button
              type="button"
              onClick={toggleRelayMode}
              className={cn(
                "rounded px-1.5 py-0.5 text-[8px] font-medium tracking-wider transition-colors",
                relayMode === "active_low"
                  ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"
              )}
              title="Toggle relay mode (active high / active low)"
            >
              {relayMode === "active_high" ? "RELAY HIGH" : "RELAY LOW"}
            </button>
            <span className={cn(
              "text-[10px] font-medium",
              isFailsafe
                ? "text-red-500/60"
                : automationActive
                  ? "text-emerald-500/60"
                  : "text-muted-foreground/40"
            )}>
              {isFailsafe ? "FAILSAFE ACTIVE" : automationActive ? "AUTOMATION ONLINE" : "MANUAL OVERRIDE"}
            </span>
            <div className={cn(
              "size-1 rounded-full",
              isFailsafe
                ? "bg-red-500 animate-pulse"
                : automationActive
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-muted-foreground/30"
            )} />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        {actuators.map((a) => (
          <div key={a.id} className="flex items-center gap-1">
            <div className="flex-1">
              <ActuatorRow actuator={a} />
            </div>
            <div className="flex gap-0.5">
              {a.mode !== "automatic" && a.type !== "heater" && (
                <button
                  type="button"
                  onClick={() => setAutoMode(a.id)}
                  className="rounded px-1.5 py-0.5 text-[9px] text-muted-foreground/50 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                  title="Return to auto"
                >
                  AUTO
                </button>
              )}
              {a.type !== "heater" && (
                <button
                  type="button"
                  onClick={() => toggleManual(a.id, a.state === "on" ? "off" : "on")}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] transition-colors",
                    a.state === "on"
                      ? "text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                      : "text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10"
                  )}
                  title={a.state === "on" ? "Turn off" : "Turn on"}
                >
                  {a.state === "on" ? "OFF" : "ON"}
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="mt-2 pt-2 border-t border-border/30 flex justify-between items-center">
          <span className="text-[9px] text-muted-foreground/25">
            {actuators.some((a) => a.justToggled) ? "EXECUTING..." : ""}
          </span>
          <button
            type="button"
            onClick={allOff}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-red-500/60 hover:text-red-400 hover:bg-red-500/10 hover:shadow-[0_0_12px_-2px] hover:shadow-red-500/20 active:scale-[0.97] transition-all tracking-wider"
          >
            <Power className="size-2.5" />
            ALL OFF
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
