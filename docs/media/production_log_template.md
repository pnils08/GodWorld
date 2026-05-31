---
title: Production Log Template (per-cycle unified)
created: 2026-05-24
updated: 2026-05-24
type: reference
tags: [media, civic, edition-pipeline, format-contract, active]
sources:
  - "[[../EDITION_PIPELINE]] §Production Log Lifecycle (S230 G-EPD4)"
  - "[[../plans/2026-05-24-governance-14-edition-pipeline-rewrite]] §Task 5 (G-EPD6)"
  - "output/production_log_c93.md (S195 reference implementation)"
  - "output/edition_pipeline_doc_gaps_c94.md G-EPD6"
pointers:
  - "[[../EDITION_PIPELINE]] §Production Log Lifecycle — references this template"
  - "[[brief_template_v2]] — sibling template pattern (per-section sub-blocks)"
  - "[[../plans/GAP_LOG_TEMPLATE]] — sidecar shape (gap logs live alongside, NOT inside)"
  - "[[index]] — register same commit"
---

# Production Log Template (per-cycle unified)

**Every cycle's production log conforms to this shape.** Path: `output/production_log_c{XX}.md` (unified per `[[../EDITION_PIPELINE]]` §Production Log Lifecycle, S230 G-EPD3 target convention; C93 implemented, C94 reverted to per-terminal split, per-skill path cascade DONE S248 (`pipeline.32` — civic + all add-on skills now write named sections to this one log); cycle-init opener redesign tracked as `pipeline.35`).

**Cardinality:** one file per cycle. Five+ skills append. /city-hall-prep opens; /post-publish closes (writes closing block + canonization signal).

**Sidecars:** gap logs (`production_log_c{XX}_<skill>_gaps.md` per [[plans/GAP_LOG_TEMPLATE|GAP_LOG_TEMPLATE]]) live alongside this file, NOT inside it. The production log is the canonical record; gap logs are heavy-skill drift capture.

---

## How to use this template

1. /city-hall-prep at cycle open writes the §Cycle Header + §Carry-Forward + §Tracker Snapshot + §Approval Ratings Snapshot, then appends its own §/city-hall-prep section.
2. Each subsequent skill loads this template, finds its named sub-section spec below, and appends a conforming section to the file.
3. /post-publish closes with its own §/post-publish section + the final §Closing Block sub-section.
4. After /post-publish writes the closing block, the log is canonized — no further mutation.

**Discipline:** the template is the contract. If a section ships missing required fields, treat it as a skill drift (file gap-log entry). If a new skill needs to append to the log, extend this template first, then ship the skill.

---

## §Cycle Header (written by /city-hall-prep at open)

```markdown
# Production Log — Cycle <XX>

**Opened:** <YYYY-MM-DD HH:MM> by /city-hall-prep (S<NNN>)
**Cycle:** <XX>
**Day (sim calendar):** <NNN>
**Session(s) running stages:** S<NNN> (open), S<NNN+M> (close)  ← updated as cycle advances across sessions
**Edition number:** E<XX>  ← assigned by /write-edition at compile; pre-write-edition = "TBD"
**Edition Drive ID:** <id>  ← filled by /post-publish closing block
**Bay-tribune ingest status:** <pending | complete>  ← filled by /post-publish closing block

## Gap-log sidecars (this cycle)

- `output/production_log_c<XX>_city_hall_prep_gaps.md` ← if heavy-skill drift surfaced
- `output/production_log_c<XX>_city_hall_run_gaps.md`
- `output/production_log_c<XX>_sift_gaps.md`
- `output/production_log_c<XX>_write_gaps.md`
- `output/production_log_c<XX>_post_publish_gaps.md`
- `output/production_log_c<XX>_print_gaps.md`
- `output/production_log_c<XX>_run_cycle_gaps.md` ← engine-side, mechanical detectors
- `output/production_log_c<XX>_dispatch_<slug>_gaps.md` ← multi-run, slug-infixed (one per dispatch)
- `output/production_log_c<XX>_interview_<subject-slug>_gaps.md` ← multi-run, slug-infixed
- `output/production_log_c<XX>_write_supplemental_<slug>_gaps.md` ← multi-run, slug-infixed

*(Naming convention pipeline.34 (S248): `production_log_c<XX>_<skill>_gaps.md`, with a `_<slug>` infix for skills that can run more than once per cycle. Sidecars are NOT for downstream consumption — they capture skill drift for governance review, are transient, and fold into the cycle's compiled triage plan (GAP_LOG_TRIAGE_PLAYBOOK) before being archived. The production log itself is the canonical record.)*
```

## §Carry-Forward from Prior Cycle (written by /city-hall-prep at open)

```markdown
## Carry-Forward from C<XX-1>

Read from `output/production_log_c<XX-1>.md` §Closing Block.

| Initiative | Prior-cycle commitment | Owner | Due this cycle? | Notes |
|---|---|---|---|---|
| INIT-NNN | ... | <office/voice> | Y/N | ... |

If prior log is missing or pre-unified format (per-terminal split, C92 and earlier):
  - **Pre-unified fallback:** read `output/production_log_city_hall_c<XX-1>.md` if present; surface fallback in skill text + flag in gap log.
  - **Missing entirely:** populate from `Initiative_Tracker` sheet snapshot only; note "no prior-cycle log available — carry-forward is best-effort from tracker."
```

## §Tracker Snapshot (written by /city-hall-prep at open)

```markdown
## Initiative_Tracker Snapshot — C<XX> open

Read from `Initiative_Tracker` sheet via `lib/sheets.js`.

| InitiativeID | Name | Status | ImplementationPhase | Domain | Neighborhoods | LastUpdated |
|---|---|---|---|---|---|---|
| INIT-001 | ... | ... | ... | ... | ... | ... |

Plus three Δ-vs-prior-cycle metrics:
- Phase advances since C<XX-1>: <N>
- New initiatives since C<XX-1>: <N>
- Status changes since C<XX-1>: <N>
```

## §Approval Ratings Snapshot (written by /city-hall-prep at open)

```markdown
## Civic_Office_Ledger Snapshot — C<XX> open

Read from `Civic_Office_Ledger` sheet via `lib/sheets.js`. Filter to MAYOR-* + COUNCIL-D*.

| OfficeId | Officer | Approval (current) | Δ vs C<XX-1> | Trend (3-cycle) |
|---|---|---|---|---|
| MAYOR-SANTANA | Avery Santana | 0.NN | +0.NN | ↗ / → / ↘ |
| COUNCIL-D1 | ... | ... | ... | ... |
```

---

## Per-skill sub-section templates

Each skill that runs during the cycle appends a section with the header pattern:

```
## /<skill-name> (S<NNN>) — <YYYY-MM-DD HH:MM>
```

Followed by the skill-specific fields below.

### `## /city-hall-prep (S<NNN>) — <YYYY-MM-DD HH:MM>`

```markdown
### Inputs read

- `output/world_summary_c<XX>.md` (or note pending)
- `output/engine_audit_c<XX>.json`
- `output/production_log_c<XX-1>.md` §Closing Block (or fallback per §Carry-Forward)
- `Initiative_Tracker` + `Civic_Office_Ledger` sheet rows (snapshot above)
- Mara directives (if any) from Drive `mara-directives/c<XX>/`

### Pending decisions packet

Per-voice `output/civic-voice/<office>_c<XX>_pending.md` files written:
- MAYOR — N decisions queued
- COUNCIL-D1 — N decisions queued
- ... (one row per active office)

### Anomaly gate (S215 G-6 + ESCALATION override S229 G-PREP8)

- Approval-shift anomaly check: <fired | no-data | clear>
- ESCALATION-tagged directives: <list | none>

### Auto-investigate (S216 civic.11)

For each mitigator-stuck / remedy-not-firing initiative in engine review:
- INIT-NNN — disposition: <Scenario A | Scenario B-variant | Scenario C>

### Handoff to /city-hall

`pending_decisions` packet ready at `output/civic-voice/`. Outstanding gaps logged in `output/production_log_c<XX>_city_hall_prep_gaps.md` sidecar.
```

### `## /city-hall (S<NNN>) — <YYYY-MM-DD HH:MM>`

```markdown
### Inputs read

- `output/civic-voice/<office>_c<XX>_pending.md` (per-voice pending packets from /city-hall-prep)

### Voice statements emitted

Per-office `output/civic-voice/<office>_c<XX>.json` files written. Tracker updates per office:
- MAYOR — N statements / N trackerUpdates emitted (canonical schema per ADR/civic.13)
- COUNCIL-OPP — N statements / N votes
- COUNCIL-CRC — N statements / N votes
- COUNCIL-IND — N statements (Vega + Tran independent)
- Project agents — Baylight / OARI / Stab Fund / Transit Hub / Health Center (Layer-3 per S229)

### Vote tallies

| InitiativeID | Vote count | Result | Roster (9 members + absentee) |
|---|---|---|---|
| INIT-NNN | 8-0 / 1 abs (Crane D6) | passed | ... |

(Mara hard rule from C94: every vote ships full 9-member roster + named absentee. No "8-0 with one absent" without naming.)

### Decisions assembled

`output/city-civic-database/initiatives/<INIT-NNN>/decisions_c<XX>.json` written by `assembleDecisions.js` (Step 6 — NEVER pre-written by voice agents per S229 civic.12 G-R2 constraint).

### Tracker writes

`applyTrackerUpdates.js` shipped N updates to Initiative_Tracker. Per civic.13 G-R1 (engine-sheet decision pending), full-shape vs sparse-shape determined by canonical schema choice.

### Handoff to /sift

Civic source-material ready in `output/civic-voice/` + `output/city-civic-database/`. /sift Step 1 reads these.
```

### `## /sift (S<NNN>) — <YYYY-MM-DD HH:MM>`

```markdown
### Inputs read (sheet-primary per v2.0)

- `lib/sheets.getSheetData('Oakland_Sports_Feed' | 'Riley_Digest' | 'Initiative_Tracker' | 'Simulation_Ledger')` — canon content sources
- `output/civic-voice/<office>_c<XX>.json` (city-hall outputs)
- `output/baseline_briefs_c<XX>.json` (Phase 38.8 auto-briefs)
- `NEWSROOM_MEMORY.md` ranged-read per S215 prescription
- `world_summary_c<XX>.md` — ORIENTATION-ONLY (engine numbers + tables; not narrative content per v2.0)

### Candidate generation

N candidates produced from sheet-primary read + civic + baseline briefs.

### Cross-layer canon check (per ADR-0007, runs before triage)

For citizens not POPID-confirmed at Step 4:
- N candidates verified clean (Sim_Ledger + bay-tribune consistent)
- N canon-layer-drift hits dumped to `output/canon_drift_c<XX>.json` (bay-tribune match, no Sim_Ledger row → route to engine-sheet backfill, not NEW classification)

### Six-decision triage (per sift_triage_vocabulary)

| Decision | Count |
|---|---|
| promote | N |
| publish-as-baseline | N |
| suppress | N |
| fold | N |
| covered-by-feature | N |
| defer-to-supplemental | N |

### Slate locked

`output/sift_proposals_c<XX>.json` written with N article slots + N quick takes + 1 letters candidate pool. proposalState: locked. Cadence: ONE slate variant per session (v2.0 hard rule).

### Briefs emitted

- N per-slot briefs at `output/reporters/<reporter-slug>/c<XX>_<SLOT>_brief.md` per brief_template_v2
- 1 dispatch.json at `output/dispatch_c<XX>.json` per dispatch_schema
- 1 letters candidate pool at `output/letters/c<XX>_candidates.md`

### Engine A / Engine B handoff

- Engine A T4.1 priority data consumed at Step 6 cadence-cap enforcement (Story_Seed_Deck cols M-R)
- Engine B T3.8 byline shadow log emitted at `output/byline_shadow_log_c<XX>.json` (shadow phase, no auto-pre-fill)

### Handoff to /write-edition

Briefs + dispatch.json + letters candidate pool ready. /write-edition Step 1 reads these.
```

### `## /write-edition (S<NNN>) — <YYYY-MM-DD HH:MM>`

```markdown
### Inputs read

- `output/reporters/<reporter-slug>/c<XX>_<SLOT>_brief.md` (N briefs)
- `output/dispatch_c<XX>.json`
- `output/letters/c<XX>_candidates.md`
- `output/sift_proposals_c<XX>.json`

### Reporter dispatches

| Slot | Reporter | Brief | Article path | Word count |
|---|---|---|---|---|
| FP1 | <reporter> | ... | output/articles/c<XX>_FP1.md | <N> |
| ... | ... | ... | ... | ... |

### Reviewer chain (Phase 39 lanes)

- Rhea sourcing lane: `output/rhea_report_c<XX>.json` — score N.NN
- Cycle-review reasoning lane: `output/cycle_review_c<XX>.json` — score N.NN
- Mara result-validity lane: `output/mara_audit_c<XX>.md` — verdict <PASS | REVISE>
- Capability gate: `output/capability_review_c<XX>.json` — <PASS | FAIL>
- Final Arbiter: `output/final_arbiter_c<XX>.json` — verdict <A correct | B incorrect> / weighted score N.NN / recommendation <PROCEED | HOLD>

### Compile + publish

`editions/cycle_pulse_edition_<XX>.txt` written. Sections in order: FP / EDITORS_DESK / CIVIC / CULTURE / BUSINESS / SPORTS / OPINION / LETTERS. NAMES INDEX + BUSINESSES NAMED + ARTICLE TABLE + CITIZEN USAGE LOG + STORYLINES UPDATED + COMING NEXT EDITION footer.

USER APPROVAL GATE per S227 pipeline.26: canon-verify before Mara/Drive.

### Handoff to /post-publish

Edition `.txt` ready at `editions/`. /post-publish reads it for canon ingest + grading.
```

### `## /edition-print (S<NNN>) — <YYYY-MM-DD HH:MM>` (parallel to /post-publish)

```markdown
### Inputs read

- `editions/cycle_pulse_edition_<XX>.txt`
- `output/dispatch_c<XX>.json` (DJ direction)

### DJ photo direction

DJ Hartley spec emitted. N article photos + N stoop photos directed. FLUX prompts per `.claude/agents/dj-hartley/RULES.md` §FLUX Ceiling Awareness + §Subject Class Constraints (post-S229 pipeline.29).

### Photo generation

N photos generated via FLUX. Pass rate: N/N (after photoQA.js 5-axis check: composition / photojournalism / NEGATIVE_FRAME / CANON-TONE / verdict).

### PDF + Drive

`output/cycle_pulse_edition_<XX>.pdf` generated. Drive upload to print folder.

### Step 6 eval-side review (per S229 G-PR9)

Mike opens PDF + visually verifies article-table headlines + photo placement + on-canon tone before declaring complete.
```

### `## /post-publish (S<NNN>) — <YYYY-MM-DD HH:MM>`

```markdown
### Inputs read

- `editions/cycle_pulse_edition_<XX>.txt` (canonical artifact)
- `output/world_summary_c<XX>.md`

### Per-substep summary (matrix from /post-publish SKILL.md §Per-type substep matrix)

| Step | Action | Outcome |
|---|---|---|
| 1a wiki ingest | bay-tribune per-entity records | N entities written |
| 1b text ingest | bay-tribune full text | doc ID returned |
| 2a citizen cards | buildCitizenCards.js --apply | N written / N errors (Errors > 0 = abort per S230 canon.3 T6 gate, when shipped) |
| 2b new businesses | logged for Step 5 | N rows flagged |
| 2d truesource sweep | ingestPlayerTrueSource.js | N players ingested |
| 2c world summary | wd-summary ingest | doc ID returned |
| 3 civic wiki | ingestCivicWiki.js --apply | N memories written |
| 4 coverage ratings | rateEditionCoverage.js --apply | N ratings to Edition_Coverage_Ratings |
| 5 citizen+business intake | ingestPublishedEntities.js --apply | N citizens + N businesses appended; canon_drift_c<XX>.json: N drift hits surfaced |
| 5-bis wd-card rebuild | buildCitizenCards.js --apply --popid-range (per S230 canon.3 T3 ADR-0007) | N new POPIDs got wd-cards |
| 5b base_context | buildDeskPackets.js | rebuilt |
| 6 grade | gradeEdition.js | overall grade <A/B/C/D/F> |
| 7 grade history | append to grades.json | done |
| 8 exemplars | extract pass+ for criteria | N exemplars |
| 9 newsroom memory | NEWSROOM_MEMORY.md append | E<XX> section added |
| 10 criteria files | per-skill /skill-check x 5 + criteria refinement | N skills graded |
| 11 filing + bot | git commit + push + PM2 restart | clean |
| 12 production log finalize | wiki-pattern entries | this section |
| 13 checklist | per /post-publish Step 13 | <PASS | items remaining> |

### Optional add-on sections (non-edition skills)

These skills don't run every cycle. When they do, each appends its own named section to the same unified log (pipeline.32), routes its newsroom-memory write-back through `/post-publish --type <type>`, and reads continuity from `docs/mags-corliss/NEWSROOM_MEMORY.md` before generating. They append **before** the §Closing Block (the log is still open until /post-publish canonizes it).

| Section header | Skill | Notes |
|---|---|---|
| `## /dispatch — <slug>` | `/dispatch` | One per dispatch; can run multiple times per cycle (slug disambiguates). |
| `## /interview (S<NNN>) — <ts>` | `/interview` | Reads the §/city-hall section for voice interviews. |
| `## /write-supplemental (S<NNN>) — <ts>` | `/write-supplemental` | Deep-dive; reads world summary + §/city-hall + NEWSROOM_MEMORY. |
| `## /podcast — <format>` | `/podcast` | Post-edition audio; reads the published edition + NEWSROOM_MEMORY for pronunciation/continuity. |

### Closing Block

```
**Cycle <XX> CLOSED <YYYY-MM-DD HH:MM>**

- **Edition:** E<XX> "<headline-spine>"
- **Drive ID:** <Drive-folder-or-file-ID>
- **Bay-tribune ingest:**
  - Wiki memories: <N> doc IDs
  - Text chunks: <N> doc IDs
  - Civic wiki: <N> per-statement records
- **World-data ingest:**
  - wd-citizens: <N> cards refreshed / <N> built (Step 5-bis newly-appended POPIDs)
  - wd-cultural: <N> cards refreshed (when CUL-IDs present)
  - wd-summary: 1 doc
  - wd-player-truesource: <N> players
- **Coverage ratings applied:** <N> domains to Edition_Coverage_Ratings (engine reads next cycle)
- **Grading:** <A/B/C/D/F> — <one-line summary>
- **Canon drift surfaced:** <N> hits in canon_drift_c<XX>.json (engine-sheet backfill queue)
- **Carry-forward TO next cycle (read by /city-hall-prep C<XX+1>):**
  - <initiative-or-decision-summary>
  - ...
```
```

---

## Closing-Block convention (canonization signal)

When /post-publish writes the closing block above, the production log is **canonized** — no further mutation. The next cycle's `/city-hall-prep` reads from the closing block (specifically the "Carry-forward TO next cycle" sub-section) to populate its own §Carry-Forward section. The closing block is the inter-cycle handoff contract.

If the closing block is missing or malformed, the next cycle's `/city-hall-prep` falls back to:
1. Read pre-unified `production_log_city_hall_c<XX-1>.md` if present (pre-S230 per-terminal split).
2. If that's also missing, populate carry-forward from `Initiative_Tracker` sheet snapshot only + flag in gap log.

---

## Anti-pattern list

- **Sidecar gap logs inline.** Gap logs are sidecars per [[plans/GAP_LOG_TEMPLATE|GAP_LOG_TEMPLATE]]; never embed gap-log entries inside the production log. Production log is the canonical record; gap logs are governance instrument.
- **Per-terminal split** (`production_log_city_hall_c<XX>.md` + `production_log_edition_c<XX>.md` as separate files). Pre-S230 convention; deprecated. Per-skill path cascade (`pipeline.32`) will retire the split.
- **Hand-written cycle-header** when /city-hall-prep should populate. The template's §Cycle Header fields are programmatically populated; hand-editing breaks the carry-forward chain.
- **Skipping the closing block.** If /post-publish doesn't write it, next cycle has no canonization signal + falls back to sheet snapshot only. Mike's edition didn't ship → still write the closing block, just say so explicitly ("Edition NOT shipped this cycle — see §Issue summary above").
- **Editing the log after closing block.** Post-canonization, the log is immutable. Edits become a new gap-log entry + a clarifying-note sidecar, not a mutation of the canonical record.

---

## Changelog

- 2026-05-24 — Initial draft (S230, governance.14 Task 5). Single-file template per Mike S230 ruling (top conventions + per-skill sub-section subtemplates inline; rejected alternatives: 5 separate per-skill template files / minimal-shape contract). Modeled on `docs/media/brief_template_v2.md` (same per-variant sub-block pattern). Registered in `docs/index.md` same commit per S147 inbound-link rule. Back-linked from `[[../EDITION_PIPELINE]]` §Production Log Lifecycle.
