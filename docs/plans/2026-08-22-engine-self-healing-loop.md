---
title: Engine self-healing loop — execution logs are the ground truth, agents open issues, tests close them
created: 2026-08-22
updated: 2026-08-22
type: plan
tags: [plan, engine, agents, execution-logs, self-healing, active]
pointers:
  - "[[2026-08-22-engine-agent-fleet]] — the roster idea this supersedes in shape"
  - "[[../ENGINE_CRON_LOOP]] — engine/cron division of labour"
  - "[[../index]] — registered"
---

# Engine self-healing loop

**Status:** DESIGNED, not built. Builder direction 2026-08-22; he asked for the
push-back version, agreed with it, and supplied the execution-log corpus that
changes the architecture. Supersedes the roster shape in
[[2026-08-22-engine-agent-fleet]] §5 — that plan's §8 run-log stays valid.

---

## 0. Scale, before any number in this plan is read

**The world is ~388,000 people.** `World_Population.totalPopulation = 387,975` at
C104. `Simulation_Ledger` holds **964** of them — 0.25% — because tracking is
earned, not universal. `Business_Ledger` tracks **103** businesses against
roughly 100,000 that exist.

So every count in an execution log is a count *within a tracked pool*, and none
of them is a statement about Oakland. "908 commuters" is 908 tracked commuters.
A detector that divides by a tracked count and reports a percentage of the city
is reporting a phantom. **The diff across cycles is the signal; the absolute
number rarely is.** Builder-direct 2026-08-22, and he has had to say it more
than once.

## 1. The thing that changes the design

The Apps Script execution log already emits a **machine-readable per-cycle
record**, every cycle, and nothing in the repo parses it. From C104:

```
PHASE_TIMING_BEGIN
{"cycle":104,"totalMs":137064,"phaseCount":130,
 "slowest":[{"phase":"Phase10-ExecuteIntents","ms":21286,"ok":true}, …],
 "timings":[ …130 entries, each {phase, ms, ok} ]}
PHASE_TIMING_END
```

Plus, in plain lines above it, **every function's own version string and its
outcome counts**:

```
applySportsSeason_ v3.0: 6 feed entries for cycle 104
buildCommuteFlows_ v1.0: 689/908 commuters resolved (312 cross-hood, 377 local), 219 unresolved
loadRelationshipBonds_ v2.2: Loaded 582 active bonds
runBondEngine_ v2.4: Complete. Total bonds: 586
executeReplaceIntent_: Replaced Relationship_Bonds with 587 rows
executePersistIntents_: Executed 510 intents in 21284ms
Cycle completed. Engine errors logged: 0; audit issues tracked: 0
```

Corpus: Drive folder `1-8Owp4ShEoZbAkec5shyK5VDpr-yqxop`, cycles **93 → 104**,
12–40 KB each, including deliberately-kept `_reverted` runs — which are a
labelled before/after pair, i.e. free regression fixtures.

**Why this reframes everything.** The previous plan had agents *reason over
engine code* to find problems. That is expensive, slow, and — proven in
[[2026-08-22-engine-agent-fleet]] §8 — prone to confident wrong counts. The log
does not reason. It states what ran, in what order, how long it took, whether it
succeeded, and what it produced. **Detection becomes a diff, not a judgement.**

## 2. Architecture

```
execution log (Drive)                      ← ground truth, already emitted
      │  parse (deterministic, no model)
      ▼
output/cycle-records/c<N>.json             ← structured, in-repo, git-tracked
      │  diff c<N> vs c<N-1> (deterministic, no model)
      ▼
mechanical findings                        ← phase vanished, ok:false, timing
      │                                      regression, count collapse,
      │                                      version bump, new warning
      ▼
contract agent (model, only where judgement is needed)
      │  "Phase 7 changed; here is what its neighbours now assume that is
      │   no longer true"
      ▼
finding → REGRESSION TEST (the agent writes the test, never the fix)
      │
      ▼
Mags applies the remedy → `node scripts/run-tests.js` closes it
```

**Layers 1–3 need no model at all.** Most of the value is free.

## 3. The four rules that make it safe

### 3.1 Agents open issues. Agents never close them.

The builder's stated objection: he has paid for expensive reviews where the same
instance reviewed its own work. A loop where the phase-7 agent reports a break
and then confirms the fix reproduces that exactly, one layer up. So: **a finding
is closed only by a deterministic check passing** — never by an agent's opinion,
including the agent that raised it.

### 3.2 The loop's output is a test, not a report

This is the highest-leverage change. A report is read once and decays. A test is
committed, runs forever, and stops the finding from having to be re-derived every
cycle. Same agent, same cost, but the engine **accumulates** the regression suite
it has never had instead of accumulating prose.

It also answers "how do I know the fix landed" without a second model call: the
test that was red goes green.

### 3.3 Agents get a safe pair of hands: they may write tests, never engine code

Builder-stated, and sharper than the earlier paraphrase: **he will never touch
code and has never read a line of it.** `engine-sheet` (Opus 5) is the only
thing that edits engine code, and agents get that authority only when *this
seat* is satisfied they are safe — that is an engineering judgement delegated to
me, not a decision waiting on him. There is a middle position that is genuinely
safe in the meantime — **an agent may write a failing test.** A bad test fails loudly in the
suite; a bad engine edit fails silently in the sim. That gives the fleet real
hands without the knife, and it is what upgrades the loop from *monitoring* to
*self-healing*: the check that proves the remedy landed was authored by the agent
that found the break.

### 3.4 The harness measures coverage; the agent never states its own denominator

Already built and proven ([[2026-08-22-engine-agent-fleet]] §8): run 3 claimed
"Files scanned: 124" when 136 exist. `runEngineAgent.js` now appends a footer it
authors itself — files in repo, files opened, what was never looked at — with a
line saying any disagreeing count in the report is a claim, not a measurement.
Same principle extends here: **the parser reports which cycles it parsed**, and a
finding that references an unparsed cycle is invalid on its face.

## 4. Contract agents, not phase agents

Eleven phase agents have a structural blind spot exactly where this engine
actually breaks — **the seams**. Every real defect found on 2026-08-22 was a seam
defect: write-intents queued after `Phase10-ExecuteIntents` are silently dropped;
`Relationship_Bonds` full-replaces from Phase-1-loaded state so a mid-cycle append
vanishes; `Origin` had to be proven to survive a load/save round-trip. A phase-7
agent cannot see phase-9.

The evidence is already in hand: the one engine agent that existed and produced
something useful on day one, `engine-validator`, **is not a phase agent** — it is
a *contract* agent, cross-phase by nature. That is why it worked.

Proposed roster — small, and aimed where the bugs live:

| agent | owns | its ground truth |
|---|---|---|
| ctx-contract | every `ctx.summary` read has an upstream write | code + `engine-validator` (exists) |
| write-intent | nothing queues an intent after Phase10-ExecuteIntents | code + `executePersistIntents_` log line |
| sheet-schema | a tab's shape matches what writers assume | live headers + `executeReplaceIntent_` row counts |
| cycle-boundary | carry-forward, snapshots, previous-cycle state | `saveEveningSnapshot_` / `loadPreviousEvening_` lines |
| timing | no phase regresses; no phase disappears | `PHASE_TIMING` block |

Five, not thirteen. Each has a deterministic ground truth, so each can be mostly
mechanical with a model only at the interpretation step.

## 5. The trigger problem — solved cheaply

*"if we change phase 7, i'd expect a report from that agent that its environment
changed."* It will not notice on its own: an isolated agent has no memory of its
last run and no diff. **Hand it the diff.** Store the SHA of the last run per
agent; at wake, pass `git diff <lastSha>..HEAD -- <its scope>`. If the diff is
empty, the agent does not run at all.

That is also what makes the fleet affordable — one engine-validator run cost
**885k input tokens**. Times five agents times every cycle is real money. Gated on
change, most wakes cost nothing.

## 6. What the C104 log already shows, unaddressed

Read once, by hand, with no agent involved — this is the argument for the whole
plan:

| signal | line |
|---|---|
| `Phase10-ExecuteIntents` is **15.5% of the entire cycle** — 21,286 ms of 137,064 ms, 510 intents | timing block |
| Top 5 phases are 47% of total runtime (ExecuteIntents, HouseholdFormation 16,530 ms, Advancement 14,674 ms, MediaIntake 6,187 ms, CitizenEvents 5,845 ms) | timing block |
| `recordInheritanceInFamily_: registry lacks inheritance columns (expected legacy schema) — skipping` — a write that silently does nothing | plain line |
| 4× `Warning priorityEngine clamp: raw=11.70 final=7.80` — a value exceeding its ceiling by 50%, four times | plain line |
| `Phase 6.5: Validation complete - CAUTION` — a validator raising caution that nothing consumes | plain line |
| `buildCommuteFlows_: 689/908 commuters resolved, 219 unresolved` — 908 is the TRACKED pool, not the population (see §0). Whether 219 unresolved is a defect or the expected tail is unknown and is exactly the kind of question a record-diff answers: watch the ratio across c93→c104, not the raw number | plain line |
| `checkFamilyMatchPromotions_: reels did not align` ×2 | plain line |
| No `rng draws` field — confirms engine.128's counter lands first at **C105** | absence |

None of that required a model. It required someone to read the log, and nobody
ever has systematically.

## 7. Build order

1. **`scripts/parseExecutionLog.js`** — log text → `output/cycle-records/c<N>.json`.
   Parse the `PHASE_TIMING` JSON block, plus `^<fn>_ v<ver>: <message>` lines into
   `{fn, version, message, counts}`. Backfill c93–c104 from Drive. **No model.**
2. **`scripts/diffCycleRecords.js`** — c<N> vs c<N-1>: phases added/removed,
   `ok:false`, timing regressions past a threshold, count deltas, version bumps,
   new warnings. **No model.** This alone is the monitor.
3. **Wire the parser to the cycle close** so a record is written every cycle
   without a Drive round-trip.
4. **One contract agent on real records** — `timing` is the cheapest and its
   ground truth is pure JSON. Prove the open-issue → write-test → mechanical-close
   cycle end to end on it.
5. **Only then** clone to the other four.

Steps 1–3 have no model cost and deliver the monitoring layer on their own. If
the project stops after step 3 it is still ahead of where it is now.

## 8. Open questions

1. **Log delivery — resolved.** The builder supplies the execution log on every
   run; the Drive folder is the standing drop. The parser reads from there and
   needs no scraping, no new Apps Script write path, and no permission. Automating
   it later is an optimisation, not a prerequisite.
2. **`Sandbox_Logs`.** A subfolder was created 2026-08-22 and is unexamined. If
   sandbox runs are labelled, they are a second fixture source.
3. **The `_reverted` pairs** (100, 104b, 104c) are labelled before/after runs.
   Best available regression fixtures — worth using in step 2's test.
4. **Timing thresholds** must be learned from c93–c104, not guessed. Set them
   after the backfill, from the actual distribution.
