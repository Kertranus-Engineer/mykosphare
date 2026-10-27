import { describe, expect, it } from "vitest"
import { deviceKeyMatches, hashDeviceKey, issueDeviceKey } from "../device-auth"
import { authenticateDevice, ingestDeviceReading, type IngestionStore } from "../ingestion"
import { validateDeviceReadingPayload } from "../validation"

const RECEIVED = "2026-09-30T12:00:00.000Z"

function store(options: { enabled?: boolean; activeRun?: string | null } = {}) {
  const issued = issueDeviceKey()
  const other = issueDeviceKey()
  const revoked = issueDeviceKey()
  const rows: Array<Record<string, unknown>> = []
  const seen: string[] = []
  const impl: IngestionStore = {
    findDeviceByHardwareId: async (hw) => hw === "esp32-box-1"
      ? { id: "dev-1", chamberId: "ch-1", enabled: options.enabled ?? true }
      : hw === "esp32-box-2" ? { id: "dev-2", chamberId: "ch-2", enabled: true } : null,
    getActiveCredentialHashes: async (id) => id === "dev-1" ? [issued.hash] : id === "dev-2" ? [other.hash] : [],
    consumeRateLimit: async () => true,
    recordReading: async (row) => {
      const runId = options.activeRun === undefined ? "run-1" : options.activeRun
      const inserted = !rows.some((r) => r.deviceId === row.deviceId && r.observedAt === row.observedAt)
      if (inserted) rows.push({ ...row, chamberId: "ch-1", runId, metadata: { clock: row.clock } })
      seen.push(`dev-1@${RECEIVED}`)
      return { inserted, runAttached: runId !== null }
    },
  }
  return { impl, key: issued.key, otherKey: other.key, revokedKey: revoked.key, rows, seen }
}

describe("device credentials", () => {
  it("issues a high-entropy key whose plaintext is never the stored value", () => {
    const issued = issueDeviceKey()
    expect(issued.key).toMatch(/^myk_[A-Za-z0-9_-]{43}$/)
    expect(issued.hash).toBe(hashDeviceKey(issued.key))
    expect(issued.hash).not.toContain(issued.key)
    expect(issued.key.startsWith(issued.hint)).toBe(true)
    expect(issueDeviceKey().key).not.toBe(issued.key)
  })

  it("matches only active hashes, in constant time, and rejects junk", () => {
    const issued = issueDeviceKey()
    expect(deviceKeyMatches(issued.key, [issued.hash])).toBe(true)
    expect(deviceKeyMatches(issued.key, [])).toBe(false)
    expect(deviceKeyMatches("not-a-key", [issued.hash])).toBe(false)
    expect(deviceKeyMatches(issued.key, ["zz"])).toBe(false)
  })
})

describe("device authentication", () => {
  it("accepts a valid device credential and resolves the chamber from the device record", async () => {
    const s = store()
    await expect(authenticateDevice(s.impl, "esp32-box-1", s.key)).resolves.toEqual({ status: "authenticated", device: { id: "dev-1", chamberId: "ch-1", enabled: true } })
  })

  it("does not reveal whether the device or the key was wrong", async () => {
    const s = store()
    await expect(authenticateDevice(s.impl, "esp32-box-1", s.revokedKey)).resolves.toEqual({ status: "unauthorized" })
    await expect(authenticateDevice(s.impl, "someone-else", s.key)).resolves.toEqual({ status: "unauthorized" })
    await expect(authenticateDevice(s.impl, null, s.key)).resolves.toEqual({ status: "unauthorized" })
    await expect(authenticateDevice(s.impl, "esp32-box-1", null)).resolves.toEqual({ status: "unauthorized" })
  })

  it("does not accept another device's active key for MYKO-001", async () => {
    const s = store()
    await expect(authenticateDevice(s.impl, "esp32-box-1", s.otherKey)).resolves.toEqual({ status: "unauthorized" })
    await expect(authenticateDevice(s.impl, "esp32-box-2", s.key)).resolves.toEqual({ status: "unauthorized" })
    await expect(authenticateDevice(s.impl, "esp32-box-2", s.otherKey)).resolves.toMatchObject({ status: "authenticated", device: { id: "dev-2" } })
  })

  it("rejects a disabled device even with a valid key", async () => {
    const s = store({ enabled: false })
    await expect(authenticateDevice(s.impl, "esp32-box-1", s.key)).resolves.toEqual({ status: "disabled" })
  })
})

describe("device ingestion", () => {
  const device = { id: "dev-1", chamberId: "ch-1", enabled: true }

  it("attaches the reading to the active run with real provenance and device clock", async () => {
    const s = store()
    const result = await ingestDeviceReading({ store: s.impl, device, reading: { observedAt: "2026-09-30T11:59:00.000Z", temperature: 22.4, humidity: 71.2 }, receivedAt: RECEIVED })
    expect(result).toEqual({ status: "accepted", runAttached: true, observedAt: "2026-09-30T11:59:00.000Z" })
    expect(s.rows[0]).toMatchObject({ deviceId: "dev-1", chamberId: "ch-1", runId: "run-1", temperature: 22.4, humidity: 71.2, metadata: { clock: "device" } })
    expect(s.seen).toEqual([`dev-1@${RECEIVED}`])
  })

  it("stamps server time when the device has no clock, and says so", async () => {
    const s = store()
    const result = await ingestDeviceReading({ store: s.impl, device, reading: { temperature: 22 }, receivedAt: RECEIVED })
    expect(result.observedAt).toBe(RECEIVED)
    expect(s.rows[0]).toMatchObject({ observedAt: RECEIVED, humidity: null, metadata: { clock: "server" } })
  })

  it("keeps readings without an active run (chamber history) but does not attach them", async () => {
    const s = store({ activeRun: null })
    await expect(ingestDeviceReading({ store: s.impl, device, reading: { temperature: 22 }, receivedAt: RECEIVED })).resolves.toMatchObject({ status: "accepted", runAttached: false })
    expect(s.rows[0].runId).toBeNull()
  })

  it("treats a retried reading as a duplicate (idempotent)", async () => {
    const s = store()
    const reading = { observedAt: "2026-09-30T11:59:00.000Z", temperature: 22 }
    await ingestDeviceReading({ store: s.impl, device, reading, receivedAt: RECEIVED })
    await expect(ingestDeviceReading({ store: s.impl, device, reading, receivedAt: RECEIVED })).resolves.toMatchObject({ status: "duplicate" })
    expect(s.rows).toHaveLength(1)
  })
})

describe("v2 device reading body", () => {
  it("accepts the ESP32 contract with or without observedAt", () => {
    expect(validateDeviceReadingPayload({ temperature: 22.4, humidity: 71.2 }, RECEIVED)).toEqual({ ok: true, data: { temperature: 22.4, humidity: 71.2 } })
    expect(validateDeviceReadingPayload({ observedAt: "2026-09-30T11:59:00.000Z", temperature: 22 }, RECEIVED)).toMatchObject({ ok: true })
  })

  it("rejects identity/provenance spoofing fields, absent metrics and implausible times", () => {
    expect(validateDeviceReadingPayload({ temperature: 22, origin: "simulated" }, RECEIVED)).toMatchObject({ ok: false })
    expect(validateDeviceReadingPayload({ temperature: 22, chamberId: "x" }, RECEIVED)).toMatchObject({ ok: false })
    expect(validateDeviceReadingPayload({ temperature: 22, runId: "x" }, RECEIVED)).toMatchObject({ ok: false })
    expect(validateDeviceReadingPayload({ temperature: 22, co2: 400 }, RECEIVED)).toMatchObject({ ok: false })
    expect(validateDeviceReadingPayload({}, RECEIVED)).toMatchObject({ ok: false })
    expect(validateDeviceReadingPayload({ observedAt: "2026-09-01T00:00:00.000Z", temperature: 22 }, RECEIVED)).toMatchObject({ ok: false, error: "observedAt is too old" })
    expect(validateDeviceReadingPayload({ observedAt: "2026-09-30T13:00:00.000Z", temperature: 22 }, RECEIVED)).toMatchObject({ ok: false })
  })
})
