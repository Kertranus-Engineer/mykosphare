"use client"

import { TopologyCanvas } from "@/features/topology/components/topology-canvas"

export default function TopologyPage() {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-auto">
      <TopologyCanvas />
    </div>
  )
}
