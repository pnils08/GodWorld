---
title: Employment as a living system — research
created: 2026-07-27
updated: 2026-07-27
type: reference
tags: [research, engine, citizens, economy, canon, active]
sources:
  - Mike-direct S334/S335 — "we never really fully completed the business ledger and employment roster and roster ledgers and the simulation being the [truth]… the job is fixing it now"
  - Live measurement S335 — Business_Ledger (99 rows), Employment_Roster (925), Generic_Citizens (292), Simulation_Ledger (930)
  - scripts/linkCitizensToEmployers.js — the five-layer resolver
  - phase06-analysis/economicRippleEngine.js — already consumes careerSignals.businessDeltas + layoffs
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (engine.83, engine.84)"
  - "[[index]] — register here, same commit"
  - "[[../plans/2026-07-26-employment-reconciliation]] — the repair plan this feeds"
---

# Employment as a living system — research

**Source:** Mike's S334/S335 direction plus live measurement of the four tables that carry employment. Not an external paper — a source-mining record of our own half-built system.

**What this addresses:** The employment repair (engine.83) kept surfacing defects that were symptoms of one absence: employment was **assigned once and never lived**. Mike named the real target — a loop where businesses hire and fire, citizens are born into tracked jobs, and a business invented in print becomes a place someone can work. This file is what is true today and what the loop needs, so the plan can stop patching rows.

**What it does (current state, measured S335):**

Four tables carry employment, and the pipeline between them runs one direction only.

| Table | Rows | State |
|---|---|---|
| `Business_Ledger` | 99 | **23% economically empty** — no `Employee_Count`, `Avg_Salary`, `Annual_Revenue` or `Growth_Rate` (all `BIZ-00070+`: the venue and faith-org expansions). 84% have no `Key_Personnel`. |
| `Employment_Roster` | 925 | Structurally complete — `BIZ_ID \| POP_ID \| CitizenName \| RoleType \| Status \| MappingLayer`. The join layer, with provenance. |
| `Simulation_Ledger` | 930 | Holds `EmployerBizId`. The truth about who works where. |
| `Generic_Citizens` | 292 | Has `Occupation`. **Has no `EmployerBizId` column at all.** |

`scripts/linkCitizensToEmployers.js` resolves citizen → business in five layers. Nothing resolves business → citizen.

**Extraction — what's usable:**

- **The loop is half-built, and the missing half already has a signal → close the write-back, don't invent a mechanism.** `runCareerEngine` already emits `careerSignals.businessDeltas` and `careerSignals.layoffs`; `economicRippleEngine` already consumes both (v2.5, per-business ripples; `MAJOR_LAYOFFS` at 3+ in a cycle). That signal currently produces *narrative ripples only* — nothing writes back to `Employee_Count`. The hire/fire mechanism is one consumer away, not a new engine.
- **Headcount is the coupling variable → make it causal, not decorative.** Mike's rule: a business at 100 that drops to 90 while 93 are tracked means **3 get fired**. Headcount movement is the input; firings and hires are the output; the tracked sample is where those land. That single rule turns `Employee_Count` from a label into a fate-driver, which is the universal-protagonism test.
- **`Generic_Citizens` needs an employer column before "born into a job" is expressible → schema first, behaviour second.** The feeder pool carries `Occupation` but no `EmployerBizId`, so today a promoted citizen arrives with a job title and no workplace. Mike's constraint — *no citizen is ever born into a business we don't track* — cannot be enforced until the column exists.
- **Age-18 transition is an unclaimed seam → the ladder from youth to payroll.** Kids turning 18 should take tracked jobs. `educationCareerEngine` owns career progression and already reads `EconomicProfileKey`/`EmployerBizId`; the transition needs a rule, not a new engine.
- **Media invention should mint a business → the newsroom becomes an economic actor.** When an article names a business, that name becomes canon; canon should become a `Business_Ledger` row that tracked citizens can then be employed by. This is the same pattern as S334's civic establishments (initiatives → `BIZ-00094..00098`) and it closes a real leak: invented businesses currently exist only in prose.
- **Row completeness is the precondition for all of it → 23% of businesses cannot participate.** A business with no `Employee_Count` cannot hire, fire, or be checked against the tracked sample. Filling the economic columns is not tidying; it is what makes those 23 rows eligible to be part of the economy.

- **Career field is ALREADY tracked — the gap is the matcher, not the data (S335).** Mike flagged that citizens' skill/career field needs tracking for laid-off workers to be rehired in their own field. It exists: `EconomicProfileKey` on the citizen row resolves through `data/economic_parameters.json` (198 role profiles) to a `category` — 15 of them, `Tech & Innovation` through `The Vulnerable` — plus an `economicOutputCategory`. So the taxonomy is there and every employed citizen already sits in a field. Three things are genuinely missing: (a) the category is derived by JSON lookup rather than stored on the row, so nothing can ask "who works in tech" without the join; (b) **no matcher** takes a fired citizen and finds a same-field employer; (c) **"opening" is not expressible** — and it cannot be `stated − tracked`, because stated is real headcount against a 1:443 sample. A hiring signal has to come from somewhere else, most plausibly `Growth_Rate`.
- **A mass layoff is a story, not just a correction (Mike-direct S335).** If a business must shed tracked citizens to satisfy its headcount, that is front-page material — 35 people leaving one employer in a cycle is the largest single economic event the sim could produce. The firings should surface as a headline and the displaced should then be rehired into same-field openings. This is the clearest case yet of a ledger column driving a fate and a fate driving coverage.

- **Skill tags belong ALONGSIDE `RoleType`, not instead of it → measured, S335 (Mike's proposal).** Mike's idea: make the citizen's capabilities a tag set — Vinnie Keane as `#OaklandA #3B #DH #philanthropist #media` — so that when he retires from the A's he can take a media job because he carries `#media` and a media business has an opening. The idea is right and it resolves two open findings at once. **But repurposing `RoleType` would break two layers**, which is why it must be an added column:
  - `data/role_mapping.json` holds **296 exact RoleType strings** keyed to economic profiles, read as `roleMapping[roleType.trim()]` by `lib/economicLookup.js`, `scripts/aggregateNeighborhoodEconomics.js`, `scripts/applyEconomicProfiles.js` and the resolver twice. A tag string misses all 296 keys, so every citizen loses their economic profile — income, wealth and employer resolution with it.
  - `phase05-citizens/generateCitizensEvents.js` builds `"occupation:" + roleType` into event tags, and `phase02-world-state/loadEventContentLedger.js` matches `occupation` as an **exact, case-insensitive string** for content selection. Tags there would emit `occupation:#OaklandA #3B #DH`, breaking content matching and leaking hashtags into prose.
  So: `RoleType` keeps its job — the current title, human-readable, prose-facing, exact-keyed. A new multi-valued column carries capability.
- **A tag set dissolves the `RoleType` vs `EconomicProfileKey` contradiction (engine.87) rather than adjudicating it.** The 18 disagreements — a Janitor keyed Environmental Consultant, a Server keyed Insurance Agent — are only contradictions because one field must win. As tags they are both true: a man can be employed as a janitor and *trained* as an environmental consultant, and that is a more interesting citizen than either field alone. The question stops being "which is canon" and becomes "current job vs transferable skill", which is the distinction the sim actually needs.
- **Separate the three kinds of thing Mike's example mixes.** `#OaklandA` is an **affiliation**, already held by `EmployerBizId`. `#3B #DH` are **positions**, already in `As_Roster.Position` for players. `#philanthropist` is an **identity**. `#media` is a **transferable field** — and that last kind is the only one that does work for rehiring. A tag vocabulary that does not distinguish affiliation from capability will match a retired ballplayer to a job at the club he just left.

**Not applicable / hazard:**

- **Size `Employee_Count` to the institution, not to the sample (Mike-direct S335).** The positive form of the rule below. "The A's should represent what a baseball franchise would be, not just what I'm tracking." A figure anchored to the tracked count with padding is the same error in a smaller coat — it just fails the tracked>stated test instead of failing it obviously. Build the number from the org: an MLB club is a 40-man roster plus a farm system plus coaches, scouts, front office and medical (~520); an NBA club is smaller because there is no deep farm system (~250); a ballpark's full-time core excludes seasonal game-day staff (~110). The tracked sample should sit far BELOW the real figure, and how far below is not a defect.
- **Never invent employees to fill a headcount.** `Simulation_Ledger` is a ~1:443 qualitative sample. DigitalOcean legitimately employs 800 with 3 tracked. The only illegal state is tracked > stated (Mike-direct S334). A write-back that "corrects" headcount toward the tracked count destroys the real figure — that is exactly what `linkCitizensToEmployers` did until S334 (engine.84), leaving 11 businesses with fossilised sample counts (AC Transit stating 4, Oakland Unified 24, the Port 28).
- **Firing is a life event, not a spreadsheet correction.** If headcount movement fires 3 tracked citizens, those citizens lived that — it belongs in `LifeHistory`, their dials, and potentially the paper. A silent `EmployerBizId` blanking would be the sim losing an event it actually generated.
- **Do not let the resolver re-run undo lived state.** `--fill-blanks-only` exists because the career engine's hires are truth. Any write-back mechanism must compose with that, not fight it.
- **Media-minted businesses need a canon gate.** An invented business becoming a ledger row is powerful and cheap to abuse — a desk agent hallucinating a name would mint economic canon. Route through the same review that `docs/canon/INSTITUTIONS.md` governs.

**Verdict:** `adopt`. The direction is settled and the substrate mostly exists; what is missing is the write-back consumer, one schema column, and completeness on 23 rows. Feeds the existing repair plan rather than igniting a rival one — the repair closes the static defects, this defines the living system the repair is preparing for.

**Ignited plans:** [[../plans/2026-07-26-employment-reconciliation]] — extends it. The static repair (Tasks 1–9) is the precondition; the living-system work is a later phase in the same plan or a successor once the rows are clean.

---

## Applications (living)

- 2026-07-27 — Initial extraction (S335). Written from the engine.83 repair work; supplies the "why" behind completing `Business_Ledger` rows and the hire/fire rule that makes headcount causal.

---

## Changelog

- 2026-07-27 — Initial extraction (S335). Measured all four employment tables; found the career-engine hire/fire signal already exists and only lacks a write-back consumer.
