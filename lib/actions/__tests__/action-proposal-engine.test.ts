import { describe, it, expect } from 'vitest'
import { generateActionProposals, formatProposalDiff } from '@/lib/actions/action-proposal-engine'
import type { Recommendation } from '@/lib/recommendations/recommendation-engine'

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: 'rec-1',
    timestamp: '2025-06-01T12:00:00.000Z',
    priority: 'low',
    title: 'Maintain Current Operating Conditions',
    description: 'Test description',
    sourceTrendId: 'trd-1',
    category: 'system',
    ...overrides,
  }
}

describe('generateActionProposals', () => {
  it('produces fan_interval proposal for humidity recommendation', () => {
    const recommendations: Recommendation[] = [
      makeRecommendation({ id: 'rec-1', title: 'Increase Ventilation Frequency' }),
    ]

    const result = generateActionProposals(recommendations)

    expect(result.proposals.length).toBe(1)
    expect(result.proposals[0].parameter).toBe('fan_interval')
    expect(result.proposals[0].currentValue).toBe(180)
    expect(result.proposals[0].suggestedValue).toBe(120)
    expect(result.proposals[0].confidence).toBe(82)
  })

  it('produces maintain-value proposal for stable recommendation', () => {
    const recommendations: Recommendation[] = [
      makeRecommendation({ id: 'rec-1', title: 'Continue Humidity Monitoring' }),
    ]

    const result = generateActionProposals(recommendations)

    expect(result.proposals.length).toBe(1)
    expect(result.proposals[0].parameter).toBe('fan_interval')
    expect(result.proposals[0].currentValue).toBe(180)
    expect(result.proposals[0].suggestedValue).toBe(180)
    expect(result.proposals[0].confidence).toBe(90)
  })
})

describe('formatProposalDiff', () => {
  it('returns diff with isChange=true when values differ', () => {
    const proposal = {
      id: 'act-1',
      recommendationId: 'rec-1',
      parameter: 'fan_interval',
      currentValue: 180,
      suggestedValue: 120,
      expectedOutcome: 'Test',
      confidence: 82,
    }

    const diff = formatProposalDiff(proposal)

    expect(diff.numeric).toBe('-60')
    expect(diff.percent).toBe('-33%')
    expect(diff.isChange).toBe(true)
  })

  it('returns diff with isChange=false when values are the same', () => {
    const proposal = {
      id: 'act-1',
      recommendationId: 'rec-1',
      parameter: 'fan_interval',
      currentValue: 180,
      suggestedValue: 180,
      expectedOutcome: 'Test',
      confidence: 90,
    }

    const diff = formatProposalDiff(proposal)

    expect(diff.numeric).toBe('0')
    expect(diff.isChange).toBe(false)
  })
})
