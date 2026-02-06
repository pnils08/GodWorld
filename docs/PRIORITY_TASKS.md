# Priority Task List

**Created:** 2026-02-02
**Updated:** 2026-02-06
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

### Consumer Wiring (Not Yet Done)

| Task | Description | Status |
|------|-------------|--------|
| Wire matchCitizenToJournalist_ | Connect to media briefing or story seed consumers | Not started |
| Briefing Section 17: Voice Profiles | Add getFullVoiceProfile_() output to media briefings | Not started |
| Enhanced Section 13 | Add openingStyle + themes to reporter assignments | Not started |

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

### Priority 1: Testing & Validation

| Task | Description | Status |
|------|-------------|--------|
| Integration testing | Run 5+ cycles with all Tier 7 systems active | Not started |
| Verify ripple decay | Confirm neighborhood effects decay as expected | Not started |
| Verify economic triggers | Test 22 economic trigger types | Not started |

### Priority 2: Tech Debt (from AUDIT_TRACKER.md)

| Task | File | Status |
|------|------|--------|
| Hardcoded Spreadsheet ID | godWorldEngine2.js + 15 files | Waiting on schema approval |
| Missing Null/Undefined Checks | 272 instances | Low priority - address during V3 |

### Priority 3: Optional Enhancements

| Task | Description | Status |
|------|-------------|--------|
| Sports Integration | Add trigger columns to Sports_Feed | Not started |
| Engine-side continuityHints | Populate hints array in export | Optional |
| PolicyDomain column | Add to Initiative_Tracker | Optional (falls back to keyword detection) |

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
| Consumer Wiring | 0/3 | 3 |
| Testing | 0/3 | 3 |
| Tech Debt | 0/2 | 2 (low priority) |
| Optional | 0/3 | 3 |

**Next Action:** Wire consumer integrations (matchCitizenToJournalist_, briefing voice profiles, section 13 enhancements), then integration testing.
