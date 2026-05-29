"use client"

import { useMemo } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  CloudOff,
  Droplets,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
  Thermometer,
  TrendingUp,
  Wrench,
  Wind,
} from "lucide-react"

import { useDashboardTelemetry, useRealTimeTelemetry } from "./useTelemetry"
import type { DashboardTelemetry } from "./useTelemetry"

export type EnvState = "STABLE" | "OPTIMIZING" | "PRE_WARNING" | "WARNING" | "ESCALATION" | "CRITICAL" | "RECOVERY"

export interface ChamberIndicator {
  label: string
  status: string
  color: string
}

export interface ContextAlert {
  icon: LucideIcon
  label: string
  description: string
  color: string
  bg: string
  glow: string
}

export interface EnvironmentState {
  state: EnvState
  label: string
  color: string
  ringColor: string
  headTitle: string
  headSub: string
  icon: LucideIcon
  iconColor: string
  chamberIndicators: ChamberIndicator[]
  aiSummary: string
  alerts: ContextAlert[]
}

const TEMP_WARNING = 28
const TEMP_CRITICAL = 32
const TEMP_PRE_WARNING = 26.5
const HUM_WARNING = 50
const HUM_CRITICAL = 40
const HUM_PRE_WARNING = 57
const TEMP_STABLE_MIN = 22
const TEMP_STABLE_MAX = 27
const HUM_STABLE_MIN = 55
const HUM_STABLE_MAX = 75

function computeState(tel: DashboardTelemetry, online: boolean): EnvState {
  if (!online) return "WARNING"

  const temp = tel.temperature.value
  const hum = tel.humidity.value

  if (temp <= 0 && hum <= 0) return "STABLE"

  if (temp > TEMP_CRITICAL || hum < HUM_CRITICAL) {
    return "CRITICAL"
  }

  if (temp > TEMP_WARNING || hum < HUM_WARNING || hum > HUM_STABLE_MAX) {
    if (temp > TEMP_WARNING + 1.5 || hum < HUM_WARNING - 5) {
      return "ESCALATION"
    }
    const tempFalling = temp > TEMP_WARNING && tel.temperature.trend === "down"
    const humRising = hum < HUM_WARNING && tel.humidity.trend === "up"
    const humFalling = hum > HUM_STABLE_MAX && tel.humidity.trend === "down"
    if (tempFalling || humRising || humFalling) {
      return "RECOVERY"
    }
    return "WARNING"
  }

  if (temp > TEMP_PRE_WARNING || hum < HUM_PRE_WARNING) {
    return "PRE_WARNING"
  }

  const stableRange =
    temp >= TEMP_STABLE_MIN && temp <= TEMP_STABLE_MAX &&
    hum >= HUM_STABLE_MIN && hum <= HUM_STABLE_MAX

  if (!stableRange) return "OPTIMIZING"

  return "STABLE"
}

const STATE_META: Record<EnvState, {
  label: string
  color: string
  ringColor: string
  headTitle: string
  headSub: string
  icon: LucideIcon
  iconColor: string
}> = {
  STABLE: {
    label: "STABLE",
    color: "text-emerald-500",
    ringColor: "ring-emerald-500/20",
    headTitle: "All Systems Nominal",
    headSub: "No anomalies detected",
    icon: ShieldCheck,
    iconColor: "text-emerald-500",
  },
  OPTIMIZING: {
    label: "OPTIMIZING",
    color: "text-blue-500",
    ringColor: "ring-blue-500/20",
    headTitle: "Active Adjustments",
    headSub: "Fine-tuning environmental parameters",
    icon: RefreshCw,
    iconColor: "text-blue-500",
  },
  PRE_WARNING: {
    label: "PRE-WARNING",
    color: "text-yellow-500",
    ringColor: "ring-yellow-500/20",
    headTitle: "Minor Deviation",
    headSub: "Monitoring parameter drift",
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
  },
  WARNING: {
    label: "WARNING",
    color: "text-amber-500",
    ringColor: "ring-amber-500/20",
    headTitle: "Anomaly Detected",
    headSub: "System responding to deviation",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  ESCALATION: {
    label: "ESCALATION",
    color: "text-orange-500",
    ringColor: "ring-orange-500/20",
    headTitle: "Rapid Escalation",
    headSub: "Environmental instability increasing",
    icon: AlertTriangle,
    iconColor: "text-orange-500",
  },
  CRITICAL: {
    label: "CRITICAL",
    color: "text-red-500",
    ringColor: "ring-red-500/20",
    headTitle: "Critical Threshold",
    headSub: "Immediate action required",
    icon: AlertTriangle,
    iconColor: "text-red-500",
  },
  RECOVERY: {
    label: "RECOVERY",
    color: "text-teal-500",
    ringColor: "ring-teal-500/20",
    headTitle: "Conditions Improving",
    headSub: "Parameters returning to nominal",
    icon: TrendingUp,
    iconColor: "text-teal-500",
  },
}

function getChamberIndicators(
  tel: DashboardTelemetry,
  state: EnvState
): ChamberIndicator[] {
  const temp = tel.temperature.value
  const hum = tel.humidity.value

  const airflowStatus =
    state === "CRITICAL"
      ? "Maximum"
      : state === "WARNING"
        ? "Elevated"
        : state === "OPTIMIZING"
          ? "Balancing"
          : "Stable"
  const airflowColor =
    state === "WARNING" || state === "CRITICAL"
      ? "text-amber-500"
      : "text-emerald-500"

  const humStatus =
    hum > HUM_STABLE_MAX
      ? "High"
      : hum < HUM_WARNING
        ? "Low"
        : "Nominal"
  const humColor =
    hum > HUM_STABLE_MAX || hum < HUM_WARNING
      ? "text-amber-500"
      : "text-emerald-500"

  const tempStatus =
    temp > TEMP_CRITICAL
      ? "Critical"
      : temp > TEMP_WARNING
        ? "Elevated"
        : "Nominal"
  const tempColor =
    temp > TEMP_CRITICAL
      ? "text-red-500"
      : temp > TEMP_WARNING
        ? "text-amber-500"
        : "text-emerald-500"

  return [
    { label: "Airflow", status: airflowStatus, color: airflowColor },
    { label: "Humidity", status: humStatus, color: humColor },
    { label: "Temperature", status: tempStatus, color: tempColor },
  ]
}

function getAiSummary(tel: DashboardTelemetry, state: EnvState, online: boolean, simulated: boolean): string {
  if (!online) {
    return "Telemetry stream interrupted. Sensor communication lost. Attempting reconnection."
  }

  if (simulated) {
    const temp = tel.temperature.value
    const hum = tel.humidity.value
    if (temp <= 0 && hum <= 0) {
      return "Initializing simulated environmental model. Generating baseline telemetry."
    }
    return "Simulated environmental model active. Values represent estimated facility conditions based on statistical models."
  }

  const temp = tel.temperature.value
  const hum = tel.humidity.value

  if (temp <= 0 && hum <= 0) {
    return "Awaiting initial telemetry. Sensor synchronization in progress."
  }

  switch (state) {
    case "CRITICAL":
      if (temp > TEMP_CRITICAL) {
        return "Environmental instability detected. Temperature critical. Immediate intervention recommended."
      }
      if (hum < HUM_CRITICAL) {
        return "Critical humidity deficit. Environmental instability detected. Immediate intervention recommended."
      }
      return "Environmental instability detected. Immediate intervention recommended."
    case "WARNING":
      if (temp > TEMP_WARNING) {
        return "Thermal drift detected. Ventilation compensation active. Monitoring thermal load progression."
      }
      if (hum < HUM_WARNING) {
        return "Humidity variance detected. Recovery measures active. Substrate moisture balance adjusting."
      }
      if (hum > HUM_STABLE_MAX) {
        return "Elevated humidity levels. Air exchange rate increased. Monitoring condensation risk."
      }
      return "Environmental conditions nominal. System maintaining operational parameters."
    case "RECOVERY":
      if (tel.temperature.trend === "down") {
        return "Thermal correction in progress. Temperature trending toward operational range."
      }
      if (tel.humidity.trend === "up") {
        return "Humidity recovery underway. Moisture levels stabilizing within target band."
      }
      if (tel.humidity.trend === "down") {
        return "Humidity reduction in progress. Dehumidification response effective."
      }
      return "Environmental parameters returning to nominal operating range."
    case "OPTIMIZING":
      return "Fine-tuning environmental parameters. Minor adjustments underway to maintain optimal conditions."
    default:
      return "Environmental conditions nominal. All systems operating within specified parameters."
  }
}

function getContextAlerts(
  tel: DashboardTelemetry,
  state: EnvState,
  online: boolean,
  simulated: boolean
): ContextAlert[] {
  const alerts: ContextAlert[] = []
  const temp = tel.temperature.value
  const hum = tel.humidity.value

  if (!online) {
    alerts.push({
      icon: CloudOff,
      label: "Telemetry Loss",
      description: "Sensor communication interrupted. No data received.",
      color: "text-red-500",
      bg: "bg-red-500/10",
      glow: "shadow-[0_0_10px_-2px] shadow-red-500/20",
    })
    return alerts
  }

  if (simulated) {
    alerts.push({
      icon: FlaskConical,
      label: "Simulation Active",
      description: "No ESP32 detected. Showing simulated environmental data.",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      glow: "shadow-[0_0_10px_-2px] shadow-amber-500/20",
    })
  }

  if (temp > TEMP_CRITICAL) {
    alerts.push({
      icon: Thermometer,
      label: "High Temperature",
      description: `${temp}\u00b0C \u2014 exceeds ${TEMP_CRITICAL}\u00b0C critical threshold`,
      color: "text-red-500",
      bg: "bg-red-500/10",
      glow: "shadow-[0_0_10px_-2px] shadow-red-500/20",
    })
  } else if (temp > TEMP_WARNING) {
    alerts.push({
      icon: Thermometer,
      label: "High Temperature",
      description: `${temp}\u00b0C \u2014 above ${TEMP_WARNING}\u00b0C warning threshold`,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      glow: "shadow-[0_0_10px_-2px] shadow-amber-500/20",
    })
  }

  if (hum < HUM_CRITICAL) {
    alerts.push({
      icon: Droplets,
      label: "Low Humidity",
      description: `${hum}% \u2014 below ${HUM_CRITICAL}% critical threshold`,
      color: "text-red-500",
      bg: "bg-red-500/10",
      glow: "shadow-[0_0_10px_-2px] shadow-red-500/20",
    })
  } else if (hum < HUM_WARNING && hum > 0) {
    alerts.push({
      icon: Droplets,
      label: "Humidity Drift",
      description: `${hum}% \u2014 below ${HUM_WARNING}% minimum threshold`,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      glow: "shadow-[0_0_10px_-2px] shadow-amber-500/20",
    })
  } else if (hum > HUM_STABLE_MAX) {
    alerts.push({
      icon: Droplets,
      label: "High Humidity",
      description: `${hum}% \u2014 exceeds ${HUM_STABLE_MAX}% maximum`,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      glow: "shadow-[0_0_10px_-2px] shadow-amber-500/20",
    })
  }

  if (state === "CRITICAL") {
    alerts.push({
      icon: Wind,
      label: "Ventilation Override",
      description: "Air exchange at maximum capacity. Check substrate integrity.",
      color: "text-red-500",
      bg: "bg-red-500/10",
      glow: "shadow-[0_0_10px_-2px] shadow-red-500/20",
    })
  }

  if (alerts.length <= (simulated ? 1 : 0) && temp > 0) {
    alerts.push({
      icon: Wrench,
      label: "Routine Check",
      description: "All systems within operational parameters. Next maintenance in 7 days.",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      glow: "shadow-[0_0_10px_-2px] shadow-blue-500/20",
    })
  }

  return alerts
}

export function useRealEnvironment(): EnvironmentState {
  const tel = useDashboardTelemetry()
  const rtTel = useRealTimeTelemetry()

  return useMemo(() => {
    const online = rtTel.online
    const simulated = rtTel.source === "simulated"
    const hasData = tel.temperature.value > 0
    const state = computeState(tel, online)
    const displayState = !online && !hasData ? "STABLE" : state
    const displayMeta = STATE_META[displayState]

    return {
      state: displayState,
      label: online ? displayMeta.label : hasData ? state : "OFFLINE",
      color: online ? (simulated ? "text-amber-500" : displayMeta.color) : "text-muted-foreground",
      ringColor: online ? (simulated ? "ring-amber-500/20" : displayMeta.ringColor) : "ring-muted-foreground/10",
      headTitle: online ? (simulated ? "Simulation Active" : displayMeta.headTitle) : "Telemetry Lost",
      headSub: online ? (simulated ? "Estimated environmental parameters" : displayMeta.headSub) : "No data received from ESP32",
      icon: online ? (simulated ? FlaskConical : displayMeta.icon) : CloudOff,
      iconColor: online ? (simulated ? "text-amber-500" : displayMeta.iconColor) : "text-muted-foreground",
      chamberIndicators: getChamberIndicators(tel, displayState),
      aiSummary: getAiSummary(tel, state, online, simulated),
      alerts: getContextAlerts(tel, state, online, simulated),
    }
  }, [tel, rtTel.online, rtTel.source])
}
