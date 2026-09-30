import { isGrowDemoScenario, type GrowDemoScenario } from "@/lib/grow/demo/simulation-demo"
import { GROW_STAGE_ORDER } from "@/lib/grow/presentation"
import { GROW_COPY } from "@/lib/grow/presentation/copy.es"
import type { GrowthStage } from "@/lib/grow/types"

/**
 * What the URL asks Grower Mode to show. Query params only select a view; they
 * can never write or modify real data. Simulation is opt-in via mode=simulation.
 */
export type GrowRequest =
  | { kind: "simulation"; scenario: GrowDemoScenario; stage: GrowthStage | null; notices: string[] }
  | { kind: "real"; chamberId: string }
  | { kind: "unconfigured" }
  | { kind: "invalid" }

export interface QueryReader {
  get(name: string): string | null
}

const CHAMBER_ID = /^[A-Za-z0-9_-]{1,64}$/

function isStage(value: string): value is GrowthStage {
  return (GROW_STAGE_ORDER as readonly string[]).includes(value)
}

export function parseGrowRequest(query: QueryReader): GrowRequest {
  const mode = query.get("mode")
  const chamber = query.get("chamber")

  if (mode === "simulation") {
    const notices: string[] = []
    const rawScenario = query.get("scenario")
    let scenario: GrowDemoScenario = "stable"
    if (rawScenario !== null) {
      if (isGrowDemoScenario(rawScenario)) scenario = rawScenario
      else notices.push(GROW_COPY.views.unknownScenario(rawScenario.slice(0, 32)))
    }
    const rawStage = query.get("stage")
    let stage: GrowthStage | null = null
    if (rawStage !== null) {
      if (isStage(rawStage)) stage = rawStage
      else notices.push(GROW_COPY.views.unknownStage(rawStage.slice(0, 32)))
    }
    return { kind: "simulation", scenario, stage, notices }
  }

  if (mode !== null && mode !== "real") return { kind: "invalid" }
  if (chamber === null) return { kind: "unconfigured" }
  return CHAMBER_ID.test(chamber) ? { kind: "real", chamberId: chamber } : { kind: "invalid" }
}

/** Canonical query to carry the same view across Grower routes (drops unknown params). */
export function growQueryString(request: GrowRequest): string {
  const params = new URLSearchParams()
  if (request.kind === "simulation") {
    params.set("mode", "simulation")
    params.set("scenario", request.scenario)
    if (request.stage) params.set("stage", request.stage)
  } else if (request.kind === "real") {
    params.set("chamber", request.chamberId)
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function growHref(path: string, request: GrowRequest): string {
  return `${path}${growQueryString(request)}`
}
