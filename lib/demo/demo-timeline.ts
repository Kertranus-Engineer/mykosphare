export type DemoPhase = "NOMINAL" | "DRIFT" | "WARNING" | "CRITICAL" | "COMPENSATING" | "STABILIZED"

export interface DemoStep {
  phase: DemoPhase
  temp: number
  hum: number
  durationMs: number
  narrative: string
}

export const DEMO_TIMELINE: DemoStep[] = [
  {
    phase: "NOMINAL",
    temp: 24.5,
    hum: 62,
    durationMs: 8000,
    narrative: "Environmental conditions nominal",
  },
  {
    phase: "DRIFT",
    temp: 24.8,
    hum: 65,
    durationMs: 2000,
    narrative: "Minor humidity variance detected",
  },
  {
    phase: "DRIFT",
    temp: 25.2,
    hum: 68,
    durationMs: 2500,
    narrative: "Humidity drift monitored",
  },
  {
    phase: "DRIFT",
    temp: 25.5,
    hum: 71,
    durationMs: 2500,
    narrative: "Moisture levels rising",
  },
  {
    phase: "WARNING",
    temp: 26.0,
    hum: 74,
    durationMs: 2500,
    narrative: "Humidity threshold approaching",
  },
  {
    phase: "WARNING",
    temp: 26.8,
    hum: 76,
    durationMs: 2500,
    narrative: "Warning: humidity elevated",
  },
  {
    phase: "WARNING",
    temp: 27.5,
    hum: 78,
    durationMs: 2000,
    narrative: "Ventilation compensation recommended",
  },
  {
    phase: "CRITICAL",
    temp: 29.0,
    hum: 80,
    durationMs: 3000,
    narrative: "Thermal anomaly detected",
  },
  {
    phase: "CRITICAL",
    temp: 31.5,
    hum: 75,
    durationMs: 4000,
    narrative: "Critical temperature threshold",
  },
  {
    phase: "CRITICAL",
    temp: 33.0,
    hum: 68,
    durationMs: 4000,
    narrative: "Immediate intervention required",
  },
  {
    phase: "COMPENSATING",
    temp: 31.0,
    hum: 62,
    durationMs: 2500,
    narrative: "Compensation protocols active",
  },
  {
    phase: "COMPENSATING",
    temp: 28.5,
    hum: 58,
    durationMs: 2500,
    narrative: "Airflow increasing — thermal load reducing",
  },
  {
    phase: "COMPENSATING",
    temp: 26.5,
    hum: 55,
    durationMs: 3000,
    narrative: "Cooling cycle engaged",
  },
  {
    phase: "STABILIZED",
    temp: 25.0,
    hum: 58,
    durationMs: 3000,
    narrative: "Thermal equilibrium restoring",
  },
  {
    phase: "STABILIZED",
    temp: 24.5,
    hum: 60,
    durationMs: 3000,
    narrative: "Equilibrium restored",
  },
  {
    phase: "STABILIZED",
    temp: 24.5,
    hum: 62,
    durationMs: 2000,
    narrative: "All systems nominal",
  },
]

export const DEMO_SPEED_MULTIPLIER = 0.55
