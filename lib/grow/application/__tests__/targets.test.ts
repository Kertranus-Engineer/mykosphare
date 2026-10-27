import { describe, expect, it } from "vitest"
import { customMetadata, parseTargets, withOwnerStageTargets } from "../targets"

describe("owner targets", () => {
  it("accepts sensible ranges and rounds them", () => {
    expect(parseTargets({ temperature: { min: 20.04, max: 24 }, humidity: { min: 80, max: 95 } })).toEqual({ ok: true, value: { temperature: { min: 20, max: 24 }, humidity: { min: 80, max: 95 } } })
  })

  it.each([
    ["missing metric", { temperature: { min: 20, max: 24 } }],
    ["not numbers", { temperature: { min: "20", max: 24 }, humidity: { min: 60, max: 75 } }],
    ["inverted", { temperature: { min: 24, max: 20 }, humidity: { min: 60, max: 75 } }],
    ["too narrow", { temperature: { min: 22, max: 23 }, humidity: { min: 60, max: 75 } }],
    ["impossible humidity", { temperature: { min: 20, max: 24 }, humidity: { min: 60, max: 120 } }],
    ["impossible temperature", { temperature: { min: -10, max: 24 }, humidity: { min: 60, max: 75 } }],
    ["non finite", { temperature: { min: Number.NaN, max: 24 }, humidity: { min: 60, max: 75 } }],
  ])("rejects %s", (_label, body) => expect(parseTargets(body as Record<string, unknown>).ok).toBe(false))

  it("changes only the confirmed stage and drops critical limits instead of inventing them", () => {
    const base = { fruiting: { temperature: { min: 20, max: 24, criticalMin: 16 }, humidity: { min: 60, max: 75 } }, colonization: { temperature: { min: 1, max: 9 } } }
    const out = withOwnerStageTargets(base, "fruiting", { temperature: { min: 18, max: 22 }, humidity: { min: 85, max: 95 } }) as Record<string, Record<string, unknown>>
    expect(out.fruiting).toEqual({ temperature: { min: 18, max: 22 }, humidity: { min: 85, max: 95 } })
    expect(out.colonization).toEqual(base.colonization)
    expect(base.fruiting.temperature.criticalMin).toBe(16)
  })

  it("flags the profile as the owner's and confirmed", () => {
    expect(customMetadata("owner-1", "profile-1", "2026-10-27T12:00:00Z")).toEqual({ custom: true, owner_id: "owner-1", based_on: "profile-1", confirmed_by_owner: true, confirmed_at: "2026-10-27T12:00:00Z" })
  })
})
