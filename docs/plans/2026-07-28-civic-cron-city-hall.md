---
title: Civic Cron City-Hall — Core Build Plan
created: 2026-07-28
updated: 2026-07-28
type: plan
tags: [civic, architecture, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md §civic.15
  - docs/research/2026-07-28-civic-cron-city-hall.md — research basis + Mike's direction log (S343)
  - docs/plans/2026-07-20-headless-newsroom-pipeline.md — the sibling pattern (Phase 3 reserved this slot)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (civic.15)"
  - "[[../research/2026-07-28-civic-cron-city-hall]] — research basis; direction log lives there"
  - "[[mara-vance/INITIATIVE_TRACKER_CONTRACT]] — canon write contract for the apply gate"
  - "[[index]] — registered same commit"
---

# Civic Cron City-Hall — Core Build Plan

**Goal:** All civic offices doing city work Sun–Thu on crons with no human in the loop — Sunday decides, Mon–Thu voices data, Fri–Sat they're citizens.

**Architecture:** A `cron-civic-run.js` staged pipeline (the civic sibling of `scripts/cron-desk-run.js`): Sunday forks off `run-cycle` into a headless city-hall-prep → a **directive agent** (replaces Mara-on-claude.ai — writes "what the offices must answer on") → Mayor → voices → projects → Clerk → mechanically-gated `applyTrackerUpdates.js --apply`. Mon–Thu wakes are office-holders voicing their city-data domain (crime → Police Chief, crisis/OARI → Emergency Management) into staged output the media fanout can source. Personas load headlessly from `.claude/agents/civic-*` files exactly as `cron-desk-writer.js` loads desks; **per-faction OpenRouter model assignment is deliberate** — different models per faction for genuine political friction. Approval refinement / political bonds / replacement pressure / elections are explicitly **fine-tune, after dry runs** — not in this plan's tasks.

**Terminal:** research-build (Phases 0–1 design + eval) → engine-sheet (Phases 2–3 build) → dry runs reviewed via digest (Phase 4)

**Pointers:**
- Prior work: `scripts/cron-desk-run.js` + `scripts/cron-desk-writer.js` + `scripts/cron-rhea-gate.js` (the pattern being reused); `.claude/skills/city-hall/SKILL.md` v2.1 + `.claude/skills/city-hall-prep/SKILL.md` v1.11 (the flow being made headless)
- Related plan: [[2026-07-20-headless-newsroom-pipeline]] (Phase 3 = this slot)
- Research basis: [[../research/2026-07-28-civic-cron-city-hall]]

**Acceptance criteria:**
1. A full Sunday chain runs unattended end-to-end on a real cycle fire: prep packets lint clean, directive agent output present, all office/project JSONs land, Clerk audit passes, tracker updates apply only after the mechanical gate — zero human touches, morning digest shows the run.
2. Mon–Thu office wakes produce per-office data-voice JSON from live domain data, staged where the media fanout can read them; failures alert Discord and skip, never silently proceed.
3. At least 2 factions demonstrably run on different model families (run records show provider/model per office).

---

## Tasks

### Phase 0 — Ground truth + the office map (research-build)

#### Task 0.1: Dump and verify the Civic_Office_Ledger
- **Files:** existing read scripts (`scripts/queryLedger.js` / `scripts/dumpLedger.js` — read-only) — read; `output/civic-office-ledger-dump_c{XX}.json` — create
- **Steps:**
  1. Dump all Civic_Office_Ledger rows (Mike's figure: ~35 office-holders). Capture POPID, name, office/role, approval, faction/appointment status.
  2. Reconcile against `output/desk-packets/truesource_reference.json` (9-member council roster) and the 13 existing `.claude/agents/civic-*` dirs — note which office-holders have voice agents and which of the ~35 do not.
- **Verify:** dump file row count recorded; mismatch list (ledger rows without agents / agents without ledger rows) written into the dump file header
- **Status:** [x] DONE S343 — 35 offices verified; dump at `output/civic-office-ledger-dump_c102.json` (local, output/ untracked); reconciliation in dump `_meta`

#### Task 0.2: `scripts/civic-office-map.json` — the civic persona-map
- **Files:** `scripts/civic-office-map.json` — create (sibling of `scripts/persona-map.json`)
- **Steps:**
  1. One entry per office-holder: `{ office, popid, name, agentDir (nullable), faction, dataDomain, dataSources: [sheet tabs / world_summary sections / output files], dutyDays: "sun-thu", model: null }`.
  2. Data-domain assignments from the ledger dump — e.g. police-chief → crime data slices, emergency-management → OARI/crisis, okoro → stabilization-fund disbursements. Leave `model` null until Task 1.2 fills it.
- **Verify:** `node -e "JSON.parse(require('fs').readFileSync('scripts/civic-office-map.json'))"` → clean; every Task 0.1 ledger row has an entry
- **Status:** [x] DONE S343 — 35 entries, 0 unassigned domains, 21 agent-less offices flagged; dataSources marked candidate-verify-at-build

### Phase 1 — Voice bake-off: per-faction OpenRouter models (research-build)

#### Task 1.1: Bake-off harness
- **Files:** `scripts/cron-civic-eval.js` — create (thin: reuses `cron-desk-writer.js`'s OpenRouter call + persona-load pattern)
- **Steps:**
  1. Input: one real prior-cycle packet (`output/civic-voice-workspace/{office}/current/pending_decisions.md` from C101) + the office's IDENTITY/RULES files as system prompt.
  2. Run the same packet across candidate models (candidates to test: `deepseek/deepseek-chat`, `google/gemini-3.5-flash`, `moonshotai/kimi-k2`, `qwen/qwen3-235b`, `mistralai/mistral-large` — final list at run time from OpenRouter availability/pricing).
  3. Score each output: (a) decision-JSON schema conformance, (b) `trackerUpdates` phase-vocabulary validity per [[mara-vance/INITIATIVE_TRACKER_CONTRACT]], (c) canon-name check (reuse `scripts/canon-name-check.js` prechecks), (d) voice distinctness — judged by a different-family model.
- **Verify:** `node scripts/cron-civic-eval.js --office mayor --cycle 101 --dry` → per-model scorecard JSON in `output/cron-civic/eval/`
- **Status:** [x] DONE S343 — harness built; 4 friction seats × 5 models run on real C101 packets; all writers 0 engine-leaks, 0 real fabrications; glm-4.7 dropped (empty content 3/4 offices)

#### Task 1.2: Per-faction model assignment
- **Files:** `scripts/civic-office-map.json` — modify (fill `model` fields)
- **Steps:**
  1. From scorecards, assign models with the **friction rule**: OPP faction, CRC faction, Mayor's office, and independents each get a *different* model family where scores permit; projects/Clerk can share the cheapest passing model.
  2. Record the assignment rationale + costs in the research file's Direction log.
- **Verify:** no two of {mayor, opp, crc, ind} share a model family in the map
- **Status:** [x] DONE S343 — mayor=mistral-large(10), OPP=qwen3-235b(10), IND=kimi-k2(9), CRC=deepseek(7.5); 4 distinct families verified; STAFF/projects=deepseek

### Phase 2 — Sunday chain core (engine-sheet)

#### Task 2.1: Headless prep stage
- **Files:** `scripts/cron-civic-run.js` — create (staged like `cron-desk-run.js`: `--stage=prep|directive|decide|voices|projects|close`)
- **Steps:**
  1. `--stage=prep`: deterministic port of city-hall-prep Steps 1–4 — read `world_summary_c{XX}.md`, `engine_review_c{XX}.md`, tracker snapshot; build per-office `pending_decisions.md` packets; the interactive "Mike's pressure" input uses the existing AUTO path (engine HIGH ailments) unconditionally; run `scripts/lintCivicPackets.js` on every packet, fail-loud.
  2. State between stages = JSON files under `output/cron-civic/` (mirror of `output/cron-compare/`).
- **Verify:** run against the last fired cycle's artifacts → packets exist for every duty office, linter exit 0
- **Status:** [x] DONE S344 (d586c915) — 10 packets on C102, lint clean; packets under output/cron-civic/packets/ (workspace untouched); constituent crisis/credit questions added per Mike-direct S344

#### Task 2.2: Directive agent (Mara-directive replacement)
- **Files:** `scripts/cron-civic-run.js` — modify (`--stage=directive`)
- **Steps:**
  1. One headless model call (system prompt from `.claude/agents/` Mara material or a new directive persona file — decide at build), input = fresh run-cycle summary + engine review HIGHs, output = `output/mara-directives/mara_directive_c{XX}_AUTO.txt` in the exact format prep already consumes ("what the offices must answer on").
  2. Model: different family from the Mayor's model (friction rule applies to the directive too).
- **Verify:** directive file exists and prep consumes it without falling back
- **Status:** [x] DONE S344 (09bfb536/d3d2f074) — gemini-flash, Mara in-world persona only; 8 blocks C102; prep consumes AUTO without fallback

#### Task 2.3: Cascade stages (decide → voices → projects → close)
- **Files:** `scripts/cron-civic-run.js` — modify
- **Steps:**
  1. `--stage=decide`: Mayor only — headless call per `civic-office-map.json` model, output `output/civic-voice/mayor_c{XX}.json`; inject `## MAYOR'S DECISIONS THIS CYCLE` into remaining packets (port of city-hall Step 3 cascade).
  2. `--stage=voices`: Layer-2 offices in parallel, per-office models from the map; `--stage=projects`: Layer-3 project directors + Baylight, only where a voice decision touched their initiative (port of Step 5 trigger rule).
  3. `--stage=close`: Clerk verification call + `scripts/assembleDecisions.js` → dry-run `applyTrackerUpdates.js` → **mechanical gate** (Task 2.4) → `--apply` → `civic_sentiment_c{XX}.json`; write `## /city-hall` production-log section + media handoff (port of Step 7).
- **Verify:** full chain on a fired cycle: all expected `output/civic-voice/*_c{XX}.json` present (Step 5.5 checklist ported), clerk audit written, tracker rows updated
- **Status:** [x] DONE S344 (19c69198) — full C102 dry chain green; flat trackerUpdates contract; milestone notes normalized to primary voice at close

#### Task 2.4: The apply gate — replace the human gate with mechanism
- **Files:** `scripts/cron-civic-gate.js` — create (sibling of `cron-rhea-gate.js`)
- **Steps:**
  1. Deterministic prechecks, fail-closed: `scripts/validateTrackerUpdates.js` clean; every `trackerUpdates.ImplementationPhase` in the 20-value contract vocabulary; no POPID/engine-verbiage leaks in statement text (`scanEngineVerbiage` reuse); diff size sanity (a decision cycle touching more than N tracker rows blocks).
  2. One cheap different-family model call (independence rule: family ≠ any writer family in the run) sanity-reading the decision set for contradictions/fabrications.
  3. Any failure → skip `--apply`, leave decisions staged in `output/cron-civic/staged/`, Discord webhook alert (reuse `notifyFanoutFailures` pattern), digest entry. `utilities/cycleRollback.js` documented in the script header as the undo path.
- **Verify:** gate blocks a deliberately-malformed fixture (bad phase value) with exit 2 + Discord post; passes a clean C101 replay with exit 0
- **Status:** [x] DONE S344 (19c69198) — sanity-read audits ASSEMBLED write-set (Mike ruling); fixture blocks exit 2 + Discord; clean C101 replay exit 0

### Phase 3 — Mon–Thu data-voice wakes (engine-sheet)

#### Task 3.1: Office data lanes
- **Files:** `scripts/cron-civic-run.js` — modify (`--stage=datawake --fanout`)
- **Steps:**
  1. Per duty rotation (subset of offices per day, LRU like `newsroom-fanout.js`): build a small domain-data slice per office from its `dataSources` in the map (deterministic reads only), one headless call in office voice → `output/cron-civic/datawake/{office}_{date}.json` (statement/action + what number moved).
  2. Stage where the media fanout's angle stage can read it as source material (same contract as `desk_signal` lanes — exact wiring agreed with the newsroom pipeline owner at build).
- **Verify:** one dry datawake run produces JSONs for the day's rota; media angle stage can parse one as a source
- **Status:** [x] DONE S344 (4fa458e2) — datawake stage + LRU rota + numeric-grounding gate + bloc spokespeople; loadLane merges into civic desk lane

#### Task 3.2: Fri–Sat life-wake routing
- **Files:** `scripts/citizen-wake.js` — read; wiring change TBD at build (routing, not new machinery)
- **Steps:**
  1. Ensure office-holders' POPIDs are eligible in the existing citizen-wake pool on Fri–Sat, and *excluded from office wakes* those days (dutyDays check in the fanout).
- **Verify:** rota builder never schedules an office wake Fri/Sat; a Fri citizen-wake for an office-holder POPID runs through the normal citizen path
- **Status:** [x] DONE S344 (4fa458e2) — Fri/Sat/Sun guard in datawake; citizen-wake pool already includes office POPIDs, no change needed

### Phase 4 — Dry runs (probation)

#### Task 4.1: Crontab (dry) + digest
- **Files:** crontab — modify (engine-sheet, approval per live-automation rules); `scripts/newsroom-digest.js` — modify (add civic section) or sibling digest
- **Steps:**
  1. Wire Sunday chain + Mon–Thu datawakes with `--no-apply` (gate runs, sheet write skipped) for 2 dry cycles; digest shows what *would* have applied.
  2. Mike reviews digests; flip `--apply` on when two consecutive dry Sundays are clean.
- **Verify:** 2 dry Sunday digests reviewed; flip decision recorded in the research Direction log
- **Status:** [~] WIRED DRY S344 (bda86d40) — guarded --stage=chain Sun 14:30+21:00, datawake Mon-Thu 05:45, civic digest section; REMAINING: 2 clean dry Sundays -> Mike flips --apply

---

## Parked for fine-tune (direction-logged, deliberately NOT tasks)

Per Mike S343: build the basic core, dry-run, then tune. These live in the research file's Direction log and graduate to tasks only after Phase 4:
- Approval-system refinement (nothing handed to officials easily; approval as a consequence engine)
- Political bonds (mayor ↔ appointed offices) + replacement pressure (bad bond + low approval → replacement)
- Elections
- Full 35-office coverage (core can start with the 13 agented offices; the map from Task 0.2 names the gap)

---

## Open questions

- [ ] Directive-agent persona source: reuse Mara's `.claude/agents`/docs material or author a new lightweight directive persona file? (Blocks Task 2.2 — decide at build with Mike.)
- [ ] Datawake → media handshake contract: exact file/lane shape the newsroom angle stage reads. (Blocks Task 3.1 step 2 — agree with headless-newsroom plan owner.)
- [ ] Which offices beyond the 13 agented ones get voices first (needs Task 0.1 dump). (Blocks Task 0.2 completeness, not its creation.)

---

## Changelog

- 2026-07-28 — Initial draft (S343). Shape from Mike's think-tank direction (research file Direction log); tasks scoped to the basic core only.
- 2026-07-29 — S344: Phases 2–4 built and dry-wired. Media-visibility gap fixed (`decisions_lane_c{XX}.json` + `loadLane` merge); civic-terminal Sunday session retired from cron path. Weekly lifecycle table added to [[../engine/CRON_PIPELINE_MAP]].
