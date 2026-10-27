/**
 * Local-only HTTP check of the per-device ingestion limit. Never accepts a hosted Supabase URL.
 * Requires the local Supabase stack and `next dev -p 4317 -H 127.0.0.1` running with
 * CLOUD_CONNECT_PREVIEW_ONLY=1 against it.  Run: LOCAL_APP_URL=http://127.0.0.1:4317 node scripts/verify-local-rate-limit.mjs
 */
import { execFileSync } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"

const dockerDir = process.platform === "win32"
  ? join(process.env.LOCALAPPDATA ?? "", "Programs", "DockerDesktop", "resources", "bin") : ""
const path = dockerDir ? `${dockerDir};${process.env.PATH}` : process.env.PATH
const status = JSON.parse(execFileSync(process.execPath, [join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js"), "status", "-o", "json"], {
  cwd: process.cwd(), encoding: "utf8", env: { ...process.env, PATH: path }, stdio: ["ignore", "pipe", "pipe"],
}))
if (status.API_URL !== "http://127.0.0.1:54321" || process.env.LOCAL_APP_URL !== "http://127.0.0.1:4317") {
  throw new Error("Refusing to run outside the isolated local stack")
}
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const ok = (c, l) => { if (!c) throw new Error(`FAIL ${l}`); console.log(`PASS ${l}`) }
const must = (r, l) => { if (r.error) throw new Error(`${l}: ${r.error.message}`); return r.data }
const suffix = randomBytes(5).toString("hex")
const endpoint = `${process.env.LOCAL_APP_URL}/api/v2/device/readings`
let userId; let chamberId; const deviceIds = []

async function register(name, hw) {
  const key = `myk_${randomBytes(32).toString("base64url")}`
  const dev = must(await admin.from("grow_devices").insert({ chamber_id: chamberId, device_type: "controller", name, hardware_identifier: hw, enabled: true, capabilities: ["temperature", "humidity"] }).select("id").single(), "device")
  deviceIds.push(dev.id)
  must(await admin.from("grow_device_credentials").insert({ device_id: dev.id, key_hash: createHash("sha256").update(key).digest("hex"), key_hint: key.slice(0, 10) }), "credential")
  return { hw, key, id: dev.id }
}
const post = (d, key, ms) => fetch(endpoint, {
  method: "POST", headers: { "content-type": "application/json", "x-device-id": d.hw, "x-device-key": key },
  body: JSON.stringify({ observedAt: new Date(Date.now() - ms).toISOString(), temperature: 20.5, humidity: 80 }),
}).then((r) => r.status)

try {
  userId = must(await admin.auth.admin.createUser({ email: `rl-${suffix}@test.invalid`, password: randomBytes(24).toString("base64url"), email_confirm: true }), "user").user.id
  chamberId = must(await admin.from("grow_chambers").insert({ owner_id: userId, name: "RL test", display_code: `RL-${suffix}` }).select("id").single(), "chamber").id
  const a = await register("RL A", `RLA-${suffix}`)
  const b = await register("RL B", `RLB-${suffix}`)

  const wrong = await Promise.all(Array.from({ length: 20 }, () => post(a, "myk_wrong", 0)))
  ok(wrong.every((s) => s === 401), "20 wrong-key requests -> all 401")
  const burst = await Promise.all(Array.from({ length: 12 }, (_, i) => post(a, a.key, i * 1000)))
  const accepted = burst.filter((s) => s === 201).length
  const limited = burst.filter((s) => s === 429).length
  ok(accepted === 6 && limited === 6, `12 concurrent valid requests -> 6 accepted, 6 limited (got ${accepted}/${limited}); wrong keys consumed no quota`)
  ok((await post(a, a.key, 20_000)) === 429, "device A stays limited within the same minute")
  ok((await post(b, b.key, 0)) === 201, "device B unaffected by device A's limit")
  const stored = must(await admin.from("grow_readings").select("id", { count: "exact" }).eq("device_id", a.id), "count A").length
  ok(stored === 6, "only accepted readings persisted for device A")
  console.log("PASS per-device rate limit, concurrency and wrong-key behaviour over HTTP")
} finally {
  for (const id of deviceIds) {
    await admin.from("grow_readings").delete().eq("device_id", id)
    await admin.from("grow_device_state").delete().eq("device_id", id)
    await admin.from("grow_device_credentials").delete().eq("device_id", id)
    await admin.from("grow_devices").delete().eq("id", id)
  }
  if (chamberId) await admin.from("grow_chambers").delete().eq("id", chamberId)
  if (userId) await admin.auth.admin.deleteUser(userId)
}
