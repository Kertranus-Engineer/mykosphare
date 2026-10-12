"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

export default function HomeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-red-500/10">
        <AlertTriangle className="size-6 text-red-500" aria-hidden />
      </span>
      <div>
        <h1 className="text-base font-semibold text-foreground">Algo salió mal</h1>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          No se pudo mostrar esta pantalla{error.digest ? ` (ref. ${error.digest})` : ""}.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-muted/40 px-5 text-sm font-medium text-foreground active:bg-muted"
      >
        <RefreshCw className="size-4" aria-hidden />
        Reintentar
      </button>
    </div>
  )
}
