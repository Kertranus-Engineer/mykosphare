# MYKOSPHARE 2.0 Data Platform

Persistent source of truth: Supabase Postgres, introduced by migration
`202609300001_grow_data_platform.sql`. It coexists with 1.x tables.

```text
ESP32 → Device API → validation → server repository → Postgres
                                                   ↓
                                            Grow application
                                                   ↓
                                             Grow Domain
                                                   ↓
                                             GrowSnapshot → future /grow
```

`grow_chambers` belong to an authenticated user; `grow_devices` observe chambers;
`grow_cultivation_runs` are product-central. Readings retain `observed_at` and
`received_at`, explicit real/simulated origin, and only temperature/humidity.
The partial unique index permits one active run per chamber. Stage/run events and
capture metadata preserve history; Storage remains responsible for image blobs.

Device ingestion is server-side service-role only and resolves device → chamber →
active run. It assigns `real` itself, rejects origin/CO2/energy fields, uses a
unique `(device_id, observed_at, origin)` constraint for retry idempotency, and
updates device state after a persisted reading. Per-device credentials and a fully
transactional RPC are future hardening work.

RLS permits authenticated owners to access their chamber graph. There are no anon
write policies. Profiles are shared read-only reference data. `/api/v2/grow/[id]`
authenticates, verifies ownership through the repository, and returns explicit
not-found/no-run/profile/unavailable states rather than a fabricated healthy state.

Simulation is an explicit, ephemeral application mode; it does not write real
readings. The legacy `/api/data` flow remains unmodified because legacy firmware
lacks the v2 device identity/credential contract. Future migration can update
firmware to POST v2 directly; no unsafe mirror is installed.

Retention/downsampling/archive policies for readings and captures are intentionally
deferred. DB types are handwritten adapters pending generated Supabase types.
