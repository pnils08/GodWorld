# Dial readers — reader-side blast radius (read-only compile, 2026-11-16)

Live counts below come from `output/simulation_ledger_snapshot.jsonl` (mtime 2026-11-16 20:36, 1,075 rows, all 1,075 carry a parseable DialState with `base`), computed with the engine's own `deserialize_`/`current_`/`bandIndex_` (script: scratchpad/dist.js). No sheet read.

## Live band census (CURRENT = base+mood), bands [<20 | 20-40 | 40-60 | 60-80 | >=80]

| dial | -2 | -1 | 0 | +1 | +2 |
|---|---|---|---|---|---|
| drive | 0 | 0 | 775 | 209 | 91 |
| sociability | 0 | 0 | 789 | 166 | 120 |
| warmth | 0 | 0 | 973 | 101 | 1 |
| openness | 0 | 0 | 922 | 145 | 8 |
| composure | 0 | **4** | 900 | 166 | 5 |
| integrity | 0 | 0 | 1045 | 30 | 0 |
| family | 0 | **1** | 808 | 193 | 73 |
| outabout | 0 | 0 | 1047 | 28 | 0 |
| fandom | 0 | 0 | 936 | 137 | 2 |

- All-middle on the 8 non-fandom dials: 619 / 1,075 (57.6%). Of those, 57 are fandom +1 (and base fandom >= 60), 562 fandom middle.
- Correction to the brief's "nobody below 40": on CURRENT, 4 citizens are composure band -1 and 1 is family band -1 (mood pulls them under 40). Nobody is below 20 on any dial.
- crimeReachable true: 0. integrity +2: 0. composure -2: 0. openness -2: 0. drive <= -1: 0.
- drive +2 AND composure <= 0 (overwork condition): 25.
- Ambition `round(0.7*base.drive + 0.3*base.openness) >= 60`: 231 (stored `maneuver.p`: climb 214, hold 22, retreat 26, none 813). All-middle citizens: max ambition 59, 0 climb.
- base.fandom >= 60: 139.
- base.drive >= 60: 258.
- All-middle citizens' base drive spans 48.2 – 59.9 (median 50); 101 citizens have base exactly 50 on all nine dials.
- Archetype tokens on TraitProfile: Drifter 677, Connector 160, Striver 125, Caretaker 74, Anchor 15, Watcher 7, Catalyst 0, none 17. All-middle citizens: Drifter 605, none 14.
- GAME-mode rows: 60, all outabout middle. All 60 GAME TraitProfiles are the `Archetype:...|` face format (0 in the old `Catalyst/bright` slash format). Legacy `social:/reflective:/driven:` keys on any TraitProfile: 0.

## Part 1 — getCitizenDialBands_ (utilities/compressLifeHistory.js:1245-1283)

Source: `ctx.citizenLookup[popId].DialState` first, else the passed `dialStrOpt` (:1249-1250). Cached per ctx per popId including a cached `null` (:1246-1247, :1251, :1254). Null when no string or `parseDialState_` gives no `base` (:1251, :1254).

| field | computation | file:line |
|---|---|---|
| `bands[d]` | `BAND_SIGNED[bandIndex_(current_(c,d))]` → -2..+2; current = clamp(base+mood) | compressLifeHistory.js:1260; citizenMemory.js:80, :214-219, :56-58 |
| `mult[d]` | `BAND_MULT[bandIndex_(current)]` → 0.5/0.75/1.0/1.25/1.5 | compressLifeHistory.js:1261; citizenMemory.js:221, :57 |
| `current[d]` | raw 0-100 `current_(c,d)` | compressLifeHistory.js:1267-1268 |
| `crimeReachable` | integrity band idx <= 0 (<20) OR (integrity idx <= 1 (<40) AND composure idx <= 0 (<20)) | compressLifeHistory.js:1276-1277 |
| `careerFreq` | `= mult.drive` | :1278 |
| `familyFreq` | `= mult.family` | :1279 |

All nine dials covered (`DIALS`, citizenMemory.js:34).

## Part 2 — the 25 production call sites

"Mid = null?" = is a middle-band citizen treated exactly like a citizen with no DialState. Live DialState coverage is 1,075/1,075, so the null branch is never taken live.

| # | site | field(s) | what it scales / gates | middle → +1 / +2 / -1 / -2 | Mid = null? | live note |
|---|---|---|---|---|---|---|
| 1 | phase05-citizens/generateCitizensEvents.js:2732-2736 | mult.drive, mult.outabout, mult.sociability | participation roll: `chance *= (drive+outabout+soc)/3`; chance starts 0.72 (:715, :2667) + small bumps, cap 0.97 (:716, :2801); guaranteed/forcedInert bypass (:2802) | one dial +1 ×1.083, +2 ×1.167, -1 ×0.917, -2 ×0.833; all three +1 ×1.25 (0.90), all three +2 ×1.5 → cap | yes (×1.0 vs skip) | |
| 1b | same file :2833 → :1761-1775 | mult.outabout (null → 1.0) | previous-evening city events: `oa >= 1.15` → "headed over to X" entries weight 1.6×oa; else "heard about X" weight 1.0 | +1/+2: travels (cross-town attend entries); 0/-1/-2: hears only | yes | outabout +1: 28 live |
| 1c | same file :3458-3477 | mult.* per tag | pool-entry weights: relationship:* ×soc; source:occupation ×drive; source:neighborhood/prevEvening/firstFriday/holiday/creationDay ×outabout; source:sports ×fandom; source:continuity ×(2-composure) only when composure<1; cityEventAttend ×soc; source:fame ×soc; react:brag/defend ×soc, react:humble ×warmth, react:complain ×(2-composure) (:201-205); react weight capped 6 | ×1.25 / ×1.5 / ×0.75 / ×0.5 on the matched tag; continuity: +1/+2 ×1.0, -1 ×1.25, -2 ×1.5; complain: +1 ×0.75, +2 ×0.5, -1 ×1.25, -2 ×1.5 | yes | weights are relative within the pool |
| 1d | same file :3293-3297 | current.warmth, current.drive, current.fandom | Event_Content_Ledger condition scopes (`warmth`, `drive`, `fandom` num kinds, phase02-world-state/loadEventContentLedger.js:115-118) | raw threshold per row; repo rows: undocked `warmth>=60`, `warmth<=39`, `drive>=60` (scripts/undockedEclPool.js:51-128), memory `warmth>=55` (scripts/memoryEclPool.js:48) | **no**: null fails every dial term; a middle value passes a term like `warmth>=55` | whether the memory rows were applied to the live tab: NOT VERIFIED (sheet not read) |
| 2 | phase05-citizens/runRelationshipEngine.js:437-438 | mult.sociability | social-drift chance (base 0.02 :342 + season ≤0.015 :345-348 + …), cap 0.15 (:441) | ×1.25 / ×1.5 / ×0.75 / ×0.5 | yes | |
| 3 | phase05-citizens/runHouseholdEngine.js:531-532 | familyFreq | home/family event chance (base 0.02 + bumps), cap 0.12 (:535) | ×1.25 / ×1.5 / ×0.75 / ×0.5 | yes | |
| 4 | phase04-events/generateGameModeMicroEvents.js:509-510 | mult.outabout | GAME-mode public-figure micro-event chance (0.04 + tier/season bumps :492-506), cap 0.15 (:512) | ×1.25 / ×1.5 / ×0.75 / ×0.5 | yes | **nil live**: all 60 GAME rows outabout middle |
| 5 | phase05-citizens/runCareerEngine.js:1327, :1335-1338 | bands.drive, bands.composure | overwork: drive +2 AND composure <= 0 → `emitPressureTag_('overwork')` Strain line every cycle the condition holds (never adapts) | only drive +2 with composure ≤0; +1 nothing | yes | 25 live |
| 5b | same, :1416-1417 | careerFreq (=mult.drive) | career texture event chance (0.02 base :1361 + bumps), cap 0.14 (:1420); LIMIT 10 events a cycle (:857) over a rotated scan | ×1.25 / ×1.5 / ×0.75 / ×0.5 per row; total capped at 10 so it shifts WHO hits, not how many | yes | |
| 6 | runCareerEngine.js:1742-1748 | bands.drive (null → 0) | job-slot contest: last hiring slot, only when last-in and first-left-out share an income band; `contestRoll_` drive + credential, p = clamp(0.5+0.08·gap, 0.2, 0.8) (citizenMemory.js:479-487) | each band of drive gap ±0.08 to win the slot (e.g. +1 vs middle: 0.58) | yes (null reads 0) | |
| 7 | phase05-citizens/runEducationEngine.js:402-403 | mult.openness | learning-event chance (0.02 base :360 + bumps), cap 0.12 (:405) | ×1.25 / ×1.5 / ×0.75 / ×0.5 | yes | |
| 8 | phase05-citizens/applyBusinessDynamics.js:396 (bizOwnerBands_ :366-398) → :616, :634, :468, :657 | owner bands.drive, bands.composure | owner = Key_Personnel owner/founder resolved to a ledger row. drive +2 → positive growth drift ×`dialOwnerDriveExpandMult` 1.25 (phase01-config/engine94SheetContract.js:551); composure ≥+1 → +1 decline cycle before closure, ≤-1 → -1 (`dialOwnerStreakRoom` 1, :550) | drive: +1 nothing, +2 ×1.25 on a good week; composure: ±1 and ±2 the same ±1 cycle | yes (null → 0, room 0) | |
| 9 | phase05-citizens/runNeighborhoodEngine.js:580-581 | mult.outabout | neighborhood drift chance, cap 0.12 (:584) | ×1.25 / ×1.5 / ×0.75 / ×0.5 | yes | outabout +1: 28, +2: 0 |
| 10 | phase05-citizens/migrationTrackingEngine.js:751-755 | head's bands.openness (null → 0) | misfit relocation lane: `openBand > -2` required; `openBand >= 2` → income ratio 1.5×0.8 = 1.2× hood median (`dialOpenMoveThresholdMult` 0.8, contract :549; MISFIT_INCOME_RATIO 1.5 :128) | +1 nothing, +2 easier misfit door, -1 nothing, -2 lane closed | yes | openness +2: 8; -2: 0 |
| 11 | phase04-events/generationalEventsEngine.js:510 | none (cache prime) | primes per-ctx cache from the row before check*_ helpers read by popId | — | — | |
| 12 | generationalEventsEngine.js:590-591 | familyFreq | single-mother birth chance 0.0005 (×2 established solo) | ×1.25 / ×1.5 / ×0.75 / ×0.5 | yes | births capped 1/cycle (2 in Sept) :933, :944 |
| 13 | generationalEventsEngine.js:1041-1042 (checkWedding_) | familyFreq | marriage odds | — | — | **dead**: no caller (:555-558) |
| 14 | generationalEventsEngine.js:1101-1102 (checkBirth_) | familyFreq | married-with-household birth chance (~0.001-0.005, floor 0.0005 :1112) | ×1.25 / ×1.5 / ×0.75 / ×0.5 | yes | same 1-per-cycle cap |
| 15 | generationalEventsEngine.js:1311-1312 (checkPromotion_) | careerFreq | promotion odds | — | — | **dead**: call commented out (:609-618) |
| 16 | generationalEventsEngine.js:1395-1396 (checkHealthEvent_, called :658) | bands.composure | health-event chance ×`dialBurnoutHealthMult` 2 (contract :554) | only composure -2 → ×2; else ×1 | yes | **nil live**: 0 at composure -2 |
| 17 | phase04-events/generateGenericCitizenMicroEvent.js:568-569 | mult.outabout | ambient micro-event chance (T3-4 0.10, thin-history ×1.5-5, + bumps), cap 0.12 (:571) | ×1.25 / ×1.5 / ×0.75 / ×0.5 | yes | |
| 18 | phase05-citizens/runYouthEngine.js:462-463 | mult.drive | youth event prob 0.15-0.25 by school level (:48-53) × QoL/hotspot | ×1.25 / ×1.5 / ×0.75 / ×0.5 | yes | |
| 19 | runYouthEngine.js:520-521 | mult.drive | youth texture line prob 0.65 (:113), cap 0.95 (:114) | +1 0.81, +2 →0.95 cap, -1 0.49, -2 0.33 (before calendar/hood) | yes | |
| 20 | phase05-citizens/bondEngine.js:2094 (bondDialBand_ :2088-2099) → callers | bands.warmth / sociability / family | pair factor `1+0.125·avg(bandA,bandB)` (:2101-2103): friendship & professional/neighbor growth (:674-682), family maintain (:686), neglect fade `×(2-factor)` (:831), compat score `(wf-0.75)·4` → 0-2 pts toward romCompat ≥6 (:941-943); romance gate ×family pair factor (:2310); single-person sociability encounter `1+0.125·band` (:1183); GC marriage lottery `1+0.125·band(family)` (:2780); romance triangle `contestRoll_` warmth+soc (:706-710) | one person +1: pair factor +0.0625 (compat +0.25 pt); single-person sites +1 ×1.125, +2 ×1.25, -1 ×0.875, -2 ×0.75; triangle ±0.08 per band | **conditional**: no DialState → TraitProfile face `warmth:NN` → band; no face → 50 → 0 | |
| 21 | phase05-citizens/casinoLedgerEngine.js:945-948 | bands.integrity, bands.composure | integrity +2 → never places a wager; composure -2 → tilt stake band (`casinoStake_` :394-400) | only ±2 act | yes | **nil live**: 0 integrity +2, 0 composure -2 |
| 22 | phase05-citizens/generationalWealthEngine.js:3249-3254 | bands.drive, bands.integrity (null → 0) | heritage business stake: wealthiest member vs each >$100k challenger, contest drive+integrity | ±0.08 win prob per band of gap; equal bands = coin flip | yes | |
| 23 | phase05-citizens/runConductEngine.js:189-190 | bands.composure, bands.integrity, crimeReachable | moral test: requires bands (null → skip); chance 0.012, ×1.25 if composure ≤-1 (:198), cap 0.03; LIMIT 3 tests/cycle (:85); not crimeReachable → slipP by integrity band: ≤-1 0.35, 0 0.25, +1 0.15, +2 0.05 (:228); crime ladder (:214-219, :236-241) only if crimeReachable | integrity +1 slip 0.25→0.15, +2 →0.05; composure -1 test chance ×1.25 | **no**: null never tested; middle tested at 0.25 | crimeReachable 0 → crime ladder dead; composure -1: 4; integrity +1: 30 |
| 24 | phase05-citizens/updateCivicApprovalRatings.js:1485 (holderIntegrityBand_ :1472-1487) → :833-838 | holder bands.integrity | approval-ceiling scandal chance multiplier (`dialIntegrityScandalLow` 1.5, `…High` 0.5, contract :552-553) | +1 ×0.75, +2 ×0.5, -1 ×1.25, -2 ×1.5 | yes (0 and null → ×1) | officeholders only, by name match |
| — | scripts/coverageReport.js:183 | bands | diagnostic report only | — | — | not a sim effect |

## Part 3 — readers that bypass getCitizenDialBands_

### Engine (phase*/utilities)

| reader | reads | does | file:line |
|---|---|---|---|
| maneuver posture | raw base.drive, base.openness (fallback TraitProfile `drive:NN`, else 50) | ambition = round(0.7·drive + 0.3·openness) (`maneuverDriveWeight` 0.7); ≥ `maneuverClimbBar` 60 → climb, debt/standing → retreat, else hold | phase05-citizens/maneuverEngine.js:79-97, :127-134, :257-258; contract :572-577 |
| → maneuverFactor_ | posture | climb ×1.5, retreat ×0.5 (`maneuverClimbOdds`/`RetreatOdds`) on: casino placement (casinoLedgerEngine.js:941), solo household door (householdFormationEngine.js:434, goal 'establish'), home purchase (generationalWealthEngine.js:2114, goal 'home'), misfit relocation (migrationTrackingEngine.js:762) | maneuverEngine.js:343-352 |
| → climb-only eligibility | posture | only climbers enter the civic-opening mover pool (runCareerEngine.js:1660-1661); cross-field hire needs climb AND openness ≥60 (maneuverEngine.js:356-361 → runCareerEngine.js:1761) | |
| → posture line | posture change | `[Maneuver-Climb/Retreat/Hold]` LifeHistory line on change (hold-from-default silent) | maneuverEngine.js:283-322 |
| casino drive fallback | raw base.drive (or face) | when no posture: drive ≥60 → placement ×1.4 | casinoLedgerEngine.js:421-434, :940-941 |
| pay position | raw base.drive | `pos += ((drive-50)/100)·0.2` → ±0.10 of the job's pay band, continuous; used at hire, career changes, advancement, unpriced citizens, D4 floors | generationalWealthEngine.js:930-933, :984; callers runCareerEngine.js:1793, :1861; processAdvancementIntake.js:940, :1013; godWorldEngine2.js:1680; generationalWealthEngine.js:673, :804, :1028 |
| sports-week fan line | raw base.fandom ≥60 (+ `ds.fan` team) | a sports-week LifeHistory line for every signed game week of the citizen's team | phase05-citizens/applyGameNightMoments.js:597-611 |
| fandom donors | raw base.fandom ≥60 | household donors seed a no-fandom citizen's fandom (capped 65) | utilities/compressLifeHistory.js:1348-1361, :597 |
| council challenger pick | raw base drive/integrity/composure via `dialBandIndexFromValue_` | reject if drive <60, integrity <40, composure <40; `score += driveBandIndex` (2-4) | updateCivicApprovalRatings.js:1459-1467, :1553-1561, :1582-1585 |
| Archetype (TraitProfile face) | base bands → Archetype token (Outlaw/Catalyst/Striver/Connector/Caretaker/Watcher/Anchor/Regular/Drifter) | written by the Phase-9 fold | compressLifeHistory.js:1683-1700, :1705-1709, :712 |
| → archetype pool weights | TraitProfile Archetype | Striver work ×1.3 rivalry ×1.2; Connector alliance ×1.3 neighborhood ×1.2; Watcher continuity ×1.3; Anchor neighborhood ×1.3 continuity ×1.2; Caretaker alliance ×1.2; Drifter: all used tags ×1.0 | generateCitizensEvents.js:853, :894-924, :2629-2631, :3428-3448 |
| → trait-word weights | `traits.social/reflective/driven ≥0.6` | **dead**: dial face carries no such keys (0 live) | generateCitizensEvents.js:3446-3449 |
| → GAME trait pools | `traitProfile.split("/")[0]` | **dead**: 60/60 GAME faces have no "/" format | generateGameModeMicroEvents.js:411-415 |
| → story hooks | Archetype | alliance hook names archetypes; Watcher/Catalyst/Striver counts trigger hooks (Catalyst ≥5: 0 live) | phase07-evening-media/storyHook.js:1242-1252, :1331-1365 |
| → seed interview picks | Archetype (+ legacy tone keys, dead) | scores citizens for a seed's preferred archetypes | phase07-evening-media/applyStorySeeds.js:487-510 |
| face in sightings | TraitProfile string | carried into famous-sighting output | phase07-evening-media/buildEveningFamous.js:175 |
| writers (not readers of effect) | — | chaos accumulator (phase04-events/chaosCarsEngine.js:500-506), maneuver memory, Phase-9 fold/integrity wear (citizenMemory.js:404-448), reflection drain | |
| non-dial DialState fields | pressure, grief, debtDefault, lifeEvent | household formation, pressure tags, ECL `bereaved/defaulted` scopes — ride on DialState, not the 9 dials | householdFormationEngine.js:1010-1044; citizenDialMap.js:513-549; loadEventContentLedger.js:120-122 |

### Crons / agent wake prompts (Node)

| reader | reads | does | file:line |
|---|---|---|---|
| lib/citizenDials.disposition | current (base+mood) | band phrase per non-middle dial joined by "; "; all middle → `'even-keeled, unremarkable'` | lib/citizenDials.js:16-18, :21-31, :48-56 |
| citizen-wake prompt | disposition | `Your temperament: ${disp}.` in the system prompt | scripts/citizen-wake.js:168, :213 |
| other voices | disposition | same phrase into citizenVoice (scripts/citizenVoice.js:152), citizen-exchange (:125), cron-work-wake (`Your temperament:` :269-295), workerWake (:111), reporterIdentity (:72), voice disposition cache for the 4 citizen-voice agents (scripts/refreshVoiceDispositionCache.js:6-35) | |
| dialTrajectory | base vs current | names a pole phrase only when |current-base| ≥ 8 AND band is non-middle; max 2 | lib/wakePerception.js:82-92; used citizen-wake.js:185, citizenVoice.js:153, citizen-exchange.js:126 |
| citizen cards Essence | base via describe_ | `Essence: <words>`; all middle → 'even-keeled, unremarkable' | scripts/buildCitizenCards.js:603-611, :690-691 |
| wake pool membership | DialState presence | row without a ≥5-char parseable DialState never enters the pool; deviation floor `SHAPED_MIN` 60 exists but every caller passes `shapedMin: 0` | lib/wakePerception.js:27, :596, :626-635; callers citizen-wake.js:342, citizenVoice.js:305/344/365, citizen-exchange.js:448/459, workerWake.js:106, reporterIdentity.js:69 |
| wake selection | eventMag only | `weights = 1 + eventMag·2`; owed/show reserves first; dials not read | lib/wakePerception.js:1013-1043 |
| `l1()` | — | no caller | lib/citizenDials.js:66 |
| `deviation()` | — | only the pool floor (off) and seedTier1EssenceLive.js:170 (seeding script) | |

## Part 4 — verdicts

(a) Every one of the nine dials has a wired production reader. Nil in practice:
- integrity: crime ladder dead (crimeReachable 0); casino refusal dead (0 at +2). Live effect only for 30 citizens at +1 (conduct slip 0.15 vs 0.25, runConductEngine.js:228; scandal ×0.75 if they hold office). Within the middle band integrity only matters for the council-challenger bar (≥40, always met).
- composure -2 branches (health ×2 generationalEventsEngine.js:1396, casino tilt casinoLedgerEngine.js:947, conduct/crime): 0 live.
- outabout: 0 at +2, 28 at +1; GAME-mode site nil (60/60 middle).
- openness ±1: migration ignores ±1 (migrationTrackingEngine.js:753-754); only education ×mult and maneuver ambition (0.3 weight) read it.
- Dead code paths: checkWedding_ (:1041), checkPromotion_ (:1311), trait-word weights, GAME trait pools, Catalyst hook.

(b) Middle-band-on-all-8: every banded reader returns ×1.0 / band 0, identical to any other middle citizen. Within-band paths that do differ: (1) pay position, raw drive, ≤0.023 of the band width across the live 48.2-59.9 spread (generationalWealthEngine.js:984); (2) ECL rows with a threshold inside 40-60 (memoryEclPool.js:48 `warmth>=55`; live application unverified); (3) maneuver ambition could reach 60 at base drive and openness ≥59.5, but live max is 59 → 0 climb. Fandom sits outside the 8: 57 of the 619 are fandom +1 / base ≥60 → sports-week lines, `source:sports` ×1.25, "a real fan" in the prompt. Partners' and rivals' dials also move a middle citizen's bond pace and contest odds. Otherwise their prompt reads "even-keeled, unremarkable".

(c) Largest one-band moves:
1. drive 0→+1 (with openness ~50): ambition ≥60 → climb, ×1.5 on casino, solo door, home purchase, misfit relocation; entry to civic-mover and cross-field pools; plus council-challenger eligibility (drive ≥60) and career/youth ×1.25.
2. fandom crossing base 60: a LifeHistory line every signed game week (applyGameNightMoments.js:599), becomes a household fandom donor, ×1.25 sports pool weight. 139 live.
3. drive +1→+2 with composure ≤ middle: a Strain pressure line every cycle, never adapting (runCareerEngine.js:1335-1337). 25 live. Runner-up: family 0→+1 (birth ×1.25, household ×1.25, romance/GC lottery ×1.125, pair factor).
