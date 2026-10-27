import type { Episode, IntelligenceConfig, MetricId, Range, ReadingPoint } from "./types"

export interface Sample {
  t: number
  iso: string
  temperature: number | null
  humidity: number | null
  /** The row carries a value that is physically impossible or an implausible jump. */
  invalid: Partial<Record<MetricId, boolean>>
}

const METRICS: readonly MetricId[] = ["temperature", "humidity"]

/** Ascending, de-duplicated samples with faulty values flagged (never silently corrected). */
export function normalizeSeries(readings: readonly ReadingPoint[], config: IntelligenceConfig): Sample[] {
  const byTime = new Map<number, Sample>()
  for (const reading of readings) {
    const t = Date.parse(reading.observedAt)
    if (!Number.isFinite(t) || byTime.has(t)) continue
    byTime.set(t, { t, iso: new Date(t).toISOString(), temperature: reading.temperature, humidity: reading.humidity, invalid: {} })
  }
  const samples = [...byTime.values()].sort((a, b) => a.t - b.t)
  const lastGood: Partial<Record<MetricId, number>> = {}
  for (const sample of samples) {
    for (const metric of METRICS) {
      const value = sample[metric]
      if (value === null) continue
      const [lo, hi] = config.physicalBounds[metric]
      const previous = lastGood[metric]
      if (!Number.isFinite(value) || value < lo || value > hi ||
          (previous !== undefined && Math.abs(value - previous) > config.maxSampleJump[metric])) {
        sample.invalid[metric] = true
      } else {
        lastGood[metric] = value
      }
    }
  }
  return samples
}

export function validValue(sample: Sample, metric: MetricId): number | null {
  const value = sample[metric]
  return value !== null && Number.isFinite(value) && !sample.invalid[metric] ? value : null
}

/**
 * Out-of-range episodes with hysteresis and persistence:
 *  - an excursion starts only after `persistence.samples` consecutive samples AND `persistence.minMs`;
 *  - it ends only when the value is back inside the range by the hysteresis margin.
 * That keeps a value hovering at a limit from flapping between "ok" and "alert".
 */
export function detectEpisodes(samples: readonly Sample[], metric: MetricId, range: Range, config: IntelligenceConfig): Episode[] {
  const margin = config.hysteresis[metric]
  const episodes: Episode[] = []
  type Candidate = { direction: "low" | "high"; count: number; startT: number; startIso: string; extreme: number; critical: boolean }
  // Mutable state lives on one object so control-flow analysis does not narrow it away.
  const st: { candidate: Candidate | null; open: Episode | null } = { candidate: null, open: null }

  const isCritical = (value: number) =>
    (range.criticalMin !== undefined && value <= range.criticalMin) || (range.criticalMax !== undefined && value >= range.criticalMax)
  const directionOf = (value: number): "low" | "high" | null => value < range.min ? "low" : value > range.max ? "high" : null

  const consider = (sample: Sample, value: number) => {
    const dir = directionOf(value)
    if (!dir) { st.candidate = null; return }
    const previous = st.candidate
    const next: Candidate = previous && previous.direction === dir
      ? { ...previous, count: previous.count + 1, extreme: dir === "low" ? Math.min(previous.extreme, value) : Math.max(previous.extreme, value), critical: previous.critical || isCritical(value) }
      : { direction: dir, count: 1, startT: sample.t, startIso: sample.iso, extreme: value, critical: isCritical(value) }
    if (next.count >= config.persistence.samples && sample.t - next.startT >= config.persistence.minMs) {
      st.open = { id: `${metric}:${dir}:${next.startIso}`, metric, direction: dir, startedAt: next.startIso, endedAt: null, extreme: next.extreme, critical: next.critical }
      st.candidate = null
    } else {
      st.candidate = next
    }
  }

  for (const sample of samples) {
    const value = validValue(sample, metric)
    if (value === null) continue
    const open = st.open
    if (!open) { consider(sample, value); continue }
    open.extreme = open.direction === "low" ? Math.min(open.extreme, value) : Math.max(open.extreme, value)
    open.critical = open.critical || isCritical(value)
    const recovered = open.direction === "low" ? value >= range.min + margin : value <= range.max - margin
    const crossed = open.direction === "low" ? value > range.max : value < range.min
    if (recovered || crossed) {
      episodes.push({ ...open, endedAt: sample.iso })
      st.open = null
      st.candidate = null
      if (crossed) consider(sample, value)
    }
  }
  if (st.open) episodes.push(st.open)
  return episodes
}

/** Change between the first sample inside the window and the latest one; null when the window is too short. */
export function rapidChange(samples: readonly Sample[], metric: MetricId, config: IntelligenceConfig): { delta: number; spanMs: number } | null {
  const valid = samples.filter(s => validValue(s, metric) !== null)
  const last = valid[valid.length - 1]
  if (!last) return null
  const inWindow = valid.filter(s => last.t - s.t <= config.rapidChange.windowMs)
  const first = inWindow[0]
  if (inWindow.length < 2 || !first) return null
  const spanMs = last.t - first.t
  if (spanMs < config.rapidChange.minSpanMs) return null
  const delta = (validValue(last, metric) as number) - (validValue(first, metric) as number)
  return Math.abs(delta) >= config.rapidChange[metric] ? { delta, spanMs } : null
}

/** Periods with no measurements between two consecutive samples. */
export function findSignalGaps(samples: readonly Sample[], gapMs: number): { startedAt: string; endedAt: string }[] {
  const gaps: { startedAt: string; endedAt: string }[] = []
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]
    const next = samples[i]
    if (prev && next && next.t - prev.t > gapMs) gaps.push({ startedAt: prev.iso, endedAt: next.iso })
  }
  return gaps
}
