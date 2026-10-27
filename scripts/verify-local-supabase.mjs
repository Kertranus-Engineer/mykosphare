/** Local-only integration smoke test. Never accepts a hosted Supabase URL. */
import { execFileSync } from "node:child_process"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"
import { chromium } from "playwright-core"

const dockerDir = process.platform === "win32"
  ? join(process.env.LOCALAPPDATA ?? "", "Programs", "DockerDesktop", "resources", "bin")
  : ""
const path = dockerDir ? `${dockerDir};${process.env.PATH}` : process.env.PATH
const status = JSON.parse(execFileSync(process.execPath, [join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js"), "status", "-o", "json"], {
  cwd: process.cwd(), encoding: "utf8", env: { ...process.env, PATH: path }, stdio: ["ignore", "pipe", "pipe"],
}))
if (status.API_URL !== "http://127.0.0.1:54321" ||
    status.REST_URL !== "http://127.0.0.1:54321/rest/v1" ||
    !String(status.DB_URL).includes("@127.0.0.1:54322/")) {
  throw new Error("Refusing to run outside the isolated local Supabase stack")
}

const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const makeUser = () => createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const suffix = randomBytes(6).toString("hex")
const emailA = `cloud-owner-${suffix}@test.invalid`
const emailB = `cloud-other-${suffix}@test.invalid`
const password = randomBytes(24).toString("base64url")
const key = `myk_${randomBytes(32).toString("base64url")}`
const keyHash = createHash("sha256").update(key).digest("hex")
const createdUsers = []
let chamberId
let deviceId
let readingAt

function ok(condition, label) {
  if (!condition) throw new Error(label)
  console.log(`PASS ${label}`)
}
function value(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

async function main() {
try {
  for (const email of [emailA, emailB]) {
    const data = value(await admin.auth.admin.createUser({ email, password, email_confirm: true }), "create local Auth user")
    createdUsers.push(data.user.id)
  }
  const owner = makeUser()
  const other = makeUser()
  value(await owner.auth.signInWithPassword({ email: emailA, password }), "owner login")
  value(await other.auth.signInWithPassword({ email: emailB, password }), "other login")
  ok(Boolean((await owner.auth.getUser()).data.user), "Auth: synthetic owner login")

  const chamber = value(await admin.from("grow_chambers").insert({ owner_id: createdUsers[0], name: "MYKOSPHARE Prototype 01", display_code: "MYKO-001" }).select("id").single(), "register local chamber")
  chamberId = chamber.id
  const device = value(await admin.from("grow_devices").insert({ chamber_id: chamberId, device_type: "controller", name: "MYKOSPHARE Prototype 01", hardware_identifier: "MYKO-001", enabled: true, capabilities: ["temperature", "humidity"] }).select("id").single(), "register local device")
  deviceId = device.id
  value(await admin.from("grow_device_credentials").insert({ device_id: deviceId, key_hash: keyHash, key_hint: key.slice(0, 10) }), "register local device credential")
  ok((value(await owner.from("grow_chambers").select("id"), "owner chamber read") ?? []).length === 1, "PostgREST: owner sees chamber")
  ok((value(await owner.from("grow_devices").select("id"), "owner device read") ?? []).length === 1, "PostgREST: owner sees MYKO-001")
  ok((value(await other.from("grow_chambers").select("id"), "other chamber read") ?? []).length === 0, "RLS: other owner sees no chamber")
  ok((value(await other.from("grow_devices").select("id"), "other device read") ?? []).length === 0, "RLS: other owner sees no device")
  ok(Boolean((await owner.from("grow_device_credentials").select("key_hash")).error), "RLS/grants: owner cannot read device hashes")
  ok(Boolean((await owner.from("grow_chambers").insert({ owner_id: createdUsers[0], name: "not allowed" })).error), "RLS/grants: browser cannot provision")

  const bucket = `device:${randomUUID()}`
  const attempts = await Promise.all(Array.from({ length: 12 }, () => admin.rpc("grow_consume_ingestion_limit", { p_bucket: bucket, p_limit: 6 })))
  ok(attempts.every(result => !result.error) && attempts.filter(result => result.data === true).length === 6 && attempts.filter(result => result.data === false).length === 6, "rate limit: 6 of 12 concurrent database calls accepted")

  readingAt = new Date().toISOString()
  const input = { p_device_id: deviceId, p_observed_at: readingAt, p_temperature: 20.7, p_humidity: 80.4, p_clock: "device" }
  const first = value(await admin.rpc("grow_record_device_reading", input), "first atomic reading")
  const retry = value(await admin.rpc("grow_record_device_reading", input), "idempotent retry")
  ok(first.inserted === true && retry.inserted === false, "telemetry: atomic insert and idempotent retry")
  const ownerRows = value(await owner.from("grow_readings").select("origin,temperature,humidity,device_id"), "owner readings")
  const otherRows = value(await other.from("grow_readings").select("id"), "other readings")
  ok(ownerRows.length === 1 && ownerRows[0].origin === "real" && ownerRows[0].device_id === deviceId && otherRows.length === 0, "PostgREST/RLS: real reading belongs only to owner")
  const invalid = await admin.rpc("grow_record_device_reading", { ...input, p_observed_at: new Date().toISOString(), p_temperature: 500 })
  ok(Boolean(invalid.error), "telemetry: invalid temperature rejected")
  if (process.env.LOCAL_APP_URL) {
    if (process.env.LOCAL_APP_URL !== "http://127.0.0.1:4317") throw new Error("Refusing a non-local Next.js API")
    const endpoint = `${process.env.LOCAL_APP_URL}/api/v2/device/readings`
    const body = JSON.stringify({ observedAt: new Date().toISOString(), temperature: 20.6, humidity: 80.3 })
    const headers = { "content-type": "application/json", "x-device-id": "MYKO-001", "x-device-key": key }
    const bad = await fetch(endpoint, { method: "POST", headers: { ...headers, "x-device-key": "myk_invalid" }, body })
    ok(bad.status === 401, "HTTP: wrong device key rejected")
    const accepted = await fetch(endpoint, { method: "POST", headers, body })
    ok(accepted.status === 201, "HTTP: authenticated sensor reading accepted")
    const duplicate = await fetch(endpoint, { method: "POST", headers, body })
    ok(duplicate.status === 200 && (await duplicate.json()).duplicate === true, "HTTP: lost-response retry is idempotent")
    const homeWithoutSession = await fetch(`${process.env.LOCAL_APP_URL}/api/v2/home`)
    ok(homeWithoutSession.status === 401, "HTTP: HOME requires user session")
    const legacy = await fetch(`${process.env.LOCAL_APP_URL}/api/data`, { method: "POST", body: "{}", redirect: "manual" })
    ok(legacy.status === 410, "HTTP: insecure legacy route blocked in preview")
    const readingsAfterHttp = value(await owner.from("grow_readings").select("id"), "HTTP persisted readings")
    ok(readingsAfterHttp.length === 2, "HTTP: reading persisted for owner")
    if (process.env.LOCAL_BROWSER_TEST === "1") {
      const chrome = join(process.env.PROGRAMFILES ?? "", "Google", "Chrome", "Application", "chrome.exe")
      if (!existsSync(chrome)) throw new Error("Local Chrome browser is unavailable")
      const browser = await chromium.launch({ executablePath: chrome, headless: true })
      try {
        for (const [email, shouldSeeReading] of [[emailA, true], [emailB, false]]) {
          const context = await browser.newContext()
          const page = await context.newPage()
          await page.goto(`${process.env.LOCAL_APP_URL}/auth/login?next=%2Fhome%2Fconectar%3Fview%3Dreal`)
          await page.locator('input[name="email"]').fill(email)
          await page.locator('input[name="password"]').fill(password)
          await page.locator('button[type="submit"]').click()
          await page.waitForURL(url => url.pathname === "/home/conectar", { timeout: 60_000 })
          ok(page.url().includes("/home/conectar"), "Browser: login returns to HOME Connect, not dashboard")
          if (shouldSeeReading) {
            await page.getByText("MYKOSPHARE Prototype 01").waitFor({ timeout: 30_000 })
            await page.locator("#dispositivo").getByText("Conectado", { exact: true }).waitFor({ timeout: 30_000 })
            await page.goto(`${process.env.LOCAL_APP_URL}/home?view=real`)
            await page.waitForFunction(() => document.body.innerText.includes("20.6") && document.body.innerText.includes("80.3"))
            console.log("PASS Browser: owner sees live temperature and humidity in HOME")
          } else {
            await page.getByText("Tu cuenta todavía no tiene una cámara registrada.").waitFor({ timeout: 30_000 })
            ok(!(await page.locator("body").innerText()).includes("20.6"), "Browser: other account cannot see owner's reading")
          }
        }
      } finally {
        // On Windows a browser with active polling can stall close(); finish
        // local data cleanup even if its CDP shutdown handshake does not reply.
        await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5_000))])
      }
    }
  }
  console.log("PASS local Supabase Auth, PostgREST, RLS, device credential schema, concurrent rate limit, atomic telemetry")
} finally {
  if (deviceId) {
    await admin.from("grow_readings").delete().eq("device_id", deviceId)
    await admin.from("grow_device_state").delete().eq("device_id", deviceId)
    await admin.from("grow_device_credentials").delete().eq("device_id", deviceId)
    await admin.from("grow_devices").delete().eq("id", deviceId)
  }
  if (chamberId) await admin.from("grow_chambers").delete().eq("id", chamberId)
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id)
}
}

main().then(() => process.exit(0), error => { console.error(error); process.exit(1) })
