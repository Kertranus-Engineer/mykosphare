# MYKOSPHARE — Debug & Networking Guide

## ESP32 → Next.js Telemetry Pipeline

```
ESP32 (WiFi client)
  │
  │ POST http://192.168.0.156:3000/api/data
  │ Body: { temp, hum, fan, humidifier, timestamp }
  ▼
Next.js Dev Server (192.168.0.156:3000)
  │
  │ Detached from build (in-memory globalThis store)
  ▼
globalThis.__mykosphare_telemetry_v1
  │
  │ GET /api/data (poll every 3s from browser)
  ▼
useTelemetry() React hook
  │
  ▼
Dashboard rendering
```

## Quick diagnosis

```bash
# Start Next.js with network binding
npm run dev:network

# Check server is reachable from another device
curl http://192.168.0.156:3000/api/data

# Simulate ESP32 POST
curl -X POST http://192.168.0.156:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"temp":24.5,"hum":62,"fan":false,"humidifier":false}'
```

## Windows Firewall

Windows Firewall blocks inbound connections by default. If the ESP32 cannot reach the Next.js server, the firewall is the most likely cause.

### Option A: Add a firewall rule (recommended)

Run the following PowerShell command **as Administrator**:

```powershell
New-NetFirewallRule -DisplayName "Next.js Dev Server (3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Option B: Temporarily disable firewall for testing

**Not recommended** for production, but useful for quick diagnostics:

```powershell
# Check current profile
Get-NetFirewallProfile | Select-Object Name, Enabled

# Disable for private network (temporary)
Set-NetFirewallProfile -Profile Private -Enabled False
```

### Verify the port is open

```powershell
# Check if port 3000 is listening on all interfaces
netstat -ano | findstr :3000
```

You should see `0.0.0.0:3000` or `[::]:3000` (not `127.0.0.1:3000`).

If you see only `127.0.0.1:3000`, the `-H 0.0.0.0` flag is not being applied. Run `npm run dev:network`.

## Endpoints Reference

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/data | ESP32 sends telemetry payload |
| GET | /api/data | Frontend polls latest telemetry |
| HEAD | /api/data | Lightweight liveness check (headers only) |
| GET | /api/debug/telemetry | Full debug dump (store + telemetry) |

## Debug Panel (in-browser)

When running in development, a yellow **DEBUG** button appears in the top-right corner of the dashboard. Click to open the Live Debug panel which shows:

- **Client state** — what `useTelemetry()` sees (source, online, stale, temp, hum, freshness)
- **Server state** — what `globalThis` store contains (last packet, freshness, source, payload)
- **Store dump** — raw `globalThis.__mykosphare_telemetry_v1` content

## Verifying the pipeline

1. Start server: `npm run dev:network`
2. Open dashboard in browser at `http://localhost:3000`
3. Open the DEBUG panel (top-right)
4. Simulate ESP32 POST:
   ```bash
   curl -X POST http://192.168.0.156:3000/api/data \
     -H "Content-Type: application/json" \
     -d '{"temp":24.5,"hum":62}'
   ```
5. Check debug panel: "last packet" should update, "online" should be true
6. Check browser console: you should see `[TEL] source=esp32 online=true`

## Common issues

### "DEVICE OFFLINE" stays forever
- ESP32 not sending POST, or
- Windows Firewall blocking the request, or
- Next.js not bound to `0.0.0.0` (check `netstat`)

### "TELEMETRY STALE" even with ESP32 sending
- Freshness > 15s (STALE_MS=15000). ESP32 sending too slowly.
- Check ESP32 WiFi stability.

### Server logs
Watch the terminal where `npm run dev:network` is running:
- `[API:DATA] incoming` — POST received with raw body
- `[API:DATA] parsed` — validated and parsed values
- `[API:DATA] stored` — what was written to store
- `[STORE] WRITE` — store confirmation
- `[STORE] READ` — GET request reading store

## Detaching from build

The telemetry store uses `globalThis` under the key `__mykosphare_telemetry_v1`. This means:

- Store survives HMR (Hot Module Replacement) reloads
- Store survives module re-evaluation in Next.js App Router
- Store is reset when the Node.js process is killed/restarted
- Store is NOT shared across machine/server boundaries
