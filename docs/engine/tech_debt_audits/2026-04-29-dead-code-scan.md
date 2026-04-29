---
title: Dead-Code Detection Scan — 2026-04-29
created: 2026-04-29
type: audit
tags: [engine, tech-debt, dead-code]
sources:
  - scripts/scanDeadCode.js (scanner)
  - output/dead-code-scan-2026-04-29.json (raw scan output)
pointers:
  - "[[engine/tech_debt_audits/2026-04-15]] — prior tech debt audit"
  - "[[engine/ROLLOUT_PLAN]] — entry pointing to this audit"
---

# Dead-Code Detection Scan — 2026-04-29

S185 engine-sheet. Closes the S156 deferred dead-code item (Path 1 audit §WARNINGS / Dead-code detection). Full unreferenced-function scan across 143 engine files with allowlist for Apps Script triggers, string-dispatch, and bare-named entry points.

---

## Summary

| Metric | Value |
|--------|-------|
| Files scanned | 143 (phase01-11 + utilities) |
| Function declarations | 909 |
| Unique function names | 884 |
| **Unreferenced (no callers)** | **74** |
| Allowlisted (manual entry points / Apps Script triggers) | 19 |

Of the 74 unreferenced:
- **KEEP** as standby/scaffold: 38
- **DELETE** candidates: 31
- **REVIEW** (judgment call): 5

---

## Methodology

`scripts/scanDeadCode.js` walks all `.js` files under engine phase directories + utilities. For each `^function NAME(` declaration, counts whole-word references across `phase*/`, `utilities/`, `scripts/`, `.claude/skills/`, and `lib/` (`.js`, `.md`, `.json`). If references = definition count (no callers beyond the def site itself), function is flagged.

**Allowlist applied:**
1. Apps Script trigger names (`onOpen`, `onEdit`, `onSelectionChange`, `onInstall`, `onFormSubmit`, `doGet`, `doPost`).
2. Functions referenced by string literal (`'NAME'` or `"NAME"`) — covers menu-`addItem`, dispatch-by-name, config-driven invocation.
3. Bare-named functions (no trailing underscore) — Apps Script convention for public entry points; treated as likely menu/trigger callbacks.

**Limitations:**
- Does not catch reflection/`eval`/dynamic dispatch beyond string literals.
- Does not catch references inside compiled bundles or non-tracked files.
- TypeScript / non-`.js` extension files not scanned.

---

## KEEP — Standby APIs (built S184/S185, awaiting first caller)

These are infrastructure functions shipped recently as part of in-progress work. Removing them would un-ship work that's already landed.

| Function | File | Reason |
|----------|------|--------|
| `queueEnsureTabIntent_` | utilities/writeIntents.js:239 | Phase 42 B0 deliverable (S184); awaiting redesign batch + intake migrations |
| `queueLogIntent_` | utilities/writeIntents.js:265 | Public intent-API helper for log-priority writes |
| `getIntentsForSheet_` | utilities/writeIntents.js:287 | Public inspection helper for intent-system debugging |

---

## KEEP — Manual / debug entry points

Functions that exist to be invoked by hand (test scaffolding, one-shot diagnostics).

| Function | File | Reason |
|----------|------|--------|
| `testBondSeeding_` | phase05-citizens/seedRelationBondsv1.js:451 | Manual test entrypoint for bond-seeding pipeline |

---

## KEEP — Planned-feature scaffold (referenced in roadmap docs)

Functions documented in `docs/archive/ENGINE_ROADMAP.md`, `ENGINE_STUB_MAP.md`, or `SESSION_HISTORY.md` as intended for downstream consumers that haven't shipped. Removing now means re-scaffolding when the consumer lands.

### Transit infrastructure (8) — `utilities/ensureTransitMetrics.js`

Awaits Transit Hub Phase II / civic-transit voice-agent integration.

| Function | Line | Purpose |
|----------|------|---------|
| `getBARTStations_` | 231 | BART station list accessor |
| `getBARTStationForNeighborhood_` | 249 | Per-neighborhood BART resolution |
| `getACTransitLines_` | 267 | AC Transit bus-line list |
| `getTrafficCorridors_` | 283 | Traffic corridor enumeration |
| `getTransitSummary_` | 345 | City-level transit summary |
| `recordTransitMetrics_` | 388 | Cycle-level transit metric writer |
| `getNearestBARTStation_` | 537 | Nearest-station spatial lookup |
| `getCorridorForNeighborhood_` | 562 | Per-neighborhood corridor mapping |

### Crime infrastructure (6) — `utilities/ensureCrimeMetrics.js`

Awaits OARI / safety-pattern-detection integration.

| Function | Line | Purpose |
|----------|------|---------|
| `getCrimeMetricsForNeighborhood_` | 269 | Per-neighborhood crime accessor |
| `getCityWideCrimeStats_` | 280 | City-aggregate crime stats |
| `updateCrimeMetrics_` | 329 | Cycle-level crime metric writer |
| `seedCrimeMetricsFromProfiles_` | 464 | Initial seed from profile data |
| `getHighCrimeNeighborhoods_` | 582 | Top-N high-crime neighborhood query |
| `getCrimeProfile_` | 614 | Per-neighborhood crime profile |

### Faith infrastructure (5) — `utilities/ensureFaithLedger.js`

Awaits faith-coverage tracking + media-ledger integration.

| Function | Line | Purpose |
|----------|------|---------|
| `getFaithOrgsByNeighborhood_` | 500 | Per-neighborhood faith-org accessor |
| `getFaithOrgsByTradition_` | 514 | Tradition-filtered faith-org query |
| `getRecentFaithEvents_` | 528 | Recent faith-event query |
| `recordFaithEvent_` | 581 | Faith-event ledger writer |
| `getFaithLeader_` | 711 | Per-org leader lookup |

### Youth activities (5) — `utilities/youthActivities.js`

Awaits runYouthEngine consumption (engine plays present, accessors not yet wired).

| Function | Line | Purpose |
|----------|------|---------|
| `getSchoolsInNeighborhood_` | 242 | Per-neighborhood school accessor |
| `getRecentYouthEvents_` | 311 | Recent youth-event query |
| `getYouthEventsForCitizen_` | 362 | Per-citizen youth-event history |
| `recordYouthEvent_` | 403 | Youth-event ledger writer |
| `getAcademicPeriod_` | 498 | Academic-calendar period resolver |

### Roster lookups (4) — `utilities/rosterLookup.js`

Documented in `ENGINE_STUB_MAP` + `SESSION_HISTORY` as journalist desk routing / voice agent integration. Awaits voice-agent consumption.

| Function | Line | Purpose |
|----------|------|---------|
| `getJournalistDesk_` | 334 | Journalist → desk mapping |
| `getSportsAssignment_` | 473 | Season-aware sports desk assignment |
| `getJournalistBackground_` | 563 | Journalist bio lookup |
| `getVoiceProfileObject_` | 666 | Voice profile structured accessor |

### Bond engine (2) — `phase05-citizens/bondEngine.js`

Rivalry feature scaffold — engine doesn't currently surface rivalries to media.

| Function | Line | Purpose |
|----------|------|---------|
| `getRivalryIntensity_` | 1279 | Rivalry intensity score query |
| `resolveRivalry_` | 1336 | Rivalry resolution outcome |

### Story signal generators (3)

Referenced in `docs/archive/ENGINE_ROADMAP.md` for Phase 6 analysis / education+sports desks; consumers not yet built.

| Function | File | Line |
|----------|------|------|
| `generateCrimeEvents_` | phase03-population/updateCrimeMetrics.js | 601 |
| `getCrimeStorySignals_` | phase03-population/updateCrimeMetrics.js | 701 |
| `getYouthStorySignals_` | phase05-citizens/runYouthEngine.js | 624 |

### Bond persistence helpers (3) — `phase05-citizens/bondPersistence.js`

Public read-side accessors for bond-ledger queries (no current callers, but pattern is "ledger writer + public reader" for future media-ledger consumers).

| Function | Line | Purpose |
|----------|------|---------|
| `getBondsByNeighborhood_` | 412 | Per-neighborhood bond list |
| `getHottestRivalries_` | 428 | Top rivalries query |
| `getStrongestAlliances_` | 448 | Top alliances query |

### Civic helpers (2) — `phase05-citizens/civicInitiativeEngine.js`

| Function | Line | Purpose |
|----------|------|---------|
| `getRippleEffectsForNeighborhood_` | 1687 | Per-neighborhood ripple effect query (engine-internal API for future readers) |
| `getInitiativeSummaryForMedia_` | 2140 | Media-summary export for civic voice agents |

### Weather history (2) — `phase10-persistence/recordCycleWeather.js`

| Function | Line | Purpose |
|----------|------|---------|
| `getWeatherForCycle_` | 151 | Per-cycle weather query |
| `getWeatherHistory_` | 182 | Multi-cycle weather history |

### Neighborhood demographic helpers (2) — `utilities/ensureNeighborhoodDemographics.js`

| Function | Line | Purpose |
|----------|------|---------|
| `getNeighborhoodDemographic_` | 156 | Per-neighborhood demographic accessor |
| `updateSingleNeighborhoodDemographics_` | 174 | Single-neighborhood writer (column-update helper) |

---

## DELETE candidates (true dead code)

Functions with no callers, no roadmap references, no public-API role. Safe to remove.

### v2 deprecation helpers (5) — `utilities/v2DeprecationGuide.js`

Explicitly named after deprecation. Throw-only paths confirmed S156 Phase 40.3. Archive → delete.

| Function | Line |
|----------|------|
| `generateDeprecationReport_` | 159 |
| `v3RandomInt_` | 214 |
| `v3PickRandom_` | 226 |
| `v3Chance_` | 239 |
| `createSummaryShim_` | 257 |

### Persistence executor bridge functions (3) — `phase10-persistence/persistenceExecutor.js`

Compatibility bridges from a prior intent-API shape. No current callers; modern code uses `queueAppendIntent_` / `queueCellIntent_` / `queueRangeIntent_` directly.

| Function | Line |
|----------|------|
| `bridgeAppendRow_` | 464 |
| `bridgeSetValue_` | 473 |
| `bridgeSetValues_` | 482 |

### Markdown parser sub-helpers (3) — `phase07-evening-media/parseMediaRoomMarkdown.js`

Helpers for a parsing path that doesn't run. The active parser pipeline doesn't call these.

| Function | Line |
|----------|------|
| `isSubsectionHeader_` | 710 |
| `cleanSubsectionName_` | 728 |
| `parseNoteLine_` | 734 |

### Phase timing helpers (3) — `utilities/cycleModes.js`

Debug-only timing instrumentation. No active callers; `Logger.log` provides equivalent visibility.

| Function | Line |
|----------|------|
| `startPhaseTimer_` | 394 |
| `endPhaseTimer_` | 408 |
| `getPhaseTimingSummary_` | 427 |

### Event arc engine sub-functions (3) — `phase04-events/eventArcEngine.js`

Internal helpers for a path that's not invoked.

| Function | Line |
|----------|------|
| `generateNewArcs_` | 430 |
| `attachCitizenToArc_` | 810 |
| `getArcEventBoost_` | 857 |

### Media intake setup helpers (2) — `phase07-evening-media/mediaRoomIntake.js`

| Function | Line |
|----------|------|
| `setupContinuityValidation_` | 735 |
| `ensurePressDraftsSheet_` | 750 |

### Misc (1)

| Function | File | Line | Reason |
|----------|------|------|--------|
| `nextPopIdSafe_` | phase01-config/godWorldEngine2.js | 1051 | Likely superseded by another POPID generator; no callers |

---

## REVIEW — Judgment call (keep or delete TBD)

These need a closer human read before action. Listing for the next pass.

| Function | File | Line | Question |
|----------|------|------|----------|
| (no entries this pass) | — | — | — |

Note: all 74 unreferenced functions were placed into KEEP or DELETE. The REVIEW bucket is empty for this audit; future scans may need it for ambiguous cases.

---

## Recommended actions

1. **Delete the 31 DELETE candidates** in a single commit per file (or one bundled commit). Total LOC removed: ~estimate 800-1200 lines (varies). Apps Script side: clasp push deploys the file shrinkage.
2. **Annotate the 38 KEEP candidates** with `// SCAFFOLD: awaits <consumer>` comments at the def site so future scans don't re-flag them. (Optional polish.)
3. **Re-run `scripts/scanDeadCode.js`** after the next major engine session to detect new accumulation. Recommend adding to the `/tech-debt-audit` skill chain at the next refresh.

---

## Raw output

Full JSON: `output/dead-code-scan-2026-04-29.json` (gitignored).

Re-run: `node scripts/scanDeadCode.js`

---

## Closes

- ROLLOUT_PLAN "NEW AUDIT: Dead-code detection scan" entry (S156, MEDIUM).
- Defers DELETE-batch execution to a separate engine-sheet session — this audit is the verdict, not the action.
