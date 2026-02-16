# GodWorld Project Status

**Single source of truth for what's open, what's done, and what's next.**

Last Updated: 2026-02-16 | Session: 31 | Cycle: 81

---

## Deploy Queue

Items ready to go — just need `clasp push` on Cloud Shell.

| Item | Files | Session | Notes |
|------|-------|---------|-------|
| Phase A calendar cleanup | saveV3Seeds v3.4, v3StoryHookWriter v3.4, v3TextureWriter v3.5, recordWorldEventsv3 v3.5, pressDraftWriter v1.4 | 30 | Stop writing dead calendar columns |
| Bond seeding fix | seedRelationBondsv1.js v1.1 | 24 | Bonds not creating (0 rows after 81 cycles) |
| LifeHistory dead columns | 14 files, 17 write sites | 31 | Stop writing cols F-I |
| recordWorldEventsv3 v3.5 | recordWorldEventsv3.js | 31 | 16 dead cols, Math.random fix, domain neighborhoods |
| compressLifeHistory v1.3 | compressLifeHistory.js | 31 | 14 new TAG_TRAIT_MAP entries |

**Deploy command:** `cd ~/GodWorld && git pull && clasp push`

---

## Active Work

Items in progress or planned for upcoming sessions.

| # | Item | Priority | Status | Deadline |
|---|------|----------|--------|----------|
| 1 | **Run Cycle 82** to validate deployments | HIGH | Blocked by clasp push | After deploy |
| 2 | **LifeHistory archive scheduling** — run `maintenance/archiveLifeHistory.js` | HIGH | Script ready, not scheduled | Before C150 |
| 3 | **LifeHistory compression enforcement** — schedule compressLifeHistory.js regularly | HIGH | Needs scheduling logic | Before C150 |
| 4 | **Gentrification Mechanics & Migration** — extend Neighborhood_Map, integrate with applyMigrationDrift.js | MEDIUM | Planned (Week 4) | No deadline |

---

## Pending Decisions

Items that need a human call before work can proceed.

| # | Item | Options | Blocking |
|---|------|---------|----------|
| 1 | **Wire Jax Caldera into /write-edition** | When to use Jax vs Carmen/Luis for civic desk | Freelance coverage |
| 2 | **Supermemory Pro subscription** ($19/mo) | Activate or skip — unblocks codebase indexing | Memory tooling |
| 3 | **Remove weather columns from sheets** | Delete actual sheet columns (schema change) | Ledger cleanup |
| 4 | **Create BayTribune_Roster sheet** | JSON exists, create in Sheets? | Reporter data access |
| 5 | **compileHandoff.js removal** | Superseded by buildDeskPackets.js — delete? | Code cleanup |

---

## Quick Fixes (Ready to Implement)

Small items with no blockers — can be done in any session.

| # | Item | File | Effort |
|---|------|------|--------|
| 1 | Clean Carmen's roster entry (engine language in samplePhrases) | schemas/bay_tribune_roster.json | 5 min |
| 2 | Fix Media Briefing continuity dedup | mediaRoomBriefingGenerator.js | 30 min |
| 3 | Filter Priority 1 filler seeds ("Barbecue smoke rises") | worldEventsEngine or story seed engine | 30 min |
| 4 | Delete orphaned sheets: Continuity_Loop, Continuity_Intake | Google Sheets | 5 min |
| 5 | Archive World_Drift_Report (write-only, never read) | Google Sheets | 5 min |
| 6 | Delete dead columns from 7 sheets (calendar cols already stopped writing) | Google Sheets | 15 min |

---

## Testing Backlog

Validation work that should happen after deployment.

| # | Test | Scope | Status |
|---|------|-------|--------|
| 1 | **Integration testing** — run 5+ cycles with all Tier 7 systems | Full engine | Not started |
| 2 | **Verify ripple decay** — neighborhood effects decay as expected | economicRippleEngine | Not started |
| 3 | **Verify economic triggers** — test 22 trigger types | economicRippleEngine | Not started |
| 4 | **Validate bond seeding** — confirm bonds appear after v1.1 deploy | seedRelationBondsv1.js | Blocked by deploy |

---

## Tech Debt (Low Priority)

Items that work but could be cleaner. No deadlines.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 1 | **mulberry32_ in 10 files** | Consolidate to utilities/rng.js | LOW |
| 2 | **4 functions >1000 lines** | mediaRoomBriefingGenerator (1452), mediaFeedbackEngine (1340), bondEngine (1271), civicInitiativeEngine (1229) | DEFERRED |
| 3 | **ctx.summary tight coupling** | 40+ fields assumed to exist, no validation | DEFERRED |
| 4 | **Hardcoded holiday lists** | godWorldEngine2.js:331-471, 30+ holidays | DEFERRED |
| 5 | **Float precision drift** | godWorldEngine2.js:315-356, illness/employment rounding | LOW |
| 6 | **Array mutation in loops** | utilities/utilityFunctions.js:16, .splice() while iterating | LOW |

---

## Completed Roadmaps (Archive)

These docs are **done** and no longer need tracking. Kept for reference.

| Document | Status | Notes |
|----------|--------|-------|
| `docs/engine/TIER_7_ROADMAP.md` | **COMPLETE** | All Tier 7 features implemented |
| `docs/engine/CIVIC_INITIATIVE_v1.5_UPGRADE.md` | **COMPLETE** | v1.7 with mayoral veto |
| `docs/media/JOURNALISM_AI_OPTIMIZATIONS.md` | **COMPLETE** (v1.2) | All phases done, Session 31 |
| `docs/engine/ENGINE_ROADMAP.md` | **COMPLETE** (Tiers 1-6) | 2 schema items remain (weather cols, roster sheet) |
| `docs/reference/COMPLETED_ENHANCEMENTS.md` | **ARCHIVE** | Historical record through Session 18 |

---

## Tracking Docs Consolidated

This file replaces the need to check multiple scattered docs. Previous trackers:

| Old Doc | What It Tracked | Status Now |
|---------|----------------|------------|
| `ENGINE_ROADMAP.md` | Tier 1-6 implementation | Complete — 2 schema items captured above |
| `TIER_7_ROADMAP.md` | Tier 7 features | Complete |
| `PRIORITY_TASKS.md` | Active work items | Open items moved here |
| `AUDIT_TRACKER.md` | Technical debt | Open items moved to Tech Debt above |
| `JOURNALISM_AI_OPTIMIZATIONS.md` | Signal intelligence features | Complete |
| `LEDGER_HEAT_MAP.md` | Sheet health + cleanup roadmap | Phase C/D items captured in Active Work above |
| `SESSION_CONTEXT.md` | Current work / next steps | Still maintained per session — this doc is the longer view |

**Rule:** Update this file at session end. Keep it honest — mark things done when they're done, not when they're planned.

---

## Timeline Constraints

| Deadline | Items | Risk |
|----------|-------|------|
| **Before C100** (~19 cycles) | Run LifeHistory archive as preventive measure | LOW — manageable if missed |
| **Before C150** (~69 cycles) | LifeHistory archive + compression enforcement | **HIGH** — LifeHistory_Log will exceed safe size |
| **Before C200** (~119 cycles) | Dead column deletion, resolved initiative archive | MEDIUM — sheet bloat accumulates |

---

*Previous tracking docs remain in place for historical reference but should not be used for active planning. This is the single source of truth.*
