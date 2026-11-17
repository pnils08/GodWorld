# Dial engine writers — who decides dial, direction, size (read-only compile, 2026-11-16)

Sources opened: code under phase*/ utilities/ lib/; local artifacts output/beats/LifeHistory_Log.jsonl (C115–C116, 4,997 rows),
output/beats/Reflection_Intake.jsonl, output/beats/Neighborhood_Map.jsonl. No sheet read. Event_Content_Ledger (ECL) rows live
in the sheet only (loader phase02-world-state/loadEventContentLedger.js:1-40); their Tags cells were NOT read — where a line's
sign comes from an ECL row, the "observed" split below is from the C115–C116 log, not from code.

## 0. Mechanics that apply to every row

- Grading (generateCitizensEvents.js, "gCE"): `kindMovesNothing_` :1210-1215 calls `nudgesForEvent_(kind,1,text)` — a kind whose
  bare key (or text content rule) moves anything is written BARE and never graded. Otherwise `gradedTagFor_` :1217-1241:
  1. explicit `dial:<d>:<up|down>[:S|M|L]` tag on the entry; 2. a fact tag in DIAL_BY_FACT_TAG :1166-1188; 3. a generic
  `:negative|down|low|bad|loss|moderate-low` / `:positive|up|high|good|win|moderate-high` tag (FACT_*_RE :1208-1209) on the
  source's dial (DIAL_BY_SOURCE :1192-1207). `band = 'S'` default :1218. No sign → line is dropped (`continue` :3712), not rerolled.
- No `dial:...:M` or `:L` exists anywhere in phase*/utilities/lib (grep `dial:[a-z]+:(up|down):[SML]` = 0 hits). C115–C116 log:
  every gCE-graded kind is 100% S.
- BAND_DELTA S=1 M=2 L=4 (citizenDialMap.js:318). gradedNudges_ :327-333.
- Phase 9 fold reads the LifeHistory CELL, not the log: compressLifeHistory.js:538 `parseLifeHistoryEntries_(lifeHistory)`;
  per-cycle net per dial :1639-1647 → applyCycleEffects_ (citizenMemory.js:145-153). settleCycle_ (×0.8, fandom ×0.9; |mood|<0.5→0)
  runs BEFORE the fold (compressLifeHistory.js:612; citizenMemory.js:205-211). roomScaled_ shrinks a push toward the pole it heads
  for: full size up to 50, ×(room/50) beyond (citizenMemory.js:87-100).
- Hardening: streak reset to 0 if mood is 0 or points the other way (citizenMemory.js:150); streak ±1 per cycle with a nonzero
  net on that dial (:116-117); at |streak|≥3, base += mood×0.4×room, mood ×0.6, streak 0 (:126-134). A single −1 push stays felt
  3 more cycles (−1 → −0.8 → −0.64 → −0.51 → 0). Three consecutive −1 cycles from mood 0: mood −2.44 at the third, base −0.98.
- Log ≠ fold input: Advancement rows are log-only (processAdvancementIntake.js:1023 appendRow; no cell line for an existing row
  — only a new row's untagged sentence at :1122), so they never fold. Bond lines (ConnectionWithdrawn / ConnectionMaintained /
  TrustGuarded / Divorce) are cell-only (bondEngine.js:2020-2030 appendBondLifeLine_) and absent from LifeHistory_Log.

## Part 1 — writer table

Observed = C115+C116 LifeHistory_Log, citizens-lines by graded direction (up/down).

| Kind | Writer file:line | Dial chosen by | Up vs Down | S/M/L | Real state feeding it |
|---|---|---|---|---|---|
| Neighborhood (gCE, ~840 of 920) | gCE :3687-3715 via pools: ECL `source:neighborhood` rows; communityLife DOMAIN_MOMENTS :1994-2003; nbhdState neighborhoodStatePool_ :1795-1897; spot lines :251-268. Hardcoded hood texture :2886-2890 and template lines :2283-2287 carry no sign (slotter tags :1050 are source:template + tone:plain|tense|noir|bright|tender, none match FACT_RE) → never written; observed 0 source:template lines C115–C116 | the entry's `dial:` / fact tag: outabout (nbhdState, neighborhood), sociability (communityLife) | authored per entry. communityLife 7 up / 1 down. Trajectory reactions HOOD_REACTIONS_ :164-198: growth → 2 Up lines at mass/3 + 2 Down at mass/6 (2:1 up); decay → 2:1 down; steady → none. state:housing / state:watchful → composure Down :1171 (housingPressure ≥ dialHoodPressureBar :1832; crime carry ≥1 :1843; crimeIndex ≥ hoodCrimeBar :1876). retail ≥1.25×median → Lifestyle kind (up); retail ≤0.75×median → outabout Down :1867. mood ±0.15 off median → composure up/down :1888-1893. Spot: chaos/quiet/shed Down, recovery/lift Up :259-266 (weight 11). ECL rows: sheet. Observed 690 up / 230 down; ECL `source:neighborhood` 158 all outabout Up | S (default :1218) | Neighborhood_Map trajectory/momentum, HousingPressure, CrimeIndex, retailVitality, sentiment (vs city median); S.crimeByNeighborhood; the citizen's spot business; dial bands reweight entries :3458-3479 |
| Neighborhood (runNeighborhoodEngine, 81) | runNeighborhoodEngine.js:589-714 | `dial:outabout` for texture; context lines name their own (soc/warmth/composure/openness) | texture lines kept only if their own direction equals hood trajectory: growth→Up, decay→Down, steady→nothing written :597-613. Context: rain/fog → outabout Down :632-637; weather irritable → composure Down :638; econMood ≤35 Down / ≥65 Up :643-648; FirstFriday/CreationDay/holiday/culture/community → Up :617-663. Pressured hood (housingPressure ≥ dialHoodPressureBar or crimeIndex ≥ dialHoodCrimeBar×median) → Friction instead :681-694 | hard-coded `-S` :714 | roll: driftChance 0.02 + condition bumps, ×outabout band mult, cap 0.12 :524-589 |
| Civic Perception (~370) | gCE primaryFromTags :1146-1147 (source:civicNews, source:bias) | ECL row tag | hardcoded civicNewsPool :2259-2280 has no sign → never written; bias pool :3001-3013 tags `biasSign:±1` match neither FACT_RE → never written. Every written line is an ECL civicNews row; sign is its Tags cell (sheet, not read). Observed 528 up / 212 down: composure +195/−73, openness +170/−139, sociability +89/0, outabout +36, warmth +32, drive +6 | S | sheet tags only; S.initiativeEvents feeds only the unwritten hardcoded lines |
| Daily (~300) | gCE household moment :2486-2543; familyLife DOMAIN_MOMENTS :1954-1963; family texture :3032-3047; ECL familyLife rows | entry tag | household: quiet (roll <0.012) → Daily-Family-Up-S; crisis tier (roll <0.0025) → hash picks 'crisis' kind → Daily-Composure-Down-S, 'celebration' → Family-Up :2527-2540. familyLife 8/8 Up. family:partner → family Up, family:widowed → warmth Up, family:divorced → composure **Up** :1184-1185. Observed 554 up / 37 down (incl. integrity +58, sociability +59 from ECL rows) | S (household tag literal `-S`) | HouseholdId with ≥2 living members; MaritalStatus |
| Personal (~230) | gCE reflection :1974-1983, identity :2004-2013, listening :2017-2026, unlived echo :1291, grief memorial :1093/:1187; ECL rows; also mode engines | entry tag | reflection 4 up / 4 down; identity 7 up / 1 down; listening 6 up / 2 down; echo openness Up; memorial warmth Up. Observed 342 up / 124 down | S | MemoryRegisters (echo), grief envelope; otherwise none |
| Sports (~200) | gCE: ECL sports rows (observed 339 `dial:fandom:up`); season pool :2921-2927 hard-coded `dial:fandom:up` (only championship/playoffs/late-season); game-night pool :2171-2239; team ECL lines in a signed week → SPORTS_WEEK_TAG_ :3691-3695. applyGameNightMoments.js: named route :407-418, trigger routes :219-248, fan/staff week :582-614 | fandom (most); triggers composure/drive/warmth; named → sociability | game night: win/winStreak → Up, loss/coldStreak → Down, neutral unwritten :2198-2199 (bucket gameNightBucket_). Named: Sports-Sociability-Up-S hard-coded :418. Triggers: celebration Composure-Up-M, setback Composure-Down-M, season Drive-Up-S, community Warmth-Up-S, injuryReturn Composure-Up-S :245-247. Fan week: every living citizen with base fandom ≥60 (or GAME-clock staff) of a franchise with a signed week gets Sports-Win/Run/Title (+2/+4/+6) or Sports-Loss (−2) / LosingWeek (−1), no roll :590-614; class by sportsWeekClass_ (sportsWeekRecord.js:139-148). Athletes: Sports-Played composure +1 in any non-win game week :409-411. Observed 395 up / 7 down + Sports-Win 60 | S except trigger M | Oakland_Sports_Feed rows; S.sportsWeek w/l vs expectation; DialState base.fandom and fan team |
| PrevEvening (~115) | gCE previousEveningPool_ :1666-1784; generic micro prevEve :316-322 + signFor_ regex :418-419 | fact tag via DIAL_BY_FACT_TAG :1174-1176,:1186 | evening:crowd → sociability Up (includes "avoided X after hearing about last night's crowds" :1677); evening:nightlife → outabout Up (includes "noticed the city was quieter than usual" vol ≤2 :1695); cityEventAttend → outabout Up; vibe → warmth Up; evening:safety → composure Down (includes "still buzzing from last night's celebrations" :1716-1718); traffic → outabout Down. evening:food / famous / streaming / sports / cityEvent: unsigned → never written. Observed 169 up / 61 down | S | S.previousEvening (citywide), own-hood topCrowds, outabout band (travel ≥1.15 mult :1762) |
| Media (~105) | bare `Media` = {sociability:+4} (citizenDialMap.js:86). gCE :3210-3214 (chanceHit 0.2 adds a getMediaInfluencedEvent_ entry, mediaFeedbackEngine.js:1249); processAdvancementIntake.js:1573 tier-climb, :638-639 "Named in a hard light — the coverage was not kind", :1691 demotion "The spotlight moved on"; generateMediaModeEvents.js:119-123 journalists | fixed map | **hard-coded Up +4** on every line, including the hard-light and demotion lines (verified nudgesForEvent_ output) | not graded (+4 ≈ L size) | UsageCount / citations |
| Background (~95) | gCE homeLife :1964-1973; generateGenericCitizenMicroEvent.js SIGN_BY_TEXT_ :334-411, signFor_ :416-427, gradedKind_ :432-437 | per-text sign table | homeLife 6 up / 1 down ("couldn't sleep for the wind"); generic table 79 up / 9 down over all its kinds. Generic hood lines take trajectory growth Up / decay Down :411-415. Observed 170 up / 18 down | generic hard-coded `-S` :436 | generic roll: tier ≤1 0.50, tier 2 0.25, else 0.10; ×5/×3/×1.5 for ≤2/≤5/≤10 history lines; + bumps; ×outabout mult; cap 0.12 :527-572 |
| Advancement (~95) | processAdvancementIntake.js:1023 `logSheet.appendRow(... 'Advancement' ...)` | — | **folds nothing**: written to LifeHistory_Log only; the fold reads the cell. (If it folded, CONTENT_RULES "tier 4" → drive +6, citizenDialMap.js:296) | — | intake row, tier |
| Lifestyle (~80) | gCE curiosity :1984-1993; nbhdState state:retail :1862-1866 → primaryFromTags :1127 | openness (curiosity), outabout (retail) | **hard-coded Up**: curiosity 8/8 openness Up; state:retail → outabout Up :1169. No Down entry exists for this kind (retail-low routes to Neighborhood). Observed 160 / 0 | S | retailVitality vs median |
| Undocked-Audience (~60) | gCE :1114 (source:undocked, not ecl:kind:pilot) | fixed map `{fandom:+1}` (citizenDialMap.js:222) | **hard-coded Up**, never graded, independent of text | not graded (+1) | show airing (pool gate :3392-3410) |
| Work (~50) | gCE :1136 source:occupation; occupationPoolFor_ :2336-2342 + ECL occupation rows; gate ENGINE, not retired :2944 | fixed map `{drive:+4}` (citizenDialMap.js:51) | **hard-coded Up +4** regardless of text ("washed the blood out of the rig…"). Same for runCareerEngine texture `Career` {drive +4} :1444 | not graded | Occupation |
| Micro-Event (~37) | gCE groove :2030-2036 | composure | 2 up / 3 down. Observed 30 / 44 (only kind net-down) | S | none |
| Strain / Friction (~22 each) | emitPressureTag_ citizenDialMap.js:539-564; callers: hood runNeighborhoodEngine.js:684; rent migrationTrackingEngine.js:269-272; debt generationalWealthEngine.js:539-542; unemployed runCareerEngine.js:1925; overwork runCareerEngine.js:1335-1337. Chaos Friction chaosCarsConfig.js:181,263,300,334-339 | fixed: Friction composure −2, Strain −1, Stumble −2/drive −1 (citizenDialMap.js:186-188) + cause dial (rent/debt/hood outabout −1, unemployed drive −1, overwork family −1) :243-246 | **always Down**. First breach Friction (unemployed Stumble, overwork Strain) :446; ongoing within 3 cycles → Strain; ≥6 consecutive → adapted, nothing written (overwork never adapts) :447-452,:550-551. One tag per slot per cycle (rent+hood share 'housing') :490,:543-544 | not graded | rent >dialFrictionRentBurden % of income (unbuffered renter); DebtLevel ≥ maneuverRetreatDebt; income 0 or laid off; drive band +2 & composure band ≤0; hood pressure bars (only for a citizen who won the 2–12% drift roll) |
| Education (~20) | runEducationEngine.js:424 bare `Education`; runYouthEngine.js:1017/:1098 academic | fixed `{drive:+5, openness:+3}` (citizenDialMap.js:47) | **hard-coded Up** | not graded | roll 0.02 + bumps ×openness mult, cap 0.12 :360-405; LIMIT 10 per cycle :167,:328 |
| QoL (~15) | gCE qolPoolFor_ :1536-1583; patrol :1586-1596 | cause → dial QOL_CAUSE_DIAL :1569 | LOW bank (qol ≤0.45) Down, HIGH (≥0.65) Up :1571,:1578-1581. BUT QoL has no DIAL_MAP key, so kindMovesNothing_ runs CONTENT_RULES on the text: any text with "neighbor" matches citizenDialMap.js:297 → {sociability +3, warmth +2} and is written BARE, ungraded — LOW lines "heard another neighbor was between jobs", "overheard neighbors discussing recent disturbances", "watched a neighbor pack up for somewhere cheaper" fold **Up +3/+2**. Observed 17 graded (1 up / 16 down) + 14 bare at +3/+2 | S or bare | hood qualityOfLifeIndex and its weakest/strongest parts; patrol strategy |
| Relocation (~12) | migrationTrackingEngine.js:806-821; 10-week verdict :515-529 | composure or drive | DISPLACED (maxRisk ≥9) or `pressure` lane → Composure-Down-M; opportunity lane → destination income > current → Drive-Up-M, else Composure-Up-M. Verdict: worked (pressure <7, or trajectory ≠ decay) → Home-Composure-Up-S else Down-S. Observed 21 up / 3 down | **M hard-coded** | household income vs hood income, rent burden lane, destination trajectory |

Other graded writers seen in the window: youth runYouthEngine.js YOUTH_SIGN_BY_TEXT :1027-1067 (28 up / 2 down) for Team/Civic/Neighborhood, others bare
positive maps; generateCivicModeEvents.js (32 up / 13 down `dial:` tags), generateMediaModeEvents.js (3/3), generateGameModeMicroEvents.js
(67/12); runCivicRoleEngine.js:404-421 (CivicRole-Up/Down-S/M/L, see Part 2).

## Part 2 — World_Config keys (registry phase01-config/engine94SheetContract.js; seed value shown)

engine.299 Task 8 keys: **none exist.** `grep engine.299 phase01-config/` = 0 hits. Plan docs/plans/2026-10-18-event-engines-move-dials.md:65:
"held for the builder — under 'no rebuild' no rate machinery was added: every graded line is band S, moves band M, and each pool keeps
its existing odds." §Rates :72-87 is an unbuilt proposal.

| Key | Read at | Code behaviour if missing | Seed |
|---|---|---|---|
| civicRoleFireChance / UpChance / PremiseLean / MediumOdds / LargeOdds | runCivicRoleEngine.js:42-46, :133-145, :408-421; bands civicRoleBands_ :151-156 | throws :143 | 0.35 / 0.6 / 0.2 / 0.12 / 0.04 (contract :239-243) |
| lifeEventFireChance / UpChance / PremiseLean / MediumOdds / LargeOdds / LiftCycles / PromotionLift / PromotionDrop / PromotionOwnChance / HomeRollBoost / HomeCarryBar, homeLossChance | lifeEventConfig_ runCivicRoleEngine.js:316-336; roll :338-344; promotion die runCareerEngine.js:592-615; home die generationalWealthEngine.js:2073 | throws :332 | 0.05 / 0.6 / 0.2 / 0.08 / 0.01 / 2 / 1.5 / 0.5 / 0.05 / 3 / 0.5, 0.017 (:245-256) |
| dialHoodPressureBar | pressureBar_ citizenDialMap.js:481-485 → runNeighborhoodEngine.js:682, gCE:1832 | throws | 3 (:530) |
| dialHoodCrimeBar | hoodCrimeBar_ runNeighborhoodEngine.js:263-265 | throws | 1.45 (:531) |
| dialFrictionRentBurden | migrationTrackingEngine.js:269 | throws | 50 (:528) |
| maneuverRetreatDebt | generationalWealthEngine.js:540 | throws | 6 (:573) |
| dialSetbackLossPct | casinoLedgerEngine.js:828 | throws | 5 (:529) |
| dialBurnoutHealthMult | generationalEventsEngine.js:1396 | throws | 2 (:554) |
| dialOpenMoveThresholdMult | migrationTrackingEngine.js:753 | throws | 0.8 (:549) |
| integrityWearRate / integrityWearFloor | compressLifeHistory.js:470-484 | absent → wear off; unusable → Engine_Errors row, off | 0 (off) / 10 (:402-403). Live value NOT read |
| griefParticipationMultiplier / PublicActivityMultiplier / SupportMultiplier / ResponseChance | getGriefConfig_ compressLifeHistory.js:100; gCE :2789, :3484, :3507 | (not read) | 0.80 / 0.75 / 1.25 / 0.35 (:19-22) |
| gcSurfaceChance, hoodFloorSurfaceQuota | gCE:2442-2445 | throws | 0.06, 20 (:586,:592) |
| eclExclusivePools / eclExclusiveMinLines | gCE:3344-3346 | '' / 3 | — |
| folkMemoryWindow | gCE:494-497 | throws if invalid | — |
| illnessFallbackRate | generationalEventsEngine.js:1404-1408 | 0.05 + warning | — |
| chaosShipChancePerCycle | chaosCarsEngine.js:1094-1095 | 0.18 | 0.18 (:88) |

Code literals (not World_Config) that set the routine rates: PARTICIPATION_BASE 0.72, PARTICIPATION_MAX 0.97, ATMOSPHERIC_MAX_EVENTS 4
(gCE:715-722; 1..4 lines per participating citizen :3518); participation ×(drive+outabout+sociability band mults)/3 (gCE:2731-2736);
HH_QUIET 0.012, HH_CRISIS 0.0025 (gCE:2492-2493); media entry 0.2 (gCE:3210); bias 0.15 (:3001); runNeighborhood drift 0.02→cap 0.12;
generic micro tier odds 0.50/0.25/0.10 cap 0.12; education 0.02 cap 0.12, LIMIT 10; conduct 0.012 cap 0.03, LIMIT 3
(runConductEngine.js:85,:195-207); RARE_EVENT_SCALE 0.1 (runCareerEngine.js:135); BAND_DELTA, MOOD_DECAY 0.8 / fandom 0.9,
HARDEN_STREAK 3, HARDEN_FRACTION 0.4 (citizenMemory.js:37-42); REFLECTION_MULT 0.45, REFLECTION_ACCRETION_FRAC 0.5
(compressLifeHistory.js:126-127); PRESSURE_LOOKBACK 3 / PRESSURE_ADAPT 6 (citizenDialMap.js:450-451); CONFRONT_ADAPT 6,
BOND_FADE 0.5/0.7 (bondEngine.js:1912-1916).

## Part 3 — named big events

| Event | Writer | Trigger / per-cycle chance as coded |
|---|---|---|
| Promotion | runCareerEngine.js:592-605 (die L-up → careerApplyPromotion_); :654-673 applyEmployerSuccess_; :582-583 M-break own raise | die: lifeEventFireChance 0.05 × P(L)=0.01×aura (aura 0.9–1.35, :594) × up 0.6±0.2 ≈ 0.03%/staffer/cycle. Employer: promoP = min(0.5, growth/100/52 × staff × gapFactor × 0.1) per business per cycle. Held M break: 0.05/cycle. checkForPromotions.js:503 and processAdvancementIntake.js:651/:1285 write `Promotion` to the log only (appendRow) |
| Career-Layoff | runCareerEngine.js:601 (die L-down), :675-683 (employer), writer :257; applyBusinessDynamics sheds (header :28-32) | die ≈ 0.05×0.01×0.4 ≈ 0.02%; employer layoffP = min(0.5, −growth/100/52 × staff / gf × 0.1); distress streak > bizDeclineStreak sheds ≤2/business/cycle |
| Divorce | householdFormationEngine.js:1177-1188 | no roll: a married pair with ≥3 distinct crisis kinds within 13 cycles (both partners pooled), ≥1 major (default, bereaved, jobless, forcedSale) :1023-1025, :1041-1063, :1116-1119 |
| Wedding | generationalEventsEngine.js checkWedding_ :1018-1040 (tag :1070); bondEngine.js:2476 | 0.002 (0.004 age 28-35, 0.001 >40) +0.01 with an active romantic bond; age 24–58 (:78-85); bond path: romance step 0.20 / 0.10 per cycle (bondEngine.js:698) |
| Birth | checkBirth_ :1076-1112 (tag :1124) | 0.003 − 0.001×children (+0.002 age 28-35, −0.001 >38, floor 0.0005); age 26–42; <3 children |
| Hospitalized / Critical | checkHealthEvent_ :1382-1450 then admission :658-668; transitions :788-905; heat wave :315-345; chaos medical_emergency → Critical, workplace_accident → Hospitalized (chaosCarsConfig.js:208,210) | base 0.0005 / 0.001 ≥50 / 0.002 ≥60 / 0.003 ≥70; ×1.5 winter, ×1.4 stress holiday, ×1.3 month 1, ×dialBurnoutHealthMult at composure band −2, ×hood sick rate/0.05 |
| Transgression-* | runConductEngine.js:244-262; chaos arrest chaosCarsConfig.js:183 | conduct: needs crimeReachable = integrity <20, or <40 with composure <20 (compressLifeHistory.js:1276-1277); test 0.012 (×1.25, ×1.2, ×0.7) cap 0.03; LIMIT 3 resolved tests per cycle citywide. Chaos `arrested` (Transgression-Serious −8) weight 0.15 on cop-car citizen events, gated only on not-minor (chaosCarsEngine.js:144) — 0 in C115–C116 log |
| Graduation | checkGraduation_ :987-1012; runYouthEngine.js:1018-1019 | 0.005 (0.01 tier ≥3, +0.005 age 24-26); age 22–28 |
| Retirement | checkRetirement_ :1331-1350; applyGameNightMoments.js:328 (feed `retirement` trigger); runAsUniversePipeline.js:449 | 0.02 (0.05 ≥70), ×0.5 tier ≥4; age 68–72; once |
| Relocation | migrationTrackingEngine.js:806-821 | lane/risk rules above (not a flat chance) |
| Career-Hired | runCareerEngine.js:1804, :1876 | rehire matcher: unemployed pool member taken by an opening window |
| Setback | generationalEventsEngine.js:855 (recovering → readmitted); casinoLedgerEngine.js:829-832 (loss ≥ dialSetbackLossPct% net worth); chaos ticket / lost package / mail theft / parking (chaosCarsConfig.js:180,264,265,299) | health transition probs; casino loss; chaos 3–15 events/cycle citywide (chaosCarsEngine.js:26-27) |

## Part 4 — the negative pole, dial by dial

Paths that can push each dial DOWN (tag → writer → condition):

- **sociability**: ConnectionWithdrawn −1 (bondEngine.js:849-851: a friendship/family/romantic/mentorship/alliance/neighbor/
  professional/festival bond falls to intensity ≤1 from active; fades 0.5 (one party inactive) / 0.7 (both) ×(2−warmth factor)
  per cycle :828-832; one line per citizen per tag per cycle :2012-2016). CivicRole-Down-L −1 (officials; L odds 0.04×aura, down
  0.4±lean). Hardcoded `dial:sociability:down`: only generateGameModeMicroEvents.js:330 (GAME clock) and tier1EssenceEvents.js:211
  (seed script, not cycle). None in gCE, generic, runNeighborhood, youth. Reflection path: no sociability-down affect.
- **warmth**: TrustGuarded −1 (bondEngine.js:1556-1558 rivalry/tension confrontation at intensity ≥8, ≥6 sports-rival in top band;
  the same bond rests CONFRONT_ADAPT 6 cycles after a flare-up :1539-1540; romantic triangle at creation :2925-2926). Spat −1 is in
  DIAL_MAP but no emitter (grep = 0). Reflections Angry/Resentful (warmth −2 × 0.45 × 0.5 = −0.45) go straight to BASE
  (accreteReflectionsIntoBase_ citizenMemory.js:185-200; compressLifeHistory.js:665), not through mood/streak. No `warmth:down`
  entry in any routine pool.
- **integrity**: BoundaryCompromised −1 (runConductEngine.js:233-236; slipP 0.35 / 0.25 / 0.15 / 0.05 by band; test 1.2–3%; LIMIT 3
  per cycle citywide). Transgression −4/−8/−12 only when crimeReachable (closed above 40). Chaos arrest −8 (random adult target).
  Integrity wear (citizenMemory.js:417-448), base-direct, needs integrityWearRate >0 (seed 0). No `integrity:down` pool entry.
- **fandom**: Sports-Loss −2 / Sports-LosingWeek −1 to every fan (base ≥60) and franchise staff in a losing week
  (applyGameNightMoments.js:590-614); gCE game-night loss/coldStreak lines `dial:fandom:down` (:2199); gCE team ECL line in a LOSS
  week retagged Sports-Loss (:3691-3695); Household-GameNight-Loss −1 (citizenDialMap.js:102). Every other fandom line is Up
  (Undocked-Audience +1 every airing, ECL sports rows, generic "watched part of a daily sports highlight").
- **composure**: Friction/Strain/Stumble; Health/Critical/Hospitalized/Setback/Divorce/Career-Layoff/Rivalry; graded composure-down
  entries (state:housing/watchful, evening:safety, groove, reflection, QoL LOW, sentiment/econ negative, crisis household);
  CivicRole/LifeEvent Down; reflection affects (base-direct). Observed near-balanced (234/222 citizens).
- **drive**: Stumble, unemployed cause −1, Career-Layoff −2, Retirement −4, LifeEvent-Promotion-Down-M, Home-Down-L, CivicRole-Down,
  reflection/listening drive-down lines, QoL work LOW (when not bare-folded Up).
- **openness**: ECL civicNews rows (observed 139), RoutineRetrenched −1 (applyBusinessDynamics.js:358, a closure).
- **family**: Divorce −8, overwork cause −1, Sports-Moved −1, LifeEvent-Home-Down-M/L, ECL familyLife down rows.
- **outabout**: weather/season Down lines, hood decay, rent/debt/hood cause −1, Critical/Hospitalized −1, Sports-Injured −1, spot lines.

Can the hardening rule be met DOWNWARD?
- sociability: needs three cycles of net-down sociability, each within 3 cycles of the last, and no net-up sociability cycle in
  between. Withdrawals are one-shot state changes per bond (active→dormant), so that is three different bonds going dormant in
  near-consecutive cycles — and bonds fade only when a party is absent from the active set (ctx._bondActivePool || S.cycleActiveCitizens, bondEngine.js:611, :655-657, :828),
  while gCE participation is 0.72×band mult. Any communityLife / neighborhood / Media(+4) / Community / Alliance line resets the
  streak (citizenMemory.js:150). Not realistically reachable.
- warmth: same shape — confrontations rest 6 cycles per bond, triangles fire once; three consecutive net-down cycles need ≥3
  distinct feuds. Reflection warmth-down never touches streak. Not realistically reachable.
- integrity: ≤3 conduct tests citywide per cycle; a citizen meeting three slips in ~3–4 cycles is effectively zero. A single
  arrest (−8, felt ~10 cycles) is one streak step, not three. Daily (+58) / identity / BoundaryKept integrity-up lines reset it.
  Only base-direct wear could lower integrity steadily, and it is seeded off.
- fandom: reachable for fans in a 3+ week losing stretch — the fan-week line is unconditional for every base-≥60 fan, decay is
  0.9 (longer felt), and the A's LOSS class is live at once (sportsWeekClass_ :144-145). Fails when the week is LOSING_WEEK (−1)
  and any +1 fandom line (Undocked-Audience, ECL) lands the same cycle; non-fans (<60) only reach Down by drawing game-night loss
  lines.

## Part 5 — efficiency notes (seen while reading; no fixes)

- gCE:527-545 reads the entire LifeHistory_Log tab (getDataRange) every cycle to build lastEventCycleByPop / folk memory.
- DialState JSON parsed per row in many places, separately from the getDialBands cache (compressLifeHistory.js:1245-1283):
  gCE:407 folkMemoryScopes_; applyGameNightMoments.js:598 (every living row, every signed week); householdFormationEngine.js:1045;
  generationalWealthEngine.js:313; runCareerEngine.js:521, :526 (two parses per staffer); citizenDialMap.js:524 pressureRunFromState_
  parses and re-stringifies (:535) on every pressure emit.
- LifeHistory cell split per call: pressureState_ / pressureRun_ (citizenDialMap.js:465, :497); householdFormationEngine.js:1086
  marriedNow per married row; compressLifeHistory.js:538 full parse every cycle.
- householdFormationEngine.js:1131-1137: inside the per-married-row loop, a scan of all ledger rows to count a parent's minors (O(n²)).
- nudgesForEvent_ runs CONTENT_RULES regexes on every drawn line at admission (gCE:1210-1215, :3703; mode engines :433-435) and again
  on every line at the fold (compressLifeHistory.js:1639).
- Hood trajectory → sign derived three times: runNeighborhoodEngine.js:597-598, generateGenericCitizenMicroEvent.js:411-415,
  gCE:181-198/:1818. hoodTexturePool_ resolved per citizen in runNeighborhoodEngine.js:613, gCE:2886, runEducationEngine.js:415,
  runCareerEngine.js:1429.
- Direct per-row appendRow on LifeHistory_Log inside loops: processAdvancementIntake.js:651, :1023, :1285, :2694;
  runEducationEngine.js:442; checkForPromotions.js:499-505. runCivicRoleEngine.js:161-163 reads Civic_Office_Ledger getDataRange.
- gCE:2516-2522 household pass scans all rows to group households, separate from the main per-citizen loop.
