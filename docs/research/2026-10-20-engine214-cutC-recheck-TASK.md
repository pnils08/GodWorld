# TASK — codex: plan recheck, engine.214 8a Cut C (the citizen's spot)

Read-only: code + docs + `output/` dumps; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-20-codex-engine214-cutC-recheck.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~100 lines. Report in one line when done.

**The plan:** `docs/plans/2026-10-10-engine-214-mood-per-hood.md` step 8 — the redirected 8a block (steps 2–5, `S.hoodSpots`, rendezvous pick, `citizenSpotPool_`, tests), "Contract after the recheck" → **Cut C**, and the recheck 2 fold → **C source** (commit `3a5449f7`). Your recheck 2 (`docs/research/2026-10-19-codex-engine214-8a-recheck2.md`) held C; this checks the fold plus the es contract below. Cut A (engine.305 @151) and Cut B (@152, `3ed34b61`) are live. Builder direction (verbatim, plan step 8): "my taco spot closed for repairs" — things that happen to the citizen at their own place; "the engine firing 'a citizens spot' makes the cron build on that an allows it to tell us their spot." Rulings fixed; attack the mechanism.

## Facts es verified today (check them, don't take them)
- Phase order, both runners: `Phase4-ChaosCars` `godWorldEngine2.js:609` / `:2326` → `Phase5-BusinessDynamics` `:641` / `:2358` → `Phase5-CitizenEvents` `:657` / `:2374`.
- Streak resets to 0 on any non-negative growth week (`applyBusinessDynamics.js:483`), so "last Cycle ≥ 2, now 0" fires in one Cycle.
- `bizIsBar_` (`:283-285`) is true for every food-class row; `barTerm` needs a franchise game this week (`:535-536`, `:597-603`). The live Oakland_Sports_Feed carries Oaks game results for C113.
- Shed on an open row happens only at `d.streak > bizDeclineStreak` (4, `engine94SheetContract.js:89`; `applyBusinessDynamics.js:690-694`), so a shed spot is also a quiet spot.
- Business-scope chaos payloads: `chaosCarsEngine.js:772-787` (`targetScope`, `targetId` = BIZ_ID, `diceOutcome`, `cycleId`); the port payload (`:1112-1119`, scope `port`) shares the array. The four outcomes: `chaosCarsConfig.js:195-196` (fire), `:240` (inspection), `:313` (transformer).
- `PULSE_CONTENT_RULES` (`neighborhoodPulseMap.js:79-82`) runs on the lowercased text (`:109`): a name ending "Shop" or "Business" right before "closed" pulses vitality −3.
- **Live today:**
  - Business_Ledger has 180 rows; 85 open food/retail/arts rows sit on canon hoods, plus 1 row on "Telegraph corridor".
  - All 4 arts-class rows are Media & Journalism: Bay Tribune BIZ-00018, OakTown Echo BIZ-00099, Bayline 6 BIZ-00183, Oakland 12 BIZ-00184.
  - With food + retail only, every one of the 22 hoods keeps ≥ 1 spot. Thinnest: Lake Merritt 1 food, Temescal 1 food, Piedmont Ave 2 retail.
  - Carried C112 streaks (Carry_Forward_Store `PREV_CYCLE_STATE_JSON` 112, `businessDynamics`): 11 businesses at streak 2/3/5, 0 at 1. Of the spots, 4 are at ≥ 2: Ivy Hill 3 of its 3, Baylight 1. 0 recoveries C111 → C112.
  - Chaos_Cars, last 8 Cycles: the four outcomes hit businesses 2 times, both C107 (minor_fire, forced_temporary_closure), across all 180 rows.

## es contract (the thing to attack)
1. **Source.** `applyBusinessDynamics_` writes `S.hoodSpots = { parentHood: [ { id, name, cls, streak, prevStreak, shed, lift, chaos: [outcome…] } ] }`.
   - **Rows in:** class `food` or `retail` (`d.cls`), parent hood `bizHoodKey(hood)` non-empty. Collected after the closure `continue` (`:650-689`) and after the shed decision (`:690-694`), so wind-down and closing-now rows are out.
   - **Fields:** `shed` = local `declines[id]` on the open path; `lift` = `d.cls === 'food' && barTerm > 0`; `chaos` = every `S.chaosCarsEvents` entry with scope `business`, `targetId === id`, `cycleId` = this Cycle, and outcome in the four. That map is built once before the loop.
   - **Empty case:** `S.hoodSpots = {}` on the early return (`:516`).
   - Arts is out (the four rows are newsrooms). engine.306 adds galleries and theaters if it mints them.
2. **Pick.** A sibling `citizenSpotPool_(popId, neighborhood)` is called right after the state-pool loop (`generateCitizensEvents.js:2756-2759`), with the same `mergeTags(…, calendarTags)`.
   - **Hood:** `resolveHoodOrChild_(ctx, neighborhood) || neighborhood`.
   - **Spot:** the highest `spotRank_(popId, bizId)` over `S.hoodSpots[hood]`, ties broken by BIZ_ID ascending. `spotRank_` = murmur3 fmix32 over FNV-1a of `popId + '|' + bizId`, local to the file. FNV-1a alone (`seedUnit_`, `generationalWealthEngine.js:881`) mixes little when only the last digit differs across BIZ-000NN; the Java-style `hashString_` is worse. No `ctx.rng`, no draw.
3. **Lines.** One spot per citizen, lines from its own facts only; an all-steady spot offers nothing. `<Name>` = the Business_Ledger Name.
   - **Chaos outcomes** (each one on the spot keeps its own line), weight 3.0:
     - `minor_fire` → "heard <Name> had a small fire this week"
     - `major_blaze_contained` → "heard <Name> had a fire this week — contained"
     - `transformer_blowout` → "found <Name> dark — it lost power when a transformer blew"
     - `forced_temporary_closure` → "found <Name> temporarily shut pending an inspection"
   - **Quiet** (`streak ≥ 2`): "has watched <Name> go quiet these last few weeks", weight `pw(1.0, (streak − 1) / 4)` = 2.0 at 2, 5.0 at ≥ 5, cap 6.
   - **Shed** (`shed > 0`): "heard <Name> let some staff go", weight 2.0. It sits beside quiet; both are facts.
   - **Recovery** (`prevStreak ≥ 2 && streak === 0`): "was glad to see <Name> steadier again", weight 2.0.
   - **Lift** (`lift`): "felt a lift at <Name> after the win", weight 1.5.
4. **Tags / grade / pulse.**
   - **Tags:** `source:nbhdState`, `spot:<event>`, `dial:outabout:up|down`. Up = recovery and lift; down = the rest.
   - **Routing:** no `state:retail*` tag, so the kind is `Neighborhood` (`:1063-1066`), graded by the explicit dial tag. The Cut A pulse is symmetric: Up → `Neighborhood` +1, Down → `Neighborhood-Down` −1, once per citizen at `:3737`.
   - **Weights:** no T5 dial multiplier on spot lines (it happened to the spot; every holder is offered it equally).
5. **Tests:**
   - the rendezvous holds: winner removed → only its holders move; loser removed → no one moves; new spot → only a subset moves, to it; identical replay
   - balance over the real POPIDs in `output/simulation_ledger_snapshot.jsonl` per hood
   - a child-area citizen folds to the parent hood
   - a closing-now row and a wind-down row offer no spot
   - every line resolves a dial
   - each line appears only on its fact
   - names ending Shop / Business never trip the closure rule
   - no "noticed" / "coordinated" / "work" in the texts (`:3356-3357`)
6. **Bench.**
   - **Pair:** 1004 from `BASELINE-1004-C112b`, pair C113: A = stage 15, B = stage 15 + Cut C.
   - **Draw probe:** through the HEAD generator on the real population, with a stubbed business chaos outcome at one spot so every line is seen.
   - **Receipts per hood:** citizens with a spot, spots by state, offered and drawn by state, graded tag, pulse. A zero reads as "no eligible spot" vs "eligible, not drawn". Ivy Hill is the primary hood (3 of 3 spots quiet).
   - **Pass bar:** 0 new Engine_Errors, runtime delta logged.
   - **Truth docs:** STUB_MAP regenerated, `S.hoodSpots` registered for the post-write hook.

## Hunts
1. **Source.** Is item 1's collection point right? Check against the closure and wind-down paths, the `d.cls` source, and the `S.chaosCarsEvents` filter (cycle field, scope, port payload). Is `S.hoodSpots` safe when Phase5-BusinessDynamics throws inside `safePhaseCall_` (undefined → the pool must offer nothing, not throw)? Any reader or name collision for `hoodSpots`?
2. **Pick.** Is fmix32(FNV-1a) rendezvous stable and balanced for POPID / BIZ_ID shapes? Does the tie rule matter? Is `resolveHoodOrChild_` callable in the Phase-5 per-citizen loop on both entries (it's used at `:2391`)? "Telegraph corridor": does it fold?
3. **Reach (§15).** Can each line fire on live numbers? Quiet: 4 spots now. Chaos: ~2 business hits / 8 Cycles across all rows. Recovery: 0 last Cycle. Lift: Oaks game week. Shed: 1 spot. How big are the weights against a typical citizen's total pool mass (offered vs expected drawn per holder)? Expected drawn count on a game week when 49 of the 81 spots are food and every food spot offers the lift.
4. **Grade + pulse.** Is the symmetric route via the explicit dial tag sound? Does any other branch in the T5 / archetype / continuity / grief loops touch these entries? Does noDial stay unchanged? Is `outabout` the right carrier for "my spot had a fire / went quiet / came back / felt the win", or is another dial truer to the line?
5. **Wording traps.** Check the closure regex on the lowercased text, the archetype boosts, the content rules (`opened a`, `venture`), and any dedupe or continuity memory keyed on text. Does any wording claim more than its fact (e.g. "dark" for a blowout, "these last few weeks" for streak 2)?
6. **Scope.** Anything past the builder's words (arts out, weights, recovery line), or a ruling it fails to deliver. Is 8b (`$VENUE` draws the citizen's own spot 2 of 3) unblocked by this field shape?

Done = the md exists.
