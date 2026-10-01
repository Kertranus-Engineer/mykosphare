# MYKOSPHARE 2.0 — Grower Experience (v1 + Creature Pass v2 + v3 signature anatomy)

Grower Mode is the product surface. It renders a `GrowSnapshot` produced by the
Grow Domain; it never evaluates sensors itself.

```text
GrowSnapshot ─► lib/grow/presentation (copy, icons, tones, senses, history, activity, moments)
      │                 │
      │                 ├─► /grow, /grow/cultivation, /grow/myko
      │                 └─► /face (ambient device screen)
      └─► mykoPresence(snapshot) ─► MykoStage ─► MykoRenderer ─► SvgMyko
            (model, run id, installed senses, last reading timestamp)
```

## MYKO: four independent dimensions

| Dimension | Source | Drives | Never |
|---|---|---|---|
| **Form** | `MykoViewModel.form` ← **confirmed** stage | Anatomy (`visual-config.ts`, `geometry.ts`) | inferred from days or suggestions |
| **Mood** | `MykoViewModel.mood` ← environment/freshness | Posture, rhythm, aura tint, light — CSS only | changes anatomy or stage |
| **Activity** | `resolveMykoActivity` (presentation) ← what the viewer observed | One-shot behaviours | writes GrowState |
| **Traits** | `deriveMykoTraits(run.id)` | Bounded geometric variation of *this* MYKO | depends on mood; is persisted as "DNA"; claims biology |

Mood is not a geometry input at all: `buildMykoGeometry(form, traits)`. A
mood never shrinks or reverts a form; humidity never selects a different
evolution; offline never changes the stage.

### Signature anatomy (Creature Pass v3)

What makes MYKO *MYKO* in every form, mood and individual: a luminous
**nucleus suspended inside an open crescent membrane** — a "C" whose mouth
always faces the same side for a given individual — joined to the mycelial
network by a **vein**. It survives as a solid silhouette (the hollow between
the C and the nucleus) and in one flat colour (Lab: *Signature test*,
*Silhouette test*). It is the same organ through life:

- `early` (ESPORA): a small open pod; germ hyphae leave only from its back and fall into the substrate (the mouth stays clear). Potential.
- `emerging` (BROTE): the pod rises on a sprout; its upper lip grows and starts to curl over the nucleus; primordia beads appear on a reorganised mat.
- `mature` (MADUREZ — the icon): the lip has become a **lateral hood** (Pleurotus is side-attached) that cantilevers over the mouth and **droops** to shelter the nucleus; the lower arm cradles it.
- `complete` (PLENITUD): the hood **opens and flares up**, the mouth widens, and the colony buds **satellite pods** — each a small nucleus-in-a-C — fed by luminous routes. The original nucleus stays the centre.

The **nucleus** is never a plain marble: lobed body, offset bright yolk, two
organelles and a broken orbital ring that turns slowly. The **network** is a
distributed body: hyphae born from a region (pod back or foot), tapering,
branching, anastomosing, with nodes; it grows in *presence* (surface, routes,
satellites), not just size. Senses are **organs on stems** grown from the body
(temperature on the spine, humidity on a mat hypha, vision at the hood's free
edge, CO₂ on the hood, mass at the foot); never two organs flanking the
nucleus at the same height (they read as eyes — MYKO has no face).

Colour grammar: VIOLET identity/membrane/structure · GREEN life/network ·
LIME biological energy (nucleus, vein) · CYAN perception/flow · WHITE intense
activity/transition (pulses) · AMBER need (localised on the organ that
perceives it) · CORAL critical.

Bioluminescence travels: idle shows a rare white pulse running nucleus →
vein → main hypha (and colony routes); sensing runs it immediately and lights
nodes outward. Idle is calm: breathing, a slow orbit, one twinkle, drift.

Moods are reactions of the same body: `content` open; `concerned` gathered
(slight contraction, need colour on its organ); `distressed` defensive (hood
curls down, network retracts, nucleus intensifies, coral); `uncertain`
**waiting** — same colours, less light, faint network, senses off, a slow
heartbeat. Offline is missing information, never illness.

Cost: early 49 · emerging 53 · mature 69 · complete 93 SVG nodes; 10–21
animated elements; 0 under `prefers-reduced-motion`; 2 while waiting. Motion
is transform/opacity plus short `stroke-dashoffset` pulses on a few routes.

Implementation note: with `transform-box: view-box`, `transform-origin` is
measured from user-space (0,0), not from the viewBox corner. Geometry is
built canonically (mouth to the right) and mirrored on emission.

### Traits (visual identity, not biology)

`features/grow/myko/traits.ts`: FNV-1a hash of the run id → mulberry32 PRNG →
`MykoVisualTraits { seed, lean, curl, reach, bias, capTurn, extraBranches,
phase }`, all bounded. Same run → same MYKO on reload, server and client (no
`Math.random`; every emitted number rounded to 0.1). Traits never change a
form's anatomy counts. The future forms in "Mi desarrollo" are drawn with the
same traits as **silhouettes still to be revealed** (the next one softly lit):
anticipation from the real cultivation, no XP or levels.

**Plenitud as memory (future, not built):** a run's final MYKO is fully
reproducible from `deriveMykoTraits(run.id)` + its last confirmed form, so a
future "tus MYKOs anteriores" view needs no stored drawing — only the run
record (dates, crop, real yield when it exists).

History-derived traits (ESTABLE, RESILIENTE, OBSERVADO…) remain a separate,
future idea: each would need a documented rule over persisted data. No XP,
levels, stats or rewards.

### Activity

`idle` (slow breathing) · `sensing` (a reading with a **new timestamp**
arrived: a pulse travels outward through the nodes, installed senses flash) ·
`recovering` (only when the observed mood actually returned to content) ·
`touched` (tap: pulse from the nucleus + particles) · `waiting` (mood
`uncertain`). Offline is deliberately **not** an activity — it is freshness,
already expressed by mood. The first observation on a page only records a
baseline. The domain `MykoViewModel.activity` is untouched.

### Senses on the body

`presentBodySenses(snapshot)` returns only **installed** capabilities (today
temperature and humidity) as `active` (live observation) or `quiet`, plus an
`alert` (attention/critical, from the domain tone) that colours that organ
with the need. Organ anchors are described under *Signature anatomy*; CO₂,
vision and mass are drawn only by a Visual Lab fixture. Marks are never placed symmetrically around the nucleus (they read
as eyes — MYKO has no face).

### Renderer contract (the future Rive spec)

`MykoRenderer` accepts `model` plus presentation inputs: `traits`,
`activity`, `senses`, `moment`, `reaction`, `still`, `decorative`,
`className`. A future `RiveMyko` maps form/mood → state-machine inputs,
traits → per-instance parameters, activity/moment/reaction → triggers,
without touching pages or the domain.

## Senses = hardware abilities

`lib/grow/presentation/senses.ts` holds the capability manifest. Today only
temperature and humidity are installed (ESP32 + DHT22). CO₂ (e.g. SCD41),
vision (camera) and mass (load cell) are declared as **not installed** and never
show values. Adding hardware = flip `installed`, feed real readings through the
Data Platform, and MYKO gains a sense. `feel` (environmental sensors) and `see`
(vision) are distinct modes so MYKO can later say "lo siento por los sensores"
vs "lo veo por la cámara".

## Timeline and history

`lib/grow/timeline.ts` defines structured events. Real mode currently shows only
milestones derived from the run record (`runMilestoneEvents`: started, stage
confirmed). Simulation adds explicit fixtures, all `origin: "simulated"` and
labelled "Sim". No event may claim an actuator acted until a command ledger
exists. "Detectado hace …" is shown only when a matching recorded event proves
it. History stats appear only when their source data exists.

## Moments and the evolution ceremony

`lib/grow/presentation/moments.ts`: `cultivation_started` ("Comenzamos."),
`stage_confirmed` ("Estoy cambiando."), `first_capture` ("Ya puedo ver."),
`environment_recovered` ("El ambiente volvió a estabilizarse."),
`harvest_confirmed` ("Llegamos a cosecha."). `momentsFromEvents(events)`
derives moments only from recorded events (only the first capture counts;
harvest has no source event yet, so it is never produced).

The **evolution ceremony** exists only in the Visual Lab
(`features/grow/lab/evolution.ts` + `evolution-preview.tsx`): a pure plan
`charge` (0.9 s: nucleus charges, network retracts, the C gathers around the
nucleus, the hood folds) → `emerge` (1.6 s: pulse, the C and hood unfold into
the new form, the network re-expands, satellites bud) → rest; 2.5 s. A
reorganisation, not a fade: the nucleus never disappears. It is driven through the renderer's `moment` prop and cannot touch a
CultivationRun. Future product trigger: a persisted `stage_confirmed` event
newer than the viewer's last-seen marker — never a stage suggestion.

## Visual Lab

`/grow/lab` renders, from explicit **visual fixtures** (`features/grow/lab`):
the 4 forms; individual variation (5 seeds, selectable form); one individual
across moods; activities (replayable); senses (installed vs full-system
fixture); the evolution ceremony (Previous stage / Evolve / Next stage /
Replay); 48px silhouettes; the glyph set. It is not linked from navigation
and returns 404 in production.
