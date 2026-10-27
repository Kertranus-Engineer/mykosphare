import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { describeControl } from "@/lib/grow/control/status"
import type { DesiredConfig, HomeControl, ReportedState } from "@/lib/grow/control/types"

const NOW = Date.parse("2026-10-28T15:00:00Z")
let current: HomeControl | null = null
let cultivation: object | null = null

vi.mock("../../../data/home-v2-provider", () => ({
  useHomeV2: () => ({
    retrySensors: () => {},
    intelligence: { control: current, controlStatus: describeControl(current, NOW), cultivation },
  }),
}))

const desired: DesiredConfig = {
  version: 3, mode: "simulation", targets: { temperature: { min: 22, max: 24 }, humidity: { min: 75, max: 85 } },
  capabilities: { fan_intake: false, fan_exhaust: false, humidifier: false, light: false, heater: false }, note: null, createdAt: new Date(NOW - 600_000).toISOString(),
}
const reported = (over: Partial<ReportedState> = {}): ReportedState => ({
  receivedVersion: 3, appliedVersion: 3, mode: "simulation", controllerState: "idle", simulated: true, sensorOk: true, lastError: null, firmware: "x", reportedAt: new Date(NOW - 10_000).toISOString(), ...over,
})

async function render() {
  const { ControlCard } = await import("../control-card")
  return renderToStaticMarkup(<ControlCard />)
}

beforeEach(() => { current = null; cultivation = null; vi.resetModules() })

describe("Objetivo de la cámara", () => {
  it("with no target invites a test target and speaks of the empty chamber, not of a crop", async () => {
    const html = await render()
    expect(html).toContain("Sin objetivo definido")
    expect(html).toContain("Modo pruebas · cámara vacía")
    expect(html).toContain("Definir objetivo de prueba")
    expect(html).not.toMatch(/hongo|ostra|colonizaci/i)
  })

  it("a saved target the device has not confirmed is 'Guardado', never 'Aplicado'", async () => {
    current = { desired, reported: reported({ receivedVersion: 2, appliedVersion: 2 }), events: [] }
    const html = await render()
    expect(html).toContain("temperatura 22–24 °C y humedad 75–85 %")
    expect(html).toContain("Guardado")
    expect(html).toContain("Esperando que MYKO-001 la reciba")
    expect(html).not.toContain("Aplicado")
  })

  it("a target nobody ever reported on is not 'Aplicado' either", async () => {
    current = { desired, reported: null, events: [] }
    const html = await render()
    expect(html).not.toContain("Aplicado")
    expect(html).toContain("MYKO-001 no responde ahora")
  })

  it("shows 'Aplicado' only when the device reports that exact version, and states nothing was energized", async () => {
    current = { desired, reported: reported(), events: [] }
    const html = await render()
    expect(html).toContain("Aplicado")
    expect(html).toContain("Aplicado por MYKO-001 (v3)")
    expect(html).toContain("No se activa ninguna salida eléctrica")
  })

  it("shows a rejection with its reason in plain words", async () => {
    current = { desired: { ...desired, version: 4 }, reported: reported({ receivedVersion: 4, appliedVersion: 3, lastError: "humidity_out_of_envelope" }), events: [] }
    const html = await render()
    expect(html).toContain("Rechazado")
    expect(html).toContain("la humedad sale de los límites seguros")
    expect(html).not.toContain("Aplicado por MYKO-001 (v4)")
  })

  it("with a crop it says so", async () => {
    cultivation = { name: "Mi cultivo" }
    current = { desired, reported: reported(), events: [] }
    expect(await render()).toContain("Cámara con cultivo")
  })
})
