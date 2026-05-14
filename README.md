# MYKOSPHARE

**Environmental Intelligence Platform** — realtime environmental automation, vision-assisted monitoring, and intelligent telemetry infrastructure for controlled environment agriculture and industrial biotech.

---

## Overview

MYKOSPHARE is a cinematic operational intelligence platform that transforms environmental monitoring into a living industrial experience. It provides real-time visualization, deterministic simulation, and intelligent control for controlled environment agriculture and biotechnology facilities.

### Key Capabilities

- **Operational Topology** — SVG-based live network visualization with signal propagation, node health monitoring, and cross-layer integration
- **Environmental Intelligence** — Real-time telemetry analysis, anomaly detection, drift forecasting, and AI-powered operational summaries
- **Incident Management** — Automated incident detection, severity scoring, and resolution tracking with full audit history
- **Predictive Maintenance** — Equipment health monitoring, maintenance scheduling, and reliability analytics
- **Command & Control** — Operational command center with queue management, emergency controls, and execution timeline
- **Temporal Analysis** — Behavior patterns, trend forecasting, and timeline-based operational replay
- **Digital Twin** — Chamber state simulation with contamination risk modeling and operational stress analysis

---

## Architecture

```
mykosphare/
├── app/                        # Next.js App Router
│   ├── dashboard/              # Protected operational pages
│   └── api/                    # Ingestion & protocol endpoints
├── features/                   # Feature-sliced component modules
│   ├── topology/               # Network visualization
│   ├── dashboard/              # Overview metrics & charts
│   ├── command-center/         # Operational controls
│   ├── ambiance/               # Cinematic state effects
│   ├── init/                   # Boot sequence
│   ├── presentation/           # Presentation mode
│   ├── snapshot/               # System snapshot
│   ├── demo/                   # Demo simulation
│   ├── incidents/              # Incident management
│   ├── maintenance/            # Maintenance scheduling
│   ├── intelligence/           # AI analysis
│   └── temporal/               # Time-series analysis
├── lib/                        # Pure business logic
│   ├── topology/               # Graph engine, signal routing
│   ├── unified/                # Cross-layer orchestration
│   ├── commands/               # Command execution engine
│   ├── incidents/              # Incident scoring engine
│   ├── maintenance/            # Maintenance analytics
│   └── realtime/               # Supabase subscriptions
└── mock/                       # Deterministic simulation
    ├── simulator.ts            # Main simulation loop
    ├── scenarios.ts            # Scenario orchestration
    ├── environment.ts          # Environmental state engine
    └── device-registry.ts      # Virtual device definitions
```

### Core Design Principles

- **Deterministic-first** — All system behavior is reproducible and predictable
- **Modular architecture** — Each subsystem is independently testable and replaceable
- **Industrial aesthetic** — Premium dark-themed interface with subtle animations and cinematic transitions
- **Realtime by default** — Live telemetry, instant state updates, responsive feedback
- **No external rendering dependencies** — SVG-only topology visualization, no Three.js

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Animation | Tailwind CSS animations + Framer Motion |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL, Realtime, Auth) |
| Simulation | Custom deterministic engine |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm, pnpm, or bun
- Supabase project (optional, local simulation works without)

### Installation

```bash
git clone https://github.com/yourusername/mykosphare.git
cd mykosphare
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The platform runs in simulation mode by default — no external services required.

### Supabase Setup (Optional)

For production realtime features:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema from `supabase/schema.sql`
3. Configure environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Production Build

```bash
npm run build
npm start
```

---

## Features

### Operational Boot Sequence
Full-screen cinematic initialization with sequential system checks — sensor fabric, incident memory, topology graph, realtime channels, and operational state loading.

### Live Topology Visualization
SVG-based network graph showing all connected devices with real-time signal propagation, node health status, packet flow animations, and cross-layer alert correlation.

### Environmental Intelligence
AI-powered analysis of telemetry data with health scoring, stability indices, drift detection, and automated operational summaries.

### Incident & Maintenance Management
Automated incident detection with severity scoring, resolution tracking, predictive maintenance scheduling, and reliability analytics.

### Command Center
Unified operational control with command queue management, emergency isolation protocols, system health monitoring, and execution timeline.

### Presentation Mode
Cinematic fullscreen mode that reduces UI noise, smooths transitions, and optimizes the platform for demonstrations, recordings, and investor presentations.

### System Snapshot
Capture operational state snapshots with frozen telemetry and stabilized topology — ideal for screenshots, documentation, and reporting.

### Operational Simulation
Built-in demo mode that orchestrates complete operational scenarios — drift detection, alert cascades, incident escalation, and recovery cycles.

---

## Routes

| Route | Page |
|-------|------|
| `/` | Landing |
| `/dashboard` | Overview — metrics, chamber, telemetry |
| `/dashboard/unified` | Cross-layer operational intelligence |
| `/dashboard/topology` | Live network visualization |
| `/dashboard/command-center` | Operational command & control |
| `/dashboard/environment` | Multi-zone monitoring |
| `/dashboard/analytics` | Charts and KPIs |
| `/dashboard/intelligence` | AI analysis |
| `/dashboard/maintenance` | Equipment health |
| `/dashboard/timeline` | Temporal operations |
| `/dashboard/alerts` | Alert management |
| `/dashboard/settings` | System configuration |

---

## Philosophy

MYKOSPHARE was built to feel like a living industrial intelligence platform rather than a traditional dashboard. Every visual detail — from the boot sequence to the signal propagation animations — is designed to reinforce the sense of operating a real environmental control system.

The deterministic simulation engine ensures that the platform works identically in demo, development, and production environments. This makes it suitable for both real-world deployment and compelling presentations.

---

## Roadmap

- [ ] Real hardware integration (ESP32, SHT31, MH-Z19B)
- [ ] Camera vision module with AI growth stage analysis
- [ ] Multi-chamber fleet management
- [ ] Mobile companion app
- [ ] API marketplace for third-party integrations
- [ ] Energy optimization engine
- [ ] Protocol compliance reporting

---

## License

MIT — see [LICENSE](LICENSE) for details.
