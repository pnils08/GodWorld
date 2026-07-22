---
title: Engine Tag Registry — the single source of truth for event tags, affect tags, and dial mapping
created: 2026-06-01
updated: 2026-07-20
type: spec
status: verified
tags: [engine, citizens, tags, classifier, dials, registry]
pointers:
  - "[[ENGINE_COUPLING_MAP]] — how these tags actually mutate citizen dials"
  - "lib/reflectionClassifier.js — the dual-tag inference substrate"
  - "lib/citizenDials.js — the 8 structural dials and bands"
---

# Engine Tag Registry

**Purpose.** One canonical map from every event tag the engines (and the reflection classifier) emit to its categorical meaning and dial impact. This is the **single source of truth** bridging text to substrate.

## The Citizen Dials

A citizen's disposition is measured across 8 bipolar dials (0–100, centered at 50, with neutral/unremarkable falling in the 40-60 band):

- **drive**: drifting/unhurried ↔ driven/relentless (governs career frequency)
- **sociability**: loner/private ↔ draws people in/magnetic (governs relationships)
- **warmth**: cold/reserved ↔ warm/affectionate
- **openness**: rigid/familiar ↔ curious/adventurous (governs learning)
- **composure**: volatile/quick to rattle ↔ steady/unshakable (governs conduct test rate)
- **integrity**: cuts corners/bends rules ↔ principled/incorruptible (governs crime reachability)
- **family**: unattached/distant ↔ close/devoted (governs household events)
- **outabout**: homebody/stays in ↔ often out/always out (governs neighborhood presence)

## The Classifier Vocabulary (Dual-Tag)

The `reflectionClassifier` evaluates citizen prose and emits exactly **two** tags: an `EventTag` (the concrete happening) and an `AffectTag` (the emotional tone). 

### 1. Event Tags (The Concrete Domain)

These represent the concrete events and are mapped to dial deltas.

| Category | Tags |
|---|---|
| **Work / Drive** | `Career`, `Career-Transition`, `Promotion`, `Education`, `Graduation` |
| **Social** | `Relationship`, `Community`, `Neighborhood`, `Reputation`, `Media`, `Public`, `Cultural`, `Mentorship`, `Faith` |
| **Family** | `Household`, `Wedding`, `Birth`, `Divorce`, `Retirement` |
| **Health / Composure** | `Health`, `Critical`, `Hospitalized`, `Setback`, `Recovery` |
| **Conduct / Integrity** | `Transgression-Petty`, `Transgression-Serious`, `Transgression-Grave`, `Resisted` |
| **Civic** | `Civic` |
| **Ambient / Other** | `Personal`, `Daily`, `Background`, `Sports`, `Weather`, `Arrival` |

### 2. Affect Tags (The Subjective Layer)

Affect tags track emotional valence from the reflection, separate from the event. These act as the negative-pole mechanism.

- **Negative Affect:** `Frustrated`, `Irritable`, `Anxious`, `Angry`, `Resentful`
- **Positive/Neutral Affect:** `Excited`, `Energized`, `Content`, `Calm`

*Note: The classifier includes an off-vocab fallback map (e.g., mapping "restless", "worried", "nervous" to `Anxious`) to handle model drift.*

## Structural Markers (Inert / Macro)

Certain tags summarize state and are **inert** (they do not shift dials twice, or are meta-tags):
- `Compressed`: Summary of folded raw events.
- `CareerState`: Persistence marker for work state.

## Conduct Mechanics

The moral-test generators use the Conduct vocabulary to test citizens based on their `integrity` and `composure` dials:
- `Transgression-Petty` (low severity, minor dishonesty)
- `Transgression-Serious` (mid severity, theft/fraud)
- `Transgression-Grave` (high severity, grave moral failure)
- `Resisted` (moral win, accretes integrity)

Only citizens in the lowest integrity band (<20) become reachable for transgression execution.
