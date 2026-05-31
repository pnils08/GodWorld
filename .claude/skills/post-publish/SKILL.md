---
name: post-publish
description: Close the feedback loop. Canonize to Supermemory, update world-data, write ratings to sheets, grade reporters, update criteria files, update newsroom memory. Type-aware — edition, interview, supplemental, dispatch all converge here.
version: "1.8"
updated: 2026-05-30
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
| 0 staleness gate | — | — | — | — | (RETIRED S225 — see §Step 0 below)
| 1a wiki ingest | ✓ | ✓ | ✓ | ✓ |
| 1b text ingest | ✓ | ✓ (transcript only — see §Step 1) | ✓ | ✓ |
| 2a citizen cards | ✓ | ✓ | ✓ | ✓ |
| 2a-cul cultural cards | — | ✓ (when CUL-IDs present) | ✓ (when CUL-IDs present) | ✓ (when CUL-IDs present) |
| 2b new businesses | ✓ | ✓ | ✓ | ✓ |
| 2d truesource sweep | ✓ | — | ✓ | — |
| 2c world summary | ✓ | — | — | — |
| 3 civic wiki | ✓ | — | — | — |
| 4 coverage ratings | ✓ | — (C93-gated) | — (C93-gated) | — (C93-gated) |
| 5 citizen+business intake | ✓ | ✓ | ✓ | ✓ |
| 5-bis wd-card rebuild (new POPIDs) | ✓ | ✓ | ✓ | ✓ |
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

For `--type interview`: `<source>` IS the transcript at `editions/cycle_pulse_interview-transcript_{XX}_<slug>.txt` (capture-only since /interview v2.0, S233 pipeline.30 — the legacy bare article `cycle_pulse_interview_*.txt` is retired). No companion artifact; single canonical transcript.

## Parallelization Notes (S215, closes G-P5)

Several substeps are independent and can run concurrently to compress wall time. Default to running these in parallel via separate background invocations:

| Group | Substeps | Constraint |
|-------|----------|-----------|
| **Parallel-OK** | 2a citizen cards, 2c world summary, 4 coverage ratings | No interdependency. Each writes a different surface (world-data citizens, world-data summary, sheets). Run concurrently. |
| **Sequential after parallel group** | Step 5 (citizen+business intake) | Depends on Step 2a completion via the verification gate (NAMES INDEX presence + parsed count). |
| **Sequential after Step 5** | Step 5-bis (wd-card rebuild for newly-appended POPIDs) | Depends on Step 5 output JSON for `appended[].popid` range. Closes G-P32 one-cycle card lag per [[../../../docs/adr/0007-cross-layer-canon-authority-precedence|ADR-0007]]. |
| **Sequential after Step 5-bis** | Steps 6 (grade), 7 (grade history), 8 (exemplars) | Depend on Step 5's intake JSON for entity attribution; Step 5-bis must complete first so newly-appended citizens have wd-cards for grade lookups. |
| **Parallel-OK with the grade group** | Step 9 (newsroom memory), Step 10 (criteria files) | Independent of the grade-chain output; can run alongside Steps 6-8. |
| **Sequential at end** | Step 11 (filing + bot), Step 12 (production log), Step 13 (checklist) | Final state-of-the-skill steps; run after all prior substeps complete. |

Wall-time saving on edition runs: ~60-90s (Step 2a citizen cards is the slowest substep; running 2c + 4 against its wall time recovers their duration).

## Steps

### Step 0: Pre-flight Staleness Gate — RETIRED S225 (pipeline.23, closes G-P28)

**Retired.** The S215 staleness gate modeled the wrong dependency direction. `scripts/checkPostPublishStaleness.js` compared `world_summary` + `engine_audit` mtimes against the `/city-hall` production log, but `world_summary` is INPUT to `/city-hall` (built before it), not output — so the gate fired STALE every cycle by design flaw (G-P28, G-S11). The advisory line "Re-run /build-world-summary before continuing" misled the operator into spurious rebuilds; Mike spent cycles escalating "should we rebuild?" with no real signal underneath.

If real sequencing concerns arise (e.g., engine produced new state but world_summary wasn't rebuilt), compare `output/world_summary_c<XX>.md` mtime against `output/engine_audit_c<XX>.json` manually — that's the correct upstream baseline. Engine-sheet may retire `scripts/checkPostPublishStaleness.js` + `lib/staleness.js` in a future sweep (vestigial after this retirement).

### Step 1: Bay-Tribune Ingest — Canon

**1a. Wiki ingest — per-entity records (PRIMARY)**
```bash
node scripts/ingestEditionWiki.js <source> --type <type> --apply
```
Extracts per-citizen, per-initiative, per-business, per-storyline records from the standardized sections (NAMES INDEX, BUSINESSES NAMED) into bay-tribune. Each entity gets its own searchable record. Log entity count.

**Verification gate:** stdout reports entity count ≥ 1 OR explicit "0 entities — body had no named citizens/businesses" (acceptable for pure-atmosphere dispatches). Fail otherwise.

Review: spot-check 2-3 records against the article body.

**1b. Text ingest (BACKUP) — single canonical home (S215, closes G-P1)**

Step 1b is the **only** home for edition text ingest. As of S215, `/write-edition` Step 6 no longer runs `ingestEdition.js` at close — running it both there and here produced duplicate bay-tribune text records (different doc IDs, same content) that polluted future sift queries. If `/write-edition` close already ingested text for some reason (rare emergency backfill), skip this substep and document in the production log.

```bash
node scripts/ingestEdition.js <source> --type <type> --cycle <XX>
```
Full text chunked to bay-tribune. Wiki records rank higher for entity searches; text chunks are backup for full-text queries. Log doc IDs.

For `--type interview` (post /interview v2.0, S233 pipeline.30): the `<source>` IS the transcript — no companion re-run. Step 1b runs once against the transcript `.txt`. The legacy two-invocation pattern (article + companion transcript) is retired; /interview v2.0 emits only the transcript.

**Verification gate:** bay-tribune doc ID returned (single ID — for interview, the transcript `.txt` is the canonical artifact, no companion article exists post /interview v2.0). Fail if the API call returns no ID or an error string.

**Note:** Podcast runs AFTER post-publish as a separate creative process. Podcast handles its own bay-tribune ingest.

### Step 2: World-Data Updates — City State

**2a. Refresh citizen cards**
```bash
node scripts/buildCitizenCards.js --apply
```
Citizens who appeared get updated profiles in world-data. New citizens get cards built. Verify new citizens have gender from ledger.

**Why `--apply`:** the script defaults to dry-run (writes nothing). Without the flag the substep silently does no real work. (G-P12, S195 — caught on E93 when --apply surfaced the 401 retry storm; previous cycles likely shipped dry-runs masquerading as success.)

**Verification gate (strengthened S230 per canon.3 / ADR-0007):** ALL THREE conditions must pass — (a) stdout reports refreshed/created card count ≥ 1 when NAMES INDEX is non-empty (or "0 citizens to refresh — empty NAMES INDEX" if empty); (b) stdout reports `Errors: 0`; (c) script exit code is 0. Any failing condition aborts /post-publish at Step 2a with a pointer to `output/citizen_card_failures_c<XX>.json` for engine-sheet diagnosis. The failure-list dump + non-zero exit ship via engine-sheet T6 (canon.3 plan); pre-T6 the script still exits 0 on partial failure, so the gate is partially load-bearing until T6 lands. Closes G-P34 lineage (S195 G-P12 → S222 G-P34 → S223 chunking fix → S230 gate strengthening).

**Why this gate strengthening matters (per ADR-0007):** wd-citizens is the derived lookup layer that reporters + Mara + sift Step 4 enrichment hit via MCP `lookup_citizen`. A 19% partial-write failure (S222 C94 empirical) means wd-citizens has a silent gap per cycle that compounds — same shape as the bay-tribune-only-citizens drift the ADR governs. Non-zero exit + failure dump make the gap visible immediately instead of catching it three cycles later when a reporter notices a missing card.

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

**2d. Refresh A's player truesource — incremental sweep** (`--type edition` and `--type supplemental`)

```bash
node scripts/ingestPlayerTrueSource.js --apply --skip-subfolder --include-flat --include-prospects
```

Walks `MLB_Roster_Data_Cards/` (top-level flat files) + `Top_Prospects_Data_Cards/` Drive folders for new TrueSource v1.0 attribute sheets, POP-ID DataPages, or per-season intake docs. Ingests each as a `wd-player-truesource`-tagged supplemental memory in world-data keyed by POPID. MCP `lookup_citizen` retrieves these for elite Tier-1/Tier-2 A's players alongside the standard wd-citizen card.

**Why `--skip-subfolder`:** Pass A (the heavy `True_Source/` subfolder walk per player) was bootstrapped S180 (commit `c15050f` — 9/10 elite players ingested). Subsequent runs use this lighter flag set to pick up only newly-added flat-files + new Top_Prospects passes; avoids re-ingesting Pass A docs every cycle.

**Why two paths:** flat `MLB_Roster_Data_Cards/*.txt` covers established roster updates; `Top_Prospects_Data_Cards/` covers minor-league prospects who get promoted. `--include-flat --include-prospects` activates both.

**Skipped for interview + dispatch.** Those types rarely surface MLB roster changes; if a future dispatch covers a roster move (trade, call-up), Mike can re-run the script manually with the same flags or extend the matrix.

**Verification gate:** stdout reports per-player ingest count + POPID resolution table OR "0 new truesource files — no Drive updates this run" when nothing has changed. `output/intake_player_truesource.json` written with full resolution detail. Failure modes (Drive auth, Supermemory 401, POPID resolution gaps) surface to production log Step 12.

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

```bash
node scripts/ingestCivicWiki.js --cycle <XX> --apply
```

Shipped S215 (closes pipeline.22 / G-P4). Reads `output/civic-voice/<office>_c<XX>.json` (per-voice statement arrays — Mayor, factions, projects, Clerk, Chief, DA) + `output/city-civic-database/initiatives/*/decisions_c<XX>.json` (per-initiative consolidated decision) and emits per-statement + per-decision wiki records to `bay-tribune`. Each statement memory carries speaker / office / topic / position / quote / reasoning / related initiatives in content body for full-text indexing; metadata carries `recordType: civic-statement` (or `civic-decision`), `cycle`, `statementId`, `office`, `popId`, `topic`, `relatedInitiatives` for filtered retrieval.

Use this so next-cycle sift can ask "what has Mayor Santana said about Health Center across cycles" via bay-tribune search instead of re-reading every civic voice JSON. Default is `--dry-run`; pass `--apply` to write.

**Verification gate:** stdout reports `[DONE] Written: N, Errors: 0` AND N matches the pre-write `Total memories: N` line. Non-edition types skip this step (civic wiki is per-cycle, edition-aligned). Skip annotated in production log Step 12.

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

### Step 5-bis: Build wd-cards for newly-appended POPIDs (all types, when Step 5 appended new citizens)

**Purpose:** closes G-P32 one-cycle card lag per [[../../../docs/adr/0007-cross-layer-canon-authority-precedence|ADR-0007]] §How to Apply. Step 2a's `buildCitizenCards.js` ran BEFORE Step 5 appended new POPIDs; without this substep, newly-published citizens have NO wd-card until next cycle's Step 2a runs — Mara's audit can't look them up, /sift Step 4 enrichment returns empty, future-cycle continuity checks miss them.

Reads Step 5 output JSON (`output/intake_published_entities_c<XX>_<slug>.json`) for `appended[].popid`. If `appended` is empty, substep is skipped with stdout "0 new POPIDs — Step 5-bis N/A this artifact."

If `appended` has 1+ POPIDs:

```bash
node scripts/buildCitizenCards.js --apply --popid-range POP-XXXXX:POP-YYYYY
```

Where `XXXXX:YYYYY` is the min/max of appended POPIDs. The `--popid-range` flag shipped S223 (engine.18) for surgical rebuilds.

**Verification gate (same shape as Step 2a strengthened gate):** ALL THREE conditions — (a) stdout reports `Written: N` matching the appended POPID count; (b) stdout reports `Errors: 0`; (c) script exit code 0. Per ADR-0007 §How to Apply: this substep + Step 2a together enforce that every Sim_Ledger row has a wd-card within the same /post-publish run.

**Why this runs after Step 5 (not folded into Step 2a):** Step 2a runs before the canonical artifact has been ingested to bay-tribune; new citizens aren't in Sim_Ledger yet so there's nothing to build. Step 5 appends to Sim_Ledger; Step 5-bis builds the matching wd-cards. Sequencing is structural, not optional.

**Pre-T6 caveat (canon.3 plan):** until engine-sheet T6 ships the Errors-gate non-zero exit on `buildCitizenCards.js`, this substep can silent-partial-fail the same way Step 2a can. Production log Step 12 must log the appended POPID list + the substep's stdout summary so operator can manually inspect.

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

**Grade-conditional /skill-check gate (G-P-NEW4, S246 — token-burn).** /skill-check is a model-reasoning task per target; running it ×5 every cycle is high-cost / low-marginal-value when the edition already graded clean and the direct-evidence sources (grades, production log, Mara corrections, this conversation) already carry the editorial findings. Gate on the edition's Final Arbiter verdict (`output/final_arbiter_c<XX>.json`):

- **Verdict A (PROCEED, weighted ≥ 0.75) → SKIP /skill-check ×5 by default.** The structural assertions are assumed-pass on a clean edition; write the criteria-file updates directly from the direct-evidence sources below. Log "skill-check skipped — edition graded A (Arbiter PROCEED {score}); criteria updated from direct evidence" in the production log.
- **Verdict A with PROCEED-WITH-NOTES (0.60–0.75) or Verdict B (HALT/below) → RUN the full /skill-check ×5 suite.** A sub-clean grade is exactly when the structural assertion pass earns its cost — it surfaces *which* skill mechanically drifted.
- **Operator override either way:** if a specific skill felt off this cycle regardless of grade, run /skill-check on that one target. Don't run all five to check one.

(Alternative consolidation if you do run them: batch into a single multi-skill model call rather than 5 separate invocations — same structural value, lower token cost.)

**When the gate says RUN — `/skill-check` for each skill that produced a cycle artifact** — S216 governance.2 extended skill-check from 2 targets (write-edition + sift) to 5 (added city-hall + dispatch + interview). For each target, check whether the cycle has the relevant artifact; if yes, run /skill-check; if no, skip with one-line "no <skill> artifact this cycle" note.

| Skill | Artifact check (run /skill-check if exists) | Writes |
|-------|---------------------------------------------|--------|
| `write-edition` | `output/production_log_c<XX>.md` has a `## /write-edition` section (legacy fallback: `production_log_edition_c<XX>.md` exists) | `output/skill_check_write-edition_c<XX>.json` |
| `sift` | `output/sift_proposals_c<XX>.json` exists | `output/skill_check_sift_c<XX>.json` |
| `city-hall` | `output/production_log_c<XX>.md` has a `## /city-hall` section (legacy fallback: `production_log_city_hall_c<XX>.md` exists) | `output/skill_check_city-hall_c<XX>.json` |
| `dispatch` | `editions/cycle_pulse_dispatch_c<XX>_*.txt` exists | `output/skill_check_dispatch_c<XX>.json` |
| `interview` | `editions/cycle_pulse_interview-transcript_c<XX>_*.txt` exists | `output/skill_check_interview_c<XX>.json` |

Each /skill-check JSON is a feedback source: its `assertions`, `reviewerOverlap`, and `evalFeedback` tell you exactly which criteria held and which need sharpening.

Read these feedback sources:
- Each `output/skill_check_<skill>_c<XX>.json` produced this step — structural assertion pass/fail + eval-feedback suggestions
- `output/grades/grades_c<XX>.json` — per-reporter scores
- `output/production_log_c<XX>.md` — Mara corrections, Rhea flags, editorial review
- Mike's feedback — capture in conversation

Update each criteria file with specific findings based on its /skill-check output:

**`docs/media/story_evaluation.md`** (write-edition + sift):  which priority signals predicted strong articles, did front-page scoring match the actual best article, weak story indicators to add.

**`docs/media/brief_template.md`:** which briefs produced articles that followed closely, which produced drift, word-count tuning.

**`docs/media/citizen_selection.md`:** any citizen misrepresented (role, neighborhood, gender, history), freshness balance, any reporter invented details contradicting canon.

**`docs/media/city_hall_evaluation.md`** (city-hall, S216): which criteria held / failed for this cycle's civic source-material run; any new failure pattern to encode as a criterion.

**`docs/media/dispatch_evaluation.md`** (dispatch, S216): word-count band tuning (criterion 4 is intentionally provisional), location-specificity examples, identity-through-action vs data-dump patterns observed.

**`docs/media/interview_evaluation.md`** (interview, S216): voice-differentiation sharpening (criterion 9 is intentionally subjective), world-altering canon flagging patterns, archetype-match observations.

Pattern from skill-creator eval framework (S141): set assertions, grade each assertion against the actual edition, update criteria with what passed and failed. Over cycles the criteria files become the trained editorial standard.

Each updated criteria file gets a changelog entry at the bottom:
```
## Changelog
- C<XX>: [what changed] — [why, based on what evidence]
```

**Verification gate:** for each skill whose artifact existed this cycle, a corresponding /skill-check JSON exists in output/ AND its assertion file has a new changelog entry dated this cycle. Skills whose artifact didn't exist this cycle are skipped (one-line skip note in the post-publish production log).

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
- Article text: {doc ID} (edition / supplemental / dispatch)
- Transcript text: {doc ID} (interview type — single canonical artifact post /interview v2.0)
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

- [ ] Staleness gate clean OR rebuild done before Step 1 (`node scripts/checkPostPublishStaleness.js --cycle <XX>`)
- [ ] Wiki ingest complete (entity count)
- [ ] Text ingested (one doc ID; for interview type, the transcript `.txt` is the canonical artifact — single ingest post /interview v2.0)
- [ ] Citizen cards refreshed
- [ ] Cultural cards refreshed (non-edition + CUL-IDs in NAMES INDEX)
- [ ] World summary ingested (edition only)
- [ ] Civic wiki ingested (`node scripts/ingestCivicWiki.js --cycle <XX> --apply`; skip for non-edition types)
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

## Gap log (S212 — see [[../../docs/plans/GAP_LOG_TEMPLATE]])

At skill close, capture friction observed during post-publish as a gap log. /post-publish is a heavy skill at the **media generator terminal**; sidecar gap logs catch inefficiency the skill couldn't catch while running. Type-aware: same gap log structure for edition / interview / supplemental / dispatch publishes.

**Output path:** `output/production_log_<type>_c<XX>_post_publish_gaps.md` (sidecar to consolidated `output/production_log_c<XX>.md` per S195 convention).

**Gap prefix:** **G-P\*** (e.g., G-P1, G-P14).

**Common categories for /post-publish gaps:**
- format-contract (CITIZEN USAGE LOG vs NAMES INDEX, parser silent no-ops, BUSINESSES NAMED absence)
- env-auth (env vars missing, Supermemory 401 retries, pre-flight gaps)
- grading-pipeline (Mara grade not found, hallucinated counts, reporter-name normalization)
- sequencing (early-ingest duplicates, bot-restart conflict with /session-end)
- stale-derivative (world-summary/manifest reflecting pre-pipeline-v2 state)

**Discipline:** write the gap log even on clean runs. File a ROLLOUT row in `pipeline.<n>` pointing at the gap log per ADR-0005 §How to add work. Promote bundles (e.g., BUNDLE-A format-contract enforcement, BUNDLE-D pre-flight env+auth) when multiple gaps share root cause.

## Where This Sits

After `/write-edition` (edition path) or after `/interview`, `/dispatch`, `/write-supplemental` (alternate paths). Parallel with `/edition-print`. Closes the loop.

↩ Loop: `/post-publish` writes ratings + updates memory → next `/pre-flight` reads ratings → engine reads them in Phase 2 → next cycle reflects what was published.

## Changelog

- 2026-04-17 — Initial 13-step skill (S156, post-publish formalized).
- 2026-04-26 — v1.1 (S180, research-build). Type-aware: `--type {edition|interview|supplemental|dispatch}` flag added. Per-type substep matrix encodes default skips; `--skip-<name>` required only for matrix-✓ opt-outs. Verification gate declared on every substep. Coverage ratings (Step 4) explicitly C93-gated for non-edition. Convergence point for the unified non-edition publishing pipeline (plan [[plans/2026-04-26-non-edition-publishing-pipeline]] T3).
- 2026-04-30 — v1.4 (S189, research-build). Wired E6 + E8 from [[plans/2026-04-30-dispatch-gap-followups]]. **Step 2a-cul cultural-card refresh** (matrix-✓ for dispatch / interview / supplemental when CUL-IDs in NAMES INDEX): `buildCitizenCards.js` is Sim_Ledger-only, so cultural-only entities (Marin Tao type, Brody Kale type) need a parallel `buildCulturalCards.js --apply --cul <CUL-ID>` invocation per CUL-ID parsed from NAMES INDEX. Closes the S188 Brody Kale unrefreshed gap. **Step 5 verification gate cross-check**: after `ingestPublishedEntities.js` reports its parsed entity count, run `verifyNamesIndexParse.js <source> --expected <N>` to independently count NAMES INDEX rows in the source `.txt` — exit 1 (block publish) if counts disagree. Defense-in-depth against future parser regressions reintroducing the S188 silent-zero false-success failure mode. Step 13 checklist + Step 12 production-log section both gain the new substep row.
- 2026-05-11 — v1.6 (S215, research-build). Pipeline.18 heavy-skill text reconciliation sweep. **G-P1 closed:** Step 1b now explicitly stated as the single canonical home for edition text ingest; `/write-edition` Step 6 no longer runs `ingestEdition.js` at close (companion edit shipped same commit). **G-P5 closed:** new §Parallelization Notes section before §Steps surfaces the parallel-OK groupings (2a + 2c + 4 concurrent; 9 + 10 alongside 6-8). Saves ~60-90s wall time per edition run. Other pipeline.18 items (G-P2 ingestEditionWiki summary fix, G-P10 zero-entity JSON sentinel, G-P20 extractExemplars double-iterate) are engine-sheet code work filed at pipeline.19, not in scope here.
- 2026-05-24 — v1.8 (S233, research-build). **Pipeline.30 cross-edit — interview type rewired to transcript-only ingest** after /interview v2.0 capture-only architectural shift. (1) Matrix L42 cell `1b text ingest` interview column `✓ (article + transcript)` → `✓ (transcript only — see §Step 1)`. (2) Prerequisite paragraph rewritten: `<source>` IS the transcript for interview type; no companion artifact. (3) Step 1b duplicate-ingest block (the legacy second `ingestEdition.js` invocation against the companion transcript) DELETED entirely — Step 1b runs once. (4) Verification-gate text updated: single doc ID for interview, not two. (5) Step 10 /skill-check trigger filename pattern `cycle_pulse_interview_c<XX>_*.txt` → `cycle_pulse_interview-transcript_c<XX>_*.txt` (matches /interview v2.0 actual output). (6) Step 12 production-log template "Transcript text: {doc ID} (interview only)" qualifier updated to "single canonical artifact post /interview v2.0". (7) Step 13 checklist line "Text ingested (doc IDs — two for interview)" → "one doc ID; for interview type, transcript .txt is canonical artifact". Closes G-I12 structurally — /post-publish per-type matrix interview row now matches /interview v2.0 output shape. Source: [[../../docs/plans/2026-05-24-pipeline-30-interview-rewrite]] Task 15.
- 2026-05-23 — v1.7 (S225, research-build). **Pipeline.23 closure (cluster C1, partial — staleness-gate half).** Step 0 staleness gate retired (closes G-P28 + companion G-S11 in /sift). The S215 gate modeled the wrong dependency direction (world_summary IS input to /city-hall, not output), so it fired STALE every cycle by design flaw — operator escalated rebuilds for nothing. Section rewritten as a retirement note + manual fallback (compare world_summary vs engine_audit mtimes by hand if sequencing concerns arise). Substep matrix row 0 marked retired across all four type columns. Engine-sheet may delete `scripts/checkPostPublishStaleness.js` + `lib/staleness.js` in a future sweep (vestigial). Pipeline.23 also closes G-P26 (path harmonization) via companion /sift + /write-edition consolidation edits — /post-publish already declares consolidated `production_log_c<XX>.md` per S195 sweep S197 v1.5, no path edit needed here.
- 2026-05-03 — v1.5 (S197, engine-sheet executing research-build Wave 1 plan). Wave 1 DOC-drift sweep per [[plans/2026-05-03-c93-gap-triage-execution]]. **G-P12 Step 2a invocation:** `buildCitizenCards.js` → `--apply` flag added (script defaults dry-run; previous cycles silently shipped no writes). **G-P22 Step 11 postRunFiling staleness note:** advisory text added explaining INCOMPLETE message is expected until the manifest is updated to pipeline-v2 outputs (Wave 3 BUNDLE-H). **G-P23 Step 11 bot restart removal:** `pm2 restart mags-bot` removed; deferred to /session-end (single canonical home) to respect boot/session-end RAM lifecycle. Step 13 checklist updated. **G-P25 §Time Budget section added** before §Output: per-substep wall-time table surfaces Step 2a (10+ min --apply), Step 10 /skill-check (5-15 min) as the expensive ones. Whole-skill budget ~30-45 min edition / ~10-15 min non-edition. **Stale-filename sweep (same drift class as G-PR1):** all 6 references to `production_log_edition_c<XX>.md` + `production_log_city_hall_c<XX>.md` consolidated to `production_log_c<XX>.md` (S195 convention). G-P1 ("/save-to-bay-tribune duplicate") not addressed here — that's a /write-edition-side fix; Step 1b is already the canonical text-ingest home.
