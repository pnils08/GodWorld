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

### Completed: Edition 78 Parallel-Agent Production (2026-02-08)

| Task | Description | Status |
|------|-------------|--------|
| Download citizen ledgers from Drive | 9 files (792KB) via googleapis service account | Done |
| Compile HANDOFF_C78 editorial brief | 15KB structured brief from 402KB raw exports | Done |
| Write Edition 78 with parallel agents | 5 desk agents (Civic, Sports, Chicago, Faith, Letters) | Done |
| Editorial compilation + canon correction | Fixed 5 wrong names, 1 position, 1 spurious character | Done |
| Full engine returns | Article Table, Storylines, Usage Log, Continuity Notes | Done (editions/cycle_pulse_edition_78.txt) |
| Validate parallel-agent workflow | compileHandoff → desk agents → compile → correct → returns | Done — production model confirmed |

### Completed: Edition 78 Canon Fixes & Verification Workflow (2026-02-06)

| Task | Description | Status |
|------|-------------|--------|
| Fix Edition 78 canon errors | 5 A's names, Seymour backstory, vote narrative (Crane/Tran swap), 4th-wall engine language | Done |
| Add canon reference to handoff spec | Section 14 in MEDIA_ROOM_HANDOFF.md — auto-extracted from ARTICLE_INDEX, ledgers, roster | Done |
| Add editorial verification workflow | Compile → Verify split, verification agent spec, no-engine-metrics rule | Done (MEDIA_ROOM_HANDOFF.md) |
| Upgrade Rhea Morgan to verification agent | Canon cross-reference, vote audit, engine-metric sweep | Done (AGENT_NEWSROOM.md) |
| Add "do not invent" rule to desk agent prompts | Canon reference input + explicit rules against fabrication | Done (AGENT_NEWSROOM.md) |

### Completed: Media Intake Pipeline Repair (2026-02-06)

| Task | Description | Status |
|------|-------------|--------|
| Consolidate intake processors | Deleted processMediaIntake.js (v2.1), mediaRoomIntake.js v2.3 is sole processor | Done |
| Fix Phase 11 wiring | Removed dead ctx.mediaOutput condition — Phase 11 always runs processMediaIntake_(ctx) | Done |
| Fix continuity parser | Bold markdown headers, pipe table compound notes, cleanSubsectionName_ fix | Done (v1.4) |
| Wire Press_Drafts as consumer | Section 9B PREVIOUS COVERAGE in briefing generator reads cycle N-1 drafts | Done |
| Update handoff doc | Bold headers accepted, source versions updated | Done |

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
| Build compileHandoff() script | GAS function to automate handoff compilation from sheets | Done (v1.0) |
| Repair media intake pipeline | Consolidate processors, fix Phase 11, fix parser, wire Press_Drafts | Done (v2.3/v1.4) |
| Feed Edition 78 returns to engine | Paste into MediaRoom_Paste → parseMediaRoomMarkdown() → processMediaIntakeV2() | Ready — pipeline repaired, needs `clasp push` + test |
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
| Edition 78 Production | 6/6 | 0 |
| Media Intake Pipeline | 5/5 | 0 |
| Media Room Automation | 2/5 | 3 (feed returns, dedup, seed filter) |
| Subscription & Tooling | 0/3 | 3 |
| Testing | 0/3 | 3 |
| Tech Debt | 0/2 | 2 (low priority) |
| Optional | 0/3 | 3 |

**Next Actions:**
1. `clasp push` + test media intake pipeline with Edition 78 data
2. Feed Edition 78 returns back to engine (pipeline repaired, ready to run)
3. Run Cycle 79 — verify Phase 11, briefing Sections 9 + 9B
4. Integration testing — run 5+ cycles with all systems active
5. Activate Supermemory Pro after subscription sort (2/16)
