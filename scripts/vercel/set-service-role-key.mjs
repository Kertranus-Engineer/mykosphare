/**
 * Validates a Supabase privileged key against the MYKOSPHARE project (status codes only, nothing printed),
 * then stores it as a SENSITIVE, server-only Production variable on the linked Vercel project.
 * The value arrives in the SERVICE_ROLE_VALUE env var and goes to the Vercel CLI through stdin (no argv, no disk).
 */
import { spawnSync } from "node:child_process"

const PROJECT_URL = "https://ecvdcsgsiorisszotyew.supabase.co"
const NAME = "SUPABASE_SERVICE_ROLE_KEY"
const value = process.env.SERVICE_ROLE_VALUE ?? ""
if (value.length < 20 || /\s/.test(value)) { console.error("The value looks empty or contains whitespace."); process.exit(1) }

const headers = { apikey: value, ...(value.startsWith("eyJ") ? { Authorization: `Bearer ${value}` } : {}) }
const probe = async (table) => (await fetch(`${PROJECT_URL}/rest/v1/${table}?select=*&limit=0`, { headers })).status
const credStatus = await probe("grow_device_credentials") // readable only with a privileged key
if (credStatus !== 200) {
  console.error(`This key is not a privileged key for ecvdcsgsiorisszotyew (HTTP ${credStatus}). Nothing was stored.`)
  console.error("Use the 'service_role' (legacy) or 'secret' key from Project Settings > API Keys, not the anon/publishable key.")
  process.exit(2)
}
console.log("Key validated: privileged access to the MYKOSPHARE project confirmed.")

const run = spawnSync("npx", ["--yes", "vercel@65.4.0", "env", "add", NAME, "--environment", "production", "--sensitive", "--force", "--yes"],
  { input: value, encoding: "utf8", shell: true, cwd: process.cwd() })
const out = `${run.stdout}${run.stderr}`.split(value).join("<redacted>")
console.log(out.trim().split("\n").slice(-6).join("\n"))
if (run.status !== 0) { console.error("Vercel CLI failed; nothing else changed."); process.exit(run.status ?? 1) }
console.log(`Stored ${NAME} as a sensitive Production-only variable.`)
