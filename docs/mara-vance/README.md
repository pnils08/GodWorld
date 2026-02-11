# Mara Vance — Civic Governance Documentation

**For:** Mara Vance, City Planning Director, City of Oakland
**Purpose:** Quick access to all civic governance and character reference materials

---

## 📋 Start Here

**New to the civic system?** → **[CIVIC_GOVERNANCE_MASTER_REFERENCE.md](CIVIC_GOVERNANCE_MASTER_REFERENCE.md)**
- Complete civic governance guide
- Council structure, voting mechanics, veto power
- Elections, ripple effects, story hooks
- Quick reference cards for press briefings
- Canon adjudication scenarios

---

## 🗂️ Reference Documents

### Civic Governance (v1.7)

| Document | Purpose | Last Updated |
|----------|---------|--------------|
| **[CIVIC_GOVERNANCE_MASTER_REFERENCE.md](CIVIC_GOVERNANCE_MASTER_REFERENCE.md)** | **PRIMARY REFERENCE** — Everything civic in one place | 2026-02-11 |
| [CIVIC_VETO_IMPLEMENTATION.md](CIVIC_VETO_IMPLEMENTATION.md) | v1.7 technical spec for mayoral veto & override votes | 2026-02-11 |
| [INITIATIVE_TRACKER_VOTER_LOGIC.md](INITIATIVE_TRACKER_VOTER_LOGIC.md) | Swing voter probability calculations | 2026-02-11 |
| [CIVIC_ELECTION_ENGINE.md](CIVIC_ELECTION_ENGINE.md) | Election system (cycles 45-48, staggered terms) | 2026-02-05 |

### Character & Newsroom

| Document | Purpose | Last Updated |
|----------|---------|--------------|
| [CLAUDE_AI_SYSTEM_PROMPT.md](CLAUDE_AI_SYSTEM_PROMPT.md) | Your character prompt for claude.ai | 2026-02-11 |
| [OPERATING_MANUAL.md](OPERATING_MANUAL.md) | Your authority, functions, signature formats | 2026-02-05 |
| [IN_WORLD_CHARACTER.md](IN_WORLD_CHARACTER.md) | Character background, relationships | 2026-02-05 |
| [MEDIA_ROOM_INTRODUCTION.md](MEDIA_ROOM_INTRODUCTION.md) | How you interface with the newsroom | 2026-02-05 |

---

## 🎯 Quick Links by Task

### Press Briefing Prep

**Before briefing Mike Paulson:**
1. Check [CIVIC_GOVERNANCE_MASTER_REFERENCE.md](CIVIC_GOVERNANCE_MASTER_REFERENCE.md) § "Quick Reference Cards"
2. Review recent votes in Initiative_Tracker ledger
3. Check mayor's approval rating in Civic_Office_Ledger
4. Scan storyHooks from last cycle (ctx.summary)

**Key talking points:**
- Veto mechanics (simple explanation)
- Override process (6-vote supermajority, 2 cycles later)
- Approval ratings (public accountability)

### Canon Adjudication

**When engine output seems wrong:**
1. Check [CIVIC_GOVERNANCE_MASTER_REFERENCE.md](CIVIC_GOVERNANCE_MASTER_REFERENCE.md) § "Common Adjudication Scenarios"
2. Cross-reference Initiative_Tracker with Civic_Office_Ledger
3. Verify council availability (hospitalized/vacant seats)
4. Check Engine_Errors ledger for runtime issues

**Golden Rule:** If clean run (no errors), engine output is canonical.

### Editorial Guidance

**When Mags asks "what should we cover?"**
1. Review storyHooks severity (8+ = front page)
2. Check hookType priorities:
   - VETO_OVERRIDE (severity 8) → power struggle narrative
   - MAYORAL_VETO (severity 7) → political tension
   - VETO_UPHELD (severity 6) → status quo reinforced
3. Send coverage directive via [OPERATING_MANUAL.md](OPERATING_MANUAL.md) § "Signature Formats"

### Fourth Wall Moments

**When project owner asks "is this canon?"**
- You exist at the boundary (not simulation supervisor)
- Reference canonical source: Initiative_Tracker, Civic_Office_Ledger
- Use CANON CONFIRMED signature format
- Never mention: engines, simulations, sheets, ledgers (mechanical terms)

---

## 📊 Data Sources

### Primary Ledgers

**Initiative_Tracker** (24 columns as of v1.7)
- Columns T-X: New veto/override tracking
- Location: GodWorld Spreadsheet, tab "Initiative_Tracker"

**Civic_Office_Ledger** (19 columns as of v1.7)
- Columns R-S: ExecutiveActions (JSON), Approval (0-100)
- Location: GodWorld Spreadsheet, tab "Civic_Office_Ledger"

**Neighborhood_Demographics**
- Used for demographic vote influence (v1.3)
- Location: GodWorld Spreadsheet, tab "Neighborhood_Demographics"

### Engine Context

Access via Supermemory or Claude.ai project context:
- `ctx.summary.votesThisCycle` — Votes resolved this cycle
- `ctx.summary.initiativeRipples` — Active ripple effects
- `ctx.summary.storyHooks` — Generated story hooks

---

## 🔄 Version History

| Version | Date | Major Changes |
|---------|------|---------------|
| **v1.7** | 2026-02-11 | Mayoral veto, override votes, approval ratings |
| v1.6 | 2026-02-09 | Date parsing fix, faction whitespace trim |
| v1.5 | 2026-02-06 | Delayed initiative retry, deterministic RNG |
| v1.4 | 2026-02-05 | Manual vote execution |
| v1.3 | 2026-02-04 | Demographic influence, neighborhood ripples |
| v1.2 | 2026-02-03 | 9-seat model, mayor veto framework |
| v1.1 | 2026-02-02 | Dual swing voters |

---

## 🚀 What's Next

**Week 2 (Upcoming):** Town Halls & Public Hearings
- PublicSupport score on initiatives (0-100)
- Citizen speakers (3-8 per hearing)
- Trigger conditions: controversy >=7, low approval <35, neighborhood crisis
- Outcomes: calm, heated, consensus, protest
- Uses Approval column added in v1.7

**Week 3:** Enhanced Council Availability
- Personal leave tracking
- Scandal/investigation status
- Availability as 0-1 score (not boolean)
- Quorum checks

**Week 4:** Vote History & Executive Orders
- RecentVotes JSON (last 5 votes per member)
- Mayor emergency powers during crisis
- Pattern detection for journalism

---

## 📞 Contact

**In-world questions:** Contact Mara Vance via City Planning Office
**Out-of-world questions:** Reference SESSION_CONTEXT.md or ask project owner

**Character continuity:** All civic decisions by Mara are canonical once confirmed with signature.

---

**Last Updated:** 2026-02-11
**Maintained By:** GodWorld Project Team
