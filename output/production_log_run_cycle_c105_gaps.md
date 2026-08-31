# Cycle 105 gap log

## LEG: /pre-flight (G-PF)

**Run:** 2026-08-30 (S403, engine-sheet) — `node scripts/preflightInputCheck.js --cycle=105`
**Verdict:** READY (with warnings), exit 0. C105 unfired at time of writing; live `cycleCount` 104.
**Total gaps:** 8 (3 HIGH / 4 MED / 1 LOW)

Pre-flight passed. The gaps below are what it *reported as warnings* or *did not look at* — in both cases the underlying condition is worse than the verdict line suggests.

## HIGH-severity gaps

### G-PF7: coverage ratings resolve every article to one wrong domain since the edition reformat

- **Severity:** HIGH
- **Category:** quiet-pipe
- **What happened:** `scripts/rateEditionCoverage.js --dry-run` against `editions/cycle_pulse_c104.txt` finds 7 articles and maps **all 7** to `(unknown)` section → COMMUNITY, emitting a single `COMMUNITY: 3 (7 articles)` rating and exiting 0. Sports (Anthony Raines, Tanya Cruz), faith (Sharon Okafor) and weather (Noah Tan) pieces are all labelled COMMUNITY. Cause: the C104 edition carries no section headers at all — `====` separators plus article titles and `## INTAKE` blocks — while the detector's three patterns (`SEP_HEADER_RE` / `MD_HEADER_RE` / `BARE_HEADER_RE`, `scripts/rateEditionCoverage.js:135-137`) each require a name from `SECTION_NAMES` on its own line. `currentSection` never promotes, so `section: currentSection || '(unknown)'` (`:194`) falls through for every article.
- **Why it matters:** This is the S196 G-P6 failure the script's own v2.1 header says it closed, recurring in a new shape. The v2.1 fail-loud gate (`:260`) guards **article count == 0** only; 7 articles with 0 resolved domains sails past it. The engine reads this channel through `applyEditionCoverageEffects_` to ripple media influence into domain dynamics — applying it would push a positive COMMUNITY signal and **zero** SPORTS/CIVIC/HEALTH signal into the world. `Edition_Coverage_Ratings` currently ends at C102 (77 rows); C103 and C104 have no rows, so nothing wrong has been written yet. Compounding: the script has **no cron line** — it is a manual step nobody has run since the edition format changed.
- **Suggested action:** promote to ROLLOUT. Two parts, and the order matters: (1) widen the gate so "articles found but 0 domains resolved" exits non-zero — the current gate cannot detect the exact failure it was written for; (2) decide the domain source for the new format. Section headers are gone, so either the edition regains them or the detector keys off reporter→domain (the reporter name is already parsed and is a reliable domain proxy — Raines/Cruz sports, Okafor faith, Navarro civic, Mezran health). Do NOT `--apply` until (2) lands.
- **Pointer:** pipeline.62

### G-PF8: the civic Sunday chain halts at mayor-open — city hall has not applied a decision since C104

- **Severity:** HIGH
- **Category:** pipeline-fragility
- **What happened:** Both of today's cron chains (14:30 and the 21:00 late retry, `logs/civic-cron.log`) ran directive → prep (16 packets, lint clean) → **HALT** at mayor-open: `civic-office-mayor attempt 1/2 call failed: mistralai/mistral-large: Provider returned error`. Probed directly against OpenRouter: the model resolves and is listed, and returns **HTTP 429** — `"mistralai/mistral-large is temporarily rate-limited upstream … limit_source: upstream_provider_shared_pool"`. So this is a shared-free-pool throttle, not a dead or renamed model. The mayor seat is configured at `scripts/civic-office-map.json:36`; the caller makes 2 attempts back-to-back (~0.4s apart, per the log timestamps) with no backoff and no fallback seat.
- **Why it matters:** `HALT: Hearing must not start` is correct by design — a hearing without the mayor opening it would be canon garbage — but it makes one rate-limited third-party model a hard stop on the entire civic chain. Downstream: `output/cron-civic/close_c104.json` stays `applied:false`, so the C104 decisions staged on 2026-08-29 never write back, and `Initiative_Tracker` rows INIT-001 / INIT-005 / INIT-007 sit at `NextActionCycle=C104` — which is precisely the "3 past-due" warning pre-flight reports without being able to explain. Two retries 0.4s apart cannot clear a shared-pool 429; the retry policy guarantees the halt rather than surviving it.
- **Suggested action:** promote to ROLLOUT (civic group). Minimum viable: a fallback seat for mayor-open plus real backoff, and unwrap the provider error so the log prints the 429 and the remedy instead of collapsing to "Provider returned error" — two weeks of that string reads like a dead model, not a throttle.
- **Pointer:** civic.26

### G-PF13: `--step=x` silently ran the ENTIRE Saturday chain, publish included

- **Severity:** HIGH
- **Category:** pipeline-fragility
- **What happened:** `arg()` in `scripts/cron-saturday-run.js` read only the spaced form (`indexOf(flag)` then `argv[i+1]`). An `=`-joined flag matched nothing and returned the default — and the default for `--step` is "run every step". Hit live this session: `--step=coverage --cycle=104`, intended as one isolated step, ran audit → curate → narrate → publish → coverage → sweep → sheets → signals. It was harmless only because `--apply` was absent.
- **Why it matters:** `--apply` on this script is the canon door — it ingests the edition and pushes to the permanent NotebookLM notebook. `--step=publish --apply`, a plausible thing to type, would have run the whole chain against live canon with no error and no warning. The two argument styles are used interchangeably across this repo's scripts (`cron-civic-run.js` documents `--stage=prep`), so the wrong one is the easy one to reach for.
- **Suggested action:** FIXED same session — `arg()` now accepts `--flag=value` and `--flag value`, verified on both forms. A flag this script gets wrong writes canon, so it takes both rather than failing on one.
- **Pointer:** pipeline.62

## MED-severity gaps

### G-PF9: pre-flight reports the symptom of a halted civic chain, never the cause

- **Severity:** MED
- **Category:** process-gap
- **What happened:** Pre-flight's Initiative_Tracker step surfaces `STALE: 3 row(s) with past-due NextActionCycle (city hall behind)` and stops there. It has no check on civic chain health — it does not read `output/cron-civic/close_c<XX>.json` for `applied:false`, does not read `gate_c<XX>.json` for `pass:false`, and does not look at `logs/civic-cron.log` for a HALT. The operator reads "READY (with warnings)" and moves on.
- **Why it matters:** The stale rows are a *consequence*; the halt is the *cause*. Answering "why is city hall behind?" today took reading the cron log, the close/gate JSON, and an OpenRouter probe — none of which pre-flight points at. That is the difference between a check that says "READY" and one that is doing all we need it to do.
- **Suggested action:** promote with G-PF7 under pipeline.62 — add a civic-chain-health step to `scripts/preflightInputCheck.js` reading the two JSONs (both already on disk, deterministic, no API call) and reporting `applied` / `gatePass` / last HALT line.

### G-PF10: the C104 apply is blocked twice over — the gate also fails on engine verbiage in canon

- **Severity:** MED
- **Category:** canon-risk
- **What happened:** `output/cron-civic/gate_c104.json` records `pass: false`, one failure: `engine-verbiage — council_d3: [metric-decimal] "0.42 sentiment"`. A council voice quoted a raw engine metric in canon text.
- **Why it matters:** Recorded separately from G-PF8 so it is not lost behind the 429 fix — **fixing mayor-open alone will not let C104 apply.** The gate correctly refuses it, and the canon-is-color rule is the reason: an article restating an engine number writes it into canon twice.
- **Suggested action:** already visible as the AUTO line in `output/production_log_run_cycle_c104_gaps.md`; keep in the civic.26 scope so the two blockers get cleared together.

### G-PF12: the coverage rater was a manual step, so it ran never

- **Severity:** MED
- **Category:** process-gap
- **What happened:** `scripts/rateEditionCoverage.js` had no crontab line and no caller. Nothing scheduled it, so `Edition_Coverage_Ratings` simply stopped at C102 and C103/C104 published carrying no media-feedback signal. Discovering it took running pre-flight by hand and chasing a warning.
- **Why it matters:** G-PF7 (the domain-resolution bug) would have stayed invisible regardless of the fix, because nothing was invoking the code that had the bug. A correct script nobody runs and a broken script nobody runs are the same artifact.
- **Suggested action:** FIXED same session — new `stepCoverage` in `cron-saturday-run.js`, running straight after `stepPublish` in the Saturday chain. Hung off the edition artifact rather than a second cron line so it cannot fire before the file exists or drift onto another cycle's edition. Deliberately **non-fatal**: publish has already ingested canon by that point, so a ratings failure must not strand sweep/sheets/signals — it logs `[COVERAGE FAIL]` loudly instead, and `preflightInputCheck.js` independently reports missing coverage for the previous cycle, so a silent miss is no longer possible the way it was for C103/C104.
- **Pointer:** pipeline.62

### G-PF14: `rateEditionCoverage.test.js` is intermittent under the full suite — needs a fresh look

- **Severity:** MED
- **Category:** pipeline-fragility
- **What happened:** The new test passes 16/16 every time in isolation (`node scripts/rateEditionCoverage.test.js`, ~10s), passes through the runner when filtered (`--filter=rateEditionCoverage`, 9.81s), and passes with the runner's own env (`GODWORLD_TEST_LIVE=0`). Under the full 190-file `npm test` it **failed twice and passed once** (the passing run logged `✓ … (11.63s)` with all 16 assertions ok). The runner uses `stdio: 'inherit'` and no per-test timeout, so on the failing runs the assertions themselves were not reported failing — the file exited non-zero without a visible assertion failure.
- **Why it matters:** Not a defect in the code under test — the rater is separately proven (C102 re-rates byte-identical to the old code; C103/C104 backfilled and verified live). But a flaky test is worse than no test: it trains the reader to ignore a red suite, and this suite already carries one permanently-red file (`djDirect`, missing C94 fixture), so a second intermittent one erodes the signal to nothing.
- **Suspicion, NOT diagnosed:** the test drives the rater as 7 `execFileSync` subprocesses, each loading `lib/env` + `googleapis`. Something in that — resource contention late in a long suite, an inherited env difference, or `execFileSync` defaults (maxBuffer) — is the likely culprit. Deliberately not chased further this session; it wants a fresh look rather than more guessing.
- **Suggested action:** OPEN. Cheapest next step is to capture the failing run's exit code and stderr explicitly (wrap the runner spawn, or have the test print its own exit path) rather than infer from `stdio: 'inherit'`. If subprocess count is the cause, the fix is to export the rater's resolution functions and unit-test them in-process, keeping only one or two subprocess tests for the CLI gates.
- **Pointer:** pipeline.62 (residual)

## LOW-severity gaps

- **G-PF11:** `/pre-flight` with no argument always exits 2. `scripts/preflightInputCheck.js` derives the target cycle by grepping SESSION_CONTEXT for a literal `Cycle: N` token; the PIN line has never carried one (verified 0 matches at both `f10d226c` and HEAD), so the documented canonical invocation cannot work and every run needs `--cycle=`. One-line fix — teach the deriver the PIN's actual `canonical C<NN>` format.

## Cross-gap patterns

- **Fail-loud gates guard the shape of the last failure, not the failure class.** G-PF7's gate checks article count because the S196 incident produced zero articles; the same root cause now produces 7 articles and 0 domains and passes. A gate written from one incident's symptom does not cover the next expression of that incident's cause.
- **Two independent channels have gone quiet without raising anything.** Coverage ratings have written nothing since C102 and the civic chain has applied nothing since C104 — neither surfaced anywhere until pre-flight was run by hand and its warnings chased. Both are "silence reads as fine" failures, the same class engine.136 just closed inside the engine.
- **Pre-flight verifies inputs exist, not that the producers of those inputs are alive.** Every gap here is upstream of the sheet it checks.

## Status updates

- 2026-08-30 (S403) — leg opened. G-PF7 + G-PF9 promoted to pipeline.62; G-PF8 + G-PF10 promoted to civic.26. G-PF11 left in log.
- 2026-08-30 (S403) — **G-PF8 CLOSED.** `callVoice` gained a cross-family fallback chain + backoff; provider errors now print the HTTP code and the upstream's own text. Probed all four fleet models: the 429 had already cleared, so the halt was transient — the fragility was the retry policy, not the model.
- 2026-08-30 (S403) — **G-PF10 CLOSED, by ruling not by edit.** Mike-direct: "'.42 sentiment' is not a gated term, nothing should fail on data all cities track." `metric-decimal` narrowed to engine-internal vocabulary (civic load, momentum); sentiment/approval/severity/tension removed and pinned CLEAN in `lintCivicPackets.test.js` so the list cannot be quietly re-tightened. `signed-delta` untouched — a cycle delta is engine output whatever noun it modifies.
- 2026-08-30 (S403) — **C104 APPLIED.** Re-gated the 2026-08-29 hearing outputs (no re-run of 16 voice calls): clerk pass, validator 0 violations, engine-verbiage clean over 17 voice files, sanity-read pass → GATE PASS. 6 initiatives written to `Initiative_Tracker`, verified by live read-back. INIT-001/005/007 no longer past due; pre-flight's stale warning is gone. Coverage (G-PF7) remains the one open warning.
- 2026-08-31 (S403) — **G-PF7 CLOSED.** Mike-direct: key domain off the reporter. Section headers still win where an edition has them; the reporter's beat is the fallback, sourced from `scripts/persona-map.json` so a beat change lives in one place. C104's 7 articles now resolve to CULTURE 4 / SPORTS 3 / ENVIRONMENT -2 instead of one COMMUNITY bucket. The gate now fails on 0-domains-resolved. C102 re-rates identical to the old code — regression proof, not assertion. C103 + C104 backfilled (10 rows, verified live).
- 2026-08-31 (S403) — **G-PF9 partially open.** Coverage now populates, so pre-flight reads clean READY with zero warnings, but the civic-chain-health step (reading `close_c<XX>.json` / `gate_c<XX>.json`) was NOT added — the underlying halt was fixed instead, so the check has nothing to report today. Still worth adding before the next silent stall; carried on pipeline.62's residual line.
- 2026-08-31 (S403) — **G-PF12 CLOSED** (and it retires the residual line above): coverage now runs inside the Saturday chain as `stepCoverage`, right after publish. Non-fatal by design; pre-flight is the independent backstop.
- 2026-08-31 (S403) — **G-PF14 opened, left OPEN by choice** (Mike-direct: gap-log it if it needs a fresh look). Intermittent test, not an intermittent product — the rater's behaviour is proven by the C102 byte-identical re-rate and the live C103/C104 backfill.
- 2026-08-31 (S403) — **G-PF13 opened and CLOSED same session.** Found by making the mistake: `--step=coverage` ran the entire chain because `arg()` only read spaced flags. Harmless here (no `--apply`), one keystroke from publishing canon. `arg()` now takes both forms.

## Cross-gap patterns (second pass, 2026-08-31)

- **Every gap in this log is a silence, not a crash.** Coverage stopped writing, the civic chain stopped applying, the rater mis-filed every article, and `--step` ran the wrong thing — all at exit 0. Nothing in this cycle's inventory announced itself; each one had to be walked into. That is the same class engine.136 closed inside the engine on the same day, which suggests the project's dominant failure mode right now is not breakage but unreported success.
- **Two of the seven were only findable by running the thing by hand.** G-PF12 (no cron) and G-PF13 (arg parsing) had no artifact, no log line and no failing test — they were invisible until a human invoked the code. Automation that is never invoked cannot report that it was never invoked.

## Changelog

- 2026-08-30 — Initial /pre-flight leg (S403, engine-sheet), C105 pre-fire.
