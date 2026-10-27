import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { PGlite } from "@electric-sql/pglite"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const migration = (name) => readFile(resolve(root, "supabase/migrations", name), "utf8")
const db = new PGlite()

async function one(sql, params = []) {
  return (await db.query(sql, params)).rows[0]
}

async function asRole(role, sql, params = []) {
  await db.exec(`set role ${role}`)
  try {
    return await db.query(sql, params)
  } finally {
    await db.exec("reset role")
  }
}

try {
  // Minimal Supabase Auth/role fixture. No production connection or real user data.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text unique, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    create table public.devices (id text primary key, updated_at timestamptz default now());
    create table public.telemetry (id bigint primary key, device_id text);
    create table public.alerts (id text primary key);
    create table public.logs (id text primary key);
    create table public.operator_profiles (id text primary key);
    create table public.settings (id text primary key);
    create function public.handle_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at = now(); return new; end $$;
    create trigger devices_updated_at before update on public.devices
      for each row execute function public.handle_updated_at();
  `)
  await db.exec(await migration("202609300001_grow_data_platform.sql"))
  await db.exec(await migration("202610010001_grow_cultivation_loop.sql"))

  const tables = (await db.query("select tablename from pg_tables where schemaname='public' and tablename like 'grow_%' order by tablename")).rows.map((r) => r.tablename)
  for (const name of ["grow_chambers", "grow_devices", "grow_device_credentials", "grow_readings", "grow_ingestion_rate_limits"]) {
    assert(tables.includes(name), `${name} missing`)
  }
  assert.equal((await one("select count(*)::int as n from public.devices")).n, 0)
  assert.equal((await one("select count(*)::int as n from public.telemetry")).n, 0)
  for (const name of ["alerts", "devices", "logs", "operator_profiles", "settings", "telemetry"]) {
    assert.equal((await one("select to_regclass($1) is not null as exists", [`public.${name}`])).exists, true)
  }
  assert.match((await one("select proconfig from pg_proc where oid='public.handle_updated_at()'::regprocedure")).proconfig[0], /^search_path=(?:""|)$/)
  await db.exec("insert into public.devices(id) values ('legacy-test'); update public.devices set id='legacy-test' where id='legacy-test'")
  assert.equal((await one("select updated_at is not null as ok from public.devices where id='legacy-test'")).ok, true)

  const ownerA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  const ownerB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
  const chamberB = "22222222-2222-4222-8222-222222222222"
  const deviceB = "44444444-4444-4444-8444-444444444444"
  await db.query("insert into auth.users(id,email,email_confirmed_at) values ($1,'owner-a@test.invalid',now()),($2,'owner-b@test.invalid',now())", [ownerA, ownerB])
  const provision = (await readFile(resolve(root, "docs/cloud-connect/provision-myko-001.sql.template"), "utf8"))
    .replace("kertranus@gmail.com", "owner-a@test.invalid")
    .replace("<REPLACE_WITH_64_LOWERCASE_HEX_SHA256>", "a".repeat(64))
    .replace("<REPLACE_WITH_KEY_HINT>", "test-a")
  await db.exec(provision)
  await assert.rejects(() => db.exec(provision), "a second provisioning must not reassign MYKO-001")
  await db.exec("rollback")
  const chamber = await one("select id,owner_id,name,display_code from public.grow_chambers where display_code='MYKO-001'")
  assert.equal(chamber.owner_id, ownerA)
  assert.equal(chamber.name, "MYKOSPHARE Prototype 01")
  const chamberA = chamber.id
  const device = await one("select id,chamber_id,name,capabilities from public.grow_devices where hardware_identifier='MYKO-001'")
  assert.equal(device.chamber_id, chamberA)
  assert.equal(device.name, "MYKOSPHARE Prototype 01")
  assert.deepEqual(device.capabilities, ["temperature", "humidity"])
  const deviceA = device.id
  await db.query("insert into public.grow_chambers(id,owner_id,name,display_code) values ($1,$2,'Other','OTHER')", [chamberB, ownerB])
  await db.query("insert into public.grow_devices(id,chamber_id,device_type,name,hardware_identifier,enabled,capabilities) values ($1,$2,'controller','Other','OTHER',true,array['temperature'])", [deviceB, chamberB])
  await db.query("insert into public.grow_device_credentials(device_id,key_hash,key_hint) values ($1,$2,'test-b')", [deviceB, "b".repeat(64)])

  const rls = await one("select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'grow_%' and c.relkind='r' and c.relrowsecurity")
  assert.equal(rls.n, tables.length, "every Grow table must have RLS")
  assert.equal((await one("select has_table_privilege('authenticated','public.grow_device_credentials','select') as allowed")).allowed, false)
  assert.equal((await one("select has_function_privilege('authenticated','public.grow_record_device_reading(uuid,timestamptz,numeric,numeric,text)','execute') as allowed")).allowed, false)
  assert.equal((await one("select has_function_privilege('authenticated','public.grow_consume_ingestion_limit(text,integer)','execute') as allowed")).allowed, false)
  assert.equal((await one("select has_function_privilege('service_role','public.grow_record_device_reading(uuid,timestamptz,numeric,numeric,text)','execute') as allowed")).allowed, true)

  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [ownerA])
  assert.equal((await asRole("authenticated", "select count(*)::int as n from public.grow_chambers")).rows[0].n, 1)
  assert.equal((await asRole("authenticated", "select hardware_identifier from public.grow_devices")).rows[0].hardware_identifier, "MYKO-001")
  await assert.rejects(() => asRole("authenticated", "select * from public.grow_device_credentials"))
  await assert.rejects(() => asRole("authenticated", "insert into public.grow_chambers(owner_id,name) values ($1,'forbidden')", [ownerB]))

  const sampled = (await one("select clock_timestamp() as at")).at
  const input = [deviceA, sampled, 20.7, 80.3, "device"]
  const insert = await asRole("service_role", "select public.grow_record_device_reading($1,$2,$3,$4,$5) as result", input)
  assert.deepEqual(insert.rows[0].result, { inserted: true, runAttached: false })
  const retry = await asRole("service_role", "select public.grow_record_device_reading($1,$2,$3,$4,$5) as result", input)
  assert.equal(retry.rows[0].result.inserted, false)
  assert.equal((await one("select count(*)::int as n from public.grow_readings where device_id=$1", [deviceA])).n, 1)
  assert.equal((await one("select status::text as status from public.grow_device_state where device_id=$1", [deviceA])).status, "online")

  assert.equal((await asRole("authenticated", "select count(*)::int as n from public.grow_readings")).rows[0].n, 1)
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [ownerB])
  assert.equal((await asRole("authenticated", "select count(*)::int as n from public.grow_readings")).rows[0].n, 0)
  assert.equal((await asRole("authenticated", "select count(*)::int as n from public.grow_chambers")).rows[0].n, 1)
  assert.equal((await asRole("authenticated", "select hardware_identifier from public.grow_devices")).rows[0].hardware_identifier, "OTHER")

  await assert.rejects(() => db.query("insert into public.grow_readings(device_id,chamber_id,observed_at,origin,temperature) values ($1,$2,now(),'real',21)", [deviceA, chamberB]))
  await assert.rejects(() => asRole("anon", "select public.grow_consume_ingestion_limit($1,6)", [`device:${deviceA}`]))
  await assert.rejects(() => asRole("service_role", "select public.grow_consume_ingestion_limit('all-attempts',120)"))
  for (let i = 0; i < 7; i++) {
    const result = (await asRole("service_role", "select public.grow_consume_ingestion_limit($1,6) as allowed", [`device:${deviceA}`])).rows[0]
    assert.equal(result.allowed, i < 6)
  }
  assert.equal((await one("select attempts from public.grow_ingestion_rate_limits where bucket=$1", [`device:${deviceA}`])).attempts, 7)

  // A failing state write must roll the reading back within the RPC call.
  await db.exec(`create function public.test_reject_state() returns trigger language plpgsql as $$ begin raise exception 'forced state failure'; end $$;
    create trigger test_reject_state before update on public.grow_device_state for each row execute function public.test_reject_state();`)
  const failedAt = (await one("select clock_timestamp() as at")).at
  await assert.rejects(() => asRole("service_role", "select public.grow_record_device_reading($1,$2,21,81,'device')", [deviceA, failedAt]))
  assert.equal((await one("select count(*)::int as n from public.grow_readings where device_id=$1", [deviceA])).n, 1)
  await db.exec("drop trigger test_reject_state on public.grow_device_state; drop function public.test_reject_state()")
  await assert.rejects(() => asRole("service_role", "select public.grow_record_device_reading($1,now(),101,50,'device')", [deviceA]))

  const profile = await one("select id from public.grow_species_profiles where version='sample-v1'")
  const run = await one("insert into public.grow_cultivation_runs(chamber_id,species_profile_id,name,started_at,confirmed_stage) values ($1,$2,'Pilot run',now(),'inoculation') returning id", [chamberA, profile.id])
  const withRun = await asRole("service_role", "select public.grow_record_device_reading($1,now(),21,82,'device') as result", [deviceA])
  assert.deepEqual(withRun.rows[0].result, { inserted: true, runAttached: true })
  assert.equal((await one("select run_id from public.grow_readings where device_id=$1 order by received_at desc limit 1", [deviceA])).run_id, run.id)

  console.log("PASS: migrations, legacy coexistence, MYKO-001 template, FK, RLS, owner isolation, grants, rate, idempotence, atomic rollback.")
} finally {
  await db.close()
}
