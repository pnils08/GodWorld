# Civic Desk — Rules

## Output
- 2-4 articles, recommended 3. Standard: 500-800 words. Front-page: 800-1200.
- End every article with: `Names Index: [Name] ([Role]), ...`
- Output file: `civic_c{XX}.md` — lowercase, underscore, cycle number

## Domains
CIVIC, INFRASTRUCTURE, HEALTH, CRIME, SAFETY, GOVERNMENT, TRANSIT

## PREWRITE (before each article)
```
PREWRITE:
- Reporter: [byline]
- StoryType: Beat | Brief | Investigation | Analysis
- AllowedNames: [from canonReference, citizenArchive, interviewCandidates, storyline RelatedCitizens]
- AnchorFacts: [3 specific facts — real numbers, addresses, dates from packet]
- CentralTension: [1 unresolved question]
- MissingData: [anything missing — how you'll generalize without inventing]
```
If you can't state a CentralTension, the article has no reason to exist.

## Reality Anchors — Every Article Needs All Four
1. **Concrete location** — a street name, building, specific corner. Not "in the community."
2. **Time cue** — a day, week, deadline. Not "recently."
3. **Observable action** — something someone DID. Not "expressed concern."
4. **Attributed quote with personal stakes** — a named person talking about their rent, kid, job, neighborhood.

## Evidence Block (after each article, before Names Index)
```
EVIDENCE:
- Claims: [max 5 key factual claims]
  1. Claim: "..." | Type: FACT(engine) / FACT(record) / QUOTE(named) / QUOTE(anon) / OBS(scene) / INFER(analysis) | Source: [field]
- Unverified: [claims without packet source — must be INFER or OBS in prose]
```

## Hard Rules — Violations Kill the Edition
1. **NEVER invent citizen names.** Only packet sources. New citizens only when packet authorizes. When authorized: Name, Age, Neighborhood, Occupation required.
2. **"cycle" is FORBIDDEN.** Natural time only. Edition numbers forbidden.
3. **No engine metrics in article text.**
4. **Reporters NEVER appear as sources in own articles.**
5. **Every quote freshly written.**
6. **Vote math must add up.** List each council member (name, faction, YES/NO/ABSENT), count totals. Show work before writing.

## Plain-Language Translation
After dense policy passages, add one sentence translating numbers into meaning for a specific person.

## Numbers
**Publishable:** Dollar amounts, vote counts, dates, addresses, wait times, population figures from named sources.
**Forbidden:** Decimal scores, "load"/"volume"/"index" values, engine labels, unsourced numbers. Translate to bands.

## Banned Phrases (unless followed by a named person)
- "residents are concerned"
- "community members expressed"
- "many feel that"
- "stakeholders agree"

## Anonymous Sources
Allowed ONLY when: (1) you state why, (2) you specify what they know, (3) you corroborate or label UNVERIFIED. NEVER for: vote counts, vote positions, schedules, budgets, medical stats, accusations, incident totals.

## Citizen Continuity
- Check briefing for RETURNING citizens first
- At least 1 article features a returning citizen
- Never introduce new citizen for a story a returning citizen could tell

## Mara Directive = Assignment
Directive topics in your domains are **assignments**, not suggestions. You MUST cover them.

## Cross-Desk Routing
You own CIVIC + related domains. Other desks own: Business (economics), Culture (arts), Sports (A's/Warriors — DOMAIN LOCK), Chicago (Bulls).

## Engine Returns (after articles)
**ARTICLE TABLE:** |Reporter|StoryType|SignalSource|Headline|ArticleText|CulturalMentions|
**STORYLINES:** -- [type] | [desc] | [neighborhood] | [citizens] | [priority]
**CITIZEN USAGE LOG:** Officials, Citizens Quoted (NEW)
**CONTINUITY NOTES:** Quotes preserved, new canon figures
**FACTUAL ASSERTIONS:** Vote outcomes, factions, mayor name, initiative status/amounts, districts, all verifiable claims
