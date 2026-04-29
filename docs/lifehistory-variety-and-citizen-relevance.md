# LifeHistory Variety + Citizen Relevance (Proposal)

## Why this matters

The current system already logs micro-events (`LifeHistory_Log`) and compresses long histories into compact personality summaries (`compressLifeHistory.js`). The next improvement should make each citizen's history feel less repetitive and more useful for civic decisions.

## 1) Add variety with event "bands" (not just tags)

Keep existing tags, but add an event-band label in `EventText` (or as a future column) so each entry has narrative shape:

- **Routine**: daily habits, commute, household chores.
- **Pivot**: a meaningful turning point (new job, conflict, injury, move).
- **Spillover**: how city-level events affect this person (budget vote, transit delay, outage).
- **Contribution**: citizen action that affects others (organizing, volunteering, mentoring).
- **Reflection**: quote, opinion shift, trust change, neighborhood sentiment.

This creates texture while staying compatible with existing `EventTag` usage and compression.

## 2) Add civic relevance fields per life event

To make history directly useful for "a citizen," each event should answer: *why does this matter to city life?*

Add lightweight structured tokens to each event text, for example:

- `Domain:HOUSING|TRANSIT|SAFETY|HEALTH|EDUCATION|SMALL_BIZ`
- `CivicImpact:low|med|high`
- `AffectedBy:InitiativeID or ArcID`
- `CitizenAction:attended_meeting|filed_311|volunteered|voted|none`

This lets downstream systems quickly build citizen-facing summaries like:

- "You were affected by 3 transit disruptions this month."
- "Your neighborhood had 2 policy-linked improvements tied to Initiative X."

## 3) Add "before/after" snapshots for major moments

For key tags (`Promotion`, `Health`, `Divorce`, `Retirement`, `CivicRole`), write paired entries:

- `StateBefore: ...`
- `StateAfter: ...`

This makes life history legible over time, instead of just a stream of atomic events.

## 4) Add neighborhood context to reduce generic narratives

Many entries can become more grounded by forcing one local anchor:

- Place anchor (intersection, corridor, venue type)
- Service anchor (school, clinic, transit line, permit office)
- Community anchor (association, faith org, sports league)

This reduces repeated generic text and increases local realism for residents.

## 5) Add citizen-facing outputs (the key relevance step)

Generate three short views from the raw history + compressed profile:

1. **My Last 30 Days** (personal timeline)
2. **My Civic Footprint** (participation + community contribution)
3. **My Risk & Opportunity Watchlist** (what to watch next cycle)

These are much more actionable than raw tags and keep life history meaningful to a non-technical user.

## 6) Add anti-repetition controls

Introduce generation constraints to increase variety:

- No identical tag + phrase template reuse within N cycles.
- Require at least 1 of each band (`Routine/Pivot/Spillover/Contribution/Reflection`) every M cycles.
- Cap high-drama events per citizen per cycle to avoid narrative inflation.

## 7) Scoring model: "Citizen Relevance Score"

Per event, compute a simple score (0-100):

- + policy linkage
- + direct service impact
- + neighborhood consequence
- + citizen agency/action
- + continuity with prior unresolved issue

Only high-scoring items appear in citizen digest headers; low-scoring items remain in archive.

## 8) Minimal rollout plan

1. **Phase A (safe):** add structured civic tokens inside `EventText` with no schema change.
2. **Phase B:** update compression parser to detect civic tokens and include them in profile motifs.
3. **Phase C:** add citizen-facing digest generation from existing ledgers.

## Example rewritten event

Instead of:

- `[Daily] Took bus downtown.`

Use:

- `[Spillover] Bus route delayed 28 minutes near Lake Merritt. Domain:TRANSIT|CivicImpact:med|AffectedBy:Initiative_Transit_12|CitizenAction:filed_311`

This preserves narrative while becoming immediately useful for citizen reporting and planning.
