import { describe, expect, it } from "vitest"
import { createSampleOysterRun, SAMPLE_PLEUROTUS_OSTREATUS_PROFILE } from "../../fixtures"
import { createSampleSimulationReading } from "../../simulation"
import { buildGrowSnapshot } from "../../snapshot"
import type { GrowTimelineEvent } from "../../timeline"
import type { MykoMood } from "../../types"
import { MYKO_ACTIVITY_DURATION, momentsFromEvents, presentMoment, resolveMykoActivity } from ".."

const base = { mood: "content" as MykoMood, previousMood: null, signalChanged: false, touched: false }

describe("MYKO activity (presentation only)", () => {
  it("idle by default; sensing only when a reading with a new timestamp arrived", () => {
    expect(resolveMykoActivity(base)).toBe("idle")
    expect(resolveMykoActivity({ ...base, signalChanged: true })).toBe("sensing")
  })

  it("offline is not an activity: uncertain mood is always waiting (no sensing, no recovery)", () => {
    expect(resolveMykoActivity({ ...base, mood: "uncertain", signalChanged: true })).toBe("waiting")
    expect(resolveMykoActivity({ ...base, mood: "uncertain", previousMood: "distressed" })).toBe("waiting")
  })

  it("recovering is claimed only when the observed mood actually returned to content", () => {
    expect(resolveMykoActivity({ ...base, previousMood: "concerned" })).toBe("recovering")
    expect(resolveMykoActivity({ ...base, previousMood: "uncertain" })).toBe("recovering")
    expect(resolveMykoActivity({ ...base, previousMood: null })).toBe("idle")
    expect(resolveMykoActivity({ ...base, mood: "concerned", previousMood: "distressed" })).toBe("idle")
  })

  it("touch wins and is brief; waiting and idle are not one-shots", () => {
    expect(resolveMykoActivity({ ...base, mood: "uncertain", touched: true })).toBe("touched")
    expect(MYKO_ACTIVITY_DURATION.touched).toBeLessThan(2000)
    expect(MYKO_ACTIVITY_DURATION.idle).toBeNull()
    expect(MYKO_ACTIVITY_DURATION.waiting).toBeNull()
  })

  it("never mutates GrowState", () => {
    const now = new Date("2026-09-30T12:00:00.000Z")
    const snapshot = buildGrowSnapshot({
      run: createSampleOysterRun(),
      profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
      reading: createSampleSimulationReading({ scenario: "dry", now }),
      now,
    })
    const before = JSON.stringify(snapshot.state)
    Object.freeze(snapshot.state)
    resolveMykoActivity({ mood: snapshot.myko.mood, previousMood: "distressed", signalChanged: true, touched: true })
    expect(JSON.stringify(snapshot.state)).toBe(before)
  })
})

describe("memorable moments (real events only)", () => {
  const event = (kind: GrowTimelineEvent["kind"], at: string): GrowTimelineEvent => ({ id: `${kind}-${at}`, at, kind, origin: "real" })

  it("presents each moment with MYKO's voice and no rewards", () => {
    expect(presentMoment("stage_confirmed")).toMatchObject({ title: "Nueva etapa", voice: "Estoy cambiando.", icon: "event" })
    expect(presentMoment("cultivation_started").voice).toBe("Comenzamos.")
    expect(presentMoment("first_capture").voice).toBe("Ya puedo ver.")
    expect(presentMoment("environment_recovered").voice).toBe("El ambiente volvió a estabilizarse.")
    expect(presentMoment("harvest_confirmed").voice).toBe("Llegamos a cosecha.")
    expect(JSON.stringify(presentMoment("stage_confirmed"))).not.toMatch(/xp|level|nivel|coin|moneda|streak|racha/i)
  })

  it("derives moments only from recorded events; only the FIRST capture is a moment", () => {
    const moments = momentsFromEvents([
      event("capture_added", "2026-09-20T10:00:00Z"),
      event("cultivation_started", "2026-09-10T10:00:00Z"),
      event("capture_added", "2026-09-21T10:00:00Z"),
      event("metric_recovered", "2026-09-22T10:00:00Z"),
      event("metric_dropped", "2026-09-22T09:00:00Z"),
      event("stage_confirmed", "2026-09-23T10:00:00Z"),
    ]).map((m) => m.moment.kind)
    expect(moments).toEqual(["cultivation_started", "first_capture", "environment_recovered", "stage_confirmed"])
  })

  it("never invents a harvest or any moment without events", () => {
    expect(momentsFromEvents([])).toEqual([])
    expect(momentsFromEvents([event("reading_received", "2026-09-22T10:00:00Z")])).toEqual([])
  })
})
