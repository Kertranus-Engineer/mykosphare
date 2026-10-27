/**
 * Local-only seed for trying MYKO Intelligence in the browser. Refuses anything but the isolated local stack.
 * Creates a synthetic owner, chamber, device and ~6 h of readings: normal, one low-humidity episode that recovered,
 * one signal gap and an ongoing low-humidity condition. Prints the synthetic login (local only).
 */
import { execFileSync } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"

const dockerDir = process.platform === "win32" ? join(process.env.LOCALAPPDATA ?? "", "Programs", "DockerDesktop", "resources", "bin") : ""
const path = dockerDir ? `${dockerDir};${process.env.PATH}` : process.env.PATH
const status = JSON.parse(execFileSync(process.execPath, [join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js"), "status", "-o", "json"], {
  cwd: process.cwd(), encoding: "utf8", env: { ...process.env, PATH: path }, stdio: ["ignore", "pipe", "pipe"],
}))
if (status.API_URL !== "http://127.0.0.1:54321") throw new Error("Refusing to run outside the isolated local Supabase stack")

const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const must = (r, l) => { if (r.error) throw new Error(`${l}: ${r.error.message}`); return r.data }
const email = "intel-owner@test.invalid"
const password = randomBytes(12).toString("base64url")

const users = must(await admin.auth.admin.listUsers(), "list users").users
for (const u of users.filter(u => u.email === email)) await admin.auth.admin.deleteUser(u.id)
const user = must(await admin.auth.admin.createUser({ email, password, email_confirm: true }), "create user").user
const chamber = must(await admin.from("grow_chambers").insert({ owner_id: user.id, name: "MYKOSPHARE Prototype 01", display_code: "MYKO-001" }).select("id").single(), "chamber")
const device = must(await admin.from("grow_devices").insert({ chamber_id: chamber.id, device_type: "controller", name: "MYKOSPHARE Prototype 01", hardware_identifier: "MYKO-001", enabled: true, capabilities: ["temperature", "humidity"] }).select("id").single(), "device")
must(await admin.from("grow_device_credentials").insert({ device_id: device.id, key_hash: createHash("sha256").update(randomBytes(16)).digest("hex"), key_hint: "myk_local1" }), "credential")

const STEP = 30_000
const end = Date.now() - 10_000
const minutesAgo = (t) => (end - t) / 60_000
const rows = []
for (let t = end - 6 * 3_600_000; t <= end; t += STEP) {
  const m = minutesAgo(t)
  if (m > 235 && m < 255) continue // 20 min without signal, ~4 h ago
  let humidity = 68 + Math.sin(t / 900_000) * 1.2
  if (m > 110 && m < 140) humidity = 54 + Math.sin(t / 300_000) // low-humidity episode that recovered
  if (m < 12) humidity = 56 + Math.sin(t / 200_000) * 0.6 // ongoing low humidity
  const temperature = 22.4 + Math.sin(t / 1_800_000) * 0.5
  rows.push({ device_id: device.id, chamber_id: chamber.id, observed_at: new Date(t).toISOString(), origin: "real", temperature: Math.round(temperature * 10) / 10, humidity: Math.round(humidity * 10) / 10 })
}
for (let i = 0; i < rows.length; i += 500) must(await admin.from("grow_readings").insert(rows.slice(i, i + 500)), "readings")
must(await admin.from("grow_devices").update({ last_seen_at: new Date(end).toISOString() }).eq("id", device.id), "last seen")
console.log(JSON.stringify({ email, password, readings: rows.length, chamberId: chamber.id }))
