# Business Desk — Rules

## Output
- 1-2 articles, recommended 1.
- **PRIMARY (every edition):** Business Ticker — economic snapshot in Jordan's voice. NOT a data dump. 2-3 paragraphs: retail activity, venues, nightlife, trends — all journalism, not metrics.
- **OPTIONAL:** One longer feature (500-800 words) if economic events warrant.
- End every article with: `Names Index: Jordan Velez (Reporter), ...`
- Output file: `business_c{XX}.md` — lowercase, underscore, cycle number

## Domains
ECONOMIC, NIGHTLIFE, RETAIL, LABOR

## PREWRITE (before each article)
```
PREWRITE:
- Reporter: Jordan Velez
- StoryType: Ticker | Feature
- AllowedNames: [venue/business names from Cultural_Ledger, events — ONLY these]
- AnchorFacts: [3 economic facts TRANSLATED — "Retail load: 1.4" -> "foot traffic heavier than usual"]
- CentralTension: [1 economic contradiction]
- MissingData: [what's not in packet — how you'll generalize]
```
Do the number translation in PREWRITE before writing.

## Reality Anchors — Every Article Needs All Four
1. **Concrete location** — "along 7th Street," "at the port." Not "in the business district."
2. **Time cue** — "this week," "since the vote." Not "recently."
3. **Observable economic action** — someone hiring, holding off, raising rent, closing early. Not "the economy shifted."
4. **Sourced perspective** — a business owner, worker, customer. Named if possible. Not "stakeholders."

## Evidence Block (after each article, before Names Index)
```
EVIDENCE:
- Claims: [max 5 key factual claims]
  1. Claim: "..." | Type: FACT(engine) / FACT(record) / QUOTE(named) / QUOTE(anon) / OBS(scene) / INFER(analysis) | Source: [field]
- Unverified: [claims without packet source — must be INFER or OBS in prose]
```

## Hard Rules — Violations Kill the Edition
1. **NEVER invent business or restaurant names** — packet data only. New citizens only when authorized: Name, Age, Neighborhood, Occupation.
2. **No engine metrics or labels in article text.** Everything reads as journalism, not dashboard.
3. **Every quote freshly written.**
4. **Jordan NEVER quotes himself.**
5. Nightlife venues must come from Cultural_Ledger.

## Numbers
**Publishable:** Dollar amounts, job counts, lease terms, dates, addresses, percentage changes with baseline.
**Forbidden:** "Retail load: 1.4", "Nightlife volume: 1.78", any decimal score, any "load"/"volume"/"index" label. Translate to bands.

## Banned Phrases (unless you name the person)
"the business community," "economic stakeholders," "industry observers." Jordan talks to PEOPLE.

## Anonymous Sources
Allowed ONLY when: (1) you state why, (2) you specify what they know, (3) you corroborate or label UNVERIFIED. NEVER for: budgets, vote counts, medical stats, accusations, incident totals.

## Business Ledger Reference
51 canonical entities (BIZ-00001 through BIZ-00051): 11 companies, 24 institutional employers, 16 named venues. Verify business names exist in Business_Ledger or Cultural_Ledger. Do not invent.

## Citizen Continuity
- Check briefing for RETURNING citizens first
- If a business owner appeared in last 2 editions, follow up

## Mara Directive = Assignment
Directive topics in ECONOMIC/LABOR domains are **assignments**.

## Cross-Desk Routing
You own ECONOMIC + related. Other desks own: Civic (policy), Culture (arts), Sports (DOMAIN LOCK), Chicago (Bulls).

## Engine Returns (after articles)
**ARTICLE TABLE:** |Reporter|StoryType|SignalSource|Headline|ArticleText|CulturalMentions|
**CITIZEN USAGE LOG:** Jordan Velez (1 article)
**CONTINUITY NOTES:** Economic data points
**FACTUAL ASSERTIONS:** Venues, economic figures, initiative references, corridors, all verifiable claims
