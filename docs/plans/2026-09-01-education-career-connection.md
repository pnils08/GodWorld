---
title: Education → Career Connection Plan (engine.144)
created: 2026-09-01
updated: 2026-09-01
type: plan
tags: [engine, citizens, education, career, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md engine.144
  - docs/plans/2026-08-31-education-loop.md §After this loop — the connection is a separate file, after isolation proof
  - docs/plans/2026-08-29-employment-system-cascade.md §engine.135 acceptance verdict (S405 builder ruling — education supplies the *reason*; do not widen E3)
  - docs/research/2026-08-30-education-system.md §Extraction — degrees push four things, none of them a job
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[plans/2026-08-31-education-loop]] — the isolation loop this connects (LIVE PROD @14)"
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

## Open questions

None that block. Decisions made here (engine-sheet holds mechanism):
- Secondary key, never primary — "one cause among others" is the S405 wording and the sort order is the literal reading of it.
- E3 income banded to $10k so the credential can actually decide something; raw-income ties are too rare to be a lived cause.
- Layoff shield deferred to its own loop.

## Changelog

- 2026-09-01 (engine-sheet, S410, 23:30) — **LIVE PROD @16.** Bench @6 C108 clean; no `counted)` line yet on the bench (the tie the credential breaks is real but rare — E2 fires ≈1/10 cycles city-wide and E3 needs two same-band candidates in one field). Empirical proof accrues on live; watch `LifeHistory_Log` EventText for `counted)`.

- 2026-09-01 (engine-sheet, S410, later) — Tasks 1–4 coded same session: `credentialRank_` (educationCareerEngine.js), `promotionOrder_` / `hireSlotOrder_` / `credentialRankOf_` / `hireIncomeBand_` (runCareerEngine.js); E2 line reads `Promoted at X (the bachelors counted) after N years as a Role.` only when the credential broke the longest-waiting tie; E3 hire line likewise inside a $10k band. Bench @6 = HEAD (HELD four at base), C108 fire next.
- 2026-09-01 (engine-sheet, S410) — Plan written on builder go ("your approach"). Connection loop opened after engine.143 isolation smoke on the bench (C106: 52 minors, 0 ENGINE-clock minors off their engine-year band; 0 errors).
