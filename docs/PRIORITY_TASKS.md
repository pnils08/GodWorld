# Priority Task List

**Created:** 2026-02-02
**Updated:** 2026-02-08
**Status:** Active tracking document

---

## Completed Work (Tier 7)

All Tier 7 core features have been implemented. See TIER_7_ROADMAP.md for details.

| Tier | Feature | Status | Version |
|------|---------|--------|---------|
| 7.0 | OpenClaw integration foundation | Complete | Phase 11 |
| 7.1 | Ripple system (initiative → neighborhood) | Complete | v1.5 |
| 7.2 | Neighborhood micro-economies | Complete | v2.3 |
| 7.3 | Citizen life path evolution | Complete | v1.2 |
| 7.4 | Continuity threading | Complete | OpenClaw-side |

### Completed: Journalist Matching & Media Integration (2026-02-06)

| Task | Status | Version |
|------|--------|---------|
| Journalist persona enrichment (25 profiles) | Done | bay_tribune_roster.json v2.0 |
| rosterLookup.js voice profile functions | Done | v2.0 |
| findJournalistsByTheme_() | Done | v2.1 |
| getThemeKeywordsForDomain_() | Done | v2.1 |
| suggestStoryAngle_() — scoring-based matching | Done | v2.1 |
| matchCitizenToJournalist_() — archetype matching | Done | v2.2 |
| Theme-aware hook generation (storyHook.js) | Done | v3.8 |
| Voice-matched story seeds (applyStorySeeds.js) | Done | v3.9 |
| POP-ID article index (326 citizens, 367 articles) | Done | — |
| Agent Newsroom architecture plan | Done | docs/AGENT_NEWSROOM.md |
| Echo removal (never a real publication) | Done | — |

### Completed: Consumer Wiring (2026-02-06)

| Task | Description | Status |
|------|-------------|--------|
| Wire matchCitizenToJournalist_ | Section 14 citizen spotlight journalist recommendations | Done (v2.6) |
| Briefing Section 17: Voice Profiles | getFullVoiceProfile_() for priority-assigned journalists | Done (v2.6) |
| Enhanced Section 13 | openingStyle + themes detail lines on desk assignments | Done (v2.6) |

### Completed: Bug Fixes & Dashboard (2026-02-07)

| Task | Description | Status |
|------|-------------|--------|
| Bond persistence fix | saveV3BondsToLedger_ wired into V2/V3, loadRelationshipBonds_ added to V3 | Done |
| Dashboard v2.1 | 7 cards, 28 data points — Calendar, World Pulse, Civic, Bonds | Done (v2.1) |
| .claspignore fix | lib/** excluded — prevented require() error from lib/sheets.js | Done |

### Completed: Media Room & Tooling (2026-02-08)

| Task | Description | Status |
|------|-------------|--------|
| Media Room Handoff Guide | Structured workflow replacing ad-hoc process, 96% data reduction | Done (docs/MEDIA_ROOM_HANDOFF.md) |
| Cycle 78 Handoff compiled | 15KB compiled from 402KB raw — demonstrates new format | Done (/tmp/HANDOFF_C78.txt) |
| Media Briefing deep analysis | 17 sections mapped, redundancy/noise scored, dedup recommendations | Done |
| PROJECT_GOALS.md rewrite | MCP-based stack replaces OpenClaw, subscription optimization | Done |
| Supermemory plugin setup | Claude Code plugin installed, project config set | Done (needs Pro sub) |
| Subscription optimization plan | Apple markup identified ($49/mo savings), browser ext canceled | Done |

### Previously Completed (Tier 7 / Bug Fixes)

| Task | Status |
|------|--------|
| VoteRequirement date parsing bug | Done (v1.6) |
| Faction whitespace trim | Done (v1.6) |
| Bug #7: ss vs ctx parameter mismatch | Done |
| Math.random() → ctx.rng() | Done (v1.5) |
| Ripple consumer function created | Done (v1.5) |
| Delayed status handling | Done (v1.5) |
| OpenClaw integration doc | Done |
| AutoGen integration doc | Done (superseded by Agent Newsroom) |
| _legacy/ folder cleanup | Done |
| GitHub Actions linting | Done |

---

## Remaining Tasks

### Priority 1: Media Room & Handoff Automation

| Task | Description | Status |
|------|-------------|--------|
| Build compileHandoff() script | GAS function to automate handoff compilation from sheets | Not started |
| Use HANDOFF_C78 for Edition 78 | Test compiled handoff in actual Media Room session | Not started |
| Fix Media Briefing continuity dedup | Engine-side fix to collapse duplicate continuity notes | Not started |
| Filter Priority 1 seeds in engine | Stop generating filler seeds ("Barbecue smoke rises") | Not started |

### Priority 2: Testing & Validation

| Task | Description | Status |
|------|-------------|--------|
| Integration testing | Run 5+ cycles with all Tier 7 systems active | Not started |
| Verify ripple decay | Confirm neighborhood effects decay as expected | Not started |
| Verify economic triggers | Test 22 economic trigger types | Not started |

### Priority 3: Subscription & Tooling

| Task | Description | Status |
|------|-------------|--------|
| Supermemory Pro subscription | $19/mo — unblocks codebase indexing + MCP memory | Pending (test free credits first) |
| Cancel Apple Claude subscription | Expires 2/16 — re-subscribe direct at claude.ai for $100/mo | Pending (2/16) |
| claude.ai MCP connector | Connect Supermemory to Media Room web sessions | Not started |

### Priority 4: Tech Debt (from AUDIT_TRACKER.md)

| Task | File | Status |
|------|------|--------|
| Hardcoded Spreadsheet ID | utilityFunctions.js (centralized) | Done (v2.14) |
| Missing Null/Undefined Checks | 272 instances (22 fixed in top 3 files) | Partially done — Phase 7 files deferred |

### Priority 5: Optional Enhancements

| Task | Description | Status |
|------|-------------|--------|
| Sports Integration | Trigger hooks, crowd effects, briefing display | Done (v3.9/v2.6) |
| Engine-side continuityHints | Populate recurringCitizens for buildContinuityHints_ | Done (v1.0) |
| PolicyDomain column | Sheet schema, seed data, demographic influence | Done (v1.6) |
| Dashboard v2.1 | Calendar, World Pulse, Civic, Bonds cards + formatting | Done (v2.1) |

---

## Future Projects (Deferred to Tier 8+)

| Project | Notes |
|---------|-------|
| City Memory / Epigenetics | Needs stable Tier 7 first |
| Shock Cascades | Ripple system handles basics |
| Branching Story Arcs | Enhancement, not urgent |
| Agent Newsroom (Claude Agent SDK) | See docs/AGENT_NEWSROOM.md — replaces AutoGen plan |

---

## Progress Summary

| Category | Completed | Remaining |
|----------|-----------|-----------|
| Tier 7 Features | 5/5 | 0 |
| Journalist Matching & Media | 11/11 | 0 |
| Consumer Wiring | 3/3 | 0 |
| Media Room & Tooling | 6/6 | 0 |
| Media Room Automation | 0/4 | 4 |
| Subscription & Tooling | 0/3 | 3 |
| Testing | 0/3 | 3 |
| Tech Debt | 0/2 | 2 (low priority) |
| Optional | 0/3 | 3 |

**Next Actions:**
1. Build `compileHandoff()` script (automate handoff compilation)
2. Test HANDOFF_C78 in actual Media Room session for Edition 78
3. Integration testing — run 5+ cycles with all systems active
