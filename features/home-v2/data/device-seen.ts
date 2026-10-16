import { useEffect } from "react"

/**
 * "Has a real device ever reported to this browser?" The example view stays on until that
 * happens; from then on the person's own data is shown (see `effectiveDemo`).
 *
 * The flag is remembered on purpose: a transient drop of the ESP32 must never flip the screens
 * back to example numbers. If the device later goes quiet, the real screens say so honestly.
 *
 * The only thing stored is this boolean. Nothing simulated is ever written anywhere.
 */
export const DEVICE_SEEN_STORAGE_KEY = "mykosphare-device-seen"

/** How often the example view asks the server whether a device is reporting. */
export const DEVICE_PROBE_MS = 4000

type Listener = () => void
const listeners = new Set<Listener>()
let seen: boolean | null = null

function read(): boolean {
  try {
    return localStorage.getItem(DEVICE_SEEN_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function getDeviceSeenSnapshot(): boolean {
  if (seen === null) seen = read()
  return seen
}

/** The server cannot know: it renders the example view, like a first visit. */
export function getDeviceSeenServerSnapshot(): boolean {
  return false
}

export function markDeviceSeen(): void {
  if (getDeviceSeenSnapshot()) return
  seen = true
  try {
    localStorage.setItem(DEVICE_SEEN_STORAGE_KEY, "1")
  } catch {
    // storage unavailable: it still holds for this page session
  }
  listeners.forEach((listener) => listener())
}

export function subscribeDeviceSeen(listener: Listener): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== DEVICE_SEEN_STORAGE_KEY) return
    seen = read()
    listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/**
 * Only a fresh sample from a real ESP32 counts. The server also serves a simulator when nothing
 * is reporting (`source: "simulated"`), and stale or empty samples are not "connected".
 */
export function isLiveDeviceSample(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false
  const { source, stale, temp, hum } = data as Record<string, unknown>
  if (source !== "live" || stale === true) return false
  if (typeof temp !== "number" || typeof hum !== "number" || !Number.isFinite(temp) || !Number.isFinite(hum)) return false
  return temp > 0 || hum > 0
}

/**
 * Watches for the first real device while the example view is showing. Cheap on purpose: one small
 * GET every few seconds, only while the page is visible, and it stops for good once a device is seen.
 */
export function useDeviceProbe(active: boolean): void {
  useEffect(() => {
    if (!active) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let controller: AbortController | null = null

    const schedule = () => {
      if (!cancelled) timer = setTimeout(probe, DEVICE_PROBE_MS)
    }

    async function probe() {
      if (document.visibilityState !== "visible") return schedule()
      controller = new AbortController()
      try {
        const response = await fetch("/api/data", { cache: "no-store", signal: controller.signal })
        if (response.ok && isLiveDeviceSample(await response.json())) {
          if (!cancelled) markDeviceSeen()
          return
        }
      } catch {
        // offline or aborted: keep looking
      }
      schedule()
    }

    probe()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      controller?.abort()
    }
  }, [active])
}
