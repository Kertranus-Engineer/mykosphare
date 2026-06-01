/**
 * Future-Ready Interfaces — MYKOSPHARE Autonomous Pipeline
 *
 * These interfaces define the contract for the future AUTONOMOUS MODE pipeline.
 * No AI implementation exists yet. These are architectural placeholders.
 *
 * Expected pipeline:
 *   Visual Analysis + Telemetry Analysis + Decision Engine + ESP32 Commands
 */

export interface VisualCapture {
  id: string
  imageUrl: string
  bucketPath: string
  capturedAt: string
  source: "esp32cam" | "smartphone" | "manual" | "api"
  metadata: {
    fileSize: number
    resolution: { width: number; height: number }
    format: string
  }
}

export interface TelemetryCapture {
  id: string
  timestamp: string
  deviceId: string
  sensors: {
    temperature: number
    humidity: number
    co2: number
    energyUsage?: number
  }
  actuators: {
    fan: "on" | "off"
    humidifier: "on" | "off"
  }
  raw: Record<string, number | string>
}

export interface AnalysisResult {
  id: string
  captureId: string
  type: "visual" | "telemetry" | "combined"
  timestamp: string
  confidence: number
  findings: AnalysisFinding[]
  recommendation: string
  severity: "healthy" | "warning" | "critical"
}

export interface AnalysisFinding {
  category: "growth" | "contamination" | "environmental" | "hardware" | "anomaly"
  label: string
  description: string
  confidence: number
  indicators: string[]
}

export interface AutomationAction {
  id: string
  triggeredBy: string
  timestamp: string
  type: "actuator" | "notification" | "alert" | "adjustment"
  target: string
  command: string
  payload: Record<string, string | number | boolean>
  status: "pending" | "sent" | "acknowledged" | "completed" | "failed"
  executedAt?: string
}

export interface AutonomousPipeline {
  visualCapture: VisualCapture | null
  telemetryCapture: TelemetryCapture | null
  analysisResult: AnalysisResult | null
  automationAction: AutomationAction | null
  status: "idle" | "capturing" | "analyzing" | "deciding" | "executing" | "complete"
}
