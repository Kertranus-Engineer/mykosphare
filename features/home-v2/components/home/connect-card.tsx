"use client"

import Link from "next/link"
import { ArrowRight, Cpu } from "lucide-react"

import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { Card } from "../ui/surface"

/** Shown only in the example view: the path from this sample to the person's own data. */
export function ConnectCard() {
  const { mode } = useHomeV2()
  if (mode !== "demo") return null
  const copy = COPY.connectCard
  return (
    <Card as="section" className="hv2-connect" aria-labelledby="hv2-connect-h">
      <div className="hv2-connect-head">
        <span className="hv2-connect-icon" aria-hidden><Cpu className="size-6" /></span>
        <h2 id="hv2-connect-h" className="hv2-connect-title">{copy.title}</h2>
      </div>
      <p className="hv2-connect-lead">{copy.lead}</p>
      <ol className="hv2-connect-steps">
        {copy.steps.map((step, index) => (
          <li key={step}>
            <span aria-hidden className="hv2-connect-n">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <Link href={COPY.demo.connectHref} className="hv2-button hv2-button--primary hv2-press hv2-connect-cta">
        {copy.cta}
        <ArrowRight aria-hidden className="size-4" />
      </Link>
      <p className="hv2-caption">{copy.note}</p>
    </Card>
  )
}
