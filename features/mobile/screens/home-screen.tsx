"use client"

import { useMobileData } from "../mobile-data-context"
import { useMobileCaptures } from "../use-captures"
import { ActivityList } from "../components/activity-list"
import { ActuatorChips } from "../components/actuator-chips"
import { LatestCaptureCard } from "../components/latest-capture-card"
import { MetricsGrid } from "../components/metrics-grid"
import { Panel } from "../components/panel"
import { DataSourceBadge, SectionHeader } from "../components/primitives"
import { StatusHero } from "../components/status-hero"

export function HomeScreen() {
  const { tel, activity } = useMobileData()
  const captures = useMobileCaptures()

  return (
    <div className="flex flex-col gap-6">
      <StatusHero tel={tel} />

      <section aria-label="Métricas ambientales" className="flex flex-col gap-3">
        <SectionHeader title="Ambiente" action={<DataSourceBadge source={tel.source} />} />
        <MetricsGrid tel={tel} />
        <ActuatorChips fan={tel.fan} humidifier={tel.humidifier} source={tel.source} dimmed={tel.dimmed} />
      </section>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <section aria-label="Actividad reciente" className="flex flex-col gap-1">
          <SectionHeader title="Actividad reciente" href="/home-v1/history#actividad" />
          <Panel className="px-4">
            <ActivityList items={activity} limit={4} />
          </Panel>
        </section>

        <section aria-label="Capturas" className="flex flex-col gap-3">
          <SectionHeader title="Última captura" />
          <LatestCaptureCard captures={captures} />
        </section>
      </div>
    </div>
  )
}
