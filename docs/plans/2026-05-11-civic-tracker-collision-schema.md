---
title: Civic tracker-collision schema — primary-owner field + Mayor cascade routing + dry-run gate
created: 2026-05-11
updated: 2026-05-11
type: plan
tags: [civic, architecture, schema, active]
sources:
  - "[[../../output/production_log_city_hall_c93_run_gaps.md]] §G-R4 / G-R1 / G-R15 — the three gaps this plan closes"
  - "[[../engine/ROLLOUT_PLAN]] §civic.9 — parent ROLLOUT entry"
  - ".claude/skills/city-hall/SKILL.md — consumer of the schema"
  - "scripts/applyTrackerUpdates.js — consumer of the schema (engine-sheet, civic.9b scope)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] civic.9 — split into 9a (this plan, research-build) + 9b (engine-sheet wires the scripts)"
  - "[[../adr/0005-rollout-plan-structure]] §How to add work — pointer convention"
---

# Civic Tracker-Collision Schema

**Closes:** civic.9a (research-build) — schema design that engine-sheet wires in civic.9b. Three gaps fold under this plan:

- **G-R4 (HIGH)** — Multi-voice tracker collisions on shared initiative. C93 INIT-002 (OARI) had 5 voices write trackerUpdates (Mayor M6, Chief OPD-002, OPP OPP-001, Tran T1, Tran T2). Same political direction but different `MilestoneNotes` / `NextScheduledAction` / `NextActionCycle`. `applyTrackerUpdates.js` has no merge/precedence rule — last-wins by file order = nondeterministic. Subset gets overwritten silently = canon drift.
- **G-R1 (MED)** — Mayor cascade routing not deterministic. Step 4 currently builds one cascade block summarizing all Mayor decisions and appends to ALL 10 downstream voices/projects ("broadcast then filter"). Noisy + over-inclusive. Auto-elimination: a routing table maps mayor decision topic → relevant voices/projects, and a script emits targeted append-blocks.
- **G-R15 (LOW)** — `applyTrackerUpdates.js` writes `civic_sentiment_c{XX}.json` even in dry-run mode. Violates dry-run contract. Two-line fix in the script.

The schema is the contract; the routing table is the runtime data; the dry-run gate is hygiene.

---

## Schema — `trackerOwner` field on voice/project statements

Every voice statement that carries a `trackerUpdates` object MUST also carry a `trackerOwner` field at the same level. Three valid values:

```json
{
  "statementId": "STMT-93-MAYOR-006",
  "office": "mayor",
  "topic": "OARI rubric + 8-vote threshold architecture",
  "trackerUpdates": { ... },
  "trackerOwner": "primary"
}
```

| Value | Meaning | Effect on Initiative_Tracker write |
|-------|---------|------------------------------------|
| `"primary"` | This voice owns the cycle's authoritative state change for this initiative. | `applyTrackerUpdates.js` writes this voice's `trackerUpdates` to the sheet. Exactly ONE primary per (initiative, cycle) pair. |
| `"secondary"` | This voice is taking a supporting position but not driving the state change. | Voice's `MilestoneNotes` is concatenated into the primary's MilestoneNotes string ("Also weighed in: <office> — <note>"). `NextScheduledAction` / `NextActionCycle` ignored. |
| `"advisory"` | This voice is commenting but has no operational authority on this initiative. | Logged in `civic_sentiment_c{XX}.json` aggregate ONLY. Does not touch Initiative_Tracker sheet at all. |

**Absence of `trackerOwner` field** when a `trackerUpdates` object is present = schema violation. `applyTrackerUpdates.js` should fail loud at dry-run with the offending statement IDs listed; the city-hall production agent re-runs after the voice agents fix their outputs.

### Default ownership per voice/project class

The cascade is canonical, not editorial-judgment. Most cases resolve without operator intervention:

| Voice / Project class | Default ownership on initiatives in their lane | Default on initiatives outside their lane |
|----------------------|-----------------------------------------------|--------------------------------------------|
| **Mayor** | `primary` on any initiative where her statement is the cycle's executive direction | `advisory` |
| **Project director** (Webb, Ramos, Chen-Ramirez, Soria Dominguez, Tran-Muñoz) | `primary` on their own project's operational state | `advisory` |
| **Deputy Mayor** (Okoro) | `secondary` on Mayor's primary-claimed initiatives in her portfolios (Stab Fund / Community Dev / ED-coverage); `advisory` elsewhere | `advisory` |
| **Police Chief** (Montez) | `primary` on Public Safety state changes (crime ops, OPD deployment); `secondary` on OARI political-cascade items | `advisory` |
| **District Attorney** (Dane) | `primary` on legal-framework changes; `secondary` on safety initiatives with legal dimension | `advisory` |
| **Faction-bloc agents** (OPP / CRC / IND-swing) | `secondary` on initiatives in their bloc's districts; `advisory` elsewhere | `advisory` |
| **Council vote outcomes** (Vote-trigger mechanism per pipeline.X — TBD) | `primary` on the initiative being voted on (one statement per vote-tally) | n/a |
| **Individual council members speaking outside their bloc** | `advisory` always (their political position is captured by their bloc agent at secondary; individual statements are commentary only) | `advisory` |

### Conflict resolution

**One primary per (initiative, cycle).** If two voices claim primary on the same initiative in the same cycle, `applyTrackerUpdates.js` fails dry-run with:

```
COLLISION on INIT-002 (cycle 94):
  Primary claim 1: mayor — STMT-94-MAYOR-006 (topic: "OARI rubric + 8-vote threshold")
  Primary claim 2: oari — STMT-94-OARI-001 (topic: "OARI rubric implementation")
  Resolution: re-run upstream voice agent(s) and downgrade one claim to secondary.
  Convention: Mayor wins over project director on political framing; project director wins over Mayor on operational detail.
```

The convention: when both Mayor and a project director claim primary on the same initiative, Mayor's claim governs the political framing (policy direction, vote posture, deadline pressure), project director's claim governs operational detail (timeline, milestone names, partner orgs). Both can coexist — Mayor downgrades to secondary on operational items, project director downgrades to secondary on political items. The voice agents are re-run with this distinction explicit in their pending_decisions briefing.

**Multiple secondaries OK.** All secondaries get their MilestoneNotes folded into the primary's note string, in voice-agent-output order. Cap: 3 secondary appends; beyond that, secondaries beyond #3 demote to advisory automatically (avoids unreadable MilestoneNotes blobs).

**Advisories never block.** They aggregate into `civic_sentiment_c{XX}.json` for engine Phase-2 sentiment computation but never write to Initiative_Tracker.

---

## Cascade routing table

Mayor's decisions are the canonical input to the Layer 2 cascade. Today the cascade is broadcast-then-filter ("every voice gets every Mayor decision; each voice decides what's relevant in their own model context"). G-R1 cost: ~3 min hand-build per cycle + noise in every downstream voice's input.

The routing table maps **Mayor's decision topic** → **voices/projects that need the cascade context**. Static table maintained at `.claude/skills/city-hall/CASCADE_ROUTING.md`. Engine-sheet builds `scripts/cascadeMayorDecisions.js` to read mayor's voice JSON + the routing table + write targeted append-blocks to each downstream voice's `pending_decisions.md`.

### Routing table shape

```markdown
# Cascade Routing — Mayor decision topic → downstream voices

## Stabilization Fund (INIT-001)
- Cascade to: civic-office-okoro (Deputy Mayor, Stab Fund oversight)
- Cascade to: civic-project-stabilization-fund (Webb, Director — operational)
- Cascade to: civic-office-ind-swing (Vega, Stab Fund oversight committee chair)
- Cascade to: civic-office-crc-faction (Ashford, fiscal oversight)

## OARI (INIT-002)
- Cascade to: civic-project-oari (Tran-Muñoz, Director)
- Cascade to: civic-office-police-chief (Montez, operational dispatch integration)
- Cascade to: civic-office-opp-faction (Rivers, Carter — D1/D5 OARI cascade)
- Cascade to: civic-office-ind-swing (Tran, OARI expansion demand)

## Transit Hub (INIT-003)
- Cascade to: civic-project-transit-hub (Soria Dominguez, Lead)
- Cascade to: civic-office-opp-faction (Delgado, D3 Fruitvale)
- Cascade to: civic-office-ind-swing (Vega, Council President; vote-trigger mechanism)
- (Add others as faction-vote routing is finalized — see G-R11 vote-trigger plan)

## Health Center (INIT-005)
- Cascade to: civic-project-health-center (Chen-Ramirez, Director)
- Cascade to: civic-office-okoro (Deputy Mayor, community-development cross-cut)
- Cascade to: civic-office-opp-faction (Rivers, D5 health-domain spillover)

## Baylight (INIT-006)
- Cascade to: civic-office-baylight-authority (Ramos, Director)
- Cascade to: civic-office-okoro (Deputy Mayor, ED-coverage workforce-agreement piece)
- Cascade to: civic-office-crc-faction (Ashford, fiscal oversight + audit demands)
- Cascade to: civic-office-opp-faction (Carter, D1 West Oakland adjacency)

## (Other initiatives — fill in as they surface)
```

### Conventions for the routing table

- **Voice/project IDs match agent directory names** (`civic-office-okoro`, `civic-project-oari`, etc.) so the script can resolve targets directly.
- **One initiative per top-level section** — easy to maintain, easy to grep.
- **Comment lines** explain WHY each voice is on the cascade list (district adjacency, faction posture, oversight role, operational ownership).
- **Faction-vote routing** for vote-ready initiatives expands the cascade to all 9 council voices via the 3 faction-bloc agents — that pattern is gated on pipeline.X G-R11 vote-trigger mechanism work. Until that lands, the routing table omits the vote-expansion column.

### Idempotence + fallback

- If a routing entry is missing for an initiative the Mayor decided on, `cascadeMayorDecisions.js` falls back to the broadcast pattern (cascade to all 10 downstream voices) AND logs a missing-route warning. Forces the routing table to be filled in incrementally without blocking cycle execution.
- The script is idempotent — re-running with the same `mayor_c{XX}.json` overwrites the previous targeted append-blocks rather than stacking.

---

## civic_sentiment dry-run gate (G-R15)

Two-line fix in `applyTrackerUpdates.js`:

```js
// Current (writes regardless of --apply):
fs.writeFileSync(`output/civic_sentiment_c${cycle}.json`, JSON.stringify(sentiment, null, 2));

// Fix:
if (APPLY) {
  fs.writeFileSync(`output/civic_sentiment_c${cycle}.json`, JSON.stringify(sentiment, null, 2));
}
```

Side-effect-free dry-run. Cycle hygiene.

---

## Skill text updates (research-build's piece beyond this spec)

When civic.9a ships (this plan file lands + ROLLOUT pointer wired), follow-up skill-text edits land in a separate research-build commit:

- **`.claude/skills/city-hall/SKILL.md` §Step 2 (Write Pending Decisions):** add explicit instruction to voice agents: "Your statement must include `trackerOwner: 'primary' | 'secondary' | 'advisory'` per the civic-tracker-collision schema. Default ownership table per agent class lives in `docs/plans/2026-05-11-civic-tracker-collision-schema.md` §Default ownership."
- **`.claude/skills/city-hall/SKILL.md` §Step 4 (Run Remaining Voices):** replace "build cascade block + append to all downstream voices" with "invoke `scripts/cascadeMayorDecisions.js {cycle}` to write targeted cascade blocks per the routing table."
- **Voice agent RULES.md files** (Mayor, Okoro, Chief, DA, factions, projects): add §`trackerOwner` field section pointing at this spec + the default-ownership table.

These skill-text edits aren't gating civic.9b — engine-sheet can wire the scripts as soon as this plan lands. The skill text catches up in a follow-up commit and the voice agents migrate to the new field over 1-2 cycles (during which `applyTrackerUpdates.js` should treat a missing `trackerOwner` as `primary` with a deprecation warning, then enforce the field strictly in C96+).

---

## civic.9b handoff (engine-sheet scope)

When civic.9b is picked up, engine-sheet's work is:

1. **`scripts/applyTrackerUpdates.js`** — read `trackerOwner` field per statement; enforce one-primary-per-(initiative, cycle); fold secondary MilestoneNotes into primary's note string (3-secondary cap); advisories aggregate into civic_sentiment only. Surface collisions at dry-run with named statement IDs. Backward-compat: missing `trackerOwner` → `primary` + deprecation warning for 1-2 cycles, then strict in C96+.
2. **`scripts/cascadeMayorDecisions.js`** (NEW) — reads `output/civic-voice/mayor_c{XX}.json` + `.claude/skills/city-hall/CASCADE_ROUTING.md` table + writes targeted append-blocks to each downstream voice's `pending_decisions.md`. Idempotent. Missing-route warning + broadcast fallback when a routing entry is absent.
3. **`scripts/applyTrackerUpdates.js`** — gate `civic_sentiment_c{XX}.json` write behind `if (APPLY)`. ~2 lines.
4. **`.claude/skills/city-hall/CASCADE_ROUTING.md`** (NEW) — seed the routing table with the 5 active initiatives per §Cascade routing table above. Research-build maintains the table going forward as new initiatives come online; engine-sheet's script consumes it as static data.

### Acceptance for civic.9b

- C94 dry-run with two voices claiming primary on the same initiative → script fails loud with collision report (named statements + suggested resolution)
- C94 dry-run with one primary + N secondaries → MilestoneNotes folds 3 secondaries max, demotes overflow to advisory, no sheet write
- C94 dry-run does NOT produce `civic_sentiment_c94.json`
- C94 --apply produces `civic_sentiment_c94.json` with sentiment aggregating ALL classes (primary + secondary + advisory)
- `cascadeMayorDecisions.js` against C93 Mayor output produces 5 targeted pending_decisions append-blocks (one per active initiative), one routing fallback warning (if any initiative not in the seeded routing table), idempotent on re-run

---

## Why this design

- **One-primary-per-(initiative, cycle)** is the simplest invariant that eliminates nondeterminism. Alternative designs (priority scoring, voice-weight aggregation, faction-weighted merge) introduce policy complexity that creates new failure modes; the simple rule produces clean tracker history.
- **Secondary + advisory tiers** preserve the canon value of multi-voice positioning without conflating positioning with state-change authority. C93's INIT-002 saw 5 voices weigh in — all of them said something canonically meaningful; only one of them should drive `ImplementationPhase` / `NextActionCycle`. The schema lets all five record their position without one silently overwriting the others.
- **Routing table over broadcast** preserves the operator-time savings from G-R1 without losing canon coverage. The table is editable; the broadcast fallback prevents the table from blocking cycle execution.
- **Mayor-cascade structure preserved.** This plan doesn't change WHEN voices speak (Layer 1 Mayor first, then Layer 2 voices, then Layer 3 projects). It changes WHAT voices declare about their tracker writes + WHO gets the cascade context. The S139 cascade discipline (Mayor primary, factions react, projects operationalize) maps cleanly to the trackerOwner taxonomy.

---

## Alternatives considered

- **No primary field — voice priority by hardcoded list in applyTrackerUpdates.js.** Rejected: opaque + nondiscoverable + hard to update when canon shifts (e.g., Deputy Mayor Okoro coming online at S215 would have required a code edit instead of a schema-table edit).
- **Voice-weight scoring (Mayor=10, project=8, faction=5, etc.) with weighted-average MilestoneNotes merge.** Rejected: produces unreadable MilestoneNotes blends + introduces policy complexity for marginal canon gain.
- **Single-voice-per-initiative-per-cycle (no secondaries at all).** Rejected: loses the canon value of "5 voices weighed in on OARI" — that multi-voice positioning IS the political reality the engine should capture in civic_sentiment.

---

## Changelog

- 2026-05-11 — Plan filed (S215, research-build). Closes civic.9a. Engine-sheet civic.9b acceptance criteria + scope listed inline. Skill-text follow-up edits queued separately. Registered in [[../index]].
