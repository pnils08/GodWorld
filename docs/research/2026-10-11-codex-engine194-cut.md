---
title: engine.194 sports sentiment cut — patch and replay
created: 2026-10-11
updated: 2026-10-11
type: plan
tags: [engine, sports, draft]
sources:
  - docs/for-claude-review/2026-10-11-engine194-cut-TASK.md
  - docs/plans/2026-09-11-sports-as-a-lived-system.md Task 7
  - docs/research/2026-09-18-sports-intensity-and-game-day-economy.md section 6
  - output/beats/Oakland_Sports_Feed.jsonl
pointers:
  - "[[../plans/2026-09-11-sports-as-a-lived-system]] — owning plan, engine-sheet reviews and lands"
  - "../../output/codex/2026-10-11-engine194-cut.patch — proposed source and tests"
---

# engine.194 — codex cut for engine-sheet

**Status: authored patch, ready for engine-sheet review and bench; not deployed or live-proven.** No commits, clasp, Sheet writes, or source edits in the shared checkout. The patch changes exactly `phase02-world-state/applySportsSeason.js`, the `gnI` pricing block in `phase05-citizens/generateCitizensEvents.js`, and `scripts/sportsFeedParser.test.js`. No utility change, new engine file, summary field, configuration key, persistence key, or RNG draw.

The task's source baseline is `024f42d0`. Scratch was archived at `c57dc447` (only the dispatch task was added between those commits). Other lanes advanced HEAD during this work; the patch was generated against `7901bc45fd66d34273ee30392c4f9f3ff9cedde6`. All three target files and the week utility were unchanged across those heads. Existing shared-tree dirt was excluded.

## Form and magnitude decision

For each franchise with an accepted game week:

```text
surprise = clamp((weekly win fraction - own expectation) / 0.5, -1, 1)
signed   = (1 - exp(-games / 3)) × (phase depth / 6) × franchise weight × surprise
share    = clamp(0.5 × signed × round reach, -0.10, 0.10)
games    = sum(franchise shares)
boost    = games + existing 203d aftermath
gnI      = min(1, abs(boost - aftermath.total) / 0.10)
gnW      = min(4, 1.1 × (1 + 3 × gnI))
```

`surprise`, `signed`, expectation, depth, weight, and reach already exist on the shared week object. The engine adds only the final share pricing. `MediaProfile`, `FanSentiment`, and `Streak` no longer contribute any share; authored trigger behavior and record preservation remain. Missing/blank/rejected WeekRecord and explicit `none` produce no **new games share**. Earlier accepted games may still produce the separately accounted 203d aftermath. There is no legacy record-only numeric fallback, including under a World_Config override without a week object.

**Magnitude choice:** a two-win, no-loss A's title week against the .750 prior reaches **+0.10**; an 0–4 playoff sweep reaches **−0.10**. A single franchise's maximum is half the plan's ±0.20 edition comparator and two-thirds of its ±0.15 initiative comparator. These are Task 7's design comparators, not a claim that both sibling values are currently additive: `applyCityDynamics.js:1772` explicitly marks the old initiative city add retired. Two capped franchises can sum to ±0.20; no new city-level cap is introduced. Strong positive and negative weeks can cancel in both mood and the existing net game-night weighting.

The title is not a fixed +0.10 award. A 4–1 WS week against .750 produces +0.040556; a 3–1 week at that expectation is zero even under a title lens. This is Q3's own-expectation ruling. Fan TITLE classification and its separate citizen lines remain intact. A championship with no accepted game cannot mint a game share.

### Constants and calibration

| Constant | Decision and evidence |
|---|---|
| New price coefficient **0.5** | C110 raw title share +0.121646; synthetic playoff sweep −0.153417. Both clamp without media/streak assistance. At 0.25 C110 would be +0.060823; at 0.4 it would be +0.097317. Choose 0.5 to let a two-game title close reach the cap while regular/preseason rows below stay small. |
| Existing per-franchise **±0.10** clamp | Keep the existing envelope; reachability is now result-driven. The old formula also reaches +0.10 on this C110 snapshot: the plan's “never fired” observation was C101–C106, not a current fact about C110. |
| `gnI` divisor **0.10**, replacing 0.15 | Matches one full franchise share. C110 net +0.098297 reaches `gnW=4`; old C110 net +0.080000 gave 2.86. Exact half-share ±0.05 gives `gnI=.5`, `gnW=2.75`; pure aftermath leaves `gnI=0`. |
| Existing `gnI` cap **1**, `gnW` constants **4 / 1.1 / 3** | Preserved. Neutral game-week weight remains 1.1; the existing weight cap engages at absolute net share 0.087879. No appearance probability or event quota is promised by this weight. |
| Existing volume denominator **3**, stakes denominator **6** | Reuse the shared week scale. Synthetic 13–4 late-season remains +0.003908 against dynasty expectation, below the two-game title. Phase depths stay preseason 1, regular 2, mid 3, late 4, playoffs 5, championship 6, off-season 0. |
| Existing expectations **A's .750 / Oaks .400**, minimum **4** game weeks, trailing **8** | Same source as fandom/economy; no second expectation. The C108–C110 replay has 0/1/2 earlier weeks, so it uses priors. A synthetic four-week .800 regular baseline makes a .750 postseason week negative; current/future weeks do not enter their own expectation. |
| Existing surprise divisor **.5**, clamp **±1** | Preserved. A dynasty 2–1 week is a disappointment; Oaks 3–1 beats its prior. No absolute-win bonus overrides that sign. |
| Existing weights **1.0 / .35**, or carried `S.franchiseWeight` | Replay uses the defaults because this feed snapshot does not contain historical carried weights. A nondefault .6 weight is tested through game and aftermath paths. These numbers are controlled replays of feed facts, not reconstructed live runtime boosts. |
| Existing reach | Preseason .15, regular .25, mid .30, late .40; wild-card/play-in/bare playoffs .50, division-series/first-round .60, league-championship/conference-semis .75, conference-finals .85, championship/WS/finals 1.00. Same one-game result rises by round in the table below. Reach is multiplied explicitly: `wk.signed` does not already contain it. |
| Existing aftermath **.85** default, **.01** extinction floor | No decay-rule changes. Only its starting share is repriced. Tiny Oaks preseason shares now extinguish immediately on a quiet Cycle. |

### Series result and earned baseline

Use accepted WeekRecord wins/losses, folded across the Cycle, as the postseason result; use the franchise's earlier game weeks as its earned baseline. Do **not** add a standing term from the mixed-purpose `Team Record` column. C108's final 7–2 cumulative field coexists with only one accepted weekly win; C110's final 11–3 field coexists with two accepted wins. Adding those cumulative records would pay earlier games again and allow an excellent season to mask a current sweep.

The baseline is the existing mean of earlier weekly win fractions, not a separately parsed regular-season total or a frozen opening-postseason record. Regular-season weeks survive into postseason, then gradually age out of the eight-week window. With fewer than four observed weeks the ruled prior stands. C108+ data cannot prove an earned regular-season baseline yet; the synthetic four-week test proves that path without inventing missing historical games. This implements the task's proposed week-signed form and makes explicit how the older “series versus baseline” prose is resolved.

## Replay — supplied feed snapshot

Read `output/beats/Oakland_Sports_Feed.jsonl` locally; no live Sheet read. SHA-256: `1709c3cccd5f5c556d040a927bafeb96a0bb588df64b2bd94385af995bd7d2f4`. Preserve the snapshot's row order and current parser acceptance. C108 `A:W` on a `season-state` row is rejected, as in the existing engine; it is not counted or repaired. Later blank summary rows still supply the raw phase lens. JSONL does not establish original Sheet cell types.

| Cycle | Team | Accepted W–L | Lens | Earlier weeks / expectation | Old share | New raw | New share |
|---|---|---|---|---|---:|---:|---:|
| C108 | A's | 1–0 | playoffs | 0 / .750 | +.095000 | +.029528 | +.029528 |
| C108 | Oaks | 0–1 | preseason | 0 / .400 | −.020000 | −.000992 | −.000992 |
| C109 | A's | 2–1 | playoffs | 1 / .750 | +.075000 | −.021949 | −.021949 |
| C109 | Oaks | 0–2 | preseason | 1 / .400 | −.024000 | −.001703 | −.001703 |
| C110 | A's | 2–0 | championship | 2 / .750 | +.100000 | +.121646 | **+.100000** |
| C110 | Oaks | 0–2 | preseason | 2 / .400 | −.020000 | −.001703 | −.001703 |

| Cycle | Old net games | New net games | Old `gnW` | New `gnW` |
|---|---:|---:|---:|---:|
| C108 | +.075000 | +.028536 | 2.750000 | 2.041683 |
| C109 | +.051000 | −.023652 | 2.222000 | 1.880505 |
| C110 | +.080000 | +.098297 | 2.860000 | 4.000000 |

Old values use the exact HEAD pricing body and reduced row state, including authored media/fan/streak fields. The test's optional replay command contains that old formula solely for comparison; it is never used by the engine. Its output was cross-checked against the unmodified engine VM.

## Synthetic replay — isolated, non-canon

Priors and default weights as above. Blank authored streak/fan/media; synthetic old `Team Record` equals the displayed W–L. These are calibration scenarios, not claimed feed events.

| Team / scenario | Lens | Old share | New raw | New share |
|---|---|---:|---:|---:|
| A's dynasty 2–1 | late-season | +.010000 | −.014047 | −.014047 |
| A's dynasty 13–4 | late-season | +.015882 | +.003908 | +.003908 |
| A's swept 0–4 | playoffs | −.060000 | −.153417 | **−.100000** |
| A's WS title close 2–0 | world-series | +.090000 | +.121646 | **+.100000** |
| A's WS 4–1 | world-series | +.054000 | +.040556 | +.040556 |
| Oaks 0–3 | preseason | −.015000 | −.002212 | −.002212 |
| Oaks 3–1 | preseason | +.007500 | +.002255 | +.002255 |
| Oaks 0–3 | regular-season | −.030000 | −.007375 | −.007375 |
| Oaks 3–1 | regular-season | +.015000 | +.007517 | +.007517 |
| A's 1–0 | wild-card | +.060000 | +.029528 | +.029528 |
| A's 1–0 | division-series | +.060000 | +.035434 | +.035434 |
| A's 1–0 | league-championship | +.060000 | +.044292 | +.044292 |
| A's 1–0 | world-series | +.090000 | +.070867 | +.070867 |

## Aftermath and compatibility

At a quiet Cycle, rebuild the last accepted week with its historical raw lens and only history earlier than that game's Cycle. Reuse `buildSportsWeek_` and `addSportsWeekIntensity_`, then pass that week to `feedTeamShare_`. The temporary historical week has no venue attribution; home/away counts are zero placeholders because neither signed sentiment nor aftermath reads them. Nothing is published from that temporary object.

`feedHistory.weights` is a new **local argument member**, carrying the existing `S.franchiseWeight`. Historical intensity uses today's carried weight, matching `deriveSportsIntensity_`'s existing convention. It is not a new summary or persisted field. Engine.209 can drift weight after a game; exact prior-Cycle share identity is therefore not promised when the carried weight changes. With fixed weights, tests verify exact game-share reconstruction and no expectation look-ahead. A C110 +.10 championship share becomes +.085 at C111 under default decay, absent other games; Oaks' −.001703 preseason residue is below the unchanged extinction floor.

Per-team triggering, stale-row silence, `S.sportsAftermath` shape, city/ripple attribution, and gnI's aftermath subtraction remain. The cut consumes no RNG and adds no `Math.random`. The inherited `sportsAftermathKind_` vocabulary and decay semantics remain engine.203d's contract; the synthetic `world-series` pricing scenario is a game-share test, not new alias/aftermath acceptance proof.

## Validation

| Check | Result |
|---|---|
| `node scripts/sportsFeedParser.test.js` | **72 passed, 0 failed**, exit 0. Baseline had 63 tests. |
| Targeted suite with `--replay-feed` | **72 passed, 0 failed**, all six live-snapshot rows and 13 synthetic rows emitted; matches the independent old/new VM replay. |
| `node --check` on all three patched JS files | Pass, both in the working scratch copy and after applying the artifact to fresh HEAD file copies. |
| `git apply --check --whitespace=error-all` | Pass against the shared checkout's unchanged target files. Fresh HEAD file copies also passed `git apply --check`, then actual apply and syntax checks. |
| Patched scratch `GODWORLD_LEDGER_FAILS=0 npm test` | **279/287 files passed; 8 failed**, exit 1, 149.18 s. |
| Unpatched equivalent scratch `GODWORLD_LEDGER_FAILS=0 npm test` | **279/287 files passed; the identical 8 failed**, exit 1, 128.66 s. No additional failed test file from this cut. |
| Initial shared-checkout baseline `GODWORLD_LEDGER_FAILS=0 npm test` | **283/287 files passed; 4 failed**, exit 1, 141.59 s. The additional four scratch failures are reproduced without the patch. |

The eight full-suite failures are disclosed, not waived or fixed in this patch:

| Test file | Observed failure / environment distinction |
|---|---|
| `scripts/cron-civic-tick.test.js` | `orBatch` local import/validation subprocess: `spawnSync node EPERM`; fails in both environments. |
| `scripts/fireGuard.test.js` | Phase-order scanner: “no slot count”; fails in both environments. |
| `scripts/ingestEdition.test.js` | Partial-ingest subprocess did not reach loop or name rerun; fails in both environments. |
| `scripts/rateEditionCoverage.test.js` | Reporter-domain resolution/CLI assertions; fails in both environments. |
| `scripts/buildNiaSlice.test.js` | Scratch lacks local feed/standings artifact context; `standings` key/null assertions fail with and without patch. |
| `scripts/employerSuccess.test.js` | Scratch falls through to a Sheet-read/auth network path despite the runner's offline default; DNS is blocked (`EAI_AGAIN`). No network permission was granted to tests. Same failure on unpatched scratch. |
| `scripts/notebooklmSourceInventory.test.js` | Hardcoded `/root/GodWorld/output/codex` expectation differs from scratch location. |
| `scripts/undockedMintAccount.test.js` | Existing-cast credential-presence assertion fails in scratch; credentials were not copied or inspected. |

Patch SHA-256: `0d39f41a6de15e6d0278326157f3525c399597d2bfa2fb9937f9e7eb19d642f0`. The suite's diagnostic-ledger write opt-in was explicitly disabled. A green full-suite result is **not** claimed; the matched scratch comparison and passing sports tests are the local evidence.

Reproduce the targeted suite and both replay tables after applying the patch in a scratch copy:

```bash
node scripts/sportsFeedParser.test.js
node scripts/sportsFeedParser.test.js --replay-feed /root/GodWorld/output/beats/Oakland_Sports_Feed.jsonl
GODWORLD_LEDGER_FAILS=0 npm test
```

Only `sportsFeedParser.test.js` changed. No assertion was removed or given a wider tolerance. Exact old record-only payouts became exact zero assertions because those fixtures have no accepted week; their record-preservation assertions remain. The phase-alias matrix now also asserts the canonical state directly. Aftermath fixtures now provide complete actual week objects; title/sweep checks remain and the game-week test gains an exact numeric assertion. The Oaks loose negative-range assertion becomes exact `lastShare` plus exact zero after the existing extinction gate. Trigger geography fixtures now use complete week objects. Nine new tests cover both clamps, own-team priors, reach, regular-to-postseason expectation, authored-field independence, no-game/rejected-cell gating, the real reader-to-boost path, weighted aftermath reconstruction, and executable gnI arithmetic. The optional replay accepts only a local JSONL path and prints to stdout.

## Verified wiring card — attached to this cut

Required harness run: `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: feedTeamShare_, processFeedSheet_, sportsSentimentBoost and generateCitizensEvents_ gnI ..." --out /tmp/engine194-wiring.md`. The restricted-network attempt failed; the authorized retry completed (26 turns, 37 tool calls). Below is the task-relevant card after checking its pointers against source. Line numbers in this section are **unpatched HEAD**, except where marked patched.

| Edge | Verified pointer |
|---|---|
| Feed parser accepts WeekRecord and builds earlier histories | `phase02-world-state/applySportsSeason.js:192`, `:218`, `:267` |
| Franchise week producer, own expectation | `phase02-world-state/applySportsSeason.js:307`; `utilities/sportsWeekRecord.js:102`, `:119` |
| Adds shared signed intensity and raw-round reach | `phase02-world-state/applySportsSeason.js:331`, `:355`; `utilities/sportsWeekRecord.js:284`, `:289`, `:292` |
| Production order: SportsSeason → SportsFeed → CityDynamics → CitizenEvents | `phase01-config/godWorldEngine2.js:566`, `:568`, `:582`, `:656` |
| Alternate run order uses the same sequence | `phase01-config/godWorldEngine2.js:2283`, `:2285`, `:2299`, `:2373` |
| Feed entry point passes week/history; local share reader | `phase02-world-state/applySportsSeason.js:823`, `:828`, `:905`, `:974` |
| Last-game share reconstruction → decay | `phase02-world-state/applySportsSeason.js:950`, `:952`, `:955`; `utilities/sportsWeekRecord.js:399` |
| Share definition; new signature `(state, wk)` | `phase02-world-state/applySportsSeason.js:1082` (patched `:1092`) |
| Boost and aftermath publication | `phase02-world-state/applySportsSeason.js:838`, `:839` |
| Games / aftermath ripple attribution | `phase02-world-state/applySportsSeason.js:847`, `:863` |
| City consumer adds the scalar once | `phase02-world-state/applyCityDynamics.js:1762`, `:1764` |
| Game gate → repriced intensity → existing capped weight | `phase05-citizens/generateCitizensEvents.js:1855`, `:1863`, `:1871`, `:1873` |
| New local weight forwarding and historical reconstruction | patched `phase02-world-state/applySportsSeason.js:827`, `:956` |
| Owning open work | `docs/plans/2026-09-11-sports-as-a-lived-system.md:488` |

The automated card had incorrect scheduler pointers (SportsFeed `791`/`2488`, CityDynamics `599`) and falsely said `applySportsSeason_` called the feed pass. It also called `feedTeamShare_` pure despite its existing state canonicalization, called gnI an inclusion threshold rather than a pool weight input, and missed Task 7. Those claims are not adopted; the verified pointers above supersede them. Unrelated “orphan/phantom” map findings were not reviewed and are not evidence for this cut.

## Landing boundary

Engine-sheet owns review, application, bench, and any later production approval. The bench should inspect signed C109-like disappointment, the C110-like title cap, mixed-franchise totals, a quiet following Cycle, and game-night weight with aftermath present. Local tests and snapshot arithmetic prove no live citizen outcome, Sheet persistence, deployment, or post-Phase-9 weight readback. No plan status was marked shipped and no rollout row was changed. This completed inbox payload is for Claude registration under the inbox README; only the two task-named deliverables were created in the repository.

## Status log

### engine.194 — status (drained from ROLLOUT, 2026-10-22 / S592)

Record-driven sentiment + game-night intensity LIVE PROD `ae9278aa` (codex cut: share = 0.5 × signed result vs expectation × reach, ±0.10; parser 72/72). C112 first priced week: Oaks W1 (exp 0.4, surprise 1, signed 0.03, reach 0.25) → games row +0.004 — share formula holds. Read the first loss

## Changelog

- 2026-10-11 (codex) — Authored engine.194 patch, local replay/calibration, targeted tests, full-suite comparison, and verified wiring card for engine-sheet review; no commits or deployment.
