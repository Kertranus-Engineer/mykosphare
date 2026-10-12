/**
 * MYKOSPHARE HOME — Spanish presentation layer.
 *
 * The shared engines (useRealEnvironment, event bus) produce English strings.
 * This module only maps them to Spanish for the mobile UI; it never decides
 * what the environmental state is.
 */

import type { EnvState } from "@/lib/useEnvironment"

export const STATE_ES: Record<EnvState, { label: string; title: string; subtitle: string }> = {
  STABLE: { label: "Estable", title: "Condiciones estables", subtitle: "Sin anomalías detectadas" },
  OPTIMIZING: { label: "Optimizando", title: "Ajustes en curso", subtitle: "Afinando parámetros ambientales" },
  PRE_WARNING: { label: "Prealerta", title: "Desviación leve", subtitle: "Vigilando la deriva de parámetros" },
  WARNING: { label: "Advertencia", title: "Anomalía detectada", subtitle: "El sistema responde a la desviación" },
  ESCALATION: { label: "Escalada", title: "Inestabilidad creciente", subtitle: "La inestabilidad ambiental va en aumento" },
  CRITICAL: { label: "Crítico", title: "Umbral crítico superado", subtitle: "Se requiere acción inmediata" },
  RECOVERY: { label: "Recuperación", title: "Condiciones mejorando", subtitle: "Los parámetros vuelven al rango nominal" },
}

/** States the operator should look at. Everything else counts as "stable enough". */
export function needsAttention(state: EnvState): boolean {
  return state === "WARNING" || state === "ESCALATION" || state === "CRITICAL"
}

const INDICATOR_STATUS_ES: Record<string, string> = {
  Nominal: "Nominal",
  High: "Alta",
  Low: "Baja",
  Elevated: "Elevada",
  Critical: "Crítica",
}

export function indicatorStatusEs(status: string): string {
  return INDICATOR_STATUS_ES[status] ?? status
}

// ── Alerts ────────────────────────────────────────────────

const ALERT_TITLE_ES: Record<string, string> = {
  "Telemetry Loss": "Telemetría perdida",
  "Simulation Active": "Simulación activa",
  "High Temperature": "Temperatura alta",
  "Low Humidity": "Humedad baja",
  "Humidity Drift": "Deriva de humedad",
  "High Humidity": "Humedad alta",
  "Ventilation Override": "Ventilación al máximo",
}

const ALERT_DETAIL_ES: Record<string, string> = {
  "Sensor communication interrupted. No data received.": "Se interrumpió la comunicación con el sensor. No se reciben datos.",
  "No ESP32 detected. Showing simulated environmental data.": "No hay ESP32 conectado. Se muestran datos ambientales simulados.",
  "Air exchange at maximum capacity. Check substrate integrity.": "Intercambio de aire al máximo. Revisa el estado del sustrato.",
}

const THRESHOLD_PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^(.+?) — exceeds (.+?) critical threshold$/, (m) => `${m[1]} — supera el umbral crítico de ${m[2]}`],
  [/^(.+?) — above (.+?) warning threshold$/, (m) => `${m[1]} — sobre el umbral de advertencia de ${m[2]}`],
  [/^(.+?) — below (.+?) critical threshold$/, (m) => `${m[1]} — bajo el umbral crítico de ${m[2]}`],
  [/^(.+?) — below (.+?) minimum threshold$/, (m) => `${m[1]} — bajo el mínimo de ${m[2]}`],
  [/^(.+?) — exceeds (.+?) maximum$/, (m) => `${m[1]} — supera el máximo de ${m[2]}`],
]

export function localizeAlert(label: string, description: string): { title: string; detail: string } {
  let detail = ALERT_DETAIL_ES[description] ?? description
  if (detail === description) {
    for (const [re, fmt] of THRESHOLD_PATTERNS) {
      const m = description.match(re)
      if (m) {
        detail = fmt(m)
        break
      }
    }
  }
  return { title: ALERT_TITLE_ES[label] ?? label, detail }
}

// ── Operational events (event bus) ────────────────────────

const OP_EVENT_ES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Telemetry source lost\. Switched to simulation mode\.$/, () => "Se perdió la fuente de telemetría. Cambio a modo simulación."],
  [/^ESP32 telemetry lost/, () => "Telemetría del ESP32 perdida — simulación activa"],
  [/^ESP32 telemetry restored\. Live data active\.$/, () => "Telemetría del ESP32 restablecida. Datos en vivo activos."],
  [/^Live telemetry reconnected$/, () => "Telemetría en vivo reconectada"],
  [/^Stream reconnected$/, () => "Conexión de datos restablecida"],
  [/^Operational state restored$/, () => "Estado operativo restablecido"],
  [/^Retry attempt (\d+)$/, (m) => `Reintento de conexión n.º ${m[1]}`],
  [/^Connection lost/, () => "Conexión perdida — modo degradado"],
  [/^Stream integrity degraded/, () => "Integridad de datos degradada — en vigilancia"],
]

export function localizeOpEvent(message: string): string {
  // Bus messages are prefixed with a tag such as "[TELM] ".
  const text = message.replace(/^\[[A-Z]+\]\s*/, "")
  for (const [re, fmt] of OP_EVENT_ES) {
    const m = text.match(re)
    if (m) return fmt(m)
  }
  return text
}

// ── Relative time ─────────────────────────────────────────

export function relativeTimeEs(from: number, now: number): string {
  const s = Math.max(0, Math.round((now - from) / 1000))
  if (s < 5) return "ahora"
  if (s < 60) return `hace ${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 48) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}
