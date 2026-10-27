import { DEFAULT_INTELLIGENCE_CONFIG } from "./config"
import { ADJECTIVE, DIRECTION_TEXT, METRIC_LABEL, METRIC_NOUN, agoText, rangeText, withUnit } from "./copy.es"
import { detectEpisodes, normalizeSeries, rapidChange, validValue, type Sample } from "./series"
import type {
  DeviceInfo, EnvTargets, Finding, FindingKind, IntelligenceConfig, IntelligenceReport, MetricId, PrimaryAction,
  ProposedIntent, Recommendation, Summary,
} from "./types"

export interface InterpretInput {
  /** Real readings in any order (the API returns newest first). */
  readings: readonly { observedAt: string; temperature: number | null; humidity: number | null }[]
  device: DeviceInfo | null
  /** Targets of the confirmed stage. null = the person has not configured a cultivation/stage. */
  targets: EnvTargets | null
  now: string | number | Date
  config?: IntelligenceConfig
}

const METRICS: readonly MetricId[] = ["temperature", "humidity"]

function connectionOf(input: InterpretInput, latest: Sample | undefined, now: number, config: IntelligenceConfig): IntelligenceReport["connection"] {
  if (!input.device) return "unknown"
  if (!input.device.enabled) return "offline"
  const seen = input.device.lastSeenAt ? Date.parse(input.device.lastSeenAt) : Number.NaN
  const reference = latest ? latest.t : seen
  if (!Number.isFinite(reference)) return "unknown"
  const age = now - reference
  if (age < 0) return "unknown"
  if (age >= config.freshness.offlineAfterMs) return "offline"
  if (age >= config.freshness.staleAfterMs) return "stale"
  return "live"
}

export function interpretEnvironment(input: InterpretInput): IntelligenceReport {
  const config = input.config ?? DEFAULT_INTELLIGENCE_CONFIG
  const nowDate = new Date(input.now)
  const now = nowDate.getTime()
  const samples = normalizeSeries(input.readings, config)
  const latest = samples[samples.length - 1]
  const connection = connectionOf(input, latest, now, config)
  const findings: Finding[] = []

  const current = latest
    ? { temperature: validValue(latest, "temperature"), humidity: validValue(latest, "humidity"), observedAt: latest.iso }
    : null

  if (input.device && !input.device.enabled) {
    findings.push({ id: "device_disabled", kind: "device_disabled", severity: "attention" })
  } else if (connection === "offline") {
    findings.push({ id: `device_offline:${latest?.iso ?? "never"}`, kind: "device_offline", severity: "attention", observedAt: latest?.iso })
  } else if (connection === "stale") {
    findings.push({ id: `reading_stale:${latest?.iso ?? "never"}`, kind: "reading_stale", severity: "info", observedAt: latest?.iso })
  } else if (connection === "live" && latest) {
    // Sensor sanity first: an invalid value is reported and never evaluated against ranges.
    const usable: MetricId[] = []
    for (const metric of METRICS) {
      if (validValue(latest, metric) === null) {
        findings.push({ id: `sensor_invalid:${metric}:${latest.iso}`, kind: "sensor_invalid", severity: "attention", metric, observedAt: latest.iso })
      } else usable.push(metric)
    }
    const targets = input.targets
    const validCount = samples.filter(s => usable.some(m => validValue(s, m) !== null)).length
    if (!targets || usable.every(m => !targets[m])) {
      findings.push({ id: "needs_configuration", kind: "needs_configuration", severity: "info" })
    } else {
      for (const metric of usable) {
        const range = targets[metric]
        if (!range) continue
        const open = detectEpisodes(samples, metric, range, config).find(e => e.endedAt === null)
        if (open) {
          findings.push({
            id: `${metric}_${open.direction}:${open.startedAt}`,
            kind: `${metric}_${open.direction}` as FindingKind,
            severity: open.critical ? "critical" : "attention",
            metric, value: validValue(latest, metric), target: range, since: open.startedAt, observedAt: latest.iso,
          })
        }
      }
      if (validCount < config.persistence.samples) {
        findings.push({ id: "insufficient_data", kind: "insufficient_data", severity: "info" })
      }
    }
    for (const metric of usable) {
      const change = rapidChange(samples, metric, config)
      if (change) {
        findings.push({ id: `rapid_change:${metric}:${latest.iso}`, kind: "rapid_change", severity: "info", metric, value: change.delta, observedAt: latest.iso })
      }
    }
    const hasProblem = findings.some(f => f.kind !== "rapid_change" && f.severity !== "info")
    const blocked = findings.some(f => f.kind === "needs_configuration" || f.kind === "insufficient_data")
    if (targets && !hasProblem && !blocked) findings.push({ id: "in_range", kind: "in_range", severity: "info", observedAt: latest.iso })
  } else if (!latest) {
    findings.push({ id: "insufficient_data", kind: "insufficient_data", severity: "info" })
  }

  return {
    generatedAt: nowDate.toISOString(),
    source: "rules",
    connection,
    current,
    targets: input.targets,
    findings,
    recommendations: recommend(findings),
    primaryAction: primaryActionFor(findings),
    summary: summarize(findings, latest, now),
  }
}

function primaryActionFor(findings: readonly Finding[]): PrimaryAction | null {
  const has = (...kinds: FindingKind[]) => findings.some(f => kinds.includes(f.kind))
  if (has("device_offline", "device_disabled", "reading_stale", "sensor_invalid")) return { kind: "check_device", label: "Revisar MYKO-001", href: "/home/conectar" }
  if (has("needs_configuration")) return { kind: "configure_cultivation", label: "Empezar con MYKO", href: "/home/cultivo" }
  return null
}

const INTENT: Partial<Record<FindingKind, ProposedIntent["intent"]>> = {
  humidity_low: "raise_humidity", humidity_high: "lower_humidity",
  temperature_low: "raise_temperature", temperature_high: "lower_temperature",
}
const UNAVAILABLE = "Todavía no hay actuadores conectados: MYKOSPHARE solo observa."

export function recommend(findings: readonly Finding[]): Recommendation[] {
  const out: Recommendation[] = []
  for (const finding of findings) {
    const base = { id: `rec:${finding.id}`, findingId: finding.id, findingKind: finding.kind, severity: finding.severity, metric: finding.metric, requiresHuman: true as const }
    const cause = { metric: finding.metric, value: finding.value, target: finding.target, observedAt: finding.observedAt, since: finding.since }
    switch (finding.kind) {
      case "humidity_low":
      case "humidity_high":
      case "temperature_low":
      case "temperature_high": {
        const metric = finding.metric as MetricId
        const dir = finding.kind.endsWith("low") ? "low" : "high"
        const tips: Partial<Record<FindingKind, string>> = {
          humidity_low: "Revisa el agua del humidificador y que la cámara esté bien cerrada.",
          humidity_high: "Ventila un poco la cámara y comprueba que no haya agua acumulada.",
          temperature_low: "Revisa la ubicación y el aislamiento de la cámara.",
          temperature_high: "Aleja la cámara de fuentes de calor o ventílala.",
        }
        const measured = finding.value !== null && finding.value !== undefined && finding.target
          ? `${withUnit(metric, finding.value)}, ${DIRECTION_TEXT[dir]} del rango ${rangeText(metric, finding.target)}. ` : ""
        out.push({
          ...base,
          title: `${METRIC_NOUN[metric].replace("La ", "")} ${ADJECTIVE[metric][dir]}`.replace(/^./, c => c.toUpperCase()),
          body: `${measured}${tips[finding.kind] ?? ""}`,
          cause,
          proposal: { intent: INTENT[finding.kind] as ProposedIntent["intent"], available: false, unavailableReason: UNAVAILABLE },
        })
        break
      }
      case "rapid_change": {
        const metric = finding.metric as MetricId
        out.push({ ...base, title: `Cambio rápido de ${METRIC_LABEL[metric]}`, body: "Cambió más de lo habitual en pocos minutos. Revisa si se abrió la cámara o hubo corriente de aire.", cause })
        break
      }
      case "device_offline":
      case "device_disabled":
        out.push({ ...base, title: "MYKO-001 sin comunicación", body: "Revisa que el ESP32 tenga alimentación y que tu Wi-Fi de 2,4 GHz esté disponible.", cause })
        break
      case "reading_stale":
        out.push({ ...base, title: "Señal débil o lenta", body: "La última medición tardó más de lo normal. Si continúa, revisa el Wi-Fi.", cause })
        break
      case "sensor_invalid":
        out.push({ ...base, title: "Medición no válida", body: "El sensor entregó un valor imposible o incompleto. No lo uso para evaluar; revisa el cableado del DHT22.", cause })
        break
      case "needs_configuration":
        out.push({ ...base, title: "Aún no hay un cultivo", body: "Cuéntale a MYKO qué vas a cultivar y en qué etapa está. Hasta entonces solo observo y registro.", cause: {} })
        break
      default:
        break
    }
  }
  return out
}

export function summarize(findings: readonly Finding[], latest: Sample | undefined, now: number): Summary {
  const has = (...kinds: FindingKind[]) => findings.some(f => kinds.includes(f.kind))
  const age = latest ? agoText(now - latest.t) : null
  if (has("device_disabled")) return { headline: "MYKO-001 está deshabilitado.", detail: "No evalúo condiciones hasta que vuelva a habilitarse.", tone: "muted" }
  if (has("device_offline")) return { headline: "MYKO-001 dejó de enviar mediciones.", detail: age ? `Última medición ${age}. Conservo el último dato, pero no representa el estado actual.` : "Todavía no recibo mediciones.", tone: "muted" }
  if (has("reading_stale")) return { headline: "Sin señal reciente de MYKO-001.", detail: `Última medición ${age}.`, tone: "muted" }
  if (!latest) return { headline: "Esperando la primera medición.", detail: "En cuanto llegue una lectura real la evaluaré.", tone: "muted" }
  if (has("sensor_invalid")) return { headline: "Una medición no es válida.", detail: "No la uso para evaluar tu cultivo hasta que el sensor vuelva a entregar datos correctos.", tone: "attention" }
  if (has("needs_configuration")) return { headline: "Tu cámara está conectada y midiendo.", detail: "Aún no hay un cultivo registrado, así que no juzgo estos valores. Cuando me cuentes qué cultivas, los comparo con su rango.", tone: "info" }
  const out = findings.filter(f => f.kind === "temperature_low" || f.kind === "temperature_high" || f.kind === "humidity_low" || f.kind === "humidity_high")
  const first = out[0]
  if (first) {
    const tone = out.some(f => f.severity === "critical") ? "critical" : "attention"
    if (out.length > 1) return { headline: "La temperatura y la humedad están fuera del rango configurado.", detail: "Mira las recomendaciones para saber qué revisar.", tone }
    const metric = first.metric as MetricId
    const dir = first.kind.endsWith("low") ? "low" : "high"
    return { headline: `${METRIC_NOUN[metric]} está ${DIRECTION_TEXT[dir]} del rango configurado.`, detail: "Mira la recomendación para saber qué revisar.", tone }
  }
  if (has("rapid_change")) return { headline: "Hubo un cambio rápido en el ambiente.", detail: "Sigue dentro de lo configurado, pero cambió más de lo habitual en pocos minutos.", tone: "info" }
  if (has("insufficient_data")) return { headline: "Aún no tengo suficientes mediciones.", detail: "Necesito unos minutos de lecturas para evaluar la tendencia.", tone: "info" }
  return { headline: "Todo está estable.", detail: "Temperatura y humedad dentro del rango configurado.", tone: "ok" }
}
