# Inactivity is a regression — the sim's one-way ratchet

**Status:** engine.201 SHIPPED PROD @77 (S449, 2026-09-13) — bench-proven C107–C120; engine.197 still open on openness/sociability downward volume, neutral share, 5 seeded pins (§Acceptance results)
**Filed:** S443 (2026-09-10), engine-sheet
**Rows:** engine.197 (dials hard-fail), engine.193 (generators make no depression), engine.194 (sports record channel quiet)
**Doctrine:** `docs/SIM_DOCTRINE.md` §15 (a gate that can't fire is a trick), §16 (drift over static backfill)

---

## The direction (builder, S443)

Captured as given, because it is the design ruling this plan exists to serve:

> Inactivity itself is a regression. Almost everything about this sim is getting
> attention — attention drives your success. The 30% wake is low; 70% of the sim
> has no chance to advance unless, for some almost impossible scenario, they get
> six media mentions. 70% of the sim is locked out of their cron reacting.
>
> The crons are the biggest ignored element. They are alive and writing back to
> the sheets all day. How is it all positive and not generating variety?
>
> Some of this may be that positive dials produce positive events — if a citizen
> is positive that tends to be who they are. So there is a gap of how good people
> experience bad events.
>
> I don't have the golden answer here that makes life happen to these citizens,
> and crons and not just an event machine, and crons only impacting the sim via
> media.

Bond systems likely feed this too. Mixture of engine events and cron activity.

**Every claim above checked out against code and live data. The 70% figure is
exact.** What follows is the mechanism.

---

## The closed loop, verified

Six links. Each one is fine alone; together they form a ratchet that only turns
one way.

**1. Three of eight dials have no downward vocabulary at all.**
`utilities/citizenDialMap.js` DIAL_MAP, tallied whole:

| dial | positive | negative |
|---|---|---|
| drive | +62 (18 entries) | −7 (3) |
| **sociability** | **+43 (14)** | **none** |
| warmth | +29 (8) | −5 (3) |
| **openness** | **+33 (13)** | **none** |
| composure | +47 (21) | −64 (20) |
| integrity | +12 (3) | −24 (3) |
| family | +34 (6) | −8 (1) |
| **outabout** | **+10 (8)** | **none** |

**2. The designed negative pole cannot reach them.** engine.176 introduced
pressure tags as the negative pole (`citizenDialMap.js:138-140`): Friction
`{composure:-2}`, Strain `{composure:-1}`, Stumble `{composure:-2, drive:-1}`.
They move **composure and drive only**.

**3. The other negative pole — cron affect — also cannot reach them.** The nine
affect tags are documented in `lib/reflectionClassifier.js:82` as "the
negative-pole mechanism". Five are negative (Frustrated, Irritable, Anxious,
Angry, Resentful), and every one of them moves **composure**, two also warmth.
**Not one affect tag touches sociability, openness, outabout, integrity or
family.**

The consequence, run through `nudgesForReflection_`:

```
Community + Angry   ->  { sociability: +4, warmth: 0, composure: -4 }
```

**A citizen can be furious at their own community and the engine makes them more
sociable for it.** The anger is charged entirely to composure. This is the
builder's "gap of how good people experience bad events", located exactly: the
event tag owns the identity dials and is unconditionally positive; the affect
tag owns only the mood.

**4. Event frequency is multiplied by the dials that can only rise.**
`phase05-citizens/generateCitizensEvents.js:2225`:

```js
chance *= (dmAct.drive + dmAct.outabout + dmAct.sociability) / 3;   // 0.5 .. 1.5
```

Shaped citizens get up to 3× the event rate of neutral ones. More events means
more upward tags means more events.

**5. The wake pool is a hard gate at deviation ≥ 60.**
`lib/wakePerception.js:26` `SHAPED_MIN = 60`, enforced at `:401`
(`if (!cur || dials.deviation(cur) < shapedMin) continue;`). Deviation is total
distance from neutral across all eight dials, so it can only be earned by dial
movement — which is almost entirely upward movement.

**6. Therefore the citizen loop is a closed aristocracy.** Measured on bench 0908
at C131, 1067 rows with a parsed DialState:

- wake-eligible (deviation ≥ 60): **32.7%** — the builder's 70% locked out, exact
- pins at 100: 32 across 30 citizens (sociability 27, drive 4, family 1)
- pins at 0: **none**
- population means, every dial at or above neutral: sociability **71.3**
  (116 citizens ≥ 90), composure 59.8, drive 58.7, openness 57.7, family 56.3,
  outabout 55.8, warmth 52.7, integrity 50.5
- **across 1067 citizens × 8 dials = 8536 values, ZERO sit at or below 10**

Nobody in this city is reclusive, closed off, or a shut-in, and under the current
vocabulary nobody can become one.

**The crons are not ignored by accident.** They are alive, they write back every
day, and their emotional content is real — it simply has nowhere to land except
composure. That is why the output is all positive and has no variety: the loop
strips the feeling out of the reflection and keeps the fact.

### One finding inside the finding

Composure has the best negative vocabulary in the table (net −17) and still lands
at a population mean of **59.8**, because `DEFAULT_AMBIENT {composure:+1}` fires on
every otherwise-unmapped event and outruns the entire negative tag set. A small
constant applied every cycle beats a large value applied rarely — the same
always-on shape engine.188 cut out of the sentiment vocabulary the same session.
Four systems, one disease.

---

## CORRECTED (builder, S444) — neglect-fade is the background, ENGINE EVENTS are the job

The section below this one argued neglect-fade was "the right cut". **It is not
the cut, and the number it rested on was wrong.**

**The measurement error.** This plan said 32.7% are wake-eligible. That was the
trait-deviation threshold alone — one filter of several. The pool also requires a
minimum lived-history length, a present disposition, a name, a neighborhood, and
excludes the anchor character. Running the pool builder itself against live:

```
citizens in ledger            930
eligible for a cron wake      223
IGNORED                       707  =  76.0%
```

The builder's estimate of 80% was closer than the figure in this document.

**Why that kills neglect-fade as the mechanism.** If 707 of 930 citizens can
never be woken, and the only downward force is neglect, then all 707 fade
together at the same rate. One uniform population is replaced by two. The
citizens who most need to become distinct are exactly the ones neglect cannot
distinguish, because neglect is the one thing they all share.

**The ruling (builder, S444):**

> And that 76% that don't wake now the entire system pointless, and yes all the
> dials need engine events that affect them positively and negatively and the
> city around them and the hood they are in, where they work all play into that.
> Thats how they are different.

So the job is **engine events reaching all eight dials in both directions**,
sourced from the things that already differ between citizens:

- **the city** — its state, its cycle, what is happening citywide
- **the neighborhood** — the hood's own condition, which already varies per hood
- **where they work** — employer, sector, business health, the job itself

Those three are the variety generators. They already hold different values for
different citizens, they reach the 76% who are never woken, and they can push in
both directions. A closing business, a hood turning, a job lost, a friend moving
away — the world doing something TO a person, not a narrator describing them.

Neglect-fade stays, demoted: the slow background drift, not the mechanism.

---

## Superseded — why neglect-fade looked like the right cut

Kept because the reasoning is still half-right and the ratchet analysis above it
stands. The error was treating "needs no new vocabulary" as a virtue when new
vocabulary is exactly what the 76% require.

- **It needs no new event vocabulary.** Absence is already a measurable signal —
  cycles since last event, cycles since last wake, cycles since last bond touch.
  Nothing has to be authored per-tag.
- **It reaches the three monotonic dials**, which neither pressure tags nor affect
  tags can reach, without giving those dials a contrived negative event.
- ~~**It un-freezes the 67%.**~~ It does not. The real figure is 76%, and they
  would all fade in lockstep — see the correction above.
- **It is self-balancing.** Attention pulls up, neglect pulls down, and the
  0.5–1.5 event multiplier becomes a real trade instead of a one-way subsidy.
- **It matches the world.** Someone who stops going out becomes someone who
  doesn't go out. That is not cynicism imported from real-world Oakland — it is
  how a life works, and §16 already ruled drift over static backfill.

---

## Open questions — builder's, not mechanism

1. **Rate and shape.** Linear decay per idle cycle, or accelerating after a
   threshold? Toward 50, or past it toward the low pole? A hermit should be able
   to exist, which argues for past-50.
2. ~~Which dials decay on inactivity.~~ **RULED (builder, S443): all of them.**
   "Why wouldn't they all decay?" There is no principled reason to exempt any —
   drive without work, family without household contact, warmth without people,
   integrity without being tested. The three-dial framing was timidity, not
   design.
3. **Floor.** engine.176 chose desensitization (`PRESSURE_ADAPT`) so chronic
   pressure never grinds a dial to zero. Does idle decay adopt the same adapt
   rule, or is a true recluse at sociability 5 allowed?
4. **Does an affect tag get to touch identity dials at all?** Whether repeated
   anger at a community should eventually lower sociability, rather than only
   composure, is a character question.

5. **The dials are eight uncoupled scalars — no dial ever moves another.**
   Builder, S443: *"how can your composure be low but your sociability and drive
   high?"* Verified: composure is an INPUT to a few event probabilities
   (`runConductEngine.js:223` crime, `runCareerEngine.js:983`,
   `casinoLedgerEngine.js:887` tilt) but **no dial write ever reads another
   dial**. Every change comes through a tag in DIAL_MAP. So a citizen can be
   falling apart and stay magnetic and driven, because the engine has no notion
   that those are the same person. Coupling — composure as a governor on the
   identity dials rather than a sink they ignore — is the second half of this
   plan, and is why "every cron ingest is composure" is a defect and not just an
   oddity: all the feeling drains into one dial that nothing flows out of.

## Sequencing note

Not started. engine.197 blocks the 176–183 PROD push, and this plan is the
answer to 197 rather than a separate build. Measure first on the bench: the
decay rate wants tuning against the same offline harness pattern that predicted
the engine.188 resting level to within a hundredth
(`scripts/sentimentRestingLevel.test.js`), not guessed and fired.

---

## Codex review proposal — 2026-09-13

The source review and proposed repair sequence are ready for Claude review in
[[plans/2026-09-13-codex-dial-drift-review]]. This supplements
engine.201 under the corrected direction above; implementation remains unapproved.
The package includes the required wiring card, runnable offline probes, a
historical C106 reproduction of the full 223/930 wake pool, and adjacent defects.
It proposes delivery and Cycle-accounting repairs before expanding signed
responses across all eight dials. Older deployment and denominator claims in
this plan are flagged in that review for Claude reconciliation, not silently
rewritten here. The proposed rollout row remains in the review document;
the existing tracker row and its state are unchanged.

## BUILD SPEC (engine-sheet S449) — codex review accepted in part, builder rulings 2026-09-13

**Deadline:** bench-proven + PROD before live C107.

**Review disposition.** Diagnosis D1–D14 verified against code (`citizenMemory.js:78-100` streak/harden/clamp; `runCareerEngine.js:275,:1283,:1409` push `logRows` only, nothing replays `LifeHistory_Log` into the cell — `godWorldEngine2.js:1270` intake writer, `citizenContextBuilder.js:492` read-only). Repair plan cut: no new phase, no new files, no `DialState.experience` envelope, no receipts, no 930-row migration. **The engine.176 pressure emitter already reaches every citizen regardless of wake — widen it, don't replace it.** Deferred: A3 receipts/settledThrough (D9/D10: no late writer found; one call per cycle in normal operation), A4 exp curve, B4 all-ledger evaluation phase, X5 schedule parity, X7 posture wake slot.

**Builder rulings (Mike, 2026-09-13):**
1. Plain days move nothing. `DEFAULT_AMBIENT` and the calm-day composure tints go to `{}`. Narrows the S253 "every logged event must move a dial" rule: real events move dials; a quiet day does not.
2. Downward causes approved: sociability ← friend/neighbor moves away, bond goes cold (↑ bond holds); openness ← venture/field change fails, retreat to routine; outabout ← hood rougher/pricier, money tight, health limits (↑ hood nightlife/shops pick up); drive ← layoff, run of failed job searches; warmth ← conflict with someone known; family ← long hours crowd out home. Ordinary scale ±1.
3. Ordinary non-criminal integrity slip for neutral citizens when a real chance comes up, −1.
4. Dial coupling (S443 "composure low but sociability/drive high") DEFERRED — ship the two-way feed, measure, then decide. A deferral, not an answer.
5. Chaos_Cars outcomes are never a calm day for the dials.
6. **Ruling 1b (Mike, 2026-09-13, after bench C107 showed ~1,300 routine generator lines/cycle pushing sociability/openness/outabout up, none down):** routine generator lines are plain days too — Neighborhood, Civic, Civic Perception, Personal, Lifestyle, PrevEvening, Sports, Team, Season, Holiday, FirstFriday, CreationDay → `{}`. Builder's reason, verbatim: "these events are fed to the crons as lived experiences and can speak on them, those outputs route back to sheets and to the dials." 

### Wave 1 — plumbing (bench first, alone)

| ID | Repair | Seam |
|---|---|---|
| W1a | Layoffs (both sites), `Career-Hired`, `Career-FieldChange` append the stamped line to the citizen's LifeHistory cell as well as the log. DIAL_MAP: `Career-Hired {drive:4, composure:2}`, `Career-FieldChange {drive:3, openness:3}` | `runCareerEngine.js:275,:1283,:1409` |
| W1b | A jobless-pool citizen with income > 0 takes `unemployed` pressure when their latest career line (Layoff/Hired/FieldChange) is `Career-Layoff` | `runCareerEngine.js:1315` |
| W1c | Fold groups stamped entries by cycle, nets each dial per cycle, one reinforcement step per cycle. A push continues a streak only while the dial's residual mood still points the same way; once `settleCycle_` has faded it to 0 the next push starts over. (Revised S449: "any gap resets" left sparse household events unable ever to harden — `engine32MultiCycle` B3 caught it) | `citizenMemory.js applyCycleEffects_`, `foldNewEntries_` |
| W1d | Harden only when residual mood has the streak's sign; else reset without hardening | `applyEvent_` |
| W1e | No pins: every signed change is scaled by room toward the edge it approaches, measured on the current value (base+mood): up × min(1,(100−cur)/50), down × min(1,cur/50). Applies to mood (events), base (reflection accretion, chaos reaction) | `citizenMemory.js` |
| W1f | Pressure per cause: one slot per `popId|slot` (slot `housing` = rent+hood; debt, unemployed, overwork own slots). Run state persisted on `DialState.pressure = {cause:{n,l}}`: consecutive-cycle count survives adapted (silent) cycles; a genuinely absent cycle resets. Legacy rows seed from the text lookback | `emitPressureTag_`, DialState (de)serialize |
| W1g | Ruling 1: `DEFAULT_AMBIENT {}`; `Background/Daily/Micro-Event/Life Event/Life/Weather {}`; the `quiet|calm|…|rest` content rule removed (also matched "interest", "restaurant") | `citizenDialMap.js` |
| W1h | Ruling 5: chaos `pulled_over_warning`, `traffic_jam` → `Friction`; `vital_document_delivered` off `Background` | `chaosCarsConfig.js` |

### Wave 2 — two-way vocabulary (bench second)

Pressure tags carry their cause: `Friction-Rent`, `Strain-Hood`, `Stumble-Jobless`, `Strain-Overwork`, … = state effect + cause effect (rent/debt/hood `outabout −1`, unemployed `drive −1`, overwork `family −1`). Health `Hospitalized/Critical` add `outabout −1`. New producers at existing domain seams only, Codex review vocabulary: `ConnectionWithdrawn/ConnectionMaintained` (bonds, migration departures), `RoutineRetrenched` (layoff after a recent field change, venture closure), `TrustGuarded` (bond conflict outcome), `ActivityExpanded` (hood nightlife/retail in the city's top band — relative, §15), `BoundaryCompromised −1` (conduct engine, ruling 3). Seams to be wired against the code before cutting.

### Wave 2 as built (S449)

| Cause (ruling) | Tag / effect | Seam |
|---|---|---|
| bond goes cold / picks back up (2) | `ConnectionWithdrawn` soc −1 / `ConnectionMaintained` soc +1, both citizens, friendship/family/romantic/mentorship/alliance/neighbor/professional/festival only | `bondEngine.js updateExistingBonds_` status flip → `noteBondConnectionShift_` |
| conflict with someone known (2) | `TrustGuarded` warmth −1 — confrontation (rivalry ≥ threshold) and the triangle sting (was `Bond`, unmapped) | `checkConfrontationTriggers_`, `detectTriangleRivalries_` |
| venture fails (2) | `RoutineRetrenched` openness −1 to resolved owners | `applyBusinessDynamics.js` closure → `noteVentureClosedOwners_` |
| field change ends in layoff (2) | `RoutineRetrenched` openness −1 (≤ 13 cycles) | both layoff sites → `noteRetrenchAfterFieldChange_` |
| money tight / hood rougher (2) | pressure line + outabout −1 (rent, debt, hood) | `nudgesForEvent_` cause by exact pool text |
| failed job search (2) | pressure line + drive −1 (unemployed) | same |
| long hours (2) | pressure line + family −1 (overwork) | same |
| health limits (2) | `Hospitalized` / `Critical` + outabout −1 | DIAL_MAP |
| hood shops/events top band (2) | `ActivityExpanded` outabout +1 on the ordinary hood line, top quarter by retail+event (relative, §15) | `runNeighborhoodEngine.js activityTopHoods_` |
| ordinary temptation (3) | `BoundaryCompromised` integrity −1 / `BoundaryKept` +1 for non-crime-reachable citizens; slip odds by band −1 .35 / 0 .25 / +1 .15 / +2 .05; crime-reachable keep Resisted +5 / Transgression | `runConductEngine.js` (same draw count) |
| romance deepens | `Bond` warmth +1 (was the +composure fallback) | DIAL_MAP |
| leaves a congregation | `Faith-Drift` {} (was Faith +3/+2 — leaving is not a benefit; direction unruled) | `bondEngine.js` faith drift |

**Not available:** "a friend moves away" — no code path takes a citizen out of Oakland (`migrationTrackingEngine.js:85` MOVED_OUT unused; archive only moves deceased/traded). Bond dormancy carries the sociability-down side instead.

### Acceptance (engine.197 criteria, unchanged)

12-cycle bench on live-synced state: 0 Engine_Errors; zero current-value pins at 0 or 100 at the endpoint; negative share ≥ 15% of nonzero signed per-citizen per-dial cycle contributions; every dial shows both signs; all-neutral share and wake-eligible share reported against the pre-fix bench.

## Acceptance results (S449, bench SANDBOX 0908 resynced from live C106 → C118, @18 `f4dba779`; review fixes @19 C119–C120)

| Criterion | Live C106 | Bench C118 | Verdict |
|---|---|---|---|
| Engine_Errors (C107–C120) | — | 0 | PASS |
| Downward share of signed per-citizen per-dial cycle contributions | 5.1% (Wave 1 alone, C107) | 30.0% (C107–C118), 27.5% (C113–C118) | PASS (≥15%) |
| New pins at 0 / 100 | — | 0 | PASS |
| Historical pins (base seeded at exactly 100: POP-00001 drive; POP-00170/198/210/231 sociability) | 5 | 5 | OPEN — no downward event reached those dials |
| Both signs on every dial (C107–C118) | 3 dials up-only | drive +682/−23, soc +699/−2, warmth +229/−403, **openness +392/−0**, composure +144/−372, integrity +58/−13, family +115/−118, outabout +330/−204 | PARTIAL — openness none down, sociability 2 |
| All-neutral share (8 dials in 40–60) | 546 (59.4%) | 617 (60.0%) | FAIL vs "falls" — plain days no longer move anyone |
| Deviation ≥ 60 | 226 | 232 | flat |

Seam volumes C107–C118: Career-Layoff 10, Career-Hired 17, Career-FieldChange 4, BoundaryKept 19 / BoundaryCompromised 12, ConnectionWithdrawn 2, RoutineRetrenched 0, ActivityExpanded 323, TrustGuarded 410; pressure records 110 rows (debt 46, hood 35, overwork 23, rent 13, unemployed 5), 56 adapted. Cells: max LifeHistory 3,969 chars, max DialState 697.

**Posed to the builder as four sim questions — answered 2026-09-13: "1, 2, 3 — broken code. 4 — your idea was incorrect."** (1) openness had no downward cause at volume; (2) sociability down rides bond dormancy, which live could not produce; (3) five bases sat exactly at 100; (4) plain-days-move-nothing left 60% of the city all-neutral. All four traced to code → §engine.201b below.

Codex adversarial diff review of the build: `output/codex/engine201-diff-review.md` — 4 CONFIRMED + 1 PLAUSIBLE fixed in `830e05ac` (owner POPID fails closed, gone owners excluded, cross-cause seeding, unemployment evidence after trim, inactive retag) plus a 95% pole cap.

**Proof scope:** the 12-cycle numbers above are @18 `f4dba779`. The shipped tree @19 `830e05ac` changed `roomScaled_` (pole cap) and pressure seeding and benched two cycles only (C119–C120, 0 errors). Live C107 is the smoke for `830e05ac`.

**Live C107 expectation:** live has never fired engine.177+, so its first fire folds every stamped line in the 20-line window through the per-cycle netting at once — the catch-up seen on the bench's first cycle (all-neutral 546 → 424 at W1 C107). Expect a one-time 3–5 point move in dial means; it settles the next cycle.

**Mechanism defect found in the proof (engine-sheet, not a builder ruling):** TrustGuarded 410 lines in 12 cycles ≈ 21 rivalries × 2 × most cycles. `updateExistingBonds_` adds +1.5/cycle to an active rivalry and `checkConfrontationTriggers_` fires at ≥ 8 then subtracts only 2, so a rivalry confronts nearly every cycle and both parties lose warmth each time (warmth +229/−403). Pre-existing bond shape; engine.201 made it reach the dials. Fix = confrontation cooldown or the Friction→Strain→adapt run already built for pressure. Filed under engine.197.

## engine.201b (S449) — the four follow-ups, as built

| # | What was broken | Change |
|---|---|---|
| 1 openness down | The approved causes are structurally rare: 2 closures in 14 bench cycles, both with blank Key_Personnel → 0 `RoutineRetrenched`. | The ordinary hood line in a hood at/over `dialHoodCrimeBar` is `StreetsGuarded` openness −1 (`hoodOverCrimeBar_`, `generateCitizensEvents.js` retag). |
| 2 sociability down | Neglect fade sat behind `bondAge > 15 && lastUpdate > 5`. Every live bond's CycleCreated is C102–C106 (S312 key repair), so nothing could fade before C118; lastUpdate is a ledger-bloat stamp, so from C118 every bond would fade every cycle, maintained or not. Family/professional/neighbor had no shared-cycle growth, so no return path. | Neglect = a cycle the pair did not share: one party active −0.5, neither −0.7, × (2 − pair warmth). Family/professional/neighbor +0.15 × warmth on a shared cycle. Clock gate removed. |
| 2b warmth tax | Active rivalry +1.5/cycle vs −2 at the ≥8 trigger → confronts nearly every cycle; `TrustGuarded` 410 lines / 12 cycles. | A feud rests: no confrontation within 6 cycles of the last `[Confrontation Cn]` stamp (`lastConfrontationCycle_`, `CONFRONT_ADAPT`); the next flare-up confronts and stings. (First cut gated only the sting → 13 lines in 15 cycles, a dead channel; @21 gates the confrontation.) Consumers of the list: bond summary count + packet line only. |
| 3 pins at 100 | Pre-177 residue: base exactly 100 (POP-00001 drive; POP-00170/198/210/231 sociability); room is 0 there, so only a rare downward event moved it. | `unpinBase_` reads a base at 0/100 back to 2.5/97.5 (`newCitizen_`); no current rule can reach a pole. |
| 4 neutral city (NOT moved — see proof) | Plain days swept ~6,000 hood-caused `Neighborhood` lines (12 cycles) to `{}`. | The ordinary hood line carries the hood's sign: top quarter `ActivityExpanded` outabout +1, bottom quarter `ActivityContracted` outabout −1 (`activityBottomHoods_`, both generators), crime bar `StreetsGuarded`. Housing-pressured and middle-band hoods stay `Neighborhood` (pressure runs cover housing). Pulse unchanged (`{sentiment:1}`). |

Tests: `dialWave2Seams.test.js` +7 (all fail on `4d87d74b`), 196 test files, 1 pre-existing unrelated failure (`djDirect.schema-and-slot`, missing C94 fixture).

**Bench proof (SANDBOX 0908 resynced from live C106; @20 C107–C119, @21 feud rest C120–C121; 0 Engine_Errors; C112/C114 returned the 404 HTML body and ran; one 404 fire executed twice, so 13 cycles for 12 fires; C120 ran @20 — propagation window, the C119-stamped feuds confronted again).** Measured C107–C121 from the cells (`output/engine201/measure-c121-all.json`), against the engine.201 proof C107–C118:

| | engine.201 @18 | engine.201b | |
|---|---|---|---|
| downward share | 30.0% | 40.7% | |
| openness +/− | 392 / 0 | 396 / 907 (`StreetsGuarded` 1,218) | #1 closed |
| sociability +/− | 699 / 2 | 750 / 97; bonds dormant 0 → 40 (friendship 24, professional 10, family 6), `ConnectionWithdrawn` 119 / `ConnectionMaintained` 89 | #2 closed |
| warmth +/− | 229 / 403 | 235 / 13 — up-heavy; feud rest (@21) restores ~8 `TrustGuarded`/cycle, pulsed while live's feuds share a C106 stamp | open under engine.197 |
| pins at 0/100 | 5 | 0 | #3 closed |
| all-neutral (8 dials in 40–60) | 617 (60.0%) | 59.7% | **#4 NOT moved** |
| wake-eligible (deviation ≥ 60) | 22.6% | 21.8% (live C106 24.6%) | |

Hood groups at bench C118 (openness / outabout / all-neutral): crime-bar 51.82 / 50.57 / 60.6%, top band 52.65 / 51.94 / 61.8%, housing-pressured 54.14 / 51.07 / 54.4%, middle 53.30 / 50.90 / 59.6%. Residents already differ by hood in the direction of the cause, by 1–2 points in 12 cycles.

**Why #4 did not move:** a ±1 line reaches a hood resident about once every 2–4 cycles; with mood fading 20%/cycle and base hardening only after three felt pushes in a row, nobody leaves 40–60 in 12 cycles, and the new −1 lines pull the elevated citizens (gt60) back toward the band as often as they push anyone out. The shaping volume pre-201 lived in the ~14,000 other plain-day lines (Daily, Civic Perception, Personal, PrevEvening, Sports, Lifestyle, Background) at +1–+4 unsigned. Next cut for #4 is magnitude or those lines' sign from the citizen's own circumstances — open under engine.197. Two-way dials also shrink the wake pool short-term (24.6% → 21.8%): the one-way ratchet was inflating it.


## Changelog

- 2026-09-13 (codex) — Linked the completed engine.201 source review and proposed repair sequence for Claude approval; no implementation or live-state changes.
- 2026-09-13 (engine-sheet S449) — Codex review accepted in part; builder rulings 1–5 captured; BUILD SPEC Wave 1 (plumbing) + Wave 2 (two-way vocabulary) written; deadline live C107.
- 2026-09-13 (engine-sheet S449) — Wave 1 bench C107 clean (0 errors, pressure records live, no new pins) but negative share 5.1%; ruling 1b captured; Wave 2 built (table above).
- 2026-09-13 (engine-sheet S449) — Proof scope stated (@18 twelve cycles, @19 two); live C107 first-fold expectation; rivalry confrontation cadence filed under engine.197.
- 2026-09-13 (engine-sheet S449) — 12-cycle proof + review fixes; PROD @77; acceptance results recorded; engine.201 done-pending-archive, engine.197 open on the four builder questions.
- 2026-09-13 (engine-sheet S449) — Builder: 1–3 broken code, 4 plain-days cut wrong. engine.201b built + benched (§engine.201b): openness/sociability down, pins 0, feud rest; all-neutral share unmoved — stays open.
