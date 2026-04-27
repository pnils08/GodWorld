---
title: Engine Repair Tracker
created: 2026-04-16
updated: 2026-04-27
type: plan
tags: [engine, citizens, active]
sources:
  - SESSION_CONTEXT.md (S148 audit findings — Next Session Priority)
  - docs/engine/tech_debt_audits/2026-04-15.md
  - docs/engine/tech_debt_audits/2026-04-27.md
  - docs/engine/LEDGER_REPAIR.md
  - S166 /pre-mortem for C92 (items 12, 13, 14)
  - S181 /tech-debt-audit §6 closure (items 15, 16)
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
| 1 | Promotion pipeline typo — generator writes `CreatedCycle`, sheet has `EmergedCycle`. 11 promotions in 91 cycles. | done | S181 | S148 audit; S181 verification | Closed S181 — `phase05-citizens/generateGenericCitizens.js:58,495` renamed `iCreatedCycle` → `iEmergedCycle` (matched live Generic_Citizens schema col H) and value format aligned with `checkForPromotions.js:511` (`"Cycle " + cycle`). `utilities/cycleRollback.js:55` Generic_Citizens cycleCol fixed to `EmergedCycle`. Chicago_Citizens kept on `CreatedCycle` (verified col H of live schema). Note: the "11 promotions in 91 cycles" stat is about promotion frequency — separate from this column-name typo. |
| 2 | Supermemory `world-data` citizen cards cross-contaminated; MCP `lookup_citizen` reads poisoned data. | todo | — | S148 audit | — |
| 3 | Simulation_Ledger corruption flagged S68 — `LEDGER_REPAIR.md` claims S94 recovery complete. Confirm or reopen. | done | S181 | `docs/engine/LEDGER_AUDIT.md` §"Current State — S181 refresh" | Closed S181 — verified live state against S94 closure claims. 0 missing names, 0 historical "Citizen" roles, all tiers numeric, age sanity holds (0 OOB on 2041 anchor). 4 new "Citizen" roles are post-S94 drift (Row 17). Audit tool: `scripts/auditSimulationLedger.js`. Boot blocker text in `.claude/hooks/session-startup-hook.sh:132` updated to reflect post-recovery reality. |

## P1 — Simulation depth (the sim doesn't simulate)

| # | Issue | Status | Session | Evidence | Fix pointer |
|---|-------|--------|---------|----------|-------------|
| 4 | Lifecycle engines stamp identical defaults on 600+ citizens (YearsInCareer=12.5, DebtLevel=2, NetWorth=0, MaritalStatus=single, NumChildren=0, etc.) | todo | — | S148 audit | — |
| 5 | Citizen generator name clusters — 62 first / 53 last names for 686 citizens. Dupe check misses first-name clustering. | todo | — | S148 audit | — |
| 6 | EventType taxonomy collapsed to `misc-event` — Phase 38.8 baseline briefs can't attribute events to citizens. | todo | — | S146 open items; S148 audit | — |
| 15 | `citizenFameTracker.js` silently no-ops because expected columns absent from live tabs — `headers.indexOf('FameScore'/'Notoriety'/'MediaMentions'/'LastMentionedCycle'/'FameTrend'/'PromotionCandidate'/'PromotionScore'/'PromotionReason')` all return -1. Function logs `"FameScore column not found. Run migration first."` (line 365-367) and returns. Affects Simulation_Ledger (47 cols A–AU, no fame columns), Generic_Citizens (10 cols A–J, no fame), Chicago_Citizens (10 cols A–J, no fame). Cultural_Ledger has FameScore (col L) ✓ but uses `MediaCount`/`TrendTrajectory` not `MediaMentions`/`FameTrend` → partial drift. Fame tracking has been dead for many cycles. | todo | — | S181 audit `docs/engine/tech_debt_audits/2026-04-27.md` §6 Class 2 | Decision needed — re-add columns to citizen ledgers OR remove the tracker. Don't leave the silent no-op in production. |

## P2 — Architecture integrity

| # | Issue | Status | Session | Evidence | Fix pointer |
|---|-------|--------|---------|----------|-------------|
| 7 | 4 live `Math.random()` fallbacks — determinism violation. Flagged 2026-03-28. | done | S156 | `docs/engine/tech_debt_audits/2026-04-15.md` | Closed by `76a408c` (documented 4) + `af40282` (55-site sweep → `safeRand_(ctx)`) |
| 8 | 38 undocumented direct sheet writers / 197 call sites. | todo | — | `docs/engine/tech_debt_audits/2026-04-15.md` | Phase 42 — Writer Consolidation (ROLLOUT_PLAN) |
| 9 | 78 orphaned `ctx.summary` / `S.` writes. | done | S156 (reclassified) | `docs/engine/tech_debt_audits/2026-04-15.md` + `2026-04-27.md` §3 | Not a bug — `utilities/exportCycleArtifacts.js` serializes the entire `ctx.summary` every cycle (`JSON.parse(JSON.stringify(S))` → Drive `cycle-<N>-summary.json`), and `phase10-persistence/buildCyclePacket.js` consumes most of it for the cycle packet. Every orphan field IS read, just by bulk serialization not per-field reference. Audit methodology codified in `/tech-debt-audit` skill so future passes don't rediscover it. |
| 12 | `utilities/utilityFunctions.js:29,36,53` — `pickRandom_`, `pickRandomSet_`, `maybePick_` use `Math.random` on cycle path (reference-pass). Callers: `godWorldEngine2.js`, `buildCityEvents.js`, `buildNightLife.js`, `buildEveningMedia.js`, `buildEveningFood.js`, `buildEveningFamous.js`, `sportsStreaming.js`, `generateChicagoCitizensv1.js`. Shipped through every prior cycle. Missed by `af40282` sweep (invocation-only grep). | done | S180 | S166 /pre-mortem C92 | Closed S180 — three helpers take `rng` parameter and throw if missing (matches S156 phase05 generateChicagoCitizen_ pattern). 8 caller sites updated to pass `rng`. Side-fix: `getChicagoOccupation_` was un-seeded (silent bug); now threads `rng`. |
| 13 | SCHEMA_HEADERS full alignment diff never run — 2026-04-15 export happened two days *before* the Phase 38/39/40 write-intent changes in later S147/S148/S156 commits. Unknown whether any new write-intent columns drifted from sheet headers. | done | S181 | S166 /pre-mortem C92 §4 | Closed S181 — schema regenerated via new `scripts/regenSchemaHeaders.js` (Apps Script API-executable path unavailable, fell back to local Node + service account per engine.md rule). Live-sheet diff harmless (2 new tabs, 1 column-shrink, all without engine references). Code-side diff surfaced 3 classes of real drift now tracked as items 15, 16 + Class 3 doc cleanup. See `docs/engine/tech_debt_audits/2026-04-27.md` §6. |

## P3 — Specific bugs

| # | Issue | Status | Session | Evidence | Fix pointer |
|---|-------|--------|---------|----------|-------------|
| 10 | Temescal initiative stuck 88 cycles — crude date-string parse in Phase 38.1. | done | S181 | S148 audit; S181 verification via live `Initiative_Tracker` inspect | Closed S181 — `scripts/engine-auditor/detectStuckInitiatives.js:49-51` cold-start fallback was passing `row.LastUpdated` (a date-string `"4/21/2026"`) to `parseCycleHint(/C?(\d+)/i)`, which matched the month digit `4` and computed `cyclesInState = 92 − 4 = 88` for every initiative. Temescal got named because it was narratively load-bearing; bug affected all 6 active initiatives uniformly. Replaced with `parseCycleHint(row.VoteCycle)` — VoteCycle is an actual cycle number column (78/80/82/etc.), not a timestamp. Smoke-tested with C92 fixture: INIT-001=14, INIT-005 Temescal=12, INIT-007 (empty VoteCycle, announced phase) correctly filtered out. NextActionCycle dropped from the fallback — it's forward-looking and the `<= cycle` guard rejected it anyway. |
| 11 | Pipeline never gated production — /sift, Rhea, desk verification, Phase 39 reviewer lanes never ran on real editions. E89/E90/E91 hand-assembled. | todo | — | S148 audit | — |
| 14 | Non-canonical neighborhood strings used as first-class (not mapped): `Eastlake`, `San Antonio`, `Glenview`, `Ivy Hill`, `Coliseum`, `Elmhurst`. Hits in `phase03-population/updateNeighborhoodDemographics.js:234`, `phase05-citizens/generationalWealthEngine.js:90`, `phase05-citizens/bondEngine.js:112-113`, `phase05-citizens/updateCivicApprovalRatings.js:110-115`, `phase08-v3-chicago/v3NeighborhoodWriter.js:38,188-192,333`. Either the skill's 17-canonical list is stale, or these paths write to ghost neighborhoods. `phase05-citizens/checkForPromotions.js:191-199` has a mapping table that normalizes some → canonical; other sites skip it. | done | S180 | S166 /pre-mortem C92 §5 | Closed S180 — root cause was the `/pre-mortem` skill's hardcoded 17-list (Downtown / Piedmont / Montclair / etc.) that didn't match either Simulation_Ledger (canon-12 where citizens live) OR Neighborhood_Map (17 fine-grained where world-state lives). Engine code itself is correct under parent-child ontology (canon-12 parents ← fine-grained children, mapping at checkForPromotions.js:190-209). Fix: SKILL.md §5 rewritten to recognize both layers as canonical; child names like Eastlake/San Antonio no longer flag as non-canonical. Folds in the engine-review C92 baseline-brief finding (same root cause). |
| 16 | `Advancement_Intake` / `Advancement_Intake1` tabs both missing from live spreadsheet — `phase05-citizens/processAdvancementIntake.js:260-262` falls back from `Advancement_Intake1` → `Advancement_Intake` → silent return `if (!intakeSheet) return results;`. Also referenced by `phase07-evening-media/mediaRoomIntake.js:537-538` (same fallback chain). Pipeline non-functional until at least one tab exists. Different from `Continuity_Intake` / `Election_Log` which lazy-create themselves; advancement intake silently drops. | done | S181 | S181 audit `docs/engine/tech_debt_audits/2026-04-27.md` §6 Class 1 | Closed S181 — lazy-create added on the writer side at `phase07-evening-media/mediaRoomIntake.js:539-544` (matches `continuityNotesParser.js:73` pattern). Inserts `Advancement_Intake1` with 10-col header (`First, Middle, Last, RoleType, Tier, ClockMode, CIV, MED, UNI, Notes`) when neither tab exists. Reader path (`processAdvancementIntake.js:262`) keeps its silent-return — correct no-op when nothing has been routed yet. |
| 17 | Post-S94 RoleType="Citizen" drift — 4 of 13 post-S94 citizens have the literal string "Citizen" as RoleType (POP-00794 Irene Fay, POP-00795 Marisol Trujillo, POP-00798 Grace Yamamoto, POP-00801 Maurice Franklin). Same anti-pattern S94 fixed (399 cases). Root cause: `phase05-citizens/processAdvancementIntake.js:296` defaults to `'Citizen'` when intake row's RoleType cell is empty (`var roleType = iRoleType >= 0 ? (row[iRoleType] || 'Citizen') : 'Citizen';`). All 4 are T4 ENGINE, all also missing EducationLevel — same intake path doesn't backfill demographic fields. | todo | — | S181 audit `docs/engine/LEDGER_AUDIT.md` §"Current State" | Two paths: (a) reject intake rows with empty RoleType (force the upstream writer in `mediaRoomIntake.js` to compute a real role first), or (b) keep the default but make it a demographic-voice role drawn from the same pool S94 used (longshoremen, teachers, herbalists, sourdough bakers, etc.) so new generic citizens look like population, not placeholders. Either way the literal "Citizen" should never appear on the live ledger. Backfill the 4 existing rows once the writer is fixed. |

---

## Log

(Brief one-line entries when a row changes status. Date + session + item # + what moved.)

- 2026-04-16 S152 — tracker created. All 11 items `todo`.
- 2026-04-19 S166 — item 7 marked `done` (closed by `76a408c` + `af40282`); items 12, 13, 14 added from /pre-mortem C92.
- 2026-04-26 S180 — item 12 marked `done`. Three helpers (`pickRandom_`, `pickRandomSet_`, `maybePick_`) now take `rng` parameter and throw if missing; 8 caller sites updated; `getChicagoOccupation_` un-seeded silent bug fixed.
- 2026-04-26 S180 — item 14 marked `done`. Two-layer ontology surfaced: canon-12 parents (Simulation_Ledger, where citizens live) ← fine-grained children (Neighborhood_Map, world-state buckets). Engine code already correct; root cause was `/pre-mortem` SKILL §5's hardcoded 17-list that didn't match either layer. SKILL.md §5 rewritten + version bumped 1.1 → 1.2. Folds engine-review C92 baseline-brief finding (same root cause).
- 2026-04-26 S180 end — item 13 tagged for **NEXT ENGINE-SHEET SESSION (S181 entry-task)** per Mike at session close. Run `/tech-debt-audit` §4 + regenerate `schemas/SCHEMA_HEADERS.md` via `exportAllHeaders()` + diff write-intent column sets.
- 2026-04-27 S181 — item 13 marked `done`. Schema regenerated via new `scripts/regenSchemaHeaders.js` (Apps Script API-executable path unavailable). Live-sheet diff harmless. Code-side diff surfaced 2 production silent-failure paths now tracked as items 15 + 16, plus 5 stale engine.md docstring entries (Class 3, doc-only). Audit doc: `docs/engine/tech_debt_audits/2026-04-27.md`.
- 2026-04-27 S181 — item 15 added (P1). `citizenFameTracker.js` silently no-ops on Simulation_Ledger / Generic_Citizens / Chicago_Citizens because expected fame columns are absent. Decision needed: re-add columns or retire the tracker.
- 2026-04-27 S181 — item 16 added (P3). `Advancement_Intake` / `Advancement_Intake1` tabs missing; `processAdvancementIntake.js` silent-returns. Pipeline non-functional until pre-created or converted to lazy-create.
- 2026-04-27 S181 — quick-win sweep: items 1, 9, 16 marked `done`. Row 1 — `generateGenericCitizens.js` + `cycleRollback.js` aligned with live Generic_Citizens schema (`EmergedCycle`, not `CreatedCycle`); value format matches `checkForPromotions.js`. Row 9 — reclassified (bulk-serializer consumes ctx.summary; not a bug). Row 16 — lazy-create added in `mediaRoomIntake.js` writer path (10-col header, matches `continuityNotesParser` pattern).
- 2026-04-27 S181 — item 3 marked `done`. S94 LEDGER_REPAIR.md recovery claim verified against live state via new `scripts/auditSimulationLedger.js`. Live: 686 extant citizens, 0 missing names, all tiers numeric, age sanity holds, S94 recovery cohort clean. Snapshot persisted in `docs/engine/LEDGER_AUDIT.md` §"Current State — S181 refresh". Boot blocker text updated in `.claude/hooks/session-startup-hook.sh` to reflect post-recovery reality.
- 2026-04-27 S181 — item 17 added (P1). 4 post-S94 citizens (POP-00794/795/798/801) carry RoleType="Citizen" — same anti-pattern S94 fixed. Root cause: `processAdvancementIntake.js:296` defaults to literal "Citizen" when intake row's RoleType cell is empty. Same intake path leaves EducationLevel + Gender empty for new citizens. Decision needed: reject empty RoleType upstream OR replace default with demographic-voice role draw.
- 2026-04-27 S181 — item 10 marked `done`. `detectStuckInitiatives.js` cold-start fallback was misparsing the `LastUpdated` date-string as a cycle (regex matched the month digit). Switched fallback to `VoteCycle` — which is a real cycle number. Smoke-tested with C92 fixture: realistic cyclesInState values (Temescal=12, Stabilization=14, etc.) instead of uniform 88.
