---
name: post-publish
description: Close the feedback loop. Canonize to Supermemory, update world-data, write ratings to sheets, grade reporters, update criteria files, update newsroom memory. Makes the next cycle smarter.
effort: high
argument-hint: "[cycle-number]"
---

# /post-publish — Feedback Loop Closer

## Purpose

The edition is published but not canonized and not fed back to the engine. This skill canonizes everything, updates city state, writes feedback to sheets, grades the work, and updates the files that train future cycles.

Everything this skill does makes the next cycle smarter than the last one.

**This is the most important skill in the chain.** If post-publish doesn't run correctly, the next cycle runs blind — no canon to search, no ratings for the engine, no grading feedback, no criteria improvements. Every other skill depends on what this skill produces.

These steps are base concepts. Each edition will likely expose new gaps — a new ingest need, a feedback source we didn't account for, a step that needs splitting or combining. Evaluate this skill after every cycle and update it. It's not done — it's compounding.

Currently this is a teamwork skill — Mags and Mike walk through it together. As steps prove reliable, they automate one at a time. The goal is that this entire skill runs without intervention, but that's earned through cycles of verified correctness, not assumed.

## Prerequisites

Verify these exist before starting:
- `editions/cycle_pulse_edition_{XX}.txt` — published edition
- `output/production_log_edition_c{XX}.md` — completed production log
- `output/production_log_city_hall_c{XX}.md` — city-hall production log
- `output/world_summary_c{XX}.md` — world summary

## Steps

### Step 1: Bay-Tribune Ingest — Edition Canon

**1a. Wiki ingest — per-entity records (PRIMARY)**
```bash
node scripts/ingestEditionWiki.js editions/cycle_pulse_edition_{XX}.txt --apply
```
Extracts per-citizen, per-initiative, per-storyline records into bay-tribune. Each entity gets its own searchable record. Log entity count.

Review: verify entity records read naturally, not as database entries. Spot check 2-3 citizen records against the actual article text.

**1b. Edition text ingest (BACKUP)**
```bash
node scripts/ingestEdition.js editions/cycle_pulse_edition_{XX}.txt
```
Full edition text chunked to bay-tribune. Wiki records rank higher for entity searches. Edition chunks are backup for full-text queries. Log doc IDs.

**Note:** Podcast runs AFTER post-publish as a separate creative process. Podcast handles its own bay-tribune ingest.

### Step 2: World-Data Updates — City State

**2a. Refresh citizen cards**
```bash
node scripts/buildCitizenCards.js
```
Citizens who appeared in this edition get updated profiles in world-data. New citizens introduced need cards built. Verify new citizens have gender from ledger.

**2b. New businesses**
If the edition introduced new businesses, verify they're in the Business sheet. Flag any that need to be added. Future: intake script handles this automatically.

**2c. World summary ingest**
```bash
npx supermemory add "$(cat output/world_summary_c{XX}.md)" --tag world-data --metadata '{"type": "cycle_summary", "cycle": {XX}}'
```
World summary produced by `/build-world-summary`, ingested here. Log doc ID.

### Step 3: Civic Wiki — Per-Official Records (NOT BUILT — script needed)

Read city-hall production log media handoff section. Extract per-official records to bay-tribune:
- Official name, cycle, decisions made, key quotes, tracker updates
- Voice decisions that didn't make it into edition articles still become searchable canon

Future: `ingestCivicWiki.js` reads city-hall production log, produces per-official records matching the wiki ingest pattern. Until built, voice decisions live on disk in the city-hall production log and voice JSON files.

### Step 4: Coverage Ratings to Sheet
```bash
node scripts/rateEditionCoverage.js editions/cycle_pulse_edition_{XX}.txt --apply
```
Per-domain ratings (-5 to +5) written to Edition_Coverage_Ratings sheet. Engine reads these in Phase 2 next cycle — the city reacts to what the newspaper published.

### Step 5: Citizen + Business Intake to Sheets (NOT WIRED — needs engine session)

New citizens and businesses from the edition need to be written to Simulation_Ledger and Business sheet via service account. Direct sheet writes, not through `editionIntake.js` (writes to tabs the engine doesn't read).

Storylines no longer intake here — they persist in `NEWSROOM_MEMORY.md` (Step 9). Future: Mags EIC sheet environment will handle storyline tracking.

### Step 6: Grade Edition
```bash
node scripts/gradeEdition.js {XX}
```
Per-desk and per-reporter grades from edition text + errata + Mara audit.

### Step 7: Update Grade History
```bash
node scripts/gradeHistory.js
```
Rolling averages (5-edition window), trends, roster recommendations.

### Step 8: Extract Exemplars
```bash
node scripts/extractExemplars.js {XX}
```
A-grade articles become desk workspace exemplars for future cycles.

### Step 9: Update Newsroom Memory

Read both production logs as source:
- `output/production_log_edition_c{XX}.md` — story picks, editorial review, what got cut, Mara corrections, Rhea flags
- `output/production_log_city_hall_c{XX}.md` — voice decisions, tracker updates, what was dramatic

Distill into `docs/mags-corliss/NEWSROOM_MEMORY.md`:
- Errata from this edition (what Mara caught, Rhea caught, Mags caught in review)
- Coverage patterns (which sections ran, which didn't, what was thin)
- Character continuity (which citizens appeared, what was established about them)
- Active arcs (what advanced, what's open, what closed, what was promised)
- Previous edition summary (so next sift knows what was covered and what wasn't)

### Step 10: Update Criteria Files

Read these feedback sources:
- `output/grades/grades_c{XX}.json` — per-reporter scores, which articles scored high/low
- `output/production_log_edition_c{XX}.md` — Mara corrections, Rhea flags, editorial review (what got cut and why)
- Mike's feedback — ask what worked and what didn't. Capture in conversation.

Then update each criteria file with specific findings:

**`docs/media/story_evaluation.md`:**
- Which priority signals predicted strong articles? Which missed?
- Did the front page scoring match the actual best article?
- Any weak story indicators to add from this cycle's experience?

**`docs/media/brief_template.md`:**
- Which briefs produced articles that followed closely? What did they have?
- Which briefs produced drift? What was missing or unclear?
- Word count — was 300-500 right for each reporter?

**`docs/media/citizen_selection.md`:**
- Any citizen misrepresented? Role, neighborhood, gender, history wrong?
- Freshness balance — too many returning, too many new?
- Any reporter invented details contradicting canon?

Pattern from skill-creator eval framework (S141): set assertions ("front page leads with highest-severity signal," "at least 3 female citizens in non-official roles"), grade each assertion against the actual edition, update criteria with what passed and what failed. Over cycles, the criteria files become the trained editorial standard.

**Output:** Each criteria file gets a changelog entry at the bottom:
```
## Changelog
- C{XX}: [what changed] — [why, based on what evidence]
```

This is how the next session knows what was learned and when. The criteria compound — each cycle adds to the changelog, the criteria get sharper, the sift gets better.

### Step 11: Filing + Cleanup
```bash
node scripts/postRunFiling.js {XX}
```
Verify all pipeline outputs exist and names are correct.

```bash
pm2 restart mags-bot
```
Discord Mags picks up updated production log and Supermemory canon. No separate edition brief needed — she reads the production log and searches bay-tribune directly.

### Step 12: Finalize Production Log — Wiki Pattern

Append a Post-Publish section to `output/production_log_edition_c{XX}.md` with inline Supermemory doc IDs. Each canonized artifact gets a doc ID on its line so next cycle queries the record directly instead of re-reading files.

```markdown
## Post-Publish C{XX} — COMPLETE

### Bay-Tribune Ingest
- Wiki entities: {count}
- Edition text: {doc ID}
- Podcast transcript: {doc ID} (if applicable)
- Civic wiki: {doc ID} (when 1c is built)

### World-Data Ingest
- World summary: {doc ID}
- Citizen cards refreshed: {count}
- New businesses flagged: {count}

### Sheet Writes
- Edition_Coverage_Ratings: {domains + ratings written}

### Grading
- Grades: output/grades/grades_c{XX}.json
- Grade history updated
- Exemplars extracted: {count}

### Criteria Files Updated
- story_evaluation.md: {changelog entry added}
- brief_template.md: {changelog entry added}
- citizen_selection.md: {changelog entry added}

### Newsroom Memory
- Updated with errata, coverage patterns, active arcs
```

The doc IDs embedded here are the query keys. Next cycle's sift reads this log first, uses the doc IDs for direct Supermemory queries, never needs to re-parse the edition text.

### Step 13: Completion Checklist

- [ ] Wiki ingest complete (entity count)
- [ ] Edition text ingested (doc IDs)
- [ ] Citizen cards refreshed in world-data
- [ ] World summary ingested to world-data (doc ID)
- [ ] Civic wiki ingested (NOT BUILT — skip until script exists)
- [ ] Coverage ratings written to sheet
- [ ] Edition graded
- [ ] Grade history updated
- [ ] Exemplars extracted
- [ ] Newsroom memory updated
- [ ] Criteria files updated
- [ ] Filing check passed
- [ ] Discord bot restarted
- [ ] Production log finalized

## Output

| Output | Feeds into |
|--------|-----------|
| bay-tribune (wiki + edition + podcast) | Next sift canon search |
| world-data (citizen cards + world summary) | Next sift MCP lookups |
| Edition_Coverage_Ratings sheet | Engine Phase 2 next cycle |
| `output/grades/grades_c{XX}.json` | Next cycle desk workspaces |
| `output/grades/grade_history.json` | Next cycle desk workspaces |
| `output/grade-examples/` | Next cycle desk workspaces |
| `docs/media/story_evaluation.md` | Next sift Step 2 |
| `docs/media/brief_template.md` | Next sift Step 5 |
| `docs/media/citizen_selection.md` | Next sift Step 4 |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Next sift Step 1 |

## Where This Sits

After `/write-edition`. Parallel with `/edition-print`. Closes the loop.

↩ Loop: `/post-publish` writes ratings + updates memory → next `/pre-flight` reads ratings → engine reads them in Phase 2 → next cycle reflects what was published
