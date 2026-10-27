-- Device control: desired state (versioned configs), reported state, and a device event log.
-- Purely additive. Existing tables are not altered. Applied to production ONLY with the owner's explicit approval.
--
-- Model
--   desired  = public.grow_device_configs (immutable rows, one per version, written by the owner through the server)
--   reported = public.grow_device_state   (existing: config_version = last APPLIED version, reported_actuators = controller summary)
--   history  = public.grow_device_events  (config received/applied/rejected, decisions, simulated actuations, safety, errors)
--
-- A config holds environmental TARGETS, a MODE and the actuator CAPABILITIES that are allowed. Never low-level commands.
-- Writers: only the server (service role). Browsers can read their own devices' rows through RLS and write nothing.

create table public.grow_device_configs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.grow_devices(id) on delete cascade,
  version integer not null check (version > 0),
  mode text not null check (mode in ('observation', 'simulation', 'assisted', 'automatic')),
  targets jsonb not null check (jsonb_typeof(targets) = 'object' and pg_column_size(targets) <= 1024),
  capabilities jsonb not null default '{}'::jsonb check (jsonb_typeof(capabilities) = 'object' and pg_column_size(capabilities) <= 512),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (device_id, version)
);
create index grow_device_configs_latest_idx on public.grow_device_configs(device_id, version desc);

create table public.grow_device_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.grow_devices(id) on delete cascade,
  /** Device-generated identity (boot id + sequence) so a retry after a lost response never duplicates a row. */
  event_key text not null check (char_length(event_key) between 1 and 64),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  kind text not null check (kind in ('boot', 'config_received', 'config_applied', 'config_rejected', 'decision', 'actuation', 'safety', 'error')),
  simulated boolean not null default true,
  config_version integer,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object' and pg_column_size(detail) <= 1024),
  unique (device_id, event_key)
);
create index grow_device_events_recent_idx on public.grow_device_events(device_id, occurred_at desc);

alter table public.grow_device_configs enable row level security;
alter table public.grow_device_events enable row level security;

create policy grow_device_configs_owner_read on public.grow_device_configs for select to authenticated
  using (exists (select 1 from public.grow_devices d join public.grow_chambers c on c.id = d.chamber_id
                 where d.id = device_id and c.owner_id = (select auth.uid())));
create policy grow_device_events_owner_read on public.grow_device_events for select to authenticated
  using (exists (select 1 from public.grow_devices d join public.grow_chambers c on c.id = d.chamber_id
                 where d.id = device_id and c.owner_id = (select auth.uid())));

revoke all on public.grow_device_configs, public.grow_device_events from public, anon, authenticated;
grant select on public.grow_device_configs, public.grow_device_events to authenticated;
grant select, insert on public.grow_device_configs to service_role;
grant select, insert on public.grow_device_events to service_role;

-- Atomic, gap-free versioning per device. Server only.
create function public.grow_publish_device_config(
  p_device_id uuid, p_mode text, p_targets jsonb, p_capabilities jsonb, p_note text, p_created_by uuid
) returns integer
language plpgsql
set search_path = ''
as $$
declare v_version integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_device_id::text, 0));
  select coalesce(max(version), 0) + 1 into v_version from public.grow_device_configs where device_id = p_device_id;
  insert into public.grow_device_configs(device_id, version, mode, targets, capabilities, note, created_by)
    values (p_device_id, v_version, p_mode, p_targets, coalesce(p_capabilities, '{}'::jsonb), p_note, p_created_by);
  return v_version;
end;
$$;
revoke execute on function public.grow_publish_device_config(uuid, text, jsonb, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.grow_publish_device_config(uuid, text, jsonb, jsonb, text, uuid) to service_role;
