import { evaluateGrowState } from "./evaluate"
import { toMykoViewModel } from "./myko"
import type { EvaluateGrowStateInput, GrowSnapshot } from "./types"

/** Application composition boundary: infrastructure supplies input; UI receives one coherent snapshot. */
export function buildGrowSnapshot(input: EvaluateGrowStateInput): GrowSnapshot {
  const state = evaluateGrowState(input)
  return {
    run: input.run,
    profile: input.profile,
    reading: input.reading,
    state,
    myko: toMykoViewModel(state, input.profile),
  }
}
