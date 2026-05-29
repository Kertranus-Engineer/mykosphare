"use client"

import { useMemo } from "react"
import { Brain, AlertTriangle, Thermometer, Droplets, Wind, ShieldCheck, Activity, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRealTimeTelemetry, useDashboardTelemetry } from "@/lib/useTelemetry"
import { useRealEnvironment } from "@/lib/useEnvironment"
import { ScenarioBanner } from "@/features/scenario/components/scenario-banner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function detectSituation(state: string, temp: number, hum: number): { situation: string; risk: string; riskColor: string; action: string; detail: string } {
  if (state === "CRITICAL" || state === "ESCALATION") {
    if (temp > 32) return { situation: "Critical Temperature", risk: "High", riskColor: "text-red-500", action: "Activate Ventilation", detail: `Temperature at ${temp.toFixed(1)}°C exceeds critical threshold.` }
    if (hum < 40) return { situation: "Critical Humidity Drop", risk: "High", riskColor: "text-red-500", action: "Activate Humidifier", detail: `Humidity at ${hum.toFixed(1)}% below minimum threshold.` }
    return { situation: "Environmental Instability", risk: "High", riskColor: "text-red-500", action: "Engage Failsafe Protocol", detail: "Multiple parameters outside safe range." }
  }
  if (state === "WARNING") {
    if (temp > 28) return { situation: "Thermal Drift Detected", risk: "Medium", riskColor: "text-amber-500", action: "Increase Air Exchange", detail: `Temperature at ${temp.toFixed(1)}°C trending toward warning zone.` }
    if (hum < 50) return { situation: "Humidity Drift Detected", risk: "Medium", riskColor: "text-amber-500", action: "Activate Humidifier", detail: `Humidity at ${hum.toFixed(1)}% below optimal range.` }
    return { situation: "Parameter Deviation", risk: "Medium", riskColor: "text-amber-500", action: "Monitor Closely", detail: "Environmental parameters deviating from setpoints." }
  }
  if (state === "PRE_WARNING" || state === "OPTIMIZING") {
    if (temp > 26.5) return { situation: "Minor Thermal Drift", risk: "Low", riskColor: "text-yellow-500", action: "Adjust Ventilation", detail: `Temperature at ${temp.toFixed(1)}°C slightly above target.` }
    if (hum < 57) return { situation: "Humidity Drift Detected", risk: "Low", riskColor: "text-yellow-500", action: "Monitor Humidity", detail: `Humidity at ${hum.toFixed(1)}% drifting below optimal band.` }
    return { situation: "Minor Parameter Drift", risk: "Low", riskColor: "text-yellow-500", action: "Continue Monitoring", detail: "System compensating within expected parameters." }
  }
  if (state === "RECOVERY") return { situation: "System Recovery Active", risk: "Low", riskColor: "text-teal-500", action: "Executing Recovery Cycle", detail: "Environmental parameters stabilizing toward equilibrium." }
  return { situation: "Normal Operation", risk: "Stable", riskColor: "text-emerald-500", action: "All Systems Nominal", detail: "All environmental parameters within expected operational range." }
}

function automationStatus(state: string): string {
  if (state === "CRITICAL" || state === "ESCALATION") return "Failsafe Protocol Active"
  if (state === "WARNING") return "Compensation Cycle Running"
  if (state === "RECOVERY") return "Executing Recovery Cycle"
  if (state === "OPTIMIZING") return "Fine-Tuning Active"
  if (state === "PRE_WARNING") return "Monitoring Mode"
  return "Standby — No Action Required"
}

export function IntelligenceOverview() {
  const rtTel = useRealTimeTelemetry()
  const tel = useDashboardTelemetry()
  const env = useRealEnvironment()

  const temp = tel.temperature.value
  const hum = tel.humidity.value

  const decision = useMemo(() => detectSituation(env.state, temp, hum), [env.state, temp, hum])
  const autoStatus = useMemo(() => automationStatus(env.state), [env.state])
  const confidence = useMemo(() => {
    if (!rtTel.online && rtTel.source !== "simulated") return 0
    let score = 95
    if (env.state === "CRITICAL") score -= 15
    else if (env.state === "WARNING") score -= 8
    else if (env.state === "PRE_WARNING") score -= 3
    return score
  }, [rtTel.online, rtTel.source, env.state])

  const hasData = temp > 0

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Operational Intelligence</h1>
          <p className="text-sm text-muted-foreground/70">Real-time AI assessment and automated decision recommendations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
            <div className={cn("size-1.5 rounded-full transition-all duration-500", rtTel.online || rtTel.source === "simulated" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
            <Brain className={cn("size-3 transition-all", rtTel.online || rtTel.source === "simulated" ? "text-emerald-500/60" : "text-muted-foreground/30")} />
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
              {rtTel.online || rtTel.source === "simulated" ? "INTELLIGENCE LIVE" : "OFFLINE"}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1">
            <span className="text-[10px] font-medium text-muted-foreground/60">Confidence: {confidence}%</span>
          </div>
        </div>
      </div>

      <ScenarioBanner />

      {/* Decision Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Current Situation */}
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className={cn("size-4", decision.riskColor)} />
              <span>Current Situation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={cn("text-lg font-bold", decision.riskColor)}>{decision.situation}</span>
            <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">{decision.detail}</p>
          </CardContent>
        </Card>

        {/* AI Assessment */}
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="size-4 text-violet-500" />
              <span>AI Assessment</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">Risk:</span>
              <span className={cn("text-lg font-bold", decision.riskColor)}>{decision.risk}</span>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">{env.aiSummary}</p>
          </CardContent>
        </Card>

        {/* Recommended Action */}
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="size-4 text-cyan-500" />
              <span>Recommended Action</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-lg font-bold text-cyan-400">{decision.action}</span>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground/60">
              <div className={cn("size-1.5 rounded-full animate-pulse", confidence >= 85 ? "bg-emerald-500" : "bg-amber-500")} />
              <span>Confidence: {confidence}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Automation Status */}
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className={cn("size-4", env.state === "CRITICAL" || env.state === "WARNING" ? "text-amber-500" : "text-emerald-500")} />
              <span>Automation Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={cn("size-2 rounded-full animate-pulse", env.state === "CRITICAL" ? "bg-red-500" : env.state === "WARNING" ? "bg-amber-500" : "bg-emerald-500")} />
              <span className="text-lg font-bold text-foreground">{autoStatus}</span>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
              {env.state === "CRITICAL" || env.state === "WARNING" ? "Automated response protocols engaged. System is actively compensating." : "All automation systems on standby. No intervention required."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Telemetry Summary */}
      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>Environmental Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
              <Thermometer className="size-5 text-emerald-500" />
              <div>
                <span className="text-[10px] text-muted-foreground/50">Temperature</span>
                <p className="text-sm font-bold tabular-nums text-foreground">{hasData ? `${temp.toFixed(1)}\u00b0C` : "--"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
              <Droplets className="size-5 text-blue-500" />
              <div>
                <span className="text-[10px] text-muted-foreground/50">Humidity</span>
                <p className="text-sm font-bold tabular-nums text-foreground">{hasData ? `${hum.toFixed(1)}%` : "--"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
              <Wind className="size-5 text-muted-foreground" />
              <div>
                <span className="text-[10px] text-muted-foreground/50">CO\u2082</span>
                <p className="text-sm font-bold tabular-nums text-foreground">{hasData ? `${tel.co2.value}` : "--"} <span className="text-[10px] font-normal text-muted-foreground/50">ppm</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
              <Activity className="size-5 text-violet-500" />
              <div>
                <span className="text-[10px] text-muted-foreground/50">System State</span>
                <p className={cn("text-sm font-bold tabular-nums", env.color)}>{env.label}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer: Environmental context */}
      <div className="rounded-lg border border-border/30 bg-card/50 p-4">
        <p className="text-xs leading-relaxed text-muted-foreground/60 text-center">
          AI-powered analysis continuously evaluates environmental telemetry against configured thresholds.
          Recommendations are generated based on current conditions, trend analysis and pre-configured operational profiles.
        </p>
      </div>
    </div>
  )
}
