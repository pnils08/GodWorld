---
title: governance.14 — EDITION_PIPELINE.md rewrite + skill spec corrections (C12 cluster)
created: 2026-05-24
updated: 2026-05-24
type: plan
tags: [governance, edition-pipeline, active]
sources:
  - "[[../engine/ROLLOUT_PLAN]] §governance.14"
  - "[[../plans/2026-05-22-c94-gap-log-triage]] §3 C12"
  - "output/edition_pipeline_doc_gaps_c94.md G-EPD1/2/3/4/5/6"
  - "output/production_log_run_cycle_c94_gaps.md G-RC1/3/4/5"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — governance.14 row + follow-up rows filed at T11"
  - "[[../EDITION_PIPELINE]] — target of T1-T4 rewrites"
  - "[[../canon/CANON_RULES]] §Corrections-Forward Maps — precedent shape for the new convention-record-vs-implementation split"
  - "[[index]] — register plan + new template same commit"
---

# governance.14 — EDITION_PIPELINE.md rewrite + skill spec corrections Plan

**Goal:** Close C94 gap-log cluster C12 (10 named items: G-EPD1/2/3/4/5/6 + G-RC1/3/4/5) by rewriting EDITION_PIPELINE.md doc + 4 skill spec corrections + new production_log_template.md, then filing per-skill production-log convention cascade as a follow-up ROLLOUT row.

**Architecture:** EDITION_PIPELINE.md has drifted from current pipeline reality (per-terminal production-log convention encoded as canonical when C93 corrected to unified; Master Chain has no terminal tags; /city-hall-prep inputs missing; no production-log lifecycle section; no template). Three pre-flight + run-cycle + pre-mortem skill specs carry parallel drift (frontmatter mis-tagged media when work is engine-sheet substrate; pre-flight enum hard-coded against engine that has expanded; pre-mortem registry line-number-keyed against files that refactor). This plan corrects the doc record (governance.14 scope) + ships the template + fixes the 3 skill specs. **Per-skill production-log path cascade (5-7 skills reading/writing the unified path) is OUT OF SCOPE per advisor scope-cut** — filed as separate follow-up ROLLOUT row in T11 for engine-sheet/civic terminals to execute against this doc's recorded convention.

**Terminal:** research-build (entire plan — single session)

**Pointers:**
- Parent ROLLOUT row: `governance.14` in [[../engine/ROLLOUT_PLAN]]
- Cluster triage: [[../plans/2026-05-22-c94-gap-log-triage]] §3 C12
- Source gap logs: `output/edition_pipeline_doc_gaps_c94.md` (G-EPD1-6) + `output/production_log_run_cycle_c94_gaps.md` (G-RC1/3/4/5)
- Prior pattern precedent: canon.2 S218 corrections-forward map (records target state in doc; per-domain implementation cascades separately)

**Mike rulings (S230, locked pre-plan-write):**
- G-RC3 /pre-flight enum check: **drop entirely** — engine-side `applyTrackerUpdates.js` validator owns phase validation; pre-flight's role is empty/required-field checks not enum policing.
- G-EPD6 production_log_template.md shape: **single overall template with per-skill section subtemplates inline** — top-of-file = cycle-header + carry-forward + tracker snapshot + closing-block conventions; per-skill sub-sections (city-hall-prep / city-hall / sift / write-edition / post-publish) live inside as named sub-blocks.

**Out of scope (advisor scope-cuts):**
- G-EPD8 boot-conditioning Phase 2 residual (journal-cadence / SESSION_CONTEXT visual-demote / boot-greeting sensory rewrite) — routes to `governance.12` Supermemory profile leverage per gap-log §Status. governance.14 stays pipeline-doc + skill-spec only.
- Per-skill production-log path cascade implementation (5-7 skills audit + update) — governance.14 records the unified convention as **target state**; T11 files follow-up row for engine-sheet/civic to execute. C94 reverted to per-terminal split (production_log_edition_c94.md + production_log_city_hall_c94_*.md both exist) so doc must be explicit "going forward, not current behavior."

**Acceptance criteria:**

1. EDITION_PIPELINE.md updated: Master Chain has inline `[terminal]` tags (G-EPD1); §Architecture table + §Key Principles record unified production-log convention as target state with explicit "going forward" framing + C94-reverted note (G-EPD3 doc-record half); new §Production Log Lifecycle section (G-EPD4); §Inputs table includes /city-hall-prep prior-cycle civic log path (G-EPD2 + G-EPD5).
2. `docs/media/production_log_template.md` (NEW) written with single-file shape: top conventions + per-skill sub-section templates inline. Registered in `docs/index.md` same commit (S147). Back-linked from EDITION_PIPELINE.md new §Production Log Lifecycle section.
3. `.claude/rules/newsroom.md` `paths:` array — `.claude/skills/run-cycle/**` + `.claude/skills/pre-flight/**` REMOVED (G-RC1 part 1 — these aren't EIC work).
4. `.claude/rules/engine.md` `paths:` array — `.claude/skills/run-cycle/**` + `.claude/skills/pre-flight/**` ADDED (G-RC1 part 2 — these ARE substrate work; engineer-for-all-life bag is correct match).
5. `.claude/skills/run-cycle/SKILL.md` + `.claude/skills/pre-flight/SKILL.md` frontmatter `tags: [media, active]` → `[engine-sheet, active]` (G-RC1 part 3 — cosmetic correctness; auto-load mechanism is paths arrays per T6-T7, not tags).
6. `.claude/skills/pre-flight/SKILL.md` Step 5 enum check DROPPED (G-RC3 — per Mike S230 ruling); skill text references engine-side `applyTrackerUpdates.js` as enum owner. New §Placeholder Convention section added (G-RC4) distinguishing placeholder rows (ID-only → INFO, skip) from partial-real (ID + Name + missing engine-critical → NOT READY) from sheet-bloat tails (INFO, ignore).
7. `.claude/skills/pre-mortem/SKILL.md` §1 acknowledged-sites registry rekeyed line-number → function-name (G-RC5): `civicInitiativeEngine.js#runManualVote_`, `citizenContextBuilder.js#getCitizensForQuotes`, `generateChicagoCitizensv1.js#testChicagoCitizenGeneration_`. Replaces line-number citations with grep-friendly function names that survive refactors.
8. Follow-up ROLLOUT row filed: `pipeline.32` (or equivalent group) for per-skill production-log path cascade execution (5-7 skills: /city-hall-prep + /city-hall + /sift + /write-edition + /post-publish + possibly /run-cycle + /pre-flight production-log writes). Tagged for engine-sheet/civic execution against the convention recorded by this plan.
9. governance.14 ROLLOUT row state flipped `ready` → `done-pending-archive` with inline close notes citing all 10 closed gap items + the 2 follow-up rows filed.
10. All cross-references valid: governance.14 plan + production_log_template.md both registered in `docs/index.md`; back-links from EDITION_PIPELINE.md section anchors land correctly.

---

## Tasks

### Task 1: EDITION_PIPELINE.md §Master Chain — inline `[terminal]` tags (G-EPD1)

- **Files:**
  - `docs/EDITION_PIPELINE.md` — modify (§Master Chain lines 20-50)
- **Steps:**
  1. Locate §Master Chain section.
  2. For each skill in the chain diagram, append inline tag after the skill name: `/run-cycle [engine-sheet]`, `/pre-flight [engine-sheet]`, `/pre-mortem [engine-sheet]`, GAS cycle `[engine-sheet]`, `/engine-review [engine-sheet]`, `/build-world-summary [engine-sheet]`, `/city-hall-prep [civic]`, `/city-hall [civic]`, `/sift [media]`, `/write-edition [media]`, `/post-publish [media]`.
  3. Add a one-line note at the top of §Master Chain: "Terminal tags are inline; §Architecture table at top of doc still lists terminal-to-skill mapping authoritatively for cross-reference."
- **Verify:** `grep -n "\[engine-sheet\]\|\[civic\]\|\[media\]" docs/EDITION_PIPELINE.md` → 11+ terminal-tag hits in Master Chain region.
- **Status:** [x] DONE S230

### Task 2: EDITION_PIPELINE.md §Architecture table + §Key Principles — unified production-log convention as TARGET STATE (G-EPD3 doc-record)

- **Files:**
  - `docs/EDITION_PIPELINE.md` — modify (§Architecture table lines 7-18; §Key Principles line ~366)
- **Steps:**
  1. Locate §Architecture table. Replace any per-terminal production-log path columns (e.g., civic gets `production_log_city_hall_c<XX>.md`; media gets `production_log_edition_c<XX>.md`) with single unified path `output/production_log_c<XX>.md` for ALL terminals/stages.
  2. Add a note column or footer line: "**Target convention** — one log per cycle, every skill appends. C93 implemented; C94 reverted to per-terminal split (transitional). Per-skill path audits filed as `pipeline.32` follow-up; this doc records the convention."
  3. Locate §Key Principles section. Find the line "One production log per terminal. Civic has its own. Media skills all append to one." (line ~366 per gap log).
  4. Replace with: "**One production log per cycle.** Every skill appends its section. The log persists from /city-hall-prep through /post-publish at `output/production_log_c<XX>.md`. **Target convention** (C93 implemented; C94 reverted to per-terminal split — per-skill path audit cascade filed as `pipeline.32`)."
- **Verify:** `grep -n "production_log_c<\|production_log_c{\|One production log per cycle" docs/EDITION_PIPELINE.md` → unified path + new principle line present.
- **Status:** [x] DONE S230

### Task 3: EDITION_PIPELINE.md — new §Production Log Lifecycle section (G-EPD4)

- **Files:**
  - `docs/EDITION_PIPELINE.md` — modify (insert new section between existing §Key Principles and §Skill Files, or wherever fits)
- **Steps:**
  1. Insert new top-level section §Production Log Lifecycle after §Key Principles.
  2. Section content: (a) Open — /city-hall-prep opens the log at cycle start with cycle-header + carry-forward + tracker snapshot. (b) Append — every subsequent skill (/city-hall, /sift, /write-edition, /post-publish) appends its named section. (c) Close — /post-publish writes the closing block with edition Drive ID + bay-tribune ingest doc IDs + world-data ingest summary + ratings applied. (d) Per-skill section header convention: `## <skill-name> (S<NNN>) — <YYYY-MM-DD HH:MM>` (matches existing convention from C93). (e) Path: `output/production_log_c<XX>.md` (unified per §Architecture + §Key Principles).
  3. Cross-reference at end: "See `docs/media/production_log_template.md` for full per-section template + field conventions."
- **Verify:** `grep -nE "^## Production Log Lifecycle" docs/EDITION_PIPELINE.md` → section present.
- **Status:** [x] DONE S230

### Task 4: EDITION_PIPELINE.md §Inputs table — /city-hall-prep prior-cycle log inputs (G-EPD2 + G-EPD5)

- **Files:**
  - `docs/EDITION_PIPELINE.md` — modify (§Inputs table lines 285-300)
- **Steps:**
  1. Locate §Inputs table.
  2. Add row for /city-hall-prep prior-cycle inputs: `Prior-cycle production log | /post-publish (closes prior log) | /city-hall-prep Step 1 (civic continuity carry-forward)` — path `output/production_log_c<XX-1>.md`.
  3. If the table currently has /city-hall-prep listed only with world-summary + engine-review + sheets inputs, augment with the prior-cycle log row.
  4. Add inline note: "Per /city-hall-prep `--type civic-continuity` reads from the unified prior-cycle log (per §Production Log Lifecycle). Pre-S230 per-terminal split path `production_log_city_hall_c<XX-1>.md` is DEPRECATED."
- **Verify:** `grep -n "Prior-cycle production log\|city-hall-prep" docs/EDITION_PIPELINE.md` → input row present.
- **Status:** [x] DONE S230

### Task 5: Write `docs/media/production_log_template.md` (G-EPD6)

- **Files:**
  - `docs/media/production_log_template.md` — create
  - `docs/index.md` — modify (register new template)
- **Steps:**
  1. Write single-file template per Mike S230 ruling: top-section (cycle-header + gap-log sidecar list + carry-forward table + tracker snapshot + approval ratings snapshot) + per-skill section subtemplates inline (city-hall-prep / city-hall / sift / write-edition / post-publish) + closing-block convention.
  2. Each per-skill sub-section template = section header pattern + inputs read list + outputs written list + key decisions/interventions field + handoff-to-next field.
  3. Frontmatter per `docs/media/brief_template.md` shape: title / created / updated / type=reference / tags=[media, edition-pipeline, active] / sources / pointers.
  4. Register in `docs/index.md` under `## docs/media/` section per §Criteria block (S147 same-commit inbound-link rule).
- **Verify:** `ls -la docs/media/production_log_template.md && grep -n "production_log_template" docs/index.md` → file exists + index entry present.
- **Status:** [x] DONE S230

### Task 6: newsroom.md `paths:` array — REMOVE run-cycle + pre-flight (G-RC1 part 1)

- **Files:**
  - `.claude/rules/newsroom.md` — modify (frontmatter paths array, lines 41-42)
- **Steps:**
  1. Open frontmatter `paths:` array.
  2. Remove these two lines:
     ```yaml
     - ".claude/skills/run-cycle/**"
     - ".claude/skills/pre-flight/**"
     ```
  3. Auto-load mechanism: when /run-cycle or /pre-flight skill files load, newsroom.md will no longer auto-load (EIC bag was wrong match for substrate orchestration work per G-RC1 diagnosis).
- **Verify:** `grep -n "run-cycle\|pre-flight" .claude/rules/newsroom.md` → no matches in paths array.
- **Status:** [x] DONE S230

### Task 7: engine.md `paths:` array — ADD run-cycle + pre-flight (G-RC1 part 2)

- **Files:**
  - `.claude/rules/engine.md` — modify (frontmatter paths array, lines 2-5)
- **Steps:**
  1. Open frontmatter `paths:` array.
  2. Add these two lines:
     ```yaml
     - ".claude/skills/run-cycle/**"
     - ".claude/skills/pre-flight/**"
     ```
  3. Auto-load mechanism: substrate-steward bag (engine.md) will now load when /run-cycle or /pre-flight skill files load. Correct skill bag per G-RC1 diagnosis — these are substrate orchestration, not EIC work.
- **Verify:** `grep -n "run-cycle\|pre-flight" .claude/rules/engine.md` → both lines present in paths array.
- **Status:** [x] DONE S230

### Task 8: run-cycle + pre-flight SKILL.md frontmatter retag (G-RC1 part 3)

- **Files:**
  - `.claude/skills/run-cycle/SKILL.md` — modify (frontmatter line 6)
  - `.claude/skills/pre-flight/SKILL.md` — modify (frontmatter line 6)
- **Steps:**
  1. Update `.claude/skills/run-cycle/SKILL.md` frontmatter: `tags: [media, active]` → `tags: [engine-sheet, active]`.
  2. Update `.claude/skills/pre-flight/SKILL.md` frontmatter: `tags: [media, active]` → `tags: [engine-sheet, active]`.
  3. Also bump `updated:` to `2026-05-24` on both.
  4. Cosmetic correctness only — auto-load mechanism is the paths arrays per T6 + T7.
- **Verify:** `grep -nE "^tags:" .claude/skills/run-cycle/SKILL.md .claude/skills/pre-flight/SKILL.md` → both show `[engine-sheet, active]`.
- **Status:** [x] DONE S230

### Task 9: /pre-flight SKILL.md — DROP enum check (G-RC3) + add Placeholder Convention (G-RC4)

- **Files:**
  - `.claude/skills/pre-flight/SKILL.md` — modify (Step 5 enum block + new §Placeholder Convention)
- **Steps:**
  1. Locate Step 5 ImplementationPhase enum block (per G-RC3 source ref: `.claude/skills/pre-flight/SKILL.md` §Step 5).
  2. Remove the hardcoded enum list (announced / vote-scheduled / visioning / etc.). Replace with: "ImplementationPhase enum policing has moved to engine-side `applyTrackerUpdates.js` validator (per Mike S230 ruling, canon.3-class scope discipline — pre-flight's role is empty/required-field checks, not enum policing). Pre-flight no longer enforces ImplementationPhase value list; trust engine writer validation."
  3. Add new §Placeholder Convention section after Step 5 (per G-RC4):
     - Three row classes:
       - **Placeholder rows** — only InitiativeID populated, slot reserved → WARN, skip, don't block (INFO severity).
       - **Partial-real rows** — InitiativeID + Name + some fields populated, but missing engine-critical (Status/Phase) → NOT READY (HIGH severity).
       - **Fully empty rows past last real row** — sheet bloat → INFO, ignore.
     - Decision tree: check (InitiativeID present + Name present + (Status OR Phase present)) → if all true classify as real; if only InitiativeID classify as placeholder; if zero columns classify as bloat.
- **Verify:** `grep -n "applyTrackerUpdates\|Placeholder Convention\|placeholder" .claude/skills/pre-flight/SKILL.md` → enum removal note + Placeholder Convention section present.
- **Status:** [x] DONE S230

### Task 10: /pre-mortem SKILL.md §1 registry rekey (G-RC5)

- **Files:**
  - `.claude/skills/pre-mortem/SKILL.md` — modify (§1 acknowledged-sites registry)
- **Steps:**
  1. Locate §1 registry.
  2. Replace line-number-keyed entries:
     - `civicInitiativeEngine.js:2009` → `civicInitiativeEngine.js#runManualVote_`
     - `citizenContextBuilder.js:1068` → `citizenContextBuilder.js#getCitizensForQuotes`
     - `generateChicagoCitizensv1.js:433` → `generateChicagoCitizensv1.js#testChicagoCitizenGeneration_`
  3. Add inline note: "Registry keyed by function name (not line number) per G-RC5 — line numbers drift on every refactor; function names are stable identifiers. Grep with `grep -nE 'function (<funcName>|<funcName>)' <file>` to find current location."
- **Verify:** `grep -n "runManualVote_\|getCitizensForQuotes\|testChicagoCitizenGeneration_" .claude/skills/pre-mortem/SKILL.md` → all 3 function-name entries present.
- **Status:** [x] DONE S230

### Task 11: File follow-up ROLLOUT row + register plan + flip governance.14

- **Files:**
  - `docs/engine/ROLLOUT_PLAN.md` — modify (file new pipeline.32 row + flip governance.14 state)
  - `docs/index.md` — modify (register governance.14 plan if not already done at T5)
- **Steps:**
  1. File new ROLLOUT row in pipeline.* group: `pipeline.32` — Per-skill production-log path cascade execution (G-EPD3 implementation half). Scope: 5-7 skills (/city-hall-prep + /city-hall + /sift + /write-edition + /post-publish) read/write `output/production_log_c<XX>.md` unified path; current C94 reverted to per-terminal split (production_log_edition_c94.md + production_log_city_hall_c94_*.md both exist). Tag for engine-sheet/civic execution against the convention recorded by governance.14 / EDITION_PIPELINE.md §Production Log Lifecycle. State `ready`. Pointer: governance.14 plan + EDITION_PIPELINE.md §Production Log Lifecycle.
  2. Flip governance.14 row state `ready` → `done-pending-archive` with inline close notes citing T1-T10 deliverables + the pipeline.32 follow-up filed + the 2 Mike rulings applied + advisor scope-cuts honored (G-EPD8 dropped, per-skill cascade split).
  3. Register governance.14 plan + production_log_template.md in `docs/index.md` (if T5 didn't already cover both).
- **Verify:** `grep -nE "^\| pipeline\.32 \|^\| governance\.14 \|" docs/engine/ROLLOUT_PLAN.md` → pipeline.32 row exists + governance.14 row state=done-pending-archive; `grep -n "governance-14-edition-pipeline-rewrite\|production_log_template" docs/index.md` → both registered.
- **Status:** [x] DONE S230

---

## Open questions

*(All resolved pre-write per Mike S230 rulings + advisor scope-cuts. None remaining.)*

---

## Changelog

- 2026-05-24 — Initial draft (S230, research-build). Advisor consulted pre-write — 4 scope-shrinks applied (G-EPD8 dropped to governance.12; G-EPD3 split doc-record from skill cascade; doc explicit "target state going forward" not current; G-RC1 verified 3-part fix). 2 Mike rulings locked pre-write (G-RC3 drop enum entirely; G-EPD6 single template with inline per-skill sub-blocks). 11 tasks execute same session.
