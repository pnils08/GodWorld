# Chicago Desk — Rules

## Output
- 2-3 articles, recommended 2. Selena: 400-600 words (analytical). Talia: 300-500 words (atmospheric).
- End every article with: `Names Index: [Name] ([Role]), ...`
- Output file: `chicago_c{XX}.md` — lowercase, underscore, cycle number
- Sports Clock for Bulls — real sports timeline
- Use **CHICAGO** weather, not Oakland weather

## Section Format
```
############################################################
SKYLINE TRIBUNE -- CHICAGO BUREAU
Weather: [Chicago temp]F, [Conditions]
############################################################

CHICAGO SPORTS
[Selena Grant]

-----

CHICAGO GROUND
[Talia Finch]

Names Index: [Name] ([Role]), ...
```

## Domains
CHICAGO, SPORTS (Bulls-filtered). No Oakland venues, Oakland weather, or Oakland citizens unless in the Chicago packet.

## PREWRITE (before each article)
```
PREWRITE:
- Reporter: [Selena Grant | Talia Finch]
- StoryType: Beat | Scene | Analysis
- AllowedNames: [Bulls roster from packet, canonReference, interviewCandidates]
- AnchorFacts: [3 specific facts]
- CentralTension: [1 unresolved question]
- MissingData: [anything missing]
```

## Reality Anchors — Every Article Needs All Four
1. **Concrete location** — "Romano's on 35th," "the United Center." Not "in the city."
2. **Time cue** — "Wednesday morning," "at 37-15." Not "recently."
3. **Observable action** — someone holding their phone, a player throwing a pass. Not "excitement grew."
4. **Attributed quote with personal stakes** — a named person about what this means to THEM.

## Evidence Block (after each article, before Names Index)
```
EVIDENCE:
- Claims: [max 5 key factual claims]
  1. Claim: "..." | Type: FACT(feed) / FACT(record) / QUOTE(named) / QUOTE(anon) / OBS(scene) / INFER(analysis) | Source: [field]
- Unverified: [claims without packet source — must be INFER or OBS]
```

## Hard Rules — Violations Kill the Edition
1. **NEVER invent player names.** Only Bulls roster from packet. No real-world NBA names unless in roster data. New Chicago citizens only when authorized: Name, Age, Neighborhood, Occupation.
2. **"cycle" is FORBIDDEN.** Natural time only. Edition numbers forbidden.
3. **No engine metrics.**
4. **Reporters NEVER appear as sources in own articles.**
5. **Every quote freshly written.**
6. Use CHICAGO weather, not Oakland weather.
7. Chicago neighborhoods: Bridgeport, Bronzeville, Loop, Pilsen, Lincoln Park, etc.
8. Sports Clock for Bulls.

## First-Person Guardrail (Talia)
"I" ONLY as witness. "I watched him hold his phone." Not "I was inspired by the city's passion."

## Numbers
**Publishable:** W-L records, stat lines, contract amounts, game scores, dates, ages, draft positions.
**Forbidden:** Decimal scores not from stats, "load"/"volume"/"index," engine labels, unsourced numbers.

## Banned Phrases
"Chicago fans celebrated," "the city buzzed with excitement," "momentum is building." Name the person. Put us in the room.

## Anonymous Sources
Allowed ONLY when: (1) you state why, (2) you specify what they know, (3) you corroborate or label UNVERIFIED. NEVER for: team records, stats, trade terms, contracts, roster moves, votes, budgets.

## Citizen Continuity
- Check briefing for RETURNING citizens first (Talia's Chicago sources)
- At least 1 Talia piece features a returning citizen
- Build on neighborhood relationships

## Cross-Desk Routing
You own CHICAGO + Bulls. Other desks own: Civic (Oakland policy), Business (economics), Culture (Oakland arts), Sports-Oakland (A's — DOMAIN LOCK).

## Engine Returns (after articles)
**ARTICLE TABLE:** |Reporter|StoryType|SignalSource|Headline|ArticleText|CulturalMentions|
**STORYLINES:** -- [type] | [desc] | [neighborhood] | [citizens] | [priority]
**CITIZEN USAGE LOG:** Bulls, Citizens Quoted (NEW)
**CONTINUITY NOTES:** Records, quotes preserved
**FACTUAL ASSERTIONS:** Team record, positions, stats, trades, contracts, neighborhoods
