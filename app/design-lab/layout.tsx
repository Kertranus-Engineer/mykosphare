import type { Metadata } from "next"
import type { ReactNode } from "react"

import "@/features/home-v2/styles/home-v2.css"

/** Experimental design lab: isolated from HOME and the advanced dashboard, never indexed. */
export const metadata: Metadata = {
  title: { default: "Laboratorio de diseño", template: "%s · Laboratorio · MYKOSPHARE" },
  description: "Prototipos experimentales de interfaz de MYKOSPHARE.",
  robots: { index: false, follow: false },
}

export default function DesignLabLayout({ children }: { children: ReactNode }) {
  return children
}
