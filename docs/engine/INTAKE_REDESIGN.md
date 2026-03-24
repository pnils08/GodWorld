# Edition Intake System — Redesign Spec

**Status:** DRAFT — NOT APPROVED. Mike says this is 30% connected to the actual world. Needs his input on what's missing before any code gets written. Do not build from this spec.

---

## Problem

No working intake system exists. Editions and supplementals publish canon — citizens, businesses, faith organizations, cultural entities, initiative updates, storyline progressions — and none of it flows back to the sheets that feed the engine and desk packet builders. The old `editionIntake.js` can't parse either format.

---

## Design Principle

Every edition (Cycle Pulse or supplemental) already ends with structured intake sections written by the reporters:

- **ARTICLE TABLE** — per-article metadata
- **CITIZEN USAGE LOG** — every citizen who appeared, categorized
- **STORYLINES UPDATED** — new canon, new information, phase changes
- **CONTINUITY NOTES** — facts the world must respect

The intake system parses THESE sections. Not the articles. The reporters already did the extraction.

---

## What Gets Intaked

### 1. Citizen Appearances → Citizen_Usage_Intake

Every citizen who appears in the edition gets a row. One row per appearance per edition.

| Field | Source | Example |
|-------|--------|---------|
| CitizenName | CITIZEN USAGE LOG line | Brianna Nguyen |
| Age | Parsed from line (if present) | 34 |
| Neighborhood | Parsed from line | Fruitvale |
| Occupation | Parsed from line | — |
| POPID | Cross-ref against Simulation_Ledger by name | POP-00XXX or blank |
| UsageType | Category header → type | quoted / new_citizen / letter_writer / civic_official / referenced |
| Context | Parenthetical at end of line | parent at Fruitvale Bilingual (2 children) |
| Reporter | From ARTICLE TABLE or JOURNALISTS section | Angela Reyes |
| Edition | Cycle number | 88 |
| Status | new or returning | returning |

**Why:** Usage count drives citizen emergence (Tier 4 → Tier 3). Spotlight system weights active citizens. Desk packet briefings flag returning citizens. Without this, the simulation doesn't know who the newsroom cares about.

### 2. New Citizens → Citizen_Usage_Intake (flagged for Simulation_Ledger promotion)

New citizens from the NEW CITIZENS CREATED section get the same row as above with `UsageType: new_citizen` and `Status: new`. These are candidates for promotion to Simulation_Ledger where the engine can give them life events, career changes, aging.

Promotion is a separate step (manual or scripted) — intake just stages them.

### 3. New Businesses/Institutions → Business_Ledger

| Field | Source | Example |
|-------|--------|---------|
| Name | NEW CANON line | Fruitvale Bilingual Academy |
| Type | Inferred from description | school / restaurant / bar / tech / community |
| Neighborhood | Parsed from line | Fruitvale |
| Description | Full line text | K-8 bilingual, 480 students, 3700 International Blvd |
| IntroducedEdition | Cycle number | 88 |

**Source:** STORYLINES UPDATED → NEW CANON section (supplementals) or CONTINUITY NOTES → "New canon established" (Cycle Pulse).

**Why:** Business_Ledger feeds the engine's economic ripple system and desk packet neighborhood context. A business that isn't here doesn't participate in the economy.

### 4. Faith Organizations → Faith_Organizations

| Field | Source | Example |
|-------|--------|---------|
| Name | NEW CANON or CONTINUITY NOTES | Allen Temple Baptist Church |
| Neighborhood | Parsed | East Oakland |
| Tradition | Inferred | Baptist |
| Context | Description | After-school partnership with Allen Temple Academy |
| IntroducedEdition | Cycle number | 88 |

**Why:** Engine generates faith events from this sheet. Culture desk packets pull from it.

### 5. Cultural Entities → Cultural_Ledger

| Field | Source | Example |
|-------|--------|---------|
| Name | CITIZEN USAGE LOG (cultural entity tag) or NEW CANON | Marin Tao |
| Type | artist / venue / event / program | artist |
| Neighborhood | Parsed | KONO |
| IntroducedEdition | Cycle number | 88 |

**Why:** Engine generates cultural events. Culture desk needs these for First Fridays, gallery coverage, arts scene.

### 6. Initiative Status → Initiative_Tracker

| Field | Source | Example |
|-------|--------|---------|
| InitiativeID | Match by name against existing tracker rows | INIT-002 |
| ImplementationPhase | PHASE CHANGES line | clock-expired |
| MilestoneNotes | NEW INFORMATION lines | Day 45 reached, dispatch unconfirmed |
| LastUpdated | Edition date | 2026-03-23 |

**Source:** STORYLINES UPDATED → PHASE CHANGES (supplementals) or CONTINUITY NOTES → "New canon established" initiative-related lines (Cycle Pulse).

**Why:** `buildInitiativePackets.js` and `buildDecisionQueue.js` read Initiative_Tracker. The voice-agent-world-action-pipeline depends on current state here.

### 7. Storyline State → Storyline_Tracker

| Field | Source | Example |
|-------|--------|---------|
| StorylineType | Tag from line (new/continuing/resolved/thread) | new |
| Description | Line text | East Oakland neighborhood first canon coverage |
| Status | Mapped from tag | active / resolved |
| LastCoverageCycle | Edition cycle | 88 |

**Source:** STORYLINES UPDATED section (supplementals) or bracket-tagged lines under STORYLINES in Cycle Pulse.

**Why:** Engine arc lifecycle, story hook generation, staleness detection. Desk packets include active storylines.

---

## How It Works

### Single command, two modes:

```bash
node scripts/editionIntake.js editions/cycle_pulse_edition_88.txt --dry-run
node scripts/editionIntake.js editions/cycle_pulse_edition_88.txt --apply
```

Dry-run always first. Shows exactly what would be written to which sheet. Apply after review.

### Parse logic:

1. Detect cycle number from filename (`_c88` or `edition_88`)
2. Find ARTICLE TABLE line — everything below this is structured intake data
3. Scan lines, classify by category header (case-insensitive pattern match)
4. Parse each line by its category's format
5. Cross-reference citizen names against Simulation_Ledger for POPID matching
6. Display summary: N citizens, N new, N businesses, N faith, N cultural, N initiative updates, N storylines
7. On `--apply`: write to each target sheet

### Format handling:

The section headers vary between Cycle Pulse and supplementals. The line format within sections is consistent. The parser matches category headers by pattern (not exact string) and parses the `— Name, Age, Neighborhood, Occupation (context)` line format which is the same everywhere.

---

## What Intake Does NOT Do

- Parse article body text (Supermemory has full text)
- Store key quotes (NEWSROOM_MEMORY tracks these editorially)
- Track article metadata beyond the ARTICLE TABLE (dashboard and grading handle this)
- Manage sports rosters (Mike's domain)
- Update NEWSROOM_MEMORY or NOTES_TO_SELF (editorial, not simulation)
- Replace Supermemory ingestion (separate script, separate purpose)

---

## Downstream Consumers

| Sheet | Who Reads It | For What |
|-------|-------------|----------|
| Citizen_Usage_Intake | Engine (processIntake), buildDeskPackets (spotlight, returning citizens) | Citizen emergence, usage tracking |
| Business_Ledger | Engine (economic ripple), buildDeskPackets (neighborhood context) | Economic simulation, business coverage |
| Faith_Organizations | Engine (faith events), buildDeskPackets (culture desk) | Faith event generation |
| Cultural_Ledger | Engine (cultural events), buildDeskPackets (culture desk) | Cultural event generation |
| Initiative_Tracker | buildInitiativePackets, buildDecisionQueue, voice agents | Civic pipeline, world-action loop |
| Storyline_Tracker | Engine (arc lifecycle, story hooks), buildDeskPackets | Arc management, story hook generation |

---

## Implementation Plan

1. Write the new `editionIntake.js` v3.0 — line-scanning parser, category classification, per-sheet writers
2. Test dry-run against every edition on disk (E80-E88, 7 supplementals)
3. Test `--apply` against the education supplemental (10 new citizens waiting)
4. Document in WORKFLOWS.md and EDITION_PIPELINE.md
5. Run intake for all un-intaked editions (E88 + education supplemental at minimum)
