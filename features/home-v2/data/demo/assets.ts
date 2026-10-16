/**
 * Static demonstration pictures (public/demo/oyster). They are the pre-rendered output of the
 * procedural generator in `frames.ts`, so a phone downloads small cacheable WebP files (~20–30 KB
 * each, ~5 KB thumbnails) instead of building SVG filters at runtime.
 *
 * They are illustrations made for this project (no third-party image, no licence to track), and
 * every consumer labels them as demo (PhotoModel.kind === "demo").
 */
import { DEMO_CROP_DAY } from "./crop"

export const DEMO_PHOTO_BASE = "/demo/oyster"

const pad = (day: number) => String(day).padStart(2, "0")

export function demoPhotoUrl(day: number): string {
  return `${DEMO_PHOTO_BASE}/day-${pad(day)}.webp`
}

/** ~240×300, for thumbnails (a 72 px thumbnail must not decode an 800 px picture). */
export function demoPhotoThumbUrl(day: number): string {
  return `${DEMO_PHOTO_BASE}/day-${pad(day)}-sm.webp`
}

/** Tighter crop used by the hero. Only the newest day has one (the hero always shows the newest picture). */
export function demoHeroUrl(day: number): string | undefined {
  return day === DEMO_CROP_DAY ? `${DEMO_PHOTO_BASE}/hero-day-${pad(day)}.webp` : undefined
}
