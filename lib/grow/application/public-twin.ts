import type { CultivationTwinSnapshot } from "../twin"

/**
 * What the browser receives. The twin carries no credentials by construction;
 * this projection additionally drops the raw storage path of the latest capture
 * (a future signed-URL endpoint will serve images) so object keys are not leaked.
 */
export type PublicCultivationTwin = Omit<CultivationTwinSnapshot, "memory"> & {
  memory: Omit<CultivationTwinSnapshot["memory"], "latestCapture"> & {
    latestCapture: Omit<NonNullable<CultivationTwinSnapshot["memory"]["latestCapture"]>, "storagePath"> | null
  }
}

export function toPublicTwin(twin: CultivationTwinSnapshot): PublicCultivationTwin {
  const capture = twin.memory.latestCapture
  return {
    ...twin,
    memory: {
      ...twin.memory,
      latestCapture: capture ? { id: capture.id, capturedAt: capture.capturedAt, provenance: capture.provenance, ...(capture.width ? { width: capture.width } : {}), ...(capture.height ? { height: capture.height } : {}) } : null,
    },
  }
}
