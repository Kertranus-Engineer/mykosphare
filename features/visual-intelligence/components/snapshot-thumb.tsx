"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

export function SnapshotThumb({ imageUrl, className }: { imageUrl: string | null; className?: string }) {
  const fallbackSrc = "/demo-growth/day-01.svg"
  const src = imageUrl || fallbackSrc
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={src}
        fill
        alt="Growth snapshot"
        className="object-cover"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
      />
    </div>
  )
}
