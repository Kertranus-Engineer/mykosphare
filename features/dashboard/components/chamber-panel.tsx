"use client"

import { ArrowLeftRight, Fan, Radio } from "lucide-react"

import { useRealEnvironment } from "@/lib/useEnvironment"
import type { EnvState } from "@/lib/useEnvironment"
import { useDashboardTelemetry, useRealTimeTelemetry } from "@/lib/useTelemetry"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const NODE_POSITIONS = [
  { top: "15%", left: "12%", label: "ZONE A", pulse: "animate-[node-pulse_3s_ease-in-out_infinite]" },
  { top: "18%", right: "14%", label: "ZONE B", pulse: "animate-[node-pulse_3.5s_ease-in-out_infinite_0.5s]" },
  { bottom: "22%", left: "18%", label: "SENSOR", pulse: "animate-[node-pulse_4s_ease-in-out_infinite_1s]" },
  { bottom: "25%", right: "16%", label: "MESH 1", pulse: "animate-[node-pulse_3.2s_ease-in-out_infinite_0.3s]" },
] as const

function chamberDotColor(state: EnvState) {
  if (state === "CRITICAL") return "bg-red-500 text-red-500 shadow-red-500/40"
  if (state === "WARNING") return "bg-amber-500 text-amber-500 shadow-amber-500/40"
  if (state === "RECOVERY") return "bg-teal-500 text-teal-500 shadow-teal-500/40"
  return "bg-emerald-500 text-emerald-500 shadow-emerald-500/40"
}

export function ChamberPanel() {
  const env = useRealEnvironment()
  const tel = useDashboardTelemetry()
  const rtTel = useRealTimeTelemetry()

  const temp = tel.temperature.value
  const hum = tel.humidity.value

  const dotColor = chamberDotColor(env.state)
  const sweepColor =
    env.state === "CRITICAL"
      ? "via-red-500/10"
      : env.state === "WARNING"
        ? "via-amber-500/8"
        : env.state === "RECOVERY"
          ? "via-teal-500/8"
          : "via-emerald-500/5"

  const chamberGlow =
    env.state === "CRITICAL"
      ? "shadow-[0_0_20px_-4px] shadow-red-500/20"
      : env.state === "WARNING"
        ? "shadow-[0_0_20px_-4px] shadow-amber-500/15"
        : env.state === "RECOVERY"
          ? "shadow-[0_0_20px_-4px] shadow-teal-500/15"
          : ""

  const airflowActive = env.state === "CRITICAL" || env.state === "WARNING" || env.state === "OPTIMIZING"

  return (
    <Card className="flex-1 transition-all duration-200 chamber-card hover:ring-foreground/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Environmental Chamber</span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-medium tracking-wider transition-all duration-300",
                env.color
              )}
            >
              {env.label}
            </span>
            <div
              className={cn(
                "size-1.5 rounded-full transition-all duration-300",
                dotColor
              )}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className={cn(
          "relative flex aspect-[2/1] items-center justify-center overflow-hidden rounded-lg transition-all duration-700 chamber-theme",
          chamberGlow
        )}>
          {/* ── Vignette edges ─────────────────── */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_40%,var(--background)_95%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-transparent" />

          {/* ── Core breathing aura — layered ──── */}
          <div className="absolute inset-0 opacity-[0.09]"
            style={{ background: "radial-gradient(ellipse 50% 35% at 50% 50%, rgba(16,185,129,0.55), rgba(6,182,212,0.22) 40%, transparent 70%)", animation: "breathe 6s ease-in-out infinite" }}
          />
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ background: "radial-gradient(ellipse 70% 45% at 50% 50%, rgba(16,185,129,0.34), transparent 55%)", animation: "breathe 8s ease-in-out infinite 1s" }}
          />

          {/* ── Volumetric fog layer ───────────── */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ background: "radial-gradient(ellipse 90% 55% at 50% 50%, rgba(6,182,212,0.1), transparent 60%)", animation: "atmospheric-drift 15s ease-in-out infinite", filter: "blur(12px)" }}
          />

          {/* Heat distortion — high temperature */}
          {temp > 28 && (
            <div className="absolute inset-0 opacity-[0.08]"
              style={{ background: "radial-gradient(ellipse 80px 40px at 50% 55%, rgba(249,115,22,0.3), transparent 55%)", animation: "breathe 3s ease-in-out infinite" }}
            />
          )}

          {/* Fog bloom — high humidity */}
          {hum > 70 && (
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ background: "radial-gradient(ellipse 140% 80% at 50% 60%, rgba(148,163,184,0.18), transparent 45%)", animation: "drift-right 12s ease-in-out infinite", filter: "blur(10px)" }}
            />
          )}

          {/* ── State-reactive diffusion ──────── */}
          {env.state === "CRITICAL" && (
            <>
              <div className="absolute inset-0 opacity-[0.12]"
                style={{ background: "radial-gradient(ellipse 130px 70px at 50% 50%, rgba(239,68,68,0.4), transparent 75%)", animation: "breathe 1.8s ease-in-out infinite" }}
              />
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ background: "radial-gradient(ellipse 100% 60% at 50% 50%, rgba(239,68,68,0.1), transparent 60%)", animation: "breathe 3s ease-in-out infinite", filter: "blur(6px)" }}
              />
            </>
          )}
          {env.state === "WARNING" && (
            <>
              <div className="absolute inset-0 opacity-[0.10]"
                style={{ background: "radial-gradient(ellipse 90px 50px at 50% 50%, rgba(245,158,11,0.35), transparent 70%)", animation: "breathe 2.2s ease-in-out infinite" }}
              />
              <div className="absolute inset-0 opacity-[0.03]"
                style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(245,158,11,0.08), transparent 55%)", animation: "breathe 4s ease-in-out infinite", filter: "blur(4px)" }}
              />
            </>
          )}
          {env.state === "RECOVERY" && (
            <div className="absolute inset-0 opacity-[0.08]"
              style={{ background: "radial-gradient(ellipse 90px 50px at 50% 50%, rgba(20,184,166,0.3), transparent 70%)", animation: "breathe 2.5s ease-in-out infinite" }}
            />
          )}
          {env.state === "OPTIMIZING" && (
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(59,130,246,0.2), transparent 65%)", animation: "breathe 4s ease-in-out infinite" }}
            />
          )}

          {/* Scan line — slow diagnostic sweep */}
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent"
            style={{ animation: "scan-line 8s ease-in-out infinite", top: "30%" }}
          />

          <div className="absolute inset-0 overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 -left-1/2 w-1/2 animate-[sweep_7s_ease-in-out_infinite] bg-gradient-to-r from-transparent to-transparent",
                sweepColor
              )}
            />

            {/* Micro particles — always present for atmosphere */}
            <div className="absolute top-[15%] left-[25%] size-px rounded-full bg-emerald-500/20 animate-[drift-up_12s_ease-in-out_infinite]" />
            <div className="absolute top-[55%] left-[60%] size-px rounded-full bg-cyan-500/15 animate-[drift-right_14s_ease-in-out_infinite_3s]" />
            <div className="absolute top-[35%] left-[42%] size-0.5 rounded-full bg-emerald-500/10 animate-[drift-up_16s_ease-in-out_infinite_5s]" />
            <div className="absolute top-[70%] left-[20%] size-px rounded-full bg-teal-500/12 animate-[drift-right_11s_ease-in-out_infinite_7s]" />

            {env.state !== "STABLE" && (
              <>
                <div className="absolute top-[20%] left-[30%] size-0.5 rounded-full bg-foreground/10 animate-[drift-up_6s_ease-in-out_infinite]" />
                <div className="absolute top-[60%] left-[55%] size-[3px] rounded-full bg-foreground/8 animate-[drift-right_8s_ease-in-out_infinite_2s]" />
                <div className="absolute top-[40%] left-[45%] size-0.5 rounded-full bg-foreground/6 animate-[drift-up_7s_ease-in-out_infinite_1s]" />
                <div className="absolute top-[70%] left-[25%] size-[2px] rounded-full bg-foreground/10 animate-[drift-right_9s_ease-in-out_infinite_0.5s]" />
                {env.state === "CRITICAL" && (
                  <div className="absolute inset-0"
                    style={{
                      background: "linear-gradient(0deg, transparent 50%, rgba(239,68,68,0.015) 50%, rgba(239,68,68,0.015) 51%, transparent 51%)",
                      backgroundSize: "100% 4px",
                      animation: "shift-gradient 0.5s linear infinite",
                    }}
                  />
                )}
              </>
            )}
          </div>

          {NODE_POSITIONS.map((node) => (
            <div
              key={node.label}
              className="absolute z-10 flex items-center gap-1.5"
              style={{
                top: "top" in node ? node.top : undefined,
                bottom: "bottom" in node ? node.bottom : undefined,
                left: "left" in node ? node.left : undefined,
                right: "right" in node ? node.right : undefined,
              }}
            >
              <div
                className={cn(
                  "size-1.5 rounded-full transition-all duration-300",
                  dotColor,
                  node.pulse
                )}
              />
              <span className="text-[8px] font-medium tracking-wider text-muted-foreground/62">
                {node.label}
              </span>
            </div>
          ))}

          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-foreground/10 bg-background/60 px-4 py-1.5 backdrop-blur-sm">
              <div
                className={cn(
                  "size-2 rounded-full transition-all duration-300",
                  dotColor
                )}
              />
              <span className="text-[11px] font-medium text-foreground/90">
                {env.state === "CRITICAL"
                  ? "THERMAL COMPENSATION"
                  : env.state === "ESCALATION"
                    ? "FAILSAFE ENGAGED"
                    : env.state === "WARNING"
                      ? "FLOW MONITORING"
                      : env.state === "RECOVERY"
                        ? "RECOVERY ACTIVE"
                        : env.state === "PRE_WARNING"
                          ? "DRIFT DETECTED"
                          : env.state === "OPTIMIZING"
                            ? "SYNCHRONIZING"
                            : rtTel.degraded
                              ? "PACKET LOSS DETECTED"
                              : "FLOW STABLE"}
              </span>
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 z-10 h-7 bg-gradient-to-t from-background/70 to-transparent" />
          <div className="absolute bottom-1 inset-x-0 z-10 flex items-center justify-center gap-3">
            <span className="text-[9px] tabular-nums text-muted-foreground/50">
              {tel.temperature.value > 0 ? `${tel.temperature.value}\u00b0C` : "-- \u00b0C"}
            </span>
            <span className="text-[9px] text-muted-foreground/20">|</span>
            <span className="text-[9px] tabular-nums text-muted-foreground/50">
              {tel.humidity.value > 0 ? `${tel.humidity.value}% RH` : "-- % RH"}
            </span>
            <span className="text-[9px] text-muted-foreground/20">|</span>
            <span className="text-[9px] tabular-nums text-muted-foreground/50">
              {rtTel.online ? "ESP32 ONLINE" : "ESP32 OFFLINE"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground/40">
          <Fan
            className={cn(
              "size-3 transition-all duration-300",
              airflowActive ? "text-emerald-500/60" : "text-muted-foreground/30"
            )}
          />
          <ArrowLeftRight
            className={cn(
              "size-3 transition-all duration-300",
              airflowActive
                ? "text-emerald-500/60 animate-[breathe_4s_ease-in-out_infinite]"
                : "text-muted-foreground/30"
            )}
          />
          <span className="tracking-[0.15em] text-muted-foreground/30">
            AIRFLOW
          </span>
          <div
            className={cn(
              "size-1 rounded-full transition-all duration-300",
              airflowActive
                ? "bg-emerald-500/60 animate-pulse"
                : "bg-muted-foreground/20"
            )}
          />
          <span className="text-muted-foreground/30">
            {airflowActive ? "FAE ACTIVE" : "FAE STANDBY"}
          </span>
          <Radio className={cn("size-3", rtTel.online ? "text-emerald-500/40" : "text-muted-foreground/30")} />
          <span className="text-muted-foreground/30">
            {rtTel.online ? "ESP32 ONLINE" : "ESP32 OFFLINE"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {env.chamberIndicators.map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1 transition-all duration-150",
                item.color === "text-red-500"
                  ? "border-red-500/30 bg-red-500/5"
                  : item.color === "text-amber-500"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border/50 bg-muted/30 hover:border-emerald-500/30"
              )}
            >
              <div
                className={cn(
                  "size-1 rounded-full transition-all duration-300",
                  item.color === "text-red-500"
                    ? "bg-red-500 shadow-[0_0_4px_1px] shadow-red-500/30"
                    : item.color === "text-amber-500"
                      ? "bg-amber-500 shadow-[0_0_4px_1px] shadow-amber-500/30"
                      : "bg-emerald-500 shadow-[0_0_4px_1px] shadow-emerald-500/30"
                )}
              />
              <span className="text-[11px] text-muted-foreground">
                {item.label}
              </span>
              <span className={cn("text-[11px] font-medium", item.color)}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
