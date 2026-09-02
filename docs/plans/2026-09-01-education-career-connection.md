---
title: Education → Career Connection Plan (engine.144)
created: 2026-09-01
updated: 2026-09-02
type: plan
tags: [engine, citizens, education, career, youth, active]
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

## Loop 4 — youth texture, the minors' whole texture (S411, engine-sheet)

**Measure.** The youth engine's vocabulary helpers (`selectYouthEventType_`, `pickYouthEvent_`, `generateYouthOutcome_`, `assignSchoolForYouth_`, `batchRecordYouthEvents_`) left with `utilities/youthActivities.js` at S357; every `typeof` guard has fallen through since, so every youth line on live reads "[Education] youth activity (participated)". `getNamedYouth_` hardcoded `currentYear = 2041` (the world is 2042) and read a stored `Age` column before BirthYear. `getYouthStorySignals_` has no callers; nothing parses the "(outcome)" suffix. Cohort 5–17 at the 2042 anchor: 36 (34 ENGINE / 2 GAME), 18 child / 18 teen; 7 more minors are under five.

**Mechanism (`runYouthEngine.js`, nothing new):**
- Vocabulary rebuilt in-file: `YOUTH_TEXTURE_POOLS` by stage (child 5–12 / teen 13–17 / college 18–22) × type (academic, sports, arts, clubs, civic_participation, coming_of_age, community_support, resilience, safety_awareness) — ~100 lines in the daily-life voice, no real school/team/org names (grep-tested). The four child/teen lines from `generateCitizensEvents.agePoolFor_` moved here; those two branches now return `[]` (minors never reach that generator since loop 3; the 18–22 `youth` branch stays).
- `selectYouthEventType_(age, month, rng)` — weighted draw in fixed key order, stage weights × `ACADEMIC_CALENDAR` period pull (graduation months ×3 coming_of_age for 16+, summer academic ×0.4 and sports/arts/clubs ×1.4, fall sports ×1.3, winter arts ×1.3). `pickYouthEvent_(type, rng, age)`, `generateYouthOutcome_` (object only, never printed), `assignSchoolForYouth_` (cosmetic, `.high` by hood). `batchRecordYouthEvents_` stays undefined on purpose — `Youth_Events` is dead by ruling.
- Two layers. The EVENT layer is unchanged (15–25% by school level, 25/5 caps, `S.youthEvents`, signals) but now draws stage-aware sentences. The TEXTURE layer is a second pass over every minor 5–17: `YOUTH_TEXTURE_BASE` 0.65 (adult decks 0.72) × the same calendar / QoL / hotspot / drive factors, capped 0.95, one line each, no cap; 20% name an active `Community_Programs` entry in the hood. `S.youthTexture = {cohort, generated}`; one Logger line.
- Line format: `stamp — [DialTag] sentence` — the "(participated)" suffix is gone for both layers. `LifeHistory_Log` EventTag `Dial|youth-<type>` for events, `Dial|youth-<type>|texture` for the texture layer. Every type routes through `YOUTH_DIAL_TAG` (unit-checked) so no type silently defaults to `Education`.
- Age: `currentYear = S.simYear || 2040 + floor(absoluteCycle/52)`, BirthYear first. This ages the youth cohort one year (2041 → 2042 anchor).
- Decision: under-fives draw nothing from any texture writer; the household shared moment (`generateCitizensEvents`) is their week.

**Tests:** `scripts/educationLoop.test.js` §9 (14 checks; 95/95): dial routing, canon-name grep, relocation both sides, calendar-year age, rate band, no under-five/adult lines, no suffix, log token, calendar pull on the type mix, determinism.

**Bench prediction (C108 = Y3C4, January, calendar factor 1.0):** cohort 36, texture lines ≈ 23 (range 16–30), event-layer lines in C107's range (4–8), 0 `Engine_Errors`, no "(participated)" in any C108 line, every minor line tagged `|youth-…`.

## engine.145 — the SkillTags gap (S411, engine-sheet, builder go "Go")

**What SkillTags is.** One column (BB, S336). A business has a free-text `Sector`; `sectorCategory_` (runCareerEngine.js) reads it as one of TWELVE categories; the E3 matcher hires only citizens whose tag equals that category. Since loop 1 it is also the field an 18-year-old is aimed at. The S336 backfill wrote the economic catalog's FIFTEEN categories (`data/economic_parameters.json` `category`), so three of them — `Trades` (12 catalog roles), `The Vulnerable` (12), `2041-Specific` (16) — never equal any business category. Live adults (827 active): 609 matchable, 59 Trades, 24 The Vulnerable, 21 2041-Specific, 1 Organized_Crime, 58 blank, 55 sports-layer (intentional). The "two truths" pipe design (current job | trained field) never materialised: 3 rows of 968 carry a second tag. No business sector on the live ledger reads as Trades (7 Construction, 18 Services, no electrical/plumbing/HVAC), so adding a Trades category to the matcher would have matched nothing.

**Mechanism.** The row KEEPS its catalog category (it is a truth about the role). The FIELD it stands in is resolved in one place — `SKILLTAG_FIELD_ALIASES` + `skillTagField_(tag)` + `tagsMatchCategory_(tags, cat)` in `educationCareerEngine.js` (shared scope): Trades → Construction & Baylight; The Vulnerable → Government & Civic (housing / social-services / crisis sectors read civic); 2041-Specific → Tech & Innovation. Sports-layer tags resolve to nothing. Readers: E3 same-field + isCross (`tagsInCategory_` in runCareerEngine.js, exact-match fallback when the helper is absent), the settlement draw (own tag + parents' tags), `hoodReferencePay_`. `isSettleField_` stays for the vocabulary check.

**Ledger (live, 2026-09-02, one pass, read back 53/53).** The 55 blank ENGINE adults: catalog match on RoleType/EconomicProfileKey first (11), then keyword rules on the role (42); every row printed before and after (`scratchpad/tagRestore.js`, `lib/sheets` direct). Left blank on purpose: POP-00972 "Waterfront Resident", POP-00973 "Letter Writer" — not jobs. POP-01058 "basketball player" (T3 ENGINE) → `athlete`, the sports-layer convention. Snapshot refreshed (`dumpLedger`). The 46 catalog-labelled rows were NOT retagged — the alias makes the retag unnecessary and the label is truer than a guess.

**Tests:** `educationLoop.test.js` (4 new; 99/99), `employerSuccess.test.js` (2 new; 45/45). **Bench:** @11 C109 ok:true, 0 `Engine_Errors` (hire volume is business-window-driven; the alias is unit-proven, the fire proves no crash).

**Decision left open for the builder:** whether SkillTags should ever carry the second truth (trained field ≠ current job). Today the settlement writes the field the kid was aimed at, and E2/E3 then read it as the current field. If a career change should keep the trained field visible, that is a second token — the pipe design already allows it; nothing writes it.

## engine.146 — SkillTags two truths (S411, engine-sheet, builder: "true the design as it was intended, unless the system itself wouldn't benefit")

**Does the system benefit? Yes, on the record.** Two intake paths change a citizen's RoleType without touching SkillTags — the media-room role edit (`godWorldEngine2.js`, the canon door) and `processAdvancementIntake` — so after a role change the tag silently held the old field while E2/E3 read it as the current one. And live already disagreed: 24 ENGINE adults whose RoleType's catalog field was not in their tag (plumbers tagged Education, line cooks tagged Professional). For 11 of them the employer's own sector confirmed the tag as the current field (a plumber on the school district's payroll); for 13 the tag was an S336 keyword guess (`Security Guard` → default `Small Business`) with no employer sector behind it.

**Convention.** `SkillTags = <current job's field>|<trained field>` when they differ; one token when equal (the settlement case — a kid works in the field they were aimed at). Non-field tokens (athlete/coach/scout) ride along at the end. Readers already honor both (E3 `tagsMatchCategory_` takes any token — both truths are hireable; `hoodReferencePay_` reads the first = current; a parent's two fields both weigh at a kid's settlement).

**Writers (`educationCareerEngine.js`, shared scope):** `roleFieldOf_(roleText)` — catalog category via `ECONOMIC_PARAMETERS` (citizenDerivation.js), else `roleSectorCategory_` hints; catalog label kept. `setCurrentField_(tags, newField)` — new field leads; the ORIGINAL trained field (token 2 if present, else the only field) follows when different; aliased equality (Trades ≡ Construction & Baylight) is not a change. Called at both role-change sites; the media-room edit logs `SkillTags: a -> b` in its edits list.

**Ledger (live, 2026-09-02, read back 24/24, snapshot refreshed):** 11 rows → `current|trained` (e.g. POP-00217 Plumber at Oakland City Schools: `Education|Trades`); 13 rows → the trained field alone, replacing the guess (e.g. POP-00234 self-employed Plumber: `Small Business` → `Trades`). Rule: the existing tag counts as the current truth only when the employer's sector reads as that field. Script `scratchpad/twoTruths.js`, `lib/sheets` direct, every row printed.

**Tests:** `educationLoop.test.js` +8 (107/107) — blank, role change, same field, second change keeps the original trained field, aliased equality, non-field tokens, catalog lookup, both call sites. **Bench:** @12 C110 ok:true / 0 `Engine_Errors` (a role change needs a media-room or advancement row; the writer is unit-proven, the fire proves no crash). **Live: PROD @21**, pull + three-file overlay, diff vs bench stage empty, pull-back byte-identical.

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

5. ~~**Graduation follows the field** (deferred from loops 1+2, S411).~~ **DONE S412 as engine.149.** Builder ruling 2026-09-02: **a trade certificate is a peer of the associate's.** (a) `credentialRank_`: trade-cert 2 → 3, level with associates (some-college stays 2), so the E2/E3 secondary key no longer penalises the trades track. (b) `graduationCredential_(current, schoolQuality, skillTags)`: at the hs-diploma step a citizen whose CURRENT field (SkillTags token 1) is `Trades` / `Construction & Baylight` / `Port & Labor` / `Transit & Infrastructure` takes `trade-cert`, whatever the school quality; every other field keeps the school-quality draw; the trained field (token 2) does not aim it. Ladder above hs-diploma unchanged (trade-cert → bachelors). Live reach: 39 trade-cert holders re-rated; 3 of the 33 hs-diploma actives aged 22–28 without a `[Graduation]` stand in a trade field today (snapshot S411).
7. ~~**Two year formulas** (S411 finding).~~ **DONE S412 as engine.148.** The calendar's arithmetic is the one formula: `simYearFromCycle_` / `simYearOf_` in `advanceSimulationCalendar.js`; 25 per-site `2040 + floor(cycle/52)` derivations across 12 engine files replaced by `simYearOf_(ctx, cycle)`; the S411 count of "fifteen" was a truncated grep — the unbounded grep found 25 plus the casino site. Casino: `ageYear = 2040 + S.simYear` (≈4082) made every citizen ≈2,000 years old to `casinoEligible_`, so the 18+ gate never held — same commit.
6. ~~**E3 cannot hire 63 `Trades`-tagged citizens** (S411 finding).~~ **DONE S411 as engine.145 (§above).** `sectorCategory_` never returns `Trades`, so no business category ever matches the tag; the same holds for `The Vulnerable` (27) and `2041-Specific` (22). The field path no longer mints `Trades` (electricians settle under Construction & Baylight); the no-source legacy fallback (`settleSkillTag_`) still can. The live rows need either a category or a re-tag. Own row when picked up.

Filed by engine-sheet at the builder's request; (1)/(2) SHIPPED S411 as one mechanism (§Loops 1+2 above); (3) SHIPPED S411 (§Loop 3 above); (4) SHIPPED S411 (§Loop 4 above).

## Open questions

None that block. Decisions made here (engine-sheet holds mechanism):
- Secondary key, never primary — "one cause among others" is the S405 wording and the sort order is the literal reading of it.
- E3 income banded to $10k so the credential can actually decide something; raw-income ties are too rare to be a lived cause.
- Layoff shield deferred to its own loop.

## Changelog

- 2026-09-02 (engine-sheet, S412) — **engine.149 backlog 5 coded + unit-proven (119/119):** `credentialRank_` re-rate (trade-cert = associates = 3), `GRADUATION_TRADE_FIELDS_` + `graduationTradeTrack_` + the `skillTags` argument on `graduationCredential_`, `iSkillTags` read in the milestone loop. Tests: trade-cert on the trades track at SQ 5 and 9; Port / Transit / legacy Trades; trained-field token does NOT aim; non-trade / athlete / blank unchanged; trade-cert still climbs to bachelors; the rank table. Bench + live: see the later entry.
- 2026-09-02 (engine-sheet, S412, later) — **engine.148 LIVE PROD @22.** Bench @13 C111: ok:true / 130s / 0 `Engine_Errors`, `cycleCount` 110→111; casino placed 18 slips, 0 by minors (C106–C110 had 54, also 0 by minors — the broken gate never bit in practice because minors fail the income/net-worth floor, but it was open); 32 LifeHistory rows on minors at C111 vs 30 at C110. What the fire proves: the helper resolves in the flat namespace and every age-gated writer still fires; the arithmetic itself is the unit block (C111 is not a year boundary — the next one is C156). Live: pull + 13-file overlay, diff vs bench stage empty, PROD @22, pull-back byte-identical 13/13, HELD four at base. Row engine.148 → done-pending-archive.
- 2026-09-02 (engine-sheet, S412) — **engine.148 backlog 7 coded + unit-proven (suite 193/194, the one fail is the pre-existing media `djDirect.schema-and-slot`):** one year formula — `simYearFromCycle_(cycle)` = `2040 + (ceil(cycle/52) − 1)` and `simYearOf_(ctx, cycle)` (calendar's `S.simYear` first) in `advanceSimulationCalendar.js`; the calendar itself writes `S.simYear` through it. 25 sites in 12 files switched (generationalEvents ×2, generationalWealth ×4, householdFormation ×3, processAdvancementIntake ×3, migrationTracking, bond ×4, runCareer, educationCareer ×5, runEducation, checkForPromotions, runYouth). Casino age bug (`2040 + S.simYear`) fixed at the same time. Unit block 12 in `educationLoop.test.js`: helper == calendar at 1/52/53/104/105/156/157, the retired formula ≠ calendar at 52 and 104, and a grep-as-test that no engine file re-derives the year. Six harnesses now load the calendar file first (as the flat Apps Script namespace does). Bench + live: see the later entry.
- 2026-09-02 (engine-sheet, S411) — **engine.146 SkillTags two truths LIVE PROD @21:** `setCurrentField_` / `roleFieldOf_` at both role-change intake sites; convention current|trained; 24 disagreeing live rows trued (11 two-token, 13 guess→trained), read back 24/24. 107/107; bench @12 C110 clean. Design decision recorded in §engine.146.

- 2026-09-02 (engine-sheet, S411, later) — **engine.145 LIVE PROD @20.** Bench @11 C109 ok:true / 0 errors. Live staged from a pull + three-file overlay, diff vs bench stage empty, pull-back byte-identical, HELD four at base. The 53-row SkillTags fill is live-only (bench keeps the blanks; it is a replica, not canon).
- 2026-09-02 (engine-sheet, S411) — **engine.145 SkillTags gap coded + ledger restored:** alias table resolves the three catalog-only categories to the field a business carries, for E3 / settlement / hood pay; 53 blank adult rows filled from role on live (read back 53/53), 2 left blank; snapshot refreshed. 99/99 + 45/45; bench @11 C109 clean. Live: see the later entry.

- 2026-09-02 (engine-sheet, S411, later) — **Loop 4 LIVE PROD @19.** Bench @9 C108 (Y3C4, January): ok:true, 0 `Engine_Errors`, `cycleCount` 107→108. Cohort 36; texture 24 (predicted 23) — Team 8 / Education 6 / Cultural 5 / Community 9 / Civic 4 / Graduation 1; event layer 9; per-citizen adult-source 0 (one household shared moment, by design); "(outcome)" suffixes 0; under-five youth lines 0. Sample: Mateo (11, Rockridge) "practiced free throws against the garage until the neighbor came out to rebound"; Riya (10, Downtown) "got their name on the wall at NeuroCity Youth Lab"; Mei (14, Jack London) "stayed after class to argue a grade and left with a better question instead". One text fix after the fire (a graduation-stage line is calendar-bound and fired in January → non-seasonal sentence; bench @10, text-only). Live: pull + two-file overlay, diff vs bench stage empty, PROD @19, pull-back byte-identical, HELD four at base.
- 2026-09-02 (engine-sheet, S411) — **Loop 4 youth texture coded + unit-proven (95/95):** vocabulary rebuilt in `runYouthEngine.js` (the S357 helpers had been missing — every youth line read "youth activity (participated)"), texture pass over every minor 5–17 at the adults' rate, calendar year instead of the hardcoded 2041, GCE child/teen pools relocated. Backlog 7 (two year formulas) filed. Bench + live: see the later entry.

- 2026-09-02 (engine-sheet, S411, later) — **Loop 3 LIVE PROD @18.** Bench @8 C107: ok:true, 0 `Engine_Errors`, `cycleCount` 106→107. Minor texture in `LifeHistory_Log`, 43 active minors (41 ENGINE / 2 GAME): C106 (before) 83 rows, 72 of them per-citizen adult-source lines; C107 (gate) 4 rows, all youth-engine `[Education]`, 0 adult-source. Live: pull + two-file overlay, diff vs bench stage empty, pull-back byte-identical, HELD four at base. Minors' lives are thin until loop 4 gives the youth engine the whole texture — that is the next loop, not a regression.
- 2026-09-02 (engine-sheet, S411) — **Loop 3 youth mode coded + unit-proven (19/19):** caller-graph of every LifeHistory writer + the live log settled it on `generateCitizensEvents.js` (all `source:*` lines) and the `[Home]` member stamp; life-stage gate at both (BirthYear at the writer, not a ClockMode); household shared moment kept for minors. Bench + live: see the later entry.

- 2026-09-02 (engine-sheet, S411, later) — **Loops 1+2 LIVE PROD @17.** Bench @7 C106: ok:true, 0 `Engine_Errors`, `cycleCount` 105→106. The three hand-staged rows settled with one cause each, as predicted (Karim ~50% Small Business or a hood field; Tariq/Jabari ~48% parent / ~27% school): POP-00980 Karim Avery → Parks Maintenance Aide, tag Government & Civic, hired at Oakland Parks & Recreation, line `(the neighborhood's trade: Government & Civic)`; POP-00991 Tariq Mitchell → Gallery Attendant, tag Creative & Arts, hired at Ridgeline Studio (Architecture, Uptown), `(following Dyami into Creative & Arts)`; POP-01003 Jabari Jack → After-School Program Aide, tag Education, hired at Peralta Community College District, `(the field their school years pointed to: Education)`. Every hire landed IN the field (the exact-category pool). Live: staged from a `clasp pull` of live + the one-file overlay, diff vs the bench stage empty, PROD @17, pull-back byte-identical, HELD four at base. First live settlement is C156 (BirthYear 2025) unless a row is staged.
- 2026-09-02 (engine-sheet, S411) — **Loops 1+2 coded + unit-proven (81/81):** field-first settlement — `settleField_` (pure, one draw), `SETTLE_FIELDS`, `SETTLE_ROLES_BY_FIELD`, `SETTLE_FIELD_ECON_KEYS`, `settleYouthCounts_`, `settleFieldClause_`; `buildSettleBizPool_` returns hood/city/category maps from its one read; the employer draw hires into the field. Bench proof: see the later entry. Backlog items 5 (graduation follows the field) and 6 (Trades unmatchable by E3) filed.

- 2026-09-02 (engine-sheet, S410 close) — §Backlog added on builder direction: degree field, start-role choice, youth mode (life-stage gate, not a ClockMode), youth events control. Row engine.144 kept in-progress so the plan stays out of the archive sweep while the backlog is live.

- 2026-09-01 (engine-sheet, S410, 23:30) — **LIVE PROD @16.** Bench @6 C108 clean; no `counted)` line yet on the bench (the tie the credential breaks is real but rare — E2 fires ≈1/10 cycles city-wide and E3 needs two same-band candidates in one field). Empirical proof accrues on live; watch `LifeHistory_Log` EventText for `counted)`.

- 2026-09-01 (engine-sheet, S410, later) — Tasks 1–4 coded same session: `credentialRank_` (educationCareerEngine.js), `promotionOrder_` / `hireSlotOrder_` / `credentialRankOf_` / `hireIncomeBand_` (runCareerEngine.js); E2 line reads `Promoted at X (the bachelors counted) after N years as a Role.` only when the credential broke the longest-waiting tie; E3 hire line likewise inside a $10k band. Bench @6 = HEAD (HELD four at base), C108 fire next.
- 2026-09-01 (engine-sheet, S410) — Plan written on builder go ("your approach"). Connection loop opened after engine.143 isolation smoke on the bench (C106: 52 minors, 0 ENGINE-clock minors off their engine-year band; 0 errors).
