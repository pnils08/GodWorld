---
title: Civic week boundary — stage machine and batch runs
created: 2026-09-21
updated: 2026-09-21
type: plan
tags: [civic, architecture, draft]
sources:
  - Builder direction 2026-09-21 — Sunday works over feels; terse decisions; whole sim heading to batch with a ~24h window; hearing must be able to matter
  - docs/research/2026-09-21-batch-inference-options.md — OpenRouter batch is the live route (corrected); Anthropic direct needs credits
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

**Architecture:** Replace the one clock-timed Sunday chain with an idempotent stage machine. A cheap no-model `tick` runs often, reads a per-cycle state file, and advances every stage whose inputs exist. The fold, petition sweep, vote stamping and the deterministic checks never wait on a model or on a missing voice; the model audits (gate sanity-read, clerk) are deferred verdict stages that gate the apply without being able to halt the week. Model stages are submitted as a batch and collected on a later tick; a rejected or expired seat is resubmitted in the next window, independently of every other seat. Decisions are structured and character-capped; prose is not this system's job.

**Terminal:** research-build designs; scripts by kimi's lane (codex holds it until kimi returns 2026-09-22 night); no engine-sheet work except the engine-fired signal already in the chain guard.

**Status:** Draft. Not started. No crontab change is proposed until the builder installs the new schedule.

**Why now:** the old Sunday chain halted on C108 because two council voices returned incomplete JSON, and its mechanical close (`runClose`, the only path into Initiative_Tracker) sat behind them (`HALT: 2 voice(s) failed — fix or rerun before projects`). The hearing decides nothing today (the engine votes on the stamped cycle). The builder does not need Sunday to feel like anything; it needs to work.

**Acceptance criteria:**
1. Kill or corrupt any one seat's model output: the deterministic checks still pass on the arrived voices, the fold, petition sweep and vote stamping run, and only that seat is marked pending. The apply waits for the model verdicts (deferred, not failed) but never for a missing voice.
7. Make the sanity-read or clerk model unreachable: the run records a deferred verdict and retries next window; nothing is applied on a deferral, nothing is dropped, and a real FAIL verdict still blocks.
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

### Task 2: Apply gated by deterministic checks; model audits become deferred verdicts

- **Files:** `scripts/cron-civic-run.js` (`runClose` completeness check at ~`:1754`, clerk call at ~`:1758`, gate call at ~`:1845`), `scripts/cron-civic-gate.js` (sanity-read at `:332`), `scripts/applyTrackerUpdates.js`.
- **Evidence (agy review, verified at HEAD):** today three things sit between the ledger and the tracker write and two of them are models. (1) `runClose` halts the whole close if any expected voice JSON is missing (`process.exit(1)`). (2) The clerk is an inline `deepseek-chat` call whose check 1 is "every expected office produced statements"; `--apply` requires `clerk.overall === 'pass'`. (3) `cron-civic-gate.js:332` makes a fail-closed sanity-read model call on the final write-set. So one bad or missing voice, or one model outage, blocks the apply — the C108 failure, twice over.
- **Rulings (research-build mechanism, 2026-09-21):**
  1. **Apply is gated by deterministic checks plus model verdicts that have not returned FAIL (reconciled 2026-09-21 with ruling 3; the two were worded as if in conflict):** schema, `normalizeTrackerWrite`, row caps, the single legal Status transition, forward-only fields, grounding. Those are the checks that cannot be wrong about the sheet.
  2. **Missing voices are pending, not a halt.** Only voices that arrived flow into the fold; a missing seat is listed in the run record and resubmitted in the next window. Clerk check 1 becomes a report line.
  3. **The model sanity-read and the clerk stay, as batch verdict stages** that run on the write-set before apply. An unreachable or late model is *deferred* (retried next window, apply waits), never treated as a FAIL; a real FAIL verdict still blocks. The 24-hour window means waiting costs nothing, and the sanity-read exists because it caught real errors (INIT-007's clock), so it is not dropped.
  4. **Verdict cutoff (research-build, builder-delegated 2026-09-21):** a verdict still missing 6 hours after the engine fires no longer holds the apply. The apply proceeds on the deterministic checks and the run record raises the missing verdict for the builder (never silent, never dropped); a real FAIL verdict still blocks at any time, and a verdict that arrives late is recorded as an audit and flagged if it disagrees. Measured batches finish in 6–13 minutes, so the 24h window is the worst case, not the plan; 6 hours lands before the Monday 05:45 datawake for a Sunday 21:00 fire. Superseded text: "If a verdict is still missing at the end of its window, the run record raises it for the builder; it never silently applies."
- **Verify:** acceptance 1 (rewritten) and 7.

### Task 3: Batch client and submit/collect stages

- **Files:** `scripts/orBatch.js` — refactor into an importable module first (today it runs its CLI dispatch and hard-exits on a missing key at load, `:25` and `:107-109`, so a `require` from the civic cron would kill the process; guard with `require.main`, read the key lazily, keep the CLI), then extend to multi-request batches; `scripts/cron-civic-run.js`; `scripts/cron-work-wake.js`.
- **Steps:** (1) `submit`: build every seat's pack and prompt, send one OpenRouter batch (via `orBatch.js`) with a `custom_id` per seat and cycle, store the batch id in the state file. (2) `collect`: poll status with no model, stream results by `custom_id`, run the existing validation and grounding on each. (3) Resubmit only rejected or expired seats. (4) Set effort low and cap output tokens; on the strong models thinking bills as output. (5) Keep the same pack builders (`buildPack`) and move validators; only the transport changes.
- **Verify:** acceptance 3 and 4 against a fake client.

### Task 4: Directive and session from close output

- **Files:** `scripts/cron-civic-run.js` (`runDirective`, hearing stages).
- **Steps:** The directive is built after the close, aimed at seats that were passed over or have an unanswered demand. The hearing/session reports what the close produced and decides nothing; its output is structured. This is the seam where coalition stances attach later (next plan).
- **Verify:** dry-run shows the directive naming only seats the close left passed-over or unanswered.

## Sequencing and cost

- **Provider (corrected 2026-09-21):** OpenRouter batch, on the key the project already holds. `scripts/orBatch.js` already ran Sonnet 5 batches on 2026-08-29; its header says the project holds no Anthropic API credits, so the direct Anthropic batch path is unavailable until credits are added. OpenRouter batch gives 50% off with a 24h window and passes Claude, Gemini, Mistral, OpenAI, DeepSeek v4 and Kimi K3 through as `:batch` endpoints; the models the civic seats use today (`deepseek-chat`, `kimi-k2`, `llama-3.3-70b`, `qwen3-235b`) have none. Four `:batch` endpoints cost MORE than standard (deepseek-v4-flash-0731 2.75x, kimi-k3, qwen3.5-9b, glm-5.2) — check the price before assigning a seat. See [[research/2026-09-21-batch-cost-and-model-variety]].
- **Cost (measured then estimated, from [[research/2026-09-21-batch-cost-and-model-variety]]):** current civic volume costs about $0.18 a week (~$0.76 a month; only the directive and mayor calls log usage, the rest is estimated from stored file sizes). The same volume at batch price is about $0.57 a week on Sonnet 5, $1.42 on Opus 5, $2.85 on Fable 5.1 (~$12 a month). The numbers are small either way; model choice per seat is about quality and faction variety, not cost.
- **Wake cadence under batch:** the Mon–Thu datawake and the work-wake packs can move to submit-in-the-evening, collect-in-the-morning; turn results lag up to a day, which the loop tolerates.
- **Mags on Fable 5.1 (estimate from measured output sizes, assumes the Claude batch route works):** about $0.07 a Saturday run, roughly $0.29 a month.
- **Build order:** Tasks 1–2 first (they fix the failure mode with no new provider); Task 3 after checking each chosen model's `:batch` price; Task 4 last.

## Failure handling (measured 2026-09-21 — [[research/2026-09-21-batch-cost-and-model-variety]] §Failure evidence)

Probe and history, about $0.006 spent. Gemini and DeepSeek batches completed in 6–13 minutes; the August Sonnet 5 batches ran 10–12 minutes. What actually failed, and the rule each one forces:

| Failure seen | Rule for the stage machine |
|---|---|
| One bad request (empty messages, bad model, duplicate `custom_id`, a disallowed parameter) fails the WHOLE batch at validation, in seconds | Validate every request locally before submit; one model per batch; a `custom_id` is `{cycle}-{seat}-{attempt}`, unique by construction |
| Huge `max_tokens` is priced up front and can 402 | Set `max_tokens` from the seat's cap, never from a default |
| "Succeeded" but unusable: Sonnet 5 spent 31,999 of 32,000 tokens on reasoning and returned null; Gemini truncated JSON at a 300-token cap because mandatory reasoning ate the budget | Keep a per-model parameter profile (reasoning off or a floor, token headroom); treat `finish_reason: length`, null content and unparseable JSON as invalid, then resubmit next window |
| Results come back out of submit order | Match on `custom_id` only |
| A model's `:batch` route can stop working: every Claude `:batch` submit (Sonnet 5, Sonnet 4.6, Haiku 4.5) was rejected today ("does not have a :batch endpoint") although the same route ran Sonnet 5 on 2026-08-29; cause not verified | Probe each model with a one-request batch at the start of a window before sending the full one; if the probe fails, defer that seat and record it, never block the week; `tick` may fall back to the synchronous path for a seat the builder marks essential |
| A late or failed result | Each seat has its own state; nothing shared waits on it (Task 2 rulings) |

Consequence for model choice (see the model ruling in Open questions): batch is for cost and failure isolation, not for stronger models. Gemini and DeepSeek batch endpoints work today; Claude-on-batch is unproven, which no longer matters since no seat needs Claude for strength. The account balance is about $8.4–8.6 of $70 purchased — funding is a builder item.

## Open questions

- [x] **API key** — settled: OpenRouter batch runs on the existing key (`scripts/orBatch.js`). Direct Anthropic batch needs credits the project does not hold; optional later.
- [x] **Clerk verdict — model or deterministic?** Answered by agy's review, verified: an inline model call that gates the apply, plus a model sanity-read in the gate. Handled by Task 2 rulings.
- [x] **New batch client file** — not needed: extend `scripts/orBatch.js` (today one packet per submit; civic needs many requests per batch with a `custom_id` per seat). Fix-don't-add holds.
- [ ] **Why the Claude `:batch` route is rejected today** — unverified; ask OpenRouter or check the models page before any Claude seat depends on batch. Direct Anthropic credits are the alternative.
- [x] **Which model per seat** — RULED 2026-09-21 (builder): no model upgrade for civic. A stronger model buys more reasoning, not better output; the prompt (the pack and the output contract) is what matters, and the current cheap models already do the job (~$0.18 a week). Keep each seat's current model; move a seat to batch only where its model has a working `:batch` endpoint priced at or below standard, otherwise it stays synchronous. Faction variety comes from the existing model mix, not from buying strength. Related prior note: builder 2026-08-29, structured jobs do not need a high-end model, the skill is the product (sl-godworld). Fable/Opus for Mags or Elias Varek is shelved as an experiment: [[2026-09-22-agent-model-fit-test]] tests it (builder adds Anthropic credit 2026-09-22); revisit this ruling only on its result.
- [x] **Schedule** — RULED 2026-09-21 (builder), shape only: `tick` runs hourly all week (no-model, idempotent); fold, petition sweep and vote stamping advance as soon as the engine has fired; model verdicts get the ~24h window; apply gates on verdicts. The slot depends on the engine fire time — builder installs the crontab. Open check: whether the Monday datawake needs this week's apply or tolerates last week's board.
- [ ] **Coalitions** — the hearing that matters; its own plan after the loop runs (structured stances, deterministic count).
- [ ] **Datawake timing** — the 06:15 angle wake reads the datawake lane (crontab comment); batch lag needs that dependency checked.

## Changelog

- 2026-09-21 (research-build) — Builder ruled model choice: no upgrade, prompt over model strength; batch only where a cheap working `:batch` exists. Kimi picks up Tasks 1-2 first.
- 2026-09-21 (research-build) — Failure handling table added from the measured probe: whole-batch validation failures, reasoning-eaten output, out-of-order results, Claude `:batch` rejected today; per-seat state and one-request probes.
- 2026-09-21 (research-build) — Antigravity's review ([[../../output/antigravity/2026-09-21-review-civic39-stage-machine]]) verified: the close is not model-free today (voice-completeness halt, clerk model, gate sanity-read). Task 2 rewritten (deterministic apply gate, deferred model verdicts, missing voices pending); Task 3 gains the orBatch module refactor.
- 2026-09-21 (research-build) — Corrected provider: OpenRouter batch via existing `orBatch.js`, not direct Anthropic; measured current cost added; batch client file no longer new.
- 2026-09-21 (research-build) — Draft filed from builder direction and the batch research.
- 2026-09-21 (research-build) — Builder ruled the schedule shape (hourly tick, stages advance on inputs, verdict window, apply gates on verdicts); slot stays builder-installed.
- 2026-09-21 (research-build) — After agy review: apply-gate wording reconciled; verdict cutoff 6h after the engine fire (apply proceeds on deterministic checks, run record flags the missing verdict).
