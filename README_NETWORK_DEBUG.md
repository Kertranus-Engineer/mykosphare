# NETWORK DEBUG — ESP32 → Next.js Connectivity

## Diagnosis goal

Determine if the ESP32 HTTP packet physically reaches the Next.js server.

If `/api/raw` receives **zero packets**, the problem is **pure networking** — not React, not the store, not TypeScript, not hydration.

## Quick test flow

### 1. Start server

```bash
npm run dev
```

You should see in terminal:

```
═══════════════════════════════════════════
  MYKOSPHARE — SERVER START
═══════════════════════════════════════════
[SERVER] listening on 0.0.0.0:3000
...
```

### 2. Open debug page

Browser: `http://localhost:3000/debug-network`

This page:
- Pings `GET /api/ping` every 1 second
- Polls `GET /api/raw` every 1 second
- Shows latency sparkline (browser → server)
- Shows raw ESP32 packets (if any arrived)
- Shows diagnostic checklist

### 3. Simulate ESP32 from another device

From your phone (same WiFi) or another computer:

```bash
curl -X POST http://192.168.0.156:3000/api/raw \
  -H "Content-Type: application/json" \
  -d '{"temp":24.5,"hum":61.2}'
```

Also works from PowerShell on the same machine:

```powershell
$body = '{"temp":24.5,"hum":61.2}'
Invoke-RestMethod -Uri "http://192.168.0.156:3000/api/raw" -Method POST -Body $body -ContentType "application/json"
```

### 4. Check results

- If the debug-network page shows the packet → server is reachable
- If NOTHING appears → networking problem

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ping` | `{ok:true, ts:...}` — no logic, no store |
| POST | `/api/raw` | Captures raw body text to `globalThis.__mykosphare_raw_packets_v1` |
| GET | `/api/raw` | Returns last 5 packets captured |
| GET | `/debug-network` | Live monitoring page |

## ESP32 firmware — minimal POST

Instead of `/api/data`, use `/api/raw` for testing:

```cpp
// Minimal HTTP POST test on ESP32
HTTPClient http;
http.begin("http://192.168.0.156:3000/api/raw");
http.addHeader("Content-Type", "application/json");

String payload = "{\"temp\":24.5,\"hum\":61.2}";
int httpCode = http.POST(payload);

Serial.printf("[ESP32] POST /api/raw → HTTP %d\n", httpCode);
Serial.printf("[ESP32] Response: %s\n", http.getString().c_str());

http.end();
```

No config, no heartbeat, no deployment_id. Just temp + hum.

## Windows Firewall

### Check if port is blocked

From another device on the same network, try:

```bash
curl -v http://192.168.0.156:3000/api/ping
```

If it **hangs forever** or gives **Connection refused / timeout**:
→ Windows Firewall is blocking.

### Fix

Run as **Administrator** in PowerShell:

```powershell
New-NetFirewallRule -DisplayName "Next.js Dev (3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private
```

### Verify rule exists

```powershell
Get-NetFirewallRule -DisplayName "Next.js Dev (3000)" | Format-List Enabled, Direction, Action
```

## Verify binding

```powershell
netstat -ano | findstr :3000 | findstr LISTENING
```

Must show `0.0.0.0:3000` or `[::]:3000`.

If it shows only `127.0.0.1:3000` → the `-H 0.0.0.0` flag is not working. Restart with `npm run dev:network`.

## IP check

ESP32 sends to `192.168.0.156`. Verify the PC's actual IP:

```powershell
ipconfig | findstr "IPv4"
```

If the IP changed (DHCP), update the ESP32 firmware.

Common Windows IP ranges:
- `192.168.0.x`
- `192.168.1.x`
- `192.168.68.x` (some routers)
- `10.0.0.x`

## Final diagnosis checklist

| Check | How to verify |
|-------|--------------|
| ESP32 WiFi connected? | LCD shows IP |
| ESP32 can ping the PC? | ESP32 Serial: `ping 192.168.0.156` |
| Next bound to 0.0.0.0? | `netstat -ano \| findstr :3000` |
| Windows Firewall open? | PowerShell rule check |
| ESP32 HTTP response? | Serial monitor: HTTP code |
| Server sees the request? | Terminal log: `[SERVER] incoming telemetry` |
| Browser sees the packet? | `/debug-network` page |

## If nothing arrives

The problem is one of:
1. **Firewall blocking** (most common on Windows)
2. **Next.js not bound to 0.0.0.0** (verify with `netstat`)
3. **ESP32 IP config wrong** (wrong IP or port in firmware)
4. **WiFi isolation** (some routers block device-to-device traffic)
5. **ESP32 HTTP library timeout** (too short, no retry)
6. **Antivirus** (some AV software blocks dev servers)

## Router WiFi isolation

Some routers have "AP Isolation" or "Client Isolation" enabled, which prevents WiFi devices from communicating with each other. Check your router settings if the ESP32 can't reach the PC even though both are on the same WiFi.
