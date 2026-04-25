---
title: Canon Rules — World Fidelity
created: 2026-04-25
updated: 2026-04-25
type: reference
tags: [canon, fourth-wall, fidelity, active]
sources:
  - docs/POST_MORTEM_C92_CONTAMINATION.md (the failure that motivated this file; assessment was tier-blind, see §Why This Exists)
  - docs/engine/ROLLOUT_PLAN.md (S172 halt response)
  - .claude/rules/newsroom.md (existing newsroom rules — supplemented, not replaced)
  - S174 three-tier reframe (this file — Mike's distinction: geographic-public vs branded-private vs individual)
  - "Supermemory mags doc XJi6whXEyPehdN6oDS97hQ — S174 framework reasoning (why three-tier beats binary, why LENS is load-bearing, asymmetric IDENTITY contamination rule). Retrieve: curl -s 'https://api.supermemory.ai/v3/documents/XJi6whXEyPehdN6oDS97hQ' -H 'Authorization: Bearer $SUPERMEMORY_CC_API_KEY'"
pointers:
  - "[[POST_MORTEM_C92_CONTAMINATION]] — the failure that motivated this file"
  - "[[canon/INSTITUTIONS]] — companion canon roster of structural institutions, organized by tier"
  - "[[index]] — registered here"
  - ".claude/rules/newsroom.md — existing newsroom rules continue to apply alongside this file"
---

# Canon Rules — World Fidelity

**Read at boot:** every generative agent (desks, civic voices, project agents, photographer).
**Read at boot:** every reviewer agent — to know what to check for.

This file plus `INSTITUTIONS.md` is the fourth-wall enforcement layer the S172 post-mortem identified as missing. It does not replace `.claude/rules/newsroom.md`; it sits alongside.

---

## The Frame

GodWorld is **2041 Oakland-as-simulated** — a constructed dynasty-era world that uses Oakland geography as scaffold. Some real-world institutional names function as place-descriptors and are usable; others are private brands that lock the world into proprietary identities and must be replaced or escalated.

The three-tier framework below draws the line.

---

## Three-Tier Framework

Every real-world entity considered for use in your output falls in one of three tiers.

### Tier 1 — Use Real Names Freely (Public Geographic Functions)

Real names that identify a place or public function rather than a brand. Civic infrastructure naming. Using these doesn't import a separate world — it just names the local equivalent of a function any city has.

**Approved tier-1 names (use directly, no canon-substitute needed):**

- **Health & medical (public/county):** Alameda Health System, Highland Hospital
- **Health regulatory (state/federal public):** HCAI, OSHPD-3, CDPH
- **Education (public districts):** OUSD, Peralta CCD
- **Transit (public authorities):** AC Transit, BART
- **Civic agencies (public):** Oakland Police Department, Oakland Housing Authority, Port of Oakland, Alameda County Sheriff
- **Court system (the institution itself, not the named building):** Alameda County Superior Court
- **Labor (public unions, democratically organized):** IBEW Local 595, NorCal Carpenters, UA Local 342, Ironworkers Local 378, Laborers Local 304, OE Local 3, SMART Local 104, Cement Masons Local 300
- **Civic-labor umbrella bodies:** Building Trades Council, Workforce Development Board

The test: name identifies a place or public-civic function; using the name doesn't lock in a proprietary character; the role is structurally bound to the geography.

### Tier 2 — Canon-Substitute Required (Branded Private Identities)

Real names that are private brands or carry distinctive proprietary character. Two reasons to substitute: (a) likeness/IP risk, (b) story autonomy — the role should be free for the simulation to write into without being locked to a real corporate persona.

**Tier-2 entities — query INSTITUTIONS.md for canon-substitute, or escalate:**

- **Private health systems:** Kaiser Permanente, Sutter Health, Dignity Health, John Muir Health
- **Named community-health orgs:** La Clínica de la Raza, Roots Community Health, Asian Health Services, Lifelong Medical Care
- **Architecture firms:** Perkins&Will, HOK, Gensler, ZGF Architects
- **Construction firms:** Turner Construction, Webcor, Bay Bridge Constructors, Swinerton, Rudolph and Sletten
- **Named advocacy/community orgs with proprietary identity:** Unity Council, Greenlining Institute, EBASE
- **Named individual public schools** (the district name is tier 1; individual schools are tier 2 because they have their own identity, principals, athletic histories): Skyline, Castlemont, McClymonds, Oakland Tech, Fremont
- **Named courthouses (named after specific persons):** Rene C. Davidson Courthouse, Wiley W. Manuel Courthouse — court system itself is tier 1
- **Real Bay Area tech companies as named partners:** Stripe, Salesforce, Google, Apple, Meta — use canon roster (Varek, supplemental_tech_landscape_c84)
- **Private universities and colleges:** Mills College, Holy Names University, USF, Saint Mary's
- **National sports franchises (other than the canon Athletics):** Warriors, 49ers, Giants

The test: name is a private brand OR locks in a proprietary character; using it constrains story freedom; using it creates likeness/IP risk.

### Tier 3 — Always Blocked (Real Individuals)

Real people with documented histories. Politicians, executives, real reporters, real commissioners, real journalists, real authors, real activists. Never reference. No exceptions.

The test: this is a real human being whose actions and statements are part of the public record.

---

## Three-Question Test

Before introducing any real-world entity into your output:

1. **Is this a real individual (politician, executive, reporter, etc.)?** → tier 3, BLOCK.
2. **Is this a branded private entity or named org with proprietary identity?** → tier 2, query INSTITUTIONS.md for canon-substitute. If none exists, escalate per §Escalation.
3. **Is this a public-geographic function with a name that identifies place or function?** → tier 1, use directly. No canon-substitute needed.

If you can't tell which tier: query INSTITUTIONS.md (it's organized by tier). If still uncertain: escalate.

---

## Invention Authority

### Free to invent (small-scale)

You may introduce these without escalation, provided they cohere with canon:

- New citizens (required fields: Name, Age via `2041 − BirthYear`, Neighborhood, Occupation)
- Small businesses (corner restaurants, neighborhood shops, single-location services)
- Community groups, advocacy orgs, mutual-aid networks at neighborhood scale
- Workplace teams, project subgroups, internal departments
- Supporting characters within existing canon institutions

### Requires canon support (large-scale tier-2 entities)

You may NOT invent these without explicit editorial sign-off:

- Private health systems (Kaiser-class)
- Architecture or construction firms at major-Bay-Area scale
- Branded community orgs with proprietary identity (Unity Council, La Clínica class)
- Major civic agencies, regional authorities not already in canon
- Tech companies above ~50 employees as named partners
- Sports franchises (A's are canon — others not invented without editorial)

If a story requires a tier-2 institution that doesn't exist in canon AND isn't in INSTITUTIONS.md: **flag for editorial.** Do not fabricate.

### Tier-1 entities don't require invention

Tier-1 institutions are already-real public-civic functions you can name directly. Don't invent canon-substitutes for them — that creates needless parallel-world complexity. Just use the real name.

---

## Canon Check Pattern

Before introducing any large-scale entity, query canon via the GodWorld MCP server:

| Need | Tool |
|------|------|
| Citizen | `mcp__godworld__lookup_citizen(name)` |
| Initiative | `mcp__godworld__lookup_initiative(name)` |
| Published canon | `mcp__godworld__search_canon(query)` |
| City state | `mcp__godworld__search_world(query)` |
| Council member | `mcp__godworld__get_council_member(district)` |
| Neighborhood | `mcp__godworld__get_neighborhood(name)` |
| A's roster | `mcp__godworld__get_roster(team)` |
| Tier classification + canon-substitute | read [[canon/INSTITUTIONS]] |

If query returns nothing AND the entity is tier 2: escalate, don't fabricate. Tier 1 entities don't need MCP confirmation — they're real public functions usable as named.

---

## Escalation Pattern

When you can't resolve a tier-2 canon question:

1. **Stop the generation step you're on.**
2. **Note in your output's CONTINUITY NOTES section:**
   `EDITORIAL FLAG: [story X requires tier-2 institution Y, not in canon. Suggested resolution: invent canon-substitute / drop subplot / await editorial.]`
3. **Continue with available canon** — produce a partial output rather than fabricating. Drop the subplot or write around the gap.
4. **Editorial review will resolve** before publish.

The escalation pattern is the relief valve. Without it, agents fabricate when stuck. With it, gaps surface and either get filled (INSTITUTIONS.md grows) or the story changes shape (subplot drops). Either outcome beats fabrication.

---

## Why This Exists

The S172 post-mortem identified ~20 real-world Oakland institutional references in E92 as fourth-wall contamination, and project halt was declared. The S174 three-tier reframe revisits that assessment.

The post-mortem's no-fly list was tier-blind: it lumped public-geographic functions (AHS, OUSD, Highland, HCAI, public unions, Building Trades Council) together with branded private entities (Kaiser, Perkins&Will, Turner Construction, La Clínica, Unity Council). That collapsed two different problems into one.

- **Public-geographic names** were never the issue. Using "Alameda Health System" doesn't import a separate world — it's how any reporter would name the county public health authority. Story freedom isn't constrained; IP isn't at risk.
- **Branded private names** were the actual issue. Using "Kaiser" or "Perkins&Will" locks the simulation into a proprietary corporate identity, constrains story autonomy, and creates likeness risk.

The mechanical layer (LENS, RULES, escalation, INSTITUTIONS) is correct. The list contents were wrong. The three-tier reframe corrects the contents.

The actual contamination count in E92 — measured under the corrected framework — is closer to 6–8 (the tier-2 entities: Perkins&Will, Turner, Webcor, Bay Bridge Constructors, named individual high schools, Rene C. Davidson by name, Kaiser-class operators). Smaller problem than the halt narrative implied. Halt was the right stop-gap given the mood at the time, but resumption requires the corrected framework, not deeper sanitization on the over-aggressive list.

---

## Appendix — Per-Agent RULES.md Template

Every generative agent's `RULES.md` gets a `## Canon Fidelity` section using this template. Reviewer agents get a related variant (see "Reviewer variant" below).

### Generator template

```markdown
## Canon Fidelity

**Always read first:** [[canon/CANON_RULES]] — three-tier framework, canon check pattern, escalation. Plus [[canon/INSTITUTIONS]] for tier classifications and canon-substitute names.

### Your Scope

[ONE PARAGRAPH — what this agent covers, what they produce. Be specific about domain and section ownership.]

### Invention Authority — Per-Agent Delta

Beyond the shared rules in CANON_RULES.md:

- **You may invent:** [agent-specific list — usually small-scale color]
- **You may NOT invent (requires editorial):** [agent-specific tier-2 categories — branded private institutions in this agent's beat]
- **You must canon-check (tier-2):** [per-agent triggers — categories where this agent is most likely to default to training-data branded names]
- **Tier-1 entities you may name directly:** [public functions in this agent's beat — e.g. AHS, OUSD, OPD, BART, the public unions, etc.]

### Escalation in This Section

If your story requires a tier-2 institution that's not in canon: write the story without naming the institution, add CONTINUITY NOTE flagging the gap, finish your section. Don't drop the story; don't fabricate the brand name. Tier-1 entities can be named freely.
```

### Reviewer variant

For Rhea, cycle-review, Mara, capability-reviewer, final-arbiter, engine-validator. They read canon, they don't generate.

```markdown
## Canon Fidelity Audit

**Always read first:** [[canon/CANON_RULES]] — what generators are bound by. [[canon/INSTITUTIONS]] — tier classifications.

### What You Check For

When auditing edition content, flag any of:
- Tier-3 violations (real individuals named)
- Tier-2 violations (branded private entities named without canon-substitute)
- Tier-2 entities not in INSTITUTIONS.md or canon containers — flag, don't auto-block
- Failure to escalate (CONTINUITY NOTE absent when the article references something not in canon)

### What You Do NOT Flag

- Tier-1 entities named directly. Public-geographic functions (AHS, OUSD, Highland, HCAI, public unions, public courthouses by court-system name, OPD, BART, AC Transit, Building Trades Council, Workforce Development Board, etc.) are canon-permissible. They are NOT contamination.

### Severity

- Named tier-3 entity (real individual) → **BLOCK publish**
- Named tier-2 entity without canon-substitute → **BLOCK publish**
- Plausible tier-2 entity not yet in INSTITUTIONS.md → flag, escalate to editorial; don't auto-block
- Missing escalation note when fabricating was avoided → flag for next-cycle process improvement

### What You Don't Do

You don't rewrite. You don't fabricate corrections. You flag with citation (line number, exact phrase, why it violates) and let editorial resolve.
```

---

## Maintenance

- **Tier-2 list grows when new violations are found.** Append, never delete.
- **Tier-1 list grows when new public-civic categories surface** (e.g., a new public agency the simulation encounters). Append.
- **Tier-3 is rule, not list** — never enumerate real individuals; the prohibition is categorical.
- **INSTITUTIONS.md grows when editorial fills tier-2 canon-substitutes.** That's a separate file's job.
- **This file changes when the rules themselves change** — a new tier, a new escalation pattern, a new MCP tool to canon-check against. Otherwise stable.
- **Update `updated:` field on any content edit.**
