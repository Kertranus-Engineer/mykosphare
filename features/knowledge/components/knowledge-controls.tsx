"use client"

import { memo } from "react"
import { Database, Archive, Download, Upload, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface KnowledgeControlsProps {
  onArchive: () => void
  onExport: () => string
  onImport: (json: string) => void
  onClear: () => void
  archiveCount: number
  recordCount: number
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const KnowledgeControls = memo(function KnowledgeControls({
  onArchive,
  onExport,
  onImport,
  onClear,
  archiveCount,
  recordCount,
}: KnowledgeControlsProps) {
  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onImport(reader.result)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="size-4 text-muted-foreground" />
          Knowledge Layer
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {recordCount} records · {archiveCount} snapshots
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={onArchive}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] font-medium text-emerald-500 hover:bg-emerald-500/10 transition-colors"
          >
            <Archive className="size-3.5" />
            Archive Now
          </button>
          <button
            type="button"
            onClick={() => downloadFile(onExport(), `knowledge-${new Date().toISOString().slice(0, 10)}.json`)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-[11px] font-medium text-sky-500 hover:bg-sky-500/10 transition-colors"
          >
            <Download className="size-3.5" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-[11px] font-medium text-violet-500 hover:bg-violet-500/10 transition-colors"
          >
            <Upload className="size-3.5" />
            Import JSON
          </button>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="size-3.5" />
            Clear All
          </button>
        </div>
      </CardContent>
    </Card>
  )
})
