# Desk Packet Pipeline v1.0

**Purpose:** The definitive process for generating The Cycle Pulse using per-desk JSON packets and parallel desk agents. Replaces the monolithic handoff approach.

**Key change:** Each desk gets its OWN filtered data packet. No pre-assigned stories. No front page recommendation. Desks decide what to cover.

---

## The Pipeline (7 Stages)

```
1. ENGINE COMPLETES CYCLE
   ↓
2. GENERATE DESK PACKETS
   node scripts/buildDeskPackets.js [cycle]
   ↓
3. LAUNCH DESK AGENTS (parallel — up to 6 desks)
   Each receives: system prompt + desk packet JSON
   Each outputs: articles + partial engine returns
   ↓
4. COMPILE (Mags Corliss agent)
   Receives all desk outputs
   Calls front page, orders sections, resolves overlap
   Produces unified edition
   ↓
5. VERIFY (Rhea Morgan agent)
   Cross-checks names, votes, records against canon
   Produces error list or CLEAN
   ↓
6. FIX + FINALIZE
   Apply Rhea's corrections
   Final edition saved to editions/
   ↓
7. ENGINE INTAKE
   Parse edition returns → sheets
```

---

## Stage 2: Generate Desk Packets

### Script

```bash
cd /root/GodWorld && node scripts/buildDeskPackets.js 79
```

### Data Sources (16 Google Sheets + local files)

| Sheet | What's Pulled | Filtering |
|-------|--------------|-----------|
| `Story_Seed_Deck` | Seeds with SeedType, Domain, Priority, SeedText | Current cycle only |
| `Story_Hook_Deck` | Hooks with HookType, Domain, Priority, HookText | Current cycle only |
| `WorldEvents_V3_Ledger` | Events with Domain, Severity, Neighborhood | Current cycle only |
| `Event_Arc_Ledger` | Active arcs with Phase, Tension, DomainTag | Active (not resolved) |
| `Civic_Office_Ledger` | Council members, factions, districts | All active |
| `Initiative_Tracker` | Pending votes, projections, swing voters | **Excludes status="proposed"** |
| `Simulation_Ledger` | Named citizens with Tier, RoleType, Neighborhood | All (526 rows) |
| `Generic_Citizens` | Tier 3-4 citizens with Age, Neighborhood, Occupation | Active only, by neighborhood |
| `Chicago_Citizens` | Chicago citizens | All (90 rows) |
| `Cultural_Ledger` | Cultural entities with FameScore, Domain | Active, FameScore >= 20 |
| `Oakland_Sports_Feed` | A's game data, trades, community events | Current cycle (fallback: all) |
| `Chicago_Sports_Feed` | Bulls game data, trades, signings | Current cycle (fallback: all) |
| `Storyline_Tracker` | Active/new/developing storylines | Active status only, deduped |
| `Cycle_Packet` | Raw cycle packet text | Current cycle |
| `Press_Drafts` | Previous cycle coverage | Previous cycle |
| `LifeHistory_Log` | Recent quotes (EventTag='quoted') | Current cycle |

Local files read:
- `/tmp/mara_directive_c{XX}.txt` — Mara Vance editorial guidance
- `schemas/bay_tribune_roster.json` — Journalist voice profiles
- `editions/cycle_pulse_edition_{XX-1}.txt` — Previous edition (for continuity)

### Domain-to-Desk Routing

```
CIVIC, INFRASTRUCTURE, HEALTH, CRIME, SAFETY, GOVERNMENT, TRANSIT → civic
SPORTS → sports + chicago (filtered by team keywords)
CULTURE, FAITH, COMMUNITY, FESTIVAL, ARTS, EDUCATION, WEATHER → culture
ECONOMIC, NIGHTLIFE, RETAIL, LABOR → business
CHICAGO → chicago
GENERAL → civic + culture (both get it)
```

Storylines route via keyword matching on Description + RelatedCitizens fields.

### Output

```
/tmp/desk_packets/
  civic_c79.json      (~36KB)
  sports_c79.json     (~21KB)
  culture_c79.json    (~47KB)
  business_c79.json   (~10KB)
  chicago_c79.json    (~13KB)
  letters_c79.json    (~64KB)
  base_context.json   (shared canon + context)
  manifest.json       (index of all packets)
```

### What Each Packet Contains

```json
{
  "meta": { "desk", "cycle", "generated" },
  "baseContext": { "cycle", "season", "holiday", "weather", "sentiment" },
  "deskBrief": { "name", "coverageDomains", "articleBudget" },
  "reporters": [ { "name", "role", "tone", "openingStyle", "themes", "samplePhrases" } ],
  "events": [ { "domain", "severity", "neighborhood", "description" } ],
  "seeds": [ { "seedType", "domain", "priority", "text" } ],
  "hooks": [ { "hookType", "domain", "priority", "text" } ],
  "arcs": [ { "arcId", "domain", "phase", "tension", "summary" } ],
  "storylines": [ { "type", "description", "status", "relatedCitizens" } ],
  "culturalEntities": [ { "name", "roleType", "domain", "fameScore" } ],
  "interviewCandidates": [ { "name", "age", "neighborhood", "occupation" } ],
  "canonReference": { "reporters", "council?", "pendingVotes?", "asRoster?", "bullsRoster?" },
  "sportsFeeds": [ ... ],
  "maraDirective": "...",
  "previousCoverage": [ ... ],
  "recentQuotes": [ ... ]
}
```

### What's NOT in Desk Packets (vs. Old Monolithic Handoff)

- **NO** Front Page Recommendation — Mags decides after reading all desk output
- **NO** Story Assignments — desks choose what to cover from their data
- **NO** Section Assignments — desks are autonomous
- **NO** Full canon dump to every desk — each desk gets only its relevant canon
- **NO** "Proposed" initiatives — excluded from all packets
- **NO** Engine analytics (Riley Digest, raw metrics)

---

## Stage 3: Desk Agents

### Desk Activation Rules

| Cycle Type | Active Desks | Agents |
|------------|-------------|--------|
| Quiet | Sports + Culture + Letters | 3 |
| Normal | + Civic + Business | 5 |
| Hot | All 5 content desks + Letters | 6 |

### Desk Lineup

| Desk | Reporters | Article Budget | Canon Access |
|------|-----------|---------------|--------------|
| **Civic** | Carmen Delaine, Luis Navarro, Dr. Lila Mezran, Trevor Shimizu, Sgt. Rachel Torres | 2-4 articles | Council, pending votes, status alerts |
| **Sports** | Anthony, P Slayer, Hal Richmond, Tanya Cruz, DJ Hartley | 2-5 articles | A's roster, Oakland sports feeds |
| **Culture** | Maria Keen, Kai Marston, Mason Ortega, Angela Reyes, Noah Tan | 2-4 articles | Cultural entities |
| **Business** | Jordan Velez | 1-2 articles | (Business Ticker format) |
| **Chicago** | Selena Grant, Talia Finch | 2-3 articles | Bulls roster, Chicago sports feeds |
| **Letters** | (citizen voices) | 2-4 letters | Full canon access |

### What Each Agent Receives

1. **System prompt** (~2KB) — Desk identity, reporter voices, rules, return format
2. **Desk packet JSON** (10-64KB) — Filtered data for this desk only
3. **Key rules embedded** — No invented names, no engine metrics, max 2 articles per reporter

### What Each Agent Returns

1. **Formatted articles** with bylines, Names Index footers
2. **Partial ARTICLE TABLE** rows for this desk's articles
3. **Partial STORYLINES UPDATED** (new + resolved from this desk's coverage)
4. **Partial CITIZEN USAGE LOG** for citizens used
5. **Partial CONTINUITY NOTES** (quotes, records, new canon)

---

## Stage 4: Compile (Mags Corliss)

Mags receives all desk outputs and:

1. Calls the **front page lead** (best article gets front page placement)
2. Orders sections: FRONT PAGE > CIVIC > BUSINESS > CULTURE > SPORTS > CHICAGO > LETTERS
3. Resolves overlap (if two desks touched same storyline — keeps both if angles differ)
4. Writes the **edition header** (weather/sentiment/migration)
5. Merges all partial returns into unified ARTICLE TABLE, STORYLINES, CITIZEN USAGE, CONTINUITY
6. Optionally writes an editorial or human-interest piece

---

## Stage 5: Verify (Rhea Morgan)

Rhea receives the compiled edition + canon sources:

- `bay_tribune_roster.json` — Reporter names and roles
- `Civic_Office_Ledger` — Council members, factions, districts
- `Initiative_Tracker` — Vote positions, projections
- `Simulation_Ledger` — A's/named citizens (526 rows)
- `Generic_Citizens` — Tier 3-4 Oakland citizens (225 rows)
- `Cultural_Ledger` — Cultural entities (25 rows)
- `Chicago_Citizens` — Chicago citizens (90 rows)
- `ARTICLE_INDEX_BY_POPID.md` — 326+ citizens with POP-IDs

**Checks:** Name spelling, vote positions, records, no engine metrics, reporter accuracy, citizen details (age/neighborhood/occupation match ledger data).

**Output:** Numbered error list or CLEAN.

---

## Stage 6-7: Finalize + Engine Intake

1. Apply Rhea's corrections
2. Save to `editions/cycle_pulse_edition_{XX}_v2.txt`
3. Parse edition returns into sheets via intake scripts

---

## Key Rules (All Desks)

1. **NEVER invent citizen names.** Use ONLY names from packet data or canon.
2. **No engine metrics in article text.** No "tension score," "severity level," "high-severity civic event."
3. **The world is real.** No simulation, no engine, no sheets. Only Oakland and Chicago.
4. **Max 2 articles per reporter per cycle.**
5. **Names Index footer on every article.** Lists all citizens/journalists referenced.
6. **Proposed initiatives are embargoed.** Status="proposed" items are NOT for media coverage.

---

## Version History

| Version | Cycle | Changes |
|---------|-------|---------|
| v1.0 | 79 | Initial creation. Per-desk JSON packets, parallel agent architecture, 7-stage pipeline. |
