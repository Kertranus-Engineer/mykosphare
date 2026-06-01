"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { LocalStorage } from "@/lib/visual-intelligence/storage"
import type { VisualCapture, CaptureSource } from "@/lib/visual-intelligence/storage"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp"
const MAX_FILE_SIZE = 10 * 1024 * 1024

interface UploadSnapshotProps {
  onCaptureSaved?: (capture: VisualCapture) => void
  className?: string
}

export function VisualUpload({ onCaptureSaved, className }: UploadSnapshotProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid format. Accepted: ${ACCEPTED_EXTENSIONS}`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
    return null
  }

  function handleFile(file: File) {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    if (!preview || !fileName) return
    setUploading(true)
    setError(null)

    try {
      const capture: VisualCapture = {
        id: `snap-${Date.now()}`,
        imageUrl: preview,
        timestamp: new Date().toISOString(),
        source: "manual" as CaptureSource,
        analysisStatus: "pending",
        sensors: {
          temperature: 0,
          humidity: 0,
          co2: 0,
        },
        ai: {
          status: "awaiting_analysis",
          confidence: 0,
          observation: "Pending analysis",
        },
        growth: {
          stage: "inoculation",
          progress: 0,
        },
      }

      await LocalStorage.saveCapture(capture)
      setPreview(null)
      setFileName(null)
      if (inputRef.current) inputRef.current.value = ""
      onCaptureSaved?.(capture)
    } catch {
      setError("Failed to save capture")
    } finally {
      setUploading(false)
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function clearPreview() {
    setPreview(null)
    setFileName(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-colors duration-200",
          dragActive
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-foreground/10 hover:border-foreground/20 bg-muted/10",
          preview && "border-solid border-emerald-500/20 bg-emerald-500/5",
        )}
      >
        {preview ? (
          <div className="relative flex flex-col items-center gap-3 p-4">
            <button
              type="button"
              onClick={clearPreview}
              className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-colors"
            >
              <X className="size-3.5" />
            </button>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/20">
              <Image src={preview} alt="Upload preview" fill className="object-contain" unoptimized />
            </div>
            <span className="text-[10px] text-muted-foreground/50">{fileName}</span>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-[11px] font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {uploading ? "Saving..." : "Upload Snapshot"}
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 py-8 px-4 cursor-pointer">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted/20">
              <ImageIcon className="size-5 text-muted-foreground/30" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-medium text-muted-foreground/50">Upload Snapshot</span>
              <span className="text-[10px] text-muted-foreground/30">
                {ACCEPTED_EXTENSIONS} — max {MAX_FILE_SIZE / 1024 / 1024}MB
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleInputChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          <span className="text-[10px] text-red-500/80">{error}</span>
        </div>
      )}
    </div>
  )
}
