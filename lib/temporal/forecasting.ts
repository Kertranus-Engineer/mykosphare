import type { Forecast, TrendDirection } from "./types"

interface ForecastInput {
  values: number[]
  metric: string
  horizon: string
  threshold?: number
  aboveThreshold?: boolean
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function calcSlope(values: number[]): number {
  if (values.length < 2) return 0
  const n = values.length
  const meanX = (n - 1) / 2
  const meanY = average(values)
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY)
    den += (i - meanX) ** 2
  }
  return den !== 0 ? num / den : 0
}

function estimateVolatility(values: number[], mean: number): number {
  if (values.length < 2) return 0
  const sqDiffs = values.map((n) => (n - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1))
}

function calcConfidence(samples: number, volatility: number, mean: number): number {
  if (samples < 3) return 30
  const sampleFactor = Math.min(1, samples / 100)
  const cv = mean !== 0 ? volatility / mean : volatility
  const volFactor = Math.max(0, 1 - cv * 3)
  return Math.round(Math.min(95, Math.max(10, (sampleFactor * 40 + volFactor * 60))))
}

export function projectTrend(input: ForecastInput): Forecast {
  const { values, metric, horizon, threshold, aboveThreshold } = input
  if (values.length === 0) {
    return {
      metric,
      currentValue: 0,
      projectedNext: 0,
      projectedChange: 0,
      projectedInstability: 0,
      breachProbability: 0,
      horizon,
    }
  }

  const currentValue = values[values.length - 1]
  const mean = average(values)
  const slope = calcSlope(values)
  const volatility = estimateVolatility(values, mean)

  const projectedNext = currentValue + slope * 10
  const projectedChange = currentValue !== 0
    ? Math.round(((projectedNext - currentValue) / currentValue) * 1000) / 10
    : 0

  const projectedInstability = Math.round(Math.min(100, volatility * 20))

  let breachProbability = 0
  if (threshold !== undefined) {
    if (aboveThreshold && projectedNext > threshold) {
      const severity = (projectedNext - threshold) / threshold
      breachProbability = Math.round(Math.min(95, Math.max(5, severity * 100)))
    } else if (!aboveThreshold && projectedNext < threshold) {
      const severity = (threshold - projectedNext) / threshold
      breachProbability = Math.round(Math.min(95, Math.max(5, severity * 100)))
    }
  }

  const confidence = calcConfidence(values.length, volatility, mean)

  return {
    metric,
    currentValue: Math.round(currentValue * 100) / 100,
    projectedNext: Math.round(projectedNext * 100) / 100,
    projectedChange,
    projectedInstability,
    breachProbability,
    horizon,
  }
}

export function generateForecasts(
  temps: number[],
  hums: number[],
  co2s: number[],
  energies: number[],
  targetTemp: number,
  targetHum: number,
  targetCo2: number
): Forecast[] {
  return [
    projectTrend({
      values: temps,
      metric: "temperature",
      horizon: "10 readings ahead",
      threshold: targetTemp + 1.5,
      aboveThreshold: true,
    }),
    projectTrend({
      values: hums,
      metric: "humidity",
      horizon: "10 readings ahead",
      threshold: targetHum + 5,
      aboveThreshold: true,
    }),
    projectTrend({
      values: co2s,
      metric: "co2",
      horizon: "10 readings ahead",
      threshold: targetCo2 + 30,
      aboveThreshold: true,
    }),
    projectTrend({
      values: energies,
      metric: "energy",
      horizon: "10 readings ahead",
    }),
  ]
}
