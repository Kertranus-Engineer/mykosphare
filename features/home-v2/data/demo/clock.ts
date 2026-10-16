/**
 * Minute clock for the demonstration engine.
 *
 * - Client only: the server snapshot is `null`, so server and first client render agree
 *   (the engine shows a loading state until the first tick; it never renders a time-dependent value on the server).
 * - Costs nothing unless somebody subscribes (the demo is on), and PAUSES while the page is hidden, so a
 *   backgrounded app runs no timers at all. Coming back to the foreground ticks immediately.
 */
const MINUTE = 60_000
const CHECK_EVERY_MS = 15_000

type Listener = () => void

const listeners = new Set<Listener>()
let current: number | null = null
let timer: ReturnType<typeof setInterval> | null = null

export function minuteOf(ms: number): number {
  return Math.floor(ms / MINUTE) * MINUTE
}

function tick() {
  const next = minuteOf(Date.now())
  if (next === current) return
  current = next
  listeners.forEach((listener) => listener())
}

function start() {
  if (timer === null) timer = setInterval(tick, CHECK_EVERY_MS)
}

function stop() {
  if (timer !== null) clearInterval(timer)
  timer = null
}

function onVisibility() {
  if (document.visibilityState === "hidden") {
    stop()
  } else {
    tick()
    start()
  }
}

export function subscribeDemoClock(listener: Listener): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisibility)
    if (document.visibilityState !== "hidden") start()
  }
  tick()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      document.removeEventListener("visibilitychange", onVisibility)
      stop()
    }
  }
}

/** Current minute (epoch ms), or null before the first client tick. */
export function getDemoClock(): number | null {
  return current
}

export function getDemoClockServer(): null {
  return null
}

/** Test helper. */
export function resetDemoClockForTests(): void {
  listeners.clear()
  stop()
  current = null
}

export const noopSubscribe = (): (() => void) => () => {}
