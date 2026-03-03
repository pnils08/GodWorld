# GodWorld Completed Enhancements & Deferred Plans

**Archived from SESSION_CONTEXT.md on 2026-02-12 (Session 20)**

This file contains completed enhancement tracking and planned upgrades that are not yet approved. Moved here to keep SESSION_CONTEXT.md focused on current state.

---

## Planned Upgrade: Tier-Aware Life Events for GAME Citizens

### Problem
GAME-mode citizens (A's, Bulls, media, civic, public figures) only receive events from
`generateGameModeMicroEvents.js`. SIM citizens get events from ~14 engines. This means
GAME citizens like Vinnie Keane have barely any life history — their lore is 100% dependent
on user-written content from the media room.

### Design Intent
Every engine should impact citizens. Life events should correlate with the world state.

### Rules
1. **No video game content auto-populates.** Contract negotiations, game results, trades,
   anything tied to A's/Bulls gameplay — the user provides that. This engine covers their
   life OUTSIDE the video game.
2. **Neighborhood matters.** All citizen events should factor in the neighborhood they live in
   (already listed per citizen). Tier 1 citizens get events tied to their local area.
3. **World state correlation.** Events must align with current conditions — no "took a walk"
   during a rainy week. Weather, transit, faith events, and other engine outputs should
   influence what life events are generated.
4. **Tier-based event types:**
   - **Tier 1** (highly visible public figures): Local figure events — attended concerts,
     seen at hot restaurants, neighborhood happenings. The kind of events a public figure
     has in their personal life.
   - **Tier 3-4** (generic citizens): Mainly daily routine events.

### Dependencies
- Restaurant engine output (hot restaurants)
- Weather engine output (rainy week = indoor events)
- Neighborhood data per citizen
- Event/concert calendar or world events output
- Tier classification per citizen

### Status
Design concept only. NOT approved for implementation. Requires explicit user approval before
any code is written.

---

## Current Work / Next Steps

(Update this section each session)

**Priority Task List:** See `docs/engine/PRIORITY_TASKS.md` for ordered task list

**Summary:**
1. v1.5/v1.6 bug fixes mostly complete
2. **COMPLETE**: Tier 7.1 (Ripple System) - wired into engine Phase 6, next civic vote Cycle 80
3. OpenClaw deferred — replaced by MCP-based stack (Supermemory + Agent Newsroom + cron)
4. **COMPLETE**: Agent Newsroom implemented — 7 permanent agents + 8 skills in Claude Code (supersedes Agent SDK plan). See docs/media/AGENT_NEWSROOM.md
5. POP-ID article index available for media continuity checks
6. **COMPLETE**: Journalist personas enriched (v2.0) - 25 full voice profiles ready
7. **COMPLETE**: rosterLookup.js enhanced (v2.1) - theme matching, voice profiles
8. **COMPLETE**: Theme-aware hook generation (storyHook.js v3.8)
9. **COMPLETE**: Voice-matched story seeds (applyStorySeeds.js v3.9)
10. **COMPLETE**: Consumer wiring — briefing v2.6 (Section 13 enhanced, Section 14 wired, Section 17 voice profiles)
11. **COMPLETE**: Sports Integration — trigger hooks, crowd effects, briefing display
12. **COMPLETE**: buildMediaPacket.js v2.4 — voice guidance on seeds/hooks
13. **COMPLETE**: Engine-side continuityHints — computeRecurringCitizens v1.0, wired Phase 6
14. **COMPLETE**: PolicyDomain column — sheet schema, seed data, demographic influence all wired
15. **PARTIAL**: Tech debt null checks — 22 fixes in civicInitiativeEngine, bondEngine, economicRippleEngine
16. **COMPLETE**: Bond persistence fix — saveV3BondsToLedger_ wired into V2/V3, loadRelationshipBonds_ added to V3
17. **COMPLETE**: Dashboard v2.1 — 7 cards, 28 data points (Calendar, World Pulse, Civic, Bonds)
18. **COMPLETE**: .claspignore fix — lib/** excluded to prevent require() error
19. **COMPLETE**: Media Room Handoff Guide — structured workflow, 96% data reduction, quality standards from Edition 77
20. **COMPLETE**: PROJECT_GOALS.md rewrite — MCP-based stack replaces OpenClaw, subscription optimization documented
21. **PENDING**: Supermemory Pro subscription ($19/mo) — blocks codebase indexing
22. **PENDING**: Apple Claude subscription migration — cancel expires 2/16, re-subscribe direct ($49/mo savings)

23. **COMPLETE**: Edition 78 written by parallel agents — 6 articles + 3 letters, 14 citizens quoted, 4 new canon figures
24. **VALIDATED**: Parallel-agent newsroom workflow — compileHandoff → 5 desk agents → editorial compilation → engine returns
25. **COMPLETE**: Edition 78 canon fixes — 5 A's names, Seymour backstory, vote narrative (Crane/Tran), 4th-wall engine language
26. **COMPLETE**: Editorial verification workflow — canon reference in handoff (Section 14), compile→verify split, Rhea as verification agent, no-engine-metrics rule
27. **COMPLETE**: compileHandoff.js v1.0 — automated 14-section handoff compiler, menu integration, Drive export, ~310KB→30KB
28. **COMPLETE**: Media intake pipeline repair — consolidated processors, fixed Phase 11 wiring, parser bold header + pipe table fixes, Press_Drafts wired to briefing Section 9B
29. **COMPLETE**: processMediaIntake.js DELETED — function name collisions resolved, mediaRoomIntake.js v2.3 is sole processor

30. **COMPLETE**: extractCitizenNames_ name collision fix — renamed to extractHandoffCitizenNames_ in compileHandoff.js
31. **COMPLETE**: editions/ folder — Cycle Pulse editions moved out of docs/
32. **COMPLETE**: Cycle Pulse Template v1.1 — standardized structure, canon rules, article lengths, journalist assignments
33. **COMPLETE**: Time & Canon Addendum v2.0 — dual-clock rewrite, A's-in-Arizona, desk-specific rules, players-as-citizens
34. **COMPLETE**: Media Room Style Guide v1.0 — replaces MEDIA_ROOM_INSTRUCTIONS v2.0, Paulson canon, live presser system, data humanization
35. **COMPLETE**: Edition 78 media intake processed — 12 articles, 68 storylines, 119 citizen usages, 109 continuity notes
36. **COMPLETE**: Deploy & test — name collision fixed, clasp pushed, parseMediaRoomMarkdown() runs clean
37. **COMPLETE**: Media Room Style Guide v1.1 — Mara Vance section (in-world role, directives), editorial chain (Mara→Mags→Rhea→Desks), Rhea upgraded to Data Analyst, 7-agent architecture confirmed
38. **COMPLETE**: Cycle Pulse Template updated — Rhea Morgan role updated to Data Analyst
39. **COMPLETE**: Mara Vance docs saved to `docs/mara-vance/` — 3 files updated to current architecture, Engine Room Introduction dropped
40. **COMPLETE**: Docs reorganized into subfolders — reference/, engine/, media/, mara-vance/, archive/. 21 files moved, 40+ cross-references updated, .gitignore fixed.
41. **COMPLETE**: Exclude "proposed" initiatives from handoff — Mara controls when initiatives are revealed to the newsroom
42. **COMPLETE**: Paulson pressers saved to repo — Cycle 70 Chicago presser, Cycle 73 Oakland presser (both have full engine returns)
43. **COMPLETE**: Paulson Carpenter's Line backstory saved to `docs/media/PAULSON_CARPENTERS_LINE.md` — family canon (Lars, Maureen, brothers, Shannon-Romano descendants)

44. **COMPLETE**: updateTransitMetrics.js v1.1 — Phase 2 event timing, double-counting, dayType, null safety
45. **COMPLETE**: faithEventsEngine.js v1.1 — simMonth fix, namespace collision prevention
46. **COMPLETE**: generateGameModeMicroEvents.js v1.3 — write-intents conversion, namespace collision prevention
47. **COMPLETE**: Transit + faith story signals wired into Phase 6 orchestrator (V2 + V3)
48. **NOTED**: mulberry32_ defined in 10 files — consolidation needed (utilities/rng.js)
49. **COMPLETE**: Citizen intake routing — mediaRoomIntake.js v2.5, routeCitizenUsageToIntake_() wired into Phase 11, 297 backlogged citizens cleared on first run
50. **COMPLETE**: CYCLE_PULSE_TEMPLATE v1.3 — journalists byline tracking only, not citizen usage/advancement

51. **COMPLETE**: Desk Packet Pipeline v1.0-1.1 — buildDeskPackets.js replaces compileHandoff.js, per-desk JSON packets from 16 sheets, 7-stage pipeline documented
52. **COMPLETE**: Edition 79 v2 — written with desk packet pipeline, Mara Vance audit corrections applied (863 lines, Warriors/Giannis trade front page)
53. **COMPLETE**: editionIntake.js v1.0 — Node.js CLI for parsing editions into intake sheets
54. **COMPLETE**: processIntake.js v1.1 — Node.js CLI for intake → final ledgers, calendar from Cycle_Packet, demographic extraction, explicit column ranges
55. **COMPLETE**: Business strategy documented in BRANCH_HANDOFF.md — 5 revenue paths, Wix blueprint, subscription serial playbook, Wreck-It Ralph sandbox concept
56. **COMPLETE**: Tier-aware life events design concept documented (GAME citizens getting full engine events)
57. **COMPLETE**: All reference docs updated — PROJECT_GOALS, PRIORITY_TASKS, ENGINE_ROADMAP, TIER_7_ROADMAP brought current to Cycle 79
58. **COMPLETE**: Desk Agent Pipeline — 6 permanent agents (.claude/agents/) with deep journalist profiles, 7 skills (.claude/skills/) for orchestration, /write-edition master pipeline
59. **COMPLETE**: buildDeskPackets.js output path → output/desk-packets/ (was /tmp/), output/ in .gitignore
60. **COMPLETE**: BAY_TRIBUNE_JOURNALIST_PROFILES.pdf integrated — evolved personality profiles for Mags, Luis, Anthony, P Slayer, Hal, Selena, Talia, Carmen, Lila, Trevor, Maria, Jordan, Elliot Graye baked into agents
61. **COMPLETE**: Rhea Morgan permanent verification agent — .claude/agents/rhea-morgan/, 7-point check against POPID index + CITIZENS_BY_ARTICLE + canon sources
62. **COMPLETE**: 5 docs updated for agent newsroom — AGENT_NEWSROOM (full rewrite), DESK_PACKET_PIPELINE (paths), PROJECT_GOALS (implemented), STYLE_GUIDE (v1.2), PRIORITY_TASKS (Session 13 section)
63. **COMPLETE**: buildDeskPackets.js v1.1 — reporter history (full Press_Drafts bibliography per reporter) + citizen archive (POPID index parsed into per-desk filtered archives, capped at 10 articles, canon-aware name extraction)

**Next Actions (Session 18):**

1. **DEPLOY bond seeding fix**: `clasp push` seedRelationBondsv1.js v1.1. Relationship_Bonds should populate (~500 bonds) on next engine run.

2. **Canon resolution: Deacon Seymour vs Mike Kinder** — base_context lists Mike Kinder as A's Manager, all articles reference Deacon Seymour. Needs definitive canon call before C81.

3. **Clean Carmen's roster entry** in `bay_tribune_roster.json` — still has engine language in samplePhrases/themes ("Civic load", "Peak game-day traffic registered at 0.72").

4. **Beverly Hayes intro descriptor** — Maria Keen's culture article drops her cold without identifying who she is. Needs "community director at the West Oakland Neighbors Association" on first reference.

5. **Wire Jax Caldera into /write-edition** — currently manual deployment only. Consider deployment router (when to use Jax vs Carmen/Luis).

6. **CONSIDER: compileHandoff.js cleanup** — Superseded by buildDeskPackets.js. Still in GodWorld Exports menu.

7. **TECH DEBT: mulberry32_ consolidation** — 10 copies across codebase → utilities/rng.js

8. Activate Supermemory Pro after subscription sort (2/16)

64. **COMPLETE**: Supermemory engaged — 13 memory entries saved (world state, canon, editorial, business strategy, engine architecture, edition history). Free tier active, 3m tokens/month.
65. **ESTABLISHED**: Session workflow — search Supermemory at start, save summary at end. Mirrors SESSION_CONTEXT.md updates.
66. **AVAILABLE**: Chrome v144 + Xvfb virtual display on :99 (1920x1080) for visual verification tasks.
67. **COMPLETE**: Cycle 80 engine run — Summer, SummerFestival, overcast, elevated pattern, mid-season sports. All 11 phases complete.
68. **COMPLETE**: Edition 80 v3 — canon-corrected final (B+ grade). Vote math 6-2 correct, phantoms grounded (Beverly Hayes, Elena Rivera), wiffleball continuity fixed, Crane absent. File: `editions/cycle_pulse_edition_80_v3.txt`.
69. **ROLLED BACK then REPLACED**: Edition 80 intake — original 285 bad rows removed (Session 15). New intake from v3: 121 rows (12 articles, 13 storylines, 72 citizens, 24 quotes). Dupes from double-run cleaned (225 rows).
70. **FIXED**: editionIntake.js v1.1 → v1.2 — auto-detects cycle + double-dash prefix parsing fixed for storylines, citizens, and quotes. Was silently dropping all citizen/storyline intake.
71. **FIXED**: processIntake.js v1.2 — auto-detects cycle from Cycle_Packet, fixes stale calendar issue.
72. **FIXED**: seedRelationBondsv1.js v1.1 — bonds stored in ctx.summary.relationshipBonds instead of direct sheet write. Root cause of 0 bonds across 80 cycles. Needs `clasp push`.
73. **FIXED**: World_Population ghost row deleted — blank row 3 removed, sheet clean (header + current + history).
74. **COMPLETE**: Agent pipeline overhaul — 5 commits across Sessions 15-16 (cfc0ed2 mechanical, fc03c0b deep rewrite, 9e4887e Grok, 50e62d9 Code Pilot, 3182f5d Jax). PREWRITE blocks, number classification, publication gate, citizen authorization checks all added.
75. **FIXED**: buildDeskPackets.js v1.1 → v1.2 — buildRecentOutcomes returns full objects with voteBreakdown from Notes column. buildPendingVotes includes budget/notes/initiativeId. Root cause of vote count errors in editions.
76. **CREATED**: Jax Caldera freelance accountability agent — `.claude/agents/freelance-firebrand/SKILL.md`. Manual deployment only.
77. **FIXED**: Simulation_Ledger — POP-00576 (Beverly Hayes, West Oakland), POP-00617 (Elena Rivera, West Oakland). Titles removed from first name fields.
78. **MERGED**: "Autonomous Newsroom" concept from Claude Code app → `BRANCH_HANDOFF.md`. Engine-to-agent mapping, journalism AI research, dual-identity market positioning. Review in Session 18 for agent pipeline improvements.
79. **DISASTER RECOVERY (Session 18, 2026-02-11)**: Claude violated Rule #1 (READ DOCS FIRST), built 1,500 lines of Phase 8 civic code without checking existing civicInitiativeEngine.js (v1.6, 2155 lines). Ran `git reset --hard origin/main` which deleted 6 uncommitted utility files (36 hours work): canon_check.js, gdrive_fetch.js, gdrive_fetch2.js, CLAUDE_AI_SYSTEM_PROMPT.md, cleanup_storyline_tracker.js, delete-continuity-tabs.js. All recovered from dangling commit 0ca22d1, committed as 41492b2.
80. **CREATED (Session 18)**: `/session-startup` skill (`.claude/skills/session-startup/SKILL.md`) — Structured documentation loading protocol with checklist to prevent assumption-based disasters. Requires reading SESSION_CONTEXT.md, README.md, V3_ARCHITECTURE.md, DEPLOY.md, searching supermemory, and searching existing code BEFORE building features.

---

## Completed Enhancements: Journalist Roster Integration

*Originally planned 2026-02-05, implemented 2026-02-06*

### Implemented (Session 1, 2026-02-06)

| Item | Status | Location |
|------|--------|----------|
| `findJournalistsByTheme_(theme)` | **Done** | rosterLookup.js v2.1 |
| `suggestStoryAngle_(eventThemes, signalType)` | **Done** | rosterLookup.js v2.1 |
| Theme-aware hook generation | **Done** | storyHook.js v3.8 |
| Voice-matched story seeds | **Done** | applyStorySeeds.js v3.9 |

### Implemented (Session 3, 2026-02-06)

| Item | Status | Location |
|------|--------|----------|
| `matchCitizenToJournalist_()` | **Done** | rosterLookup.js v2.2, wired in briefing Section 14 |
| Briefing Section 17: VOICE PROFILES | **Done** | mediaRoomBriefingGenerator.js v2.6 |
| Enhanced Section 13 | **Done** | mediaRoomBriefingGenerator.js v2.6 |

### Implemented (Session 3, continued, 2026-02-06)

| Item | Status | Location |
|------|--------|----------|
| `buildMediaPacket.js` voice guidance | **Done** | buildMediaPacket.js v2.4, Section 7 |
