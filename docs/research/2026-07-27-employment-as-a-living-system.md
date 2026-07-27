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
  - "[[../engine/archive/ROLLOUT_PLAN]] — pending-state home (engine.83, engine.84)"
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

**Not applicable / hazard:**

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
