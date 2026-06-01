import { describe, it, expect } from 'vitest'
import { generateRecommendations } from '@/lib/recommendations/recommendation-engine'
import type { Trend } from '@/lib/trends/trend-engine'

function makeTrend(overrides: Partial<Trend> = {}): Trend {
  return {
    id: 'trd-1',
    title: 'Environment Stable',
    category: 'system',
    direction: 'stable',
    confidence: 100,
    summary: 'Summary',
    observationCount: 0,
    startTime: '2025-06-01T12:00:00.000Z',
    endTime: '2025-06-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('generateRecommendations', () => {
  it('returns "Maintain Current Operating Conditions" with empty trends array', () => {
    const result = generateRecommendations([])

    expect(result.recommendations.length).toBe(1)
    expect(result.recommendations[0].title).toBe('Maintain Current Operating Conditions')
    expect(result.recommendations[0].priority).toBe('low')
    expect(result.stats.low).toBe(1)
  })

  it('returns "Maintain Current Operating Conditions" when only "Environment Stable" trend exists', () => {
    const trends: Trend[] = [
      makeTrend({ id: 'trd-1', title: 'Environment Stable', category: 'system', direction: 'stable' }),
    ]

    const result = generateRecommendations(trends)

    expect(result.recommendations.length).toBe(1)
    expect(result.recommendations[0].title).toBe('Maintain Current Operating Conditions')
  })

  it('returns "Increase Ventilation Frequency" with humidity degrading trend', () => {
    const trends: Trend[] = [
      makeTrend({ id: 'trd-h', title: 'Humidity Conditions Degrading', category: 'humidity', direction: 'degrading', observationCount: 3 }),
    ]

    const result = generateRecommendations(trends)

    expect(result.recommendations.length).toBe(1)
    expect(result.recommendations[0].title).toBe('Increase Ventilation Frequency')
    expect(result.recommendations[0].priority).toBe('high')
    expect(result.stats.high).toBe(1)
  })

  it('returns multiple high-priority recommendations with multiple degrading trends', () => {
    const trends: Trend[] = [
      makeTrend({ id: 'trd-h', title: 'Humidity Conditions Degrading', category: 'humidity', direction: 'degrading', observationCount: 3 }),
      makeTrend({ id: 'trd-t', title: 'Temperature Conditions Degrading', category: 'temperature', direction: 'degrading', observationCount: 2 }),
    ]

    const result = generateRecommendations(trends)

    expect(result.recommendations.length).toBe(2)
    expect(result.recommendations.every((r) => r.priority === 'high')).toBe(true)
    const titles = result.recommendations.map((r) => r.title)
    expect(titles).toContain('Increase Ventilation Frequency')
    expect(titles).toContain('Inspect Heat Sources')
    expect(result.stats.high).toBe(2)
  })
})
