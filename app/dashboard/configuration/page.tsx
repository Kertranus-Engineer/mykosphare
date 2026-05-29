"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Sliders, Zap, Thermometer, Droplets, Shield, RotateCcw,
  Send, CheckCircle2, Loader2, AlertTriangle, History, Cpu,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { DEFAULT_CONFIG, PROFILES } from "@/lib/config/types"
import type { SystemConfig, DeployState } from "@/lib/config/types"
import { emitOpEvent } from "@/lib/events/bus"

type DeployStep = { label: string; delay: number }

const DEPLOY_STEPS: DeployStep[] = [
  { label: "VALIDATING THERMAL LIMITS", delay: 300 },
  { label: "VERIFYING RELAY SAFETY", delay: 400 },
  { label: "SYNCHRONIZING THRESHOLDS", delay: 500 },
  { label: "TRANSMITTING CONFIGURATION", delay: 600 },
  { label: "AWAITING NODE ACKNOWLEDGMENT", delay: 700 },
  { label: "STABILIZATION SEQUENCE", delay: 400 },
  { label: "CONFIGURATION DEPLOYED", delay: 300 },
]

function SliderRow({ icon: Icon, label, value, unit, min, max, step, onChange, color }: {
  icon: typeof Thermometer; label: string; value: number; unit: string; min: number; max: number; step: number;
  onChange: (v: number) => void; color: string
}) {
  return (
    <div className="flex items-center gap-3 px-2 py-1.5">
      <Icon className={cn("size-4 shrink-0", color)} />
      <span className="w-36 text-[11px] text-muted-foreground/70 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-current"
      />
      <span className="w-16 text-right text-[11px] font-semibold tabular-nums text-foreground/80">
        {value}{unit}
      </span>
    </div>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <span className="text-[11px] text-muted-foreground/70">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-all duration-200",
          value ? "bg-emerald-500/60" : "bg-muted-foreground/20"
        )}
      >
        <span className={cn(
          "absolute top-0.5 size-4 rounded-full bg-background transition-all duration-200",
          value ? "left-4" : "left-0.5"
        )} />
      </button>
    </div>
  )
}

export default function ConfigurationPage() {
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG)
  const [deployState, setDeployState] = useState<DeployState>("draft")
  const [deployStep, setDeployStep] = useState(-1)
  const [deployedVersion, setDeployedVersion] = useState("CFG-DEFAULT")
  const [deploying, setDeploying] = useState(false)
  const [history, setHistory] = useState<{ id: number; label: string; time: string; state: string }[]>([])

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((data) => {
      if (data.versions && data.versions.length > 0) {
        setHistory(data.versions.map((v: { id: number; state: string; deployedAt: string }) => ({
          id: v.id,
          label: `CFG-${String(v.id).padStart(4, "0")}`,
          time: v.deployedAt ? new Date(v.deployedAt).toLocaleTimeString("en-GB") : "--",
          state: v.state,
        })))
        setDeployedVersion(data.currentVersion ?? "CFG-DEFAULT")
      }
    })
  }, [deployedVersion])

  const updateConfig = useCallback(<K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setDeployState("draft")
  }, [])

  const applyProfile = useCallback((name: string) => {
    const profile = PROFILES[name]
    if (!profile) return
    setConfig((prev) => ({ ...prev, ...profile.config }))
    setDeployState("draft")
  }, [])

  const deploy = useCallback(async () => {
    if (deploying) return
    setDeploying(true)
    setDeployState("validating")

    for (let i = 0; i < DEPLOY_STEPS.length; i++) {
      setDeployStep(i)
      const step = DEPLOY_STEPS[i]
      emitOpEvent("system", step.label, i === DEPLOY_STEPS.length - 1 ? "success" : "info")
      await new Promise((r) => setTimeout(r, step.delay))
    }

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deploy", config }),
      })
      const data = await res.json()
      if (data.success) {
        setDeployState("deployed")
        setDeployedVersion(data.versionLabel ?? "CFG-001")
        emitOpEvent("system", `Configuration active: ${data.versionLabel}`, "success")
      }
    } catch {
      setDeployState("failed")
      emitOpEvent("system", "Deployment failed — config not applied", "warning")
    }

    setDeployStep(-1)
    setDeploying(false)
  }, [config, deploying])

  const rollback = useCallback(async () => {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rollback" }),
    })
    const data = await res.json()
    if (data.success) {
      setDeployState("rollback")
      setDeployedVersion(data.versionLabel ?? "CFG-RBK")
      emitOpEvent("system", `Rollback: ${data.versionLabel}`, "warning")
    }
  }, [])

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Configuration</h1>
          <p className="text-sm text-muted-foreground/70">Environmental control parameters</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-0.5">
            <Cpu className="size-3 text-emerald-500/60" />
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
              {deployedVersion}
            </span>
          </span>
          {deployState === "failed" && (
            <button onClick={rollback} className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-500/20 transition-colors">
              <RotateCcw className="size-3" /> ROLLBACK
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Thermometer className="size-4 text-amber-500" />
              Environment Targets
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <SliderRow icon={Thermometer} label="Target Temperature" value={config.targetTemp} unit="°C" min={18} max={35} step={0.5} onChange={(v) => updateConfig("targetTemp", v)} color="text-amber-500" />
            <SliderRow icon={Droplets} label="Target Humidity" value={config.targetHumidity} unit="%" min={40} max={95} step={1} onChange={(v) => updateConfig("targetHumidity", v)} color="text-blue-500" />
            <SliderRow icon={Thermometer} label="Temp Tolerance" value={config.tempTolerance} unit="°C" min={0.5} max={5} step={0.5} onChange={(v) => updateConfig("tempTolerance", v)} color="text-muted-foreground" />
            <SliderRow icon={Droplets} label="Humidity Tolerance" value={config.humTolerance} unit="%" min={2} max={15} step={1} onChange={(v) => updateConfig("humTolerance", v)} color="text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="size-4 text-orange-500" />
              Thermal Response
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <SliderRow icon={Thermometer} label="Fan ON Temp" value={config.fanOnTemp} unit="°C" min={24} max={35} step={0.5} onChange={(v) => updateConfig("fanOnTemp", v)} color="text-cyan-500" />
            <SliderRow icon={Thermometer} label="Fan OFF Temp" value={config.fanOffTemp} unit="°C" min={20} max={33} step={0.5} onChange={(v) => updateConfig("fanOffTemp", v)} color="text-cyan-500" />
            <SliderRow icon={AlertTriangle} label="Critical Temp" value={config.criticalTemp} unit="°C" min={28} max={38} step={0.5} onChange={(v) => updateConfig("criticalTemp", v)} color="text-red-500" />
            <SliderRow icon={AlertTriangle} label="Emergency Temp" value={config.emergencyTemp} unit="°C" min={30} max={40} step={0.5} onChange={(v) => updateConfig("emergencyTemp", v)} color="text-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="size-4 text-emerald-500" />
              Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <ToggleRow label="Auto Fan" value={config.autoFan} onChange={(v) => updateConfig("autoFan", v)} />
            <ToggleRow label="Auto Humidifier" value={config.autoHumidifier} onChange={(v) => updateConfig("autoHumidifier", v)} />
            <ToggleRow label="Auto Failsafe" value={config.autoFailsafe} onChange={(v) => updateConfig("autoFailsafe", v)} />
            <ToggleRow label="Recovery Mode" value={config.recoveryMode} onChange={(v) => updateConfig("recoveryMode", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="size-4 text-violet-500" />
              Profiles & Network
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(PROFILES).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyProfile(key)}
                  className="rounded-lg border border-border/40 bg-muted/20 px-2.5 py-2 text-left hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all active:scale-[0.98]"
                >
                  <span className="text-[10px] font-semibold text-foreground/70">{p.label}</span>
                  <span className="block text-[8px] text-muted-foreground/50 mt-0.5">{p.desc}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-border/30 pt-2 space-y-1.5">
              <SliderRow icon={Zap} label="Telemetry Interval" value={config.telemetryInterval / 1000} unit="s" min={1} max={10} step={0.5} onChange={(v) => updateConfig("telemetryInterval", v * 1000)} color="text-muted-foreground" />
              <div className="flex items-center gap-2 px-2">
                <span className="w-36 text-[11px] text-muted-foreground/70 shrink-0">Recovery Speed</span>
                <select value={config.confidenceRecovery} onChange={(e) => updateConfig("confidenceRecovery", e.target.value as SystemConfig["confidenceRecovery"])} className="flex-1 rounded border border-border/50 bg-muted/30 px-2 py-1 text-[11px] outline-none">
                  <option value="slow">Slow</option>
                  <option value="normal">Normal</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={deploy}
          disabled={deploying || deployState === "deployed"}
          className={cn(
            "flex items-center gap-2 rounded-lg px-5 py-2.5 text-[11px] font-semibold tracking-wider transition-all active:scale-[0.97]",
            deploying
              ? "bg-amber-500/10 text-amber-500 cursor-not-allowed"
              : deployState === "deployed"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:shadow-[0_0_16px_-4px] hover:shadow-emerald-500/20"
          )}
        >
          {deploying ? (
            <><Loader2 className="size-4 animate-spin" /> {DEPLOY_STEPS[deployStep]?.label ?? "DEPLOYING..."}</>
          ) : deployState === "deployed" ? (
            <><CheckCircle2 className="size-4" /> CONFIGURATION DEPLOYED</>
          ) : (
            <><Send className="size-4" /> DEPLOY CONFIGURATION</>
          )}
        </button>
        {deployState === "deployed" && (
          <button
            type="button"
            onClick={rollback}
            className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-[11px] font-semibold text-red-500/70 hover:bg-red-500/10 transition-all active:scale-[0.97]"
          >
            <RotateCcw className="size-4" /> ROLLBACK
          </button>
        )}
      </div>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="size-4 text-emerald-500" />
              Deployment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold font-mono text-emerald-500/80">{h.label}</span>
                    <span className={cn(
                      "text-[9px] font-medium capitalize",
                      h.state === "deployed" ? "text-emerald-500/60" : h.state === "rollback" ? "text-amber-500/60" : "text-red-500/60"
                    )}>{h.state}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/40 tabular-nums">{h.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
