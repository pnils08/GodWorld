---
title: /sift Triage Vocabulary — six-decision spec
created: 2026-05-23
updated: 2026-05-23
type: reference
tags: [media, pipeline, sift, active]
contract_class: spec
sources:
  - "[[../plans/2026-05-22-sift-v2]] §Task 5 + §v2 Step List Step 5"
  - "[[../../output/sift_v2_gap_map.md]] G-S13 (triage vocabulary lacks fold / covered-by-feature)"
  - "[[../../output/sift_proposals_c94.json]] §baselineDecisions — ad-hoc usage S221 hand-run"
pointers:
  - "[[brief_template_v2]] — sister spec"
  - "[[dispatch_schema]] — sister spec (locked slate from Step 6 → dispatch.json)"
  - "[[../plans/2026-05-22-sift-v2]] — pipeline.24 plan"
  - "[[index]] — registered same commit"
---

# /sift Triage Vocabulary — six-decision spec

**Contract class:** SPEC (taxonomy / decision language). Triage decisions are tagged into `output/sift_proposals_c{XX}.json` `baselineDecisions[]` at /sift v2 Step 5. The vocabulary is the structured-reduction primitive that lets a slate converge in one pass rather than looping through variants A/B/C/D/E (the C94 S220-S222 failure mode).

**Why this exists.** /sift v1.2 carried three decisions only — `promote` / `publish-as-baseline` / `suppress`. Real triage hits cases those three don't capture: baselines that should fold into a different piece, baselines covered by an existing slate feature, baselines that belong in a non-edition artifact. Without structured handles, /sift either invents ad-hoc fields (C94 emitted `foldedInto` without spec) or loops a slate variant trying to find a shape that fits (the 5-variant cadence loop). Six decisions close the gap; cadence cap (one slate per session, §brief_template_v2 + §plan Step 6) is the enforcement.

---

## The six decisions

### 1. `promote`

**Definition:** Rewrite baseline as a slate feature article (Tier A or Tier B).

**When to use:**
- Baseline signal carries enough narrative weight for a standalone piece.
- A reporter can credibly write 400-1,500 words on it without inventing.
- Cycle hasn't already promoted enough features in that section (per cadence cap).
- Three-layer threading possible (engine + simulation + user actions present).

**Required JSON field:** `promotedInto: "<SLOT_CODE>"` — names the slate slot that emerged from this promotion (e.g., `"FP1"`, `"C2"`).

**Example C94 (real):**
```json
{
  "briefId": "vote-INIT-003-c94",
  "decision": "promote",
  "promotedInto": "C1",
  "reason": "Transit Hub Phase II vote COMPLETED — structural callback to E93's failed-fire frame. Carmen Delaine lead."
}
```

### 2. `publish-as-baseline`

**Definition:** Keep as Tier C automated copy-through. Generated baseline brief becomes a one-paragraph entry in the edition's atmospheric / texture pool, no reporter launch.

**When to use:**
- Real engine signal but no story-shape — no reporter could write more than 1-2 paragraphs without padding.
- Atmospheric-only texture (KONO event, small faith gathering, weather-pattern shift).
- LOW severity events that document the cycle's pulse without demanding feature treatment.

**Required JSON field:** none beyond `decision` + `reason`.

**Example C94 (real):**
```json
{
  "briefId": "event-civic-1-c94",
  "decision": "publish-as-baseline",
  "reason": "CIVIC Inflow Strain KONO HIGH — real engine signal but no story-shape beyond the strain notation. Tier C automated copy-through."
}
```

[note: C94 emitted `"decision": "baseline"` (shortened form). v2 standardizes to full `"publish-as-baseline"` for clarity in tooling. Parsers should accept both forms during transition; v2.0 SKILL.md emits the full form.]

### 3. `suppress`

**Definition:** Drop entirely. Baseline doesn't get published in any form.

**When to use:**
- Empty / null description field — engine writer didn't populate, no actionable content.
- Duplicate of another baseline (same source signal, two extractions).
- Engine artifact / debug output that shouldn't appear in canon.
- Severity below noise floor for this cycle.

**Required JSON field:** none beyond `decision` + `reason`. Reason MUST name the noise class (empty / duplicate / artifact / sub-threshold).

**Example C94 (real):**
```json
{
  "briefId": "event-culture-0-c94",
  "decision": "suppress",
  "reason": "empty description field — engine writer didn't populate; not actionable. See G-S12."
}
```

### 4. `fold(into=<pieceId>)`

**Definition:** Baseline gets coverage but as inset / aside / Quick-Take inside a different slate piece. NOT a standalone feature, NOT Tier C copy-through.

**When to use:**
- Baseline signal is real but belongs THEMATICALLY inside another piece on the slate.
- Folding adds texture to the host piece without expanding its scope.
- A QT-sized thought that fits better inside (or appended to) a longer article.

**Required JSON field:** `foldedInto: "<SLOT_CODE_or_QT_ID>"` — names the host piece (e.g., `"QT1"`, `"C1"`, `"S2"`).

**Example C94 (real):**
```json
{
  "briefId": "approval-MAYOR-01-c94",
  "decision": "fold",
  "foldedInto": "QT1",
  "reason": "Mayor Santana 83→88 approval shift, Tier-2 holder. Not a standalone feature — folds into QT1 Okoro frame (Mayor's-office reset signal)."
}
```

[note: C94 used `decision: "fold"` ad-hoc — proposals JSON commented "Spec lacks 'fold' decision; treated as in-coverage non-suppress non-promote. See G-S13." v2 makes it canon.]

### 5. `covered-by-feature(by=<pieceId>)`

**Definition:** Slate already has a feature article that absorbs this baseline. Different from `fold` — `fold` actively inserts the baseline content into the host; `covered-by-feature` means the host's natural scope already includes this baseline's signal, no insertion needed.

**When to use:**
- A's free-agent-rumor baseline + slate already has S2 "The Let-Walks Coming" feature on the same signal → baseline `covered-by-feature(by=S2)`.
- Civic round-up feature with multi-initiative scope already includes a baseline initiative tick → baseline `covered-by-feature(by=<civic-round-up SLOT>)`.
- Sports recap covers individual game baselines that ladder up into the recap.

**Required JSON field:** `coveredBy: "<SLOT_CODE>"` — names the feature piece that absorbs this baseline.

**Worked example (synthetic from C94 — would have applied in this cycle):**
```json
{
  "briefId": "rumor-KELLEY-FA-c94",
  "decision": "covered-by-feature",
  "coveredBy": "S2",
  "reason": "Free-agent rumor for Kelley (also Aitken + Richards) — S2 P Slayer 'The Let-Walks Coming' is the slate feature for this signal. Reporter pulls Kelley FA framing into S2 naturally without needing a standalone baseline; baseline-emit duplicates the angle."
}
```

[note: This decision didn't exist in C94 v1.2 vocabulary. The free-agent rumor would have been emitted as `publish-as-baseline` (Tier C) duplicating S2's frame, OR `fold(into=S2)` requiring active insertion. `covered-by-feature` is cleaner — the host piece's scope already includes the baseline, no further action.]

### 6. `defer-to-supplemental(target=<interview|dispatch|wiki>)`

**Definition:** Baseline is out-of-scope for this edition but valid material for an adjacent artifact. Routes to non-edition publishing pipeline.

**When to use:**
- **target=`interview`** — baseline carries enough character / arc weight for a /interview supplemental piece (canon-grounded Q&A with a citizen). Threshold: requires a named citizen with multi-edition arc, a topical wedge, and dialogue potential.
- **target=`dispatch`** — baseline is a scene-piece candidate (atmospheric, location-specific, not edition-pressure-relevant). Threshold: requires a specific neighborhood location, a defining sensory texture, citizens secondary.
- **target=`wiki`** — baseline is canonization material — fact, role, biographical anchor — but not story. Routes to canon-fidelity layer for permanent record without journalism treatment.

**Required JSON field:** `supplementalTarget: "interview" | "dispatch" | "wiki"` — names the routing target.

**Worked example (synthetic — Vinnie Keane atmospheric pattern):**
```json
{
  "briefId": "atmospheric-KEANE-rockridge-c94",
  "decision": "defer-to-supplemental",
  "supplementalTarget": "dispatch",
  "reason": "Vinnie Keane spotted at Rockridge venue (Riley_Digest evening media). Atmospheric-overlay signal (G-S3) — never anchored as standalone scene in edition. Texture belongs in a /dispatch scene piece (Rockridge nightlife strip), not edition. Reporter agency: dispatch desk decides whether to write it."
}
```

[note: This decision didn't exist in C94 v1.2 vocabulary. Atmospheric-overlay signals had no routing handle — either dropped entirely (waste) or fabricated into a standalone scene (canon risk per G-S3). `defer-to-supplemental(target=dispatch)` gives the atmospheric signal a non-edition home.]

---

## JSON shape — `baselineDecisions[]` entry

Every baseline carries exactly one decision. Required fields per decision:

```json
{
  "briefId": "<baseline brief ID>",
  "decision": "<one of: promote | publish-as-baseline | suppress | fold | covered-by-feature | defer-to-supplemental>",
  "reason": "<one-line explanation, names the load-bearing fact>",

  "promotedInto": "<SLOT_CODE>",          // REQUIRED if decision = promote
  "foldedInto": "<SLOT_CODE_or_QT_ID>",   // REQUIRED if decision = fold
  "coveredBy": "<SLOT_CODE>",             // REQUIRED if decision = covered-by-feature
  "supplementalTarget": "<interview|dispatch|wiki>"  // REQUIRED if decision = defer-to-supplemental
}
```

### Validation rules

- Every baseline MUST carry exactly one decision (no missing, no multiple).
- Decision value MUST be from the six-vocabulary allowlist. No ad-hoc additions (`promotedInto` as decision instead of field, `customDisposition` as escape hatch).
- Decision-specific required fields MUST be populated when their decision is set.
- Reason MUST be non-empty and reference the load-bearing fact (not "fold because" — name the host piece logic).

---

## Decision-tree diagnostic

When triaging a baseline, work through the questions in order. First "yes" answer is the decision.

```
1. Is the baseline empty / duplicate / sub-threshold noise?
   → YES: suppress
   → NO: continue

2. Does an existing slate feature absorb this baseline's signal as part of its
   natural scope (no insertion required)?
   → YES: covered-by-feature(by=<feature SLOT>)
   → NO: continue

3. Does the baseline belong THEMATICALLY inside another slate piece as inset
   or aside (active insertion improves the host)?
   → YES: fold(into=<host SLOT>)
   → NO: continue

4. Is the baseline a non-edition artifact candidate (interview / dispatch /
   wiki material, not edition-pressure-relevant)?
   → YES: defer-to-supplemental(target=<interview|dispatch|wiki>)
   → NO: continue

5. Can a reporter credibly write 400-1500 words on this without inventing,
   with three-layer threading possible, within section cadence cap?
   → YES: promote (assign promotedInto SLOT)
   → NO: publish-as-baseline (Tier C copy-through)
```

The diagnostic eliminates the v1.2 default trap (everything becomes promote or suppress, with publish-as-baseline as the residual). Real triage usually lands in 2, 3, or 4 — and those are the decisions /sift v1.2 didn't have.

---

## What v2 eliminates from C94 ad-hoc usage

C94 baselineDecisions[] surfaced three drift surfaces this spec closes:

1. **`decision: "baseline"` (shortened form)** — C94 ad-hoc shorthand for `publish-as-baseline`. v2 standardizes to full form for tooling clarity. Parsers accept both during transition; v2.0 SKILL.md emits full form only.
2. **`fold` decision without spec** — C94 used `fold` with `foldedInto` field, commented "Spec lacks 'fold' decision; treated as in-coverage non-suppress non-promote. See G-S13." v2 makes `fold` canon with required `foldedInto`.
3. **Atmospheric signals dropped or fabricated** — Vinnie Keane / streaming-trend / FamousPeople signals had no triage handle in v1.2 (G-S3). Either dropped (waste) or anchored as standalone scene (canon risk). v2 routes via `defer-to-supplemental(target=dispatch)`.

The cadence cap (one slate per session, plan §Step 6) + six-decision triage primitives together eliminate the C94 5-variant slate loop. The variants weren't editorial uncertainty — they were the absence of structured reduction handles. With handles, the slate converges in one pass.

---

## Cross-spec dependencies

- **[[brief_template_v2]]** — each `promote` decision feeds a brief at `output/reporters/{slug}/c{XX}_{SLOT}_brief.md`. Each `fold` decision means the host brief gets the folded content as inset / aside (host brief's SIGNAL paragraph references the folded baseline).
- **[[dispatch_schema]]** — `articles[]` derives from `promote` decisions. `quickTakes[]` derives from QT-shaped `fold` decisions. `letters` derives from letters-desk candidate pool (separate stage).
- **[[../plans/2026-05-22-sift-v2]] §v2 Step List Step 5** — this spec is the Step 5 contract.
- **Non-edition publishing** ([[plans/2026-04-26-non-edition-publishing-pipeline]]) — `defer-to-supplemental` decisions route into the supplemental pipeline. Engine work pending — pipeline.2 in ROLLOUT.

---

## Changelog

- 2026-05-23 (S228, research-build) — Triage vocabulary initial draft. pipeline.24 Task 5. Six decisions (`promote` / `publish-as-baseline` / `suppress` / `fold` / `covered-by-feature` / `defer-to-supplemental`) with required JSON fields + decision-tree diagnostic + 5 worked examples (3 real C94 + 2 synthetic showing v2-only decisions). Closes G-S13 (triage vocabulary gap). Validation rules name what `baselineDecisions[]` parser must enforce.
