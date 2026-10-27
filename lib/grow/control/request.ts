import { parseTargets } from "./validation"
import type { ControlMode, ControlTargets } from "./types"

/**
 * Turns a sentence like "Quiero una temperatura de 23 °C y humedad entre 75 y 85 %" into a PROPOSAL.
 * It only reads numbers the person wrote, states every assumption it made (for example the tolerance around a single
 * value) and checks the result against the hard envelope. It never saves anything: the person confirms the exact
 * values afterwards.
 */
export interface TargetProposal {
  mode: ControlMode
  targets: ControlTargets
  /** Anything MYKO had to assume, in plain Spanish, shown before confirming. */
  assumptions: string[]
}
export type TargetRequest = { ok: true; proposal: TargetProposal } | { ok: false; error: string } | null

const TOLERANCE = { temperature: 1, humidity: 5 } as const
const NUM = "(\\d{1,3}(?:\\.\\d+)?)"

function clean(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/(\d),(\d)/g, "$1.$2").replace(/[°%]/g, " ").replace(/\s+/g, " ").trim()
}

function readMetric(text: string, word: string, metric: "temperature" | "humidity", unit: string, assumptions: string[]): { min: number; max: number } | undefined {
  const at = text.indexOf(word)
  if (at < 0) return undefined
  // Only the words right after the metric name, so "temperatura 23 y humedad 80" does not mix the numbers.
  const rest = text.slice(at + word.length)
  const stop = rest.search(/\b(temperatura|humedad)\b/)
  const part = (stop >= 0 ? rest.slice(0, stop) : rest).slice(0, 60)
  const range = part.match(new RegExp(`${NUM}\\s*(?:y|a|-|hasta)\\s*${NUM}`))
  if (range) {
    const a = Number(range[1])
    const b = Number(range[2])
    return { min: Math.min(a, b), max: Math.max(a, b) }
  }
  const single = part.match(new RegExp(NUM))
  if (single) {
    const v = Number(single[1])
    const tol = TOLERANCE[metric]
    assumptions.push(`Interpreté ${v} ${unit} como ${v - tol}–${v + tol} ${unit} (±${tol} ${unit}). Puedes cambiarlo antes de confirmar.`)
    return { min: v - tol, max: v + tol }
  }
  return undefined
}

const WANTS = /\b(quiero|quisiera|necesito|pon|ponme|deja|ajusta|cambia|fija|mant[eé]n|mantener|objetivo|prueba|probar|probemos|establece|configura)\b/

export function interpretTargetRequest(raw: string): TargetRequest {
  const text = clean(raw)
  if (!/\b(temperatura|humedad)\b/.test(text) || !/\d/.test(text) || !WANTS.test(text.replace(/\bmanten\b/, "manten"))) return null
  const assumptions: string[] = []
  const temperature = readMetric(text, "temperatura", "temperature", "°C", assumptions)
  const humidity = readMetric(text, "humedad", "humidity", "%", assumptions)
  if (!temperature && !humidity) return null
  const parsed = parseTargets({ ...(temperature ? { temperature } : {}), ...(humidity ? { humidity } : {}) })
  if (!parsed.ok) {
    return { ok: false, error: "Ese objetivo sale de los límites seguros (temperatura 5–35 °C y humedad 20–98 %, con un ancho mínimo de 1 °C y 4 puntos). Dime otro rango." }
  }
  return { ok: true, proposal: { mode: "simulation", targets: parsed.value, assumptions } }
}

export function describeTargets(targets: ControlTargets): string {
  const parts: string[] = []
  const fmt = (n: number) => String(n).replace(".", ",")
  if (targets.temperature) parts.push(`temperatura ${fmt(targets.temperature.min)}–${fmt(targets.temperature.max)} °C`)
  if (targets.humidity) parts.push(`humedad ${fmt(targets.humidity.min)}–${fmt(targets.humidity.max)} %`)
  return parts.join(" y ")
}
