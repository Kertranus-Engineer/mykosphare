# MYKOSPHARE — System Report

**Version:** 0.1.0  
**Status:** Pre-alpha / Operational Prototype  
**Last Updated:** May 2026  
**Platform Stack:** Next.js 16.2.6 · TypeScript 5 · Tailwind CSS 4 · Supabase · React 19 · Turbopack

---

## 1. Project Overview

### What MYKOSPHARE Is

MYKOSPHARE is a unified operational intelligence platform purpose-built for controlled-environment agriculture, incubation, and biotech monitoring. It provides a single pane of glass across environmental telemetry, alert orchestration, anomaly detection, topology visualization, digital twin simulation, and command execution.

The platform processes realtime sensor data, derives operational intelligence through deterministic scoring, correlates alerts into incidents, recommends maintenance actions, simulates chamber state evolution, and presents everything through a dark-themed industrial interface designed for continuous monitoring.

### Vision

To build the operational operating system for controlled environments — where environmental monitoring, automation, and intelligence converge in a deterministic, realtime platform that works with or without cloud connectivity.

### Why It Exists

Off-the-shelf environmental monitoring solutions are either consumer-grade (limited telemetry, no analytics), enterprise-expensive (locked ecosystems, opaque pricing), or academic prototypes (no production-ready UX). MYKOSPHARE fills the gap: an open-architecture platform designed from the ground up for realtime operational use, with a simulation-first approach that decouples development from hardware availability.

### Design Philosophy

**Simulation-first.** Every operational layer works against a browser-based simulator before touching hardware. Telemetry, alerts, heartbeat patterns, environmental drift — all simulated deterministically. This means the full platform can be developed, tested, and demonstrated with zero hardware.

**Modular architecture.** Every intelligence layer is an isolated `lib/` module with pure engine functions and a thin React hook. No layer imports another layer's hook. The orchestration layer (unified) composes them by passing plain data.

**Operational intelligence over AI.** All scoring, correlation, drift detection, and forecasting is deterministic. Zero ML dependencies. Every metric has a clear formula. Status mappings follow a fixed 0–100 scale: optimal (≥90), stable (≥75), degraded (≥55), unstable (≥35), critical (<35).

**Realtime by default.** The entire UI subscribes to Supabase Realtime channels. Telemetry, alerts, and device status propagate automatically. No polling. No manual refresh. The interface reflects live state — or gracefully degrades when offline.

**Deterministic-first.** No random seeds in core logic. Scenario simulation is deterministic. Graph layouts are deterministic. The same inputs always produce the same outputs, making debugging and testing reliable.

---

## 2. Core Technology Stack

| Technology | Version | Purpose | Rationale |
|---|---|---|---|
| **Next.js** | 16.2.6 | Application framework | SSR hydration for dashboards, file-based routing, API routes for ingestion, React Server Components for performance |
| **TypeScript** | 5.x | Language | Strict type safety across all layers; interfaces define every data contract between modules |
| **Tailwind CSS** | 4.x | Styling | Utility-first CSS for rapid UI iteration; consistent dark theme through CSS variables |
| **shadcn/ui** | — | Component system | Copy-paste component model avoids dependency lock-in; all primitives customizable |
| **Supabase** | 0.10.3 | Backend | Managed PostgreSQL for persistence, Row-Level Security, Realtime subscriptions for live UI, built-in auth |
| **React** | 19.2.4 | UI framework | Server components, concurrent rendering, useMemo/useCallback for deterministic memoization |
| **Turbopack** | — | Bundler (dev) | Sub-second HMR during development; Next.js 16 default |
| **Recharts** | 3.8.1 | Charts | Compositable chart primitives for telemetry timelines, drift visualization, bar/area charts |
| **Lucide React** | 1.14.0 | Icons | Consistent SVG icon set for operational UI; lightweight tree-shakeable package |
| **Framer Motion** | 12.38.0 | Animations | Pulse/glow effects on live indicators, activity pulse animations on topology links |

**Infrastructure:** Vercel (deployment), Supabase Cloud (database + realtime), GitHub (source control).

---

## 3. System Evolution

### Phase 1 — Initial Dashboard
The starting point. A basic chamber overview displaying static metrics and an alert panel. Established the industrial aesthetic (dark theme, monospace metrics, subtle glow effects).

### Phase 2 — Realtime Telemetry
Integrated Supabase Realtime subscriptions. Telemetry, device status, and alerts become live-updating. The UI transitions from static to continuously reflecting operational state.

### Phase 3 — Environmental Simulation
Created `mock/simulator.ts` — a browser-based environmental simulation that generates realistic telemetry (temperature drift, humidity cycles, CO₂ oscillation). Includes metric snapshots with trend/delta tracking.

### Phase 4 — Alert Engine
`lib/alerts/` — 8 deterministic alert rules evaluating telemetry against configurable thresholds. In-memory cooldown map prevents alert storms. Auto-resolve on normalization. Supabase persistence with `resolved_at` timestamps. UI with severity badges, live duration counters.

### Phase 5 — Intelligence Layer
`lib/intelligence/` — Environmental Health Score, Stability Index, Device Reliability Score, Alert Density Metrics, Telemetry Variance Analysis. Rolling averages and computed scores. `useOperationalIntelligence` hook. Dedicated intelligence dashboard with 7 metric cards.

### Phase 6 — Temporal Intelligence
`lib/temporal/` — Trend analysis, drift detection (1h/6h/24h/7d windows), deterministic forecasting, reliability timeline, alert frequency evolution, behavioral pattern analysis. GenerateTemporalSummary. Timeline route with 7 UI components.

### Phase 7 — Topology Visualization
`lib/topology/` — 8 node types, 6 visual states, deterministic layered graph layout rendered in SVG. Signal simulation with animation frames. UseTopology hook. Topology canvas with node cards, activity pulses, and telemetry-linked animations.

### Phase 8 — Incident Orchestration
`lib/incidents/` — Correlation engine groups alerts by time-window (5min), topology (same node), and cascading overlap. Lifecycle: open → acknowledged → mitigating → resolved. Severity scoring (critical/high/medium/low). Persistence with Supabase + LocalStorage fallback.

### Phase 9 — Maintenance Intelligence
`lib/maintenance/` — 5 recommendation generators: recurring incidents, sensor drift (>0.8 magnitude), heartbeat instability, device reliability degradation, excessive alert density. Priority scoring with source weights. MTTR and reliability analytics.

### Phase 10 — Digital Twin
`lib/twin/` — Chamber twin state with 7 properties (thermalMass, humidityRetention, airflowEfficiency, contaminationRisk, operationalStress, growthCyclePhase, energyEfficiency). 5 operational modes, each with tuned environmental thresholds. State evolution every 3s driven by live telemetry. 6-parameter weighted health composite.

### Phase 11 — Command Layer
`lib/commands/` — 6 command types (airflow, lighting, sterilization, relay-power, mesh-restart, emergency-isolation). Simulated execution pipeline: queued → acknowledged → executing → completed/failed with realistic random delays. Dedicated twin page with command panel and queue UI.

---

## 4. Architecture Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (React)                           │
│                                                                  │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Simulator │  │ Dashboard  │  │ Topology │  │ Intelligence │  │
│  │ (mock)    │  │ Pages      │  │ Canvas   │  │ Cards        │  │
│  └────┬──────┘  └─────┬──────┘  └────┬─────┘  └──────┬───────┘  │
│       │               │              │                │          │
│  ┌────▼───────────────▼──────────────▼────────────────▼───────┐  │
│  │              useUnifiedOperationalState                    │  │
│  │               (Orchestration Coordinator)                  │  │
│  └────┬───────────┬──────────┬──────────┬──────────┬─────────┘  │
│       │           │          │          │          │            │
│  ┌────▼──┐  ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────────┐   │
│  │Alerts │  │Incidents│ │Maint.  │ │  Twin  │ │ Commands   │   │
│  │Engine │  │Engine   │ │Engine  │ │ Engine │ │ Engine     │   │
│  └───┬───┘  └────┬───┘ └───┬────┘ └───┬────┘ └─────┬──────┘   │
│      │           │         │          │            │           │
│  ┌───▼───────────▼─────────▼──────────▼────────────▼───────┐   │
│  │              Realtime Subscriptions                     │   │
│  │  (useRealtimeTelemetry / Alerts / Devices)              │   │
│  └─────────────────────────┬───────────────────────────────┘   │
└────────────────────────────┼───────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Supabase     │
                    │  (PostgreSQL    │
                    │   + Realtime)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  ESP32 / Edge   │
                    │  Devices        │
                    │  (future)       │
                    └─────────────────┘
```

### Ingestion Flow

```
ESP32/Simulator → HTTP POST → API Route → Validation → Supabase INSERT → Realtime Broadcast → UI
```

### Intelligence Pipeline

```
Telemetry ──► Environmental Health Score
  +              ├─ temperatureScore
  Alerts         ├─ humidityScore
  Devices        ├─ co2Score
                 ├─ variancePenalty
                 └─ alertPenalty
                
Telemetry ──► Stability Index
  +              ├─ telemetryStability
  Alerts         ├─ alertFreeDuration
                 └─ fluctuationRate
                
Devices ────► Device Reliability Score
                 ├─ onlineDevices / totalDevices
                 ├─ avgHealth / avgUptime
                 └─ heartbeatCompliance
                
Alerts ────► Alert Density Metrics
                 ├─ alertsPerHour
                 ├─ criticalRatio
                 └─ mostFrequentAlert
```

### Incident Lifecycle

```
Alert Stream ──► Correlation Engine ──► Incident Created (open)
                                              │
                                        acknowledged
                                              │
                                        mitigating
                                              │
                                        resolved
```

### Digital Twin Interactions

```
Telemetry ──► evolveTwinState() ──► ChamberTwinState
Alerts                                  ├─ thermalMass
Incidents                               ├─ humidityRetention
Maintenance                             ├─ airflowEfficiency
Device Health                           ├─ contaminationRisk
                                        ├─ operationalStress
                                        ├─ growthCyclePhase
                                        └─ energyEfficiency
                                              │
                                        computeTwinHealth()
                                              │
                                    TwinHealth (6-parameter score)
                                              │
                                    Unified Engine augments topology
                                    nodes with twin mode + health
```

---

## 5. Operational Layers

### Telemetry Layer
- **Purpose:** Time-series sensor readings (temperature, humidity, CO₂, energy usage)
- **Inputs:** ESP32 sensor readings or simulator ticks
- **Outputs:** Structured telemetry rows in Supabase `public.telemetry`
- **Responsibilities:** Timestamped data capture, environmental state tagging, deployment scoping

### Ingestion Layer
- **Purpose:** HTTP endpoint receiving telemetry, device heartbeats, and environmental events
- **Inputs:** Raw JSON payloads from ESP32 or simulator
- **Outputs:** Validated data inserted into Supabase tables
- **Responsibilities:** Payload validation, rate limiting, auth checks, ingestion metrics tracking
- **Files:** `lib/ingestion/telemetry-ingestion.ts`, `device-ingestion.ts`, `alert-ingestion.ts`

### Validation Layer
- **Purpose:** Schema enforcement on incoming data before persistence
- **Inputs:** Raw ingestion payloads
- **Outputs:** Validated types or rejection with error context
- **Responsibilities:** Field type checking, required field enforcement, range validation
- **Files:** `lib/ingestion/validation.ts`, `lib/ingestion/schemas.ts`

### Realtime Layer
- **Purpose:** Live data propagation from database to UI
- **Inputs:** Supabase Realtime channel subscriptions
- **Outputs:** React state updates for telemetry, alerts, and device data
- **Responsibilities:** Connection management, status tracking (live/degraded), subscription cleanup
- **Files:** `lib/realtime/subscriptions.ts`

### Alert Engine
- **Purpose:** Rule-based alert generation from telemetry evaluation
- **Inputs:** Latest telemetry, device health data
- **Outputs:** Alert objects (title, severity, description, node references)
- **Responsibilities:** 8 rule evaluation, cooldown management, auto-resolution on normalization, operational logging
- **Files:** `lib/alerts/engine.ts`, `rules.ts`, `types.ts`
- **Rules:** Temperature high/low, humidity high/low, CO₂ high, heartbeat failure, energy spike, device offline

### Incident Layer
- **Purpose:** Correlate related alerts into structured incidents
- **Inputs:** Unresolved alert stream
- **Outputs:** Incident objects with severity, affected nodes, timeline
- **Responsibilities:** Time-window correlation (5min), topology-based grouping, cascading detection, lifecycle management
- **Files:** `lib/incidents/engine.ts`, `scoring.ts`, `persistence.ts`

### Maintenance Layer
- **Purpose:** Generate predictive maintenance recommendations
- **Inputs:** Incidents, drift analyses, device health, reliability metrics, alert density
- **Outputs:** Prioritized maintenance recommendations
- **Responsibilities:** 5 recommendation generators, priority scoring, MTTR/reliability analytics, lifecycle (pending → scheduled → in_progress → completed)
- **Files:** `lib/maintenance/engine.ts`, `scoring.ts`, `analytics.ts`

### Intelligence Layer
- **Purpose:** Derive operational metrics from raw data
- **Inputs:** Telemetry, alerts, devices
- **Outputs:** Environmental Health Score, Stability Index, Device Reliability Score, Alert Density, Telemetry Variance
- **Responsibilities:** Deterministic scoring, rolling averages (60min), status mapping (0–100 → optimal/stable/degraded/unstable/critical)
- **Files:** `lib/intelligence/health-score.ts`, `stability.ts`, `reliability.ts`, `analytics.ts`

### Temporal Layer
- **Purpose:** Multi-window trend and drift analysis
- **Inputs:** Historical telemetry and alerts across 1h/6h/24h/7d windows
- **Outputs:** Trend analyses, drift metrics, forecasts, behavior profiles, timeline events
- **Responsibilities:** Comparative window analysis, drift magnitude calculation, deterministic forecasting (7 data points ahead), behavioral reliability scoring
- **Files:** `lib/temporal/drift.ts`, `trends.ts`, `forecasting.ts`, `behavior.ts`, `timelines.ts`

### Topology Layer
- **Purpose:** Network graph visualization of all system nodes
- **Inputs:** Device registry, telemetry timestamps
- **Outputs:** Layered SVG graph layout with node states, signal activity animations
- **Responsibilities:** Graph building with deterministic layout, node type classification (chamber, sensor, relay, cloud, etc.), status visualization with SVG glow/shadow effects, signal pulse animation
- **Files:** `lib/topology/graph.ts`, `status.ts`, `signal.ts`, `node-types.ts`

### Digital Twin Layer
- **Purpose:** Simulated chamber state reflecting real environmental conditions
- **Inputs:** Live telemetry, active alerts, incidents, maintenance, device health
- **Outputs:** Chamber twin state (7 properties), twin health (6-parameter composite)
- **Responsibilities:** State evolution every 3s, mode-specific threshold enforcement, contamination/stress modeling
- **Files:** `lib/twin/engine.ts`, `types.ts`

### Command Layer
- **Purpose:** Operational command issuing with simulated execution
- **Inputs:** User-initiated command (type, target, parameters)
- **Outputs:** Command queue with lifecycle states
- **Responsibilities:** 6 command types, simulated execution pipeline (queued → acknowledged → executing → completed/failed), realtime status tracking
- **Files:** `lib/commands/engine.ts`, `types.ts`

### Orchestration Layer (Unified)
- **Purpose:** Cross-layer data composition and system health computation
- **Inputs:** All subsystem outputs (topology, intelligence, temporal, alerts, incidents, maintenance, twin, commands)
- **Outputs:** UnifiedOperationalState with augmented nodes (alert severity, incident count, maintenance priority, twin mode, command activity), system health per layer, cross-layer cohesion score
- **Responsibilities:** Node augmentation (8 cross-referenced fields), system health scoring (8 layers), cohesion computation (7-factor weighted), bridge between all subsystems
- **Files:** `lib/unified/types.ts`, `engine.ts`, `use-unified.ts`

### Scenario Layer
- **Purpose:** Automated cycling through operational scenarios for testing/demo
- **Inputs:** Module-level scheduler with deterministic cycle
- **Outputs:** Scenario effects applied during simulator tick
- **Files:** `mock/scenarios.ts`
- **Scenarios:** humidity-drift (30s), co2-spike (30s), intermittent-heartbeat (30s), device-offline (30s), recovery-cycle (30s), with 20s cooldown between cycles

---

## 6. Data Flow

### Complete Pipeline

```
ESP32 / Simulator
    │
    ▼
HTTP POST /api/ingest/telemetry
    │
    ▼
Validation (schema, range, auth)
    │
    ▼
Supabase INSERT (telemetry, logs, devices)
    │
    ├──► Realtime broadcast
    │         │
    │         ▼
    │    useRealtimeTelemetry()
    │         │
    │         ├──► Alert Engine (8 rules)
    │         │         │
    │         │         ├──► Alert INSERT (Supabase)
    │         │         │         │
    │         │         │         └──► Realtime broadcast
    │         │         │
    │         │         └──► Incident Correlation
    │         │                   │
    │         │                   └──►Incident lifecycle (open → ... → resolved)
    │         │
    │         ├──► Intelligence Layer
    │         │         │
    │         │         ├──► Environmental Health Score
    │         │         ├──► Stability Index
    │         │         ├──► Device Reliability Score
    │         │         ├──► Alert Density Metrics
    │         │         └──► Telemetry Variance Analysis
    │         │
    │         ├──► Temporal Intelligence
    │         │         │
    │         │         ├──► Trend Analysis (1h/6h/24h/7d)
    │         │         ├──► Drift Detection
    │         │         ├──► Forecasting
    │         │         └──► Behavior Analysis
    │         │
    │         ├──► Digital Twin State Evolution (every 3s)
    │         │         │
    │         │         └──► TwinHealth computation
    │         │
    │         └──► useRealtimeDevices()
    │                   │
    │                   └──► Topology Graph Building
    │
    ▼
Unified Orchestration
    │
    ├──► Node Augmentation (alert/incident/maintenance/twin cross-ref)
    ├──► System Health (8-layer scoring)
    └──► Cross-Layer Cohesion Score
         │
         ▼
    Dashboard UI (reactive via useMemo + useUnifiedOperationalState)
```

### Realtime Synchronization

All Supabase tables (`telemetry`, `alerts`, `devices`) have Realtime enabled. The `subscriptions.ts` module creates channel subscriptions on mount and cleans up on unmount. Each subscription maintains a status flag (`"live"` | `"connecting"` | `"offline"`) that propagates through the UI as connection status indicators.

When the browser is offline or Supabase is unreachable, all hooks gracefully fall back to their last known state. The simulator continues generating data locally through `useSyncExternalStore`, keeping the UI operational without database connectivity.

---

## 7. Simulation System

### Architecture

The simulator (`mock/simulator.ts`) runs as a React hook (`useTelemetry`) using `useSyncExternalStore`. It produces deterministic telemetry at configurable intervals:

```
Store ──► useSyncExternalStore ──► TelemetrySnapshot
  │                                     ├── temperature (24.5 ± drift)
  │                                     ├── humidity (61 ± drift)
  │                                     ├── co₂ (420 ± drift)
  │                                     └── energyUsage
  │
  └──► Also drives:
        ├── alert generation via Supabase INSERT
        ├── device heartbeat lifecycle
        └── scenario effects
```

### Operational Scenarios

5 scenarios cycle automatically with 30s duration and 20s cooldown:

| Scenario | Effect | Duration |
|---|---|---|
| Humidity Drift | Gradually increases humidity above optimal range | 30s |
| CO₂ Spike | Sudden CO₂ concentration increase | 30s |
| Intermittent Heartbeat | Periodic heartbeat drops from edge devices | 30s |
| Device Offline | Temporary device disconnection | 30s |
| Recovery Cycle | System returns to normal after anomaly | 30s |

Each scenario applies effects during `applyScenarioEffects()` in the simulator tick. The `shouldDropHeartbeat()` function controls intermittent connectivity simulation.

### Why Simulation-First

Developing against a simulator rather than physical hardware provided:

1. **Zero hardware dependency** — full platform development and testing with only a browser
2. **Deterministic scenarios** — every scenario produces predictable, repeatable telemetry
3. **Rapid iteration** — no flash cycles, no hardware debugging, no connectivity issues
4. **Edge case coverage** — scenarios test alert thresholds, drift detection, cooldown logic, and incident correlation without waiting for real-world anomalies
5. **Immediate feedback** — UI changes reflect instantly against consistent data

---

## 8. UI / UX Philosophy

### Industrial Operational Aesthetic

The interface is built for continuous monitoring in operational environments — dark backgrounds reduce eye strain during extended use, high-contrast text ensures readability at a distance, and monospace tabular numbers make metric scanning fast.

### Design Principles

**Telemetry-native UI.** Metrics are the primary interface element. Scores, trend indicators, and status badges convey operational state at a glance. Every card is a live operational readout.

**Subtle animation philosophy.** Pulse animations on live indicators, glow effects on status badges, signal activity on topology links — all animations serve a functional purpose: communicating liveness and state transitions. No decorative animation.

**Dark operational interface.** The entire UI uses a dark theme (`hsl(var(--background))`) with CSS variable-driven theming. Status colors (emerald, blue, amber, orange, red) are consistent across all layers — the same color means the same thing whether on a health score, an alert badge, or a topology node.

**Realtime visual feedback.** Live indicators pulse when connected. Status transitions animate. Alert severity badges glow. The interface continuously signals "I am alive and reflecting current state."

**Status propagation.** Every layer's status (from raw telemetry health to cross-layer cohesion) follows the same 0–100 scale with consistent color mapping. This creates a visual hierarchy where operators learn to scan by color first, read by value second.

**Operational storytelling.** The unified dashboard presents not just raw metrics, but derived insight: cross-layer cohesion, system health per layer, augmented node status. The interface tells the story of how the system is performing, not just what individual sensors report.

### Visual Tokens

The `lib/styles/tokens.ts` module defines centralized visual constants:
- `OPERATIONAL_STATUS` — 5 levels with color/bg/border/bar/dot/glow keys
- `SEVERITY` — 3 levels for alert/incident severity
- `TREND_DIRECTION` — 4 directions (rising, falling, stable, volatile)
- `NODE_STATUS` — 6 states for topology nodes
- `CARD_HOVER` — consistent hover effect across all cards
- `scoreToMeta()` / `severityMeta()` — programmatic token access

---

## 9. Major Engineering Challenges

### Hydration Mismatches (Resolved)

**Problem:** Next.js server/client rendering mismatches on components using `Date.now()`, `Math.random()`, or other non-deterministic values during SSR.

**Solution:** All timestamp generation moved to `useEffect` or `useMemo` that only runs client-side. Components that depend on current time use `useSyncExternalStore` or render conditionally after mount.

### Turbopack Environment Variable Access (Resolved)

**Problem:** Dynamic `process.env[name]` pattern does not work with Turbopack. Build errors on any code using bracket notation for env var access.

**Solution:** All env var access refactored to static `process.env.NEXT_PUBLIC_SUPABASE_URL` pattern with explicit `: string` type annotations and module-level validation (`if (!val) throw`). Both client and server Supabase clients follow this pattern.

### Circular Hook Recursion (Resolved)

**Problem:** `useTwin` called `useUnifiedOperationalState`, which called `useTwin`, creating infinite recursion and stack overflow.

**Solution:** Refactored all hooks to accept plain data inputs instead of consuming other hooks. `useTwin` receives `activeAlerts`, `activeIncidents`, `maintenanceTasks`, `avgDeviceHealth` as optional parameters with raw subscription fallbacks. `useMaintenance` similarly accepts `incidents`, `drifts`, `reliability`, `alertDensity` as data. The `useUnifiedOperationalState` coordinator threads computed data between leaf hooks. All hooks now form a clean DAG with zero circular paths.

### Realtime Subscription Coordination (Resolved)

**Problem:** Multiple components subscribing to the same Realtime channels created redundant connections and inconsistent state.

**Solution:** Centralized subscriptions in `lib/realtime/subscriptions.ts` with shared hook instances. `useRealtimeTelemetry`, `useRealtimeAlerts`, and `useRealtimeDevices` are called once by each system hook and never re-created.

### Orchestration DAG Refactor (Resolved)

**Problem:** Initial orchestration logic was scattered across components. System health computation was duplicated in multiple places.

**Solution:** Created `lib/unified/` with a pure `computeUnifiedState()` engine that composes all layer outputs. The `useUnifiedOperationalState` hook calls all leaf hooks and threads data, producing a single `UnifiedOperationalState` consumed by all dashboards.

### SSR / Client Time Mismatches (Resolved)

**Problem:** Duration counters ("active for 2h 15m") calculated on the server during SSR would mismatch client-side values after hydration.

**Solution:** Duration display moved to client-only components using `useEffect` timers. The `formatDuration()` utility computes from fixed `created_at` timestamps relative to client time.

---

## 10. Current System Status

### Fully Operational Systems

| System | Status | Location |
|---|---|---|
| Alert Engine | ✅ Operational | `lib/alerts/` — 8 rules, cooldown, auto-resolve |
| Intelligence Layer | ✅ Operational | `lib/intelligence/` — 5 scoring systems |
| Temporal Intelligence | ✅ Operational | `lib/temporal/` — trends, drifts, forecasting |
| Topology Visualization | ✅ Operational | `lib/topology/` — SVG graph, signal animation |
| Incident Orchestration | ✅ Operational | `lib/incidents/` — correlation, lifecycle, persistence |
| Maintenance Intelligence | ✅ Operational | `lib/maintenance/` — 5 generators, MTTR analytics |
| Unified Orchestration | ✅ Operational | `lib/unified/` — cross-layer composition |
| Scenario System | ✅ Operational | `mock/scenarios.ts` — automatic scenario cycling |
| Realtime Subscriptions | ✅ Operational | `lib/realtime/subscriptions.ts` — live telemetry/alerts/devices |

### Simulated Systems

| System | Status | Location |
|---|---|---|
| Digital Twin | ✅ Simulated | `lib/twin/` — chamber state evolution, mode switching |
| Command Queue | ✅ Simulated | `lib/commands/` — 6 command types, execution simulation |
| Environmental Simulator | ✅ Simulated | `mock/simulator.ts` — realistic telemetry generation |

### Partially Integrated Systems

| System | Status | Notes |
|---|---|---|
| Ingestion API | ⚡ Partial | Routes defined, Supabase integration active, rate limiting implemented |
| Protocol Layer | ⚡ Partial | Identity system, payload specs defined, diagnostics module |
| Auth | ⚡ Partial | Login/register pages, Supabase auth configured |

### Future / Hardware Systems

| System | Status | Notes |
|---|---|---|
| ESP32 Telemetry | 🔜 Planned | Hardware integration pending |
| Camera Feeds | 🔜 Planned | Routes defined, UI placeholder |
| Relay Control | 🔜 Planned | Command types defined, hardware pending |
| Environmental Automation | 🔜 Planned | Control logic architecture designed |

---

## 11. Hardware Roadmap

### Planned Hardware

| Component | Purpose | Integration Point |
|---|---|---|
| **ESP32** | Primary sensor telemetry + WiFi communication | HTTP POST to ingestion API |
| **ESP32-CAM** | Visual monitoring via camera frames | Dedicated camera route + dashboard panel |
| **Relays** | Environmental control (lights, fans, pumps) | Command layer relay-power type |
| **MOSFETs** | Precision analog control (heating, humidification) | Future command expansion |
| **I2C Display** | On-device operational readout | Future local UI |
| **Sensor Mesh** | DHT22/BME280/SCD30 — temperature, humidity, CO₂ | Telemetry layer input |
| **Environmental Controls** | Humidifier, exhaust fan, heating pad, circulation fans | Command execution targets |

### Integration Architecture

```
ESP32 Sensors ──► I2C Bus ──► ESP32 ──► WiFi ──► HTTP POST ──► Ingestion API ──► Supabase
                    │                                                │
               I2C Display                                      Realtime Broadcast
                    │                                                │
               Local Metrics                                       Dashboard UI

ESP32 (actuator) ◄── WiFi ◄── MQTT (future) ◄── Control Logic ◄── Command Queue
```

Each ESP32 runs Arduino firmware that reads sensors, formats JSON payloads, and POSTs to the ingestion endpoint. The ingestion layer validates and persists. Realtime broadcasts updates to all connected clients.

For actuation, the command layer produces command objects that will be consumed by ESP32 listeners over MQTT or HTTP polling. Hardware integration is designed as a protocol bridge — the command engine remains unchanged whether targeting simulated or physical hardware.

---

## 12. Future Roadmap

### Short Term

| Item | Description |
|---|---|
| **UX Polish** | Refine transitions, hover states, responsive layout for tablet monitoring |
| **Command Center** | Consolidated operational command panel with batch operations |
| **Demo Mode** | Pre-recorded scenario playback for demonstrations without live simulation |
| **Operational Audio** | Ambient status tones (subtle pulse for connected, alert tones on critical) |
| **Cinematic Transitions** | Route transitions and layer reveal animations |

### Mid Term

| Item | Description |
|---|---|
| **Real ESP32 Telemetry** | Hardware deployment, firmware upload, first real sensor data |
| **Camera Feeds** | ESP32-CAM integration with frame capture and display in topology |
| **Relay Control** | Physical relay actuation via command queue → MQTT → GPIO |
| **Environmental Automation** | Rule-based control logic (if temp > threshold → activate fan) |
| **Historical Data Export** | Downloadable telemetry archives for analysis |
| **Alert Tuning UI** | In-UI alert threshold configuration |

### Long Term

| Item | Description |
|---|---|
| **AI-Assisted Operational Intelligence** | Pattern recognition on historical data for anomaly prediction (still deterministic — using statistical models, not LLMs) |
| **Adaptive Environmental Control** | Closed-loop control that learns optimal setpoints per growth phase |
| **Digital Twin Evolution** | Twin state becomes predictive — projecting future states based on current telemetry |
| **Predictive Operations** | Proactive maintenance alerts based on wear modeling and trend analysis |
| **Multi-Chamber Support** | Multiple deployment management with cross-chamber analytics |
| **Mobile Companion** | Push notifications, quick status glance, critical alert escalation |

---

## 13. Commercial / Product Potential

### Platform Positioning

MYKOSPHARE sits at the intersection of environmental monitoring, operational intelligence, and digital twin simulation. It is not a sensor dashboard — it is an operational intelligence platform that happens to consume sensor data.

### Possible Applications

**Indoor Agriculture.** Controlled-environment farms need realtime environmental monitoring, alert escalation, and trend analysis across multiple grow zones.

**Incubation.** Mycological incubation requires precise temperature/humidity control with drift detection — even 0.5°C deviation over 6 hours can affect colonization.

**Hydroponics.** Nutrient solution temperature, ambient humidity, and CO₂ enrichment require continuous monitoring with alert correlation.

**Biotech Research.** Laboratory environments require auditable environmental logs, alert histories, and deterministic data for compliance.

**Fermentation.** Temperature-sensitive fermentation (beer, kombucha, tempeh, koji) benefits from trend analysis and predictive forecasting.

**Research Environments.** Academic and commercial research needs documented environmental baselines with temporal intelligence for experiment reproducibility.

**Terrariums / Vivariums.** Specialty environments requiring stable microclimates with visual monitoring.

**Environmental Monitoring.** General-purpose monitoring for server rooms, wine cellars, cheese aging, curing chambers, or any space requiring environmental tracking.

### Differentiation

- **Simulation-first** — full platform works without hardware
- **Open architecture** — no vendor lock-in, self-hostable
- **Deterministic intelligence** — no black box ML, every score is explainable
- **Industrial aesthetic** — built for operational use, not consumer demo
- **Modular layers** — each intelligence module is independently usable
- **Realtime by design** — not a polling dashboard

---

## 14. Final Assessment

### Current Maturity Level

**Pre-alpha / Operational Prototype.** All core intelligence layers are implemented and operational within the simulation environment. The platform can be demonstrated end-to-end with no external dependencies beyond a browser and optional Supabase instance. Hardware integration and production hardening remain.

### Technical Strengths

- **Deterministic everywhere** — no randomness in core logic, making testing and debugging reliable
- **Clean module boundaries** — `lib/` engines are pure functions, hooks are thin React wrappers
- **Comprehensive type safety** — every data contract is defined as a TypeScript interface
- **Orchestration DAG** — all system layers compose through a single coordinator without circularity
- **Simulation parity** — simulated and hardware paths share the same ingestion/validation/UI pipeline

### Architectural Strengths

- **Realtime-native** — not retrofitted onto a polling architecture
- **Layered intelligence** — raw data → scores → alerts → incidents → maintenance → unified state
- **Cross-layer augmentation** — topology nodes carry alert severity, incident count, maintenance priority, twin mode, command activity
- **Graceful degradation** — offline mode preserves full UI functionality against simulated data
- **Isolated engines** — each layer can be tested, modified, or replaced independently

### Future Potential

MYKOSPHARE's architecture is designed to scale from a single browser-based simulation to a multi-chamber, multi-device operational platform. The modular layer design means hardware integration, additional intelligence modules, and UI extensions can be developed independently without refactoring existing systems.

The simulation-first approach means the platform is demonstrable today — with or without hardware. This is not a prototype waiting for electronics. It is an operational platform that happens to currently run against simulated data, with a clear migration path to physical deployment.

---

*End of System Report — MYKOSPHARE v0.1.0*
