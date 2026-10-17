# GodWorld — Rollout Plan

**Current work and waits only.** A row is here because someone is working it now, because it waits on a dated fire or a named builder call, or because it is ruled and next in the queue. Closed work → [[ROLLOUT_ARCHIVE]]. Parked work and external watches → [[../plans/BACKLOG]] §Parked ideas and external watches. Row contract, states and the sweep → [[rollout-rules]]. Sim lens before touching a mechanic → [[SIM_DOCTRINE]] §15. Last trued 2026-10-07 (engine-sheet, against the C110 smoke, PROD `f2a61e5e` and codex's row chase [[../research/2026-10-07-codex-rollout-chase]]).

**Reading this file:** section 1 is the builder's list. Sections 2–4 are the lanes'. The plan list below is regenerated at every session close; any wait whose date has passed is named at close too. One line per job; the detail is in the plan the row names. Live Cycle C111 (fired 2026-10-11 ~16:18 CDT, 0 errors, 148 s); next live fire C112, Sunday 2026-10-18.

<!-- generated: plans in motion (docLoopStatus.js --plans --write; do not hand-edit) -->
**Plans in motion (47)** — each plan, its rows and the state each is in:

- [[../plans/2026-10-11-media-extension]]: pipeline.74 live-observing, pipeline.75 live-observing, pipeline.76 live-observing, pipeline.77 live-observing, pipeline.78 live-observing, pipeline.79 live-observing, pipeline.80 live-observing
- [[../plans/2026-09-11-sports-as-a-lived-system]]: engine.209 live-observing, engine.206 live-observing, engine.205 in-progress, engine.202 in-progress, engine.203d live-observing
- [[../plans/2026-10-10-engine-214-mood-per-hood]]: engine.214 live-observing, pipeline.71 ready, engine.287 live-observing, engine.288 live-observing, engine.289 blocked
- [[../plans/2026-09-26-future-build-ideas]]: engine.238 live-observing, engine.98 ready, engine.264 needs-info, engine.261 ready
- [[../plans/2026-09-21-care-and-justice-system]]: engine.254 live-observing, engine.271 live-observing, engine.272 live-observing
- [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]]: research.29 live-observing, engine.292 live-observing, engine.291 live-observing
- [[../plans/2026-09-10-inactivity-is-regression]]: engine.193 in-progress, engine.201 live-observing, engine.197 in-progress
- [[../plans/2026-08-10-economy-native-rebuild]]: engine.295 in-progress, engine.293 live-observing, engine.104 ready
- [[../research/2026-10-02-engine-208-fandom-dial-read-before]]: engine.208 live-observing, engine.280 ready
- [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]]: engine.204 in-progress, engine.281 in-progress
- [[../reference/DEPLOY_HISTORY]]: engine.213 in-progress, engine.294 live-observing
- [[../plans/2026-09-22-initiative-budget-disbursement]]: engine.257 ready, engine.256 ready
- [[../plans/2026-10-04-school-board]]: civic.43 needs-info
- [[../plans/2026-07-31-citizen-memory-perception]]: engine.94 live-observing
- [[../plans/2026-10-06-supermemory-v5-migration]]: infrastructure.10 blocked
- [[../plans/2026-05-07-chaos-cars-engine]]: engine.11 live-observing
- [[../plans/2026-08-16-new-life-intake]]: engine.108 live-observing
- [[../plans/2026-09-24-initiatives-in-the-world]]: engine.260 live-observing
- [[../plans/2026-08-29-employment-system-cascade]]: civic.33 live-observing
- [[../plans/2026-07-31-platform-ceiling-resilience]]: engine.95 live-observing
- [[../plans/2026-09-29-sim-holiday-calendar]]: engine.273 in-progress
- [[../plans/2026-10-03-citizen-pages-drive-canon]]: pipeline.70 live-observing
- [[../plans/2026-07-11-agent-exchange-engine]]: engine.53 live-observing
- [[../plans/2026-08-07-spacemolt-game-show]]: research.27 live-observing
- [[../plans/2026-07-06-citizen-loop-deepening]]: engine.48 live-observing
- [[../plans/2026-08-09-citizen-day-digest]]: pipeline.53 ready
- [[../plans/2026-09-13-run-cycle-packages-the-world]]: pipeline.69 in-progress
- [[../plans/2026-08-29-boot-doc-consolidation]]: governance.51 in-progress
- [[../plans/2026-08-16-city-hall-nine-seat-table]]: civic.24 ready
- [[../canon/INSTITUTIONS]]: canon.5 in-progress
- [[../engine/archive/LEDGER_REPAIR_HOUSEHOLDS]]: engine.5 in-progress
- [[../plans/2026-06-24-engine-output-canon-coverage]]: engine.41 ready
- [[../plans/2026-07-07-citizen-intake-unification]]: engine.51 ready
- [[../plans/2026-07-31-canon-ingest-backfill]]: engine.91 in-progress
- [[../plans/2026-08-02-neighborhood-truth-source-migration]]: engine.99 in-progress
- [[../plans/2026-08-17-sheet-weight-reduction]]: engine.116 in-progress
- [[../plans/2026-05-26-engine-27-wd-card-auto-invalidation]]: engine.27 ready
- [[../plans/2026-07-31-engine-observability-integrity]]: infrastructure.6 ready
- [[../plans/2026-10-15-engine-290-transit-rides-the-sim]]: engine.290 live-observing
- [[../output/notebooklm-card-backup/fold-plan.json]]: pipeline.72 in-progress
- [[../docs/plans/2026-10-11-media-extension.md]]: pipeline.73 in-progress
- [[../research/2026-10-11-codex-engine194-cut]]: engine.194 live-observing
- [[../plans/2026-09-28-storylines-keyed-to-engine-events]]: engine.270 ready
- [[../plans/2026-10-08-engine-286-game-of-life-events]]: engine.286 live-observing
- [[../plans/2026-05-22-engine-regulatory-friction]]: engine.20d ready
- [[../research/2026-09-10-kimi-faith-lane-routing]]: engine.248 ready
- [[../plans/2026-09-19-civic-wake-game-loop]]: engine.253 ready
<!-- /generated -->

## Pull order (builder, 2026-09-29; trued 2026-10-07)

1. **Sports as a lived system** — the 204/205/206/208/209/281 builds went live 2026-10-06; C111 is their first live fire. Open calls are in section 1.
2. **engine.94** citizen memory, then **engine.98** pets and **engine.264** the maker's hand.
3. Everything else by section.

---

## 1. Waiting on the builder — named calls

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| civic.43 | School board: T1 + T3 LIVE. T2 seating HELD (builder 2026-10-07): schools half built (hood school data, no schools in hoods); deep review first, then the canon-name fix | needs-info | research-build / engine-sheet | [[../plans/2026-10-04-school-board]] §Builder's words (2026-10-07) |

## 2. Waiting on a fire — dated or organic

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| engine.208 | C111 read: off-season, no game week — 0 fan week lines, `fandom seeded 7`; first real read is the first logged game week (Oaks open C112, Sun 2026-10-18) | live-observing | engine-sheet | [[../research/2026-10-02-engine-208-fandom-dial-read-before]] §Changelog 2026-10-08 |
| engine.209 | C111 read: first carry written (A's w 1, Oaks w 0.35, weeks 0, fans 0); drifts on results from the first logged game week | live-observing | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Tasks 9–10 |
| engine.206 | First live home week (none at C111 — off-season): one game-day-crowds seed per home week reaches the business and civic desks | live-observing | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 6 |
| engine.94 | B.3 v3 LIVE (PROD `e87362b4`). C111 read 2026-10-11: 131 phases, 615 bonds certified, 10 seats held at 60–69, 0 campaign notes/hooks. C115 B.2 bars; open sim call on challenger appeal → holder approval awaits the builder | live-observing | engine-sheet / research-build | [[../plans/2026-07-31-citizen-memory-perception]] §Status log engine.94 B.3 v3 live reads |
| engine.254 | C119: Phase10-CareJusticeCensus timing, point 2 of 2 (1,243 ms at C110); Task 9 review with it | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §Task 10 handoff |
| engine.271 | C120: first property-tax day. Fines, court and tickets proven at C110 | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.271 read-before and design |
| engine.272 | ~C139: first citizen worn down far enough to reach the conduct-crime gate. Wear proven at C110 (35 of 35) | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.272 cut |
| infrastructure.10 | Sun 2026-11-01: Supermemory v5 migration session, not before (builder 2026-10-07). Vendor cutoff ~2027-01-06 | blocked | engine-sheet | [[../plans/2026-10-06-supermemory-v5-migration]] |
| engine.11 | Organic: the first real Tier-1 chaos-car hit runs the civic cascade on live (T5.3). Synthetic shape proven | live-observing | engine-sheet / research-build | [[../plans/2026-05-07-chaos-cars-engine]] |
| engine.108 | Organic: the first generic citizen reaching EmergenceCount 3 gets promoted (max is 2) | live-observing | engine-sheet | [[../plans/2026-08-16-new-life-intake]] §2-3.1 |
| engine.238 | Organic: the chief's first live patrol move lands in World_Config at a close | live-observing | engine-sheet | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.260 | Organic: the first live civic hire. None on the roster through C110 | live-observing | engine-sheet | [[../plans/2026-09-24-initiatives-in-the-world]] Job 4 |
| civic.33 | Organic: seat turnover at the approval-20 floor with city hall and media both running | live-observing | engine-sheet | [[../plans/2026-08-29-employment-system-cascade]] §civic.33 |

## 3. Now — current work

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| research.29 | UNDOCKED crossover: Moves 1–5 live (Move 4: 20 token rows live on PROD ECL, PROD @138 stage 4g carries both composer fixes + engine.294; bench B ≈ 23 named lines at C112). Next: Sat 10-17 digest + crossover block; Sun C112 live readback → plan changelog | live-observing | research-build | [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]] |
| engine.214 | Mood per hood + Tasks 17/18/19 + engine.288: paired on 1004 (C111 step −0.10; stack vs PROD on BASELINE-1004-C111, C112 CitySentiment 0.07 → 0.13, DEPLOY_HISTORY). PROD after the live C112 readback Sun 2026-10-18, first fire C113 Sun 2026-10-25; then Tasks 12–13 | live-observing | engine-sheet / research-build | [[../plans/2026-10-10-engine-214-mood-per-hood]] |
| engine.95 | Checkpoint/resume LIVE `c49074fc`, gate armed (330000/60000/6000). C111 read: 131 phases, 148 s, no checkpoint, tab empty. Next: grow `tailReserveMs` when Phase11-MaintainLifeHistoryLog grows (25.4 s at C111); reconcile notes in DEPLOY_HISTORY §PROD c49074fc | live-observing | engine-sheet | [[../plans/2026-07-31-platform-ceiling-resilience]] §Changelog bench steps 0–5 |
| engine.204 | Game-day city impact LIVE since 2026-10-06. Column removal HELD (builder 2026-10-07): ripple map of every feed column + dashboard/sheet/code option-sync audit first; the CommunityInvestment carrier waits on it | in-progress | engine-sheet | [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]] §4 Builder's words (2026-10-07) |
| engine.205 | Weekly game economy LIVE since 2026-10-06. Held with engine.204 for the same ripple + option-sync review | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Tasks 4, 10 |
| engine.281 | Sports-week ladder + venue (a–d) LIVE since 2026-10-06. (e) the column surface folds into the engine.204/205 ripple + option-sync review (2026-10-07) | in-progress | engine-sheet / research-build | [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]] §5 |
| engine.273 | Holidays LIVE; first Second Dawn C131. Open Court Week LIVE PROD `ae9278aa` (position 6, citywide, First Friday week; first live C162; unit-proven). Meaning sentences approved as working lines (rb carries to desks); running-on-its-own week held until it happens | in-progress | engine-sheet / research-build | [[../plans/2026-09-29-sim-holiday-calendar]] §Builder's words (2026-10-07) |
| engine.193 | Adversity tiers LIVE; (b) settle LIVE `ae9278aa`. C111: self-armed, 7 of 9 toward norm, magnitude unverified, AC Transit / City flat — add per-institution settle log line, read C112 (G-EC50). Then (a) public-employer budget squeeze; then CAT-layer design for the builder | in-progress | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §engine.193 Builder's words (2026-10-07) |
| pipeline.70 | Read the staged pieces for the story test at C112 (Sun 2026-10-18), then flip; watch the first unattended Opus business run | live-observing | research-build | [[../plans/2026-10-03-citizen-pages-drive-canon]] |
| engine.53 | Organic: the first exchange-line candidate in a street pool. Mon 2026-10-05 fanout read 2026-10-08: none, because no transcript sentence named that day's highlights (fog, Oaks; 0 of 66 turns) | live-observing | research-build | [[../plans/2026-07-11-agent-exchange-engine]] |
| research.27 | Next unattended flight: pilot runs the new rules, a closed contract's credits reach the feed row + board (§3.2). Stations Bayline 6 / Oakland 12 minted, seats open until the pipeline.73 reporter walk (builder 2026-10-12); read at the 2026-10-18 landing. | live-observing | research-build | [[../plans/2026-08-07-spacemolt-game-show]] §3.2 + §Post-ship (e) |
| engine.48 | Organic: the first T8 tension-seed result off the cron; none recorded yet | live-observing | research-build | [[../plans/2026-07-06-citizen-loop-deepening]] |
| engine.201 | Fixed-cohort proof: 48 citizens drawn at C110 (output/engine201). C111 resnap taken 2026-10-11 (48/48); resnap after C112, C113; trace at the C113 fire, Sun 2026-10-25, codex leading | live-observing | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §BUILD SPEC |
| pipeline.68 | Roster rows for the C110/C111 mints — **WITHDRAWN 2026-10-16 (builder)**. The engine hires only a citizen whose EmployerBizId is BLANK (`runCareerEngine.js` engine.135 E3): the fill would have written UNTRACKED into 41 cells and taken those citizens out of the hiring pool, and forced 6 hires with no event behind them. The blank cell is the hireable state; a tracked employer comes only from the engine's hiring. rb's row and morning reply mis-called 11 of the 50 "media figures from the extension" — they are Tier 2/3 ENGINE citizens on the ledger since the first upload (Nina Reyes, Pixel Pete, Marcus Duval …), not mints, not intake. `Employment_Roster` is a hand-run report tab rebuilt by `linkCitizensToEmployers.js`; no engine phase reads it, no cron runs it. | withdrawn | research-build | [[../plans/2026-09-07-beat-slices-from-sheets-plan]] |
| pipeline.53 | Citizen day digest: land the audio-direction rebalance (40/40 city/citizens to 20/60) in config/audio_direction_daily.md | ready | engine-sheet | [[../plans/2026-08-09-citizen-day-digest]] |
| pipeline.69 | Run-cycle packages the world: T1 texture by hood, T2 wake tells a citizen their seed, T3 seed floor, T5 C108 slice readback | in-progress | engine-sheet | [[../plans/2026-09-13-run-cycle-packages-the-world]] |
| governance.51 | Boot docs: T3 memory-file dedup (proposal ready, builder-reviewed deletes) and T8 | in-progress | engine-sheet | [[../plans/2026-08-29-boot-doc-consolidation]] |
| civic.24 | Sunday nine-seat table: Task 10 sheet tab | ready | engine-sheet | [[../plans/2026-08-16-city-hall-nine-seat-table]] |
| canon.5 | Sheet renames LANDED live 2026-10-12: BIZ-00016 → Oakland City Schools, BIZ-00035 → Oakland Community College District, INIT-007 Notes (read back). Open: the Employer-column sweep (tied to engine.191 roster mismatch) | in-progress | engine-sheet | [[canon/INSTITUTIONS]] §Education |
| engine.5 | Household + family: life events still need causal household effects (Phase 2b) | in-progress | engine-sheet | [[engine/archive/LEDGER_REPAIR_HOUSEHOLDS]] |
| engine.41 | Engine output to canon: build Wire 1b (SuggestedCitizenVoices, column cleared 2026-09-27), then re-verify Wire 3 | ready | engine-sheet | [[../plans/2026-06-24-engine-output-canon-coverage]] |
| engine.51 | Citizen intake T8 extraction: bench --apply (bench fires need no ask) | ready | research-build / engine-sheet | [[../plans/2026-07-07-citizen-intake-unification]] |
| engine.91 | Canon ingest: the wiki ingesters carry no customId | in-progress | engine-sheet | [[../plans/2026-07-31-canon-ingest-backfill]] §S502 |
| engine.99 | Hood truth-source: ~49 files of hood literals, migrated as each is touched | in-progress | engine-sheet | [[../plans/2026-08-02-neighborhood-truth-source-migration]] |
| engine.116 | Spreadsheet weight: T2 code repoint, T3 archives out, T5 dead-tab prune | in-progress | engine-sheet | [[../plans/2026-08-17-sheet-weight-reduction]] |
| engine.197 | Dial drift: openness-down volume and the ~60% all-neutral share via event-engine reach | in-progress | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §Acceptance results |
| engine.202 | Sports WeekRecord: trigger-word hooks, dashboard input (3b), 3c | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 1 |
| engine.213 | Approval reads the city: the mood sawtooth. (The Mon–Thu datawakes reaching no sheet is closed: civic.38 move ledger → Sunday fold → Initiative_Tracker LIVE WRITE C110, civic-cron.log 2026-10-04) | in-progress | engine-sheet | `phase05-citizens/updateCivicApprovalRatings.js`, [[../reference/DEPLOY_HISTORY]] §PROD @84 |
| engine.27 | Card auto-invalidation Phase B (cycle-end marker hook); Phase A daemon live | ready | engine-sheet | [[../plans/2026-05-26-engine-27-wd-card-auto-invalidation]] |
| infrastructure.6 | Sim-health observability: /api/sim-health + dashboard panel; 11 ghost tab refs + tab-reference test | ready | engine-sheet | [[../plans/2026-07-31-engine-observability-integrity]] |

## 4. Queue — ruled, not started

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| engine.290 | Transit rides the sim — LIVE PROD `588b0bc5` 2026-10-15 (stage 4d). Open: C112 mint read-back → crew ECL rows + governor (plan §Sequencing 4); Trevor's slice TRANSIT-SLICE-2 first live read. | live-observing | engine-sheet / research-build | [[../plans/2026-10-15-engine-290-transit-rides-the-sim]] |
| engine.292 | A zero night pushes (credits_sign 0 → void, night_winner > 0). LIVE PROD @136 2026-10-16 (stage 4e, `stage4e-e292.sha256`). Read Sun 10-18 C112: POP-00301 slip → void-gate. | live-observing | engine-sheet | agy `output/antigravity/2026-10-16-review-research29-undocked-crossover.md` §Hunt 3; [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]] |
| engine.294 | Raw "$MOOD" in LifeHistory C104–C111 (96 lines): live ECL R291 MOOD fragment Text "$MOOD" (engine.49 drafter). Fixed 71637c7a (loader skips token fragments; composer drops raw tokens), LIVE PROD @138. **R291 flipped Active=no 2026-10-16 on the builder's word** (`undockedEclPoolApply --active no --match '^\$MOOD$' --apply`, read back 1/1). The 96 printed lines stand as lived. Read C112: 0 raw lines. | live-observing | engine-sheet | commit 71637c7a; [[../reference/DEPLOY_HISTORY]] §stage 4g |
| engine.295 | Owner draw revisit (builder 2026-10-16: "scale or revisit how owners payout work"). Queued in NEXT[engine-sheet] behind engine.285 hazards 2–6; the builder sets the order. engine.96 T10 `applyOwnerDraw_` pays an off-heritage Tier 3–4 owner ½ × (Annual_Revenue − Employee_Count × Avg_Salary) per cycle with no other cost; the C110/C111 mint firms carry $8–84M owner incomes (Coastline Construction margin 90%). Design + bench es: a cost model under profit (sector operating share from Economic_Parameters + retained share), draw capped at a multiple of the seat's reference pay, and a read of whether the mint firms' Annual_Revenue is off-scale for their headcount. Numbers shown to the builder from the bench before PROD. | in-progress | engine-sheet | [[../plans/2026-08-10-economy-native-rebuild]] §Read 2026-10-16; [[../plans/2026-08-01-business-lifecycle-generator]] §Task 10 |
| engine.293 | Arrivals born wrong: (1) promotion-door pay (`checkForPromotions_` priced by `lookupIncome_` alone → flat $60k for 18 wave arrivals) now runs the intake's job rule — LIVE PROD @139 stage 4h `bdcfb5c4`, bench @33 vs @34 differs only in 6 arrivals' pay; unmapped titles still land at 60000 until mapped (audit: an arrival at exactly 60000); (2) owner pay = `applyOwnerDraw_` ½ × (revenue − payroll) per cycle, margins 33–90% — builder's call §6 2026-10-16. Read Sun C112: wave arrivals priced by job | live-observing | engine-sheet | [[../plans/2026-08-10-economy-native-rebuild]] §Read 2026-10-16 |
| engine.291 | UNDOCKED rows name the pilot: `$PILOT`/`$PILOTROLE`/`$LEADER`. LIVE PROD @138 (stage 4g, `stage4g-e291fix.sha256`) with fixes a6bdf1de ($LEADER not on the leader) + ebd0091a (a/an before $PILOTROLE); bench 1004 @33. rb releases its 9 held rows. Read C112 Sun 10-18. | live-observing | engine-sheet | [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]] §Move 4 |
| pipeline.71 | Media hood read: live vs the INSTITUTIONS seed (today every reader gets prev-Cycle delta only — baseline_briefs, buildWorldSummary classifyDelta). Builder 2026-10-10: the seed is the permanent referent; coverage says 'used to be' when the data moves. Spec after engine.214 lands | ready | research-build | [[../plans/2026-10-10-engine-214-mood-per-hood]] §Reviews reconciled A4 |
| pipeline.72 | One TrueSource card per player — builder RULED 2026-10-11 and 2026-10-16 ("1 card that is maintained"). **All 28 folded 2026-10-16:** each FULL card re-added with its whole 2041 intake copy appended (`output/notebooklm-card-backup/fold-plan.json`: new ids, verified line-for-line — 0 lines of the old FULL or of the copy missing from the new card, all 28). The builder caught the night's delete list as blind: 18 copies judged "contained" by number-matching held 21–40 lines (PA, OPS, defense, 2041 WAR, FA year) their FULL lacked — nothing was deleted. **Retirement of the 57 superseded sources (28 old FULLs + 28 copies + Keane's first fold) waits on the builder**: the bulk delete was refused by the permission classifier; `to-delete.json` is the verified list. 2040 history sources (≈11) are a later pass, same rule: fold first, verify line-for-line, then retire. Stat cards and lore pages stay separate sources. | in-progress | research-build | output/notebooklm-card-backup/fold-plan.json |
| pipeline.73 | Two citizen seats built (Tamsin Pruitt = Lives, Ines Sorensen = Voices): lived wake + Lived_Events in the dump (es), slice builders + agent folders + tests (rb). Waits on the C112 mint Sun 2026-10-18 → POPID registrations in one rb commit; first runs Mon 10-19 / Wed 10-21 | in-progress | research-build + engine-sheet | docs/plans/2026-10-11-media-extension.md |
| pipeline.74 | First-run read of the swapped cron models: angle cap 1600, off-season label, P Slayer POPIDs, Noah → grok-4.3 (landed es c9d59d24; read 2026-10-15 06:15 fan-out) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.75 | Tanya gets the feed names + Notes; deterministic write checks (thin/engine-term/verbatim/cap/toolCalls); tools A/B = 0 calls (landed es; read 2026-10-15 06:15 fan-out) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.76 | Marbury writes with tools (ADR-0017 one-package exception, builder 2026-10-14); C111 memo staged, live Wed 10-21 | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.77 | Reward loop on five seats (rubric seen = rubric judged, grade on the page, W1 reads it); C111 baseline staged; first unattended C112 runs Mon–Wed 10-19..21; mechanism 2 held | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.78 | Staged readers take suffixed reruns (one matcher); Saturday 10-17 lands 16 C111 pieces incl. Nia's three; Friday reconciler + per-filing Packet folded (es a8095541, 734db7cd) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.79 | Every journalist graded; Saturday prints the best-graded first; printed pieces earn byline-published (tier credit, none written since C102); C111 backfilled; length graded as a floor only | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.80 | INTAKE names floor LIVE on main `4fabf88e` (codex review folded: no ambiguous names at the floor, curation ignores floor mentions). Open: crossover eligibility (audited set only, narrate selected crossings) after Sat 10-17's Move 5 read, before Sat 10-24; first floor entries Mon 10-19 → Sat 10-24 ingest; builder's rate call §6 | live-observing | research-build | [[../plans/2026-10-11-media-extension]] §pipeline.80 — **builder RULED 2026-10-16 on what counts as coverage:** "the story is about them or is featuring their viewpoint, a quote or something taken from their citizen page. Their name alone isn't necessarily coverage, but the gate may be difficult to enforce so count it all and adjust the tier levels instead." → the floor stays (every printed canon citizen = `mentioned` row); the MEDIA tier bars (`TIER_BAR` in processAdvancementIntake.js: 3 → Tier 3, 6 → Tier 2, 9 → Tier 1; `mentioned` counts) are the dial, his numbers to set. |
| engine.287 | Citywide crime gate: floor 3 carried spikes, half share on each hood (builder 2026-10-10). Built as engine.214 Task 19 `1ce99668`, benched @14 (the C112 wave gone). Rides the engine.214 PROD. Live counts on record 2/0/0/1/1/1 | live-observing | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §Tasks 17/18/19 — mechanism |
| engine.288 | Mood gates read both seed lists (builder 2026-10-10: "the second option") — the newsroom's deck carried beside the engine list. Built `5c6c551d` + `1d0d7b83`, benched @16: active seed hoods 7 → 14 at C112, city unchanged. Rides the engine.214 PROD | live-observing | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §engine.288 bench results |
| engine.289 | Absolute CULTURE gates (`wCulture >= 3 / >= 6` in `applyCityDynamics.js`) were written while the seed input was dead; they have input for the first time on the engine.214 PROD. Waits on live C113 (Sun 2026-10-25): re-read, then keep, re-tier, or move to the relative shape | blocked | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §Tasks 17/18/19 — mechanism → Bench results |
| engine.98 | Pets — designed 2026-10-04 on engine.94 rails; builds after engine.94 | ready | engine-sheet / research-build | [[../plans/2026-09-26-future-build-ideas]] §engine.98 pets — design |
| engine.264 | The maker's hand — builder intake tab the sim never sees; after engine.94 (builder 2026-09-29). Plan verdict is needs-info (sim call: how visible is the builder's hand) — row trued 2026-10-16 | needs-info | research-build | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.203d | Season aftermath LIVE PROD `ae9278aa` (+ the feed gate's S.cycleId read; `sportsFadeRate` 0.85 row 222). C111 read: Ripple_Ledger `aftermath: A's title week 1 after C110` +0.085 exactly, Oaks upset 0.000; C112 expects +0.072 | live-observing | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 2 |
| engine.194 | Record-driven sentiment + game-night intensity LIVE PROD `ae9278aa` (codex cut: share = 0.5 × signed result vs expectation × reach, ±0.10; parser 72/72). C111 had no logged game week — pricing first reads on the first logged WeekRecord (Oaks open C112) | live-observing | engine-sheet | [[../research/2026-10-11-codex-engine194-cut]] |
| engine.270 | Review 1 ruled 2026-10-08: build the anomaly tag (D1), no age on first-seen stages (D2), Task 7 step 1 attach pass. Queued, not dispatched (es on other work). Step 2 and the scorer rewire wait the C113 read | ready | engine-sheet | [[../plans/2026-09-28-storylines-keyed-to-engine-events]] §Review 1 Disposition |
| engine.285 | Phase-11 + executor kill hazards (6): all LIVE — 1 @140, 2–6 @141 stage 4j. 2, 3, 5, 6 closed; 4 narrowed: exactly-once routing across a kill needs engine.95 Phase-11 receipts. Dormant intake tabs + header drift left as is. Read at C112 (DEPLOY_HISTORY stage 4j) | live-observing | engine-sheet | `docs/research/2026-10-08-codex-engine95-design.md` §7; [[../research/2026-10-16-codex-engine285-hazards2-6-review]] |
| engine.286 | Life-event dice LIVE (`63754ca8`); forced sale .017 live; own-record wake `6489ab23`; scoreboard `c421b5d9`. Read at C112; wake-as-turn waits on the builder naming the game (N31/N32) | live-observing | research-build | [[../plans/2026-10-08-engine-286-game-of-life-events]] |
| engine.20d | Initiative seeds on movement only in buildWorldSummary's civic lane. Released from the engine.270 wait 2026-10-08; spec only, no code yet. Not dispatched | ready | engine-sheet | [[../plans/2026-05-22-engine-regulatory-friction]] §Task 5 |
| engine.280 | Fandom dial follow-up (read-before §2.9) | ready | engine-sheet | [[../research/2026-10-02-engine-208-fandom-dial-read-before]] §2.9 |
| engine.104 | Mint economy: arrivals born right. Audit refreshed 2026-10-16 (545/988 unmapped, 272 titles; CareerStage vocab clean; two live birth defects → engine.293). Revision still owes: legacy mutating-path disposition, creation-path inventory, D2 proof before D1 | ready | research-build | [[../plans/2026-08-10-economy-native-rebuild]] §Read 2026-10-16 |
| engine.257 | Household stress from real outflows: build spending (makes vs spends) | ready | engine-sheet | [[../plans/2026-09-22-initiative-budget-disbursement]] §Data reality, call 8 |
| engine.256 | Leases on one hood-median stamp (±15% draw, renewal closes 25% of the gap); kimi WIP in stash@{0} | ready | engine-sheet | [[../plans/2026-09-22-initiative-budget-disbursement]] §Data reality |
| engine.248 | Faith orgs get a sim role: membership, a slight dial nudge, faith-life events | ready | engine-sheet | [[../research/2026-09-10-kimi-faith-lane-routing]] |
| engine.253 | Transit as its own system: ridership and station load from hood canon | ready | engine-sheet | [[../plans/2026-09-19-civic-wake-game-loop]] §Rulings (g) |
| engine.261 | Firm agents: three business owners get a wake slice to run their business | ready | engine-sheet | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
