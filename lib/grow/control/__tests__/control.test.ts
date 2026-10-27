import { describe, expect, it, vi } from "vitest"
import { hashDeviceKey } from "../../application/device-auth"
import { createDeviceSyncHandler, publishOwnerConfig, type PublishStore, type SyncStore } from "../handlers"
import { toDesired, toReported } from "../mapping"
import { ALLOWED_MODES, type DesiredConfig, type DeviceReport } from "../types"
import { parseDeviceReport, parseOwnerConfig, parseTargets } from "../validation"

const NOW = new Date("2026-10-28T12:00:00Z")
const KEY = "myk_test-key-for-unit-tests-only-0123456789abcdef"
const report = (over: Record<string, unknown> = {}) => ({
  bootId: "b1", firmware: "cloud-v1+ctl0", uptimeSeconds: 120, receivedVersion: null, appliedVersion: null, mode: "observation",
  controller: { state: "idle", simulated: true, sensorOk: true }, lastError: null, events: [], ...over,
})

describe("owner config validation", () => {
  it("accepts targets inside the hard envelope and never grants capabilities", () => {
    const parsed = parseOwnerConfig({ mode: "simulation", targets: { temperature: { min: 22, max: 24 }, humidity: { min: 75, max: 85 } }, note: " prueba " })
    expect(parsed).toEqual({ ok: true, value: { mode: "simulation", targets: { temperature: { min: 22, max: 24 }, humidity: { min: 75, max: 85 } }, capabilities: { fan_intake: false, fan_exhaust: false, humidifier: false, light: false, heater: false }, note: "prueba" } })
  })

  it("only stores modes that cannot move a relay while actuation is disabled", () => {
    expect(ALLOWED_MODES).toEqual(["observation", "simulation"])
    for (const mode of ["assisted", "automatic"]) {
      expect(parseOwnerConfig({ mode, targets: { humidity: { min: 75, max: 85 } } })).toEqual({ ok: false, error: "actuation_not_enabled" })
    }
    expect(parseOwnerConfig({ mode: "reboot", targets: { humidity: { min: 75, max: 85 } } })).toMatchObject({ ok: false })
  })

  it.each([
    ["no targets", { mode: "observation", targets: {} }],
    ["temperature outside the envelope", { mode: "observation", targets: { temperature: { min: 30, max: 45 } } }],
    ["humidity outside the envelope", { mode: "observation", targets: { humidity: { min: 10, max: 99 } } }],
    ["too narrow", { mode: "observation", targets: { humidity: { min: 80, max: 82 } } }],
    ["inverted", { mode: "observation", targets: { temperature: { min: 24, max: 22 } } }],
    ["text instead of numbers", { mode: "observation", targets: { temperature: { min: "22", max: "24" } } }],
    ["unknown target", { mode: "observation", targets: { co2: { min: 400, max: 800 } } }],
    ["extra command field", { mode: "observation", targets: { humidity: { min: 75, max: 85 } }, gpio: 17 }],
    ["capabilities requested by the client", { mode: "observation", targets: { humidity: { min: 75, max: 85 } }, capabilities: { heater: true } }],
    ["a long note", { mode: "observation", targets: { humidity: { min: 75, max: 85 } }, note: "x".repeat(201) }],
  ])("rejects %s", (_label, body) => expect(parseOwnerConfig(body).ok).toBe(false))

  it("rounds to one decimal and accepts a single target", () => {
    expect(parseTargets({ temperature: { min: 22.04, max: 23.96 } })).toEqual({ ok: true, value: { temperature: { min: 22, max: 24 } } })
  })
})

describe("device report validation", () => {
  it("accepts a well-formed report and forces events to be simulated while actuation is disabled", () => {
    const parsed = parseDeviceReport(report({ events: [{ key: "1", at: "2026-10-28T11:59:00Z", kind: "actuation", simulated: false, version: 2, detail: { actuator: "humidifier", command: "on" } }] }), NOW)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.events[0]?.simulated).toBe(true)
      expect(parsed.value.controller.simulated).toBe(true)
    }
  })

  it.each([
    ["unknown field", report({ shell: "rm -rf" })],
    ["bad boot id", report({ bootId: "a b" })],
    ["bad mode", report({ mode: "turbo" })],
    ["bad controller state", report({ controller: { state: "angry", simulated: true, sensorOk: true } })],
    ["version zero", report({ appliedVersion: 0 })],
    ["too many events", report({ events: Array.from({ length: 21 }, (_, i) => ({ key: String(i), at: "2026-10-28T11:59:00Z", kind: "decision", simulated: true, version: null, detail: {} })) })],
    ["unknown event kind", report({ events: [{ key: "1", at: "2026-10-28T11:59:00Z", kind: "format_disk", simulated: true, version: null, detail: {} }] })],
    ["event from the future", report({ events: [{ key: "1", at: "2026-10-29T11:59:00Z", kind: "decision", simulated: true, version: null, detail: {} }] })],
    ["nested event detail", report({ events: [{ key: "1", at: "2026-10-28T11:59:00Z", kind: "decision", simulated: true, version: null, detail: { a: { b: 1 } } }] })],
    ["long error", report({ lastError: "x".repeat(121) })],
  ])("rejects %s", (_label, body) => expect(parseDeviceReport(body, NOW).ok).toBe(false))
})

function syncStore(over: Partial<SyncStore> = {}): SyncStore & { recorded: DeviceReport[] } {
  const recorded: DeviceReport[] = []
  const config: DesiredConfig = { version: 3, mode: "simulation", targets: { humidity: { min: 75, max: 85 } }, capabilities: { fan_intake: false, fan_exhaust: false, humidifier: false, light: false, heater: false }, note: null, createdAt: NOW.toISOString() }
  return {
    recorded,
    findDeviceByHardwareId: async id => (id === "MYKO-001" ? { id: "dev-1", chamberId: "ch-1", enabled: true } : null),
    getActiveCredentialHashes: async () => [hashDeviceKey(KEY)],
    consumeRateLimit: async () => true,
    recordReading: async () => ({ inserted: true, runAttached: false }),
    getLatestConfig: async () => config,
    recordReport: async ({ report: r }) => { recorded.push(r) },
    ...over,
  }
}
const call = (handler: (r: Request) => Promise<Response>, body: unknown, headers: Record<string, string> = { "x-device-id": "MYKO-001", "x-device-key": KEY }) =>
  handler(new Request("https://x.test/api/v2/device/sync", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }))

describe("device sync endpoint", () => {
  const make = (store = syncStore(), allow = () => true) => createDeviceSyncHandler({ store: () => store, allow, now: () => NOW })

  it("rejects missing or wrong credentials before reading anything", async () => {
    const store = syncStore()
    expect((await call(make(store), report(), {})).status).toBe(401)
    expect((await call(make(store), report(), { "x-device-id": "MYKO-001", "x-device-key": "myk_wrong" })).status).toBe(401)
    expect((await call(make(store), report(), { "x-device-id": "OTHER", "x-device-key": KEY })).status).toBe(401)
    expect(store.recorded).toHaveLength(0)
  })

  it("stores the report and hands over the desired config the device does not have yet", async () => {
    const store = syncStore()
    const response = await call(make(store), report({ receivedVersion: 2 }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ desiredVersion: 3, config: { version: 3, mode: "simulation" } })
    expect(store.recorded).toHaveLength(1)
  })

  it("sends no config when the device already has the latest version", async () => {
    const body = await (await call(make(), report({ receivedVersion: 3, appliedVersion: 3 }))).json()
    expect(body).toMatchObject({ desiredVersion: 3, config: null })
  })

  it("rate limits per device and refuses oversized or malformed bodies", async () => {
    expect((await call(make(syncStore(), () => false), report())).status).toBe(429)
    expect((await call(make(syncStore({ consumeRateLimit: async () => false })), report())).status).toBe(429)
    const big = await call(make(), report({ events: [{ key: "1", at: "2026-10-28T11:59:00Z", kind: "decision", simulated: true, version: null, detail: { note: "x".repeat(7000) } }] }))
    expect(big.status).toBe(413)
    expect((await call(make(), report({ shell: "x" }))).status).toBe(400)
  })

  it("reports a disabled device and survives store failures without leaking details", async () => {
    expect((await call(make(syncStore({ findDeviceByHardwareId: async () => ({ id: "d", chamberId: "c", enabled: false }) })), report())).status).toBe(403)
    const failing = await call(make(syncStore({ recordReport: vi.fn(async () => { throw new Error("db password leaked?") }) })), report())
    expect(failing.status).toBe(503)
    expect(JSON.stringify(await failing.json())).not.toMatch(/password/)
  })
})

describe("owner publish", () => {
  const store = (over: Partial<PublishStore> = {}): PublishStore & { published: unknown[] } => {
    const published: unknown[] = []
    return { published, findDeviceForOwner: async owner => (owner === "owner-a" ? { id: "dev-1", enabled: true } : null), publishConfig: async input => { published.push(input); return published.length }, ...over }
  }
  const body = { mode: "simulation", targets: { temperature: { min: 22, max: 24 }, humidity: { min: 75, max: 85 } } }

  it("publishes for the caller's own device only and returns the new version", async () => {
    const s = store()
    expect(await publishOwnerConfig({ store: s, ownerId: "owner-a", body })).toEqual({ status: 201, version: 1 })
    expect(s.published[0]).toMatchObject({ deviceId: "dev-1", mode: "simulation", createdBy: "owner-a", capabilities: { heater: false, humidifier: false } })
    expect(await publishOwnerConfig({ store: s, ownerId: "owner-b", body })).toMatchObject({ status: 404 })
    expect(s.published).toHaveLength(1)
  })

  it("refuses modes that could move hardware, invalid targets and disabled devices", async () => {
    const s = store()
    expect(await publishOwnerConfig({ store: s, ownerId: "owner-a", body: { ...body, mode: "automatic" } })).toEqual({ status: 409, error: "actuation_not_enabled" })
    expect(await publishOwnerConfig({ store: s, ownerId: "owner-a", body: { mode: "observation", targets: { humidity: { min: 1, max: 99 } } } })).toMatchObject({ status: 400 })
    expect(await publishOwnerConfig({ store: store({ findDeviceForOwner: async () => ({ id: "d", enabled: false }) }), ownerId: "owner-a", body })).toMatchObject({ status: 409 })
    expect(s.published).toHaveLength(0)
  })

  it("turns store failures into a generic 503", async () => {
    expect(await publishOwnerConfig({ store: store({ publishConfig: async () => { throw new Error("boom") } }), ownerId: "owner-a", body })).toEqual({ status: 503, error: "unavailable" })
  })
})

describe("row mappers are defensive", () => {
  it("never grants a capability that is not exactly true and tolerates garbage", () => {
    const d = toDesired({ version: 4, mode: "weird", targets: [], capabilities: { heater: "yes", humidifier: true, shell: true }, created_at: "2026-10-28T12:00:00Z" })
    expect(d.mode).toBe("observation")
    expect(d.capabilities).toEqual({ fan_intake: false, fan_exhaust: false, humidifier: true, light: false, heater: false })
    expect(d.targets).toEqual({})
    expect(toReported(null)).toBeNull()
    expect(toReported({ firmware_version: "x", reported_actuators: { appliedVersion: "9", controller: { state: "angry" } }, updated_at: "2026-10-28T12:00:00Z" })).toMatchObject({ appliedVersion: null, controllerState: null, simulated: true })
  })
})
