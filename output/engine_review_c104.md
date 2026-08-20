# Engine Review — Cycle 104

**Cycle:** 104 | **In-world:** Y2C52
**Auditor version:** 1.0.0
**Source files:**
- `output/engine_audit_c104.json` — 19 patterns
- `output/engine_anomalies_c104.json` — 54 anomalies
- `output/baseline_briefs_c104.json` — 56 briefs

**Run health (from the C104 execution log, Drive "Execution log 104d text.txt"):** 130 phases, every one `ok: true`. `Engine errors logged: 0; audit issues tracked: 0`. Total 137s, 510 intents committed in 21.3s. Carry-forward loaded from C103 and saved for C104. RNG seeded with 104. `persistHospitalLedger_` — the phase that aborted the two prior live fires — completed clean. **This review covers a healthy cycle.**

**Two auditor-side caveats that gate how much of the below is real:**

1. **The measurement baseline is eight days and one backfill stale.** `engine_audit_c103.json` dates to 2026-08-11; C104 ran 2026-08-19. Anything a maintenance script changed in between reads as a C104 delta. This is the whole explanation for the anomaly count (see Anomalies).
2. **`effectEvidence.expectedField` looks wrong for initiative mitigators.** The auditor expects INIT-001 / INIT-007 to move `Neighborhood_Map.RetailVitality`, and reports `effects-not-firing` when it doesn't. The execution log shows initiative implementation effects landing in **sentiment** — `applyInitiativeImplementationEffects_ v1.0: 6 initiatives → sentiment 0.0890, 6 neighborhoods, 3 triggers` — and the two largest sentiment improvements this cycle (Downtown +0.18, Lake Merritt +0.14) are exactly where those effects were applied. The initiatives ARE firing; the auditor is watching the wrong column. Treat every `remedy-not-firing` verdict below as unproven until that expectation is corrected.

---

## Ailments

### 1. Retail is thinning across ten neighborhoods at once, and only two have anything aimed at them — FRONT PAGE CANDIDATE (editorial call, not auditor-flagged)

Ten of the twenty-two mapped neighborhoods logged simultaneous decay this cycle. The auditor filed them as ten separate `math-imbalance` patterns; they are one city-scale story and should be reported as one.

| Neighborhood | Decay signals | Mitigator | Severity |
|---|---|---|---|
| Grand Lake | Sentiment −0.070, RetailVitality −5.03, HousingPressure +0.500 | none | **high** |
| Lake Merritt | RetailVitality −5.39, HousingPressure +1.000 | none | medium |
| West Oakland | Sentiment −0.020, RetailVitality −4.39 | INIT-001, INIT-007 | low |
| Temescal | RetailVitality −5.53, HousingPressure +1.000 | INIT-005 | low |
| Adams Point | Sentiment −0.020, RetailVitality −2.92 | none | medium |
| Eastlake | Sentiment −0.020, RetailVitality −2.93 | none | medium |
| Glenview | Sentiment −0.060, RetailVitality −2.76 | none | medium |
| East Oakland | Sentiment −0.030, RetailVitality −2.76 | INIT-007 | low |
| Dimond | Sentiment −0.040, RetailVitality −2.33 | none | medium |
| Ivy Hill | Sentiment −0.040, RetailVitality −1.96 | none | medium |

- **Tech diagnosis:** `Neighborhood_Map` rows 9–10 and siblings, fields `Sentiment` / `RetailVitality` / `HousingPressure`, compared against `priorCycle: 103`. Seven of the ten carry `mitigatorState: no-mitigator`; three sit under initiatives whose effects the auditor cannot see (caveat 2).
- **Existing mitigators:** INIT-001 West Oakland Stabilization Fund (`disbursement-active`, 1 cycle in phase), INIT-005 Temescal Community Health Center (`construction-active`), INIT-007 Oakland Youth Apprenticeship Pipeline (`implementation-active`, 0 cycles in phase). All three fired at intensity 1.00 / 0.80 / 0.80 in the log.
- **Why working/not:** `no-mitigator` on seven — nothing in motion aimed at them. `mitigator-firing-but-insufficient` on West Oakland and East Oakland; `remedy-working` on Temescal. Two of the three initiative-covered neighborhoods are the *least* severe on the list, which is the shape you'd expect if the initiatives are in fact working.
- **Remedy path:** world-side, `propose-new-initiative` targeting Grand Lake first (highest severity, three signals, zero coverage), with `mayoral-pressure` as the secondary. No tech-side bug report on any of the ten.
- **Tribune framing:**
  - *engine* — ten neighborhoods decayed on retail this cycle; seven have no initiative attached.
  - *simulation* — felt in Grand Lake by **Amara Keane (POP-00002)** and **Vinnie Keane (POP-00001)**; in Adams Point by **Marco Johnson (POP-00966)**, **Elijah Campbell (POP-00969)**, **Mart Johns (POP-00648)**.
  - *user-actions* — no mitigator exists for seven of ten; the council has proposed nothing targeting them.
  - Desks: civic (lead), business (retail conditions), letters (resident stake).
- **Measure next cycle:** `Neighborhood_Map.RetailVitality` per row — does the decay continue at the same slope without intervention, and do the three initiative-covered hoods separate from the seven uncovered ones? That separation is the real test of whether the initiatives work.
- **Capability hooks:** `covers Grand Lake`, `cites a Grand Lake resident`, `quotes Amara Keane (POP-00002)`, `covers Adams Point`, `cites a Adams Point resident`, `quotes Marco Johnson (POP-00966)`

### 2. Twenty-two neighborhoods are moving people with no economic event to explain it

- **Tech diagnosis:** `Neighborhood_Map`, `migratingCount: 22`, `economicEventsThisCycle: 0`, sub-check `migration-without-economic-cause`. The engine log corroborates the movement — `processMigrationTracking_ v1.1: Assessed 957, High risk 6, Events 2`, `processRelocations_: 2 unit(s) relocated`, `applyMigrationDrift_: worldMig=1083`.
- **Existing mitigators:** INIT-001 West Oakland Stabilization Fund (`disbursement-active`), INIT-007 Oakland Youth Apprenticeship Pipeline (`implementation-active`).
- **Why working/not:** `mitigator-firing-but-insufficient`. Both report `effects-not-firing` with `observedDelta: 0` against `RetailVitality` — **which is caveat 2 above**. `runEconomicRippleEngine_ v2.5` reports only `ripples=1, layoffs=0`, so the "zero economic events" reading is genuine even if the mitigator verdict is not.
- **Remedy path:** world-side, layer a second economic initiative alongside the existing one; secondary, `character-intervention` via a Downtown neighborhood organiser. **This is the one pattern with `techSide.triggered: true`** — the auditor wants `phase06/economicRippleEngine.js` + phase10 RetailVitality persistence checked. Given caveat 2, verify the auditor's expectation before opening that as an engine bug.
- **Tribune framing:** felt in Downtown, Temescal, Laurel; candidate voices **Celeste Moon (POP-01061)**, **Funmi Shah (POP-00802)**, **Sahana Joshi (POP-00808)**. Desks: civic (the economic initiative carrying Downtown hasn't advanced in a cycle), business, letters.
- **Measure next cycle:** `Neighborhood_Map.RetailVitality` ≥ +0.02 in West Oakland; economic event count > 0 citywide; migration count trending down.
- **Capability hooks:** `covers Downtown`, `covers Temescal`, `cites a Downtown resident`, `quotes Celeste Moon (POP-01061)`

### 3. "Strain" has been the city's recurring note for four cycles running

- **Tech diagnosis:** `Riley_Digest`, `recurringIssue: "strain"`, `cyclesRecurring: 4`, `matchedPolicyDomain: null`, `stuckInitiativeCount: 0`. Corroborated independently by `applyCivicLoadIndicator_ v2.3: Score 30 | Load: load-strain`.
- **Existing mitigators:** none. No policy domain matches the token.
- **Why working/not:** `no-mitigator` — four cycles of the same signal with nothing in motion against it, and no initiative even categorised to receive it.
- **Remedy path:** world-side, propose a new general initiative; secondary, mayor's office names the gap publicly. No tech-side.
- **Tribune framing:** scope is city-level, unassigned to a neighborhood. Desks: civic, letters. Pairs naturally with Ailment 1 — the strain signal and the retail decay are plausibly the same story from two directions.
- **Measure next cycle:** does `recurringIssue: "strain"` reach five cycles, and does `applyCivicLoadIndicator_` stay at `load-strain`?

### 4. "Trend" recurring three cycles, unassigned

- **Tech diagnosis:** `Riley_Digest`, `recurringIssue: "trend"`, `cyclesRecurring: 3`, no matched policy domain.
- **Existing mitigators:** none.
- **Why working/not:** `no-mitigator`. Same shape as Ailment 3 one cycle behind it.
- **Remedy path:** propose-new-initiative / mayoral-pressure.
- **Tribune framing:** city-level, civic + letters. Low-priority on its own; report only if it pairs with Ailment 3.
- **Measure next cycle:** cycle count on the token; whether it acquires a policy domain.

### 5. Faith produced five events and the Tribune covered none of it

- **Tech diagnosis:** `WorldEvents_V3_Ledger`, `domain: "faith"`, `eventCount: 5`, `priorCycleCoverage: 0`, sub-check `production-without-consumption`, routing hint `roundup-thread-acceptable`. The log confirms faith was the cycle's **dominant** domain: `saveV3Domains_ v3.4: Dominant: FAITH | Total: 10`, and `Phase4-FaithEvents` ran 609ms.
- **Existing mitigators:** not applicable — this is an editorial gap, not a world ailment.
- **Why working/not:** the engine produced; the newsroom didn't consume. The city's most active domain this cycle went unreported.
- **Remedy path:** `editorial-pickup` — thread the faith events into a roundup or a desk thread. This is a `/sift` assignment, not a council action.
- **Tribune framing:** culture or civic roundup. Note `Calendar: NewYearsEve (major)` — faith activity clustering on a major holiday is the obvious hook.
- **Measure next cycle:** `priorCycleCoverage` > 0 for domain faith.

---

## Anomalies

**54 flagged: 28 `route-to-engine-debug` (high confidence), 26 `suppress-until-verified` (medium). None should be covered as story. All 54 are stale-baseline artifacts, not C104 events.**

Every one is an income delta, and the distribution gives it away: **24 of 54 land on exactly $100,000**, 31 of 54 land on a round thousand. Simulated earnings do not converge on round numbers. The extremes — POP-00026 at 39,534 → 12,000,000 (+30,254%), POP-01052 at 32,414 → 23,000,000 — are stamps, not trajectories.

The C104 run did not do this. Its own income activity was small and specific: `processGenerationalWealth_ ... Income: 10`, `processEducationCareer_ ... Income: 0`, `runCareerEngine v2.7 rehire matcher: 10 hired (5 career changes) from unemployed pool of 60`, with `settleAdulthood_` placing 9 young adults at plausible salaries (31,300 / 34,800 / 28,800 / 65,600 / 39,900). Roughly 20 income changes, none of them round.

The explanation is the baseline. The auditor diffs C104 against `engine_audit_c103.json` from 2026-08-11 — eight days earlier. In that window a salary-floor backfill ran `applyEconomicProfiles.js` (the same event `engine.120` documents as the source of the stale `WealthLevel` values). Those backfilled incomes are being reported as C104 deltas because the auditor has no intervening snapshot to attribute them to.

**Triage: suppress all 54 from the edition.** Not "route to engine debug" either — there is no C104 engine bug here. The correct follow-up is to re-baseline the auditor, not to investigate the engine.

Follow-up brief written to `output/engine_anomalies_c104_followup.md`.

---

## Improvements

**Three initiatives advanced a phase this cycle.** The Oakland Alternative Response Initiative moved `operational → pilot_evaluation`. The Fruitvale Transit Hub Phase II went `construction-planning → visioning-complete`. The Oakland Youth Apprenticeship Pipeline went `pilot-active → implementation-active`. Three separate programmes clearing a gate in the same cycle is the strongest institutional signal in this review, and none of it is in the ailment list.

**Downtown sentiment rose 0.18 (0.41 → 0.59); Lake Merritt rose 0.14 (0.45 → 0.59).** These are the two largest single-cycle sentiment moves on the board, and the execution log ties them to a cause: `applyInitiativeImplementationEffects_` applied 0.0890 of sentiment across six neighborhoods, with Baylight District — Final Council Vote hitting Jack London and Downtown at intensity 0.30. This is a named-cause improvement — the thing the initiative machinery is supposed to do, doing it. **Story candidate for sift**, and the direct counter-evidence to the `effects-not-firing` verdicts in Ailments 1 and 2.

**Worth noting against the decay story:** Lake Merritt appears in both lists — retail down 5.39, sentiment up 0.14. Not a contradiction. People feel better about a place whose shops are thinning, which is its own story and a better one than either number alone.

---

## Baseline Briefs (sift input)

- **Total: 56** — citizen-life-event 37, world-event 12, approval-shift 4, initiative-milestone 3
- **With promotion hints: 50** of 56
- **Cluster note:** Rockridge 7, Lake Merritt 6, Chinatown 5, Uptown 5, Jack London 5, Fruitvale 5, Downtown 4, Piedmont Ave 4. Lake Merritt and Downtown overlap directly with both the decay ailment and the sentiment improvements — the briefs there are the cast for Ailments 1 and 2 and for the improvement story. Rockridge leads the count but appears in no ailment: unattached texture.
- **Source:** `output/baseline_briefs_c104.json`
- **Caveat (S146 known limitation):** most `WorldEvents_V3_Ledger` rows still resolve to `misc-event`, so `subjectIds` is empty on most briefs and citizen-attributed promotion stays degraded. Promote on neighborhood + ailment overlap.

**Content-ledger defect affecting brief text:** 16 `LifeHistory_Log` rows carry an unexpanded `$MOOD` token — "bought a new A's jersey and $MOOD". `$VENUE`/`$MOOD` are content-ledger tokens authored by design (`draftContentRows.js`, landed 2026-07-24); nothing on the engine write path substitutes them. Pre-existing, unrelated to C104, but sift must not promote a brief whose text carries a raw token.

---

## Measurement Check (from previous review)

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| production-imbalance | 22 neighborhoods (Downtown, Temescal, Laurel …) | propose-new-initiative | RetailVitality +0.02 | −4.39 | `remedy-not-firing` **(expectation suspect — see caveat 2)** |
| repeating-event | city — "strain" | — | — | — | — |
| repeating-event | city — "trend" | — | — | — | — |
| math-imbalance | Temescal (INIT-005) | — | — | — | — |
| math-imbalance | West Oakland (INIT-001, INIT-007) | — | — | — | — |
| math-imbalance | Adams Point | — | — | — | — |
| math-imbalance | Grand Lake | — | — | — | — |
| math-imbalance | Eastlake | — | — | — | — |
| math-imbalance | Glenview | — | — | — | — |
| math-imbalance | Dimond | — | — | — | — |
| math-imbalance | Ivy Hill | — | — | — | — |
| math-imbalance | Lake Merritt | — | — | — | — |
| math-imbalance | East Oakland (INIT-007) | — | — | — | — |
| coverage-gap | domain faith | — | — | — | — |
| improvement | Oakland Alternative Response Initiative | — | — | — | — |
| improvement | Fruitvale Transit Hub Phase II | — | — | — | — |
| improvement | Oakland Youth Apprenticeship Pipeline | — | — | — | — |
| improvement | Downtown sentiment | — | — | — | — |
| improvement | Lake Merritt sentiment | — | — | — | — |

18 of 19 patterns are `available: false` with `reason: no-prior-match` — a direct consequence of the eight-day baseline gap, not of the patterns being new. The measurement loop is effectively cold this cycle.

No win callout: nothing flipped from `remedy-not-firing` to `remedy-firing-as-expected`, and the one measured verdict went the other way.

### Remedy-type track record

| Remedy type | Firing-as-expected | Firing-insufficient | Not-firing | Overshot |
|---|---|---|---|---|
| propose-new-initiative | 0 | 0 | 1 | 0 |

One data point, and it rests on an expected-field the execution log contradicts. Not yet a track record.

---

## Summary

- **Ailments:** 5 briefs covering 14 patterns (1 high, 10 medium, 3 low). The ten neighborhood-decay patterns are one city-scale story, not ten.
- **Anomalies:** 54 — **all 54 suppressed.** Stale-baseline artifacts from an inter-cycle salary backfill, not C104 events, not an engine bug.
- **Improvements:** 5 — three initiative phase advances, two named-cause sentiment gains. Strongest signal in the review.
- **Baseline briefs:** 56 (50 with promotion hints).
- **Measurements:** 0 / 1 firing as expected; 1 not firing — and that verdict is unproven.

**Two follow-ups for the engine terminal, neither of them a C104 defect:**
1. Re-baseline the auditor. An eight-day-stale prior turned a routine cycle into 54 false anomalies and blanked the measurement loop on 18 of 19 patterns.
2. Fix `effectEvidence.expectedField` for initiative mitigators. Initiative implementation effects land in sentiment, not `RetailVitality`; the current expectation manufactures `effects-not-firing` verdicts and a spurious `techSide.bugReport` against `economicRippleEngine.js`.
