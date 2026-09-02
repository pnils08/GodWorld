---
title: Education → Career Connection Plan (engine.144)
created: 2026-09-01
updated: 2026-09-02
type: plan
tags: [engine, citizens, education, career, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md engine.144
  - docs/archive/plans/2026-08-31-education-loop.md §After this loop — the connection is a separate file, after isolation proof
  - docs/plans/2026-08-29-employment-system-cascade.md §engine.135 acceptance verdict (S405 builder ruling — education supplies the *reason*; do not widen E3)
  - docs/research/2026-08-30-education-system.md §Extraction — degrees push four things, none of them a job
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[archive/plans/2026-08-31-education-loop]] — the isolation loop this connects (LIVE PROD @14)"
  - "[[plans/2026-08-29-employment-system-cascade]] — E2/E3, the events this plan lets read the credential"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Education → Career Connection Plan (engine.144)

**Goal:** a lived credential becomes ONE cause among others that the two existing employer-driven career events read when they choose a citizen — never a gate, never a new event, never a rate change.

**Architecture:** E2 (employer success promotes one of its staff) and E3 (a growing business hires from the jobless, same field only) each already pick a citizen by a deterministic sort. Today neither sort can see `EducationLevel`. This plan adds a full ordinal over the live plural vocabulary (`credentialRank_`) and inserts it as a **secondary** key in both sorts — behind "longest waiting" in E2 and behind a banded "poorest first" in E3 — and makes the event line say so when the credential is what decided it. Event probabilities, eligibility filters, the E3 same-field rule and `RARE_EVENT_SCALE` are untouched. `eduRank_` (0–2, feeds the 18th-birthday settlement) is untouched.

**Terminal:** engine/sheet (builder go S410: "your approach"). Isolation proof precondition met: engine.143 live at PROD @14, bench C106 smoke clean (S410).

**Pointers:**
- Prior work: `phase05-citizens/runCareerEngine.js` `applyEmployerSuccess_` (E2 beneficiary sort ≈:174) and `matchUnemployedToOpenings_` (E3 `sameField.sort` ≈:1094)
- Vocabulary: `canonicalEducationWrite_` / `eduRank_` in `phase05-citizens/educationCareerEngine.js`
- Tests: `scripts/employerSuccess.test.js`

**Acceptance criteria:**
1. Unit: with equal `LastPromotionCycle`, the higher credential is promoted; with unequal, the longer-waiting citizen still wins over a better credential. A staff of only `hs-diploma` still produces a promotion (no gate).
2. Unit: E3 — inside one $10k income band the higher credential takes the slot; across bands the poorer citizen still does. A pool with no credentialed candidate still fills the slot.
3. Event legibility: when the credential broke the tie, the LifeHistory/log line carries it (`… — the bachelors counted`); when it did not, the line is unchanged.
4. Bench: one fire at 0 `Engine_Errors`; `careerSignals.promotions`/hires unchanged in *rate* (the plan changes who, not how often). Empirical promotion proof accrues on live (≈1 per ten cycles by doctrine) — the bench proof is the unit suite plus a clean cycle, not a forced event.

---

## What this is not

- Not a job gate: no filter reads the credential; an uncredentialed citizen is still eligible for every slot.
- Not a promotion calendar: no per-cycle roll keyed on education (E1 deleted that; it stays deleted).
- Not E3 widening: the pool is still the jobless, same field only.
- Not income-from-education: pay moves only through the existing event deltas.
- Not a layoff shield: the E2 layoff victim sort is untouched this loop (a credential protecting from layoffs is a second cause and a second plan).

---

## Tasks

### Task 1: `credentialRank_` — one ordinal over the live vocabulary

- **Files:** `phase05-citizens/educationCareerEngine.js` — modify (next to `eduRank_`)
- **Steps:**
  1. Add `credentialRank_(v)`: `hs-dropout`/`none`/blank/child-stage → 0, `hs-diploma` → 1, `trade-cert`/`some-college` → 2, `associates` → 3, `bachelor(s)` → 4, `masters`/`graduate` → 5, `doctorate` → 6. Substring-tolerant like `eduRank_` (legacy singular tokens still exist in older LifeHistory-derived writes).
  2. Do NOT touch `eduRank_`.
- **Verify:** `node scripts/employerSuccess.test.js` (new cases in Task 4) → all pass
- **Status:** [x] DONE S410 (2026-09-01) — `employerSuccess.test.js` 43/43 (11 new: 1.0/1.0b ordinal, 1a–1c E2, 2a–2d E3)

### Task 2: E2 — credential as the second key of the beneficiary sort

- **Files:** `phase05-citizens/runCareerEngine.js` — modify `applyEmployerSuccess_`
- **Steps:**
  1. Resolve `iEdu = header.indexOf('EducationLevel')` once, alongside the other column lookups.
  2. Beneficiary sort becomes: `LastPromotionCycle` asc → `credentialRank_` **desc** → `Income` asc → `POPID`.
  3. Compute `decidedByCredential`: the runner-up exists, equal on `LastPromotionCycle`, and lower `credentialRank_`. Pass a reason suffix to the promotion text: `'Promoted at ' + b.name + (decidedByCredential ? ' — the ' + level + ' counted' : '')`.
- **Verify:** unit cases 1a–1c (Task 4)
- **Status:** [x] DONE S410 (2026-09-01) — `employerSuccess.test.js` 43/43 (11 new: 1.0/1.0b ordinal, 1a–1c E2, 2a–2d E3)

### Task 3: E3 — credential as the second key of the same-field slot sort

- **Files:** `phase05-citizens/runCareerEngine.js` — modify `matchUnemployedToOpenings_`
- **Steps:**
  1. Carry `edu: credentialRank_(uRow[iEdu])` onto each pool entry.
  2. `sameField.sort`: `Math.floor(income / 10000)` asc (poorest band first) → `edu` desc → `income` asc → `POPID`.
  3. Same `decidedByCredential` test against the first candidate left out of `slots` (equal band, lower rank); hire text `'Hired at ' + bizName + (decided ? ' — the ' + level + ' counted' : '')`.
- **Verify:** unit cases 2a–2c (Task 4)
- **Status:** [x] DONE S410 (2026-09-01) — `employerSuccess.test.js` 43/43 (11 new: 1.0/1.0b ordinal, 1a–1c E2, 2a–2d E3)

### Task 4: Tests

- **Files:** `scripts/employerSuccess.test.js` — modify (extend the existing harness; do not add a file)
- **Steps:**
  1. 1a equal waiting, higher credential wins; 1b longer waiting beats better credential; 1c all-`hs-diploma` staff still promotes (no gate).
  2. 2a same $10k band, higher credential takes the slot; 2b poorer band wins across bands; 2c uncredentialed pool still fills.
  3. 3 legibility: the suffix appears only when the credential decided.
- **Verify:** `node scripts/employerSuccess.test.js` → all pass; `node scripts/careerStage.test.js` unchanged
- **Status:** [x] DONE S410 (2026-09-01) — `employerSuccess.test.js` 43/43 (11 new: 1.0/1.0b ordinal, 1a–1c E2, 2a–2d E3)

### Task 5: Truth docs + bench + live

- **Files:** `docs/engine/ENGINE_MAP.md`, STUB_MAP regen (`/stub-engine`), `docs/reference/DEPLOY.md`, this file §Changelog
- **Steps:**
  1. Regenerate STUB_MAP in the code commit (new function `credentialRank_`).
  2. Bench: stage HEAD with the HELD engine.131 T7 four at base, push, bump, one fire, 0 errors, `Career-Hired`/promotion lines unchanged in count vs the prior cycle's order of magnitude.
  3. Live: PROD bump per DEPLOY.md, pull-back byte-verify, HELD four at base.
- **Status:** [x] DONE S410 — STUB_MAP regen in the code commit; bench @6 C108 `ok:true` 100s, 0 errors, career tags C106/107/108 = Promotion 4/1/2, Career 10/10/9 (rate unchanged); LIVE PROD @16, pull-back byte-verified, HELD four at base.

---

---

## Loops 1+2 — field-first settlement (S411, engine-sheet)

**Builder go 2026-09-02 ("Go").** Items 1 and 2 of the backlog are ONE mechanism, so they shipped as one change: the field is chosen before the role, and `SkillTags` — the token E3 already matches on — IS the field. No new column, no new tab, no new event, no rate change. Graduation is left alone this loop (see §Backlog item 5).

**Measure (S411, live data):** `SkillTags` is set at settlement by `settleSkillTag_(role)` from a role drawn flat from the band's six — the field was a side effect of a dice roll. 50 minors on the live ledger: 47 have a resolvable parent (parent tags span 15 categories), 49 a household; 39 carry no tag yet. `Business_Ledger` (175 rows) carries `Neighborhood`, so a hood's business mix is readable from the settlement's existing read. Youth history is thin but present on the LifeHistory as `runYouthEngine_` dial tags (`[Education]` 23, `[Team]`/`[Cultural]`/`[Civic]`/`[Community]` fewer); the 33 `[Sports]` lines on minors are adult-deck leak (backlog item 3), not youth history. The engine's `simYear` is `2040 + floor(cycle/52)` = 2042 through C155, so every BirthYear-2024 row is already settled — no live cycle settles anyone until C156; proof is hand-staged on the bench.

**Mechanism (`phase05-citizens/educationCareerEngine.js`):**
- `SETTLE_FIELDS` — the 12 `sectorCategory_` outputs, fixed order (deterministic draw). `Trades`, `The Vulnerable`, `2041-Specific` are live tags E3 cannot match, so they are never drawn.
- `settleField_(ownTag, parents, hoodCats, cityCats, youthCounts, rng)` — PURE, one `rng()` call. An existing canonical tag wins outright (`cause: own`). Otherwise weights: each parent's canonical tag(s) +3; school years +1 per youth dial line, capped at 3 (`[Team]` → Education, `[Cultural]` → Creative & Arts, `[Civic]` → Government & Civic, `[Community]` → Faith & Community); the hood's businesses normalized to 3 total, `City-wide` rows counting half for every hood. Three sources, equal maximum pull. No weight anywhere → `null` → the legacy band draw, byte-identical to before.
- `SETTLE_ROLES_BY_FIELD` — one entry role per field × band (36). Existing settlement roles kept where they fit; `SETTLE_FIELD_ECON_KEYS` maps the new trainee roles to catalog profiles (unit-checked against `data/economic_parameters.json`). Money stays the band's.
- Employer: hires INTO the field — businesses of the exact category first (`buildSettleBizPool_` now also returns `byHood`, `cityWide`, `catById` from the same read; no second fetch), then the field's industry bucket, then the legacy per-role bucket.
- `SkillTags` = the field, directly (never overwrites). The `[Adulthood]` line names the cause only when one decided: `(following Ada into Healthcare)` / `(the field their school years pointed to: Education)` / `(the neighborhood's trade: Food & Culture)`. `own` and `null` add nothing.
- Diag: `ENGINE60_T4` log line carries `field=<field>/<cause>`.

**Tests:** `scripts/educationLoop.test.js` §8 (29 new checks; 81/81). Also trued §7: `applyEmployerSuccess_` reads `EducationLevel` only through `credentialRankOf_` since engine.144 — the S409 "reads none" grep had been failing since S410.

**Bench proof plan:** SANDBOX 0831 at C105. Stage three settled BirthYear-2024 rows back to unsettled (strip the `[Adulthood]` line, blank `EconomicProfileKey`/`EmployerBizId`/`SkillTags`/`RoleType`) — chosen for distinct causes: POP-00991 Tariq Mitchell (parent Creative & Arts + `[Team]`+`[Education]`, Uptown), POP-01003 Jabari Jack (parent Creative & Arts + 2×`[Education]`, Uptown), POP-00980 Karim Avery (parent Small Business, Fruitvale, no youth lines). Fire C106; read `ENGINE60_T4` lines and the three `[Adulthood]` lines; 0 `Engine_Errors`. Bench-only writes, never replayed.

## Loop 3 — youth mode, the life-stage gate (S411, engine-sheet)

**Caller-graph result (the first task).** Every LifeHistory writer was mapped and the live `LifeHistory_Log` (12,703 rows, C94–C105) was read for the 39 ENGINE minors: every adult-texture line on a minor carries a `source:*` tag, and that vocabulary (neighborhood 88, reflection 44, familyLife 34, prevEvening 33, listening 30, sports 24, communityLife 23, age 19, chaos 19, homeLife 19, nbhdState 18, identity 17, holiday 15, firstFriday 14, curiosity 13, civicNews 13, …) belongs to ONE writer: `generateCitizensEvents.js`. It already derives `lifeState.isMinor` (engine.67 `deriveLifeState_`) and already has child/teen age pools, but the age pool was one pool among twenty and `isEventEligible_` only narrowed by class (work/money/nightlife), so a three-year-old still drew "picked up on a heaviness around Fruitvale". The youth-engine lines carry no `source:` tag and are the only other texture on minors. One more direct writer hit minors: `generationalWealthEngine.trackHomeOwnership_` stamps every household member with "bought the place … keys in hand, rent checks done" (3 minors on live). Writers that already gate: `runConductEngine` (<18 skip), `generationalWealthEngine` money loops (<18 skip), `runYouthEngine_` (5–22 window). `applyGameNightMoments`, `bondEngine` `[Family]`, `runCivicRoleEngine` `[Civic Role]`, chaos-cars and health milestones never appeared on a minor in the log, or are life events a child legitimately lives (a crash, an ambulance, the family line founded) — untouched.

**Mechanism.** Not a ClockMode. `generateCitizensEvents_`: after `lifeState` is derived, `isMinor` (from `lifeState`, else `simYear − BirthYear < 18` computed at the writer, blank BirthYear fail-open as every other age read) → `continue`, counted in `S.minorsSkippedTexture` and one Logger line. The household shared moment (`source:familyLife|family:household`) is written before the per-citizen loop and STAYS for minors — a kid lives the family's crisis or celebration; that is family-level, not an adult deck. `trackHomeOwnership_`: the `[Home]` line skips members under 18 (NetWorth share math untouched). The child/teen entries in `agePoolFor_` are now unreachable for minors — loop 4 relocates that texture into `runYouthEngine_`, which is the sole minor texture writer from this loop on.

**Tests:** `scripts/citizensEventsFame.t3.test.js` §youth-mode (7 checks: minor/teen zero lines, adult/blank/18th-birthday fire, computed-age grep, household moment still reaches the kid). 19/19.

## Backlog — builder direction 2026-09-02 (S410 close)

Recorded as said, with the data point under each. None of these is started; each is its own loop after engine.144 has lived a few cycles.

**What the system is today (verified S410):**
- There are no school entities. Quality is one number per neighborhood, `Neighborhood_Demographics.SchoolQualityIndex` (prosperity floor ≥7 since 2026-09-01), stamped onto each minor's `SchoolQuality` every cycle by `updateMinorSchoolQuality_`. `OAKLAND_SCHOOLS` are generic strings; `BIZ-00016` is the district as an employer.
- "Which degree" is a band, not a choice. At 18 `settleAdulthood_` scores HH income (≥140k +2 / ≥60k +1) + SchoolQuality (≥8 +2 / ≥6 +1) + best-parent `eduRank_` + heritage (+1/+2) + rng×1.5 → `rich` (bachelors) / `solid` (some-college) / `rough` (hs-diploma, 15% dropout). Later, `[Graduation]` (22–28, once, ≈0.5–1%/cycle) steps the level: hs-diploma → associates (SchoolQuality <8) or bachelors (≥8); associates/some-college/trade-cert → bachelors; bachelors → masters. No field of study exists anywhere on the ledger.
- Career choice at 18 is the SAME score: the band picks a starting role from a six-role list (`ADULT_START_BANDS`: rich = Junior Accountant / Paralegal / Biotech Lab Assistant…, solid = Apprentice Electrician / Nurse Aide / Bank Teller…, rough = Line Cook / Server / Barista…). After that E3 hires by `SkillTags` ∩ business sector and E2 promotes by employer growth — neither reads the degree except as engine.144's tie-break.
- Minors draw adult texture. `runYouthEngine_` adds youth events (ages 5–22, 15–25%/cycle by school level) ON TOP of the adult decks; the daily/micro/personal texture writers do not read age. Live evidence: POP-00976 (11) "swapped stories with a neighbor about the cathedral…", "finally fixed the thing that had been broken for months"; POP-00743 (12) "silently judged the parking jobs", "didn't recognize themselves in an old photograph". `Youth_Events` tab is dead by ruling; youth lines go to LifeHistory.

**Follow-on loops (order = builder's list):**
1. **Degree field.** A field-of-study concept on the credential (one token, e.g. carried in `SkillTags` at settlement/graduation) so the degree can *aim* — E3's same-field rule would then read it directly, and the graduation step could follow the citizen's field instead of only SchoolQuality. Open design: where the field comes from (household sector, hood business mix, youth-event history).
2. **Start-role choice.** Replace the band's flat six-role draw with a causal pick: parent's sector / hood's Business_Ledger sectors / the citizen's own youth events (youth sports → coaching/PT, arts → …). Same score, a reasoned role.
3. **Youth mode.** Not a new `ClockMode` — ClockMode says who drives the row (ENGINE/GAME/MEDIA/CIVIC). A derived life-stage gate (`age < 18` from BirthYear at the writer) so minors draw ONLY from a youth texture pool and `runYouthEngine_` becomes their sole texture writer; adult decks skip them. First task is a caller-graph of every LifeHistory writer that lacks an age check (S410 found only `generateCitizensEvents.js` gating; the deck-based writers don't).
4. **Youth events control.** Once (3) exists, youth event types (academic / sports / arts / coming-of-age / civic) become the stage's whole texture, with the same calendar and hood modifiers `runYouthEngine_` already has. `Youth_Events` stays dead.

5. **Graduation follows the field** (deferred from loops 1+2, S411). `graduationCredential_` picks associates vs bachelors by SchoolQuality only; a trades/construction/port/transit field could take `trade-cert` instead. Blocker: `credentialRank_` ranks `trade-cert` (2) below `associates` (3), so aiming the degree would cost the citizen the E2/E3 tie-break — re-rate first, then aim.
6. **E3 cannot hire 63 `Trades`-tagged citizens** (S411 finding). `sectorCategory_` never returns `Trades`, so no business category ever matches the tag; the same holds for `The Vulnerable` (27) and `2041-Specific` (22). The field path no longer mints `Trades` (electricians settle under Construction & Baylight); the no-source legacy fallback (`settleSkillTag_`) still can. The live rows need either a category or a re-tag. Own row when picked up.

Filed by engine-sheet at the builder's request; (1)/(2) SHIPPED S411 as one mechanism (§Loops 1+2 above); (3) SHIPPED S411 (§Loop 3 above); engine-sheet holds (4).

## Open questions

None that block. Decisions made here (engine-sheet holds mechanism):
- Secondary key, never primary — "one cause among others" is the S405 wording and the sort order is the literal reading of it.
- E3 income banded to $10k so the credential can actually decide something; raw-income ties are too rare to be a lived cause.
- Layoff shield deferred to its own loop.

## Changelog

- 2026-09-02 (engine-sheet, S411, later) — **Loop 3 LIVE PROD @18.** Bench @8 C107: ok:true, 0 `Engine_Errors`, `cycleCount` 106→107. Minor texture in `LifeHistory_Log`, 43 active minors (41 ENGINE / 2 GAME): C106 (before) 83 rows, 72 of them per-citizen adult-source lines; C107 (gate) 4 rows, all youth-engine `[Education]`, 0 adult-source. Live: pull + two-file overlay, diff vs bench stage empty, pull-back byte-identical, HELD four at base. Minors' lives are thin until loop 4 gives the youth engine the whole texture — that is the next loop, not a regression.
- 2026-09-02 (engine-sheet, S411) — **Loop 3 youth mode coded + unit-proven (19/19):** caller-graph of every LifeHistory writer + the live log settled it on `generateCitizensEvents.js` (all `source:*` lines) and the `[Home]` member stamp; life-stage gate at both (BirthYear at the writer, not a ClockMode); household shared moment kept for minors. Bench + live: see the later entry.

- 2026-09-02 (engine-sheet, S411, later) — **Loops 1+2 LIVE PROD @17.** Bench @7 C106: ok:true, 0 `Engine_Errors`, `cycleCount` 105→106. The three hand-staged rows settled with one cause each, as predicted (Karim ~50% Small Business or a hood field; Tariq/Jabari ~48% parent / ~27% school): POP-00980 Karim Avery → Parks Maintenance Aide, tag Government & Civic, hired at Oakland Parks & Recreation, line `(the neighborhood's trade: Government & Civic)`; POP-00991 Tariq Mitchell → Gallery Attendant, tag Creative & Arts, hired at Ridgeline Studio (Architecture, Uptown), `(following Dyami into Creative & Arts)`; POP-01003 Jabari Jack → After-School Program Aide, tag Education, hired at Peralta Community College District, `(the field their school years pointed to: Education)`. Every hire landed IN the field (the exact-category pool). Live: staged from a `clasp pull` of live + the one-file overlay, diff vs the bench stage empty, PROD @17, pull-back byte-identical, HELD four at base. First live settlement is C156 (BirthYear 2025) unless a row is staged.
- 2026-09-02 (engine-sheet, S411) — **Loops 1+2 coded + unit-proven (81/81):** field-first settlement — `settleField_` (pure, one draw), `SETTLE_FIELDS`, `SETTLE_ROLES_BY_FIELD`, `SETTLE_FIELD_ECON_KEYS`, `settleYouthCounts_`, `settleFieldClause_`; `buildSettleBizPool_` returns hood/city/category maps from its one read; the employer draw hires into the field. Bench proof: see the later entry. Backlog items 5 (graduation follows the field) and 6 (Trades unmatchable by E3) filed.

- 2026-09-02 (engine-sheet, S410 close) — §Backlog added on builder direction: degree field, start-role choice, youth mode (life-stage gate, not a ClockMode), youth events control. Row engine.144 kept in-progress so the plan stays out of the archive sweep while the backlog is live.

- 2026-09-01 (engine-sheet, S410, 23:30) — **LIVE PROD @16.** Bench @6 C108 clean; no `counted)` line yet on the bench (the tie the credential breaks is real but rare — E2 fires ≈1/10 cycles city-wide and E3 needs two same-band candidates in one field). Empirical proof accrues on live; watch `LifeHistory_Log` EventText for `counted)`.

- 2026-09-01 (engine-sheet, S410, later) — Tasks 1–4 coded same session: `credentialRank_` (educationCareerEngine.js), `promotionOrder_` / `hireSlotOrder_` / `credentialRankOf_` / `hireIncomeBand_` (runCareerEngine.js); E2 line reads `Promoted at X (the bachelors counted) after N years as a Role.` only when the credential broke the longest-waiting tie; E3 hire line likewise inside a $10k band. Bench @6 = HEAD (HELD four at base), C108 fire next.
- 2026-09-01 (engine-sheet, S410) — Plan written on builder go ("your approach"). Connection loop opened after engine.143 isolation smoke on the bench (C106: 52 minors, 0 ENGINE-clock minors off their engine-year band; 0 errors).
