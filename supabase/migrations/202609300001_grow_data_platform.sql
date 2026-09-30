-- MYKOSPHARE 2.0 data platform. Coexists with 1.x telemetry/devices tables.
create type public.grow_origin as enum ('real', 'simulated');
create type public.grow_device_type as enum ('controller', 'camera', 'sensor_node');
create type public.grow_device_status as enum ('online', 'offline', 'unknown');
create type public.grow_run_status as enum ('active', 'completed', 'aborted');
create type public.grow_profile_status as enum ('sample', 'experimental', 'validated');
create type public.grow_stage as enum ('inoculation', 'colonization', 'consolidation', 'primordia', 'fruiting', 'harvest');

create table public.grow_chambers (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, display_code text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id, display_code)
);
create table public.grow_devices (
  id uuid primary key default gen_random_uuid(), chamber_id uuid not null references public.grow_chambers(id) on delete cascade,
  device_type public.grow_device_type not null, name text not null, hardware_identifier text not null unique,
  last_seen_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.grow_device_state (
  device_id uuid primary key references public.grow_devices(id) on delete cascade,
  status public.grow_device_status not null default 'unknown', last_seen_at timestamptz,
  firmware_version text, reported_actuators jsonb not null default '{}'::jsonb, config_version text, updated_at timestamptz not null default now()
);
create table public.grow_species_profiles (
  id uuid primary key default gen_random_uuid(), species text not null, display_name text not null, version text not null,
  validation_status public.grow_profile_status not null, stage_targets jsonb not null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(species, version)
);
create table public.grow_cultivation_runs (
  id uuid primary key default gen_random_uuid(), chamber_id uuid not null references public.grow_chambers(id) on delete restrict,
  species_profile_id uuid not null references public.grow_species_profiles(id) on delete restrict, name text not null,
  started_at timestamptz not null, ended_at timestamptz, confirmed_stage public.grow_stage not null,
  status public.grow_run_status not null default 'active', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((status = 'active' and ended_at is null) or status <> 'active')
);
create unique index grow_one_active_run_per_chamber on public.grow_cultivation_runs(chamber_id) where status = 'active';
create table public.grow_stage_events (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.grow_cultivation_runs(id) on delete cascade,
  stage public.grow_stage not null, confirmed_at timestamptz not null, source text not null,
  actor_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table public.grow_readings (
  id uuid primary key default gen_random_uuid(), device_id uuid not null references public.grow_devices(id) on delete restrict,
  chamber_id uuid not null references public.grow_chambers(id) on delete restrict, run_id uuid references public.grow_cultivation_runs(id) on delete set null,
  observed_at timestamptz not null, received_at timestamptz not null default now(), origin public.grow_origin not null,
  temperature numeric(6,2), humidity numeric(5,2), metadata jsonb not null default '{}'::jsonb,
  check (temperature is not null or humidity is not null), unique(device_id, observed_at, origin)
);
create table public.grow_run_events (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.grow_cultivation_runs(id) on delete cascade,
  type text not null, occurred_at timestamptz not null, source text not null, severity text,
  actor_id uuid references auth.users(id) on delete set null, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.grow_captures (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.grow_cultivation_runs(id) on delete cascade,
  device_id uuid references public.grow_devices(id) on delete set null, storage_path text not null unique,
  captured_at timestamptz not null, uploaded_at timestamptz not null default now(), origin public.grow_origin not null,
  sha256 text, width integer, height integer, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index grow_devices_chamber_idx on public.grow_devices(chamber_id);
create index grow_readings_latest_idx on public.grow_readings(chamber_id, observed_at desc);
create index grow_readings_run_idx on public.grow_readings(run_id, observed_at desc);
create index grow_stage_events_run_idx on public.grow_stage_events(run_id, confirmed_at desc);
create index grow_run_events_run_idx on public.grow_run_events(run_id, occurred_at desc);
create index grow_captures_run_idx on public.grow_captures(run_id, captured_at desc);

create or replace function public.grow_set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger grow_chambers_updated before update on public.grow_chambers for each row execute function public.grow_set_updated_at();
create trigger grow_devices_updated before update on public.grow_devices for each row execute function public.grow_set_updated_at();
create trigger grow_runs_updated before update on public.grow_cultivation_runs for each row execute function public.grow_set_updated_at();

alter table public.grow_chambers enable row level security;
alter table public.grow_devices enable row level security;
alter table public.grow_device_state enable row level security;
alter table public.grow_species_profiles enable row level security;
alter table public.grow_cultivation_runs enable row level security;
alter table public.grow_stage_events enable row level security;
alter table public.grow_readings enable row level security;
alter table public.grow_run_events enable row level security;
alter table public.grow_captures enable row level security;
create policy grow_chambers_owner on public.grow_chambers for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy grow_profiles_read on public.grow_species_profiles for select to authenticated using (true);
create policy grow_devices_owner on public.grow_devices for select to authenticated using (exists (select 1 from public.grow_chambers c where c.id = chamber_id and c.owner_id = auth.uid()));
create policy grow_device_state_owner on public.grow_device_state for select to authenticated using (exists (select 1 from public.grow_devices d join public.grow_chambers c on c.id=d.chamber_id where d.id=device_id and c.owner_id=auth.uid()));
create policy grow_runs_owner on public.grow_cultivation_runs for all to authenticated using (exists (select 1 from public.grow_chambers c where c.id=chamber_id and c.owner_id=auth.uid())) with check (exists (select 1 from public.grow_chambers c where c.id=chamber_id and c.owner_id=auth.uid()));
create policy grow_stage_events_owner on public.grow_stage_events for all to authenticated using (exists (select 1 from public.grow_cultivation_runs r join public.grow_chambers c on c.id=r.chamber_id where r.id=run_id and c.owner_id=auth.uid())) with check (exists (select 1 from public.grow_cultivation_runs r join public.grow_chambers c on c.id=r.chamber_id where r.id=run_id and c.owner_id=auth.uid()));
create policy grow_readings_owner on public.grow_readings for select to authenticated using (exists (select 1 from public.grow_chambers c where c.id=chamber_id and c.owner_id=auth.uid()));
create policy grow_run_events_owner on public.grow_run_events for all to authenticated using (exists (select 1 from public.grow_cultivation_runs r join public.grow_chambers c on c.id=r.chamber_id where r.id=run_id and c.owner_id=auth.uid())) with check (exists (select 1 from public.grow_cultivation_runs r join public.grow_chambers c on c.id=r.chamber_id where r.id=run_id and c.owner_id=auth.uid()));
create policy grow_captures_owner on public.grow_captures for all to authenticated using (exists (select 1 from public.grow_cultivation_runs r join public.grow_chambers c on c.id=r.chamber_id where r.id=run_id and c.owner_id=auth.uid())) with check (exists (select 1 from public.grow_cultivation_runs r join public.grow_chambers c on c.id=r.chamber_id and c.owner_id=auth.uid()));

insert into public.grow_species_profiles (species, display_name, version, validation_status, stage_targets, metadata)
values ('Pleurotus ostreatus', 'Sample oyster mushroom', 'sample-v1', 'sample', '{"inoculation":{"temperature":{"min":20,"max":24,"criticalMin":16,"criticalMax":28},"humidity":{"min":60,"max":75,"criticalMin":45,"criticalMax":90}},"colonization":{"temperature":{"min":20,"max":24,"criticalMin":16,"criticalMax":28},"humidity":{"min":60,"max":75,"criticalMin":45,"criticalMax":90}},"consolidation":{"temperature":{"min":20,"max":24,"criticalMin":16,"criticalMax":28},"humidity":{"min":60,"max":75,"criticalMin":45,"criticalMax":90}},"primordia":{"temperature":{"min":20,"max":24,"criticalMin":16,"criticalMax":28},"humidity":{"min":60,"max":75,"criticalMin":45,"criticalMax":90}},"fruiting":{"temperature":{"min":20,"max":24,"criticalMin":16,"criticalMax":28},"humidity":{"min":60,"max":75,"criticalMin":45,"criticalMax":90}},"harvest":{"temperature":{"min":20,"max":24,"criticalMin":16,"criticalMax":28},"humidity":{"min":60,"max":75,"criticalMin":45,"criticalMax":90}}}', '{"notice":"SAMPLE - NOT SCIENTIFICALLY VALIDATED"}')
on conflict (species, version) do nothing;
