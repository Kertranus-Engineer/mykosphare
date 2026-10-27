import type { ControlMode, ControlTargets } from "@/lib/grow/control/types"

export type PublishOutcome = { ok: true; version: number } | { ok: false; message: string }

const MESSAGES: Record<number, string> = {
  400: "Esos valores no son válidos. Revísalos.",
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  404: "No encuentro un dispositivo asociado a tu cuenta.",
  409: "Ese modo todavía no está disponible o el dispositivo está deshabilitado.",
}

/** Saves a new desired configuration. The device still has to receive and confirm it; this only stores the request. */
export async function publishControl(input: { mode: ControlMode; targets: ControlTargets }): Promise<PublishOutcome> {
  try {
    const response = await fetch("/api/v2/control", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })
    if (response.ok) {
      const body = (await response.json()) as { version?: number }
      return { ok: true, version: Number(body.version) }
    }
    return { ok: false, message: MESSAGES[response.status] ?? "No pude guardarlo ahora. Inténtalo de nuevo." }
  } catch {
    return { ok: false, message: "Sin conexión. Inténtalo de nuevo." }
  }
}
