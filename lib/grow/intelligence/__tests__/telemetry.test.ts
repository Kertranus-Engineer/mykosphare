import { describe, expect, it } from "vitest"
import { analyzeTelemetry, type ReadingPoint } from "../index"

const now = new Date("2026-10-27T15:00:00Z")
const hourOf = (ms: number) => new Date(ms).getUTCHours()
const step = 5 * 60_000
function series(hours: number, fn: (t: number, hoursAgo: number) => [number | null, number | null]): ReadingPoint[] {
  const out: ReadingPoint[] = []
  for (let t = now.getTime() - hours * 3_600_000; t <= now.getTime(); t += step) {
    const [temperature, humidity] = fn(t, (now.getTime() - t) / 3_600_000)
    out.push({ observedAt: new Date(t).toISOString(), temperature, humidity })
  }
  return out
}

describe("telemetry analysis (no crop, no model)", () => {
  it("reports a rising temperature with its rate, and a flat humidity as nothing to say", () => {
    const r = analyzeTelemetry(series(2, (_t, ago) => [22 + (2 - ago) * 1.0, 65]), now, { hourOf })
    expect(r.trend.temperature?.direction).toBe("up")
    expect(r.trend.temperature?.perHour).toBeCloseTo(1, 1)
    expect(r.trend.humidity?.direction).toBe("flat")
    expect(r.insights.find(i => i.id === "trend:temperature")?.text).toMatch(/sube unos 1,0 °C por hora/)
    expect(r.insights.some(i => i.id === "trend:humidity")).toBe(false)
  })

  it("does not invent a trend without enough evidence", () => {
    expect(analyzeTelemetry(series(0.25, () => [22, 65]), now, { hourOf }).trend.temperature).toBeNull()
    expect(analyzeTelemetry([], now).trend.humidity).toBeNull()
  })

  it("measures coverage and flags signal cuts", () => {
    const full = analyzeTelemetry(series(6, () => [22, 65]), now, { hourOf })
    expect(full.coverage.pct).toBe(100)
    const cut = series(6, () => [22, 65]).filter(r => { const t = Date.parse(r.observedAt); return t < now.getTime() - 3 * 3_600_000 || t > now.getTime() - 2 * 3_600_000 })
    const r = analyzeTelemetry(cut, now, { hourOf })
    expect(r.coverage.pct).toBeLessThan(90)
    expect(r.insights.some(i => i.id === "coverage")).toBe(true)
  })

  it("separates stable from variable using the 24 h spread, and says unknown with little history", () => {
    expect(analyzeTelemetry(series(24, () => [22, 65]), now, { hourOf }).stability).toEqual({ temperature: "stable", humidity: "stable" })
    const swing = analyzeTelemetry(series(24, (_t, ago) => [22 + (ago % 6 < 3 ? 0 : 5), 65]), now, { hourOf })
    expect(swing.stability.temperature).toBe("variable")
    expect(swing.insights.find(i => i.id === "variable:temperature")?.text).toContain("22,0 °C a 27,0 °C")
    expect(analyzeTelemetry(series(1, () => [22, 65]), now, { hourOf }).stability.temperature).toBe("unknown")
  })

  it("compares day and night only when both have enough data and the difference matters", () => {
    const r = analyzeTelemetry(series(24, (t) => { const h = new Date(t).getUTCHours(); return [h >= 22 || h < 7 ? 20 : 25, 65] }), now, { hourOf })
    expect(r.dayNight.temperature?.day).toBeCloseTo(25)
    expect(r.insights.find(i => i.id === "daynight:temperature")?.text).toContain("mayor de día")
    expect(r.dayNight.humidity && r.insights.some(i => i.id === "daynight:humidity")).toBeFalsy()
  })

  it("ignores impossible readings instead of averaging them", () => {
    const r = analyzeTelemetry(series(2, (_t, ago) => [ago < 0.2 ? 300 : 22, 65]), now, { hourOf })
    expect(r.range24h.temperature?.max).toBe(22)
  })
})
