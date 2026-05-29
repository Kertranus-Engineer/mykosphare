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

## Features

### 🌿 Environmental Chamber
Real-time atmospheric visualization with reactive glow, heat distortion for high temperature, fog diffusion for humidity, scanline diagnostics, and volumetric breathing core. Reacts to live ESP32 telemetry or simulated data.

### 🧠 AI Operational Intelligence
Confidence scoring, phase detection, predictive warnings, facility health tracking, and rotating operational narrative. The AI module analyzes environmental trends and suggests autonomous interventions.

### 🕸️ Live Topology Engine
Canvas-based network visualization with 110+ animated particles, packet flow between nodes, mycelium core with breathing rings, node status halos, and mouse parallax. Renders real network topology from the unified operational state.

### 📊 Real-Time Telemetry Pipeline
```
ESP32 → POST /api/data → telemetry store (globalThis) → GET /api/data → useTelemetry() → React hooks → Dashboard
```
Fully decoupled from build. Survives HMR and module resets. Fallback simulation layer when hardware is unavailable.

### 🎮 Auto-Demo System
16-step timeline orchestrated across 6 operational phases (NOMINAL → DRIFT → WARNING → CRITICAL → COMPENSATING → STABILIZED). One click runs the full demo cycle. Manual triggers for WARNING, CRITICAL, and RECOVERY states. Press `P` for presentation overlay.

### 🎨 Operational Profiles (Themes)
Three distinct operational modes — not just color swaps:
- **OBSIDIAN** — cinematic dark, cyan accents, deep navy shadows
- **PURE BLACK** — OLED graphite, emerald glow, cinematic demo mode
- **LAB LIGHT** — blue-gray scientific, steel cyan accents, laboratory aesthetic

### 📐 Collapsible Sidebar
Icon-only mini mode (72px) with smooth 220ms transition. CSS variable-driven layout recalculation. Resize events dispatched for chart/topology recalculation.

### 📱 Presentation Mode
Toggle for projector-friendly display: stronger KPI contrast, reduced atmospheric noise, hidden scanlines, slower animations.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                    Frontend                       │
│  Next.js 16 · React 19 · Tailwind v4 · shadcn/ui │
│  TypeScript · Recharts · framer-motion            │
├──────────────────────────────────────────────────┤
│  Features                                         │
│  ├── Dashboard (Overview, Chamber, KPIs, AI)      │
│  ├── Topology (Canvas engine, network graph)      │
│  ├── Intelligence (AI analysis, health scoring)   │
│  ├── Timeline (Temporal patterns, forecasting)    │
│  ├── Command Center (Operational terminal)        │
│  ├── Configuration (System settings)              │
│  └── Debug Network (LAN diagnostics)              │
├──────────────────────────────────────────────────┤
│  Telemetry Pipeline                               │
│  globalThis.__mykosphare_telemetry_v1             │
│  ├── writeTelemetry(temp, hum, fan, humidifier)   │
│  ├── readTelemetry() → {freshnessMs, stale, ...}  │
│  └── debugDump() → full store snapshot            │
├──────────────────────────────────────────────────┤
│  API Routes                                       │
│  POST /api/data    ← ESP32 telemetry              │
│  GET  /api/data    → dashboard polling            │
│  POST /api/demo    ← simulation control           │
│  GET  /api/debug/telemetry → diagnostics          │
│  GET  /api/network-info  → LAN detection          │
│  POST /api/raw     ← raw packet capture           │
├──────────────────────────────────────────────────┤
│  Demo Orchestrator                                │
│  6-phase state machine · 48s loop                 │
│  Manual triggers: WARNING / CRITICAL / RECOVERY   │
└──────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui, Radix |
| Charts | Recharts |
| Animations | framer-motion, CSS keyframes, Canvas 2D |
| Icons | Lucide React |
| Networking | Node.js `os`, `http`, globalThis stores |
| Fonts | Geist Sans, Geist Mono |
| ESP32 | Arduino, WiFi, HTTPClient, DHT22, LCD I2C |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (binds to 0.0.0.0 for LAN access)
npm run dev

# Open dashboard
open http://localhost:3000

# Network diagnostics (from any device on LAN)
open http://localhost:3000/debug-network
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
| `/dashboard` | Overview — chamber, KPIs, AI analysis, quick start |
| `/dashboard/topology` | Live network graph with packet flow and core |
| `/dashboard/intelligence` | AI operational intelligence and health scoring |
| `/dashboard/timeline` | Temporal patterns, forecasting, drift analysis |
| `/dashboard/command-center` | Operational terminal and command interface |
| `/dashboard/configuration` | System settings and configuration |
| `/dashboard/alerts` | Alert management and incident tracking |
| `/dashboard/analytics` | Charts, metrics, and environmental history |
| `/debug-network` | LAN diagnostics, packet capture, ping monitor |

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
