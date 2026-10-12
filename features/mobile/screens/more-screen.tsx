"use client"

import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  Brain,
  ChevronRight,
  Eye,
  GitBranch,
  Info,
  Microscope,
  Monitor,
  ScrollText,
  Sliders,
  Clock,
  type LucideIcon,
} from "lucide-react"

import { Panel } from "../components/panel"
import { SectionHeader } from "../components/primitives"
import { ThemePicker } from "../components/settings-sheet"

interface Entry {
  label: string
  description: string
  href: string
  icon: LucideIcon
}

// Existing desktop routes, reused as-is. They open in the desktop layout.
const GROUPS: { title: string; entries: Entry[] }[] = [
  {
    title: "Monitoreo",
    entries: [
      { label: "Inteligencia visual", description: "Análisis de capturas y crecimiento", href: "/dashboard/visual-intelligence", icon: Eye },
      { label: "Inteligencia", description: "Salud y estabilidad del sistema", href: "/dashboard/intelligence", icon: Brain },
      { label: "Analíticas", description: "Gráficas y estadísticas", href: "/dashboard/analytics", icon: Activity },
      { label: "Línea de tiempo", description: "Cronología de eventos", href: "/dashboard/timeline", icon: Clock },
    ],
  },
  {
    title: "Sistema",
    entries: [
      { label: "Alertas", description: "Reglas e historial de alertas", href: "/dashboard/alerts", icon: AlertTriangle },
      { label: "Registros del sistema", description: "Logs de operación", href: "/dashboard/system-logs", icon: ScrollText },
      { label: "Configuración", description: "Parámetros del sistema", href: "/dashboard/configuration", icon: Sliders },
    ],
  },
  {
    title: "Proyecto",
    entries: [
      { label: "Arquitectura", description: "Cómo funciona la plataforma", href: "/dashboard/architecture", icon: GitBranch },
      { label: "Prototipo", description: "Implementación de hardware", href: "/dashboard/prototype", icon: Microscope },
      { label: "Acerca de", description: "Información del proyecto", href: "/dashboard/about", icon: Info },
    ],
  },
]

function Row({ entry }: { entry: Entry }) {
  const Icon = entry.icon
  return (
    <li>
      <Link href={entry.href} className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors active:bg-muted/60">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60">
          <Icon className="size-4 text-cyan-600 dark:text-cyan-400" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{entry.label}</span>
          <span className="block text-xs leading-snug text-muted-foreground">{entry.description}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
      </Link>
    </li>
  )
}

export function MoreScreen() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Más</h1>

      <section aria-label="Apariencia" className="flex flex-col gap-2">
        <SectionHeader title="Tema" />
        <ThemePicker />
      </section>

      {GROUPS.map((group) => (
        <section key={group.title} aria-label={group.title} className="flex flex-col gap-1">
          <SectionHeader title={group.title} />
          <Panel>
            <ul className="divide-y divide-border/60">
              {group.entries.map((e) => (
                <Row key={e.href} entry={e} />
              ))}
            </ul>
          </Panel>
        </section>
      ))}

      <Link
        href="/dashboard"
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card/70 text-sm font-medium text-foreground active:bg-muted/60"
      >
        <Monitor className="size-4 text-cyan-600 dark:text-cyan-400" aria-hidden />
        Abrir panel de escritorio
      </Link>
      <p className="px-1 text-center text-xs leading-relaxed text-muted-foreground">
        Estas secciones usan el diseño de escritorio y se verán mejor en una pantalla grande.
      </p>
    </div>
  )
}
