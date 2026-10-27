import { respondWithRules, type AssistantAnswer, type AssistantContext } from "../intelligence"
import { askModel, type AiConfig, type Turn } from "./model"

/** Small in-memory sliding window per user. Per instance by design: a cost guard, not a security boundary. */
export function createLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>()
  return {
    take(key: string): boolean {
      const t = now()
      const recent = (hits.get(key) ?? []).filter(x => t - x < windowMs)
      if (recent.length >= max) { hits.set(key, recent); return false }
      recent.push(t)
      hits.set(key, recent)
      return true
    },
  }
}

export type AiStatus = "not_configured" | "not_needed" | "used" | "rejected" | "error" | "limited"
export interface AssistantReply { answer: AssistantAnswer; aiStatus: AiStatus }

export interface AssistantDeps {
  ai: AiConfig | null
  limiter: { take(key: string): boolean }
  fetchImpl?: typeof fetch
}

/**
 * Rules first, always: they are free, deterministic and grounded. A model is consulted ONLY for free text the rules
 * could not place, only when one is configured, and only inside the rate limit. If anything about the model path
 * fails or is filtered, the person gets the rule-based answer. The reply says which one produced the words.
 */
export async function answerMessage(
  deps: AssistantDeps, userKey: string, message: string, context: AssistantContext, turns: readonly Turn[] = [],
): Promise<AssistantReply> {
  const rules = respondWithRules(message, context)
  if (rules.understood) return { answer: rules, aiStatus: "not_needed" }
  if (!deps.ai) return { answer: rules, aiStatus: "not_configured" }
  if (!deps.limiter.take(userKey)) return { answer: rules, aiStatus: "limited" }
  const outcome = await askModel(deps.ai, context, message, turns, deps.fetchImpl)
  if (outcome.status === "ok") return { answer: outcome.answer, aiStatus: "used" }
  return { answer: rules, aiStatus: outcome.status }
}
