-- MYKOSPHARE 2.0 — Real cultivation loop v1 + organism-agnostic seam.
-- Additive to 202609300001_grow_data_platform.sql (never edited).

-- 1. Stages are PROFILE-DRIVEN. The fungal enum locked every run to mushroom
--    biology; stage ids become text validated by the application against the
--    run's profile. Existing values convert losslessly. The enum type is kept.
alter table public.grow_cultivation_runs alter column confirmed_stage type text using confirmed_stage::text;
alter table public.grow_cultivation_runs add constraint grow_runs_stage_shape check (confirmed_stage ~ '^[a-z][a-z0-9_]{0,47}$');
alter table public.grow_stage_events alter column stage type text using stage::text;
alter table public.grow_stage_events add constraint grow_stage_events_stage_shape check (stage ~ '^[a-z][a-z0-9_]{0,47}$');

-- 2. Organism profile seam. NULL stages = fungal default stage table (in code).
alter table public.grow_species_profiles
  add column organism_kind text not null default 'fungus' check (organism_kind in ('fungus', 'plant', 'flowering_plant')),
  add column morphology text not null default 'fungal' check (morphology in ('fungal', 'plant', 'flowering_plant')),
  add column stages jsonb check (stages is null or jsonb_typeof(stages) = 'array'),
  add column capabilities text[];

-- 3. Devices: what is INSTALLED, and whether the device may ingest at all.
alter table public.grow_devices
  add column enabled boolean not null default true,
  add column capabilities text[] not null default '{}'
    check (capabilities <@ array['temperature','humidity','co2','light','substrate_moisture','ph','ec','mass','vision']::text[]);

-- 4. Per-device credentials (replaces the shared ingestion secret).
--    Only a SHA-256 of a 256-bit random key is stored; several active rows per
--    device allow rotation. No RLS policy at all: service role only, so no
--    browser session can read or write hashes.
create table public.grow_device_credentials (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.grow_devices(id) on delete cascade,
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  key_hint text not null check (char_length(key_hint) between 4 and 16),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((status = 'revoked') = (revoked_at is not null))
);
create index grow_device_credentials_device_idx on public.grow_device_credentials(device_id) where status = 'active';
alter table public.grow_device_credentials enable row level security;

-- 5. Run events: a closed vocabulary of facts/transitions (no telemetry spam)
--    and a closed provenance vocabulary for stage and run events.
alter table public.grow_run_events add constraint grow_run_events_type_check check (type in (
  'cultivation_started', 'stage_confirmed', 'environment_attention', 'environment_recovered', 'capture_received', 'harvest_confirmed'
)) not valid;
alter table public.grow_run_events add constraint grow_run_events_source_check check (source in (
  'sensor', 'simulation', 'manual', 'vision_model', 'ai_supervisor', 'deterministic'
)) not valid;
alter table public.grow_stage_events add constraint grow_stage_events_source_check check (source in ('manual')) not valid;

-- 6. Security fix: the previous grow_captures policy's WITH CHECK did not
--    correlate the subquery with the inserted row's run_id, so any user owning
--    ANY run could attach captures to another user's run.
-- 7. Lifecycle writes go through the server application layer (service role,
--    after ownership checks). Authenticated browser sessions keep READ access
--    to their own graph and lose direct writes to runs/events/captures.
drop policy grow_captures_owner on public.grow_captures;
drop policy grow_runs_owner on public.grow_cultivation_runs;
drop policy grow_stage_events_owner on public.grow_stage_events;
drop policy grow_run_events_owner on public.grow_run_events;

create policy grow_runs_owner_read on public.grow_cultivation_runs for select to authenticated
  using (exists (select 1 from public.grow_chambers c where c.id = chamber_id and c.owner_id = auth.uid()));
create policy grow_stage_events_owner_read on public.grow_stage_events for select to authenticated
  using (exists (select 1 from public.grow_cultivation_runs r join public.grow_chambers c on c.id = r.chamber_id where r.id = run_id and c.owner_id = auth.uid()));
create policy grow_run_events_owner_read on public.grow_run_events for select to authenticated
  using (exists (select 1 from public.grow_cultivation_runs r join public.grow_chambers c on c.id = r.chamber_id where r.id = run_id and c.owner_id = auth.uid()));
create policy grow_captures_owner_read on public.grow_captures for select to authenticated
  using (exists (select 1 from public.grow_cultivation_runs r join public.grow_chambers c on c.id = r.chamber_id where r.id = run_id and c.owner_id = auth.uid()));

-- 8. The sample Pleurotus profile declares what it benefits from (supported ≠ installed).
update public.grow_species_profiles
  set capabilities = array['temperature','humidity','co2','vision','mass']
  where species = 'Pleurotus ostreatus' and version = 'sample-v1' and capabilities is null;

-- 9. A chamber is provisioned by a trusted operator. Browser sessions can
-- read only their own chamber; device and credential registration stays server-side.
drop policy grow_chambers_owner on public.grow_chambers;
create policy grow_chambers_owner_read on public.grow_chambers for select to authenticated
  using (owner_id = (select auth.uid()));
revoke insert, update, delete on public.grow_chambers from anon, authenticated;
grant select on public.grow_chambers, public.grow_devices, public.grow_readings to authenticated;
revoke all on public.grow_device_credentials from public, anon, authenticated;
grant select, insert, update on public.grow_device_credentials to service_role;
grant select, update on public.grow_devices to service_role;
grant select on public.grow_cultivation_runs to service_role;
grant select, insert on public.grow_readings to service_role;
grant select, insert, update on public.grow_device_state to service_role;

-- 10. Atomic, shared rate limit per authenticated device. Unauthenticated
-- requests cannot consume another device's budget. No raw IP or key is stored.
create table public.grow_ingestion_rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table public.grow_ingestion_rate_limits enable row level security;
revoke all on public.grow_ingestion_rate_limits from public, anon, authenticated;
grant select, insert, update on public.grow_ingestion_rate_limits to service_role;

create function public.grow_consume_ingestion_limit(p_bucket text, p_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from clock_timestamp()) / 60) * 60);
  v_attempts integer;
begin
  if p_bucket is null or p_limit is null or p_limit not between 1 and 120 or
     p_bucket !~ '^device:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;
  insert into public.grow_ingestion_rate_limits(bucket, window_start, attempts)
    values (p_bucket, v_window, 1)
    on conflict (bucket) do update
      set window_start = excluded.window_start,
          attempts = case
            when public.grow_ingestion_rate_limits.window_start = excluded.window_start
            then public.grow_ingestion_rate_limits.attempts + 1 else 1 end
    returning attempts into v_attempts;
  return v_attempts <= p_limit;
end;
$$;
revoke execute on function public.grow_consume_ingestion_limit(text, integer) from public, anon, authenticated;
grant execute on function public.grow_consume_ingestion_limit(text, integer) to service_role;

-- 11. The database derives the chamber and active run from the authenticated
-- device. Reading, device state, and last_seen_at commit together. A retry with
-- the same device + sample time succeeds as a duplicate without another row.
alter table public.grow_devices add constraint grow_devices_id_chamber_key unique (id, chamber_id);
alter table public.grow_readings add constraint grow_readings_device_chamber_fk
  foreign key (device_id, chamber_id) references public.grow_devices(id, chamber_id);

create function public.grow_record_device_reading(
  p_device_id uuid, p_observed_at timestamptz,
  p_temperature numeric, p_humidity numeric, p_clock text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_chamber_id uuid;
  v_run_id uuid;
  v_reading_id uuid;
  v_received_at timestamptz := clock_timestamp();
begin
  if p_device_id is null or p_observed_at is null or
     p_observed_at < v_received_at - interval '120 seconds' or
     p_observed_at > v_received_at + interval '30 seconds' or
     p_clock is null or p_clock not in ('device', 'server') or
     (p_temperature is null and p_humidity is null) or
     (p_temperature is not null and (p_temperature < -50 or p_temperature > 100)) or
     (p_humidity is not null and (p_humidity < 0 or p_humidity > 100)) then
    raise exception 'invalid device reading' using errcode = '22023';
  end if;

  select chamber_id into v_chamber_id from public.grow_devices
    where id = p_device_id and enabled = true;
  if v_chamber_id is null then
    raise exception 'device unavailable' using errcode = '22023';
  end if;
  select id into v_run_id from public.grow_cultivation_runs
    where chamber_id = v_chamber_id and status = 'active' limit 1;

  insert into public.grow_readings
    (device_id, chamber_id, run_id, observed_at, origin, temperature, humidity, metadata)
    values (p_device_id, v_chamber_id, v_run_id, p_observed_at, 'real',
            p_temperature, p_humidity, jsonb_build_object('clock', p_clock))
    on conflict (device_id, observed_at, origin) do nothing
    returning id into v_reading_id;

  insert into public.grow_device_state(device_id, status, last_seen_at, updated_at)
    values (p_device_id, 'online', v_received_at, v_received_at)
    on conflict (device_id) do update
      set status = 'online',
          last_seen_at = greatest(public.grow_device_state.last_seen_at, excluded.last_seen_at),
          updated_at = v_received_at;
  update public.grow_devices
    set last_seen_at = greatest(last_seen_at, v_received_at)
    where id = p_device_id;

  return jsonb_build_object('inserted', v_reading_id is not null,
                            'runAttached', v_run_id is not null);
end;
$$;
revoke execute on function public.grow_record_device_reading(uuid, timestamptz, numeric, numeric, text)
  from public, anon, authenticated;
grant execute on function public.grow_record_device_reading(uuid, timestamptz, numeric, numeric, text)
  to service_role;

-- 12. Pin search_path for both the Grow trigger and the pre-existing legacy
-- updated_at trigger (when present), satisfying the current DB advisor.
alter function public.grow_set_updated_at() set search_path = '';
do $$ begin
  if to_regprocedure('public.handle_updated_at()') is not null then
    alter function public.handle_updated_at() set search_path = '';
  end if;
end $$;
