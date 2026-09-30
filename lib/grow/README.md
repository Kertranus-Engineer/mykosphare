# Grow Foundation 2.0

## Purpose

`lib/grow` is the pure, deterministic foundation for interpreting one cultivation
run. It makes **no data without provenance** a technical rule: a reading carries
its observation time, `origin` (`real` or `simulated`), adapter `source`, optional
device identifier, and only metrics actually available.

The product entity is `CultivationRun`. A chamber or device is infrastructure that
observes or later controls that run.

## Boundaries and flow

```text
Device / Simulator
       ↓
Telemetry Adapter
       ↓
EnvironmentalReading
       ↓
CultivationRun + SpeciesProfile
       ↓
evaluateGrowState
       ↓
GrowState
       ↓
toMykoViewModel
       ↓
UI renderer
```

`adapters/` translates external payloads. The domain has no route, database,
React, storage, renderer, or API import. `buildGrowSnapshot()` is the small
application composition boundary: a server-side loader may obtain a run/profile
and a reading, pass them in, and give UI one coherent snapshot.

## Types

- `SpeciesProfile`: per-stage temperature and humidity targets. Future metrics can
  be represented but are not evaluated until they are truly observed and modelled.
- `CultivationRun`: identity, profile reference, start time and **confirmed** stage.
- `EnvironmentalReading`: optional measured temperature/humidity plus provenance.
- `GrowState`: conditions, freshness, data completeness, semantic health and needs.
- `MykoViewModel`: renderer-agnostic projection for SVG, Rive or another renderer.

## Provenance and adapters

`adaptEsp32Telemetry()` accepts only measured `temp` and `hum`; it ignores unknown
fields such as legacy derived CO2 or energy. `adaptLegacyApiData()` bridges only a
legacy payload whose source is `live`. `adaptSimulatedTelemetry()` always overwrites
the origin as `simulated`.

There is no CO2 sensor in this foundation. Missing metrics remain absent; they do
not become zero or inferred values.

## Freshness and partial data

`evaluateFreshness(timestamp, now, policy)` is pure and injected. The default
policy is live before 5 minutes, stale from 5 minutes, and offline from 30 minutes.
Exact thresholds are stale/offline respectively. A stale, offline, invalid or
missing reading cannot produce `healthy`.

`dataStatus` is `complete`, `partial`, or `insufficient`; it has no fake score.
For the current two-metric profile, both targets and both readings are required for
complete observed health. Any missing target or reading makes health `unknown`.

## Stages and health

`confirmedStage` is an explicit run fact. `suggestedStage` is a simple elapsed-day
heuristic and never mutates it. Sample stage thresholds are a product fallback,
not biological recognition.

Health is semantic: `healthy`, `attention`, `critical`, or `unknown`. Conditions
are `ok`, `low`, `high`, `critical`, or `unknown`. Needs are derived from currently
live, complete observations only.

## MYKO

MYKO is presentation, not intelligence or a source of truth. It receives form,
mood, activity, attention, provenance and an i18n `messageKey`. The domain emits
only `idle`; interaction may later own `thinking`, `talking`, or `celebrating`.
Message keys are a contract such as `myko.status.healthy`, `.humidity_low`,
`.temperature_attention`, `.stale`, `.offline`, `.unknown`, and `.simulated`.

## Simulation and fixtures

`createSampleSimulationReading()` is a deterministic development/demo generator
with `stable`, `dry`, `humid`, `cold`, `hot`, and `offline` scenarios. It is not a
physical or biological model. `fixtures.ts` exposes a clearly labelled SAMPLE
Pleurotus ostreatus profile and deterministic run; its targets are not validated
cultivation guidance.

## Invariants

1. Simulated data never becomes real.
2. A missing metric never becomes zero.
3. Stale/offline data never produces healthy.
4. Suggested stage never changes confirmed stage.
5. MYKO never becomes a source of truth.
6. Renderers contain no sensor logic.
7. AI is not part of this module.
8. Unknown is preferred to fabricated certainty.
9. Equal inputs produce equal outputs.
10. Domain and sample simulation contain no random behavior.

## What this module does not do

It does not persist runs, call Supabase, control devices, use localStorage, decide
automation, provide visual analysis, handle camera images, include an LLM, or
implement UI/PWA/Rive/SVG. Future integration should remain:

```text
Infrastructure → adapters → domain → application composition → UI
```
