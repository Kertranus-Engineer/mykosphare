/**
 * Rehearses the two pending Grow migrations on a throwaway RESTORED COPY of the real backup.
 * Production is never contacted. Usage: node scripts/backup/rehearse-migrations.mjs <backup-dir>
 * Applies both migrations in one transaction, checks legacy objects are untouched, then exercises the
 * MYKO-001 provisioning template (synthetic key hash), the ingestion RPC and RLS inside the copy.
 */
import { spawnSync } from "node:child_process"
import { randomBytes, createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const IMAGE = "public.ecr.aws/supabase/postgres:17.11.0.006"
const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, "..", "..")
const dockerDir = process.platform === "win32" ? join(process.env.LOCALAPPDATA ?? "", "Programs", "DockerDesktop", "resources", "bin") : ""
const env = { ...process.env, PATH: dockerDir ? `${dockerDir};${process.env.PATH}` : process.env.PATH }
const dir = resolve(process.argv[2] ?? (console.error("backup dir required"), process.exit(1)))
const docker = (a, allowFail = false) => {
  const r = spawnSync("docker", a, { env, encoding: "utf8", maxBuffer: 1 << 28 })
  if (r.status !== 0 && !allowFail) throw new Error(`docker ${a[0]}: ${(r.stderr || "").slice(-600)}`)
  return r
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const name = `myko-migrate-${randomBytes(4).toString("hex")}`
const pass = randomBytes(18).toString("hex")
let failures = 0
const check = (label, ok, detail = "") => { if (!ok) failures++; console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " — " + detail : ""}`) }

docker(["run", "-d", "--rm", "--name", name, "-e", `POSTGRES_PASSWORD=${pass}`, IMAGE])
try {
  for (let i = 0; i < 60; i++) { await sleep(2000); if (docker(["exec", name, "pg_isready", "-U", "supabase_admin", "-h", "localhost"], true).status === 0) break }
  await sleep(3000)
  const sql = (user, db, q, extra = []) => {
    const r = docker(["exec", "-e", `PGPASSWORD=${pass}`, name, "psql", "-U", user, "-h", "localhost", "-d", db, "-At", "-v", "ON_ERROR_STOP=1", ...extra, "-c", q], true)
    return { ok: r.status === 0, out: r.stdout.trim(), err: r.stderr.trim() }
  }
  const admin = (q) => sql("supabase_admin", "restore_target", q)
  docker(["cp", join(dir, "full.dump"), `${name}:/tmp/full.dump`])
  docker(["cp", join(dir, "roles.sql"), `${name}:/tmp/roles.sql`])
  docker(["cp", join(here, "inventory.sql"), `${name}:/tmp/inventory.sql`])
  for (const f of ["202609300001_grow_data_platform.sql", "202610010001_grow_cultivation_loop.sql"]) docker(["cp", join(repo, "supabase", "migrations", f), `${name}:/tmp/${f}`])
  const base = ["exec", "-e", `PGPASSWORD=${pass}`, name]
  docker([...base, "psql", "-U", "supabase_admin", "-h", "localhost", "-d", "postgres", "-q", "-f", "/tmp/roles.sql"], true)
  docker([...base, "psql", "-U", "supabase_admin", "-h", "localhost", "-d", "postgres", "-c", "create database restore_target template template0"])
  const rs = docker([...base, "pg_restore", "-U", "supabase_admin", "-h", "localhost", "-d", "restore_target", "/tmp/full.dump"], true)
  check("restored copy of the real backup", rs.status === 0, `pg_restore exit ${rs.status}`)
  const inv = (tag) => {
    const r = docker([...base, "psql", "-U", "supabase_admin", "-h", "localhost", "-d", "restore_target", "-Atq", "-f", "/tmp/inventory.sql"])
    writeFileSync(join(dir, `inventory-${tag}.json`), r.stdout); return JSON.parse(r.stdout)
  }
  // Harness only: a database recreated from template0 does not give `postgres` CREATE on public as hosted projects do.
  admin("grant create, usage on schema public to postgres")
  const body = () => admin("select md5(prosrc) from pg_proc where proname='handle_updated_at' and pronamespace='public'::regnamespace").out
  const bodyBefore = body()
  const before = inv("pre-migration-copy")

  // Apply both migrations in ONE transaction, as the postgres role (what a hosted migration would use).
  const apply = docker([...base, "psql", "-U", "postgres", "-h", "localhost", "-d", "restore_target", "-v", "ON_ERROR_STOP=1", "-1",
    "-f", "/tmp/202609300001_grow_data_platform.sql", "-f", "/tmp/202610010001_grow_cultivation_loop.sql"], true)
  writeFileSync(join(dir, "migration-rehearsal.log"), `${apply.stdout}\n${apply.stderr}`)
  check("both migrations apply in a single transaction on the real-data copy", apply.status === 0, apply.status === 0 ? "" : apply.stderr.slice(-400))
  if (apply.status !== 0) throw new Error("migration failed; see migration-rehearsal.log")
  const after = inv("post-migration-copy")

  const bt = new Map(before.tables.map((t) => [t.table, t])), at = new Map(after.tables.map((t) => [t.table, t]))
  const legacy = [...bt.keys()].filter((t) => t.startsWith("public.") || t.startsWith("auth.") || t.startsWith("storage."))
  const changed = legacy.filter((t) => { const a = at.get(t), b = bt.get(t); return !a || a.rows !== b.rows || a.columns_md5 !== b.columns_md5 || a.rls !== b.rls || a.acl_md5 !== b.acl_md5 })
  check(`all ${legacy.length} pre-existing tables unchanged (rows, columns, RLS, grants)`, changed.length === 0, changed.join(", "))
  const bp = new Map(before.public_policies.map((p) => [p.policy, p.md5])), ap = new Map(after.public_policies.map((p) => [p.policy, p.md5]))
  const lost = [...bp].filter(([k, v]) => ap.get(k) !== v).map(([k]) => k)
  check(`all ${bp.size} legacy policies unchanged`, lost.length === 0, lost.join(", "))
  const grow = after.tables.filter((t) => t.table.startsWith("public.grow_"))
  check(`${grow.length} Grow tables created, all with RLS enabled`, grow.length >= 11 && grow.every((t) => t.rls))
  const q = (s) => admin(s).out
  check("handle_updated_at keeps its body; search_path is now fixed", body() === bodyBefore && /search_path/.test(q("select coalesce(proconfig::text,'') from pg_proc where proname='handle_updated_at' and pronamespace='public'::regnamespace")))
  check("privileged functions not executable by anon/authenticated",
    q("select not has_function_privilege('anon','public.grow_record_device_reading(uuid,timestamptz,numeric,numeric,text)','execute') and not has_function_privilege('authenticated','public.grow_record_device_reading(uuid,timestamptz,numeric,numeric,text)','execute') and not has_function_privilege('authenticated','public.grow_consume_ingestion_limit(text,integer)','execute') and has_function_privilege('service_role','public.grow_record_device_reading(uuid,timestamptz,numeric,numeric,text)','execute')") === "t")
  check("device credential hashes unreadable by anon/authenticated",
    q("select not has_table_privilege('anon','public.grow_device_credentials','select') and not has_table_privilege('authenticated','public.grow_device_credentials','select')") === "t")

  // Provisioning template with a SYNTHETIC key hash, run against the copy.
  const hash = createHash("sha256").update(randomBytes(32)).digest("hex")
  const tpl = readFileSync(join(repo, "docs", "cloud-connect", "provision-myko-001.sql.template"), "utf8")
    .replace("<REPLACE_WITH_64_LOWERCASE_HEX_SHA256>", hash).replace("<REPLACE_WITH_KEY_HINT>", "myk_rehrsl")
  writeFileSync(join(dir, "provision.rehearsal.sql"), tpl)
  docker(["cp", join(dir, "provision.rehearsal.sql"), `${name}:/tmp/provision.sql`])
  const prov = docker([...base, "psql", "-U", "postgres", "-h", "localhost", "-d", "restore_target", "-v", "ON_ERROR_STOP=1", "-f", "/tmp/provision.sql"], true)
  check("MYKO-001 provisioning template succeeds for the real owner account (in the copy)", prov.status === 0, prov.status === 0 ? "" : prov.stderr.slice(-300))
  const again = docker([...base, "psql", "-U", "postgres", "-h", "localhost", "-d", "restore_target", "-v", "ON_ERROR_STOP=1", "-f", "/tmp/provision.sql"], true)
  check("second provisioning is rejected", again.status !== 0 && /already exists/.test(again.stderr))
  check("one chamber, one device, one credential created", q("select (select count(*) from grow_chambers)||','||(select count(*) from grow_devices)||','||(select count(*) from grow_device_credentials)") === "1,1,1")

  // Ingestion + RLS inside the copy.
  const dev = q("select id from grow_devices where hardware_identifier='MYKO-001'")
  const ts = new Date().toISOString()
  const rpc = sql("supabase_admin", "restore_target", `set role service_role; select (grow_record_device_reading('${dev}', '${ts}', 20.7, 80.4, 'device')::jsonb)->>'inserted'`).out.split("\n").pop()
  check("service_role records a real reading atomically", rpc === "true")
  const owner = q("select owner_id from grow_chambers limit 1")
  const asUser = (uid, s) => sql("supabase_admin", "restore_target", `select set_config('request.jwt.claims', '{"sub":"${uid}","role":"authenticated"}', false); set role authenticated; ${s}`).out.split("\n").pop()
  const other = q(`select id from auth.users where id <> '${owner}' limit 1`)
  check("owner sees the reading through RLS", asUser(owner, "select count(*) from grow_readings") === "1")
  check("another real account sees no reading, chamber or device", asUser(other, "select (select count(*) from grow_readings)+(select count(*) from grow_chambers)+(select count(*) from grow_devices)") === "0")
  check("authenticated user cannot create a chamber", /permission denied|row-level security/.test(sql("supabase_admin", "restore_target", `select set_config('request.jwt.claims', '{"sub":"${owner}","role":"authenticated"}', false); set role authenticated; insert into grow_chambers(owner_id,name) values ('${owner}','x')`).err))
  const legacyAnon = q("select count(*) from pg_policies where schemaname='public' and 'anon' = any(roles) and cmd in ('INSERT','UPDATE') and tablename not like 'grow_%'")
  console.log(`NOTE legacy tables keep ${legacyAnon} anon INSERT/UPDATE policies (pre-existing, not changed by the migrations)`)
} finally {
  docker(["rm", "-f", name], true)
  console.log("Ephemeral container removed")
}
console.log(failures ? `\nREHEARSAL: ${failures} FAILED` : "\nREHEARSAL: all checks passed")
process.exitCode = failures ? 2 : 0
