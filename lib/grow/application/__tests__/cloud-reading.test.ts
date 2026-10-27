import { describe, expect, it } from "vitest"
import { issueDeviceKey } from "../device-auth"
import { createDeviceReadingHandler, createReadingLimiter } from "../reading-handler"
import type { IngestionStore } from "../ingestion"

const TIME = "2026-10-21T12:00:00.000Z"
const ID = "pilot-esp32"

function fixture(enabled = true) {
  const key = issueDeviceKey()
  const rows: Array<{ observedAt: string; temperature: number | null; humidity: number | null; chamberId: string; runId: string | null }> = []
  const rateCounts = new Map<string, number>()
  const store: IngestionStore = {
    findDeviceByHardwareId: async hardwareId => hardwareId === ID ? { id: "device-db-id", chamberId: "owned-chamber", enabled } : null,
    getActiveCredentialHashes: async () => [key.hash],
    consumeRateLimit: async (bucket, limit) => {
      const count = (rateCounts.get(bucket) ?? 0) + 1
      rateCounts.set(bucket, count)
      return count <= limit
    },
    recordReading: async row => {
      const inserted = !rows.some(saved => saved.observedAt === row.observedAt)
      if (inserted) rows.push({ ...row, chamberId: "owned-chamber", runId: null })
      return { inserted, runAttached: false }
    },
  }
  const handler = createDeviceReadingHandler({ store: () => store, allow: createReadingLimiter(() => Date.parse(TIME)), now: () => new Date(TIME) })
  const send = (body: unknown, credential = key.key, hardwareId = ID) => handler(new Request("https://local.invalid/api/v2/device/readings", {
    method: "POST", headers: { "x-device-id": hardwareId, "x-device-key": credential, "content-type": "application/json" }, body: JSON.stringify(body),
  }))
  return { send, rows, key, handler, store, rateCounts }
}

describe("pilot device ingestion", () => {
  it("rejects wrong keys, unknown and disabled devices without a write", async () => {
    const f = fixture()
    expect((await f.send({ observedAt: TIME, temperature: 20 }, "wrong")).status).toBe(401)
    expect((await f.send({ observedAt: TIME, temperature: 20 }, f.key.key, "unknown")).status).toBe(401)
    const disabled = fixture(false)
    expect((await disabled.send({ observedAt: TIME, temperature: 20 })).status).toBe(403)
    expect(f.rows).toHaveLength(0)
    expect(disabled.rows).toHaveLength(0)
  })

  it("does not let unauthenticated attempts consume the authenticated device budget", async () => {
    const f = fixture()
    for (let i = 0; i < 130; i++) {
      expect((await f.send({ observedAt: TIME, temperature: 20 }, `invalid-${i}`)).status).toBe(401)
    }
    expect(f.rateCounts.size).toBe(0)
    expect((await f.send({ observedAt: TIME, temperature: 20 })).status).toBe(201)
    expect(f.rateCounts.get("device:device-db-id")).toBe(1)
  })

  it("accepts only fresh measured values, takes ownership from the device, and deduplicates retries", async () => {
    const f = fixture()
    const first = await f.send({ observedAt: TIME, temperature: 0, humidity: 80.3, deviceId: ID })
    expect(first.status).toBe(201)
    expect(await first.json()).toMatchObject({ accepted: true, runAttached: false })
    expect(f.rows).toMatchObject([{ observedAt: TIME, temperature: 0, humidity: 80.3, chamberId: "owned-chamber", runId: null }])
    expect((await f.send({ observedAt: TIME, temperature: 0, humidity: 80.3 })).status).toBe(200)
    expect(f.rows).toHaveLength(1)
  })

  it("rejects invalid sensor output, spoofed identity and old or future samples", async () => {
    const bodies = [
      {}, { observedAt: TIME }, { observedAt: TIME, temperature: "NaN" },
      { observedAt: TIME, temperature: null }, { observedAt: TIME, humidity: 101 },
      { observedAt: TIME, temperature: 20, chamberId: "someone-else" },
      { observedAt: TIME, temperature: 20, deviceId: "someone-else" },
      { observedAt: "2026-10-21T11:57:59.000Z", temperature: 20 },
      { observedAt: "2026-10-21T12:00:31.000Z", temperature: 20 },
      { temperature: 20 },
    ]
    for (const body of bodies) {
      const f = fixture()
      expect((await f.send(body)).status).toBe(400)
      expect(f.rows).toHaveLength(0)
    }
  })

  it("bounds streamed bytes and rate, and returns generic service failures", async () => {
    const f = fixture()
    const huge = await f.handler(new Request("https://local.invalid", { method: "POST", headers: { "x-device-id": ID, "x-device-key": f.key.key, "content-type": "application/json" }, body: "{" + "x".repeat(3000) + "}" }))
    expect(huge.status).toBe(413)
    for (let i = 0; i < 5; i++) expect((await f.send({ observedAt: TIME, temperature: 20 })).status).toBeLessThan(400)
    const limited = await f.send({ observedAt: TIME, temperature: 20 })
    expect(limited.status).toBe(429)
    expect(limited.headers.get("retry-after")).toBe("60")
    const failed = createDeviceReadingHandler({ store: () => { throw Error("database detail") }, allow: () => true })
    const response = await failed(new Request("https://local.invalid", { method: "POST", headers: { "x-device-id": ID, "x-device-key": f.key.key } }))
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain("database detail")
  })

  it("shares the device limit across separate handler instances", async () => {
    const f = fixture()
    const second = createDeviceReadingHandler({ store: () => f.store, allow: createReadingLimiter(() => Date.parse(TIME)), now: () => new Date(TIME) })
    const request = () => new Request("https://local.invalid/api/v2/device/readings", {
      method: "POST", headers: { "x-device-id": ID, "x-device-key": f.key.key, "content-type": "application/json" },
      body: JSON.stringify({ observedAt: TIME, temperature: 20 }),
    })
    for (let i = 0; i < 3; i++) expect((await f.handler(request())).status).toBeLessThan(400)
    for (let i = 0; i < 3; i++) expect((await second(request())).status).toBeLessThan(400)
    expect((await second(request())).status).toBe(429)
    expect(f.rateCounts.get("device:device-db-id")).toBe(7)
    expect(f.rows).toHaveLength(1)
  })

  it("fails closed when the shared rate store is unavailable", async () => {
    const f = fixture()
    f.store.consumeRateLimit = async () => { throw new Error("private database detail") }
    const response = await f.send({ observedAt: TIME, temperature: 21 })
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain("private database detail")
    expect(f.rows).toHaveLength(0)
  })
})
