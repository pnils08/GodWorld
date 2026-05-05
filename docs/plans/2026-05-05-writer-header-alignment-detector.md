---
title: Writer-vs-Header Schema Alignment Detector Plan
created: 2026-05-05
updated: 2026-05-05
type: plan
tags: [engine, infrastructure, audit, draft]
sources:
  - SESSION_CONTEXT.md (S201 §5 — Story_Seed_Deck/Story_Hook_Deck header drift incident; 469 stale cells, ~10 cycles of silently-dropped engine routing data)
  - docs/plans/2026-05-03-run-cycle-gap-log-surface.md (parent — V2 detector class slot)
  - schemas/SCHEMA_HEADERS.md (live regen output, S199-onward refresh cadence)
  - .claude/rules/engine.md (Phase 10 + 38 documented direct-write exceptions — the writer set this detector covers)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[plans/2026-05-03-run-cycle-gap-log-surface]] — engineCycleAudit.js parent (this is the V2 detector slot)"
  - "[[engine/LEDGER_HEAT_MAP]] — sibling tracker for column-level health (S202 audit pass surfaced this gap class)"
  - "[[engine/ENGINE_REPAIR]] — cross-session defect log; this detector finds new ENGINE_REPAIR rows"
---

# Writer-vs-Header Schema Alignment Detector Plan

**Goal:** Mechanically catch the schema-drift class that S201 surfaced — engine writer's column-index expectations diverge from the live sheet header layout, and writes silently land in the wrong columns. Story_Seed_Deck/Story_Hook_Deck case bled engine routing data (suggestedJournalist/Angle/Voice/Confidence) into stale calendar header cols for ~10 cycles before any consumer noticed; downstream readers (`buildDeskPackets`, `buildMediaPacket`) silent-empty'd because the data they fetched was junk. New V2 detector class for `scripts/engineCycleAudit.js` that runs against repo state (not cycle output) and flags any writer whose `setValue(s)` column expectations don't match the regen.

**Scope:** All engine writers in the documented exception list (engine.md §Phase 1-11 + utilities). ~38 files at last count (Phase 40.3 Path 1 audit, S156). Phase 10 persistence writers are the canonical case; phase01-11 direct-write exceptions are the broader set.

**Class name:** `header-drift` (slot in the existing 8-class engineCycleAudit taxonomy — currently `phase-skip / writeback-drift / cohort-collision / math-anomaly / determinism-break / phase-ordering / silent-fail / cross-cycle-debt`; this is a 9th class. Or sub-class under `writeback-drift` if we want to keep the 8-class shape — TBD in grill.)

**Detection mechanism:** For each writer file, extract every `setValue` / `setValues` / `getRange(...).setValue` call. Two flavors:

1. **Indexed writes** — `sheet.getRange(row, col, h, w).setValues(matrix)` where `col` is a literal or named constant. The detector parses the `col` arg + `matrix` shape (rows × cols) to compute the writer's expected column range.
2. **Header-driven writes** — `sheet.getRange(row, headerCol_('FieldName')).setValue(v)` or via `findCol_()` helper. Detector parses the field-name string literal and matches it against SCHEMA_HEADERS.

For each writer, compare expected col positions against `schemas/SCHEMA_HEADERS.md` for the target sheet. Flag any divergence:
- **Type 1 — Out-of-range write.** Writer's max col index > sheet's `getLastColumn()`. Hard error; would silently extend the sheet schema or fail.
- **Type 2 — Field-name mismatch.** Header-driven writer references a field name not present in current headers (e.g. `findCol_('SuggestedJournalist')` but headers don't have that col).
- **Type 3 — Position drift.** Indexed writer expects col N to be `Foo` but live header at col N is `Bar`. The S201 case.
- **Type 4 — Schema-shrunk writer.** Writer references col N but sheet has fewer cols (sheet got slim, writer didn't). The Storyline_Intake / Citizen_Usage_Intake case (HEAT_MAP S202 audit found these).

**Output shape:** Adds entries to `output/production_log_run_cycle_c<XX>_gaps.md` under a new section, severity rules:
- **HIGH:** any Type 1, 3, 4 (silent data corruption).
- **MED:** any Type 2 (writer references non-existent field — write may no-op silently or throw depending on helper).
- **LOW:** Writer references a header that exists but in a position that suggests recent schema change (e.g. col moved between regens) — historical-drift signal, not currently broken.

**Terminal:** engine-sheet — script-heavy detector + V2 class slot in engineCycleAudit. Research-build for the class-taxonomy decision (does this become a 9th class or a sub-class under writeback-drift) and any rule update.

**Acceptance criteria:**
1. `scripts/engineCycleAudit.js` gains a new V2 detector that takes 2 inputs (repo writer set + SCHEMA_HEADERS regen) and produces typed gap entries. No cycle dependency — runs against current repo state, flags anything stale.
2. Detector runs as part of /run-cycle §Step 6 alongside V1 classes. Output threaded into the existing gap-log file format.
3. Self-test: run against C93 repo state with **prior** SCHEMA_HEADERS (pre-S201 regen, pre-Story_Seed_Deck schema fix). Expected: detector should have caught the Story_Seed_Deck/Story_Hook_Deck drift had it existed S192. Validates the detector would have prevented the original incident.
4. Run against current C93 state with current SCHEMA_HEADERS regen. Expected: 0 HIGH gaps (S201 cleanup already shipped). Any HIGH that surfaces is a real find.
5. Documented in /run-cycle SKILL.md §Step 6 alongside V1 detector list.

---

## Phase 1 — Design grill (open questions for Mike)

### Q1 — Class taxonomy: 9th class or sub-class?

The existing 8-class taxonomy in `engineCycleAudit.js` is engine-cycle-fitted (phase-skip, cohort-collision, etc. all describe per-cycle runtime symptoms). `header-drift` is structural — repo state vs sheet state, not a cycle-time symptom. Two paths:

- **(a) New 9th class `header-drift`.** Cleaner semantics; structural class sits alongside runtime classes. Cost: taxonomy bloat, every gap-log consumer learns a new class.
- **(b) Sub-class under `writeback-drift`.** `writeback-drift` already covers "sheet write didn't persist"; this is "sheet write persisted to wrong column" — adjacent. Less new surface area; cost: writeback-drift sub-types blur the original meaning (it was specifically about cohort-C collisions where Phase 10 commit clobbered earlier writes — a different mechanism).

**Recommendation (held for grill):** (a) — new class, because the detector's input is the repo, not the cycle output. Putting structural detection under a runtime class hides where to look for it.

### Q2 — Detection scope: all 38 writer files, or ranked subset?

Phase 40.3 Path 1 audit (S156) listed 38 documented direct-write exceptions across 11 phases + utilities. Some writers are append-only with timestamp + 1-2 cols (`Civic_Sweep_Report`); other writers do full-row schema-aware writes (`commitSimulationLedger`, `saveV3Seeds`). The S201 incident was in the second class.

- **(a) All 38.** Fully covered, but most writers will return empty for the detector — overhead without finds.
- **(b) Schema-aware writers only.** Filter to writers that do header-driven `findCol_()` or full-row matrix writes. Roughly the 12-15 files with the most complex schema. Cost: judgment call on the cutoff.
- **(c) Active-cycle writers only.** Only writers that fired in the most recent cycle (cross-ref against `Engine_Errors` + ledger row deltas).

**Recommendation (held for grill):** (b) — schema-aware writers. The S201 class is structural; an append-only writer with no field-name resolution can't drift in this way.

### Q3 — Self-test: how do we synthesize prior SCHEMA_HEADERS state?

Acceptance criterion 3 calls for running the detector against pre-S201 schema state. SCHEMA_HEADERS regen runs from Apps Script (utilities/exportSchemaHeaders.js) and lives in git history. Three paths:

- **(a) Git-checkout pre-S201 SCHEMA_HEADERS, run detector at HEAD.** Real test — detector runs against pre-fix sheet state with current code (which would have the S201 drift in code form too — except S201 also fixed the writer side, so... mismatch).
- **(b) Construct a synthetic pre-S201 SCHEMA snippet just for the affected sheets.** Hand-build the prior shape (19-col Story_Seed_Deck) for the test fixture.
- **(c) Skip the self-test, validate forward-only on next real drift.** Cost: no validation that the detector would have caught S201; risk: detector may have a blind spot we don't notice until the next drift.

**Recommendation (held for grill):** (b) — synthetic fixture. Cheapest, deterministic, doesn't depend on git archaeology being clean.

### Q4 — Helper-function coverage: how do we parse `findCol_('FieldName')` reliably?

The detector needs to extract field-name string literals from helper-call sites. Most writers use a small set of helpers (`findCol_`, `headerCol_`, ad-hoc `headers.indexOf('FieldName')`). Some compute field names dynamically (loop over a const array). Static parsing handles the literal case; the dynamic case needs runtime introspection or a const-table lookup.

- **(a) Literal-only.** Simple regex over `find...Col_\(['"](.+?)['"]\)` patterns. Covers ~80% of writers; misses the dynamic ones (mediaRoomIntake, processAdvancementIntake batch writers).
- **(b) AST parse with const-table follow.** Use `acorn` or `esprima` to parse JS, resolve const-array references, extract the full field-name set. Higher accuracy; cost: dep + parser maintenance.
- **(c) Manual annotation.** Add a comment marker `// HEADERS: ['Foo', 'Bar']` to each writer that the detector greps. Cost: writer-author discipline.

**Recommendation (held for grill):** (a) literal-only for V2 ship; flag dynamic-writer cases as INFO with reason "dynamic field-name resolution; manual review". Iterate to (b) if blind spots accumulate.

### Q5 — Cadence: per-cycle or per-commit?

Header drift is a slow class — it doesn't change unless someone edits a writer or the sheet schema. Running the detector every cycle is overkill; running only post-commit may miss sheet-side changes (Mike or another agent edits a sheet directly).

- **(a) Per-cycle (alongside V1 classes in §Step 6).** Consistent cadence; finds drift fast. Cost: ~38 file reads per cycle for likely-no-finds.
- **(b) Per-commit hook (engine-sheet pre-push).** Catches writer-side drift at commit time; doesn't catch sheet-side drift unless paired with a regen-then-detect step.
- **(c) On-demand only (`/header-drift-check`).** Manual invocation; lowest overhead; cost: drift accumulates between checks.

**Recommendation (held for grill):** (a) per-cycle. The detector is cheap (file reads + string parse), and the cycle is the natural integration point with the rest of the gap-log surface.

---

## Phase 2 — Build (engine-sheet) — DEFERRED until Phase 1 grill closes

Tasks below are placeholders pending grill answers.

### Task 2.1: Add `header-drift` class (or sub-class) to engineCycleAudit.js

- **Files:** `scripts/engineCycleAudit.js` — modify
- **Status:** [ ] blocked on Q1
- Add detector function reading from writer-set + SCHEMA_HEADERS regen
- Severity rules per Type 1-4 above
- Output entries follow existing G-EC{N} numbering scheme

### Task 2.2: Define writer-set scope

- **Files:** `scripts/engineCycleAudit.js` (writer-set constant)
- **Status:** [ ] blocked on Q2
- Source: engine.md documented direct-write exceptions
- Filter per Q2 outcome

### Task 2.3: Self-test fixture

- **Files:** `scripts/engineCycleAudit.test.js` (new) or inline test in detector
- **Status:** [ ] blocked on Q3
- Synthesize pre-S201 schema for Story_Seed_Deck / Story_Hook_Deck
- Run detector; assert it produces HIGH-severity entries for the known drift
- Run detector with current SCHEMA_HEADERS; assert 0 HIGH

### Task 2.4: Field-name extraction

- **Files:** `scripts/engineCycleAudit.js` (helper)
- **Status:** [ ] blocked on Q4
- Per Q4 outcome: regex / AST / manual annotation

### Task 2.5: SKILL.md wiring

- **Files:** `.claude/skills/run-cycle/SKILL.md`
- **Status:** [ ] blocked on Q5 + parent class taxonomy decision
- Add detector to §Step 6 listing
- Update class taxonomy listing if Q1 = (a)

---

## Phase 3 — Validation (engine-sheet)

### Task 3.1: First C94 (or later) run produces 0 HIGH header-drift findings

- **Status:** [ ] not started
- Validates current state is clean post-S201
- Any HIGH that surfaces is a real find (file ROLLOUT entry + ENGINE_REPAIR row)

### Task 3.2: Plant a synthetic drift, confirm detector catches it

- **Status:** [ ] not started
- Test in branch: rename a header in a non-prod sheet, run detector, confirm HIGH entry produced
- Revert; merge nothing

---

## Open questions

All five are Phase 1 grill items above. Hold pending Mike review.

---

## Changelog

- 2026-05-05 — Initial draft (S202). Triggered by LEDGER_HEAT_MAP §Dead Column Inventory + §Column Cleanup Roadmap re-audit (S202 audit pass) which surfaced the structural drift class as a recurring pattern (S201 Story_Seed_Deck/Story_Hook_Deck case + S202-found Storyline_Intake/Citizen_Usage_Intake schema-shrink with no writer update). 5 open questions for grill. Status: DRAFT.
