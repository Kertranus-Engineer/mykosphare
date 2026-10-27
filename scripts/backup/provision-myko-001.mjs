/**
 * PRODUCTION WRITE (authorized 2026-10-27): runs docs/cloud-connect/provision-myko-001.sql.template once,
 * with the SHA-256 and hint of an individual device key. The plaintext key never reaches this script:
 * run-remote-provision.ps1 hands over only MYKO_KEY_HASH / MYKO_KEY_HINT. Password comes from PGPASSWORD.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PROJECT_REF = "ecvdcsgsiorisszotyew"
const IMAGE = "public.ecr.aws/supabase/postgres:17.11.0.006"
const here = dirname(fileURLToPath(import.meta.url))
const hash = process.env.MYKO_KEY_HASH ?? "", hint = process.env.MYKO_KEY_HINT ?? ""
if (!/^[0-9a-f]{64}$/.test(hash) || !/^myk_[A-Za-z0-9_-]{6}$/.test(hint)) { console.error("invalid hash/hint"); process.exit(1) }
if (!process.env.PGPASSWORD) { console.error("PGPASSWORD missing"); process.exit(1) }
const dockerDir = process.platform === "win32" ? join(process.env.LOCALAPPDATA ?? "", "Programs", "DockerDesktop", "resources", "bin") : ""
const env = { ...process.env, PATH: dockerDir ? `${dockerDir};${process.env.PATH}` : process.env.PATH,
  PGHOST: "aws-1-us-east-1.pooler.supabase.com", PGPORT: "5432", PGUSER: `postgres.${PROJECT_REF}`, PGDATABASE: "postgres", PGSSLMODE: "require" }
delete env.PGOPTIONS
const work = join(homedir(), "mykosphare-backups", "provision")
mkdirSync(work, { recursive: true })
const sqlFile = join(work, "provision.sql")
const psql = (args) => spawnSync("docker", ["run", "--rm", ...["PGHOST", "PGPORT", "PGUSER", "PGDATABASE", "PGSSLMODE", "PGPASSWORD"].flatMap((k) => ["-e", k]),
  "-v", `${work}:/work`, "--entrypoint", "psql", IMAGE, "-v", "ON_ERROR_STOP=1", "-At", ...args], { env, encoding: "utf8" })

try {
  const tpl = readFileSync(resolve(here, "..", "..", "docs", "cloud-connect", "provision-myko-001.sql.template"), "utf8")
    .replace("<REPLACE_WITH_64_LOWERCASE_HEX_SHA256>", hash).replace("<REPLACE_WITH_KEY_HINT>", hint)
  writeFileSync(sqlFile, tpl)
  const pre = psql(["-c", "select (select count(*) from public.grow_devices)||','||(select count(*) from public.grow_chambers)"])
  if (pre.status !== 0) throw new Error(`pre-check failed: ${pre.stderr.trim().slice(-300)}`)
  if (pre.stdout.trim() !== "0,0") throw new Error(`Grow tables are not empty (${pre.stdout.trim()}); refusing to provision`)
  const run = psql(["-f", "/work/provision.sql"])
  if (run.status !== 0) throw new Error(`provisioning failed (transaction rolled back): ${run.stderr.trim().slice(-400)}`)
  console.log("Provisioning transaction committed.")
  const check = psql(["-F", " | ", "-c",
    "select u.email, c.name, c.display_code, d.hardware_identifier, d.device_type, d.enabled, d.capabilities, " +
    "(select count(*) from public.grow_device_credentials k where k.device_id = d.id and k.status = 'active') as active_keys, " +
    "(select key_hint from public.grow_device_credentials k where k.device_id = d.id) as key_hint " +
    "from public.grow_devices d join public.grow_chambers c on c.id = d.chamber_id join auth.users u on u.id = c.owner_id"])
  console.log("Registered (email | chamber | code | hardware id | type | enabled | capabilities | active keys | hint):")
  console.log(check.stdout.trim())
  const counts = psql(["-c", "select (select count(*) from public.grow_chambers)||' chamber, '||(select count(*) from public.grow_devices)||' device, '||(select count(*) from public.grow_device_credentials)||' credential, '||(select count(*) from public.grow_readings)||' readings'"])
  console.log(`Counts: ${counts.stdout.trim()}`)
} finally {
  rmSync(sqlFile, { force: true })
}
