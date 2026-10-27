/**
 * PRODUCTION WRITE: replaces MYKO-001's lost, never-used credential with a new one (hash only), in one transaction:
 * inserts the new hash, then revokes exactly one active credential whose hint is MYKO_OLD_HINT.
 * Refuses if the device already has readings. Password via PGPASSWORD; the plaintext key never reaches this script.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const PROJECT_REF = "ecvdcsgsiorisszotyew"
const IMAGE = "public.ecr.aws/supabase/postgres:17.11.0.006"
const hash = process.env.MYKO_KEY_HASH ?? "", hint = process.env.MYKO_KEY_HINT ?? "", oldHint = process.env.MYKO_OLD_HINT ?? ""
if (!/^[0-9a-f]{64}$/.test(hash) || !/^myk_[A-Za-z0-9_-]{6}$/.test(hint) || !/^myk_[A-Za-z0-9_-]{6}$/.test(oldHint) || hint === oldHint) { console.error("invalid hash/hint"); process.exit(1) }
if (!process.env.PGPASSWORD) { console.error("PGPASSWORD missing"); process.exit(1) }
const dockerDir = process.platform === "win32" ? join(process.env.LOCALAPPDATA ?? "", "Programs", "DockerDesktop", "resources", "bin") : ""
const env = { ...process.env, PATH: dockerDir ? `${dockerDir};${process.env.PATH}` : process.env.PATH,
  PGHOST: "aws-1-us-east-1.pooler.supabase.com", PGPORT: "5432", PGUSER: `postgres.${PROJECT_REF}`, PGDATABASE: "postgres", PGSSLMODE: "require" }
delete env.PGOPTIONS
const work = join(homedir(), "mykosphare-backups", "provision")
mkdirSync(work, { recursive: true })
const sqlFile = join(work, "rotate.sql")
const psql = (args) => spawnSync("docker", ["run", "--rm", ...["PGHOST", "PGPORT", "PGUSER", "PGDATABASE", "PGSSLMODE", "PGPASSWORD"].flatMap((k) => ["-e", k]),
  "-v", `${work}:/work`, "--entrypoint", "psql", IMAGE, "-v", "ON_ERROR_STOP=1", "-At", ...args], { env, encoding: "utf8" })
try {
  writeFileSync(sqlFile, `begin;
do $rotate$
declare v_dev uuid; v_n int;
begin
  select id into strict v_dev from public.grow_devices where hardware_identifier = 'MYKO-001';
  if exists (select 1 from public.grow_readings where device_id = v_dev) then
    raise exception 'device already has readings; rotate deliberately, not with this script';
  end if;
  insert into public.grow_device_credentials(device_id, key_hash, key_hint) values (v_dev, '${hash}', '${hint}');
  update public.grow_device_credentials set status = 'revoked', revoked_at = now()
    where device_id = v_dev and status = 'active' and key_hint = '${oldHint}';
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'expected to revoke exactly one credential, got %', v_n; end if;
end;
$rotate$;
commit;
`)
  const run = psql(["-f", "/work/rotate.sql"])
  if (run.status !== 0) throw new Error(`rotation failed (rolled back): ${run.stderr.trim().slice(-400)}`)
  console.log("Rotation transaction committed.")
  const r = psql(["-F", " | ", "-c", "select k.key_hint, k.status, (k.revoked_at is not null) as revoked from public.grow_device_credentials k join public.grow_devices d on d.id = k.device_id where d.hardware_identifier = 'MYKO-001' order by k.created_at"])
  console.log("Credentials (hint | status | revoked):")
  console.log(r.stdout.trim())
} finally {
  rmSync(sqlFile, { force: true })
}
