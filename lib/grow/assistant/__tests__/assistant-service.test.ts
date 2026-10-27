import { describe, expect, it, vi } from "vitest"
import { buildAssistantContext, interpretEnvironment, type ReadingPoint } from "../../intelligence"
import { SYSTEM_PROMPT, buildMessages, guardReply, parseModelReply, readAiConfig } from "../model"
import { answerMessage, createLimiter } from "../service"

const now = new Date("2026-10-27T15:00:00Z")
const readings: ReadingPoint[] = Array.from({ length: 30 }, (_, i) => ({ observedAt: new Date(now.getTime() - i * 30_000).toISOString(), temperature: 24.6, humidity: 58 }))
const report = interpretEnvironment({ readings, device: { name: "MYKO-001", enabled: true, lastSeenAt: now.toISOString() }, targets: null, now })
const context = buildAssistantContext({ report, history: readings, events: [], now, deviceName: "MYKO-001" })
const ai = { provider: "anthropic" as const, apiKey: "test-key-not-real", model: "claude-haiku-5-5", baseUrl: "https://provider.test" }
const local = { provider: "openai-compatible" as const, apiKey: "", model: "llama3.2", baseUrl: "http://localhost:11434" }
const modelBody = (payload: unknown) => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: typeof payload === "string" ? payload : JSON.stringify(payload) }] }) }) as Response

describe("AI configuration", () => {
  it("is off unless explicitly enabled with a key, and never reads a public variable", () => {
    expect(readAiConfig({})).toBeNull()
    expect(readAiConfig({ MYKO_AI_API_KEY: "k" })).toBeNull()
    expect(readAiConfig({ MYKO_AI_ENABLED: "1" })).toBeNull()
    expect(readAiConfig({ NEXT_PUBLIC_MYKO_AI_API_KEY: "k", MYKO_AI_ENABLED: "1" })).toBeNull()
    expect(readAiConfig({ MYKO_AI_ENABLED: "1", MYKO_AI_API_KEY: "k" })).toBeNull() // a provider must be chosen explicitly
    expect(readAiConfig({ MYKO_AI_ENABLED: "1", MYKO_AI_PROVIDER: "anthropic", MYKO_AI_API_KEY: "k" })).toMatchObject({ provider: "anthropic", model: "claude-haiku-5-5" })
  })

  it("supports a free, self-hosted model without any key, but only with an explicit address and model", () => {
    expect(readAiConfig({ MYKO_AI_ENABLED: "1", MYKO_AI_PROVIDER: "openai-compatible" })).toBeNull()
    expect(readAiConfig({ MYKO_AI_ENABLED: "1", MYKO_AI_PROVIDER: "openai-compatible", MYKO_AI_BASE_URL: "http://localhost:11434" })).toBeNull()
    expect(readAiConfig({ MYKO_AI_ENABLED: "1", MYKO_AI_PROVIDER: "openai-compatible", MYKO_AI_BASE_URL: "ftp://x", MYKO_AI_MODEL: "m" })).toBeNull()
    expect(readAiConfig({ MYKO_AI_ENABLED: "1", MYKO_AI_PROVIDER: "openai-compatible", MYKO_AI_BASE_URL: "http://localhost:11434/", MYKO_AI_MODEL: "llama3.2" })).toEqual(local)
    expect(readAiConfig({ MYKO_AI_PROVIDER: "openai-compatible", MYKO_AI_BASE_URL: "http://localhost:11434", MYKO_AI_MODEL: "llama3.2" })).toBeNull()
  })
})

describe("model request and reply filtering", () => {
  it("sends only the allow-listed context, a bounded question and the safety rules", () => {
    const messages = buildMessages(context, "x".repeat(900), Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? "assistant" as const : "user" as const, text: "y".repeat(900) })))
    expect(messages).toHaveLength(5)
    expect(messages.at(-1)?.content.length).toBeLessThan(context ? 20_000 : 0)
    expect(messages.at(-1)?.content).not.toMatch(/uuid|apikey|password|hash/i)
    expect(SYSTEM_PROMPT).toContain("nunca digas que encendiste")
    expect(SYSTEM_PROMPT).toContain("hipótesis")
  })

  it("parses a JSON reply and rejects anything else", () => {
    expect(parseModelReply('texto {"answer":"Hola","observations":["a"],"hypotheses":[],"missing":[]} fin')).toMatchObject({ answer: "Hola" })
    expect(parseModelReply("no json")).toBeNull()
    expect(parseModelReply('{"answer":""}')).toBeNull()
  })

  it.each([
    ["Encendí el humidificador para subir la humedad", "claims a physical action"],
    ["El CO2 está en 900 ppm", "invents a sensor reading"],
    ["Probablemente hay contaminación por trichoderma", "health diagnosis"],
  ])("blocks %s", (text, reason) => {
    expect(guardReply({ answer: text, observations: [], hypotheses: [], missing: [] })).toEqual({ ok: false, reason })
  })

  it("accepts a grounded answer that separates observation from hypothesis", () => {
    expect(guardReply({ answer: "La humedad está en 58 %.", observations: ["58 % a las 12:00"], hypotheses: ["pudo bajar por ventilación"], missing: ["etapa del cultivo"] })).toEqual({ ok: true })
  })
})

describe("answering policy", () => {
  const limiter = () => createLimiter(2, 60_000, () => 0)

  it("answers known questions with rules and never calls a model", async () => {
    const fetchImpl = vi.fn()
    const reply = await answerMessage({ ai, limiter: limiter(), fetchImpl: fetchImpl as unknown as typeof fetch }, "u1", "¿Cómo está mi cámara?", context)
    expect(reply.aiStatus).toBe("not_needed")
    expect(reply.answer.source).toBe("rules")
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("falls back to the rule-based help when no model is configured", async () => {
    const reply = await answerMessage({ ai: null, limiter: limiter() }, "u1", "explícame la fotosíntesis", context)
    expect(reply).toMatchObject({ aiStatus: "not_configured" })
    expect(reply.answer.source).toBe("rules")
    expect(reply.answer.understood).toBe(false)
  })

  it("uses the model only for free text, labels it, and sends the key only in the provider header", async () => {
    const fetchImpl = vi.fn(async () => modelBody({ answer: "Mido 24,6 °C y 58 %.", observations: ["24,6 °C a las 15:00"], hypotheses: [], missing: ["cultivo registrado"] }))
    const reply = await answerMessage({ ai, limiter: limiter(), fetchImpl: fetchImpl as unknown as typeof fetch }, "u1", "cuéntame algo interesante de mi cámara hoy", context)
    expect(reply.aiStatus).toBe("used")
    expect(reply.answer).toMatchObject({ source: "model" })
    expect(reply.answer.text).toContain("Me falta: cultivo registrado")
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://provider.test/v1/messages")
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(ai.apiKey)
    expect(String(init.body)).not.toContain(ai.apiKey)
  })

  it("talks to a local OpenAI-compatible server with no key and applies the same filters", async () => {
    const good = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ answer: "Mido 24,6 °C.", observations: [], hypotheses: [], missing: [] }) } }] }) }) as Response)
    const reply = await answerMessage({ ai: local, limiter: limiter(), fetchImpl: good as unknown as typeof fetch }, "u1", "cuéntame algo interesante de mi cámara hoy", context)
    expect(reply).toMatchObject({ aiStatus: "used", answer: { source: "model" } })
    const [url, init] = good.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("http://localhost:11434/v1/chat/completions")
    expect((init.headers as Record<string, string>).authorization).toBeUndefined()
    const bad = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ answer: "Ya encendí el ventilador.", observations: [], hypotheses: [], missing: [] }) } }] }) }) as Response)
    expect((await answerMessage({ ai: local, limiter: limiter(), fetchImpl: bad as unknown as typeof fetch }, "u2", "otro texto sin sentido para las reglas", context)).aiStatus).toBe("rejected")
  })

  it("discards a model reply that claims actions and answers with rules instead", async () => {
    const fetchImpl = vi.fn(async () => modelBody({ answer: "Ya apagué el calefactor.", observations: [], hypotheses: [], missing: [] }))
    const reply = await answerMessage({ ai, limiter: limiter(), fetchImpl: fetchImpl as unknown as typeof fetch }, "u1", "haz algo con la temperatura de mi cámara hoy", context)
    expect(reply.aiStatus).toBe("rejected")
    expect(reply.answer.source).toBe("rules")
    expect(reply.answer.text).not.toContain("apagué")
  })

  it("survives provider failures and enforces the rate limit", async () => {
    const failing = vi.fn(async () => ({ ok: false, status: 500 }) as Response)
    const shared = limiter()
    const deps = { ai, limiter: shared, fetchImpl: failing as unknown as typeof fetch }
    expect((await answerMessage(deps, "u1", "texto raro número uno", context)).aiStatus).toBe("error")
    expect((await answerMessage(deps, "u1", "texto raro número dos", context)).aiStatus).toBe("error")
    expect((await answerMessage(deps, "u1", "texto raro número tres", context)).aiStatus).toBe("limited")
    expect(failing).toHaveBeenCalledTimes(2)
    expect((await answerMessage(deps, "u2", "texto raro número uno", context)).aiStatus).toBe("error")
  })
})
