# Citizen Selection Criteria

**Read this when selecting citizens for stories in /sift Step 4. Updated after each cycle based on what worked.**

Last Updated: S170 (C92)

---

## What a Citizen Is

Citizens are persistent people with canon histories. They have jobs, neighborhoods, ages, families, opinions, and published quotes. When a reporter writes about Beverly Hayes, every future reference to Beverly Hayes must be consistent with what was already published. Citizens are not props. Their appearances become canon.

## How to Find Citizens

**Canon hierarchy (S170 — locked after C92 Civis/Civic confusion).** Sheets are primary canon. Everything else is derivative.

1. **Sheets are primary.** Simulation_Ledger is canon for citizens. Business_Ledger is canon for businesses. Civic_Office_Ledger is canon for officials. Initiative_Tracker is canon for programs. When these disagree with anything else, the sheet wins.
2. **`lookup_citizen(name)` and `search_world(...)` are the primary derivative layer** and what desks should use in practice — they read the sheets. Fast enough, structured enough, token-cheap. Use these.
3. **Bay-tribune (`search_canon`) is the storyline canon** — what the Tribune has *published* about someone. Treat it as authoritative for character history, published quotes, prior arcs. But if an edition claim disagrees with the ledger (wrong age, wrong neighborhood), the sheet wins and the edition has drifted.
4. **World-data cards and civic-voice JSONs are derivatives** that can drift from the sheet. Do not trust them alone for a canon fact. Verify against the sheet when a claim matters.
5. **A's players — `get_roster("as")` is mandatory.** Reads truesource for contracts, quirks, positions, birth years, stats. `lookup_citizen` doesn't return roster-level detail. Any sports story involving A's players uses this.

Searching 20-30 citizens per edition is normal. Don't ration lookups.

**Editorial-fix rule (S170).** When an article needs a citizen swap during review (wrong age, wrong neighborhood, professional-athlete misuse, name-reuse flag), run a FRESH `search_world` query with the specific role/neighborhood/age constraints. Do NOT reach back into the already-verified-pool for a replacement — that pool was filtered for other stories and will produce another "same 10 citizens every article" outcome. Fresh query, fresh voice.

**Professional athletes are not general-citizen voices.** A's players (and any pro athlete) only appear in SPORTS coverage or in stories where the athlete's role is the point. Do not use Vladimir Gonzalez, Darrin Davis, etc. as a Fruitvale bus driver / West Oakland resident / general citizen quote in civic / business / accountability / city-life pieces. C92 caught one: Vladimir Gonzalez was used as a Fruitvale transit-hub voice in Carmen's Transit piece. Swapped to Delia Fuentes (school bus driver, Fruitvale, canon E86). Rule added.

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
- S170 (C92): canon hierarchy locked — sheets are primary, everything else derivative. Added editorial-fix rule (fresh `search_world` query, never reach into verified pool) after Ernesto Quintero age conflict triggered Marcus Wright reuse which Mike flagged as "same 10 citizens every article." Added professional-athletes-are-not-general-citizens rule after Vladimir Gonzalez was used as a Fruitvale bus driver / transit voice in Carmen's Transit piece; swapped to Delia Fuentes. Fresh voices introduced this cycle: Marcus Carter POP-00319, Nikolai Fuentes POP-00717, DeShawn Mitchell POP-00708, Lorenzo Nguyen POP-00314, Gloria Hutchins POP-00727. Citizen drift flags sent to engine-repair: Darrin Davis world-data card says "Oakland native" but canon is Ohio; Varek age inconsistency between briefs and canon; Civis Systems / Civic Systems confusion from voice JSONs — sheet (Business_Ledger BIZ-00052) is Civis Systems.
- **S195 (C93): MCP citizen verification stack BROKEN; new-citizen intake structurally silenced; faith-org real-name contamination flagged + new canon rule.** Evidence: sift G-S7+S8+S10+S12 — `lookup_citizen` world-data + `search_world` citizens + `get_roster` + `queryLedger.js` env all failed for entire /sift; bay-tribune fallback held for returning citizens (Patricia Nolan POP-00729, Beverly Hayes POP-00576, Marcus Carter POP-00319, Lorenzo Nguyen POP-00314, Gloria Hutchins POP-00727, Carmen Mesa POP-00081, Ernesto Quintero POP-00050) — but **NO working verification path existed for fresh citizens this cycle**. Three new citizens introduced (Vivienne Torres LVN Temescal, Diane Foster occupational therapist Temescal, Thomas Webb retired city planner Lake Merritt) plus Atlas Bay Architects (substitute for Perkins&Will per S185) plus Greater Hope Pentecostal Church + Bishop Calvin Reeves Sr. (substitute for Acts Full Gospel + Bishop Robert Jackson Sr. per Mara C93 audit) — **all silently dropped from intake** because /post-publish G-P8: E93 .txt has CITIZEN USAGE LOG instead of NAMES INDEX, ingestPublishedEntities.js parsed 0 citizens / 0 businesses (false "pure-atmosphere artifact" success). New canon rule hardened: **NO real churches, NO real pastors, NO real religious-leader names** — `docs/canon/INSTITUTIONS.md` §Faith & Community + `docs/media/REAL_NAMES_BLOCKLIST.md`. Faith_Organizations ledger contamination is system-wide (17 real-named entries); Mike taking wholesale ledger cleanup as separate workstream; the C93 substitutes are interim placeholders. Returning-citizen rotation (Patricia Nolan / Beverly Hayes / Lorenzo Nguyen / Gloria Hutchins / Carmen Mesa) read as same-10-citizens failure mode (S170 recurrence) — sift Step 4 must bias new POPID introduction toward neighborhood pieces. **Carry forward to C94:** Vivienne Torres + Diane Foster + Thomas Webb need pending Sim_Ledger rows backfilled; Atlas Bay Architects needs Business_Ledger row; Greater Hope Pentecostal Church + Bishop Calvin Reeves Sr. flagged for Mike's faith-org cleanup pass.
