/** Local-only: keeps appending synthetic readings to the seeded local chamber so the UI can be checked live. */
import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"

const dockerDir = process.platform === "win32" ? join(process.env.LOCALAPPDATA ?? "", "Programs", "DockerDesktop", "resources", "bin") : ""
const status = JSON.parse(execFileSync(process.execPath, [join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js"), "status", "-o", "json"], {
  cwd: process.cwd(), encoding: "utf8", env: { ...process.env, PATH: dockerDir ? `${dockerDir};${process.env.PATH}` : process.env.PATH }, stdio: ["ignore", "pipe", "pipe"],
}))
if (status.API_URL !== "http://127.0.0.1:54321") throw new Error("Refusing to run outside the isolated local Supabase stack")
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const humidity = Number(process.argv[2] ?? 56)
const minutes = Number(process.argv[3] ?? 15)
const { data: device } = await admin.from("grow_devices").select("id,chamber_id").eq("hardware_identifier", "MYKO-001").single()
if (!device) throw new Error("run scripts/seed-local-intelligence.mjs first")
const end = Date.now() + minutes * 60_000
while (Date.now() < end) {
  const at = new Date().toISOString()
  await admin.from("grow_readings").insert({ device_id: device.id, chamber_id: device.chamber_id, observed_at: at, origin: "real", temperature: 22.5, humidity })
  await admin.from("grow_devices").update({ last_seen_at: at }).eq("id", device.id)
  await new Promise(r => setTimeout(r, 30_000))
}
