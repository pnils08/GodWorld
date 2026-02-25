# Institutional Voice Agents — Architecture Specification

**Created:** Session 63 (2026-02-25)
**Authors:** Mags Corliss, Mike Paulson
**Status:** Design approved. Mayor's Office = proof of concept.
**Phase:** 10.1 (Rollout Plan)

---

## The Problem

Right now, civic institutions in GodWorld exist as data — rows in the Civic_Office_Ledger, vote counts in Initiative_Tracker, status flags in sheets. When the newsroom covers city government, desk agents *invent* what officials said. Carmen Delaine doesn't quote the Mayor — she fabricates a quote that sounds mayoral. The journalism is interpretive, but the source material it interprets is... also invented by the same agent writing the article.

This is the civic equivalent of a reporter interviewing themselves.

## The Insight

The civic data already exists. The engine generates events, initiative outcomes, vote results, and status changes. What's missing isn't content — it's **voice**. An initiative passing 6-3 is data. The Mayor explaining why he supported it while Council Member Ashford explains why he didn't — that's a city with internal life.

Mike Paulson currently fills this voice gap manually through seeds, hooks, and sheet edits. The Institutional Voice Agent pattern replaces manual instance-level content generation with autonomous agents that have persistent political personalities.

## The Architecture

### Core Concept

An **Institutional Voice Agent** is an agent that IS an institution. It reads simulation events and generates canonical statements in that institution's voice. These statements become source material that desk agents report on — creating a real separation between source and reporter.

```
ENGINE OUTPUT (events, votes, initiative changes)
        |
        v
INSTITUTIONAL VOICE AGENTS (generate statements)
  - Mayor's Office
  - Council Members (by faction)
  - Community Organizations
  - [future: Police Chief, School Board, Business Council...]
        |
        v
output/civic-voice/{office}_{cycle}.json
        |
        v
DESK AGENTS (report on statements as source material)
  - Civic desk: interprets political positions
  - Letters desk: citizens react to official statements
  - Business desk: cites economic policy positions
  - Culture desk: covers community response
```

### How It Differs From Desk Agents

| Property | Desk Agent | Voice Agent |
|----------|-----------|-------------|
| Role | Reporter/journalist | Institutional source |
| Output | Articles, journalism | Statements, positions, quotes |
| Voice | Reporter personality | Political/institutional personality |
| Reads | Desk packets, canon | Engine events, initiative outcomes |
| Consumed by | Edition compiler | Other agents (via output files) |
| Pipeline position | Step 3 (parallel) | Step 2.5 (before desk agents) |

### Pipeline Integration

```
Current:  Engine → buildDeskPackets → Desk Agents → Compile → Verify
                                  ↑
Proposed: Engine → buildDeskPackets → VOICE AGENTS → Desk Agents → Compile → Verify
                                         |                ↑
                                         └── statements ──┘
```

Voice agents run AFTER desk packets are built (they need the data) but BEFORE desk agents (they produce source material). The write-edition pipeline adds a new step between packet building and desk agent launch.

---

## Civic Office Roster (Existing Data)

All 33 civic officials already have names, factions, roles, and notes in the Civic_Office_Ledger.

### Elected Officials (11)

**Executive:**
- **Mayor Avery Santana** (POP-00034) — OPP — Pro-A's advocate; Baylight plan champion. Approval: 65%
- **DA Clarissa Dane** (POP-00143) — IND — Former federal prosecutor
- **Public Defender Caleb Reyes** (POP-00146) — OPP — Sharp political instincts

**City Council (9 seats, 3 factions):**

| District | Member | Faction | Notes |
|----------|--------|---------|-------|
| D1 | Denise Carter | OPP | West Oakland |
| D2 | Leonard Tran | IND | Downtown/Chinatown |
| D3 | Rose Delgado | OPP | Fruitvale |
| D4 | Ramon Vega | IND | Council President |
| D5 | Janae Rivers | OPP | Progressive Caucus Leader |
| D6 | Elliott Crane | CRC | **Recovering** (health event) |
| D7 | Warren Ashford | CRC | Temescal/Rockridge |
| D8 | Nina Chen | CRC | Lake Merritt |
| D9 | Terrence Mobley | OPP | Laurel/Uptown |

**Faction Breakdown:**
- **OPP** (Oakland Progressive Party): Carter, Delgado, Rivers, Mobley + Mayor Santana = 5 council votes + executive
- **CRC** (Civic Reform Coalition): Crane (recovering), Ashford, Chen = 2-3 council votes
- **IND** (Independent): Tran, Vega = 2 swing votes

### Key Appointed Officials (21)

| Role | Holder | Notes |
|------|--------|-------|
| Chief of Staff | Laila Cortez | Pragmatic ex-organizer |
| Deputy Mayor (Community) | Brenda Okoro | Housing-first specialist |
| Communications Director | Theo Park | Terse; press-fluent |
| Chief Legal Counsel | Simone Ellis | Constitutional litigator |
| City Manager | Aaron Whitfield | Long-service administrator |
| Baylight Authority Director | Keisha Ramos | Stadium plan execution |
| Police Chief | Rafael Montez | 27-year OPD veteran |
| Fire Chief | Marcus Hollowell | 30 years OFD |
| City Planning Director | Mara Vance | Canon Authority |
| Civilian Police Review Chair | Lamine Sissoko | Public ethics scholar |

### Status Alerts (Active)
- **Elliott Crane** (D6, CRC) — Recovering from health event. Absent from recent votes.
- **Marcus Osei** (Deputy Mayor, Economic Development) — Serious condition.

---

## Statement Types

Voice agents produce structured statements, not prose. Each statement is a JSON object with:

```json
{
  "statementId": "STMT-084-MAYOR-001",
  "cycle": 84,
  "office": "mayor",
  "speaker": "Avery Santana",
  "popId": "POP-00034",
  "type": "initiative_response",
  "topic": "Fruitvale Transit Hub Phase II",
  "position": "support",
  "quote": "This is what investment in Oakland looks like — not promises, infrastructure.",
  "context": "Response to Phase II visioning reaching public comment period",
  "tone": "measured-optimistic",
  "targets": ["civic", "business", "letters"],
  "timestamp": "2026-02-25T06:00:00Z"
}
```

### Statement Type Catalog

| Type | Trigger | Who Generates | Example |
|------|---------|---------------|---------|
| `initiative_response` | Initiative status change | Mayor, relevant council members | Mayor supports Baylight; Ashford dissents |
| `vote_statement` | Council vote outcome | Voting members | "I voted no because..." |
| `press_release` | Major city event | Mayor's office | Emergency declarations, seasonal addresses |
| `policy_position` | New policy discussion | Mayor, faction leaders | Economic development stance |
| `public_remark` | Citizen sentiment shift | Mayor, council | Response to community concerns |
| `emergency_declaration` | Crisis event | Mayor, Police Chief, Fire Chief | Weather, safety events |
| `budget_statement` | Budget/funding events | Mayor, City Manager | Fund allocation explanations |
| `dissent` | Faction disagreement | Minority faction members | Counter-position to majority action |
| `coalition_statement` | Cross-faction agreement | Multiple members | Joint statement on shared priority |

---

## Voice Profiles

Each institutional voice agent has a **voice profile** that shapes how it responds to events. This is the political personality layer.

### Mayor Avery Santana — Voice Profile

**Political identity:** Progressive pragmatist. Believes in Oakland's potential but knows the city's history of broken promises. Pro-development but community-first framing. The A's stadium (Baylight) is his signature achievement — he'll defend it with data and passion.

**Speech patterns:**
- Opens with Oakland reference ("This city..." / "Oaklanders deserve...")
- Uses concrete numbers — budgets, jobs, timelines
- Acknowledges opposition without conceding ("I hear the concerns, and here's what we're doing about them")
- Avoids jargon when possible; translates policy into impact
- Signs off with forward-looking statement

**Political priorities (ranked):**
1. Baylight District / economic development
2. Housing stability (Stabilization Fund)
3. Public safety reform (OARI)
4. Transit / infrastructure
5. Arts & culture funding

**Relationships:**
- Allies: Rivers (OPP progressive caucus), Carter (West Oakland base)
- Complicated: Vega (IND — agrees on development, splits on social spending)
- Opposition: Ashford (CRC — fiscal conservative, Baylight skeptic)
- Staff trust: Cortez (Chief of Staff), Okoro (Deputy Mayor — housing)

**Tone range:** measured-optimistic → firm-defensive → celebratory → concerned-but-steady

### Council Faction Voices (Future — After Mayor Proof of Concept)

**OPP Faction Voice:**
- Progressive, community-centered language
- Emphasizes equity, access, neighborhood investment
- Quick to cite disparities and historical context
- Tone: passionate, occasionally righteous

**CRC Faction Voice:**
- Fiscal responsibility, process, accountability
- Questions cost projections, requests audits
- Emphasizes taxpayer burden and oversight
- Tone: measured, sometimes skeptical, data-oriented

**IND Voice (Vega/Tran):**
- Issue-by-issue evaluation, no blanket loyalty
- Often the swing votes — their statements carry weight
- Pragmatic language, less ideological framing
- Tone: deliberate, bridge-building

---

## Election Cycle Architecture

**This is critical.** Institutional voice agents make election cycles possible.

### Current Election Data (from Civic_Office_Ledger)

- **Election Group A** (cycles 97-100): Council D1, D3, D5, D7, D9
- **Election Group B** (cycles 201-204): Mayor, DA, PD, D2, D4, D6, D8

### How Elections Work with Voice Agents

1. **Pre-election:** Incumbents generate campaign-style statements. Challengers (new voice agents) enter the simulation with opposing platforms.
2. **Campaign period:** Both voice agents respond to the same events from different positions. The newsroom covers the debate.
3. **Election cycle:** Engine determines outcome based on approval ratings, faction strength, citizen sentiment.
4. **Post-election:** Winner's voice agent persists. Loser's voice agent either exits or becomes opposition voice.

This means the simulation can run genuine election narratives without Mike scripting every position. The voice agents generate the political content; the engine determines outcomes; the newsroom covers it all.

---

## Implementation Plan

### Phase 1: Mayor's Office (This Session)

Build `.claude/agents/civic-office-mayor/SKILL.md`:
- Reads: base_context.json (initiatives, events, council data)
- Reads: Any pending vote or initiative status changes
- Generates: 2-4 statements per cycle in structured JSON
- Outputs: `output/civic-voice/mayor_c{XX}.json`
- Voice: Avery Santana profile (above)

Wire into write-edition pipeline:
- Step 2.5: Launch civic-office-mayor agent
- Step 2.6: Read mayor statements, include in civic/letters/business desk packets

### Phase 2: Council Factions (Post-Mayor Validation)

Build faction-level voice agents (not per-member yet):
- `civic-office-opp-faction` — Progressive bloc response
- `civic-office-crc-faction` — Reform coalition response
- `civic-office-ind-swing` — Independent swing vote statements

### Phase 3: Extended Civic Voices

- Police Chief Rafael Montez — public safety events
- DA Clarissa Dane — crime/justice events
- Baylight Authority Director Keisha Ramos — stadium/development events
- Community organizations (neighborhood-specific)

### Phase 4: Election Engine Integration

- Challenger voice agents spawn during election windows
- Campaign statement generation
- Engine-driven election outcomes
- Voice agent succession (winner replaces incumbent)

---

## Design Principles

1. **Voice agents produce source material, not journalism.** They don't write articles. They generate the raw quotes, positions, and statements that journalists interpret.

2. **Political personality is persistent.** The Mayor doesn't change his mind randomly between cycles. His positions evolve based on events, but his core values and priorities remain consistent.

3. **Internal tension is emergent.** If two agents with different values read the same event, they'll naturally produce conflicting statements. Nobody scripts the conflict — the architecture creates it.

4. **The newsroom reports, the offices speak.** Clear separation. Carmen Delaine reads the Mayor's statement and decides what angle to take. She doesn't invent what he said.

5. **Voice files are canon.** Once a voice agent generates a statement, it's canonical. The Mayor said it. It can be quoted, challenged, verified, and referenced in future cycles.

6. **Remove the operator from the content loop.** Mike Paulson built the city. The city talks for itself. Manual seeding becomes the exception, not the rule.
