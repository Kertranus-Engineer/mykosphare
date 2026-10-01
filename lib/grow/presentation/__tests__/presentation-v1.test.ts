import { describe, expect, it } from "vitest"
import {
  buildGrowSnapshot,
  createSampleOysterRun,
  SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
  type EnvironmentalReading,
} from "@/lib/grow"
import {
  eventsOfDay,
  GROW_SENSE_REGISTRY,
  presentDevelopment,
  presentHistory,
  presentLastLook,
  presentMoment,
  presentNeedCue,
  presentNeeds,
  presentSenseCapabilities,
  presentStageJourney,
  presentStatus,
} from "@/lib/grow/presentation"
import { runMilestoneEvents, type GrowTimelineEvent } from "@/lib/grow/timeline"

const NOW = "2026-09-30T12:00:00.000Z"
const RUN = createSampleOysterRun()

function reading(overrides: Partial<EnvironmentalReading> = {}): EnvironmentalReading {
  return { temperature: 22, humidity: 68, timestamp: "2026-09-30T11:59:00.000Z", origin: "real", source: "test", deviceId: "d1", ...overrides }
}

const snap = (value: EnvironmentalReading | null) =>
  buildGrowSnapshot({ run: RUN, profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, reading: value, now: NOW })

describe("senses as hardware capabilities", () => {
  it("installed senses report connection and value", () => {
    const senses = presentSenseCapabilities(snap(reading({ humidity: 50 })))
    const temperature = senses.find((sense) => sense.key === "temperature")!
    const humidity = senses.find((sense) => sense.key === "humidity")!
    expect(temperature).toMatchObject({ state: "connected", stateLabel: "Conectado", value: "22.0°", mode: "feel" })
    expect(humidity).toMatchObject({ state: "connected", value: "50%", conditionLabel: "Baja", tone: "attention", domain: "water" })
  })

  it("never presents a CO₂ (or any uninstalled) reading — only the missing capability", () => {
    const senses = presentSenseCapabilities(snap(reading()))
    for (const key of ["co2", "vision", "mass"] as const) {
      const sense = senses.find((item) => item.key === key)!
      expect(sense.state).toBe("not_installed")
      expect(sense.value).toBeNull()
      expect(sense.conditionLabel).toBeNull()
      expect(sense.future).toBeTruthy()
    }
    expect(senses.find((sense) => sense.key === "co2")!.stateLabel).toBe("Sin sensor")
    expect(senses.find((sense) => sense.key === "vision")!).toMatchObject({ mode: "see", stateLabel: "No disponible" })
  })

  it("the registry declares only temperature and humidity as installed today", () => {
    expect(GROW_SENSE_REGISTRY.filter((sense) => sense.installed).map((sense) => sense.key)).toEqual(["temperature", "humidity"])
  })

  it("offline, missing and absent readings are honest states without fresh values", () => {
    const offline = presentSenseCapabilities(snap(reading({ timestamp: "2026-09-30T10:00:00.000Z" })))
    expect(offline.find((sense) => sense.key === "temperature")).toMatchObject({ state: "no_signal", tone: "unknown" })
    const { humidity: _h, ...partialReading } = reading()
    void _h
    const partial = presentSenseCapabilities(snap(partialReading as EnvironmentalReading))
    expect(partial.find((sense) => sense.key === "humidity")).toMatchObject({ state: "no_reading", value: null })
    const none = presentSenseCapabilities(snap(null))
    expect(none.find((sense) => sense.key === "temperature")).toMatchObject({ state: "waiting", value: null })
  })
})

describe("needs, cues and honest detection time", () => {
  const dry = snap(reading({ humidity: 50 }))

  it("the cue carries the need's semantic icon and domain", () => {
    expect(presentNeedCue(dry.state)).toEqual({ icon: "humidity", domain: "water", tone: "attention" })
    expect(presentNeedCue(snap(reading()).state)).toBeNull()
    expect(presentNeedCue(snap(reading({ timestamp: "2026-09-30T10:00:00.000Z" })).state)).toMatchObject({ icon: "signal-off", tone: "unknown" })
  })

  it("'Detectado hace' appears only when a recorded event proves it", () => {
    expect(presentNeeds(dry.state, [], NOW)[0].detected).toBeNull()
    const events: GrowTimelineEvent[] = [{ id: "e1", at: "2026-09-30T11:42:00.000Z", kind: "metric_dropped", metric: "humidity", origin: "simulated" }]
    expect(presentNeeds(dry.state, events, NOW)[0].detected).toBe("Detectado hace 18 minutos")
  })

  it("a later recovery invalidates an older drop", () => {
    const events: GrowTimelineEvent[] = [
      { id: "e1", at: "2026-09-30T10:00:00.000Z", kind: "metric_dropped", metric: "humidity", origin: "real" },
      { id: "e2", at: "2026-09-30T10:30:00.000Z", kind: "metric_recovered", metric: "humidity", origin: "real" },
    ]
    expect(presentNeeds(dry.state, events, NOW)[0].detected).toBeNull()
  })
})

describe("stage journey, development and history", () => {
  it("exposes a discrete position, never a percentage", () => {
    expect(presentStageJourney("colonization", "consolidation").current.position).toBe("Etapa 2 de 6")
  })

  it("development follows the confirmed stage via form, with no XP or level", () => {
    const development = presentDevelopment(snap(reading()), NOW)
    expect(development.forms.map((entry) => entry.status)).toEqual(["current", "future", "future", "future"])
    expect(development).toMatchObject({ currentFormName: "Espora", stage: "Colonización", day: 11 })
    expect(Object.keys(development)).not.toContain("xp")
    expect(Object.keys(development)).not.toContain("level")
  })

  it("history shows only stats whose data exists", () => {
    const snapshot = snap(reading())
    expect(presentHistory(snapshot, [], NOW).stats.map((stat) => stat.key)).toEqual(["days"])
    const events = runMilestoneEvents(snapshot.run, "simulated")
    const history = presentHistory(snapshot, events, NOW, 0)
    expect(history.stats.map((stat) => stat.key)).toEqual(["days", "events"])
    expect(history.includesSimulated).toBe(true)
  })
})

describe("timeline milestones and today", () => {
  it("derives milestones only from run facts", () => {
    const events = runMilestoneEvents(RUN, "real")
    expect(events.map((event) => event.kind)).toEqual(["cultivation_started", "stage_confirmed"])
    expect(events[1]).toMatchObject({ stage: "colonization", origin: "real" })
    expect(runMilestoneEvents({ ...RUN, stageConfirmedAt: undefined }, "real")).toHaveLength(1)
    expect(runMilestoneEvents({ ...RUN, startedAt: "bad", stageConfirmedAt: undefined }, "real")).toHaveLength(0)
  })

  it("keeps only events of the same local day and not in the future", () => {
    const now = new Date(2026, 8, 30, 15, 0, 0)
    const at = (d: number, h: number) => new Date(2026, 8, d, h, 0, 0).toISOString()
    const events = [{ at: at(30, 9) }, { at: at(29, 23) }, { at: at(30, 16) }]
    expect(eventsOfDay(events, now)).toEqual([{ at: at(30, 9) }])
  })
})

describe("last look (vision) and moments", () => {
  it("shows an honest empty state without a capture", () => {
    expect(presentLastLook(null)).toEqual({ kind: "empty", title: "Última mirada", body: "No hay observaciones visuales todavía." })
    expect(presentLastLook({ id: "c", at: NOW, imageUrl: "", origin: "real" }).kind).toBe("empty")
  })

  it("labels simulated captures", () => {
    const look = presentLastLook({ id: "c", at: NOW, imageUrl: "/x.jpg", origin: "simulated" })
    expect(look).toMatchObject({ kind: "capture", simulatedLabel: "Imagen simulada" })
  })

  it("moments are a reserved vocabulary with semantic icons", () => {
    expect(presentMoment("stage_confirmed")).toMatchObject({ title: "Nueva etapa", icon: "event", domain: "myko" })
  })
})

describe("offline and unknown status copy", () => {
  it("offline never reads as healthy and speaks in MYKO's voice", () => {
    const status = presentStatus(snap(reading({ timestamp: "2026-09-30T10:00:00.000Z" })), NOW)
    expect(status).toMatchObject({ title: "No puedo sentir el ambiente", tone: "unknown" })
  })

  it("no data is explicit", () => {
    expect(presentStatus(snap(null), NOW)).toMatchObject({ title: "Aún sin datos", tone: "unknown" })
  })
})
