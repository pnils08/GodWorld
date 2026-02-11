# Story & Narrative Enhancement Plan — GodWorld v3

**Created:** 2026-02-11
**Current System:** storyHook.js v3.9, mediaFeedbackEngine.js v2.2
**Approach:** Incremental enhancement (4 weeks, similar to Civic Governance)

---

## 🚀 Implementation Status

| Week | Feature | Status | Deployed | Files |
|------|---------|--------|----------|-------|
| **Week 1** | Citizen Fame & Media Exposure | ✅ **COMPLETE** | 2026-02-11 | Migration: `addCitizenFameColumns.js`<br>Engine: `citizenFameTracker.js` v1.0<br>Integration: `mediaRoomIntake.js` v2.6 |
| Week 2 | Arc Lifecycle Automation | 🔜 Planned | — | — |
| Week 3 | Multi-Citizen Storyline Weaving | 🔜 Planned | — | — |
| Week 4 | Storyline Resolution & Hook Lifecycle | 🔜 Planned | — | — |

**Week 1 Achievements:**
- ✅ 18 columns added (Simulation_Ledger, Generic_Citizens, Chicago_Citizens, Storyline_Tracker)
- ✅ Fame tracking integrated into Phase 11 intake processing
- ✅ Generic_Citizens auto-promotion flagging (3+ mentions)
- ✅ Cross-ledger synchronization (all 4 citizen ledgers)
- ✅ Storyline coverage metrics
- ✅ Full documentation and rollback script

**Deployment Guide:** [WEEK1_DEPLOY.md](../../WEEK1_DEPLOY.md)
**Full Docs:** [WEEK1_CITIZEN_FAME_TRACKING.md](WEEK1_CITIZEN_FAME_TRACKING.md)

---

## Citizen Ledger Architecture

GodWorld uses **4 citizen ledgers** with different purposes:

| Ledger | Purpose | Current Columns | Citizens |
|--------|---------|-----------------|----------|
| **Simulation_Ledger** | Oakland named citizens (Tier 1-3) | 20 | ~500 |
| **Generic_Citizens** | Oakland Tier 4 generic pool | 10 | ~300 |
| **Cultural_Ledger** | Cultural figures, celebrities | 20 | ~50 |
| **Chicago_Citizens** | Chicago satellite citizens | 10 | ~100 |

**Key Differences:**
- **Simulation_Ledger:** Has POPID, TraitProfile, UsageCount, LifeHistory
- **Generic_Citizens:** Name-only, no POPID until promoted
- **Cultural_Ledger:** **Already has FameScore, MediaCount, TrendTrajectory!**
- **Chicago_Citizens:** Has CitizenId, simpler structure

**Promotion Flow:**
```
Generic_Citizens (famous) → Simulation_Ledger (named)
```
When a Generic citizen gains fame/story importance, they get promoted to Simulation_Ledger with a POPID.

---

## Current State Analysis

### ✅ What Already Works Well

**Story Hook Generation (v3.9)**
- 9 trigger types (sports, initiative votes, demographic shifts, etc.)
- Theme-aware journalist matching
- Voice guidance for reporters
- Desk mapping by domain

**Storyline Tracking**
- Storyline_Tracker (14 columns, ~140 active storylines)
- Status: active/resolved/dormant
- Related citizens (comma-separated)
- Priority levels (high/normal/low)
- Seasonal/holiday context

**Arc System**
- Arc_Ledger (16 columns)
- Event_Arc_Ledger (26 columns)
- Arc phases, tension tracking
- Domain tagging

**Media Feedback Loop (v2.2)**
- World events → media coverage
- Neighborhood media profiles
- Holiday-specific amplification
- Calendar-aware narratives

**Citizen History**
- LifeHistory_Log (3,320 rows, 27 columns)
- Event tags, cycle tracking
- Neighborhood context

---

## ❌ What's Missing or Weak

### 1. Citizen Fame/Notoriety Scoring
**Problem:** No quantified fame system. Can't answer "who are the most famous citizens?"

**Missing:**
- No FameScore column on Simulation_Ledger
- No MediaMentions counter (how many articles featured this citizen?)
- No FameDecay (fame fades over time if not reinforced)
- No Notoriety vs. Fame distinction (famous for good vs. bad reasons)

### 2. Arc Lifecycle Automation
**Problem:** Arc statuses are manual. No automatic transitions (opening → building → climax → resolution).

**Missing:**
- No automatic phase advancement based on cycles
- No tension escalation/decay mechanics
- No resolution triggers when linked citizens/events resolve
- Arc status stuck on manual update

### 3. Multi-Citizen Storyline Weaving
**Problem:** RelatedCitizens is a comma list. No relationship mapping or conflict detection.

**Missing:**
- No CitizenRoles (protagonist, antagonist, witness, victim)
- No relationship web visualization prep
- No conflict detection (citizen A in storyline X, citizen B in storyline Y, but they're rivals)
- No automatic cross-storyline hooks when citizens interact

### 4. Storyline Resolution Triggers
**Problem:** Storylines sit on "active" forever. No auto-wrap when narrative completes.

**Missing:**
- No ResolutionCondition (what makes this story "done"?)
- No LastMentionedCycle tracking
- No StaleStoryline detection (>10 cycles without coverage)
- No wrap-up story hook generation

### 5. Media Impact on Citizen Stats
**Problem:** Articles don't affect citizen mood, relationships, or fame beyond LifeHistory_Log.

**Missing:**
- Article about citizen A → FameScore +10
- Negative article → Notoriety +15, Sentiment -0.1
- Rival citizens mentioned together → Relationship tension +5
- No "trending citizen" detection

### 6. Story Hook Staleness
**Problem:** Hooks sit in Story_Hook_Deck forever. No decay or expiration.

**Missing:**
- No HookAge tracking (cycles since generated)
- No priority decay (high priority hook from 10 cycles ago = stale)
- No hook expiration (remove hooks older than 5 cycles)
- No "missed opportunity" tagging

### 7. Citizen Media Exposure Tracking
**Problem:** No visibility into which citizens are overused/underused by media.

**Missing:**
- No MediaMentionCount on Simulation_Ledger
- No LastMentionedCycle
- No MediaSaturation flag (mentioned 5+ times in 10 cycles)
- No "fresh face" prioritization

---

## 📋 Enhancement Plan (4 Weeks)

### Week 1: Citizen Fame & Media Exposure 🌟

**New Columns (Simulation_Ledger) — Oakland Named Citizens:**
- FameScore (0-100) - Overall fame/recognition
- Notoriety (0-100) - Known for negative reasons
- MediaMentions (count) - Total article features
- LastMentionedCycle (number) - Most recent coverage
- FameTrend (enum: rising/stable/fading)
- ActiveStorylines (JSON array) - Storylines this citizen is in
- StorylineRole (text) - Most prominent current role

**New Columns (Generic_Citizens) — Tier 4 Generic Pool:**
- PromotionCandidate (bool) - Flag for promotion to Simulation_Ledger
- PromotionScore (0-100) - Emergence frequency + media potential
- PromotionReason (text) - Why this citizen deserves promotion

**Cultural_Ledger Updates — Already Has FameScore!**
- No new columns needed (already has FameScore, MediaCount, TrendTrajectory)
- Sync existing columns with new mediaFeedbackEngine logic
- Ensure Cultural_Ledger citizens appear in "Trending Citizens" section

**New Columns (Chicago_Citizens) — Chicago Satellite:**
- FameScore (0-100) - Chicago media fame
- MediaMentions (count) - Chicago article features
- LastMentionedCycle (number) - Most recent Chicago coverage
- FameTrend (enum: rising/stable/fading)

**Note:** Cultural_Ledger already tracks fame (FameScore, MediaCount, TrendTrajectory). Week 1 syncs all ledgers to unified fame system.

**New Columns (Storyline_Tracker):**
- LastCoverageycle - When storyline last appeared in edition
- MentionCount - How many articles covered this storyline
- CoverageGap - Cycles since last mention

**Engine Updates:**
- mediaFeedbackEngine.js v2.2 → v2.3
  - applyMediaFameImpact_() - Articles update citizen FameScore **across all ledgers**
  - detectTrendingCitizens_() - Rising fame in last 5 cycles **across all ledgers**
  - flagMediaSaturation_() - Overused citizens **across all ledgers**
  - syncCulturalLedgerFame_() - Align Cultural_Ledger with unified fame system
  - checkGenericPromotions_() - Flag Generic_Citizens ready for named promotion
- mediaRoomBriefingGenerator.js v2.7 → v2.8
  - Add "Trending Citizens" section to briefing (**includes all ledgers**)
  - Fresh face recommendations (low MediaMentions, relevant to hooks, **any ledger**)
  - Promotion candidates (Generic → Simulation_Ledger when fame threshold met)

**Citizen Ledger Processing Order:**
1. Simulation_Ledger (Oakland named citizens)
2. Cultural_Ledger (sync existing FameScore with articles)
3. Chicago_Citizens (Chicago satellite coverage)
4. Generic_Citizens (check for promotion candidates)

**Story Hooks Generated:**
- TRENDING_CITIZEN (severity 5-7): Fame spike detected (any ledger)
- OVEREXPOSED (severity 3): Media saturation warning (any ledger)
- FRESH_FACE (severity 4): Underused citizen with story potential (any ledger)
- PROMOTION_CANDIDATE (severity 4): Generic citizen ready for named promotion

**Fame System Unified Across All Ledgers:**
- Simulation_Ledger: Oakland named citizens (Tier 1-3)
- Generic_Citizens: Oakland generic pool (Tier 4) — promotion tracking
- Cultural_Ledger: Cultural figures (sync with existing FameScore)
- Chicago_Citizens: Chicago satellite citizens

**Total:** 18 new columns (7 Simulation, 3 Generic, 0 Cultural, 4 Chicago, 4 Storyline), 2 engine updates, 4 hook types

---

### Week 2: Arc Lifecycle Automation 🔄

**New Columns (Arc_Ledger):**
- AutoAdvance (bool) - Should this arc auto-progress?
- PhaseStartCycle (number) - When current phase began
- PhaseDuration (number) - Planned cycles for this phase
- NextPhaseTransition (number) - Cycle to advance phase
- TensionDecay (number) - Tension loss per cycle if no events

**New Columns (Event_Arc_Ledger):**
- ResolutionTrigger (enum: manual/citizen_death/initiative_passed/relationship_resolved)
- ResolutionCycle (number) - When arc resolved
- ResolutionNotes (text) - How it wrapped up

**Engine Updates:**
- New file: phase06-analysis/arcLifecycleEngine.js v1.0
  - processArcTransitions_() - Auto-advance phases
  - calculateTensionDecay_() - Reduce tension if no activity
  - detectResolutionTriggers_() - Check completion conditions
  - generateArcWrapHooks_() - Story hooks for resolved arcs

**Arc Phase Flow:**
```
seed (1-2 cycles)
  ↓ auto-advance
opening (2-4 cycles)
  ↓ auto-advance
building (3-6 cycles)
  ↓ tension threshold or event trigger
climax (1-2 cycles)
  ↓ resolution trigger
resolution (1 cycle)
  ↓
closed
```

**Story Hooks Generated:**
- ARC_CLIMAX (severity 8-9): Arc reaching peak tension
- ARC_RESOLUTION (severity 6-7): Arc wrapping up
- ARC_STALLED (severity 4): Arc stuck in building phase >8 cycles

**Total:** 8 new columns, 1 new engine file, 3 hook types

---

### Week 3: Multi-Citizen Storyline Weaving 🕸️

**New Columns (Storyline_Tracker):**
- CitizenRoles (JSON) - `{"POP-123": "protagonist", "POP-456": "antagonist", "CUL-045": "witness"}`
- ConflictType (enum: personal/political/economic/romantic/ideological)
- RelationshipImpact (JSON) - Predicted relationship changes
- CrossStorylineLinks (JSON) - Other storylines with shared citizens

**Citizen Ledger Integration:**
- Uses ActiveStorylines + StorylineRole columns added in Week 1 (Simulation_Ledger, Cultural_Ledger, Chicago_Citizens)
- Generic_Citizens can appear in CitizenRoles by name (triggers promotion if role is protagonist/antagonist)
- Cross-ledger storyline support (e.g., Cultural_Ledger celebrity + Simulation_Ledger citizen in same storyline)

**Engine Updates:**
- New file: phase07-evening-media/storylineWeavingEngine.js v1.0
  - detectCrossStorylineConflicts_() - Citizens in opposing storylines
  - mapRelationshipWeb_() - Build citizen interaction graph
  - generateWeavingHooks_() - Hooks when storylines intersect
  - assignCitizenRoles_() - Auto-assign protagonist/antagonist based on context

**Weaving Logic:**
```
IF citizen A is antagonist in storyline X
AND citizen A is protagonist in storyline Y
AND both storylines active this cycle
THEN generate CROSS_STORYLINE hook (severity 7)
```

**Story Hooks Generated:**
- CROSS_STORYLINE (severity 7): Citizen in multiple active storylines
- RELATIONSHIP_CLASH (severity 6): Rivals both in news this cycle
- ALLIANCE_OPPORTUNITY (severity 5): Allies can team up across storylines

**Note:** Week 3 weaving works across ALL citizen ledgers (Simulation, Cultural, Chicago, Generic). CitizenRoles JSON uses appropriate ID format (POPID, CUL-ID, CitizenId, or name string).

**Total:** 4 new columns (Storyline_Tracker only, citizen columns added in Week 1), 1 new engine file, 3 hook types

---

### Week 4: Storyline Resolution & Hook Lifecycle 🏁

**New Columns (Storyline_Tracker):**
- ResolutionCondition (text) - What makes this story "done"?
- StaleAfterCycles (number) - Mark stale if no coverage for N cycles (default 10)
- IsStale (bool) - Flag for dormant storylines
- WrapUpGenerated (bool) - Has wrap-up hook been created?

**New Columns (Story_Hook_Deck):**
- HookAge (number) - Cycles since generation
- ExpiresAfter (number) - Remove if unused for N cycles (default 5)
- IsExpired (bool) - Should be archived
- PickupCycle (number) - When hook was used in edition

**Engine Updates:**
- storyHook.js v3.9 → v4.0
  - calculateHookAge_() - Track hook freshness
  - expireStaleHooks_() - Archive old unused hooks
  - decayHookPriority_() - Reduce priority as hook ages
  - generateWrapUpHooks_() - Resolution hooks for stale storylines
- New file: phase06-analysis/storylineHealthEngine.js v1.0
  - detectStaleStorylines_() - Flag storylines >10 cycles without coverage
  - checkResolutionConditions_() - Auto-resolve when conditions met
  - generateResolutionHooks_() - Wrap-up story hooks

**Resolution Triggers:**
- Manual: Status set to "resolved"
- Auto: ResolutionCondition met (e.g., "Initiative passes")
- Auto: Stale >15 cycles, no pickup → "fizzled" status
- Auto: All related citizens deceased → "overtaken by events"

**Story Hooks Generated:**
- STORYLINE_WRAP (severity 5-6): Natural conclusion available
- STALE_STORYLINE (severity 3): Dormant >10 cycles, needs revival or close
- STORYLINE_FIZZLED (severity 2): Auto-closed due to inactivity

**Total:** 8 new columns, 2 engine updates, 3 hook types

---

## 📊 Implementation Summary

### Total New Columns

| Sheet | New Columns | Existing | New Total |
|-------|-------------|----------|-----------|
| Simulation_Ledger | 7 | 20 | 27 |
| Generic_Citizens | 3 | 10 | 13 |
| Cultural_Ledger | 0 | 20 | 20 (sync existing) |
| Chicago_Citizens | 4 | 10 | 14 |
| Storyline_Tracker | 11 | 14 | 25 |
| Arc_Ledger | 5 | 16 | 21 |
| Event_Arc_Ledger | 3 | 26 | 29 |
| Story_Hook_Deck | 4 | 22 | 26 |

**Total: 37 new columns across 8 sheets, 0 new sheets**
**Note:** Cultural_Ledger already has FameScore/MediaCount/TrendTrajectory — sync with new system, no new columns needed

### New Engine Files

1. `phase06-analysis/arcLifecycleEngine.js` v1.0 (Week 2)
2. `phase07-evening-media/storylineWeavingEngine.js` v1.0 (Week 3)
3. `phase06-analysis/storylineHealthEngine.js` v1.0 (Week 4)

### Updated Engine Files

1. mediaFeedbackEngine.js v2.2 → v2.3 (Week 1)
2. mediaRoomBriefingGenerator.js v2.7 → v2.8 (Week 1)
3. storyHook.js v3.9 → v4.0 (Week 4)

---

## 🎯 Story Hook Types Added

| Week | Hook Types | Severity | Purpose |
|------|------------|----------|---------|
| 1 | TRENDING_CITIZEN, OVEREXPOSED, FRESH_FACE | 3-7 | Fame/exposure management |
| 2 | ARC_CLIMAX, ARC_RESOLUTION, ARC_STALLED | 4-9 | Arc lifecycle |
| 3 | CROSS_STORYLINE, RELATIONSHIP_CLASH, ALLIANCE_OPPORTUNITY | 5-7 | Citizen weaving |
| 4 | STORYLINE_WRAP, STALE_STORYLINE, STORYLINE_FIZZLED | 2-6 | Resolution triggers |

**Total: 12 new story hook types**

---

## 🔧 Example Use Cases

### Use Case 1: Rising Star Detection

**Scenario:** Citizen Emma Chen (POP-00234) mentioned in 4 articles in 5 cycles.

**Week 1 Enhancement:**
1. mediaFeedbackEngine v2.3 tracks MediaMentions: 4, FameScore: 45 → 65
2. detectTrendingCitizens_() flags FameTrend: "rising"
3. Generates TRENDING_CITIZEN hook (severity 6)
4. Briefing Section 15: "Trending Citizens" recommends Emma for feature profile

**Media Room Action:** Civic Desk assigns profile piece on Emma Chen's community organizing work.

### Use Case 2: Arc Auto-Resolution

**Scenario:** Arc "Stabilization Fund Debate" in building phase for 12 cycles. Initiative finally passes in Cycle 82.

**Week 2 Enhancement:**
1. arcLifecycleEngine v1.0 detects ResolutionTrigger: "initiative_passed"
2. Auto-advances arc phase: building → resolution
3. Generates ARC_RESOLUTION hook (severity 7)
4. Sets ResolutionCycle: 82, ResolutionNotes: "Initiative passed 6-3"
5. Arc status → "closed"

**Media Room Action:** Business Desk writes wrap-up piece on year-long funding debate.

### Use Case 3: Cross-Storyline Conflict

**Scenario:**
- Storyline X: "Mark Aitken union organizing" (Aitken = protagonist)
- Storyline Y: "OPP pressure campaign District 4" (Aitken = antagonist)
- Both active in Cycle 83

**Week 3 Enhancement:**
1. storylineWeavingEngine v1.0 detects shared citizen across storylines
2. Maps CitizenRoles: Aitken is both hero and villain
3. Generates CROSS_STORYLINE hook (severity 7)
4. Updates CrossStorylineLinks on both storylines

**Media Room Action:** Political Desk writes analysis on Aitken's complex political position.

### Use Case 4: Stale Storyline Cleanup

**Scenario:** Storyline "Laurel District gentrification concerns" hasn't been mentioned in 11 cycles.

**Week 4 Enhancement:**
1. storylineHealthEngine v1.0 detects CoverageGap: 11 cycles
2. Sets IsStale: true
3. Generates STALE_STORYLINE hook (severity 3)
4. Offers two paths: revival hook (new angle) or wrap-up hook (fizzled)

**Media Room Action:** Either pick up revival angle or mark "resolved" with "concerns remain dormant" note.

---

## 🚀 Rollout Strategy

**Week 1:**
1. Add 8 columns (fame/exposure tracking)
2. Update mediaFeedbackEngine v2.3
3. Update mediaRoomBriefingGenerator v2.8
4. Test with Cycle 81 data

**Week 2:**
1. Add 8 columns (arc lifecycle)
2. Create arcLifecycleEngine v1.0
3. Integrate into Phase 6
4. Test arc auto-advancement

**Week 3:**
1. Add 7 columns (storyline weaving)
2. Create storylineWeavingEngine v1.0
3. Integrate into Phase 7
4. Test cross-storyline detection

**Week 4:**
1. Add 7 columns (resolution/lifecycle)
2. Update storyHook v4.0
3. Create storylineHealthEngine v1.0
4. Test end-to-end lifecycle

**Each week:** Migration script + rollback script (like civic veto approach)

---

## 📚 Documentation Needed

**For Mara Vance:**
- STORY_NARRATIVE_MASTER_REFERENCE.md (similar to civic master doc)
- Fame vs. Notoriety guide
- Arc lifecycle flowchart
- Storyline resolution decision tree

**For Media Room:**
- Trending citizen detection guide
- Cross-storyline weaving examples
- Stale hook handling protocol

**For Engineers:**
- Technical specs (like CIVIC_VETO_IMPLEMENTATION.md)
- Migration scripts for each week
- Testing scenarios

---

## ❓ Open Questions

1. **Fame decay rate:** -1 per cycle? -5% per cycle?
2. **Notoriety vs Fame distinction:** Should they be separate scores or single Fame with positive/negative?
3. **Arc tension thresholds:** What tension level triggers climax phase?
4. **Storyline cross-linking:** Manual or automatic?
5. **Hook expiration:** 5 cycles or 10 cycles?

---

## 📊 Success Metrics

**After Week 1:**
- Trending citizens identified each cycle (expect 2-5)
- Media saturation warnings prevent overuse
- Fresh faces get more coverage

**After Week 2:**
- Arcs auto-advance through phases (expect 60% automation)
- Tension escalates/decays naturally
- Resolution hooks generate at right moments

**After Week 3:**
- Cross-storyline hooks created (expect 1-3 per cycle)
- Relationship clashes detected
- Multi-citizen narratives emerge

**After Week 4:**
- Stale storylines flagged and resolved
- Hook deck stays fresh (<50 active hooks at a time)
- Storyline churn rate stabilizes (2-3 new, 2-3 resolved per cycle)

---

**Status:** Ready for Week 1 implementation
**Next:** Review plan, choose Week 1 start approach (A, B, or C)
