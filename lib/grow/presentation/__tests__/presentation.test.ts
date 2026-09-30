import { describe, expect, it } from "vitest"
import {
  buildGrowSnapshot,
  createSampleOysterRun,
  SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
  type EnvironmentalReading,
  type GrowthStage,
} from "@/lib/grow"
import {
  cultivationDay,
  GROW_COPY,
  presentMetric,
  presentNeeds,
  presentSenses,
  presentSource,
  presentStageJourney,
  presentStatus,
  presentTimeline,
  stageLabel,
} from "@/lib/grow/presentation"

const NOW = "2026-09-30T12:00:00.000Z"
const RUN = createSampleOysterRun()

function reading(overrides: Partial<EnvironmentalReading> = {}): EnvironmentalReading {
  return { temperature: 22, humidity: 68, timestamp: "2026-09-30T11:59:00.000Z", origin: "real", source: "test", deviceId: "d1", ...overrides }
}

function without(key: "temperature" | "humidity"): EnvironmentalReading {
  const rest: EnvironmentalReading = { ...reading() }
  delete rest[key]
  return rest
}

function snap(value: EnvironmentalReading | null) {
  return buildGrowSnapshot({ run: RUN, profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, reading: value, now: NOW })
}

describe("status presentation", () => {
  it("healthy → human calm copy", () => {
    const status = presentStatus(snap(reading()), NOW)
    expect(status).toMatchObject({ title: "Todo bien", body: "Tu cultivo se mantiene estable.", tone: "calm" })
  })

  it("simulated healthy keeps the normal message (provenance is shown elsewhere)", () => {
    const status = presentStatus(snap(reading({ origin: "simulated" })), NOW)
    expect(status.title).toBe(GROW_COPY.status.healthy.title)
  })

  it("attention states name the need", () => {
    expect(presentStatus(snap(reading({ humidity: 50 })), NOW)).toMatchObject({ title: "Necesita humedad", tone: "attention" })
    expect(presentStatus(snap(reading({ humidity: 82 })), NOW)).toMatchObject({ title: "Necesita ventilación", tone: "attention" })
    expect(presentStatus(snap(reading({ temperature: 18 })), NOW)).toMatchObject({ title: "Hace frío", tone: "attention" })
    expect(presentStatus(snap(reading({ temperature: 27 })), NOW)).toMatchObject({ title: "Hace calor", tone: "attention" })
  })

  it("critical names the critical condition", () => {
    const status = presentStatus(snap(reading({ humidity: 40 })), NOW)
    expect(status).toMatchObject({ title: "Necesita atención ahora", body: GROW_COPY.status.criticalHumidity, tone: "critical" })
  })

  it("unknown without readings, and partial data explains itself", () => {
    expect(presentStatus(snap(null), NOW)).toMatchObject({ title: GROW_COPY.status.unknown.title, tone: "unknown", lastReading: null })
    const partial = presentStatus(snap(without("humidity")), NOW)
    expect(partial).toMatchObject({ title: GROW_COPY.status.unknown.title, body: GROW_COPY.status.unknownPartial, tone: "unknown" })
  })

  it("stale and offline never look healthy and state the last reading", () => {
    const stale = presentStatus(snap(reading({ timestamp: "2026-09-30T11:50:00.000Z" })), NOW)
    expect(stale).toMatchObject({ title: GROW_COPY.status.stale.title, tone: "unknown" })
    expect(stale.body).toContain("hace 10 minutos")

    const offline = presentStatus(snap(reading({ timestamp: "2026-09-30T10:00:00.000Z" })), NOW)
    expect(offline).toMatchObject({ title: GROW_COPY.status.offline.title, body: "Última lectura hace 2 horas.", tone: "unknown" })
    expect(offline.title).not.toBe(GROW_COPY.status.healthy.title)
  })
})

describe("metric presentation", () => {
  it("missing temperature or humidity shows the placeholder, never a number", () => {
    const [temperature] = presentSenses(snap(without("temperature")))
    expect(temperature).toMatchObject({ value: "--", missing: true, conditionLabel: "Sin lectura", tone: "unknown" })
    const [, humidity] = presentSenses(snap(without("humidity")))
    expect(humidity).toMatchObject({ value: "--", missing: true })
  })

  it("formats live values with the domain condition", () => {
    const [temperature, humidity] = presentSenses(snap(reading({ temperature: 22.44, humidity: 50 })))
    expect(temperature).toMatchObject({ value: "22.4°", conditionLabel: "En rango", tone: "calm" })
    expect(humidity).toMatchObject({ value: "50%", conditionLabel: "Baja", tone: "attention", rangeLabel: "Rango 60% – 75%" })
  })

  it("non-live values are last-known, not 'En rango'", () => {
    const offline = snap(reading({ timestamp: "2026-09-30T10:00:00.000Z" }))
    const metric = presentMetric("temperature", offline.state.conditions.temperature, offline.state.freshness)
    expect(metric).toMatchObject({ lastKnown: true, conditionLabel: GROW_COPY.metrics.lastKnown, tone: "unknown" })
  })
})

describe("source presentation", () => {
  it("real mode with real readings is REAL", () => {
    expect(presentSource("real", "real").kind).toBe("real")
    expect(presentSource("real", null).kind).toBe("real")
  })

  it("simulated readings or simulation mode are always SIMULATION", () => {
    expect(presentSource("real", "simulated")).toMatchObject({ kind: "simulated", label: "Simulación" })
    expect(presentSource("simulation", null).kind).toBe("simulated")
    // Defensive: simulation mode can never render REAL, whatever a snapshot claims.
    expect(presentSource("simulation", "real").kind).toBe("simulated")
  })
})

describe("stage presentation", () => {
  it("labels every stage in Spanish", () => {
    const labels: Record<GrowthStage, string> = {
      inoculation: "Inoculación",
      colonization: "Colonización",
      consolidation: "Consolidación",
      primordia: "Primordios",
      fruiting: "Fructificación",
      harvest: "Cosecha",
    }
    for (const [stage, label] of Object.entries(labels)) expect(stageLabel(stage as GrowthStage)).toBe(label)
  })

  it("keeps confirmed as current and shows a suggestion only as a possibility", () => {
    const journey = presentStageJourney("colonization", "consolidation")
    expect(journey.current.label).toBe("Colonización")
    expect(journey.steps.find((step) => step.status === "current")?.stage).toBe("colonization")
    expect(journey.steps.filter((step) => step.suggested).map((step) => step.stage)).toEqual(["consolidation"])
    expect(journey.possibleChange?.label).toBe("Consolidación")
    expect(journey.steps.find((step) => step.stage === "consolidation")?.status).toBe("upcoming")
  })

  it("has no possible change when suggestion equals or is missing", () => {
    expect(presentStageJourney("fruiting", "fruiting").possibleChange).toBeNull()
    expect(presentStageJourney("fruiting", null).possibleChange).toBeNull()
  })
})

describe("cultivation day", () => {
  it("counts the first 24 hours as Día 1", () => {
    expect(cultivationDay("2026-09-20T12:00:00.000Z", "2026-09-20T12:00:00.000Z")).toBe(1)
    expect(cultivationDay("2026-09-20T12:00:00.000Z", "2026-09-21T11:59:59.000Z")).toBe(1)
    expect(cultivationDay("2026-09-20T12:00:00.000Z", "2026-09-21T12:00:00.000Z")).toBe(2)
    expect(cultivationDay(RUN.startedAt, NOW)).toBe(11)
  })

  it("returns null for future or invalid starts", () => {
    expect(cultivationDay("2026-10-01T00:00:00.000Z", NOW)).toBeNull()
    expect(cultivationDay("not-a-date", NOW)).toBeNull()
  })
})

describe("needs and timeline presentation", () => {
  it("presents domain needs without deriving new ones", () => {
    const cold = snap(reading({ temperature: 18 }))
    expect(presentNeeds(cold.state).map((need) => need.title)).toEqual(["Temperatura"])
    expect(presentNeeds(cold.state)[0].body).toBe(GROW_COPY.needs.temperatureLow.body)
    expect(presentNeeds(snap(reading()).state)).toEqual([])
  })

  it("orders events newest first and flags simulated ones", () => {
    const items = presentTimeline([
      { id: "a", at: "2026-09-30T08:00:00.000Z", kind: "condition_stable", origin: "simulated" },
      { id: "b", at: "2026-09-30T11:00:00.000Z", kind: "metric_dropped", metric: "humidity", origin: "real" },
    ])
    expect(items.map((item) => item.id)).toEqual(["b", "a"])
    expect(items[0]).toMatchObject({ title: "La humedad bajó", simulated: false })
    expect(items[1].simulated).toBe(true)
  })
})
