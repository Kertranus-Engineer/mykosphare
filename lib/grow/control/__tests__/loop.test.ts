import { describe, expect, it } from "vitest"
import { hashDeviceKey } from "../../application/device-auth"
import { createDeviceSyncHandler, publishOwnerConfig, type PublishStore, type SyncStore } from "../handlers"
import { describeControl } from "../status"
import type { ControlEvent, DesiredConfig, DeviceReport, HomeControl, ReportedState } from "../types"

/**
 * The whole loop on in-memory stores: owner confirms → server saves a version → device syncs and receives it → device
 * reports it applied → HOME may finally say "Aplicado". Two accounts prove the isolation. (The same flow against a real
 * local Supabase is scripts/simulate-device.mjs.)
 */
const KEYS: Record<string, string> = { "MYKO-001": "myk_key-for-device-one-0123456789abcdef", "MYKO-002": "myk_key-for-device-two-0123456789abcdef" }
const OWNER: Record<string, string> = { alice: "dev-1", bob: "dev-2" }
const HARDWARE: Record<string, string> = { "MYKO-001": "dev-1", "MYKO-002": "dev-2" }

function world() {
  const configs = new Map<string, DesiredConfig[]>()
  const reports = new Map<string, DeviceReport>()
  const events: { device: string; key: string; kind: string }[] = []
  const syncStore: SyncStore = {
    findDeviceByHardwareId: async id => (HARDWARE[id] ? { id: HARDWARE[id], chamberId: `ch-${HARDWARE[id]}`, enabled: true } : null),
    getActiveCredentialHashes: async deviceId => Object.entries(HARDWARE).filter(([, d]) => d === deviceId).map(([hw]) => hashDeviceKey(KEYS[hw] as string)),
    consumeRateLimit: async () => true,
    recordReading: async () => ({ inserted: true, runAttached: false }),
    getLatestConfig: async deviceId => (configs.get(deviceId) ?? []).at(-1) ?? null,
    recordReport: async ({ deviceId, report }) => {
      reports.set(deviceId, report)
      for (const e of report.events) if (!events.some(x => x.device === deviceId && x.key === `${report.bootId}:${e.key}`)) events.push({ device: deviceId, key: `${report.bootId}:${e.key}`, kind: e.kind })
    },
  }
  const publishStore: PublishStore = {
    findDeviceForOwner: async owner => (OWNER[owner] ? { id: OWNER[owner] as string, enabled: true } : null),
    publishConfig: async ({ deviceId, mode, targets, capabilities, note }) => {
      const list = configs.get(deviceId) ?? []
      const version = list.length + 1
      list.push({ version, mode, targets, capabilities, note, createdAt: new Date().toISOString() })
      configs.set(deviceId, list)
      return version
    },
  }
  const handler = createDeviceSyncHandler({ store: () => syncStore, allow: () => true })
  const sync = async (hardware: string, report: Partial<DeviceReport> & Record<string, unknown>) => {
    const res = await handler(new Request("https://x.test/api/v2/device/sync", {
      method: "POST", headers: { "content-type": "application/json", "x-device-id": hardware, "x-device-key": KEYS[hardware] as string },
      body: JSON.stringify({ bootId: "b1", firmware: "sim", uptimeSeconds: 10, receivedVersion: null, appliedVersion: null, mode: "observation", controller: { state: "idle", simulated: true, sensorOk: true }, lastError: null, events: [], ...report }),
    }))
    return { status: res.status, body: (await res.json()) as { desiredVersion: number | null; config: DesiredConfig | null } }
  }
  const view = (deviceId: string, now: number): HomeControl => {
    const r = reports.get(deviceId)
    const reported: ReportedState | null = r ? { receivedVersion: r.receivedVersion, appliedVersion: r.appliedVersion, mode: r.mode, controllerState: r.controller.state, simulated: true, sensorOk: r.controller.sensorOk, lastError: r.lastError, firmware: r.firmware, reportedAt: new Date(now).toISOString() } : null
    const list = configs.get(deviceId) ?? []
    return { desired: list.at(-1) ?? null, reported, events: [] as ControlEvent[] }
  }
  return { publishStore, sync, view, events }
}
const body = { mode: "simulation", targets: { temperature: { min: 22, max: 24 }, humidity: { min: 75, max: 85 } } }

describe("control loop", () => {
  it("owner confirms → device receives → device applies → only then 'Aplicado'", async () => {
    const w = world()
    const now = Date.now()
    expect(describeControl(w.view("dev-1", now), now).phase).toBe("none")

    expect(await publishOwnerConfig({ store: w.publishStore, ownerId: "alice", body })).toEqual({ status: 201, version: 1 })
    expect(describeControl(w.view("dev-1", now), now).phase).toBe("unreachable") // saved, device never reported

    const first = await w.sync("MYKO-001", {})
    expect(first.body).toMatchObject({ desiredVersion: 1, config: { version: 1, mode: "simulation" } })
    expect(describeControl(w.view("dev-1", now), now)).toMatchObject({ phase: "waiting" }) // it only asked; it has not received it

    await w.sync("MYKO-001", { receivedVersion: 1, appliedVersion: null, events: [{ key: "s2", at: new Date().toISOString(), kind: "config_received", simulated: true, version: 1, detail: {} }] })
    expect(describeControl(w.view("dev-1", now), now).phase).toBe("received")

    const applied = await w.sync("MYKO-001", { receivedVersion: 1, appliedVersion: 1, mode: "simulation", events: [{ key: "s3", at: new Date().toISOString(), kind: "config_applied", simulated: true, version: 1, detail: { mode: "simulation" } }] })
    expect(applied.body.config).toBeNull() // already has it: nothing to download again
    expect(describeControl(w.view("dev-1", now), now)).toMatchObject({ phase: "applied", label: "Aplicado por MYKO-001 (v1)." })
  })

  it("a new version replaces the old one, and a rejection keeps the previous valid one reported", async () => {
    const w = world()
    const now = Date.now()
    await publishOwnerConfig({ store: w.publishStore, ownerId: "alice", body })
    await w.sync("MYKO-001", { receivedVersion: 1, appliedVersion: 1, mode: "simulation" })
    expect(await publishOwnerConfig({ store: w.publishStore, ownerId: "alice", body: { ...body, targets: { humidity: { min: 70, max: 80 } } } })).toEqual({ status: 201, version: 2 })
    const next = await w.sync("MYKO-001", { receivedVersion: 1, appliedVersion: 1, mode: "simulation" })
    expect(next.body.config).toMatchObject({ version: 2, targets: { humidity: { min: 70, max: 80 } } })
    await w.sync("MYKO-001", { receivedVersion: 2, appliedVersion: 1, mode: "simulation", lastError: "range_too_narrow" })
    const status = describeControl(w.view("dev-1", now), now)
    expect(status.phase).toBe("rejected")
    expect(status.label).not.toContain("Aplicado")
  })

  it("one account can never read, publish to or hear about another account's device", async () => {
    const w = world()
    await publishOwnerConfig({ store: w.publishStore, ownerId: "alice", body })
    const bob = await w.sync("MYKO-002", {})
    expect(bob.body).toMatchObject({ desiredVersion: null, config: null })
    expect(await publishOwnerConfig({ store: w.publishStore, ownerId: "mallory", body })).toMatchObject({ status: 404 })
    expect(w.view("dev-2", Date.now()).desired).toBeNull()
    // Bob's device cannot authenticate with Alice's key.
    const res = await createDeviceSyncHandler({ store: () => ({ ...({} as SyncStore), findDeviceByHardwareId: async () => ({ id: "dev-2", chamberId: "c", enabled: true }), getActiveCredentialHashes: async () => [hashDeviceKey(KEYS["MYKO-002"] as string)] }), allow: () => true })(
      new Request("https://x.test", { method: "POST", headers: { "content-type": "application/json", "x-device-id": "MYKO-002", "x-device-key": KEYS["MYKO-001"] as string }, body: "{}" }))
    expect(res.status).toBe(401)
  })

  it("replayed events are stored once", async () => {
    const w = world()
    const event = { key: "s5", at: new Date().toISOString(), kind: "decision" as const, simulated: true, version: null, detail: {} }
    await w.sync("MYKO-001", { events: [event] })
    await w.sync("MYKO-001", { events: [event] })
    expect(w.events.filter(e => e.device === "dev-1")).toHaveLength(1)
  })
})
