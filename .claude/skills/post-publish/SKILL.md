---
name: post-publish
description: Close the feedback loop. Canonize to Supermemory, update world-data, write ratings to sheets, grade reporters, update criteria files, update newsroom memory. Type-aware — edition, interview, supplemental, dispatch all converge here.
version: "1.1"
updated: 2026-04-26
tags: [media, active]
effort: high
argument-hint: "[--type edition|interview|supplemental|dispatch] [--cycle XX] [--source <path>]"
---

# /post-publish — Feedback Loop Closer

## Purpose

The published artifact is canon-on-disk but not yet canon-in-memory. This skill canonizes it (bay-tribune, world-data), writes feedback (sheets, grades), and updates the files that train future cycles.

Everything this skill does makes the next cycle smarter than the last one.

**This is the convergence point** for editions and non-editions. `/write-edition`, `/interview`, `/dispatch`, `/write-supplemental` all converge here via `--type`. The format contract ([[EDITION_PIPELINE]] §Published `.txt` Format Contract) is the API: every type emits the same `.txt` shape, and post-publish reads from that uniformly.

These steps are base concepts. Each cycle exposes new gaps — a new ingest need, a feedback source we didn't account for, a step that needs splitting or combining. Evaluate after every run and update. Not done — compounding.

This is currently a teamwork skill — Mags and Mike walk through it together. As steps prove reliable, they automate one at a time.

## Usage

`/post-publish --type <type> --cycle <XX> --source <path>`

Flags:
- `--type {edition|interview|supplemental|dispatch}` — defaults to `edition`. Required for non-edition artifacts.
- `--cycle <XX>` — engine cycle number. Required.
- `--source <path>` — path to the published `.txt`. Defaults to `editions/cycle_pulse_<type>_<cycle>_<slug>.txt` for non-edition; `editions/cycle_pulse_edition_<cycle>.txt` for edition.
- `--skip-<name>` — explicit opt-out for any substep that the type matrix marks ✓. Silent omission of a ✓ substep is a skill failure.

### Per-type substep matrix

| Step | edition | interview | supplemental | dispatch |
|------|---------|-----------|--------------|----------|
| 1a wiki ingest | ✓ | ✓ | ✓ | ✓ |
| 1b text ingest | ✓ | ✓ (article + transcript) | ✓ | ✓ |
| 2a citizen cards | ✓ | ✓ | ✓ | ✓ |
| 2b new businesses | ✓ | ✓ | ✓ | ✓ |
| 2c world summary | ✓ | — | — | — |
| 3 civic wiki | ✓ (when built) | — | — | — |
| 4 coverage ratings | ✓ | — (C93-gated) | — (C93-gated) | — (C93-gated) |
| 5 citizen+business intake | ✓ (engine-pending) | ✓ (engine-pending) | ✓ (engine-pending) | ✓ (engine-pending) |
| 6 grade | ✓ | — | — | — |
| 7 grade history | ✓ | — | — | — |
| 8 exemplars | ✓ | — | — | — |
| 9 newsroom memory | ✓ | ✓ | ✓ | ✓ |
| 10 criteria files | ✓ | — | — | — |
| 11 filing + bot | ✓ | ✓ | ✓ | ✓ |
| 12 production log | ✓ | ✓ | ✓ | ✓ |
| 13 checklist | ✓ | ✓ | ✓ | ✓ |

`—` = skipped by default for that type (no flag needed; declared by the matrix).
C93-gated = skipped pending the C93 observation outcome (plan [[plans/2026-04-26-non-edition-publishing-pipeline]] T8). The `--skip-<name>` flag is only required to opt out of substeps the matrix marks ✓ for the chosen type.

## Prerequisites

Verify these exist before starting (path varies by `--type`):

- `<source>` — published `.txt` (the canonical artifact)
- `output/production_log_edition_c{XX}.md` — completed production log (shared by all media types)
- `output/world_summary_c{XX}.md` — world summary
- `output/production_log_city_hall_c{XX}.md` — city-hall production log (`--type edition` only)

For `--type interview`: companion transcript at `editions/cycle_pulse_interview-transcript_{XX}_<slug>.txt`.

## Steps

### Step 1: Bay-Tribune Ingest — Canon

**1a. Wiki ingest — per-entity records (PRIMARY)**
```bash
node scripts/ingestEditionWiki.js <source> --type <type> --apply
```
Extracts per-citizen, per-initiative, per-business, per-storyline records from the standardized sections (NAMES INDEX, BUSINESSES NAMED) into bay-tribune. Each entity gets its own searchable record. Log entity count.

**Verification gate:** stdout reports entity count ≥ 1 OR explicit "0 entities — body had no named citizens/businesses" (acceptable for pure-atmosphere dispatches). Fail otherwise.

Review: spot-check 2-3 records against the article body.

**1b. Text ingest (BACKUP)**
```bash
node scripts/ingestEdition.js <source> --type <type> --cycle <XX>
```
Full text chunked to bay-tribune. Wiki records rank higher for entity searches; text chunks are backup for full-text queries. Log doc IDs.

For `--type interview`: re-run for the companion transcript:
```bash
node scripts/ingestEdition.js editions/cycle_pulse_interview-transcript_{XX}_<slug>.txt --type interview-transcript --cycle <XX>
```

**Verification gate:** bay-tribune doc ID returned (single ID for non-interview, two for interview). Fail if the API call returns no ID or an error string.

**Note:** Podcast runs AFTER post-publish as a separate creative process. Podcast handles its own bay-tribune ingest.

### Step 2: World-Data Updates — City State

**2a. Refresh citizen cards**
```bash
node scripts/buildCitizenCards.js
```
Citizens who appeared get updated profiles in world-data. New citizens get cards built. Verify new citizens have gender from ledger.

**Verification gate:** stdout reports refreshed/created card count ≥ 1 when NAMES INDEX is non-empty. If NAMES INDEX is empty (some dispatches), gate is met by stdout "0 citizens to refresh — empty NAMES INDEX."

**2b. New businesses**
If BUSINESSES NAMED contains rows tagged `NEW`, flag them for the engine-sheet intake build (rollout item — `ingestBusinessesNamed.js`). Until that script lands, log the rows here for the next engine session to pick up.

**Verification gate:** BUSINESSES NAMED parsed; NEW rows (if any) logged to production log Step 12.

**2c. World summary ingest** (`--type edition` only)
```bash
npx supermemory add "$(cat output/world_summary_c{XX}.md)" --tag world-data --metadata '{"type": "cycle_summary", "cycle": <XX>}'
```
World summary is per-cycle, not per-artifact. Non-edition types skip this without flag.

**Verification gate:** doc ID returned.

### Step 3: Civic Wiki — Per-Official Records (`--type edition` only)

NOT BUILT. Future: `ingestCivicWiki.js` reads city-hall production log, produces per-official records matching the wiki ingest pattern. Until built, voice decisions live on disk in the city-hall production log and voice JSON files.

**Verification gate:** skipped for non-edition types and edition-when-script-missing. Skip annotated in production log Step 12.

### Step 4: Coverage Ratings to Sheet
```bash
node scripts/rateEditionCoverage.js <source> --type <type> --apply
```

For `--type edition`: per-domain ratings (-5 to +5) written to Edition_Coverage_Ratings sheet. Engine reads these in Phase 2 next cycle — the city reacts to what the newspaper published.

For non-edition types: gated on the C93 observation outcome (plan T8). Default behavior: skip with stdout "non-edition coverage rating gated on C93 observation — see plans/2026-04-26-non-edition-publishing-pipeline.md T8." If the C93 observation determines non-edition coverage is needed, this gate flips to active.

**Verification gate:** edition: sheet row count increased OR stdout reports per-domain rating list. Non-edition: explicit gate-skip message logged.

### Step 5: Citizen + Business Intake to Sheets (NOT WIRED)

New citizens and businesses from the artifact need direct sheet writes to Simulation_Ledger and Business_Ledger via service account. Engine-sheet build pending (rollout item — standing intake `ingestPublishedEntities.js`). Until built, this step logs the citizens/businesses needing intake to the production log for the next engine session.

**Verification gate:** NAMES INDEX + BUSINESSES NAMED rows logged to production log Step 12 with status "pending engine-sheet intake."

### Step 6: Grade Edition (`--type edition` only)
```bash
node scripts/gradeEdition.js <XX>
```
Per-desk and per-reporter grades from edition text + errata + Mara audit.

**Verification gate:** `output/grades/grades_c<XX>.json` written.

### Step 7: Update Grade History (`--type edition` only)
```bash
node scripts/gradeHistory.js
```
Rolling averages (5-edition window), trends, roster recommendations.

**Verification gate:** `output/grades/grade_history.json` mtime updated.

### Step 8: Extract Exemplars (`--type edition` only)
```bash
node scripts/extractExemplars.js <XX>
```
A-grade articles become desk workspace exemplars for future cycles.

**Verification gate:** stdout reports exemplar count ≥ 0; if A-grade articles existed in `grades_c<XX>.json`, exemplar count > 0.

### Step 9: Update Newsroom Memory

Read both production logs as source:
- `output/production_log_edition_c<XX>.md` — story picks, editorial review, what got cut, Mara corrections, Rhea flags
- `output/production_log_city_hall_c<XX>.md` — voice decisions, tracker updates, what was dramatic (`--type edition` only)

Distill into `docs/mags-corliss/NEWSROOM_MEMORY.md`:
- Errata from this artifact (what Mara caught, Rhea caught, Mags caught in review)
- Coverage patterns (which sections ran, which didn't, what was thin)
- Character continuity (which citizens appeared, what was established about them)
- Active arcs (what advanced, opened, closed, was promised)
- Previous artifact summary (so next sift knows what was covered)

**Verification gate:** NEWSROOM_MEMORY.md mtime updated; new section added for this cycle/artifact.

### Step 10: Update Criteria Files (`--type edition` only)

**First run `/skill-check write-edition <XX>`** — grades the skill's run against `docs/media/story_evaluation.md` and writes `output/skill_check_write-edition_c<XX>.json`. That JSON is the main feedback source: its `assertions`, `reviewerOverlap`, and `evalFeedback` tell you exactly which criteria held and which need sharpening.

Read these feedback sources:
- `output/skill_check_write-edition_c<XX>.json` — structural assertion pass/fail + eval-feedback suggestions
- `output/grades/grades_c<XX>.json` — per-reporter scores
- `output/production_log_edition_c<XX>.md` — Mara corrections, Rhea flags, editorial review
- Mike's feedback — capture in conversation

Update each criteria file with specific findings:

**`docs/media/story_evaluation.md`:** which priority signals predicted strong articles, did front-page scoring match the actual best article, weak story indicators to add.

**`docs/media/brief_template.md`:** which briefs produced articles that followed closely, which produced drift, word-count tuning.

**`docs/media/citizen_selection.md`:** any citizen misrepresented (role, neighborhood, gender, history), freshness balance, any reporter invented details contradicting canon.

Pattern from skill-creator eval framework (S141): set assertions, grade each assertion against the actual edition, update criteria with what passed and failed. Over cycles the criteria files become the trained editorial standard.

Each criteria file gets a changelog entry at the bottom:
```
## Changelog
- C<XX>: [what changed] — [why, based on what evidence]
```

**Verification gate:** each of the three criteria files has a new changelog entry dated this cycle.

### Step 11: Filing + Cleanup
```bash
node scripts/postRunFiling.js <XX>
```
Verify all pipeline outputs exist and names are correct.

```bash
pm2 restart mags-bot
```
Discord Mags picks up updated production log and Supermemory canon. No separate edition brief needed — she reads the production log and searches bay-tribune directly.

**Verification gate:** `postRunFiling.js` exit 0 + pm2 reports mags-bot online.

### Step 12: Finalize Production Log — Wiki Pattern

Append a Post-Publish section to `output/production_log_edition_c<XX>.md` with inline Supermemory doc IDs. Each canonized artifact gets a doc ID on its line so next cycle queries the record directly instead of re-reading files.

```markdown
## Post-Publish C<XX> — <TYPE> COMPLETE

### Source
- Artifact: <source path>
- Type: <type>

### Bay-Tribune Ingest
- Wiki entities: {count}
- Article text: {doc ID}
- Transcript text: {doc ID} (interview only)
- Civic wiki: {doc ID} (when 1c is built)

### World-Data Ingest
- World summary: {doc ID} (edition only)
- Citizen cards refreshed: {count}
- New businesses flagged: {count}
- Pending engine-sheet intake: {citizen/business rows}

### Sheet Writes
- Edition_Coverage_Ratings: {domains + ratings written, OR "C93-gated skip" for non-edition}

### Grading (edition only)
- Grades: output/grades/grades_c<XX>.json
- Grade history updated
- Exemplars extracted: {count}

### Criteria Files Updated (edition only)
- story_evaluation.md: {changelog entry added}
- brief_template.md: {changelog entry added}
- citizen_selection.md: {changelog entry added}

### Newsroom Memory
- Updated with errata, coverage patterns, active arcs
```

The doc IDs embedded here are the query keys. Next cycle's sift reads this log first, uses the doc IDs for direct Supermemory queries, never needs to re-parse the artifact text.

**Verification gate:** production log mtime updated; new "Post-Publish C<XX>" section present and matches the type-applicable rows from the matrix.

### Step 13: Completion Checklist

Per-type checklist applicability follows the matrix in §Usage. Edition runs all rows; non-edition types skip the `—` rows.

- [ ] Wiki ingest complete (entity count)
- [ ] Text ingested (doc IDs — two for interview)
- [ ] Citizen cards refreshed
- [ ] World summary ingested (edition only)
- [ ] Civic wiki ingested (NOT BUILT — skip)
- [ ] Coverage ratings written (edition) OR C93-gated skip noted (non-edition)
- [ ] Edition graded (edition only)
- [ ] Grade history updated (edition only)
- [ ] Exemplars extracted (edition only)
- [ ] Newsroom memory updated
- [ ] Criteria files updated (edition only)
- [ ] Filing check passed
- [ ] Discord bot restarted
- [ ] Production log finalized

**Verification gate:** all matrix-✓ rows checked OR an explicit `--skip-<name>` invocation recorded.

## Output

| Output | Feeds into |
|--------|-----------|
| bay-tribune (wiki + text) | Next sift canon search |
| world-data (citizen cards + world summary) | Next sift MCP lookups |
| Edition_Coverage_Ratings sheet | Engine Phase 2 next cycle |
| `output/grades/grades_c<XX>.json` | Next cycle desk workspaces |
| `output/grades/grade_history.json` | Next cycle desk workspaces |
| `output/grade-examples/` | Next cycle desk workspaces |
| `docs/media/story_evaluation.md` | Next sift Step 2 |
| `docs/media/brief_template.md` | Next sift Step 5 |
| `docs/media/citizen_selection.md` | Next sift Step 4 |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Next sift Step 1 |

## Where This Sits

After `/write-edition` (edition path) or after `/interview`, `/dispatch`, `/write-supplemental` (alternate paths). Parallel with `/edition-print`. Closes the loop.

↩ Loop: `/post-publish` writes ratings + updates memory → next `/pre-flight` reads ratings → engine reads them in Phase 2 → next cycle reflects what was published.

## Changelog

- 2026-04-17 — Initial 13-step skill (S156, post-publish formalized).
- 2026-04-26 — v1.1 (S180, research-build). Type-aware: `--type {edition|interview|supplemental|dispatch}` flag added. Per-type substep matrix encodes default skips; `--skip-<name>` required only for matrix-✓ opt-outs. Verification gate declared on every substep. Coverage ratings (Step 4) explicitly C93-gated for non-edition. Convergence point for the unified non-edition publishing pipeline (plan [[plans/2026-04-26-non-edition-publishing-pipeline]] T3).
