/**
 * The example crop of the demonstration engine: ONE story, told once.
 *
 * Species: Pleurotus ostreatus (hongo ostra). Active crop, day 11, stage
 * Colonización. Every screen reads this same record: the pictures, the logbook,
 * the observations and the stage plan all refer to the same days, so nothing can
 * contradict anything else. It is an illustration, not a real crop.
 */
import type { LogKind, Tone } from "../model"

export const DEMO_CROP_DAY = 11
export const DEMO_CROP_STAGE = "colonization" as const

/** Days that have a picture. Each one shows the same block at a different point of the colonization. */
export const DEMO_PHOTO_DAYS = [1, 3, 5, 7, 9, 11] as const

export interface CropEventSpec {
  id: string
  /** Crop day, 1-based. Day 11 is today. */
  day: number
  hour: number
  minute: number
  kind: LogKind
  title: string
  detail?: string
  tone: Tone
  /** Day of the picture this entry refers to. */
  photoDay?: number
}

/** Short description of each picture, shared by the gallery and the logbook. */
export const DEMO_PHOTO_CAPTIONS: Record<number, string> = {
  1: "Sustrato recién inoculado. Se ven los granos de inóculo.",
  3: "Primeras zonas blancas alrededor de los granos.",
  5: "Las zonas blancas empiezan a unirse.",
  7: "Más de la mitad de la superficie visible está cubierta.",
  9: "Casi toda la superficie visible está cubierta.",
  11: "Colonización avanzada: quedan pocas zonas sin cubrir.",
}

/** Chronological story of the example crop (times are local, scheduled). */
export const DEMO_CROP_EVENTS: readonly CropEventSpec[] = [
  { id: "started", day: 1, hour: 9, minute: 30, kind: "milestone", title: "Comenzó el cultivo", detail: "Sustrato inoculado con micelio de Pleurotus ostreatus.", tone: "ok" },
  { id: "photo-1", day: 1, hour: 10, minute: 5, kind: "photo", title: "Fotografía del día 1", detail: DEMO_PHOTO_CAPTIONS[1], tone: "info", photoDay: 1 },
  { id: "stage-colonization", day: 3, hour: 10, minute: 0, kind: "stage", title: "Etapa confirmada: Colonización", detail: "El micelio ya crece sobre el sustrato.", tone: "info" },
  { id: "photo-3", day: 3, hour: 10, minute: 20, kind: "photo", title: "Fotografía del día 3", detail: DEMO_PHOTO_CAPTIONS[3], tone: "info", photoDay: 3 },
  { id: "obs-3", day: 3, hour: 18, minute: 40, kind: "observation", title: "Observación", detail: "Pequeñas zonas blancas alrededor de los puntos de inoculación.", tone: "muted" },
  { id: "photo-5", day: 5, hour: 10, minute: 10, kind: "photo", title: "Fotografía del día 5", detail: DEMO_PHOTO_CAPTIONS[5], tone: "info", photoDay: 5 },
  { id: "obs-5", day: 5, hour: 19, minute: 0, kind: "observation", title: "Observación", detail: "El micelio avanza de forma pareja por la superficie visible.", tone: "muted" },
  { id: "photo-7", day: 7, hour: 9, minute: 50, kind: "photo", title: "Fotografía del día 7", detail: DEMO_PHOTO_CAPTIONS[7], tone: "info", photoDay: 7 },
  { id: "obs-8", day: 8, hour: 20, minute: 15, kind: "observation", title: "Observación", detail: "Sin zonas de un color distinto al blanco.", tone: "muted" },
  { id: "photo-9", day: 9, hour: 10, minute: 0, kind: "photo", title: "Fotografía del día 9", detail: DEMO_PHOTO_CAPTIONS[9], tone: "info", photoDay: 9 },
  { id: "obs-10", day: 10, hour: 18, minute: 30, kind: "observation", title: "Observación", detail: "Aspecto algodonoso y uniforme. Sigue en colonización.", tone: "muted" },
  { id: "photo-11", day: 11, hour: 8, minute: 0, kind: "photo", title: "Fotografía del día 11", detail: DEMO_PHOTO_CAPTIONS[11], tone: "info", photoDay: 11 },
]
