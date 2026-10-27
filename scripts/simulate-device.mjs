/**
 * Local-only protocol simulator of MYKO-001 for the control loop. It is NOT the firmware: it speaks the same HTTPS
 * protocol (readings + sync with the per-device key) so the server, RLS and HOME can be tested end to end without
 * touching the real device or production. Refuses anything but the isolated local stack.
 *
 *   LOCAL_APP_URL=http://127.0.0.1:4317 node scripts/simulate-device.mjs [minutes]
 */
import { execFileSync } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"

const dockerDir = process.platform === "win32" ? join(process.env.LOCALAPPDATA ?? "", "Programs", "DockerDesktop", "resources", "bin") : ""
const status = JSON.parse(execFileSync(process.execPath, [join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js"), "status", "-o", "json"], {
  cwd: process.cwd(), encoding: "utf8", env: { ...process.env, PATH: dockerDir ? `${dockerDir};${process.env.PATH}` : process.env.PATH }, stdio: ["ignore", "pipe", "pipe"],
}))
const app = process.env.LOCAL_APP_URL
if (status.API_URL !== "http://127.0.0.1:54321" || app !== "http://127.0.0.1:4317") throw new Error("Refusing to run outside the isolated local stack")

const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const must = (r, l) => { if (r.error) throw new Error(`${l}: ${r.error.message}`); return r.data }
const email = "control-owner@test.invalid"
const password = randomBytes(12).toString("base64url")
const key = `myk_${randomBytes(32).toString("base64url")}`

for (const u of must(await admin.auth.admin.listUsers(), "list").users.filter(u => u.email === email || u.email === "control-other@test.invalid")) await admin.auth.admin.deleteUser(u.id)
const user = must(await admin.auth.admin.createUser({ email, password, email_confirm: true }), "user").user
const other = must(await admin.auth.admin.createUser({ email: "control-other@test.invalid", password, email_confirm: true }), "other").user
const chamber = must(await admin.from("grow_chambers").insert({ owner_id: user.id, name: "MYKOSPHARE Prototype 01", display_code: "MYKO-001" }).select("id").single(), "chamber")
const device = must(await admin.from("grow_devices").insert({ chamber_id: chamber.id, device_type: "controller", name: "MYKOSPHARE Prototype 01", hardware_identifier: "MYKO-001", enabled: true, capabilities: ["temperature", "humidity"] }).select("id").single(), "device")
must(await admin.from("grow_device_credentials").insert({ device_id: device.id, key_hash: createHash("sha256").update(key).digest("hex"), key_hint: key.slice(0, 10) }), "credential")
console.log(JSON.stringify({ email, otherEmail: "control-other@test.invalid", password, deviceId: device.id }))

const headers = { "content-type": "application/json", "x-device-id": "MYKO-001", "x-device-key": key }
const bootId = randomBytes(4).toString("hex")
const state = { received: null, applied: null, mode: "observation", config: null, lastError: null, events: [{ key: "s1", at: new Date().toISOString(), kind: "boot", simulated: true, version: null, detail: {} }], seq: 1, humidity: 62, temperature: 25.3 }

// Same envelope as firmware/esp32-cloud-v1/LocalController.h
function validate(c) {
  if (!["observation", "simulation"].includes(c.mode)) return "mode_not_supported"
  const t = c.targets?.temperature, h = c.targets?.humidity
  if (!t && !h) return "targets_missing"
  if (t && (t.min < 5 || t.max > 35)) return "temperature_out_of_envelope"
  if (h && (h.min < 20 || h.max > 98)) return "humidity_out_of_envelope"
  if ((t && t.max - t.min < 1) || (h && h.max - h.min < 4)) return "range_too_narrow"
  return null
}
const ev = (kind, version, detail = {}) => state.events.push({ key: `s${++state.seq}`, at: new Date().toISOString(), kind, simulated: true, version, detail })

async function tick(n) {
  // Readings drift so the UI has something to show; a dry spell triggers simulated decisions.
  state.humidity = n % 8 < 4 ? 62 : 80
  state.temperature = 25.3
  const at = new Date().toISOString()
  const reading = await fetch(`${app}/api/v2/device/readings`, { method: "POST", headers, body: JSON.stringify({ observedAt: at, temperature: state.temperature, humidity: state.humidity }) })
  const report = { bootId, firmware: "sim-protocol", uptimeSeconds: n * 12, receivedVersion: state.received, appliedVersion: state.applied, mode: state.mode,
    controller: { state: state.mode === "simulation" && state.humidity < (state.config?.targets?.humidity?.min ?? 0) ? "holding" : "idle", simulated: true, sensorOk: true }, lastError: state.lastError, events: state.events.slice(0, 20) }
  const sync = await fetch(`${app}/api/v2/device/sync`, { method: "POST", headers, body: JSON.stringify(report) })
  console.log(`tick ${n}: readings ${reading.status}, sync ${sync.status}`)
  if (sync.status !== 200) return
  state.events = state.events.slice(20)
  const body = await sync.json()
  if (!body.config) return
  const cfg = body.config
  ev("config_received", cfg.version)
  state.received = cfg.version
  const error = validate(cfg)
  if (error) { state.lastError = error; ev("config_rejected", cfg.version, { error }); return }
  state.config = cfg; state.mode = cfg.mode; state.applied = cfg.version; state.lastError = null
  ev("config_applied", cfg.version, { mode: cfg.mode })
  const hmin = cfg.targets?.humidity?.min
  if (cfg.mode === "simulation" && hmin !== undefined && state.humidity < hmin) ev("actuation", cfg.version, { actuator: "humidifier", command: "on", reason: "below_band", value: state.humidity })
  console.log(`config v${cfg.version} ${error ?? "applied"} (${cfg.mode})`)
}

const minutes = Number(process.argv[2] ?? 20)
const end = Date.now() + minutes * 60_000
for (let n = 1; Date.now() < end; n++) {
  await tick(n).catch(e => console.log("tick failed", e.message))
  await new Promise(r => setTimeout(r, 12_000))
}
