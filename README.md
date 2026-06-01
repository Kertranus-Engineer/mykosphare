# MYKOSPHARE

**Environmental Intelligence Platform**

Real-time environmental monitoring powered by low-cost IoT hardware, cloud analytics and intelligent telemetry infrastructure.

---

## Live Demo

https://mykosphare.vercel.app/dashboard

---

## Overview

MYKOSPHARE is an environmental intelligence platform that collects, analyzes and visualizes environmental conditions through affordable ESP32-based hardware and modern web technologies.

The platform focuses on operational awareness — helping users understand the state of an environment as a connected system — rather than displaying isolated sensor values.

---

## Features

- **Real-Time Telemetry** — Live temperature, humidity, CO₂ and energy monitoring with animated KPI cards
- **ESP32 Integration** — Physical hardware interface for environmental data acquisition via WiFi
- **Environmental Intelligence** — AI-driven analysis, confidence scoring and predictive warnings
- **Operational Topology** — Network visualization showing data flow from sensors through gateways to analytics
- **Simulation Engine** — Automatic fallback when hardware is unavailable, keeping the dashboard fully operational
- **Multi-Page Dashboard** — Overview, Analytics, Intelligence, Timeline, Topology, Architecture and more
- **Prototype Documentation** — Hardware gallery, cost breakdown and deployment concepts

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, TailwindCSS v4, shadcn/ui |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Backend** | Next.js API Routes, Supabase (optional) |
| **Hardware** | ESP32, DHT22, LCD I2C, Arduino Framework |
| **Cloud** | Vercel |

---

## Architecture

```
Environmental Sensors (DHT22)
        ↓
ESP32 Controller (WiFi)
        ↓
Cloud Ingestion / Telemetry Processing
        ↓
Analytics Engine (AI Analysis)
        ↓
Alert System (Threshold Monitoring)
        ↓
Operator Dashboard (Next.js)
```

The platform supports both live telemetry and simulation mode, remaining fully operational even without physical hardware.

---

## Simulation Engine

When no ESP32 device is connected, the platform automatically switches to simulated telemetry:

- Realistic temperature (22–27°C) and humidity (55–65%) generation
- Server-side simulation with daily sinusoidal variation
- Source transitions emit operational events
- Real telemetry always overrides simulated data

---

## Prototype Hardware

- ESP32-WROOM-32 development board
- DHT22 temperature and humidity sensor
- 16×2 I2C LCD status display
- Industrial power supply with voltage regulation
- 3D-printed protective enclosure

**Estimated Prototype Cost:** ~$89 USD

---

## Screenshots

Screenshots can be placed in `docs/screenshots/`:

- `overview.png` — Operational dashboard
- `timeline.png` — Temporal intelligence view
- `prototype.png` — Hardware prototype gallery
- `architecture.png` — System architecture flow

---

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev

# Open dashboard
open http://localhost:3000
```

### ESP32 Setup

1. Flash the ESP32 with the firmware from `docs/firmware/`
2. Configure WiFi credentials in the firmware
3. Set `SERVER_HOST` to your machine's LAN IP
4. The dashboard will automatically detect telemetry

---

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Operational Overview — live KPIs, chamber, AI analysis |
| `/dashboard/analytics` | Environmental trends with 6-hour forecast |
| `/dashboard/intelligence` | AI decision recommendations and risk assessment |
| `/dashboard/timeline` | Temporal analysis and system events |
| `/dashboard/topology` | Network visualization and data flow |
| `/dashboard/architecture` | System architecture and end-to-end flow |
| `/dashboard/prototype` | Hardware documentation and gallery |
| `/dashboard/applications` | Use cases across industries |
| `/dashboard/cost-advantage` | Cost comparison vs traditional solutions |
| `/dashboard/roadmap` | Development timeline and milestones |
| `/dashboard/technology-stack` | Technologies used across the stack |

---

## Deployment

The platform is deployed on Vercel:

```bash
npm run build
npx vercel --prod
```

No Supabase configuration is required — the platform runs in simulation mode by default.

---

## Future Roadmap

- Multi-node sensor mesh deployment
- Predictive analytics enhancements
- Mobile applications
- Additional sensor support (CO₂, light, soil moisture)
- Automated environmental control loops

---

## License

MIT
