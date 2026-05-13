"use client"

import { useMemo } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  Droplets,
  RefreshCw,
  ShieldCheck,
  Thermometer,
  TrendingUp,
  Wind,
  Wrench,
} from "lucide-react"

import type { TelemetrySnapshot } from "./simulator"
import { useTelemetry } from "./simulator"

export type EnvState = "STABLE" | "OPTIMIZING" | "WARNING" | "RECOVERY"

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

function computeState(tel: TelemetrySnapshot): EnvState {
  const highCo2 = tel.co2.value > 420
  const lowHumidity = tel.humidity.value < 59
  const highHumidity = tel.humidity.value > 63
  const tempLow = tel.temperature.value < 23.8
  const tempHigh = tel.temperature.value > 25.5
  const inWarning = highCo2 || lowHumidity || highHumidity || tempLow || tempHigh

  if (inWarning) {
    const co2Falling = highCo2 && tel.co2.trend === "down"
    const humidityRising = lowHumidity && tel.humidity.trend === "up"
    const humidityFalling = highHumidity && tel.humidity.trend === "down"
    const tempRising = tempLow && tel.temperature.trend === "up"
    const tempFalling = tempHigh && tel.temperature.trend === "down"

    if (co2Falling || humidityRising || humidityFalling || tempRising || tempFalling) {
      return "RECOVERY"
    }
    return "WARNING"
  }

  const fluctuating =
    Math.abs(tel.humidity.delta) > 0.2 ||
    Math.abs(tel.temperature.delta) > 0.08 ||
    Math.abs(tel.co2.delta) > 1

  if (fluctuating) return "OPTIMIZING"

  return "STABLE"
}

const STATE_META: Record<
  EnvState,
  {
    label: string
    color: string
    ringColor: string
    headTitle: string
    headSub: string
    icon: LucideIcon
    iconColor: string
  }
> = {
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
  WARNING: {
    label: "WARNING",
    color: "text-amber-500",
    ringColor: "ring-amber-500/20",
    headTitle: "Anomaly Detected",
    headSub: "System responding to deviation",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
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
  tel: TelemetrySnapshot,
  state: EnvState
): ChamberIndicator[] {
  const airflowStatus =
    state === "WARNING"
      ? "Adjusting"
      : state === "OPTIMIZING"
        ? "Balancing"
        : "Stable"
  const airflowColor =
    state === "WARNING"
      ? "text-amber-500"
      : "text-emerald-500"

  const humStatus =
    tel.humidity.value > 63
      ? "Elevated"
      : tel.humidity.value < 59
        ? "Low"
        : "Nominal"
  const humColor =
    tel.humidity.value > 63 || tel.humidity.value < 59
      ? "text-amber-500"
      : "text-emerald-500"

  return [
    { label: "Airflow", status: airflowStatus, color: airflowColor },
    { label: "Humidity", status: humStatus, color: humColor },
    { label: "Sensor Network", status: "Online", color: "text-emerald-500" },
  ]
}

function getAiSummary(tel: TelemetrySnapshot, state: EnvState): string {
  switch (state) {
    case "WARNING":
      if (tel.co2.value > 420)
        return "Elevated CO₂ levels detected. Air exchange system responding to restore balance."
      if (tel.humidity.value > 63)
        return "Humidity above optimal threshold. Dehumidification subsystem actively engaged."
      if (tel.humidity.value < 59)
        return "Humidity below target range. Misting system adjusted to increase vapor pressure."
      if (tel.temperature.value > 25.5)
        return "Thermal deviation detected. HVAC compensation routines initialized."
      if (tel.temperature.value < 23.8)
        return "Temperature below optimal band. Heating elements activated."
      return "Environmental anomaly detected. Diagnostic routines are active."
    case "RECOVERY":
      if (tel.co2.trend === "down")
        return "CO₂ levels declining toward nominal. Air exchange proving effective."
      if (tel.humidity.trend === "up" || tel.humidity.trend === "down")
        return "Humidity recovery trend detected. Conditions stabilizing within operational band."
      if (tel.temperature.trend === "up" || tel.temperature.trend === "down")
        return "Temperature correction in progress. Thermal inertia within expected parameters."
      return "Environmental parameters returning to nominal operating range."
    case "OPTIMIZING":
      return "Fine-tuning environmental parameters. Minor adjustments underway to maintain optimal growing conditions."
    default:
      return "Environmental stability nominal. All sensor arrays reporting within optimal range."
  }
}

function getContextAlerts(
  tel: TelemetrySnapshot,
  state: EnvState
): ContextAlert[] {
  const alerts: ContextAlert[] = []

  if (tel.co2.value > 418) {
    alerts.push({
      icon: Wind,
      label: "Elevated CO₂",
      description: `Reading ${Math.round(tel.co2.value)} ppm`,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      glow: "shadow-[0_0_10px_-2px] shadow-amber-500/20",
    })
  }

  if (tel.humidity.value < 59.5 || tel.humidity.value > 62.5) {
    alerts.push({
      icon: Droplets,
      label: "Humidity Variance",
      description: `Current: ${tel.humidity.value.toFixed(1)}%`,
      color: tel.humidity.value < 59.5 ? "text-amber-500" : "text-blue-500",
      bg:
        tel.humidity.value < 59.5
          ? "bg-amber-500/10"
          : "bg-blue-500/10",
      glow:
        tel.humidity.value < 59.5
          ? "shadow-[0_0_10px_-2px] shadow-amber-500/20"
          : "shadow-[0_0_10px_-2px] shadow-blue-500/20",
    })
  }

  if (tel.temperature.value < 23.9 || tel.temperature.value > 25.3) {
    alerts.push({
      icon: Thermometer,
      label: "Temperature Deviation",
      description: `${tel.temperature.value}°C`,
      color:
        tel.temperature.value < 23.9 ? "text-blue-500" : "text-amber-500",
      bg:
        tel.temperature.value < 23.9
          ? "bg-blue-500/10"
          : "bg-amber-500/10",
      glow:
        tel.temperature.value < 23.9
          ? "shadow-[0_0_10px_-2px] shadow-blue-500/20"
          : "shadow-[0_0_10px_-2px] shadow-amber-500/20",
    })
  }

  alerts.push({
    icon: Wrench,
    label: "Maintenance Recommended",
    description: "HEPA filter: 42 days remaining",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    glow: "shadow-[0_0_10px_-2px] shadow-blue-500/20",
  })

  return alerts
}

export function useEnvironment(): EnvironmentState {
  const tel = useTelemetry()
  return useMemo(() => {
    const state = computeState(tel)
    const meta = STATE_META[state]
    return {
      state,
      label: meta.label,
      color: meta.color,
      ringColor: meta.ringColor,
      headTitle: meta.headTitle,
      headSub: meta.headSub,
      icon: meta.icon,
      iconColor: meta.iconColor,
      chamberIndicators: getChamberIndicators(tel, state),
      aiSummary: getAiSummary(tel, state),
      alerts: getContextAlerts(tel, state),
    }
  }, [tel])
}
