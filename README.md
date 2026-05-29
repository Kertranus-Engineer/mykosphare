# MYKOSPHARE

**Environmental Intelligence Platform** — autonomous environmental monitoring, AI-driven stabilization, and intelligent telemetry infrastructure for controlled environment agriculture and industrial biotech.

```
 ███╗   ███╗██╗   ██╗██╗  ██╗ ██████╗ ███████╗██████╗ ██╗  ██╗ █████╗ ██████╗ ███████╗
 ████╗ ████║╚██╗ ██╔╝██║ ██╔╝██╔═══██╗██╔════╝██╔══██╗██║  ██║██╔══██╗██╔══██╗██╔════╝
 ██╔████╔██║ ╚████╔╝ █████╔╝ ██║   ██║███████╗██████╔╝███████║███████║██████╔╝█████╗
 ██║╚██╔╝██║  ╚██╔╝  ██╔═██╗ ██║   ██║╚════██║██╔═══╝ ██╔══██║██╔══██║██╔══██╗██╔══╝
 ██║ ╚═╝ ██║   ██║   ██║  ██╗╚██████╔╝███████║██║     ██║  ██║██║  ██║██║  ██║███████╗
 ╚═╝     ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
```

---

## Project Description

MYKOSPHARE is an environmental intelligence platform designed to collect, analyze and visualize environmental conditions through affordable hardware and modern web technologies. The project focuses on accessibility, scalability and educational value while maintaining a professional operational interface.

Built around ESP32 microcontrollers and open-source technologies, MYKOSPHARE provides real-time monitoring, AI-driven analytics, and automated alerting for environmental control applications.

---

## Key Features

### Environmental Monitoring
Real-time temperature, humidity, and derived CO2 metrics with animated KPI cards, trend indicators, and threshold-based alerts.

### AI Operational Intelligence
Confidence scoring, health tracking, predictive warnings, and rotating operational narrative. The AI module analyzes environmental trends and suggests autonomous interventions.

### Live Topology Engine
Canvas-based network visualization with animated particles, packet flow between nodes, mycelium core with breathing rings, node status halos, and mouse parallax.

### Real-Time Telemetry Pipeline
```
ESP32 -> POST /api/data -> telemetry store (globalThis) -> GET /api/data -> useTelemetry() -> React hooks -> Dashboard
```
Fully decoupled from build. Survives HMR and module resets. Fallback simulation layer when hardware is unavailable.

### Auto-Demo System
16-step timeline orchestrated across 6 operational phases. One click runs the full demo cycle. Manual triggers for WARNING, CRITICAL, and RECOVERY states.

### Operational Profiles (Themes)
Three distinct operational modes: Obsidian (dark cinematic), Pure Black (OLED graphite), and Lab Light (scientific laboratory).

### Cost Advantage
ESP32-based affordable hardware eliminates proprietary licensing fees and vendor lock-in. Potentially reduces deployment costs compared to traditional proprietary solutions.

---

## Architecture Diagram

```
Environmental Sensors (DHT22)
        |
        v
ESP32 Controller (WiFi)
        |
        v
Wireless Communication (HTTP)
        |
        v
MYKOSPHARE Cloud / Ingestion Layer
        |
        v
Analytics Engine (AI Analysis)
        |
        v
Alert System (Threshold Monitoring)
        |
        v
Operator Dashboard (Next.js)
```

Data flows from physical sensors through the ESP32 microcontroller, transmitted over WiFi to the cloud ingestion layer. The analytics engine processes incoming telemetry and generates alerts when parameters exceed defined limits.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| **Backend** | Node.js, Next.js API Routes, Supabase (optional) |
| **Hardware** | ESP32, DHT22, LCD I2C, Arduino Framework |
| **Cloud** | Vercel, Future Cloud Integration |
| **Charts** | Recharts |
| **Animations** | Framer Motion, CSS keyframes, Canvas 2D |
| **Icons** | Lucide React |
| **Fonts** | Geist Sans, Geist Mono |

---

## Applications

MYKOSPHARE adapts to diverse environments and industries:

| Sector | Use Case |
|--------|----------|
| **Education** | Learn sensor integration, IoT networking and environmental analysis |
| **Environmental Monitoring** | Track temperature, humidity and air quality |
| **Agriculture** | Precision monitoring of growing conditions |
| **Research Laboratories** | Maintain precise environmental conditions |
| **Industrial Facilities** | Monitor production environments and compliance |
| **Smart Greenhouses** | Automated climate control with remote access |
| **Mushroom Cultivation** | Specialized monitoring for growing chambers |

---

## Future Roadmap

| Phase | Status |
|-------|--------|
| Phase 1 — Prototype Development | Completed |
| Phase 2 — Environmental Monitoring | Completed |
| Phase 3 — Multi-node Network | In Progress |
| Phase 4 — Cloud Integration | Planned |
| Phase 5 — AI Assisted Analytics | Planned |
| Phase 6 — Educational Deployment | Planned |
| Phase 7 — Commercial Deployment | Planned |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (binds to 0.0.0.0 for LAN access)
npm run dev

# Open dashboard
open http://localhost:3000
```

### Environment

Copy `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Supabase is optional — the telemetry store runs entirely in memory via `globalThis`.

### ESP32 Setup

1. Open `ESP32_NETWORK_TEST.ino`
2. Set `WIFI_SSID`, `WIFI_PASS`, and `SERVER_HOST` (from `/debug-network` PRIMARY LAN)
3. Upload to ESP32
4. Open Serial Monitor (115200 baud)
5. Verify `[HTTP] code=200`

### Windows Firewall

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Next.js Dev (3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## Demo Script

Recommended presentation flow:

1. **Boot** — dashboard initialization sequence
2. **Overview** — show chamber, KPIs, AI analysis in NOMINAL state
3. **Topology** — showcase live network visualization
4. **Trigger WARNING** — humidity drift, amber escalation
5. **Trigger CRITICAL** — thermal spike, autonomous compensation
6. **RECOVERY** — equilibrium restored
7. **Auto Demo** — full 48s orchestrated cycle
8. **Themes** — switch between Obsidian / Pure Black / Lab Light
9. **Presentation Mode** — projector-friendly view (press `P`)

---

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview — chamber, KPIs, AI analysis, mission status |
| `/dashboard/architecture` | System architecture flow and data pipeline |
| `/dashboard/applications` | Use cases across education, agriculture, research |
| `/dashboard/cost-advantage` | Cost comparison vs traditional solutions |
| `/dashboard/roadmap` | Development timeline and future milestones |
| `/dashboard/technology-stack` | Technologies used across the full stack |
| `/dashboard/environment` | Environmental chamber visualization |
| `/dashboard/analytics` | Charts, metrics, and environmental history |
| `/dashboard/topology` | Live network graph with packet flow |
| `/dashboard/intelligence` | AI operational intelligence and health scoring |
| `/dashboard/timeline` | Temporal patterns, forecasting, drift analysis |
| `/dashboard/command-center` | Operational terminal and command interface |
| `/dashboard/configuration` | System settings and configuration |
| `/dashboard/alerts` | Alert management and incident tracking |
| `/dashboard/about` | Project information and attribution |

---

## Operational Modes

| State | Chamber | Topology | AI | Vignette |
|-------|---------|----------|----|----|
| NOMINAL | Cyan breathing | Green nodes, stable flow | "Environmental equilibrium holding" | Soft cyan |
| WARNING | Amber pulse | Warning nodes | "Humidity threshold approaching" | Amber tint |
| CRITICAL | Red glow + scanlines | Critical routes | "Thermal anomaly detected" | Red diffusion |
| RECOVERY | Teal stabilization | Healing connections | "Equilibrium restoring" | Teal fade |
| COMPENSATING | Intense airflow glow | Rerouting | "Compensation protocols active" | Bright cyan |

---

## License

MIT
