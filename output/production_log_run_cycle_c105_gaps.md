# Cycle 105 gap log

## LEG: /pre-flight (G-PF)

**Run:** 2026-08-30 (S403, engine-sheet) — `node scripts/preflightInputCheck.js --cycle=105`
**Verdict:** READY (with warnings), exit 0. C105 unfired at time of writing; live `cycleCount` 104.
**Total gaps:** 5 (2 HIGH / 2 MED / 1 LOW)

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

## LOW-severity gaps

- **G-PF11:** `/pre-flight` with no argument always exits 2. `scripts/preflightInputCheck.js` derives the target cycle by grepping SESSION_CONTEXT for a literal `Cycle: N` token; the PIN line has never carried one (verified 0 matches at both `f10d226c` and HEAD), so the documented canonical invocation cannot work and every run needs `--cycle=`. One-line fix — teach the deriver the PIN's actual `canonical C<NN>` format.

## Cross-gap patterns

- **Fail-loud gates guard the shape of the last failure, not the failure class.** G-PF7's gate checks article count because the S196 incident produced zero articles; the same root cause now produces 7 articles and 0 domains and passes. A gate written from one incident's symptom does not cover the next expression of that incident's cause.
- **Two independent channels have gone quiet without raising anything.** Coverage ratings have written nothing since C102 and the civic chain has applied nothing since C104 — neither surfaced anywhere until pre-flight was run by hand and its warnings chased. Both are "silence reads as fine" failures, the same class engine.136 just closed inside the engine.
- **Pre-flight verifies inputs exist, not that the producers of those inputs are alive.** Every gap here is upstream of the sheet it checks.

## Status updates

- 2026-08-30 (S403) — leg opened. G-PF7 + G-PF9 promoted to pipeline.62; G-PF8 + G-PF10 promoted to civic.26. G-PF11 left in log.

## Changelog

- 2026-08-30 — Initial /pre-flight leg (S403, engine-sheet), C105 pre-fire.
