/**
 * Central data-source resolution for HOME V2.
 *
 * Every domain (telemetry, cultivation, photos) resolves to exactly one of five
 * kinds. Components never decide provenance on their own; they receive models
 * that were built from these kinds.
 *
 *   REAL        measured/stored data from the actual system
 *   SIMULATED   demonstration data, ONLY while the explicit demo mode is on
 *   UNAVAILABLE nothing to show (no device, no crop, no storage, no photos)
 *   LOADING     a request is still in flight
 *   ERROR       a real failure we can name (never "there is simply nothing")
 */
import type { MobileTelemetry } from "@/features/mobile/use-mobile-telemetry"
import type { CultivationModel, EnvironmentModel, PhotosModel } from "./model"

export type SourceKind = "REAL" | "SIMULATED" | "UNAVAILABLE" | "LOADING" | "ERROR"
export type DataMode = "normal" | "demo"

export interface ResolvedSources {
  mode: DataMode
  telemetry: SourceKind
  cultivation: SourceKind
  photos: SourceKind
}

type TelemetryInput = Pick<MobileTelemetry, "source" | "hasData"> & { connection: Pick<MobileTelemetry["connection"], "kind"> }

/**
 * The shared telemetry hook silently falls back to a simulator when no ESP32
 * is reporting. Outside the demo mode that fallback is NOT data: it resolves
 * to UNAVAILABLE so nothing simulated is ever shown as a measurement.
 */
export function resolveTelemetry(tel: TelemetryInput): SourceKind {
  if (tel.connection.kind === "connecting" && !tel.hasData) return "LOADING"
  if (tel.source === "live" && tel.hasData) return "REAL"
  return "UNAVAILABLE"
}

/** Demonstration telemetry comes from the demo engine: simulated when it reports, otherwise like a missing device. */
export function resolveDemoTelemetry(environment: EnvironmentModel): SourceKind {
  if (environment.status === "ready") return "SIMULATED"
  return environment.reason === "loading" ? "LOADING" : "UNAVAILABLE"
}

export function resolveCultivation(model: CultivationModel): SourceKind {
  switch (model.status) {
    case "loading":
      return "LOADING"
    case "empty":
      return "UNAVAILABLE"
    case "failed":
      return "ERROR"
    case "ready":
      return model.provenance === "simulated" ? "SIMULATED" : "REAL"
  }
}

export function resolvePhotos(model: PhotosModel): SourceKind {
  switch (model.status) {
    case "loading":
      return "LOADING"
    case "empty":
    case "unavailable":
      return "UNAVAILABLE"
    case "error":
      return "ERROR"
    case "ready":
      return model.items.every((photo) => photo.kind === "demo") ? "SIMULATED" : "REAL"
  }
}

/**
 * Outside the demo, nothing SIMULATED may exist anywhere. Used by tests and by
 * a development-time assertion in the provider.
 */
export function assertNoSimulationOutsideDemo(sources: ResolvedSources): string[] {
  if (sources.mode === "demo") return []
  return (Object.entries(sources) as [string, string][])
    .filter(([key, value]) => key !== "mode" && value === "SIMULATED")
    .map(([key]) => key)
}
