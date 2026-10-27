/**
 * Logical backup + isolated restore verification for the MYKOSPHARE Supabase database.
 *
 *   node scripts/backup/supabase-backup.mjs dump --source local              (rehearsal, local stack only)
 *   node scripts/backup/supabase-backup.mjs dump --source remote             (read-only, prompts for the DB password)
 *   node scripts/backup/supabase-backup.mjs verify <backup-dir>              (restores into a throwaway container)
 *
 * Guarantees:
 *  - Only reads from the source (pg_dump snapshot + default_transaction_read_only=on).
 *  - The password is read from MYKO_DB_PASSWORD or a hidden prompt, passed to Docker through the
 *    environment, and never written to disk, logs, the manifest or argv.
 *  - A remote source must carry the expected project ref in host or user name.
 *  - Output must live outside the repository (default: ~/mykosphare-backups).
 *  - The restore target is a fresh container with no published ports; never the source.
 */
import { execFileSync, spawnSync } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const PROJECT_REF = "ecvdcsgsiorisszotyew"
const IMAGE = "public.ecr.aws/supabase/postgres:17.11.0.006"
const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..")

const dockerDir = process.platform === "win32"
  ? join(process.env.LOCALAPPDATA ?? "", "Programs", "DockerDesktop", "resources", "bin") : ""
const env = { ...process.env, PATH: dockerDir ? `${dockerDir};${process.env.PATH}` : process.env.PATH }

const log = (m) => console.log(m)
const fail = (m) => { console.error(`ERROR: ${m}`); process.exit(1) }

function docker(args, opts = {}) {
  const r = spawnSync("docker", args, { env: { ...env, ...(opts.env ?? {}) }, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] })
  if (r.status !== 0 && !opts.allowFail) throw new Error(`docker ${args[0]} failed: ${(r.stderr || "").trim().slice(-800)}`)
  return r
}

function sha256(file) {
  return new Promise((ok, ko) => {
    const h = createHash("sha256"); const s = createReadStream(file)
    s.on("data", (d) => h.update(d)); s.on("end", () => ok(h.digest("hex"))); s.on("error", ko)
  })
}

async function askHidden(prompt) {
  if (!process.stdin.isTTY) fail("No interactive terminal: set MYKO_DB_PASSWORD in your own shell session or run from a terminal.")
  process.stdout.write(prompt)
  process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding("utf8")
  return new Promise((ok) => {
    let v = ""
    const on = (c) => {
      for (const ch of c) {
        if (ch === "\r" || ch === "\n") { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off("data", on); process.stdout.write("\n"); return ok(v) }
        if (ch === "\u0003") process.exit(130)
        if (ch === "\u007f" || ch === "\b") v = v.slice(0, -1); else v += ch
      }
    }
    process.stdin.on("data", on)
  })
}

async function sourceConfig(kind) {
  if (kind === "local") {
    return { label: "local-rehearsal", host: "host.docker.internal", port: "54322", user: "postgres", password: "postgres", sslmode: "disable", display: "local Supabase stack (127.0.0.1:54322)" }
  }
  if (kind !== "remote") fail("--source must be 'local' or 'remote'")
  const host = process.env.MYKO_DB_HOST ?? `db.${PROJECT_REF}.supabase.co`
  const user = process.env.MYKO_DB_USER ?? "postgres"
  const port = process.env.MYKO_DB_PORT ?? "5432"
  if (!host.includes(PROJECT_REF) && !user.includes(PROJECT_REF)) {
    fail(`Refusing: neither host nor user contains the expected project ref ${PROJECT_REF}.`)
  }
  const password = process.env.MYKO_DB_PASSWORD ?? await askHidden(`Database password for ${PROJECT_REF} (input hidden): `)
  if (!password) fail("Empty password")
  return { label: PROJECT_REF, host, port, user, password, sslmode: "require", display: `${user}@${host}:${port}` }
}

const pgEnv = (c, extra = {}) => ({ PGHOST: c.host, PGPORT: c.port, PGUSER: c.user, PGPASSWORD: c.password, PGSSLMODE: c.sslmode, PGDATABASE: "postgres", PGOPTIONS: "-c default_transaction_read_only=on", ...extra })
const envFlags = (keys) => keys.flatMap((k) => ["-e", k]) // value inherited from the docker process env, never in argv

function runPg(cfg, tool, args, { mounts = [], extraEnv = {} } = {}) {
  const e = pgEnv(cfg, extraEnv)
  const dockerArgs = ["run", "--rm", ...envFlags(Object.keys(e)), ...mounts.flatMap((m) => ["-v", m]), "--entrypoint", tool, IMAGE, ...args]
  return docker(dockerArgs, { env: e })
}

function lockDown(dir) {
  if (process.platform === "win32") {
    const user = process.env.USERNAME
    spawnSync("icacls", [dir, "/inheritance:r", "/grant:r", `${user}:(OI)(CI)F`], { stdio: "ignore" })
  } else {
    spawnSync("chmod", ["-R", "go-rwx", dir], { stdio: "ignore" })
  }
}

function assertOutsideRepo(dir) {
  const d = resolve(dir).toLowerCase() + sep
  if (d.startsWith(repoRoot.toLowerCase() + sep)) fail("Backup directory must be outside the repository.")
  if (/[\\/](public|\.next)[\\/]/i.test(d)) fail("Backup directory must not be inside a served folder.")
}

async function dump(argv) {
  const kind = argv[argv.indexOf("--source") + 1]
  const outBase = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : join(homedir(), "mykosphare-backups")
  const cfg = await sourceConfig(kind)
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const dir = resolve(outBase, `supabase-${cfg.label}`, stamp)
  assertOutsideRepo(dir)
  mkdirSync(dir, { recursive: true }); lockDown(dir)
  const out = `${dir}:/out`
  const sqlDir = `${here}:/sql:ro`
  log(`Source: ${cfg.display}\nOutput: ${dir}`)

  const ver = runPg(cfg, "psql", ["-At", "-c", "show server_version_num;select version();select current_database(), current_user;"]).stdout.trim().split("\n")
  const major = Math.floor(Number(ver[0]) / 10000)
  log(`Server: ${ver[1]}`)
  if (major !== 17) fail(`Server major ${major} differs from the pg_dump 17 client in ${IMAGE}. Stop and choose a matching client.`)

  const inv = runPg(cfg, "psql", ["-Atq", "-f", "/sql/inventory.sql"], { mounts: [sqlDir] }).stdout
  writeFileSync(join(dir, "inventory-source.json"), inv)
  log("Inventory captured")

  const steps = [
    ["full.dump", "pg_dump", ["-Fc", "--file", "/out/full.dump", "--no-password"]],
    ["roles.sql", "pg_dumpall", ["--roles-only", "--no-role-passwords", "--file", "/out/roles.sql"]],
    ["schema-public.sql", "pg_dump", ["--schema-only", "-n", "public", "--file", "/out/schema-public.sql"]],
    ["data-public-auth-storage.sql", "pg_dump", ["--data-only", "-n", "public", "-n", "auth", "-n", "storage", "--exclude-table", "auth.schema_migrations", "--exclude-table", "storage.migrations", "--file", "/out/data-public-auth-storage.sql"]],
  ]
  for (const [name, tool, args] of steps) { runPg(cfg, tool, args, { mounts: [out] }); log(`Wrote ${name}`) }

  const toc = docker(["run", "--rm", "-v", out, "--entrypoint", "pg_restore", IMAGE, "--list", "/out/full.dump"]).stdout
  writeFileSync(join(dir, "full.dump.toc.txt"), toc)
  const pgDumpVersion = docker(["run", "--rm", "--entrypoint", "pg_dump", IMAGE, "--version"]).stdout.trim()

  const files = {}
  for (const f of readdirSync(dir)) files[f] = { bytes: statSync(join(dir, f)).size, sha256: await sha256(join(dir, f)) }
  const inventory = JSON.parse(inv)
  const manifest = {
    created_utc: new Date().toISOString(),
    source: { kind, label: cfg.label, server_version: inventory.server_version, access: "read-only (pg_dump snapshot, default_transaction_read_only=on)" },
    tools: { image: IMAGE, pg_dump: pgDumpVersion },
    files,
    toc_entries: toc.split("\n").filter((l) => l && !l.startsWith(";")).length,
    counts: Object.fromEntries(inventory.tables.map((t) => [t.table, t.rows])),
    included: ["all schemas in full.dump (custom format, includes auth + storage tables, RLS policies, grants, functions, triggers)", "roles.sql (no passwords)", "schema-public.sql", "data-public-auth-storage.sql"],
    excluded_or_special: [
      "Storage object FILES (only storage.objects metadata rows are in the dump; file bytes live in the storage backend)",
      "Role passwords (--no-role-passwords)",
      "Auth settings, SMTP/OAuth providers, Edge Functions and secrets, Realtime config, Vercel/env configuration (project settings, not in SQL)",
      "Platform schemas may be present in full.dump but are managed by Supabase and not expected to be restorable 1:1 on a hosted project",
    ],
  }
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2))
  lockDown(dir)
  log(`\nBackup complete: ${dir}\nNext: node scripts/backup/supabase-backup.mjs verify "${dir}"`)
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function verify(dir) {
  dir = resolve(dir)
  assertOutsideRepo(dir)
  for (const f of ["full.dump", "manifest.json", "inventory-source.json"]) if (!existsSync(join(dir, f))) fail(`Missing ${f}`)
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"))
  for (const [f, m] of Object.entries(manifest.files)) {
    if ((await sha256(join(dir, f))) !== m.sha256) fail(`Checksum mismatch for ${f}`)
  }
  log("Checksums OK")
  const name = `myko-restore-${randomBytes(4).toString("hex")}`
  const pass = randomBytes(18).toString("hex")
  docker(["run", "-d", "--rm", "--name", name, "-e", `POSTGRES_PASSWORD=${pass}`, IMAGE])
  try {
    let ready = false
    for (let i = 0; i < 60 && !ready; i++) {
      await sleep(2000)
      ready = docker(["exec", name, "pg_isready", "-U", "supabase_admin", "-h", "localhost"], { allowFail: true }).status === 0
    }
    if (!ready) throw new Error("Ephemeral PostgreSQL did not become ready")
    await sleep(3000)
    const exec = (cmd, args, opts = {}) => docker(["exec", "-e", `PGPASSWORD=${pass}`, ...(opts.stdin ? ["-i"] : []), name, cmd, ...args], opts)
    const q = (sql) => exec("psql", ["-U", "supabase_admin", "-h", "localhost", "-d", "postgres", "-At", "-c", sql]).stdout.trim()
    log(`Ephemeral target: ${name} (${q("show server_version")})`)

    docker(["cp", join(dir, "full.dump"), `${name}:/tmp/full.dump`])
    docker(["cp", join(dir, "roles.sql"), `${name}:/tmp/roles.sql`])
    docker(["cp", join(here, "inventory.sql"), `${name}:/tmp/inventory.sql`])
    const psqlArgs = (db) => ["-U", "supabase_admin", "-h", "localhost", "-d", db]
    // Roles first (pre-existing platform roles raise harmless "already exists" errors), then a pristine database,
    // so the dump's own auth/storage/public definitions are restored instead of colliding with the image's defaults.
    const rr = exec("psql", [...psqlArgs("postgres"), "-q", "-f", "/tmp/roles.sql"], { allowFail: true })
    writeFileSync(join(dir, "restore-roles.log"), rr.stderr || "")
    exec("psql", [...psqlArgs("postgres"), "-c", "create database restore_target template template0"])
    const r = exec("pg_restore", [...psqlArgs("restore_target"), "/tmp/full.dump"], { allowFail: true })
    const errLines = (r.stderr || "").split("\n").filter((l) => /error:/i.test(l))
    writeFileSync(join(dir, "restore-errors.log"), r.stderr || "")
    log(`pg_restore exit=${r.status}, error lines=${errLines.length} (see restore-errors.log)`)

    const restored = exec("psql", [...psqlArgs("restore_target"), "-Atq", "-f", "/tmp/inventory.sql"]).stdout
    writeFileSync(join(dir, "inventory-restored.json"), restored)
    const src = JSON.parse(readFileSync(join(dir, "inventory-source.json"), "utf8"))
    const dst = JSON.parse(restored)
    const results = []
    const platformNotes = []
    const check = (label, ok, detail = "") => { results.push({ label, ok, detail }); log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " — " + detail : ""}`) }
    const keyed = (arr, k) => new Map(arr.map((x) => [x[k], x]))

    const srcT = keyed(src.tables, "table"), dstT = keyed(dst.tables, "table")
    for (const [t, s] of srcT) {
      const d = dstT.get(t)
      if (!d) { check(`table ${t} restored`, false, "missing"); continue }
      const same = d.rows === s.rows && d.columns_md5 === s.columns_md5 && d.rls === s.rls && d.rls_forced === s.rls_forced
      check(`table ${t}: rows ${s.rows}→${d.rows}, columns, RLS flags`, same, same ? "" : JSON.stringify({ src: s, dst: d }))
      if (d.acl_md5 !== s.acl_md5) {
        // Platform-managed schemas (auth/storage) get grants from GoTrue/Storage's own migrations, not from the dump.
        if (t.startsWith("public.")) check(`table ${t}: grants`, false, "ACL differs")
        else platformNotes.push(`${t}: grants differ (platform-managed, re-applied by Supabase services)`)
      }
    }
    for (const [key, id] of [["public_policies", "policy"], ["public_functions", "function"], ["public_triggers", "trigger"], ["public_indexes", "index"], ["public_constraints", "constraint"]]) {
      const a = keyed(src[key], id), b = keyed(dst[key], id)
      const bad = [...a].filter(([k, v]) => !b.has(k) || b.get(k).md5 !== v.md5).map(([k]) => k)
      check(`${key}: ${a.size} objects restored identically`, bad.length === 0 && a.size === b.size, bad.join(", "))
    }
    check("public table grants identical", src.public_table_grants_md5 === dst.public_table_grants_md5)
    check("extensions present in source also present in target", src.extensions.every((e) => dst.extensions.includes(e)), src.extensions.filter((e) => !dst.extensions.includes(e)).join(", "))
    writeFileSync(join(dir, "restore-report.json"), JSON.stringify({ platform_notes: platformNotes, verified_utc: new Date().toISOString(), target_server: dst.server_version, pg_restore_exit: r.status, error_lines: errLines.length, results }, null, 2))
    if (platformNotes.length) log(`NOTE ${platformNotes.length} auth/storage tables differ only in grants (platform-managed)`)
    const failed = results.filter((x) => !x.ok)
    log(failed.length ? `\nRESTORE VERIFICATION: ${failed.length} FAILED of ${results.length}` : `\nRESTORE VERIFICATION: all ${results.length} checks passed`)
    process.exitCode = failed.length ? 2 : 0
  } finally {
    docker(["rm", "-f", name], { allowFail: true })
    log("Ephemeral container removed")
  }
}

const [cmd, ...rest] = process.argv.slice(2)
if (cmd === "dump") await dump(rest)
else if (cmd === "verify") await verify(rest[0] ?? fail("verify needs a backup directory"))
else fail("usage: dump --source local|remote [--out DIR] | verify DIR")
