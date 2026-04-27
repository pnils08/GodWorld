---
title: Engine Repair Tracker
created: 2026-04-16
updated: 2026-04-26
type: plan
tags: [engine, citizens, active]
sources:
  - SESSION_CONTEXT.md (S148 audit findings — Next Session Priority)
  - docs/engine/tech_debt_audits/2026-04-15.md
  - docs/engine/LEDGER_REPAIR.md
  - S166 /pre-mortem for C92 (items 12, 13, 14)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — strategic phases; this tracker is tactical repairs"
  - "[[engine/LEDGER_REPAIR]] — read before touching ledger"
---

# Engine Repair Tracker

Working list of known engine/simulation issues. One row per issue. Pointers only — no
exposition. Update status as work moves. Source findings: S148 audit
(SESSION_CONTEXT.md), `docs/engine/tech_debt_audits/2026-04-15.md`.

**Status legend:** `todo` · `wip` · `done` · `blocked` · `deferred`

---

## P0 — Foundation (blocks everything downstream)

| # | Issue | Status | Session | Evidence | Fix pointer |
|---|-------|--------|---------|----------|-------------|
| 1 | Promotion pipeline typo — generator writes `CreatedCycle`, sheet has `EmergedCycle`. 11 promotions in 91 cycles. | todo | — | S148 audit | — |
| 2 | Supermemory `world-data` citizen cards cross-contaminated; MCP `lookup_citizen` reads poisoned data. | todo | — | S148 audit | — |
| 3 | Simulation_Ledger corruption flagged S68 — `LEDGER_REPAIR.md` claims S94 recovery complete. Confirm or reopen. | todo | — | ACTIVE BLOCKER in boot; S148 audit | `docs/engine/LEDGER_REPAIR.md` |

## P1 — Simulation depth (the sim doesn't simulate)

| # | Issue | Status | Session | Evidence | Fix pointer |
|---|-------|--------|---------|----------|-------------|
| 4 | Lifecycle engines stamp identical defaults on 600+ citizens (YearsInCareer=12.5, DebtLevel=2, NetWorth=0, MaritalStatus=single, NumChildren=0, etc.) | todo | — | S148 audit | — |
| 5 | Citizen generator name clusters — 62 first / 53 last names for 686 citizens. Dupe check misses first-name clustering. | todo | — | S148 audit | — |
| 6 | EventType taxonomy collapsed to `misc-event` — Phase 38.8 baseline briefs can't attribute events to citizens. | todo | — | S146 open items; S148 audit | — |

## P2 — Architecture integrity

| # | Issue | Status | Session | Evidence | Fix pointer |
|---|-------|--------|---------|----------|-------------|
| 7 | 4 live `Math.random()` fallbacks — determinism violation. Flagged 2026-03-28. | done | S156 | `docs/engine/tech_debt_audits/2026-04-15.md` | Closed by `76a408c` (documented 4) + `af40282` (55-site sweep → `safeRand_(ctx)`) |
| 8 | 38 undocumented direct sheet writers / 197 call sites. | todo | — | `docs/engine/tech_debt_audits/2026-04-15.md` | Phase 42 — Writer Consolidation (ROLLOUT_PLAN) |
| 9 | 78 orphaned `ctx.summary` / `S.` writes. | todo | — | `docs/engine/tech_debt_audits/2026-04-15.md` | — |
| 12 | `utilities/utilityFunctions.js:29,36,53` — `pickRandom_`, `pickRandomSet_`, `maybePick_` use `Math.random` on cycle path (reference-pass). Callers: `godWorldEngine2.js`, `buildCityEvents.js`, `buildNightLife.js`, `buildEveningMedia.js`, `buildEveningFood.js`, `buildEveningFamous.js`, `sportsStreaming.js`, `generateChicagoCitizensv1.js`. Shipped through every prior cycle. Missed by `af40282` sweep (invocation-only grep). | done | S180 | S166 /pre-mortem C92 | Closed S180 — three helpers take `rng` parameter and throw if missing (matches S156 phase05 generateChicagoCitizen_ pattern). 8 caller sites updated to pass `rng`. Side-fix: `getChicagoOccupation_` was un-seeded (silent bug); now threads `rng`. |
| 13 | SCHEMA_HEADERS full alignment diff never run — 2026-04-15 export happened two days *before* the Phase 38/39/40 write-intent changes in later S147/S148/S156 commits. Unknown whether any new write-intent columns drifted from sheet headers. | todo — **NEXT ENGINE-SHEET SESSION** (S181 entry-task, parked end of S180 per Mike) | S166 (queued S180) | S166 /pre-mortem C92 §4 | Run `/tech-debt-audit` Section 4 (header diff) + regenerate `schemas/SCHEMA_HEADERS.md` via `exportAllHeaders()` + diff write-intent column sets. |

## P3 — Specific bugs

| # | Issue | Status | Session | Evidence | Fix pointer |
|---|-------|--------|---------|----------|-------------|
| 10 | Temescal initiative stuck 88 cycles — crude date-string parse in Phase 38.1. | todo | — | S148 audit | — |
| 11 | Pipeline never gated production — /sift, Rhea, desk verification, Phase 39 reviewer lanes never ran on real editions. E89/E90/E91 hand-assembled. | todo | — | S148 audit | — |
| 14 | Non-canonical neighborhood strings used as first-class (not mapped): `Eastlake`, `San Antonio`, `Glenview`, `Ivy Hill`, `Coliseum`, `Elmhurst`. Hits in `phase03-population/updateNeighborhoodDemographics.js:234`, `phase05-citizens/generationalWealthEngine.js:90`, `phase05-citizens/bondEngine.js:112-113`, `phase05-citizens/updateCivicApprovalRatings.js:110-115`, `phase08-v3-chicago/v3NeighborhoodWriter.js:38,188-192,333`. Either the skill's 17-canonical list is stale, or these paths write to ghost neighborhoods. `phase05-citizens/checkForPromotions.js:191-199` has a mapping table that normalizes some → canonical; other sites skip it. | done | S180 | S166 /pre-mortem C92 §5 | Closed S180 — root cause was the `/pre-mortem` skill's hardcoded 17-list (Downtown / Piedmont / Montclair / etc.) that didn't match either Simulation_Ledger (canon-12 where citizens live) OR Neighborhood_Map (17 fine-grained where world-state lives). Engine code itself is correct under parent-child ontology (canon-12 parents ← fine-grained children, mapping at checkForPromotions.js:190-209). Fix: SKILL.md §5 rewritten to recognize both layers as canonical; child names like Eastlake/San Antonio no longer flag as non-canonical. Folds in the engine-review C92 baseline-brief finding (same root cause). |

---

## Log

(Brief one-line entries when a row changes status. Date + session + item # + what moved.)

- 2026-04-16 S152 — tracker created. All 11 items `todo`.
- 2026-04-19 S166 — item 7 marked `done` (closed by `76a408c` + `af40282`); items 12, 13, 14 added from /pre-mortem C92.
- 2026-04-26 S180 — item 12 marked `done`. Three helpers (`pickRandom_`, `pickRandomSet_`, `maybePick_`) now take `rng` parameter and throw if missing; 8 caller sites updated; `getChicagoOccupation_` un-seeded silent bug fixed.
- 2026-04-26 S180 — item 14 marked `done`. Two-layer ontology surfaced: canon-12 parents (Simulation_Ledger, where citizens live) ← fine-grained children (Neighborhood_Map, world-state buckets). Engine code already correct; root cause was `/pre-mortem` SKILL §5's hardcoded 17-list that didn't match either layer. SKILL.md §5 rewritten + version bumped 1.1 → 1.2. Folds engine-review C92 baseline-brief finding (same root cause).
- 2026-04-26 S180 end — item 13 tagged for **NEXT ENGINE-SHEET SESSION (S181 entry-task)** per Mike at session close. Run `/tech-debt-audit` §4 + regenerate `schemas/SCHEMA_HEADERS.md` via `exportAllHeaders()` + diff write-intent column sets.
