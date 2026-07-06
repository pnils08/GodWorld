---
title: Event_Content_Ledger Auto-Authoring Plan
created: 2026-07-06
updated: 2026-07-06
type: plan
tags: [engine, citizens, content-ledger, offload, active]
sources:
  - Mike-direct 2026-07-06 (this session) — "needs to be wired true to our engine and needs to have automation, relying on me to manual type into ledgers is a bottleneck"
  - phase02-world-state/loadEventContentLedger.js (fail-closed loader; S298 whitelist now matches live engine sources — commit 4abf4b52)
  - phase05-citizens/generateCitizensEvents.js:701,2233-2260,2391 (composer + gates that consume S.contentLedger)
  - docs/plans/2026-07-01-persistence-seams-content-ledger.md (Design A — the seam this automates)
  - docs/research/2026-07-06-city-citizen-seam-audit.md (three event layers; doctrine: testimony is the asset)
  - MEMORY.md — feedback_offload-scripted-jobs-to-helpers, feedback_offload-roi-volume-context-portability
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.49 row points here"
  - "[[2026-07-01-persistence-seams-content-ledger]] — parent seam design"
  - "[[../research/2026-07-06-city-citizen-seam-audit]] — why authored texture matters (Layer 1 is the volume)"
  - "[[../index]] — registered same commit"
---

# Event_Content_Ledger Auto-Authoring Plan

## Thesis

The content ledger was built as an operator-authored tab, but the operator is the
bottleneck: 5 rows authored since it shipped, one dead on arrival (whitelist lag, fixed
S298). Meanwhile the loader is **fail-closed by design** — a malformed row is skipped and
counted, `Active=no` is a kill switch, a missing tab reverts to hardcoded pools. That
safety model means rows do not need a trusted author. Automate the authoring: after each
cycle, a drafting job reads what the cycle actually produced and writes condition-gated
rows into the tab. The engine grows its own vocabulary from its own state; Mike keeps the
kill switch and never types a row.

This is a textbook offload per the standing rule (strict output schema, high volume,
fully portable context): the drafting model is a **cheap helper** (OpenRouter free tier /
local), never premium tokens.

## What the drafter reads (all already persisted, no new state)

| Input | Source | Drives |
|---|---|---|
| This cycle's seeds w/ citizens + Why | Story_Seed_Deck (contract rows, Grade 1 live C117) | topical lines per hood/domain ("retail surge," "exodus talk") |
| Displacement pressure, gentrification phase | Neighborhood_Map | `hood=X; displacement>=N` gated lines |
| econMood, city sentiment | World_Population / cycle summary sheet fields | `wealth<=3` economy lines, mood tint |
| Season / holiday | Simulation_Calendar / Cycle_Seeds | seasonal rotation so pools don't stale |
| Existing ledger rows | Event_Content_Ledger | dedup — never redraft a live row |

## Output contract (hard, validated before write)

Rows in the existing 8-col schema (`Kind|PoolKey|Slot|Text|Weight|Conditions|Tags|Grain`):

- First tag MUST be a whitelisted source (script embeds the same
  `CONTENT_LEDGER_SOURCE_WHITELIST`); every row also carries an `auth:auto` provenance
  tag so machine rows are sweepable in one filter.
- Conditions MUST parse under the same DSL rules as the loader (script re-implements
  `parseContentConditions_` in Node or requires the module) — a row that would be
  skipped at cycle time is **never written**. Zero dead rows by construction.
- Caps: ≤10 new rows/cycle, ≤3 per PoolKey, ≤2 fragments/slot. Log what was capped
  (no silent truncation).
- Dedup: normalized-text match against all existing rows → drop.
- Prune: auto rows whose gating condition has been false for 10+ consecutive cycles
  (e.g. `displacement>=6` after pressure fell) get `Active=no`, not deleted — reversible.

## Tasks

1. **T1 — Drafter script** (`scripts/draftContentRows.js`, NEW .js — approved by this
   plan's engine.49 go): reads inputs table above via service account, prompts the cheap
   helper with the schema + whitelist + DSL vocab + this cycle's facts, validates every
   returned row (contract above), appends valid rows, prints a draft report (written /
   dropped-invalid / dropped-dup / capped). `--dry-run` prints instead of writing.
2. **T2 — Validator parity test** (`scripts/draftContentRows.test.js`): fixture rows
   that the loader would skip MUST be rejected by the script's validator too — parity
   asserted against `loadEventContentLedger_` directly (require the module, feed both
   the same rows, diff verdicts).
3. **T3 — First supervised run** (one cycle): run with rows written `Active=no`; Mike
   (or a session on his go) reviews in-sheet, flips survivors to `yes`. Acceptance:
   loader's next-cycle log shows `skipped=0` for auto rows; drawn lines appear in
   LifeHistory with the row's source tag.
4. **T4 — Auto-active**: flip default to `Active=yes` (fail-closed loader + caps are
   the standing guards). Wire into the post-cycle routine (same slot as
   `routePatternSeeds`-era post-cycle scripts / build-world-summary) so it runs without
   anyone remembering it.

## Risks / boundaries

- **Voice drift**: cheap-model lines going off-tone. Bounded by pool mechanics (a bad
  line is one draw among many, weight ≤1) + the T3 supervised gate + `auth:auto` sweep.
- **Pool flooding**: caps + dedup + prune keep the tab from becoming its own bloat tab
  (the 6-seed-ledgers lesson).
- **Not in scope**: new sources, new DSL fields, engine-side changes. The loader and
  composer are untouched — this plan only automates the authoring side of an existing,
  deployed seam. Any new DSL field (e.g. `dial=`) is its own engine change, separate go.

## Status

- 2026-07-06 — Drafted (S298, engine-sheet, Mike-direct "go spec it"). Whitelist
  pre-req shipped + sandbox-deployed same session (4abf4b52). Build (T1) awaits Mike's
  go on the engine.49 row.
