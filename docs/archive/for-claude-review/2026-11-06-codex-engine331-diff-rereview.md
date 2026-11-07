---
title: Codex re-review — engine.331 diff fold and fan sign
created: 2026-11-06
updated: 2026-11-06
type: review
tags: [review, engine, sports, feed]
sources:
  - commit e36350a88
  - commit d409bac12
  - docs/for-claude-review/2026-11-06-codex-engine331-diff-review.md
  - output/engine-sheet/2026-11-06-codex-e331-diff-rereview-brief.md
---

# Codex re-review — engine.331 diff fold and fan sign

**Target:** The one allowed re-review of findings F1–F2 from the diff review, plus the previously unseen fan-line sign fix in `e36350a88`, on the seven-file PROD candidate at `d409bac12`.

**Result:** HOLD

F1 and F2 are closed. The new sign makes a previously dropped city game-night pool write again, but it also activates a wrong-team row selection and a duplicate-citizen Ripple count. The bench reader has one stale loss-line match after the word swaps.

## Findings

1. **High — a retired or unrecognized row can now write the city's game night for an active club.** `phase05-citizens/generateCitizensEvents.js:2176-2185` requires some accepted game week, then skips an unplayed row only when `gnTeam` is truthy. `normalizeOaklandFeedTeam_` returns `''` for `NBA`, `Warriors`, blank and unknown labels (`phase02-world-state/applySportsSeason.js:473-492`), while the current-Cycle reader still appends those entries (`:239-268,323`). The first such game-looking row passes the `if (gnTeam && !gnPlayed[gnTeam])` check; the new sign then admits its bucket as a fandom event (`phase05-citizens/generateCitizensEvents.js:2186-2197,3700-3713`). Input: current `NBA` `game-result` W5 row before an Oaks L5 row, with an accepted Oaks game week. Output: citizens get the retired row's plain-win `[Sports-Fandom-Up-S]` lines, and no Oaks skid lines. A read-only synthetic probe using the real generator and normalizer produced 313 win/up lines and zero skid/down lines across 1,500 one-citizen fixtures. The new `scripts/gameNightFans.test.js:81-94` tests only a single supported game row, so it misses the mixed order. Require `gnTeam` to be an accepted played franchise before choosing `gnGame`, and pin the retired/blank-first case.

2. **Medium — the reactivated game-night Ripple counts lines as distinct citizens.** Each admitted game-night event pushes the POPID (`phase05-citizens/generateCitizensEvents.js:3830-3831`), but the Ripple calls the array “citizen day(s)” and uses its length as magnitude without deduplication (`:3905-3919`). `recordRipple_` preserves duplicate IDs in both the queued row and in-cycle summary (`utilities/rippleLedger.js:53-55,78-88`). One citizen can draw two different game-night lines in the 1-to-N event loop (`phase05-citizens/generateCitizensEvents.js:3510-3519`). In a read-only synthetic probe, 23 of 290 emitted per-citizen game-night Ripples held the same POPID twice; the maximum was two. The sign fix makes this once-dropped path write and count again. Input: one citizen draws two distinct game-night lines; output: a Ripple claiming two citizen days with `targetIds=[same POPID,same POPID]`, and an inflated magnitude. Count distinct POPIDs for the citizen-scoped receipt, or state and test an event-line grain explicitly.

3. **Low — the bench reader undercounts one plain-loss fan line after F2's word swap.** `phase05-citizens/generateCitizensEvents.js:2218-2221` now says “bar go quiet before the finish”; `output/engine-sheet/2026-11-06-e331-bench.js:90-97` still matches “bar go quiet by the eighth.” Input: that new first loss line in `LifeHistory_Log`; output: `fans.loss.n` omits it, although the line was written. This affects the readback proof, not the runtime game-night line. Update the match before using a plain-loss bench receipt.

## Closure of the original findings

- **F1 closed.** A named game line now makes exactly one `rng()` call; the line index remains `floor(rng()*pool.length)`, identical to the prior base-line draw, and a recognized mood chooses its clause from that draw's fractional remainder (`phase05-citizens/applyGameNightMoments.js:275-284`). For a fixed bucket, the base-line distribution and downstream RNG stream therefore stay the same whether mood is blank or filled. The two-player same-seed test checks equal draw counts, byte-identical staff/fan week lines, and base line plus the correct clause (`scripts/gameNightMoments.test.js:160-171`). A mood on a row with no Streak may intentionally change the bucket (`phase05-citizens/applyGameNightMoments.js:107-112`); it still spends one draw per resolved named player.
- **F2 closed.** The shared named, city fan and household pools now replace the identified baseball-only terms (`phase05-citizens/applyGameNightMoments.js:37-61`; `phase05-citizens/generateCitizensEvents.js:2206-2226`; `phase05-citizens/runHouseholdEngine.js:416-424`). The new source-text pin covers those three pools (`scripts/gameNightFans.test.js:96-103`); source inspection confirms the words in the W4 plain-win routes are sport-neutral. The pin is a wording check, while the dynamic tests cover routing.

## Fan-line effects and verification boundary

The sign mapping is internally consistent: `win`/`winStreak` add `dial:fandom:up`, `loss`/`coldStreak` add `dial:fandom:down`, and `neutral` remains unsigned (`phase05-citizens/generateCitizensEvents.js:2189-2197`). A plain `Sports` line has no dial effect, so the explicit sign grades a drawn line to `Sports-Fandom-Up-S` or `-Down-S` (`:1135,1210-1240,3700-3713`; `utilities/citizenDialMap.js:303-324`). The LifeHistory fold reads that tag as fandom ±1 (`utilities/compressLifeHistory.js:1632-1647`; `utilities/citizenDialMap.js:365-373`). I checked that both neutral texts resolve to `{}` under `nudgesForEvent_('Sports',1,text)`, so they remain unwritten without a sign.

“A fan line is written again” is **not the whole behavioral effect**. Admitted lines can change the fandom dial, join `S.citizenEvents`, and add a `game-night-texture` Ripple (`phase05-citizens/generateCitizensEvents.js:3830-3846,3905-3921`). When the admitted line is a citizen's first emitted event, the existing `Sports` pulse adds neighborhood attractiveness (`:3820-3828`; `utilities/neighborhoodPulseMap.js:61-63,96-136`). These hardcoded game-night entries have no `eclPoolKey`, so the Event_Content_Ledger pool balancer leaves their weight alone (`phase05-citizens/generateCitizensEvents.js:50-86,1057-1063,2234-2235`). The `source:sports` selector weight remains the pre-existing fandom multiplier (`:3453-3475`); the new `dial:fandom:*` tag does not add another selector multiplier. A later Cycle's changed fandom can alter that multiplier through DialState. Admitting a line can also reach later RNG-consuming branches such as FAME_WATCH (`:3741-3755`), so replay against the old dropped-line behavior need not have identical later events. These are consequences of making the event live, not separate findings.

The code has no fixed 74-line game-night cap: it adds three bucket lines to each eligible citizen pool at weight up to 4 and draws within a 1-to-N event loop (`phase05-citizens/generateCitizensEvents.js:2203-2235,2927-2931,3510-3555`). The synthetic probe produced 313 signed win lines across 1,500 isolated one-citizen fixtures, but this fixture is not a live-Cycle population or pool. Whether the candidate exceeds the brief's C105–C110 live range of 37–74 lines per Cycle is **unverified** without a same-candidate sandbox or live receipt. The existing `gameNightFans.test.js:62-94` proves lines can be written and signed, not their live volume.

Local read-only runs passed: `gameNightFans.test.js` 6/6, `gameNightMoments.test.js`, `householdEngine.t4.test.js` 21/21, `sportsFeedTriggers.test.js` 15/15 and `sportsFeedParser.test.js` 73/73. `git diff 592707c09 d409bac12` changes no Phase-2 reader, week/bar utility, vocabulary, or story-hook Apps Script source; those paths checked in the first review remain source-equivalent. Sandbox readback, actual Apps Script load, PROD push and live volume are unverified here. The automated wiring card was not run because `scripts/runEngineAgent.js:321-322` writes an additional file, outside this task's one-file write allowance; the source-traced card in the first review still describes the unchanged producer/consumer path.

## Disposition

This is the last allowed Codex round. Claude and the builder decide the three findings and the live-volume gate; no further re-review is requested.

**Reconciled in:** `docs/plans/2026-11-05-sports-feed-triggers.md` §Reviews reconciled (A19-A21, P3), 2026-11-07, engine-sheet.

### Disposition (engine-sheet, 2026-11-07)

- **1 — verified, fixed in place.** Fans: `if (!gnTeam || !gnPlayed[gnTeam]) continue;`. Households had the same hole wider (first game row, no team check): now the first game row of a club whose `S.sportsWeek[team].g > 0`, the fans' gate. Pins `gameNightFans.test.js` 7 (`[NBA W5, blank W5, Oaks L5]`, Oaks cold) and `householdEngine.t4.test.js` 5.7, 5.8; on the old code 7 reads `{"skid":0,"win":313,"up":313,"down":0}`, matching the probe.
- **2 — verified, fixed in place.** One `gameNightDrawn` entry per citizen (its only reader is this Ripple). Pin `gameNightFans.test.js` 8; old code: 23 of 290 Ripples with a repeat.
- **3 — verified, fixed.** Reader matches "bar go quiet before the finish" and adds `fanCitizens` (distinct fan-line POPIDs vs the Ripple magnitude).
- **Live volume** — P3: bench 3 counts on the final hash, then the first live fire.
- Full suite 320/320 test files.
