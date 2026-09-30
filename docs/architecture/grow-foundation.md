# Grow Foundation 2.0 — ADR

## Decision

MYKOSPHARE 2.0 treats `CultivationRun` as the principal product entity. Devices
and chambers are infrastructure that observe/control a run rather than the source
of product meaning.

Every reading entering Grow Domain has provenance: observation timestamp, explicit
real/simulated origin, source name, optional device id and only actually measured
metrics. Real and simulated inputs use adapters but end as the same domain contract.

Environmental health is semantic (`healthy`, `attention`, `critical`, `unknown`),
not an unjustified percentage. Completeness is separately expressed without a
percentage. Confirmed stage is immutable domain input; suggested stage is only a
heuristic. MYKO is a projection of `GrowState`, never intelligence or truth.

There is no CO2 evaluation until hardware supplies a real sensor. The new simulator
is deterministic and explicitly marked simulated. The domain has no UI, persistence
or dashboard dependency.

## Consequence

A future server-side application layer obtains a run/profile and a provenance-rich
reading, calls `buildGrowSnapshot()`, then supplies that snapshot to `/grow` or
Engineering Mode. Storage, device protocols, renderers and AI tools remain outside
the domain boundary.
