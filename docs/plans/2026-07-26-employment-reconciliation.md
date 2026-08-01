---
title: Employment Reconciliation — roster vs careers vs Business_Ledger
created: 2026-07-26
updated: 2026-08-01
type: plan
tags: [engine, citizens, economy, canon, active]
sources:
  - Mike-direct S334 — "employment roster vs citizens careers vs business ledger"; institution cohorts first, then the rest, with model agents helping
  - scripts/linkCitizensToEmployers.js — the five-layer resolver that already does this work (Phase 14.4)
  - data/employer_mapping.json — the config the resolver reads; this plan is mostly edits to THIS file
  - docs/canon/INSTITUTIONS.md §The Stack — real-world stack is by design; Civis Systems is the engine/sheet blanket
  - claude-mem S334 — Marbury (POP-00166) + Torres (POP-00057) repairs, the two proof cases
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (engine.83)"
  - "[[../research/2026-08-01-simulation-realism-audit]] — build-order step 2: static repair is the precondition for a living economy"
  - "[[../canon/INSTITUTIONS]] — canon authority for entity names"
  - "[[../SIMULATION_LEDGER]] — column map"
  - "[[SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Employment Reconciliation — roster vs careers vs Business_Ledger

**Goal:** Every tracked citizen resolves to an employer that fits their occupation, and the `Employment_Roster` tab and `Simulation_Ledger.EmployerBizId` agree on who that is.

**Architecture — this already exists; do not rebuild it.** `scripts/linkCitizensToEmployers.js` resolves employers in five ordered layers (sports override → parenthetical extraction → keyword match → self-employed detection → category default → else `UNMATCHED`) and writes both the `Employment_Roster` tab and the ledger's `EmployerBizId`. Its rules live in **`data/employer_mapping.json`** (11 parenthetical lookups, 74 keyword rules, 8 self-employed patterns, 15 category defaults). **So the bulk of this plan is config edits plus a re-run, not per-citizen writes and not a new script.** Per-citizen repair is the exception, for citizens whose canon changed (Marbury, Torres).

**Terminal:** Design research-build → execution engine-sheet.

**Measured starting state (S334):**

| Layer | Rows | Note |
|---|---|---|
| sports | 90 | the `As_Roster` join — players only |
| category | 273 | default-by-category, where the bucket problem lives |
| keyword | 166 | |
| selfEmployed | 65 | |
| parenthetical | 29 | |
| **unmatched** | **286** | 31% of 909 |

`Employment_Roster` and `Simulation_Ledger.EmployerBizId` **disagree on 324 of 909 rows.**

**Three root causes, all data-level:**

1. **`Professional` and `2041-Specific` both default to `BIZ-00030`** (Oakland Tech Collective) alongside the legitimate `Tech & Innovation`. That is the whole "fallback bucket" — 107 tracked vs 62 claimed, twelve Civil Rights Attorneys and a Chief Legal Counsel in a coworking space. Not a ledger bug; a config choice that stopped being right.
2. **The sports layer joins `As_Roster`, which is players only.** Every coach, scout, and former manager falls through to `UNMATCHED` — hitting coach, pitching coach, both base coaches, three scouts, Mike Kinder. And the **Oaks are absent from the resolver entirely** despite `BIZ-00074` existing; all 7 tracked Oaks including head coach Wilson Shepard have a blank employer.
3. **`SPORTS_OTHER` is an internal sentinel that leaked.** The script sets it at layer 1 expecting a later layer to resolve it; 7 ledger rows kept it as a literal value, and it is not a `BIZ_ID`.

**Two rules that bound everything here:**

1. **The ledger is a ~1:443 qualitative sample.** A business with zero tracked employees is EXPECTED, not a defect — never invent employees to fill one. The inverse (tracked *exceeding* stated `Employee_Count`) is impossible and is the real signal: Tech Collective 107/62, W Oakland Community Center 51/44, Baylight Construction 50/35, City of Oakland 45/29, Port 36/28.
2. **Cross-neighborhood employment is normal** — 532 of 610 work outside their neighborhood because journalists commute to the Tribune and ballplayers to the stadium. Proximity is a tiebreaker for **local-service** occupations only (barista, barber, corner grocery), never global.

**Acceptance criteria:**
1. `unmatched` falls from 286 to under 60, and every remaining one is listed with a reason.
2. Zero rows carry `SPORTS_OTHER` or any non-`BIZ_ID` employer value in either the roster tab or the ledger.
3. All 7 Oaks citizens resolve to `BIZ-00074`; all A's staff — coaches and scouts included, not just the 90 players — resolve to `BIZ-00005`.
4. No `CIV=yes` citizen sits at `BIZ-00030`; each is at `BIZ-00017` or a named authority.
5. No business has tracked employees exceeding its stated `Employee_Count`.
6. `Employment_Roster` and `Simulation_Ledger.EmployerBizId` disagree on 0 rows, or every remaining disagreement is deliberate and documented.

---

## Tasks

### Task 1: Authority — RULED (Mike-direct S334)

**The ledger is the truth. The rosters provide added depth on the same citizen.**

Mike's ruling, refined S334: *the ledger is the truth, the rosters just provide added depth — they should be showing the same citizen ultimately.*

This is **not** a precedence hierarchy, and an earlier draft of this task got it wrong by writing one ("roster wins"). There is one citizen. `Simulation_Ledger` holds what is true about them; `Employment_Roster`, `As_Roster`, `Oaks_Roster` and the Supermemory **TrueSource card** carry career depth the ledger has no column for — position, salary, stat lines, professional history, the detail routing needs.

| Source | Carries |
|---|---|
| `Simulation_Ledger` | the truth — employer, status, life state |
| `Employment_Roster` | how that employer was derived (`MappingLayer` = provenance) |
| `As_Roster` / `Oaks_Roster` | career depth — position, team, salary, stats |
| Supermemory TrueSource card | the compiled professional dossier |

**So a divergence is an error, not a contest.** The 324 disagreements are not resolved by picking a winning sheet; each is a case where the same citizen is described two ways and one description is stale. Reconcile toward whichever is actually true — usually the ledger, because the career engine writes lived events there, and a hire is a fact about the citizen.

Practical consequence for every re-run: **`--fill-blanks-only`.** Fill what is empty, never overwrite what the sim has already lived. Proven S334 — the apply wrote 9 blank cells and kept 795 existing values untouched.

- **Verify:** ruling recorded here; the Task 9 re-run honours the flag semantics above
- **Status:** [x] RULED — Mike-direct S334

### Task 2: Sports layer — coaches, scouts, and the Oaks

- **Files:** `data/employer_mapping.json`
- **Steps:**
  1. Add keyword rules mapping A's non-player staff → `BIZ-00005`: `Coach, Oakland A's`, `Scout, Oakland A's`, `Manager, Oakland A's`, and the `Ex-As`/`Former` variants seen in the unmatched list.
  2. Add keyword rules mapping Oaks staff → `BIZ-00074`: `The Oaks`, `Oakland Oaks`, covering both player positions (`PG / The Oaks`) and `Head Coach, Oakland Oaks`.
  3. Keyword layer (3) runs before category default (5), so these resolve before anything reaches the bucket.
  4. **Better than keyword rules for the Oaks: extend the sports layer to join `Oaks_Roster` the way it already joins `As_Roster`.** Mike added the tab S334 — 7 rows, POPID-keyed, `Position | Team | Salary | PPG | ASST | REB | STL | FG% | 3P%`. Join verified 7/7 against the ledger (POP-01022 Wilson Shepard through POP-01028 Wendell Carter Jr., all `Active`, all blank employer). A POPID join is exact where a keyword match is a guess — use it, and keep keyword rules only as the fallback for staff who appear on neither roster tab.
- **Verify:** `--dry-run` shows all 7 Oaks and every A's staffer resolving; `unmatched` drops by the coach/scout count
- **Status:** [ ] not started — unblocked: `Oaks_Roster` now supplies both employer and `Status`

### Task 3: Retire the `SPORTS_OTHER` leak

- **Files:** `scripts/linkCitizensToEmployers.js`, `Simulation_Ledger`
- **Steps:**
  1. The sentinel is correct as an internal marker; the bug is that it can survive to a written value. Make the write path treat a surviving `SPORTS_OTHER` as blank (the script already argues this for `UNMATCHED` at lines 27-31 — same reasoning, same fix).
  2. Repair the 7 existing ledger rows: resolve by `RoleType` to `BIZ-00005` / `BIZ-00074`, else blank.
- **Verify:** zero `SPORTS_OTHER` in either sheet; a dry-run cannot produce one
- **Status:** [ ] not started

### Task 4: Split the `Professional` and `2041-Specific` defaults

- **Files:** `data/employer_mapping.json`
- **Steps:**
  1. `Tech & Innovation → BIZ-00030` stays — a coworking tech hub is the right home, and freelancers legitimately belong there.
  2. `Professional` and `2041-Specific` must stop pointing at `BIZ-00030`. Add keyword rules ABOVE the category layer for the concrete professions in the bucket (attorney/counsel → a legal employer or `BIZ-00017` where the role is a city post; urban planner → `BIZ-00017`; event planner → `SELF_EMPLOYED`).
  3. Whatever genuinely has no better home may keep the tech-hub default, but the category itself should no longer sweep everything there.
- **Verify:** `--dry-run` shows `BIZ-00030` tracked count at or under its stated 62
- **Status:** [ ] not started

### Task 5: Civic cohort

- **Files:** `data/employer_mapping.json`, `Simulation_Ledger`
- **Steps:**
  1. `Government & Civic → BIZ-00017` already works for 28 of 56 `CIV=yes` citizens. The 10 sitting at `BIZ-00030` are `Professional`-category casualties — Task 4 fixes most; verify each.
  2. Project directors: **OARI, Stabilization Fund, Health Center, and Transit Hub have NO `Business_Ledger` row** (only Baylight does — `BIZ-00006`, `BIZ-00020`). Park those directors at `BIZ-00017` — they are city employees running city programs — unless Mike wants authority BIZ rows minted.
  3. The capital building already exists as `BIZ-00017` City of Oakland (Municipal Government, Downtown). **Do not create a second one.**
- **Verify:** zero `CIV=yes` at `BIZ-00030`; every civic citizen traceable to `BIZ-00017` or a real authority
- **Status:** [x] DONE S334 — 10 moved, zero `CIV=yes` left at `BIZ-00030`. The justice cluster (Dane DA, D'Souza + Rourke ADAs, Reyes PD, Guzman Deputy PD, Tate Court Liaison) to `BIZ-00022` Alameda County Courts; Vasquez, Ellis, Bono to `BIZ-00017`; Ramirez (OPOA President) to `BIZ-00024`. **Left alone deliberately** — employer right, something else wrong: Graye at the Tribune (his CIV flag is the error), three senior pastors at `BIZ-00028` (they belong at their own faith-org rows, which needs the `Faith_Organizations` mapping rather than a guess), and a tenants-union rep, taxpayers-coalition president, artist and fitness trainer all correctly `SELF_EMPLOYED`.

### Task 5b: Mint the civic initiatives as establishments (Mike-direct S334)

**"We should also be adding the civic_initiatives establishments as they are characters in the sim."** An initiative that hires, disburses, builds and answers to council is an actor, not a line item — and until it has a `BIZ_ID` its director has nowhere to work.

- **Files:** `Business_Ledger`, then `data/employer_mapping.json`
- **Steps:**
  1. Add a `Business_Ledger` row per live initiative. From `Initiative_Tracker`, the five needing one (Baylight already has `BIZ-00006` Baylight District Mangement + `BIZ-00020` Baylight Construction Authority):

     | Initiative | Name for the establishment | Sector | Neighborhood |
     |---|---|---|---|
     | INIT-001 | West Oakland Stabilization Fund | Community Development | West Oakland |
     | INIT-002 | Oakland Alternative Response Initiative | Public Safety / Crisis Response | Downtown |
     | INIT-003 | Fruitvale Transit Hub Authority | Transit & Infrastructure | Fruitvale |
     | INIT-005 | Temescal Community Health Center | Healthcare | Temescal |
     | INIT-007 | Oakland Youth Apprenticeship Pipeline | Workforce Development | Downtown |

     `Employee_Count` must reflect the program's real staffing, NOT the tracked-citizen count — the ledger is a sample and tracked must never exceed stated (see the bounding rules above). Take headcount from the initiative's own budget/staffing record where one exists; where none does, leave it low and honest rather than invented.
  2. Repoint the project directors off `BIZ-00017` onto their own establishment: Webb → Stabilization Fund, Tran-Muñoz → OARI, Chen-Ramirez → Health Center, Soria Dominguez → Transit Hub. Ramos already sits at `BIZ-00020`.
  3. Add `parentheticalLookup` / `keywordRules` entries so future citizens naming these programs resolve to them.
  4. Cross-check the establishment names against [[../canon/INSTITUTIONS]] before writing — these become canon entities that agents may name in print.
- **Verify:** each of the five resolves from a director's `RoleType`; no establishment has tracked employees exceeding its stated `Employee_Count`
- **Status:** [x] DONE S334 — BIZ-00094 West Oakland Stabilization Fund / BIZ-00095 Oakland Alternative Response Initiative / BIZ-00096 Fruitvale Transit Hub Authority / BIZ-00097 Temescal Community Health Center / BIZ-00098 Oakland Youth Apprenticeship Pipeline appended to `Business_Ledger` (94 -> 99 rows), `Annual_Revenue` = the council-approved budget from `Initiative_Tracker`. Four directors repointed off blank/BIZ-00017: Webb POP-00790, Tran-Munoz POP-01021, Soria-Dominguez POP-00791, Chen-Ramirez POP-00792. BIZ-00098 has no tracked staff — the Pipeline has no named director in canon (Cortez was interim budget owner, not director), and inventing one was not on. 7 keyword rules added to `employer_mapping.json` (v1.2); dry-run keyword layer 170 -> 174, unmatched 287 -> 283. **Employee_Count figures are placeholders** — budget-plausible and safely above tracked, but Mike sets the real headcounts.

### Task 6: Media cohort

- **Files:** `data/employer_mapping.json`
- **Steps:**
  1. All 31 `Bay_Tribune_Oakland` POPIDs should resolve to `BIZ-00018` except the canon freelancers (Jax Caldera, Farrah Del Rio, Kai Marston, Arman Gutierrez) — check each against its voice file before forcing the Tribune.
  2. `MED=yes` does not mean Tribune-employed; leave non-roster media citizens alone.
- **Verify:** every roster POPID resolves to `BIZ-00018` or a named canon exception
- **Status:** [x] DONE S334 — 26 of 31 already correct. Kai Marston + Arman Gutierrez to `BIZ-00018` (Culture desk staff; photo assistant to Tribune-staff Hartley). Mint Condition OFF `BIZ-00005` to `SELF_EMPLOYED`: canon says the Tribune *runs* his column with heavy disclaimers and his identity is unknown, so he is neither Tribune staff nor an Athletics employee. Unchanged as correct — Farrah Del Rio `SELF_EMPLOYED` ("a longtime Oakland essayist... she is not a reporter") and Ariana Reyes at `BIZ-00008`, whose title names the firm.

### Task 7: The tail — propose keyword rules, not per-citizen writes (agent-assisted)

- **Files:** `data/employer_mapping.json`
- **Steps:**
  1. Take the `unmatched` remainder after Tasks 2-6. Fan out **Sonnet** seats in batches; each seat receives the batch's `RoleType` / `EconomicProfileKey` / `Neighborhood` plus the full `Business_Ledger` sector list, and returns **proposed keyword rules** — `{pattern, bizId, reason, exampleCitizens}` — never per-citizen edits. Rules generalise; row edits do not.
  2. Per `docs/MODEL_HIERARCHY.md` §8 the lead holds judgment: review every proposed rule before it enters the config. Haiku only if a seat demonstrates it holds the sector rules.
  3. A citizen with no plausible tracked employer stays blank. Blank is honest; the bucket is not.
- **Verify:** `--dry-run` shows `unmatched` under 60; each new rule cites its sector logic
- **Status:** [ ] not started

### Task 8: Local-service proximity pass

- **Files:** `data/employer_mapping.json`
- **Steps:**
  1. Identify local-service occupations (barista, barber, grocery clerk, server). Only these are proximity-governed.
  2. Where a matching-sector tracked business exists in or adjacent to the citizen's neighborhood, prefer it. Where none exists, leave them — **do not create a business to satisfy the rule.**
  3. Note the resolver is name/keyword-driven, not location-aware; if per-neighborhood routing needs a sixth layer, that is a separate design and Mike's call, not a silent addition here.
- **Verify:** local-service citizens in-neighborhood where possible; the rest listed with "no matching business in hood"
- **Status:** [ ] not started

### Task 9: Close out

- **Files:** `docs/engine/ROLLOUT_PLAN.md`, this plan
- **Steps:**
  1. Full run: `node scripts/linkCitizensToEmployers.js --dry-run` → review → apply with the flag semantics Task 1 ruled.
  2. Re-scan: unmatched count, `SPORTS_OTHER` count, over-headcount businesses, roster-vs-ledger divergence. Record before/after in the Status log.
  3. Flip engine.83 to `done-pending-archive` when all six acceptance criteria hold.
- **Verify:** `node scripts/docLoopStatus.js --lint` clean
- **Status:** [ ] not started

---

## Open questions

- [x] **RESOLVED S334 — authority.** Roster wins; the ledger is the citizen's life in the sim. Full ruling + the career-engine caveat in Task 1.
- [x] **RESOLVED S334 — Oaks `Status` source.** Mike added `Oaks_Roster` (7 rows, POPID-keyed, with position/salary/stat columns). Join verified 7/7 against the ledger. Task 2 unblocked on both halves.
- [ ] `Employee_Count` for the five new civic establishments (Task 5b) — is there a staffing figure in each initiative's budget record, or does Mike set them? Blocks nothing; a low honest number can land first and be revised.
- [ ] `Initiative_Tracker` has no `INIT-004`. Gap or retired? Not this plan's job, but worth a look before the establishments are minted in case one is missing.

---

## Changelog

- 2026-07-26 (S334) — Initial draft, rewritten pre-publish around the existing resolver.
- 2026-07-26 (S334) — Authority ruled (roster wins), Oaks_Roster landed, Task 5b added to mint civic initiatives as establishments.
- 2026-08-01 (Kimi) — Audit pointer added: build-order step 2 of [[../research/2026-08-01-simulation-realism-audit]] — this static repair is the precondition for the living economy.
