import { describe, it, expect } from 'vitest'
import { generateTrends, getTrendsForCapture } from '@/lib/trends/trend-engine'
import type { Observation } from '@/lib/observations/observation-engine'

function makeObservation(overrides: Partial<Observation> = {}): Observation {
  return {
    id: 'obs-1',
    timestamp: '2025-06-01T12:00:00.000Z',
    severity: 'info',
    title: 'Test Observation',
    summary: 'A test observation',
    sourceEvents: [],
    ...overrides,
  }
}

function makeWarningObs(title: string, id = 'obs-warn'): Observation {
  return makeObservation({
    id,
    severity: 'warning',
    title,
    sourceEvents: ['evt-1'],
  })
}

describe('generateTrends', () => {
  it('produces "Environment Stable" when both arrays are empty', () => {
    const result = generateTrends([], [])

    expect(result.trends.length).toBe(1)
    expect(result.trends[0].title).toBe('Environment Stable')
    expect(result.trends[0].direction).toBe('stable')
    expect(result.stats.stable).toBe(1)
  })

  it('produces "Environment Stable" when both arrays have only info observations', () => {
    const current = [makeObservation({ severity: 'info', title: 'Environment Stable' })]
    const previous = [makeObservation({ severity: 'info', title: 'Environment Stable' })]

    const result = generateTrends(current, previous)

    expect(result.trends[0].title).toBe('Environment Stable')
  })

  it('produces degrading trend when humidity observations increase', () => {
    const current = [
      makeWarningObs('Elevated Humidity Detected', 'obs-current-1'),
      makeWarningObs('Elevated Humidity Detected', 'obs-current-2'),
    ]
    const previous: Observation[] = []

    const result = generateTrends(current, previous)

    const humTrend = result.trends.find((t) => t.category === 'humidity')
    expect(humTrend).toBeDefined()
    expect(humTrend!.direction).toBe('degrading')
    expect(humTrend!.title).toBe('Humidity Conditions Degrading')
  })

  it('produces improving trend when conditions improve', () => {
    const previous = [
      makeWarningObs('Elevated Humidity Detected', 'obs-prev-1'),
      makeWarningObs('Elevated Humidity Detected', 'obs-prev-2'),
      makeWarningObs('Elevated Humidity Detected', 'obs-prev-3'),
    ]
    const current = [
      makeWarningObs('Elevated Humidity Detected', 'obs-curr-1'),
    ]

    const result = generateTrends(current, previous)

    const humTrend = result.trends.find((t) => t.category === 'humidity')
    expect(humTrend).toBeDefined()
    expect(humTrend!.direction).toBe('improving')
    expect(humTrend!.title).toBe('Humidity Conditions Improving')
  })
})

describe('getTrendsForCapture', () => {
  it('filters trends relevant to observations for a capture', () => {
    const trends = [
      {
        id: 'trd-1',
        title: 'Trend 1',
        category: 'humidity' as const,
        direction: 'degrading' as const,
        confidence: 80,
        summary: '',
        observationCount: 1,
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-01-01T00:00:00Z',
      },
      {
        id: 'trd-2',
        title: 'Trend 2',
        category: 'temperature' as const,
        direction: 'stable' as const,
        confidence: 70,
        summary: '',
        observationCount: 1,
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-01-01T00:00:00Z',
      },
      {
        id: 'trd-3',
        title: 'Trend 3',
        category: 'capture' as const,
        direction: 'stable' as const,
        confidence: 60,
        summary: '',
        observationCount: 1,
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-01-01T00:00:00Z',
      },
    ]
    const captureObservations: Observation[] = [
      makeObservation({ title: 'Elevated Humidity Detected', sourceEvents: ['evt-1'] }),
    ]

    const result = getTrendsForCapture(trends, captureObservations)

    expect(result.length).toBe(1)
    expect(result[0].category).toBe('humidity')
  })
})
