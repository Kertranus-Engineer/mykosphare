import type { AssistantAnswer, AssistantContext } from "../intelligence"

/**
 * Optional language-model layer. SERVER ONLY: the key is read from the environment of the server and never
 * reaches the browser. Off unless explicitly enabled; when off or failing, the rule-based assistant answers.
 *
 * Why a plain HTTPS call instead of an SDK: one small dependency-free function, one provider, a small model.
 * The model receives only the allow-listed AssistantContext, can only return text, and has no tool, no database
 * and no hardware access. Whatever it says is filtered before anyone sees it.
 */
export interface AiConfig { apiKey: string; model: string; baseUrl: string }

export function readAiConfig(env: Record<string, string | undefined> = process.env): AiConfig | null {
  if (env.MYKO_AI_ENABLED !== "1" || !env.MYKO_AI_API_KEY) return null
  return { apiKey: env.MYKO_AI_API_KEY, model: env.MYKO_AI_MODEL || "claude-haiku-5-5", baseUrl: env.MYKO_AI_BASE_URL || "https://api.anthropic.com" }
}

export interface Turn { role: "user" | "assistant"; text: string }

export const SYSTEM_PROMPT = [
  "Eres MYKO, el asistente ambiental de MYKOSPHARE. Respondes en español claro y breve (máximo 120 palabras).",
  "Usa SOLO el CONTEXTO JSON. Reglas:",
  "1) Distingue observaciones (datos medidos, con su hora) de hipótesis (posibles explicaciones; di explícitamente que no están confirmadas).",
  "2) Si falta información, dilo y explica cuál.",
  "3) Los únicos sensores son temperatura y humedad. No hay actuadores y no controlas nada: nunca digas que encendiste, apagaste, activaste o ajustaste algo.",
  "4) No diagnostiques salud, contaminación ni plagas del cultivo, y no inventes valores ni sensores.",
  "5) Los perfiles de especie son de ejemplo salvo que el contexto diga validated; no los presentes como definitivos.",
  "6) Los límites de seguridad no se modifican: si sugieres un cambio, preséntalo como sugerencia para que la persona decida.",
  'Responde SOLO con JSON: {"answer": string, "observations": string[], "hypotheses": string[], "missing": string[]}.',
].join("\n")

export function buildMessages(context: AssistantContext, message: string, turns: readonly Turn[]) {
  const recent = turns.slice(-4).map(t => ({ role: t.role, content: t.text.slice(0, 400) }))
  return [...recent, { role: "user" as const, content: `CONTEXTO: ${JSON.stringify(context)}\nPREGUNTA: ${message.slice(0, 500)}` }]
}

export interface ModelReply { answer: string; observations: string[]; hypotheses: string[]; missing: string[] }

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 5) : [])

export function parseModelReply(raw: string): ModelReply | null {
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
    if (typeof parsed.answer !== "string" || !parsed.answer.trim()) return null
    return { answer: parsed.answer.trim(), observations: strings(parsed.observations), hypotheses: strings(parsed.hypotheses), missing: strings(parsed.missing) }
  } catch { return null }
}

const FORBIDDEN: { re: RegExp; reason: string }[] = [
  // \b does not work after accented letters in JS regex, so boundaries are spelled out.
  { re: /(?<![a-záéíóúñ])(encend[ií]|apagu[eé]|activ[eé]|desactiv[eé]|ajust[eé]|prend[ií]|abr[ií]|cerr[eé])(?![a-záéíóúñ])/i, reason: "claims a physical action" },
  { re: /\b(co2|co₂|dióxido de carbono|luminosidad|lux|conductividad|ph)\b[^.]{0,20}\d/i, reason: "invents a sensor reading" },
  { re: /\b(contamin|trichoderma|plaga|enfermedad|infecci)\w*/i, reason: "health diagnosis" },
]

/** Deterministic filter applied to every model reply before it can be shown. */
export function guardReply(reply: ModelReply): { ok: true } | { ok: false; reason: string } {
  const text = [reply.answer, ...reply.observations, ...reply.hypotheses, ...reply.missing].join(" ")
  if (text.length > 1600) return { ok: false, reason: "too long" }
  for (const rule of FORBIDDEN) if (rule.re.test(text)) return { ok: false, reason: rule.reason }
  return { ok: true }
}

export function composeText(reply: ModelReply): string {
  const parts = [reply.answer]
  if (reply.hypotheses.length) parts.push(`Hipótesis (no confirmadas): ${reply.hypotheses.join("; ")}.`)
  if (reply.missing.length) parts.push(`Me falta: ${reply.missing.join("; ")}.`)
  return parts.join(" ")
}

export type ModelOutcome = { status: "ok"; answer: AssistantAnswer } | { status: "rejected" | "error"; reason: string }

export async function askModel(
  config: AiConfig, context: AssistantContext, message: string, turns: readonly Turn[], fetchImpl: typeof fetch = fetch,
): Promise<ModelOutcome> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetchImpl(`${config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: config.model, max_tokens: 400, temperature: 0.2, system: SYSTEM_PROMPT, messages: buildMessages(context, message, turns) }),
      signal: controller.signal,
    })
    if (!response.ok) return { status: "error", reason: `provider status ${response.status}` }
    const body = (await response.json()) as { content?: { type?: string; text?: string }[] }
    const raw = body.content?.find(part => part.type === "text")?.text ?? ""
    const reply = parseModelReply(raw)
    if (!reply) return { status: "rejected", reason: "unparseable reply" }
    const verdict = guardReply(reply)
    if (!verdict.ok) return { status: "rejected", reason: verdict.reason }
    return { status: "ok", answer: { questionId: "unknown", source: "model", text: composeText(reply), evidence: reply.observations.slice(0, 3), understood: true } }
  } catch {
    return { status: "error", reason: "request failed" }
  } finally {
    clearTimeout(timer)
  }
}
