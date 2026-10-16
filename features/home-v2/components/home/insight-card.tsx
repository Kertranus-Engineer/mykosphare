"use client"

import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { MykoSymbol } from "../ui/myko-symbol"
import { Card, Chip } from "../ui/surface"

/**
 * MYKO Insight. In the demonstration it shows an example observation computed from the
 * same simulated values the rest of the app shows, labelled as a demonstration. Outside
 * the demo there is no analysis: the card says so and invents nothing.
 */
export function InsightCard() {
  const { insight } = useHomeV2()

  if (insight.status === "none") {
    return (
      <Card as="section" className="hv2-insight hv2-insight--empty" aria-labelledby="hv2-insight-h">
        <div className="hv2-insight-head">
          <MykoSymbol className="hv2-insight-symbol" dim />
          <div className="hv2-insight-titles">
            <div className="hv2-insight-tags">
              <h2 id="hv2-insight-h" className="hv2-insight-title">{COPY.insight.title}</h2>
              <Chip tone="info" className="hv2-chip--caps">{COPY.insight.badge}</Chip>
            </div>
            <p className="hv2-insight-sub">{COPY.insight.empty}</p>
          </div>
        </div>
        <p className="hv2-insight-body">{COPY.insight.body}</p>
      </Card>
    )
  }

  return (
    <Card as="section" className="hv2-insight" tone={insight.tone} aria-labelledby="hv2-insight-h">
      <div className="hv2-insight-head">
        <MykoSymbol className="hv2-insight-symbol" />
        <div className="hv2-insight-titles">
          <div className="hv2-insight-tags">
            <h2 id="hv2-insight-h" className="hv2-insight-title">{COPY.insight.title}</h2>
            <Chip tone="sim" className="hv2-chip--caps">{COPY.insight.demoBadge}</Chip>
          </div>
          <p className="hv2-insight-sub">{insight.headline}</p>
        </div>
      </div>
      <p className="hv2-insight-body">{insight.body}</p>
      <div className="hv2-insight-basis" aria-label={COPY.insight.basis}>
        {insight.basis.map((item) => (
          <span key={item} className="hv2-insight-fact">{item}</span>
        ))}
      </div>
      <p className="hv2-insight-foot">{COPY.insight.demoFootnote}</p>
    </Card>
  )
}
