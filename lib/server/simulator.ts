/**
 * MYKOSPHARE — Server-Side Simulation Engine
 *
 * Generates realistic environmental telemetry when no ESP32 hardware is connected.
 * Values follow natural patterns with daily sinusoidal variation and mild random walk.
 * Deterministic per time-block so concurrent requests return consistent values.
 */

const BASE_TEMP = 24.2
const BASE_HUM = 61.5
const BASE_CO2 = 410

const DAILY_TEMP_AMPLITUDE = 1.8
const DAILY_HUM_AMPLITUDE = 5.0
const DAILY_CO2_AMPLITUDE = 18

const BLOCK_MS = 3000

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smoothPseudoRandom(seed: number, subT: number): number {
  const a = pseudoRandom(seed)
  const b = pseudoRandom(seed + 1)
  return lerp(a, b, subT)
}

export interface SimulatedTelemetry {
  temp: number
  hum: number
  co2: number
  energy: number
  fan: boolean
  humidifier: boolean
}

export function generateSimulatedTelemetry(): SimulatedTelemetry {
  const now = Date.now()
  const block = Math.floor(now / BLOCK_MS)
  const subT = (now % BLOCK_MS) / BLOCK_MS

  const dayMs = now % 86_400_000
  const dayPhase = (dayMs / 86_400_000) * Math.PI * 2

  const r1 = smoothPseudoRandom(block, subT)
  const r2 = smoothPseudoRandom(block + 100, subT)
  const r3 = smoothPseudoRandom(block + 200, subT)

  const temp = Math.round((
    BASE_TEMP +
    Math.sin(dayPhase - Math.PI * 0.3) * DAILY_TEMP_AMPLITUDE +
    (r1 - 0.5) * 1.4
  ) * 10) / 10

  const hum = Math.round((
    BASE_HUM +
    Math.cos(dayPhase - Math.PI * 0.5) * DAILY_HUM_AMPLITUDE +
    (r2 - 0.5) * 4.0
  ) * 10) / 10

  const co2 = Math.round(
    BASE_CO2 +
    Math.sin(dayPhase) * DAILY_CO2_AMPLITUDE +
    (r3 - 0.5) * 14
  )

  const energy = Math.round((
    0.8 + Math.max(0, (temp - 23) * 0.3) + Math.max(0, (hum - 60) * 0.02)
  ) * 10) / 10

  const fan = temp > 26.5
  const humidifier = hum < 57

  return { temp, hum, co2, energy, fan, humidifier }
}
