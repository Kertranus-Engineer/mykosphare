# MYKOSPHARE

**Environmental Intelligence Platform** — autonomous environmental monitoring, AI-driven stabilization, and intelligent telemetry infrastructure for controlled environment agriculture and industrial biotech.

## Live Demo

https://mykosphare.vercel.app/dashboard

## Video Demonstration

https://drive.google.com/file/d/1ik3pvLC7IU_zRo4khg5gL7J5ncwQe9Aj/view

---

## Project Overview

MYKOSPHARE is an environmental intelligence platform designed to collect, analyze and visualize environmental conditions through affordable hardware and modern web technologies.

The project combines ESP32-based sensor nodes, telemetry processing, operational visualization and environmental monitoring into a single platform. Rather than displaying isolated sensor values, MYKOSPHARE focuses on operational awareness — helping users understand the state of an environment as a connected system.

---

## Project Highlights

- **Low-cost ESP32 architecture** — Affordable hardware that reduces deployment costs by over 90%
- **Real-time environmental telemetry** — Live temperature, humidity and CO₂ monitoring with cloud ingestion
- **Cloud-based monitoring dashboard** — Professional operational interface accessible from any browser
- **Simulation mode for demonstrations** — Platform remains fully operational even without physical hardware
- **Expandable sensor ecosystem** — Support for additional sensors and remote monitoring modules
- **Educational and industrial applications** — Suitable for classrooms, laboratories, greenhouses and industrial facilities

---

## Architecture

```
Environmental Sensors (DHT22)
        ↓
ESP32 Controller (WiFi)
        ↓
Wireless Communication (HTTP)
        ↓
MYKOSPHARE Cloud / Ingestion Layer
        ↓
Analytics Engine (AI Analysis)
        ↓
Alert System (Threshold Monitoring)
        ↓
Operator Dashboard (Next.js)
```

Complete environmental monitoring pipeline from data acquisition to decision making.

The system supports both real telemetry and simulation mode, allowing the platform to remain operational even when physical hardware is unavailable.

---

## Applications

MYKOSPHARE adapts to diverse environments and industries:

| Sector | Use Case |
|--------|----------|
| **Smart Classrooms** | Educational environments where students learn IoT, telemetry, environmental monitoring and data analytics using real operational hardware |
| **Education** | Learn sensor integration, IoT networking and environmental analysis |
| **Environmental Monitoring** | Track temperature, humidity and air quality |
| **Agriculture** | Precision monitoring of growing conditions |
| **Research Laboratories** | Maintain precise environmental conditions |
| **Industrial Facilities** | Monitor production environments and compliance |
| **Smart Greenhouses** | Automated climate control with remote access |
| **Mushroom Cultivation** | Specialized monitoring for growing chambers |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Framer Motion |
| **Backend** | Node.js, Next.js API Routes, Supabase (optional), In-Memory Telemetry Pipeline |
| **Hardware** | ESP32, DHT22, LCD I2C, Arduino Framework |
| **Cloud** | Vercel |

---

## Cost Advantage

Traditional environmental monitoring solutions often require expensive proprietary hardware and complex infrastructure.

MYKOSPHARE uses affordable ESP32 hardware and open technologies, reducing deployment costs dramatically.

**Prototype Cost Breakdown:**

| Component | Estimated Cost |
|-----------|---------------|
| ESP32 Controller | ~$4 |
| Temperature/Humidity Sensor | ~$3 |
| Power Supply | ~$2 |
| Enclosure | ~$5 |
| Cloud Hosting | Free |
| Dashboard Platform | Free |
| **Total** | **~$89 USD** |

---

## Roadmap

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

# Start dev server
npm run dev

# Open dashboard
open http://localhost:3000
```

### ESP32 Setup

1. Open `ESP32_NETWORK_TEST.ino`
2. Set `WIFI_SSID`, `WIFI_PASS`, and `SERVER_HOST`
3. Upload to ESP32
4. Open Serial Monitor (115200 baud)
5. Verify `[HTTP] code=200`

### Telemetry Modes

**Live Device** — When ESP32 is connected: real sensor values, live environmental data.

**Simulation Mode** — When hardware is unavailable: automatic environmental simulation, dynamic dashboard values, operational continuity. The platform always feels operational.

---

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Operational Overview — real-time environmental intelligence dashboard |
| `/dashboard/architecture` | System Architecture — data pipeline and end-to-end flow |
| `/dashboard/applications` | Applications — use cases across education, agriculture, research |
| `/dashboard/prototype` | Prototype — hardware implementation and cost breakdown |
| `/dashboard/cost-advantage` | Cost Advantage — comparison vs traditional solutions |
| `/dashboard/roadmap` | Roadmap — development timeline and future milestones |
| `/dashboard/technology-stack` | Technology Stack — technologies across the full stack |
| `/dashboard/environment` | Environment — chamber visualization and zone monitoring |
| `/dashboard/analytics` | Analytics — charts, metrics, and environmental history |
| `/dashboard/topology` | Topology — live network graph with packet flow |
| `/dashboard/intelligence` | Intelligence — AI operational intelligence and health scoring |
| `/dashboard/timeline` | Timeline — temporal patterns, forecasting, drift analysis |
| `/dashboard/command-center` | Command Center — operational terminal and command interface |
| `/dashboard/about` | About — project information and attribution |

---

## Screenshots

| Page | Preview |
|------|---------|
| **Overview** | Operational dashboard with live KPI cards, chamber visualization, environmental metrics and AI analysis |
| **Architecture** | End-to-end telemetry pipeline showing data flow from sensors to dashboard |
| **Applications** | 8 supported use cases across education, research, agriculture and industry |
| **Prototype** | Hardware components, cost breakdown, gallery and deployment concepts |

*Screenshots can be added to `/public/screenshots/` directory.*

---

## License

MIT
