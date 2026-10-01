import { describe, expect, it } from "vitest"
import { buildDemoGrowComposition, GROW_DEMO_SCENARIOS } from "../simulation-demo"

const NOW = new Date("2026-09-30T12:00:00.000Z")
const build = (scenario: (typeof GROW_DEMO_SCENARIOS)[number], stage: Parameters<typeof buildDemoGrowComposition>[0]["stage"] = null) =>
  buildDemoGrowComposition({ scenario, stage, now: NOW })

describe("simulation demo composition", () => {
  it("never produces real provenance", () => {
    for (const scenario of GROW_DEMO_SCENARIOS) {
      const { snapshot, timeline } = build(scenario)
      expect(snapshot.state.origin === null || snapshot.state.origin === "simulated").toBe(true)
      expect(snapshot.reading?.origin ?? "simulated").toBe("simulated")
      expect(timeline.every((event) => event.origin === "simulated")).toBe(true)
    }
  })

  it("covers health and freshness states through the Foundation domain", () => {
    expect(build("stable").snapshot.state.health).toBe("healthy")
    expect(build("dry").snapshot.state).toMatchObject({ health: "attention", needs: [{ kind: "humidity" }] })
    expect(build("critical").snapshot.state.health).toBe("critical")
    expect(build("partial").snapshot.state).toMatchObject({ dataStatus: "partial", health: "unknown" })
    expect(build("partial").snapshot.reading).not.toHaveProperty("humidity")
    expect(build("stale").snapshot.state.freshness).toBe("stale")
    expect(build("offline").snapshot.state.freshness).toBe("offline")
    expect(build("no-data").snapshot).toMatchObject({ reading: null, state: { freshness: "unknown", health: "unknown" } })
  })

  it("default run shows a suggestion that differs from the confirmed stage", () => {
    const { snapshot } = build("stable")
    expect(snapshot.state.confirmedStage).toBe("colonization")
    expect(snapshot.state.suggestedStage).toBe("consolidation")
  })

  it("an explicit stage aligns the demo run so the suggestion matches", () => {
    const { snapshot } = build("stable", "fruiting")
    expect(snapshot.state).toMatchObject({ confirmedStage: "fruiting", suggestedStage: "fruiting" })
    expect(snapshot.myko.form).toBe("mature")
  })

  it("timeline fixtures never claim actuator actions", () => {
    const allowed = new Set(["cultivation_started", "stage_confirmed", "condition_stable", "metric_dropped", "metric_rose", "metric_recovered", "metric_missing", "reading_received", "signal_lost"])
    for (const scenario of GROW_DEMO_SCENARIOS) {
      for (const event of build(scenario).timeline) expect(allowed.has(event.kind)).toBe(true)
    }
  })
})
