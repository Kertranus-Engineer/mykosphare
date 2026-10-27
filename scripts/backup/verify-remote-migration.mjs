/**
 * Read-only checks around the remote Grow migration (password via PGPASSWORD, never printed).
 *   pre  <backup-dir>  -> exits 0 only if the remote is still in the backed-up state (no Grow objects, legacy intact)
 *   post <backup-dir>  -> compares the remote with the backup (legacy untouched) and with the rehearsal on the restored copy
 */
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PROJECT_REF = "ecvdcsgsiorisszotyew"
const IMAGE = "public.ecr.aws/supabase/postgres:17.11.0.006"
const here = dirname(fileURLToPath(import.meta.url))
const host = process.env.MYKO_DB_HOST ?? "aws-1-us-east-1.pooler.supabase.com"
const user = process.env.MYKO_DB_USER ?? `postgres.${PROJECT_REF}`
if (!user.includes(PROJECT_REF) && !host.includes(PROJECT_REF)) { console.error("wrong project"); process.exit(1) }
if (!process.env.PGPASSWORD) { console.error("PGPASSWORD missing"); process.exit(1) }
const dockerDir = process.platform === "win32" ? join(process.env.LOCALAPPDATA ?? "", "Programs", "DockerDesktop", "resources", "bin") : ""
const env = { ...process.env, PATH: dockerDir ? `${dockerDir};${process.env.PATH}` : process.env.PATH,
  PGHOST: host, PGPORT: "5432", PGUSER: user, PGDATABASE: "postgres", PGSSLMODE: "require", PGOPTIONS: "-c default_transaction_read_only=on" }
const pg = (args, mounts = []) => {
  const r = spawnSync("docker", ["run", "--rm", ...["PGHOST", "PGPORT", "PGUSER", "PGDATABASE", "PGSSLMODE", "PGOPTIONS", "PGPASSWORD"].flatMap((k) => ["-e", k]),
    ...mounts.flatMap((m) => ["-v", m]), "--entrypoint", "psql", IMAGE, "-Atq", ...args], { env, encoding: "utf8", maxBuffer: 1 << 28 })
  if (r.status !== 0) throw new Error((r.stderr || "psql failed").trim().slice(-400))
  return r.stdout.trim()
}
const [mode, dirArg] = process.argv.slice(2)
const dir = resolve(dirArg)
let failures = 0
const check = (label, ok, detail = "") => { if (!ok) failures++; console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " — " + detail : ""}`) }
const live = JSON.parse(pg(["-f", "/sql/inventory.sql"], [`${here}:/sql:ro`]))
const backup = JSON.parse(readFileSync(join(dir, "inventory-source.json"), "utf8"))
const byTable = (inv) => new Map(inv.tables.map((t) => [t.table, t]))
const lt = byTable(live), bt = byTable(backup)
const grow = [...lt.keys()].filter((t) => t.startsWith("public.grow_"))

if (mode === "pre") {
  check("remote still has no Grow tables", grow.length === 0, grow.join(", "))
  check("remote has no migration history yet", live.applied_migrations === null || live.applied_migrations === 0)
  const drift = [...bt].filter(([t, b]) => { const l = lt.get(t); return !l || l.columns_md5 !== b.columns_md5 || l.rls !== b.rls })
  check("legacy/auth/storage structure identical to the verified backup", drift.length === 0, drift.map(([t]) => t).join(", "))
  for (const t of ["public.logs", "public.telemetry"]) console.log(`INFO ${t}: ${bt.get(t).rows} rows at backup, ${lt.get(t).rows} now (the published dashboard may keep writing)`)
} else if (mode === "post") {
  const rehearsal = JSON.parse(readFileSync(join(dir, "inventory-post-migration-copy.json"), "utf8"))
  const rt = byTable(rehearsal)
  const legacy = [...bt.keys()]
  const bad = legacy.filter((t) => { const l = lt.get(t), b = bt.get(t); return !l || l.columns_md5 !== b.columns_md5 || l.rls !== b.rls || l.rows < b.rows })
  check(`all ${legacy.length} pre-existing tables: same columns and RLS, no rows lost`, bad.length === 0, bad.join(", "))
  const noGrowth = ["public.alerts", "public.devices", "public.operator_profiles", "public.settings", "auth.users", "auth.identities", "storage.objects"].filter((t) => lt.get(t).rows !== bt.get(t).rows)
  console.log(`INFO tables whose row count changed since backup: ${noGrowth.join(", ") || "none"}; logs ${bt.get("public.logs").rows}→${lt.get("public.logs").rows}, telemetry ${bt.get("public.telemetry").rows}→${lt.get("public.telemetry").rows}`)
  const growExpected = [...rt.keys()].filter((t) => t.startsWith("public.grow_"))
  const missing = growExpected.filter((t) => !lt.has(t)), noRls = growExpected.filter((t) => lt.has(t) && !lt.get(t).rls)
  const colDiff = growExpected.filter((t) => lt.has(t) && lt.get(t).columns_md5 !== rt.get(t).columns_md5)
  check(`${growExpected.length} Grow tables present with RLS enabled and the rehearsed columns`, missing.length === 0 && noRls.length === 0 && colDiff.length === 0, [...missing, ...noRls, ...colDiff].join(", "))
  const aclDiff = growExpected.filter((t) => lt.has(t) && lt.get(t).acl_md5 !== rt.get(t).acl_md5)
  check("Grow table grants identical to the rehearsal", aclDiff.length === 0, aclDiff.join(", "))
  for (const [key, id] of [["public_policies", "policy"], ["public_functions", "function"], ["public_triggers", "trigger"], ["public_indexes", "index"], ["public_constraints", "constraint"]]) {
    const a = new Map(rehearsal[key].map((x) => [x[id], x])), b = new Map(live[key].map((x) => [x[id], x]))
    const diff = [...a].filter(([k, v]) => !b.has(k) || b.get(k).md5 !== v.md5 || (v.acl_md5 && b.get(k).acl_md5 !== v.acl_md5)).map(([k]) => k)
    check(`${key}: ${a.size} objects identical to the rehearsal`, diff.length === 0 && a.size === b.size, diff.join(", "))
  }
  const q = (s) => pg(["-c", s])
  check("anon/authenticated cannot execute privileged functions; service_role can",
    q("select not has_function_privilege('anon','public.grow_record_device_reading(uuid,timestamptz,numeric,numeric,text)','execute') and not has_function_privilege('authenticated','public.grow_record_device_reading(uuid,timestamptz,numeric,numeric,text)','execute') and not has_function_privilege('anon','public.grow_consume_ingestion_limit(text,integer)','execute') and not has_function_privilege('authenticated','public.grow_consume_ingestion_limit(text,integer)','execute') and has_function_privilege('service_role','public.grow_record_device_reading(uuid,timestamptz,numeric,numeric,text)','execute')") === "t")
  check("anon/authenticated cannot read device credential hashes",
    q("select not has_table_privilege('anon','public.grow_device_credentials','select') and not has_table_privilege('authenticated','public.grow_device_credentials','select')") === "t")
  check("migration history lists exactly the two Grow versions",
    q("select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations where version in ('202609300001','202610010001')") === "202609300001,202610010001")
  check("no Grow data yet (no chambers, devices, readings)", q("select (select count(*) from public.grow_chambers)+(select count(*) from public.grow_devices)+(select count(*) from public.grow_readings)") === "0")
} else { console.error("usage: pre|post <backup-dir>"); process.exit(1) }
console.log(failures ? `\n${mode.toUpperCase()}: ${failures} FAILED` : `\n${mode.toUpperCase()}: all checks passed`)
process.exit(failures ? 2 : 0)
