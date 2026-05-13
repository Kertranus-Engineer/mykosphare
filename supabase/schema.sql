-- ============================================================================
-- MYKOSPHARE — Complete Operational Schema for Supabase PostgreSQL
-- Execute this file in the Supabase SQL Editor (one shot).
-- After running, all ingestion endpoints and dashboard pages will be
-- fully database-backed with realtime and row-level security.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 2. Enum types
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.device_status AS ENUM ('online', 'offline', 'warning', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Tables
-- ----------------------------------------------------------------------------

-- 3a. telemetry — time-series sensor readings (insert-only)
CREATE TABLE IF NOT EXISTS public.telemetry (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz     NOT NULL DEFAULT now(),
  temperature       numeric(6,2),
  humidity          numeric(5,2),
  co2               integer,
  energy_usage      numeric(8,4),
  environmental_state text,
  operational_mode  text,
  deployment_id     text            NOT NULL DEFAULT 'MYK-CH-001'
);

-- 3b. logs — operational audit trail (insert-only)
CREATE TABLE IF NOT EXISTS public.logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz     NOT NULL DEFAULT now(),
  message           text            NOT NULL,
  category          text,
  deployment_id     text            NOT NULL DEFAULT 'MYK-CH-001'
);

-- 3c. devices — physical/simulated device registry (upsert on device_id)
CREATE TABLE IF NOT EXISTS public.devices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz     NOT NULL DEFAULT now(),
  updated_at        timestamptz,
  device_id         text            NOT NULL,
  device_type       text,
  status            text            DEFAULT 'online',
  health            numeric(5,2)    DEFAULT 100,
  uptime            integer         DEFAULT 0,
  last_sync         timestamptz,
  deployment_id     text            NOT NULL DEFAULT 'MYK-CH-001',
  CONSTRAINT devices_device_id_key UNIQUE (device_id)
);

-- 3d. settings — per-deployment configuration (upsert on deployment_id)
CREATE TABLE IF NOT EXISTS public.settings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz,
  target_temperature    numeric(5,2),
  target_humidity       numeric(5,2),
  target_co2            integer,
  notifications_enabled boolean         NOT NULL DEFAULT true,
  config                jsonb           DEFAULT '{}'::jsonb,
  deployment_id         text            NOT NULL DEFAULT 'MYK-CH-001',
  CONSTRAINT settings_deployment_id_key UNIQUE (deployment_id)
);

-- 3e. alerts — threshold breaches, state changes, system warnings
CREATE TABLE IF NOT EXISTS public.alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz     NOT NULL DEFAULT now(),
  updated_at        timestamptz,
  severity          text            DEFAULT 'warning',
  title             text,
  description       text,
  resolved          boolean         NOT NULL DEFAULT false,
  deployment_id     text            NOT NULL DEFAULT 'MYK-CH-001'
);

-- ----------------------------------------------------------------------------
-- 4. Indexes
-- ----------------------------------------------------------------------------

-- telemetry: deployment-filtered time-series queries
CREATE INDEX IF NOT EXISTS idx_telemetry_deployment_created
  ON public.telemetry (deployment_id, created_at DESC);

-- logs: deployment-filtered ordered listing
CREATE INDEX IF NOT EXISTS idx_logs_deployment_created
  ON public.logs (deployment_id, created_at DESC);

-- logs: category-based filtering
CREATE INDEX IF NOT EXISTS idx_logs_category
  ON public.logs (category);

-- devices: deployment-scoped alphabetical listing
CREATE INDEX IF NOT EXISTS idx_devices_deployment_device
  ON public.devices (deployment_id, device_id);

-- devices: status-based lookups
CREATE INDEX IF NOT EXISTS idx_devices_status
  ON public.devices (status);

-- settings: deployment lookup (unique index already covers this)
-- alerts: deployment-filtered time-series
CREATE INDEX IF NOT EXISTS idx_alerts_deployment_created
  ON public.alerts (deployment_id, created_at DESC);

-- alerts: unresolved alerts query
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved
  ON public.alerts (deployment_id, resolved)
  WHERE resolved = false;

-- telemetry: range-scan queries (used by fetchTelemetryRange)
CREATE INDEX IF NOT EXISTS idx_telemetry_created_range
  ON public.telemetry (created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. Automatic updated_at trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_devices_updated_at
    BEFORE UPDATE ON public.devices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_alerts_updated_at
    BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Row-Level Security
-- ----------------------------------------------------------------------------

-- 6a. Enable RLS on every table
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts   ENABLE ROW LEVEL SECURITY;

-- 6b. Telemetry policies
--    anon:            INSERT (ingestion API via anon-key client)
--    authenticated:   SELECT (dashboard, realtime subscriptions)
CREATE POLICY telemetry_anon_insert
  ON public.telemetry FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY telemetry_auth_select
  ON public.telemetry FOR SELECT TO authenticated
  USING (true);

-- 6c. Logs policies
CREATE POLICY logs_anon_insert
  ON public.logs FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY logs_auth_select
  ON public.logs FOR SELECT TO authenticated
  USING (true);

-- 6d. Devices policies
--    anon:            INSERT, UPDATE (ingestion upserts)
--    authenticated:   SELECT (dashboard, realtime)
CREATE POLICY devices_anon_insert
  ON public.devices FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY devices_anon_update
  ON public.devices FOR UPDATE TO anon
  USING (true);

CREATE POLICY devices_auth_select
  ON public.devices FOR SELECT TO authenticated
  USING (true);

-- 6e. Settings policies
--    authenticated:   SELECT, INSERT, UPDATE (dashboard management)
CREATE POLICY settings_auth_select
  ON public.settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY settings_auth_insert
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY settings_auth_update
  ON public.settings FOR UPDATE TO authenticated
  USING (true);

-- 6f. Alerts policies
--    anon:            INSERT (ingestion API)
--    authenticated:   SELECT, UPDATE (dashboard view/resolve)
CREATE POLICY alerts_anon_insert
  ON public.alerts FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY alerts_auth_select
  ON public.alerts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY alerts_auth_update
  ON public.alerts FOR UPDATE TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 7. Supabase Realtime publication
-- ---------------------------------------------------------------------------
-- Add all operational tables to the default realtime publication so that
-- client-side Realtime listeners (postgres_changes) receive live events.
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- Ensure replica identity is set for tables that support UPDATE events
-- so the before/after payloads are complete for realtime.
ALTER TABLE public.devices  REPLICA IDENTITY FULL;
ALTER TABLE public.settings REPLICA IDENTITY FULL;
ALTER TABLE public.alerts   REPLICA IDENTITY FULL;

-- ----------------------------------------------------------------------------
-- 8. Seed: default deployment settings row
-- ----------------------------------------------------------------------------
INSERT INTO public.settings (
  target_temperature,
  target_humidity,
  target_co2,
  notifications_enabled,
  config,
  deployment_id
)
VALUES (
  24.5,
  61,
  420,
  true,
  '{
    "toggle_temp_alerts": true,
    "toggle_hum_alerts": true,
    "toggle_co2_alerts": true,
    "toggle_maintenance": true,
    "toggle_updates": false,
    "toggle_auto_balance": true,
    "toggle_night_mode": false,
    "toggle_telemetry": true,
    "toggle_predictive": true,
    "toggle_camera": true,
    "toggle_remote": false,
    "toggle_diagnostic": false,
    "slider_air_exchange": 4,
    "slider_fan_speed": 65,
    "threshold_temp": 24.5,
    "threshold_hum": 61,
    "threshold_co2": 420
  }'::jsonb,
  'MYK-CH-001'
)
ON CONFLICT (deployment_id) DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
