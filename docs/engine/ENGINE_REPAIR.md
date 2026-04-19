---
title: Engine Repair Tracker
created: 2026-04-16
updated: 2026-04-19
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
| 12 | `utilities/utilityFunctions.js:29,36,53` — `pickRandom_`, `pickRandomSet_`, `maybePick_` use `Math.random` on cycle path (reference-pass). Callers: `godWorldEngine2.js`, `buildCityEvents.js`, `buildNightLife.js`, `buildEveningMedia.js`, `buildEveningFood.js`, `buildEveningFamous.js`, `sportsStreaming.js`, `generateChicagoCitizensv1.js`. Shipped through every prior cycle. Missed by `af40282` sweep (invocation-only grep). | todo | S166 | S166 /pre-mortem C92 | Thread `ctx` into the three helpers → use `safeRand_(ctx)`; update 8 callers. Low blast radius — pure utilities. |
| 13 | SCHEMA_HEADERS full alignment diff never run — 2026-04-15 export happened two days *before* the Phase 38/39/40 write-intent changes in later S147/S148/S156 commits. Unknown whether any new write-intent columns drifted from sheet headers. | todo | S166 | S166 /pre-mortem C92 §4 | Run `/tech-debt-audit` Section 4 (header diff) + regenerate `schemas/SCHEMA_HEADERS.md` via `exportAllHeaders()` + diff write-intent column sets. |

## P3 — Specific bugs

| # | Issue | Status | Session | Evidence | Fix pointer |
|---|-------|--------|---------|----------|-------------|
| 10 | Temescal initiative stuck 88 cycles — crude date-string parse in Phase 38.1. | todo | — | S148 audit | — |
| 11 | Pipeline never gated production — /sift, Rhea, desk verification, Phase 39 reviewer lanes never ran on real editions. E89/E90/E91 hand-assembled. | todo | — | S148 audit | — |
| 14 | Non-canonical neighborhood strings used as first-class (not mapped): `Eastlake`, `San Antonio`, `Glenview`, `Ivy Hill`, `Coliseum`, `Elmhurst`. Hits in `phase03-population/updateNeighborhoodDemographics.js:234`, `phase05-citizens/generationalWealthEngine.js:90`, `phase05-citizens/bondEngine.js:112-113`, `phase05-citizens/updateCivicApprovalRatings.js:110-115`, `phase08-v3-chicago/v3NeighborhoodWriter.js:38,188-192,333`. Either the skill's 17-canonical list is stale, or these paths write to ghost neighborhoods. `phase05-citizens/checkForPromotions.js:191-199` has a mapping table that normalizes some → canonical; other sites skip it. | todo | S166 | S166 /pre-mortem C92 §5 | Reconcile the canonical list: decide which of the 6 non-canonical names are real buckets vs. should map to the 17. Update the skill file and/or add mappings. |

---

## Log

(Brief one-line entries when a row changes status. Date + session + item # + what moved.)

- 2026-04-16 S152 — tracker created. All 11 items `todo`.
- 2026-04-19 S166 — item 7 marked `done` (closed by `76a408c` + `af40282`); items 12, 13, 14 added from /pre-mortem C92.
