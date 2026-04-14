# Citizen Selection Criteria

**Read this when selecting citizens for stories in /sift Step 4. Updated after each cycle based on what worked.**

Last Updated: S144 (starter version — refine after C92)

---

## What a Citizen Is

Citizens are persistent people with canon histories. They have jobs, neighborhoods, ages, families, opinions, and published quotes. When a reporter writes about Beverly Hayes, every future reference to Beverly Hayes must be consistent with what was already published. Citizens are not props. Their appearances become canon.

## How to Find Citizens

1. **MCP first** — `lookup_citizen(name)` returns profile + canon history from world-data and bay-tribune
2. **A's players — use `get_roster("as")`** — reads truesource for player-specific data: contracts, quirks, positions, birth years, stats. `lookup_citizen` doesn't return roster-level detail. Use get_roster for any A's player (GAME-mode citizen), lookup_citizen for everyone else.
3. **Sheets API backup** — service account reads Simulation_Ledger directly. Gender column now exists on the ledger.
4. **Canon search** — `search_canon(name)` finds what the Tribune has published about them

Searching 20-30 citizens per edition is normal. Don't ration lookups.

**Rule:** For any sports story involving A's players, `get_roster("as")` is mandatory. This applies to sift, write-edition, write-supplemental, dispatch, interview — any skill touching sports citizens.

## What's Canon vs What's Agent Color

### Canon (immutable — never change these)
- Name, POP-ID, age, birth year
- Neighborhood (where they live)
- Role/occupation
- Tier
- Gender (on the ledger)
- Family relationships
- Published quotes and actions from previous editions
- Physical details already published (if someone was described with a limp in E88, they have a limp forever)

### Agent Color (reporters can add — becomes canon once published)
- How they enter a scene (walking, sitting, leaning against something)
- Sensory details not yet established (voice quality, clothing, mannerisms)
- Emotional state in the moment (worried, relieved, angry)
- Opinions on current events (must be consistent with their role and neighborhood)
- Where exactly they are within their neighborhood (a specific cafe, corner, park bench)

### Never Invent
- A new job or career change (engine handles this)
- Moving to a different neighborhood (engine handles this)
- Family members not in the ledger
- Age that contradicts birth year
- Gender that contradicts the ledger
- Quotes from previous editions that didn't happen

## When to Use Known Citizens vs New Ones

### Bring Back a Known Citizen When
- They have an active arc (Beverly Hayes + Stabilization Fund, Darius Clark + delayed payment)
- Their neighborhood is the setting and they've appeared before in that context
- Continuity serves the story — a reader who remembers them from E90 gets a deeper experience
- They were promised a follow-up (explicitly or implicitly in previous coverage)

### Surface a New Citizen When
- The story is in a neighborhood with no established characters
- The edition needs demographic balance (check Notes to Self for coverage gap tracking)
- A fresh perspective is needed — a new voice who hasn't been quoted on this topic
- The story touches a population underrepresented in canon (youth, seniors, immigrants, LGBTQ+)

### Freshness Scoring
- Citizens with 0 appearances are FRESH — good candidates for new stories
- Citizens with 5+ appearances across editions are ESTABLISHED — use for arc continuity
- Citizens who appeared last edition should generally rest this edition unless their arc demands it
- Check `lookup_citizen` canon history for appearance count

## How Many Citizens Per Story

- **Front page / feature:** 2-4 named citizens. Enough to feel populated, not so many nobody lands.
- **Sports:** Players are citizens. 3-5 per piece is normal.
- **Civic:** 1-2 officials (from voice outputs) + 1-2 residents who feel the decision
- **Culture / city life:** 1-2 named citizens grounding the scene
- **Letters:** Each letter IS a citizen. 3-4 letters per edition.
- **Accountability:** 1-2 officials being questioned + 1 citizen affected

## Tier Behavior

- **Tier 1 (protected):** Major characters. Family members, key officials, franchise players. Never delete. Handle with full canon awareness.
- **Tier 2:** Significant recurring characters. Appear across multiple editions. Full MCP lookup every time.
- **Tier 3:** Supporting characters. Appeared 1-3 times. MCP lookup to verify basics.
- **Tier 4 (generic):** Background citizens from Generic_Citizens pool. Can emerge to Tier 3 through edition appearances.

## Gender

Gender is now on the Simulation_Ledger. Read it from MCP or sheets API. Do not assume from names. Do not omit from briefs.

Every angle brief must include gender for every citizen listed.

## Name Collision (known issue)

The citizen generator produced many duplicate first names — roughly 30 Xaviers, and 10-15 other first names with similar repetition across 800+ citizens. Until the ledger is cleaned up in a separate session, handle this defensively:

- Always use FULL NAME + POP-ID in briefs, never first name only
- When looking up a citizen, verify POP-ID matches — don't assume the first search result is correct
- If a reporter writes "Xavier" without a last name, that's a hallucination risk — flag it in review

## Evolving This File

After each edition:
1. Did any citizen get misrepresented? What was wrong — role, neighborhood, gender, history?
2. Did freshness balance work? Too many returning characters? Too many unknowns?
3. Did any reporter invent details that contradicted canon? What was the source of the error?
4. Update this file with findings.

---

## Changelog

_Updated by `/post-publish` Step 10 after each edition. What changed and why._

- S144: starter version created. Name collision warning added. No cycle data yet.
