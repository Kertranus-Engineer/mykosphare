import { describe, it, expect } from 'vitest'
import { generateEvents, getEventsForCapture, getEventsByWindow } from '@/lib/events/event-engine'
import type { TelemetryRow } from '@/lib/services/telemetry-service'
import type { ProcessedCapture } from '@/lib/capture-processing/types'
import type { CorrelatedCapture } from '@/lib/correlation/correlation-engine'

function makeTelemetry(overrides: Partial<TelemetryRow> = {}): TelemetryRow {
  return {
    id: 'tel-1',
    created_at: '2025-06-01T12:00:00.000Z',
    temperature: 25,
    humidity: 60,
    co2: 500,
    energy_usage: null,
    environmental_state: null,
    operational_mode: null,
    deployment_id: null,
    ...overrides,
  }
}

function makeCapture(overrides: Partial<ProcessedCapture> = {}): ProcessedCapture {
  return {
    id: 'cap-1',
    filename: 'test.jpg',
    imageUrl: 'https://example.com/test.jpg',
    bucketPath: 'snapshots/test.jpg',
    uploadedAt: '2025-06-01T12:00:00.000Z',
    processedAt: '2025-06-01T12:00:00.000Z',
    fileSize: 1024,
    width: 800,
    height: 600,
    aspectRatio: 1.33,
    format: 'jpg',
    hash: 'abc123',
    source: 'supabase',
    lifecycle: 'processed',
    isDuplicate: false,
    metadata: {
      mimeType: 'image/jpeg',
      colorSpace: 'sRGB',
      hasAlpha: false,
      bitDepth: 8,
    },
    ...overrides,
  }
}

function makeCorrelated(overrides: Partial<CorrelatedCapture> = {}): CorrelatedCapture {
  return {
    capture: makeCapture(),
    telemetry: makeTelemetry(),
    correlationScore: 90,
    timeOffsetSeconds: 30,
    ...overrides,
  }
}

describe('generateEvents', () => {
  it('produces temperature and humidity events with valid telemetry data', () => {
    const telemetry = [
      makeTelemetry({ id: 'tel-1', temperature: 29, humidity: 62, co2: 500 }),
      makeTelemetry({ id: 'tel-2', temperature: 24, humidity: 80, co2: 500 }),
    ]

    const result = generateEvents({ telemetry })

    const tempEvents = result.events.filter((e) => e.category === 'temperature')
    const humEvents = result.events.filter((e) => e.category === 'humidity')

    expect(tempEvents.length).toBe(1)
    expect(tempEvents[0].severity).toBe('warning')
    expect(tempEvents[0].title).toBe('Elevated temperature')

    expect(humEvents.length).toBe(1)
    expect(humEvents[0].severity).toBe('warning')
    expect(humEvents[0].title).toBe('High humidity anomaly')
  })

  it('produces system events about no data when inputs are empty', () => {
    const result = generateEvents({})

    const systemEvents = result.events.filter((e) => e.category === 'system')
    expect(systemEvents.length).toBe(2)
    expect(systemEvents.some((e) => e.title === 'No telemetry data available')).toBe(true)
    expect(systemEvents.some((e) => e.title === 'No captures registered')).toBe(true)
  })

  it('produces critical events when values exceed critical thresholds', () => {
    const telemetry = [
      makeTelemetry({ id: 'tel-1', temperature: 33, humidity: 60, co2: 2500 }),
    ]

    const result = generateEvents({ telemetry })

    const criticalEvents = result.events.filter((e) => e.severity === 'critical')
    expect(criticalEvents.length).toBe(2)
    expect(criticalEvents.some((e) => e.category === 'temperature')).toBe(true)
    expect(criticalEvents.some((e) => e.category === 'co2')).toBe(true)
    expect(result.stats.critical).toBe(2)
  })
})

describe('getEventsForCapture', () => {
  it('filters events by captureId', () => {
    const events = [
      { id: 'e1', timestamp: '2025-01-01T00:00:00Z', severity: 'info' as const, category: 'system' as const, title: 'A', description: '', captureId: 'cap-a' },
      { id: 'e2', timestamp: '2025-01-01T00:00:00Z', severity: 'info' as const, category: 'system' as const, title: 'B', description: '', captureId: 'cap-b' },
      { id: 'e3', timestamp: '2025-01-01T00:00:00Z', severity: 'info' as const, category: 'system' as const, title: 'C', description: '' },
    ]

    const filtered = getEventsForCapture(events, 'cap-a')
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe('e1')
  })
})

describe('getEventsByWindow', () => {
  it('filters events within the specified time window', () => {
    const events = [
      { id: 'e1', timestamp: '2025-06-01T12:05:00.000Z', severity: 'info' as const, category: 'system' as const, title: 'Within window', description: '' },
      { id: 'e2', timestamp: '2025-06-01T12:20:00.000Z', severity: 'info' as const, category: 'system' as const, title: 'Outside window', description: '' },
    ]

    const filtered = getEventsByWindow(events, '2025-06-01T12:00:00.000Z', 600_000)
    expect(filtered.length).toBe(1)
    expect(filtered[0].title).toBe('Within window')
  })
})
