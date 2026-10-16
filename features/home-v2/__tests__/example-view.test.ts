import { afterEach, describe, expect, it, vi } from "vitest"

import { drawSpecimen, FUNGI, layoutSpecimens, PLANTS, type Specimen, type SpecimenKind } from "../components/ui/glyph-specimens"
import { DEVICE_SEEN_STORAGE_KEY, getDeviceSeenSnapshot, isLiveDeviceSample, markDeviceSeen, subscribeDeviceSeen } from "../data/device-seen"
import { DEMO_OFF, effectiveDemo, parseDemoState, serializeDemoState, setDemoState, getDemoSnapshot, resetDemoStoreForTests, DEMO_STORAGE_KEY } from "../data/demo-mode"

const ON = { enabled: true, scenario: "stable" } as const
const PINNED = { enabled: true, scenario: "stable", pinned: true } as const

describe("example view follows the device connection", () => {
  it("shows the example while no device has reported, and the person's data once one has", () => {
    expect(effectiveDemo(ON, false)).toBe(ON)
    expect(effectiveDemo(ON, true)).toBe(DEMO_OFF)
  })

  it("keeps the example when it was pinned by hand, or switched off, whatever the device does", () => {
    expect(effectiveDemo(PINNED, true)).toBe(PINNED)
    expect(effectiveDemo(DEMO_OFF, false)).toBe(DEMO_OFF)
    expect(effectiveDemo(DEMO_OFF, true)).toBe(DEMO_OFF)
  })

  it("stores the pin, and an unpinned choice serialises exactly as before", () => {
    expect(serializeDemoState(ON)).toBe('{"enabled":true,"scenario":"stable"}')
    expect(parseDemoState(serializeDemoState(PINNED), false)).toEqual(PINNED)
    expect(parseDemoState('{"enabled":true,"scenario":"dry","pinned":"yes"}', false)).toEqual({ enabled: true, scenario: "dry" })
    expect(parseDemoState('{"enabled":false,"pinned":true}', true)).toEqual(DEMO_OFF)
  })

  it("persists the pin through the store", () => {
    resetDemoStoreForTests()
    localStorage.removeItem(DEMO_STORAGE_KEY)
    setDemoState(PINNED)
    expect(getDemoSnapshot()).toEqual(PINNED)
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBe('{"enabled":true,"scenario":"stable","pinned":true}')
    setDemoState(ON) // same scenario but no longer pinned is a real change
    expect(getDemoSnapshot()).toEqual(ON)
    resetDemoStoreForTests()
  })
})

describe("what counts as a connected device", () => {
  const fresh = { source: "live", stale: false, temp: 22.4, hum: 68 }

  it("accepts a fresh sample from a real device", () => {
    expect(isLiveDeviceSample(fresh)).toBe(true)
    expect(isLiveDeviceSample({ ...fresh, temp: 0 })).toBe(true) // humidity alone is still a reading
  })

  it("rejects the server simulator, stale samples, empty samples and junk", () => {
    expect(isLiveDeviceSample({ ...fresh, source: "simulated" })).toBe(false)
    expect(isLiveDeviceSample({ ...fresh, source: "none" })).toBe(false)
    expect(isLiveDeviceSample({ ...fresh, stale: true })).toBe(false)
    expect(isLiveDeviceSample({ ...fresh, temp: 0, hum: 0 })).toBe(false)
    expect(isLiveDeviceSample({ ...fresh, temp: "22", hum: null })).toBe(false)
    expect(isLiveDeviceSample({ ...fresh, temp: Number.NaN })).toBe(false)
    for (const junk of [null, undefined, 3, "live", []]) expect(isLiveDeviceSample(junk)).toBe(false)
  })

  it("remembers the first device once, notifies once and survives a reload", () => {
    localStorage.removeItem(DEVICE_SEEN_STORAGE_KEY)
    let notified = 0
    const stop = subscribeDeviceSeen(() => { notified += 1 })
    markDeviceSeen()
    markDeviceSeen()
    expect(getDeviceSeenSnapshot()).toBe(true)
    expect(notified).toBe(1)
    expect(localStorage.getItem(DEVICE_SEEN_STORAGE_KEY)).toBe("1")
    stop()
  })
})

/** Records every call and property write: enough to run the drawing code without a real canvas. */
function stubContext() {
  const calls: string[] = []
  const props: Record<string, unknown> = {}
  const ctx = new Proxy(props, {
    get: (target, key: string) => (key in target ? target[key] : (...args: unknown[]) => void calls.push(`${key}(${args.length})`)),
    set: (target, key: string, value) => {
      target[key] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls, props }
}

describe("glyph background", () => {
  const ALL: SpecimenKind[] = [...FUNGI, ...PLANTS]

  it("lays out specimens inside the screen with fungi and plants of every kind, deterministically", () => {
    for (const [w, h] of [[375, 812], [768, 1024], [1440, 900]] as const) {
      const specimens = layoutSpecimens(w, h)
      expect(specimens.length).toBeGreaterThanOrEqual(8)
      expect(specimens.length).toBeLessThanOrEqual(40)
      for (const s of specimens) {
        expect(s.x).toBeGreaterThanOrEqual(0)
        expect(s.x).toBeLessThanOrEqual(w)
        expect(s.y).toBeGreaterThan(0)
        expect(s.y).toBeLessThanOrEqual(h * 1.05)
        expect(s.size).toBeGreaterThan(60)
        expect(s.offset).toBeGreaterThanOrEqual(0)
        expect(s.offset).toBeLessThan(1)
      }
      expect(layoutSpecimens(w, h)).toEqual(specimens)
    }
    const wide = layoutSpecimens(1440, 900)
    expect(wide.every((s) => s.x < 440 || s.x > 1000)).toBe(true) // gutters, not the app column
  })

  it("draws every kind at every phase of its life without throwing, and always draws something once grown", () => {
    for (const kind of ALL) {
      for (let t = 0; t < 1; t += 0.05) {
        const { ctx, calls } = stubContext()
        const specimen: Specimen = { kind, x: 100, y: 200, size: 190, period: 100, offset: 0, seed: 321 }
        expect(() => drawSpecimen(ctx, specimen, t * 100 + 0.01)).not.toThrow()
        if (t > 0.45 && t < 0.85) expect(calls.some((c) => c.startsWith("stroke") || c.startsWith("fill") || c.startsWith("arc"))).toBe(true)
      }
    }
  })

  it("each new life shows a different kind, and visits fungi and plants alike", () => {
    const shown = new Set<string>()
    for (let life = 0; life < ALL.length; life++) {
      const { ctx, calls } = stubContext()
      drawSpecimen(ctx, { kind: "button", x: 0, y: 0, size: 190, period: 100, offset: 0, seed: 7 }, life * 100 + 62)
      shown.add(calls.join("|"))
    }
    expect(shown.size).toBeGreaterThanOrEqual(ALL.length - 3)
  })

  it("is a function of time only: no randomness while drawing", () => {
    const spy = vi.spyOn(Math, "random")
    const { ctx } = stubContext()
    for (const kind of ALL) drawSpecimen(ctx, { kind, x: 0, y: 0, size: 150, period: 80, offset: 0.3, seed: 5 }, 40)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
