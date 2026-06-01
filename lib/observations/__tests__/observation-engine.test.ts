import { describe, it, expect } from 'vitest'
import { generateObservations, getObservationsForCapture } from '@/lib/observations/observation-engine'
import type { EnvironmentalEvent } from '@/lib/events/event-engine'

function makeEvent(overrides: Partial<EnvironmentalEvent> = {}): EnvironmentalEvent {
  return {
    id: 'evt-1',
    timestamp: '2025-06-01T12:00:00.000Z',
    severity: 'info',
    category: 'system',
    title: 'Test Event',
    description: 'A test event',
    ...overrides,
  }
}

describe('generateObservations', () => {
  it('returns "Environment Stable" when there are no warning events', () => {
    const events: EnvironmentalEvent[] = [
      makeEvent({ id: 'e1', severity: 'info', category: 'system', title: 'All good' }),
    ]

    const result = generateObservations(events)

    expect(result.observations.length).toBe(1)
    expect(result.observations[0].title).toBe('Environment Stable')
    expect(result.observations[0].severity).toBe('info')
    expect(result.stats.info).toBe(1)
    expect(result.stats.warning).toBe(0)
  })

  it('returns "Elevated Humidity Detected" with humidity warnings', () => {
    const events: EnvironmentalEvent[] = [
      makeEvent({ id: 'e1', severity: 'warning', category: 'humidity', title: 'High humidity anomaly' }),
    ]

    const result = generateObservations(events)

    expect(result.observations.some((o) => o.title === 'Elevated Humidity Detected')).toBe(true)
    const humObs = result.observations.find((o) => o.title === 'Elevated Humidity Detected')
    expect(humObs!.severity).toBe('warning')
    expect(humObs!.sourceEvents).toContain('e1')
  })

  it('returns "Temperature Trend Requires Attention" with temperature warnings', () => {
    const events: EnvironmentalEvent[] = [
      makeEvent({ id: 'e1', severity: 'warning', category: 'temperature', title: 'Elevated temperature' }),
    ]

    const result = generateObservations(events)

    expect(result.observations.some((o) => o.title === 'Temperature Trend Requires Attention')).toBe(true)
    const tempObs = result.observations.find((o) => o.title === 'Temperature Trend Requires Attention')
    expect(tempObs!.severity).toBe('warning')
    expect(tempObs!.sourceEvents).toContain('e1')
  })

  it('returns "Visual Monitoring Interrupted" with capture failures', () => {
    const events: EnvironmentalEvent[] = [
      makeEvent({ id: 'e1', severity: 'warning', category: 'capture', title: 'Capture overdue' }),
    ]

    const result = generateObservations(events)

    expect(result.observations.some((o) => o.title === 'Visual Monitoring Interrupted')).toBe(true)
    const capObs = result.observations.find((o) => o.title === 'Visual Monitoring Interrupted')
    expect(capObs!.severity).toBe('warning')
    expect(capObs!.sourceEvents).toContain('e1')
  })

  it('returns "Telemetry Correlation Unavailable" with correlation events', () => {
    const events: EnvironmentalEvent[] = [
      makeEvent({ id: 'e1', severity: 'warning', category: 'correlation', title: 'No correlated telemetry' }),
    ]

    const result = generateObservations(events)

    expect(result.observations.some((o) => o.title === 'Telemetry Correlation Unavailable')).toBe(true)
    const corObs = result.observations.find((o) => o.title === 'Telemetry Correlation Unavailable')
    expect(corObs!.severity).toBe('warning')
    expect(corObs!.sourceEvents).toContain('e1')
  })
})

describe('getObservationsForCapture', () => {
  it('filters observations linked to a specific capture', () => {
    const events: EnvironmentalEvent[] = [
      makeEvent({ id: 'evt-x', severity: 'warning', category: 'humidity', title: 'High humidity anomaly', captureId: 'cap-a' }),
    ]
    const { observations } = generateObservations(events)

    const linked = getObservationsForCapture(observations, events, 'cap-a')
    expect(linked.length).toBe(1)
    expect(linked[0].title).toBe('Elevated Humidity Detected')
  })

  it('returns empty array when capture has no associated observations', () => {
    const events: EnvironmentalEvent[] = [
      makeEvent({ id: 'evt-x', severity: 'warning', category: 'humidity', title: 'High humidity anomaly', captureId: 'cap-a' }),
    ]
    const { observations } = generateObservations(events)

    const linked = getObservationsForCapture(observations, events, 'cap-other')
    expect(linked.length).toBe(0)
  })
})
