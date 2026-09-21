---
title: Civic week boundary — stage machine and batch runs
created: 2026-09-21
updated: 2026-09-21
type: plan
tags: [civic, architecture, draft]
sources:
  - Builder direction 2026-09-21 — Sunday works over feels; terse decisions; whole sim heading to batch with a ~24h window; hearing must be able to matter
  - docs/research/2026-09-21-batch-inference-options.md — Anthropic Message Batches adopt, OpenRouter batch watch
  - logs/civic-cron.log — C108 Sunday chain HALT at the voice step (2026-09-20)
  - scripts/cron-civic-run.js — STAGES map, callOpenRouter, runChain / runClose
pointers:
  - "[[plans/2026-09-19-civic-wake-game-loop]] — parent (civic.38); this plan is its Sunday-realignment open question"
  - "[[reference/CIVIC_GAME_LOOP]] — current shape; update its §2 and §7 when this lands"
  - "[[research/2026-09-21-batch-inference-options]] — research basis"
  - "[[index]] — registered same commit"
---

# Civic week boundary — stage machine and batch runs

**Goal:** The week boundary closes the civic week mechanically and opens the next one, without any single model failure stopping the write, and with model work run as batches that have ~24 hours to finish.

**Architecture:** Replace the one clock-timed Sunday chain with an idempotent stage machine. A cheap no-model `tick` runs often, reads a per-cycle state file, and advances every stage whose inputs exist. Mechanical stages (fold, petition sweep, vote stamping, gate) never wait on a model. Model stages are submitted as a batch and collected on a later tick; a rejected or expired seat is resubmitted in the next window, independently of every other seat. Decisions are structured and character-capped; prose is not this system's job.

**Terminal:** research-build designs; scripts by kimi's lane (codex holds it until kimi returns 2026-09-22 night); no engine-sheet work except the engine-fired signal already in the chain guard.

**Status:** Draft. Not started. No crontab change is proposed until the builder installs the new schedule.

**Why now:** the old Sunday chain halted on C108 because two council voices returned incomplete JSON, and its mechanical close (`runClose`, the only path into Initiative_Tracker) sat behind them (`HALT: 2 voice(s) failed — fix or rerun before projects`). The hearing decides nothing today (the engine votes on the stamped cycle). The builder does not need Sunday to feel like anything; it needs to work.

**Acceptance criteria:**
1. Kill or corrupt any one seat's model output: the close still folds moves, sweeps petitions, stamps votes, gates and writes the tracker, and only that seat is marked pending.
2. Run `tick` twice in a row on the same cycle: the second run does nothing (idempotent; no duplicate ledger lines, no second batch submitted).
3. A batch submitted on day N is collected on a later tick; results are validated with the existing deterministic checks and grounding gate; an invalid or expired result becomes one resubmit in the next window, never an inline retry loop.
4. Every civic model output is structured and character-capped; a run shows no statement above its cap.
5. `node scripts/cron-civic-game.test.js` extended with synthetic stage-state fixtures (no network, temp dir); a fake batch client stands in for the API.
6. The old crons keep running until the builder swaps the schedule; the new machine runs dry-run first.

## Tasks

### Task 1: Stage state and `tick`

- **Files:** `scripts/cron-civic-run.js` — modify (STAGES map at `:2791`; add `tick`); new state file `output/cron-civic/week_state_c{XX}.json`.
- **Steps:** (1) Define stage records `{stage, status: waiting|ready|submitted|collected|done|failed, inputs, batchId?, attempts, updated}` in the state file. (2) `tick` reads it, computes which stages are ready from their inputs (engine fired for the cycle, close outputs present, batch results available) and advances only those. (3) Every existing stage keeps working when called by name, so the crontab stays valid.
- **Verify:** acceptance 2; fixtures for ready, waiting and already-done states.

### Task 2: Mechanical close, model-free

- **Files:** `scripts/cron-civic-run.js` (`runClose`), `scripts/applyTrackerUpdates.js`.
- **Steps:** Split `runClose` so the fold, petition sweep, vote stamping, mechanical gate and apply run on the ledger alone. Check first whether the clerk verdict step uses a model; if it does, it becomes a batch stage or a deterministic check, not a blocker. Voices no longer gate it.
- **Verify:** acceptance 1.

### Task 3: Batch client and submit/collect stages

- **Files:** a small batch client module (genuinely new — needs builder approval per the fix-don't-add rule); `scripts/cron-civic-run.js`; `scripts/cron-work-wake.js`.
- **Steps:** (1) `submit`: build every seat's pack and prompt, send one Anthropic batch with a `custom_id` per seat and cycle, store the batch id in the state file. (2) `collect`: poll status with no model, stream results by `custom_id`, run the existing validation and grounding on each. (3) Resubmit only rejected or expired seats. (4) Set effort low and cap output tokens; on the strong models thinking bills as output. (5) Keep the same pack builders (`buildPack`) and move validators; only the transport changes.
- **Verify:** acceptance 3 and 4 against a fake client.

### Task 4: Directive and session from close output

- **Files:** `scripts/cron-civic-run.js` (`runDirective`, hearing stages).
- **Steps:** The directive is built after the close, aimed at seats that were passed over or have an unanswered demand. The hearing/session reports what the close produced and decides nothing; its output is structured. This is the seam where coalition stances attach later (next plan).
- **Verify:** dry-run shows the directive naming only seats the close left passed-over or unanswered.

## Sequencing and cost

- **Provider:** Anthropic Message Batches is the research verdict (50% off, ~24h max window, most batches under an hour, caching stacks, all current Claude models supported). OpenRouter's batch API exists but per-model availability for our current models is unverified; watch it.
- **Cost estimate (from the research, estimate only):** about 44 wakes a week at ~6.5k input and 400 output tokens is roughly $1.60 a month on Sonnet 5, $4 on Opus 5, $8 on Fable 5.1 at batch prices. Model choice per seat is a builder call once outputs are compared.
- **Wake cadence under batch:** the Mon–Thu datawake and the work-wake packs can move to submit-in-the-evening, collect-in-the-morning; turn results lag up to a day, which the loop tolerates.
- **Build order:** Tasks 1–2 first (they fix the failure mode with no new provider); Task 3 after the API key path is confirmed; Task 4 last.

## Open questions

- [ ] **Anthropic API key in this environment** — other scripts reference it; not verified for the civic cron's runtime. Confirm before Task 3.
- [ ] **Clerk verdict — model or deterministic?** Read before Task 2.
- [ ] **New batch client file** — builder approval to add it (fix-don't-add rule).
- [ ] **Which model per seat** — Sonnet 5 first to evaluate; Opus 5 if the grounding gate needs it.
- [ ] **Schedule** — tick frequency and the Sunday slot; builder installs the crontab.
- [ ] **Coalitions** — the hearing that matters; its own plan after the loop runs (structured stances, deterministic count).
- [ ] **Datawake timing** — the 06:15 angle wake reads the datawake lane (crontab comment); batch lag needs that dependency checked.

## Changelog

- 2026-09-21 (research-build) — Draft filed from builder direction and the batch research.
