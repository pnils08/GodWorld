---
name: post-publish
description: Close the feedback loop. Canonize to Supermemory, update world-data, write ratings to sheets, grade reporters, update criteria files, update newsroom memory. Type-aware — edition, interview, supplemental, dispatch all converge here.
version: "1.5"
updated: 2026-05-03
tags: [media, active]
effort: high
disable-model-invocation: true
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
| 2a-cul cultural cards | — | ✓ (when CUL-IDs present) | ✓ (when CUL-IDs present) | ✓ (when CUL-IDs present) |
| 2b new businesses | ✓ | ✓ | ✓ | ✓ |
| 2c world summary | ✓ | — | — | — |
| 3 civic wiki | ✓ (when built) | — | — | — |
| 4 coverage ratings | ✓ | — (C93-gated) | — (C93-gated) | — (C93-gated) |
| 5 citizen+business intake | ✓ | ✓ | ✓ | ✓ |
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
- `output/production_log_c{XX}.md` — consolidated per-cycle production log (S195 convention; merges city-hall-prep + city-hall-run + sift + write-edition + post-publish into one log per cycle)
- `output/world_summary_c{XX}.md` — world summary

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
node scripts/buildCitizenCards.js --apply
```
Citizens who appeared get updated profiles in world-data. New citizens get cards built. Verify new citizens have gender from ledger.

**Why `--apply`:** the script defaults to dry-run (writes nothing). Without the flag the substep silently does no real work. (G-P12, S195 — caught on E93 when --apply surfaced the 401 retry storm; previous cycles likely shipped dry-runs masquerading as success.)

**Verification gate:** stdout reports refreshed/created card count ≥ 1 when NAMES INDEX is non-empty. If NAMES INDEX is empty (some dispatches), gate is met by stdout "0 citizens to refresh — empty NAMES INDEX."

**2a-cul. Refresh cultural cards** (`--type {dispatch|interview|supplemental}` — only when NAMES INDEX contains CUL-IDs)

```bash
# For each CUL-XXXXXXX entry parsed from <source> NAMES INDEX:
node scripts/buildCulturalCards.js --apply --cul <CUL-ID>
```

`buildCitizenCards.js` is Sim_Ledger-only — it cannot refresh cultural-only entities (musicians, artists, public figures registered in `wd-cultural` without a Sim_Ledger row). When the artifact's NAMES INDEX names cultural figures (e.g., S188 KONO Second Song dispatch named Marin Tao POP-00537 + Brody Kale CUL-905CBDE8), this substep refreshes their `wd-cultural` cards so the appearance count increments. Citizens with both POP- and CUL- IDs (Beverly Hayes is both citizen AND cultural figure) get both cards refreshed — Step 2a handles the citizen card via POPID; this substep handles the cultural card via CUL-ID.

Skipped for `--type edition` by default — edition NAMES INDEX entries are typically Sim_Ledger citizens with established cards. If a future edition surfaces CUL-only entries, the substep activates the same way (matrix flip + run).

**Verification gate:** for each CUL-ID in source NAMES INDEX, `lookup_cultural(name)` returns a card with `last_appeared` reflecting this cycle. If no CUL-IDs in NAMES INDEX, substep skipped with stdout "0 cultural-only entries — substep N/A this artifact." Plan reference: [[../../../docs/plans/2026-04-30-dispatch-gap-followups]] Task E6 (closes the Brody Kale unrefreshed gap from S188).

**2b. New businesses**
Flagged here for visibility; actual writes happen in Step 5 via `ingestPublishedEntities.js` (which reads BUSINESSES NAMED and appends new entries to Business_Ledger).

**Verification gate:** BUSINESSES NAMED parsed; NEW rows count logged to production log Step 12 — actual append verification lives in Step 5's output JSON.

**2c. World summary ingest** (`--type edition` only)
```bash
source ~/.bashrc && curl -s -X POST "https://api.supermemory.ai/v3/documents" \
  -H "Authorization: Bearer $SUPERMEMORY_CC_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --rawfile content output/world_summary_c{XX}.md \
    --arg cycle "<XX>" \
    '{content: $content, containerTags: ["world-data", "wd-summary"], metadata: {type: "cycle_summary", cycle: $cycle}}')"
```
World summary is per-cycle, not per-artifact. Non-edition types skip this without flag. Tag pair `["world-data", "wd-summary"]` (S184) — the broad `world-data` tag keeps existing `search_world` queries working; the `wd-summary` tag enables filtered retrieval (find me only the summaries, not the entity cards). See [[../../../docs/SUPERMEMORY|SUPERMEMORY]] §Search/save matrix.

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

### Step 5: Citizen + Business Intake to Sheets

```bash
node scripts/ingestPublishedEntities.js editions/cycle_pulse_<type>_<cycle>_<slug>.txt --type <type> --cycle <XX> --apply
```

Reads NAMES INDEX + BUSINESSES NAMED sections from the published `.txt` and appends genuinely new entities to canonical engine sheets:
- **Simulation_Ledger** — new citizens land with `Status=pending`, `Tier=4`, `ClockMode=ENGINE`, blank demographics. Engine fills demographic columns next cycle. Existing citizens are NEVER modified — name drifts logged as warnings, not overwrites.
- **Business_Ledger** — new businesses land with cols A–D populated, E–I blank for engine fill.

Handles two NAMES INDEX formats: T1 strict (`POP-NNNNN | Name | Role`) and pre-T1 freeform (`Name — Description`). Plus a CITIZEN USAGE LOG fallback (S197 BUNDLE-A): when NAMES INDEX is absent (pre-S197 editions, or any cycle that skipped /write-edition Step 3a inject), the script derives entity rows from the rich-prose CITIZEN USAGE LOG so backfill replay still lands the canonical sheets correctly. BUSINESSES NAMED also fallback-resolves from CITIZEN USAGE LOG `(NEW CANON)` sub-sections; absent strict section + no fallback returns 0 gracefully.

Default mode is `--dry-run`; pass `--apply` to write. Output: `output/intake_published_entities_c<XX>_<slug>.json` with full resolution detail (matched / candidates / ambiguous / phantom / appended).

**Verification gate (defense-in-depth, S189 dispatch gap E8 + S197 BUNDLE-A `--strict`):** after `ingestPublishedEntities.js` finishes, cross-check its parsed entity count against the source `.txt` directly:

```bash
node scripts/verifyNamesIndexParse.js <source> --expected <N> --strict
```

Where `<N>` = the entity count `ingestPublishedEntities.js` reported (sum of NAMES INDEX rows it parsed — `matched + candidates + ambiguous + phantom + appended`). The helper independently counts NAMES INDEX rows in the source `.txt`. Exit code 0 = counts match AND section present; exit code 1 = mismatch OR `--strict` and NAMES INDEX section absent (FAIL LOUDLY, block publish).

**Why `--strict` exists (S197 BUNDLE-A):** the C93 silent-no-op pattern was missing-section + zero-expected resolved to exit 0. /write-edition emitted CITIZEN USAGE LOG only (no NAMES INDEX, no BUSINESSES NAMED), ingestPublishedEntities silently returned 0 entities, verifyNamesIndexParse said `[OK] no mismatch` against expected=0 — and 5 entities (3 new citizens + Atlas Bay Architects + Greater Hope Pentecostal) silently dropped from canonical sheets. `--strict` requires NAMES INDEX section to be present; if absent the gate fails with a pointer to run `emitFormatContractSections.js --inject` upstream.

**Why the count-match gate exists (S189 dispatch gap E8):** S188 KONO Second Song dispatch run had ingestEditionWiki.js + ingestPublishedEntities.js both silently return 0 entities despite valid POP-00537 + CUL-905CBDE8 NAMES INDEX rows (false "pure-atmosphere artifact" success). Engine-sheet's E1+E2 fixed the parsers; this gate prevents future parser regressions from re-introducing silent data loss. Plan reference: [[../../../docs/plans/2026-04-30-dispatch-gap-followups]] Task E8.

**Combined gate:**
1. `output/intake_published_entities_c<XX>_<slug>.json` written; if `--apply`, `appended` arrays show all rows verified-by-readback (`ok: true`).
2. `verifyNamesIndexParse.js --expected <N> --strict` exits 0 (source NAMES INDEX present AND row count matches parser-reported count).

If gate 2 fails with "NAMES INDEX section absent": run `node scripts/emitFormatContractSections.js <source> --inject` to derive the strict sections from CITIZEN USAGE LOG, then re-run /post-publish Step 5. If gate 2 fails with "mismatch": investigate the parser regression before continuing — silent zero-entity ingest poisons bay-tribune retrieval.

### Step 5b: Refresh `base_context.json` + desk packets (all types)
```bash
node scripts/buildDeskPackets.js <XX>
```
Rebuilds `output/desk-packets/base_context.json` (the cycle source-of-truth that `lib/mags.js loadWorldState()` reads for the Discord bot's hourly system-prompt rebuild) plus the 9 desk packets. Without this step, the Discord bot reports a stale cycle until the next manual cycle run.

Side effect: takes ~60 seconds. Harmless — desk packets get rebuilt anyway pre-cycle, and the bot's worldview catches up on its next hourly tick.

Plan reference: [[../../../docs/plans/2026-04-26-discord-bot-edition-currency]] Task 1 (S180 surfaced; S184 wired here).

**Verification gate:** `output/desk-packets/base_context.json` mtime updated; `cycle` field in the JSON matches `<XX>`.

### Step 6: Grade Edition (`--type edition` only)
```bash
node scripts/gradeEdition.js editions/cycle_pulse_edition_<XX>.txt <XX>
```
Per-desk and per-reporter grades from edition text + errata + Mara audit.

**Why the path arg (G-P13, S195):** script signature is `<edition-file-path> [cycle]`. Passing only `<XX>` makes it try to open `/root/GodWorld/93` and exit "Edition file not found." Always pass the full path.

**Verification gate:** `output/grades/grades_c<XX>.json` written.

### Step 7: Update Grade History (`--type edition` only)
```bash
node scripts/gradeHistory.js
```
Rolling averages (5-edition window), trends, roster recommendations.

**Verification gate:** `output/grades/grade_history.json` mtime updated.

### Step 8: Extract Exemplars (`--type edition` only)
```bash
node scripts/extractExemplars.js editions/cycle_pulse_edition_<XX>.txt <XX>
```
A-grade articles become desk workspace exemplars for future cycles.

**Why the path arg (G-P19, S195):** same signature pattern as `gradeEdition.js` — script wants `<edition-file-path> [cycle]`. Passing only `<XX>` bombs identically.

**Verification gate:** stdout reports exemplar count ≥ 0; if A-grade articles existed in `grades_c<XX>.json`, exemplar count > 0.

### Step 9: Update Newsroom Memory

Read the consolidated production log as source (S195 convention; single per-cycle log):
- `output/production_log_c<XX>.md` — story picks, editorial review, voice decisions, tracker updates, what was dramatic, Mara corrections, Rhea flags. All cycle phases merged.

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
- `output/production_log_c<XX>.md` — Mara corrections, Rhea flags, editorial review
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

**Known stale manifest (G-P22, S195 — engine-sheet handoff Wave 3 BUNDLE-H):** the script's required-files manifest reflects pre-pipeline-v2 state and reports INCOMPLETE every cycle on artifacts that don't exist anymore (`output/desk-output/{civic,sports,...}_c<XX>.md` from before S134 + `output/photos/e<XX>` and PDF paths that require `/edition-print` to have run separately). False-alarm fatigue — every cycle reports failing files. Until the manifest is updated, treat the INCOMPLETE message as advisory; the actual pipeline-v2 outputs (`output/reporters/*/articles/c<XX>_*.md`, the consolidated production log, the published `.txt`) are what matter.

**Bot restart deferred to /session-end** (G-P23, S195). The previous version of this step ran `pm2 restart mags-bot` here, but that conflicts with the boot/session-end RAM lifecycle (boot stops bot+dashboard; session-end restarts them). Bot doesn't need to be up until a citizen messages it on the next hourly tick — restart timing is functionally equivalent. Single canonical restart home: `/session-end`.

**Verification gate:** `postRunFiling.js` exit 0. (Bot restart no longer in this step — verified at /session-end.)

### Step 12: Finalize Production Log — Wiki Pattern

Append a Post-Publish section to `output/production_log_c<XX>.md` with inline Supermemory doc IDs. Each canonized artifact gets a doc ID on its line so next cycle queries the record directly instead of re-reading files.

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
- [ ] Cultural cards refreshed (non-edition + CUL-IDs in NAMES INDEX)
- [ ] World summary ingested (edition only)
- [ ] Civic wiki ingested (NOT BUILT — skip)
- [ ] Coverage ratings written (edition) OR C93-gated skip noted (non-edition)
- [ ] Edition graded (edition only)
- [ ] Grade history updated (edition only)
- [ ] Exemplars extracted (edition only)
- [ ] Newsroom memory updated
- [ ] Criteria files updated (edition only)
- [ ] Filing check passed (INCOMPLETE message is advisory until G-P22 manifest fix lands)
- [ ] Production log finalized
- ~~Discord bot restarted~~ (moved to /session-end per G-P23, S195)

**Verification gate:** all matrix-✓ rows checked OR an explicit `--skip-<name>` invocation recorded.

## Time Budget (G-P25, S195)

Substeps vary widely in wall time. Surface the most expensive ones up front so operators don't underestimate run-time.

| Substep | Wall time | Notes |
|---------|-----------|-------|
| 1a wiki ingest | ~30s | Fast, single API call per chunk |
| 1b text ingest | ~30s | Same |
| 2a citizen cards (--apply) | **10+ min** | Loops 800+ ledger rows; the largest single substep. ~4 min in dry-run. |
| 2a-cul cultural cards | ~10s per CUL-ID | Negligible at typical 1-3 IDs |
| 2c world summary | ~5s | Single API write |
| 4 coverage ratings | ~30s | Sheet write |
| 5 citizen+business intake | ~1-2 min | Sheet append + verify |
| 5b desk packet refresh | ~60s | Rebuilds 9 packets + base_context |
| 6 grade edition | ~2 min | Per-article model passes |
| 8 extract exemplars | ~30s | Filesystem walk |
| 10 criteria files (with /skill-check) | **5-15 min** | Most token-heavy step. /skill-check is a model-reasoning task. |
| 11 filing + bot | ~10s | (Bot restart now at /session-end) |

**Whole-skill budget:** ~30-45 min for an edition end-to-end. ~10-15 min for non-edition (no Step 6/7/8/10).

If you're tempted to "wait it out" on Step 2a or Step 10, set expectation accordingly — they are real wall time, not stuck.

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
- 2026-04-30 — v1.4 (S189, research-build). Wired E6 + E8 from [[plans/2026-04-30-dispatch-gap-followups]]. **Step 2a-cul cultural-card refresh** (matrix-✓ for dispatch / interview / supplemental when CUL-IDs in NAMES INDEX): `buildCitizenCards.js` is Sim_Ledger-only, so cultural-only entities (Marin Tao type, Brody Kale type) need a parallel `buildCulturalCards.js --apply --cul <CUL-ID>` invocation per CUL-ID parsed from NAMES INDEX. Closes the S188 Brody Kale unrefreshed gap. **Step 5 verification gate cross-check**: after `ingestPublishedEntities.js` reports its parsed entity count, run `verifyNamesIndexParse.js <source> --expected <N>` to independently count NAMES INDEX rows in the source `.txt` — exit 1 (block publish) if counts disagree. Defense-in-depth against future parser regressions reintroducing the S188 silent-zero false-success failure mode. Step 13 checklist + Step 12 production-log section both gain the new substep row.
- 2026-05-03 — v1.5 (S197, engine-sheet executing research-build Wave 1 plan). Wave 1 DOC-drift sweep per [[plans/2026-05-03-c93-gap-triage-execution]]. **G-P12 Step 2a invocation:** `buildCitizenCards.js` → `--apply` flag added (script defaults dry-run; previous cycles silently shipped no writes). **G-P22 Step 11 postRunFiling staleness note:** advisory text added explaining INCOMPLETE message is expected until the manifest is updated to pipeline-v2 outputs (Wave 3 BUNDLE-H). **G-P23 Step 11 bot restart removal:** `pm2 restart mags-bot` removed; deferred to /session-end (single canonical home) to respect boot/session-end RAM lifecycle. Step 13 checklist updated. **G-P25 §Time Budget section added** before §Output: per-substep wall-time table surfaces Step 2a (10+ min --apply), Step 10 /skill-check (5-15 min) as the expensive ones. Whole-skill budget ~30-45 min edition / ~10-15 min non-edition. **Stale-filename sweep (same drift class as G-PR1):** all 6 references to `production_log_edition_c<XX>.md` + `production_log_city_hall_c<XX>.md` consolidated to `production_log_c<XX>.md` (S195 convention). G-P1 ("/save-to-bay-tribune duplicate") not addressed here — that's a /write-edition-side fix; Step 1b is already the canonical text-ingest home.
