# SUPPLEMENTAL EDITION TEMPLATE v1.0

**Purpose:** Guide the production of supplemental editions — deep-dive, single-topic coverage that builds canon beyond what the Cycle Pulse can hold. Supplementals are passion pieces, breaking news specials, color journalism, and ESPN-style sports features.

-----

## WHAT SUPPLEMENTALS ARE

The Cycle Pulse is the weekly paper — a reaction to the week that was. Supplementals are the **magazine**:

- **Breaking News** — Major developments that would dominate a Cycle Pulse (initiative releases, rendering drops, vote results)
- **Deep Dives** — Canon-building exploration of one topic from multiple angles (A's offseason, Baylight details, council position tracker)
- **Color Journalism** — The soul of Oakland that doesn't fit in a news cycle (best tacos on International, Temescal street life, faith community profiles, neighborhood texture)
- **Sports Specials** — ESPN-style coverage of team events (trades, signings, roster moves, season previews)
- **Wire Breaks** — MintConditionOakTown or TWS Wire breaking a rumor or leak

**One story. Many angles. Deep canon.**

-----

## CANON RULES (SAME AS CYCLE PULSE)

1. **NEVER invent citizen names.** Use ONLY names from canon sources, ledgers, or the topic brief.
2. **No engine metrics in article text.** Translate data into journalism.
3. **Verify names** against canon references before use.
4. **New canon figures** must be logged in Citizen Usage Log with full details.
5. **Use exact section headers for intake format.** The engine parser matches these literally.

-----

## FORMATTING CONVENTIONS

Same as Cycle Pulse Template v1.4:
- **Deck lines** under every headline
- **Standardized bylines:** `By [Name] | Bay Tribune [Beat]`
- **Opinion markers:** `[OPINION]` tag for P Slayer, Farrah Del Rio, Elliot Graye
- **Photo credits:** `[Photo: DJ Hartley / Bay Tribune]` — 1-2 per supplemental
- **Cross-references:** `→ See also:` when connecting to past or future Cycle Pulse coverage
- **Countdown clocks** on any initiative with active deadline

-----

## HEADER FORMAT

```
############################################################
THE CYCLE PULSE — SUPPLEMENTAL EDITION
[TOPIC TITLE IN CAPS]
[TIMING CONTEXT] | [OPTIONAL SUBTITLE]
############################################################
```

Examples:
```
THE CYCLE PULSE — SUPPLEMENTAL EDITION
BAYLIGHT DISTRICT: THE FULL PICTURE
Post-Cycle 73 | Public Release

THE CYCLE PULSE — SUPPLEMENTAL EDITION
CYCLE 76 | OAKLAND ALTERNATIVE RESPONSE INITIATIVE: BREAKING RELEASE

THE CYCLE PULSE — SPECIAL EDITION
Oakland Media Digest — Offseason 2040-41
Dynasty Dismantled | Front Office Earthquake | New Era Begins
```

-----

## BODY SECTIONS (FLEXIBLE)

Unlike the Cycle Pulse, supplementals have **no fixed section order**. The story dictates the structure. Mags designs the coverage plan — which sections to include, which reporters to assign, what angles to pursue.

### Available Section Types

Pick what fits the story. Not all are required. Order follows editorial logic, not template hierarchy.

| Section | Purpose | Typical Reporter |
|---------|---------|-----------------|
| **BREAKING / FRONT PAGE** | The news itself — what happened, what it means | Carmen Delaine, lead civic reporter |
| **THE RENDERING / VISUAL** | What it looks like, cultural/aesthetic analysis | Maria Keen |
| **BY THE NUMBERS** | Full data breakdown, tables, financial details | Jordan Velez |
| **ANALYSIS** | Political landscape, vote math, approval path, implications | Carmen Delaine |
| **WORKFORCE / IMPACT** | Street-level consequences, jobs, displacement, access | Luis Navarro |
| **COMMUNITY RESPONSE** | Organized group reactions, advocacy positions | Maria Keen or Luis Navarro |
| **CITIZEN VOICES** | 4-6 named citizens reacting to the topic | Luis Navarro |
| **OPINION (LONG VIEW)** | Historical perspective, institutional memory | Hal Richmond |
| **OPINION (STREET)** | Personal/emotional take, accountability pressure | P Slayer, Farrah Del Rio |
| **LETTERS FROM READERS** | 3-5 citizen letters responding to the topic | (citizen voices) |
| **WIRE / SOCIAL** | MintConditionOakTown thread, TWS Wire report | Mint, Reed Thompson, Celeste Tran |
| **SPORTS ANALYSIS** | Statistical deep dive, trade value, roster projection | Anthony |
| **SPORTS FAN VOICE** | Emotional reaction, fan perspective | P Slayer |
| **SPORTS HISTORY** | Franchise context, dynasty narrative | Hal Richmond |
| **VOTE TRACKER** | Council position table with projections | Carmen Delaine |
| **TIMELINE** | Key dates, approval pathway, implementation schedule | Compiled |

### Section Dividers

Use the same `############` header blocks as the Cycle Pulse:
```
############################################################
[SECTION NAME]
############################################################
```

-----

## CITIZEN VOICE GUIDELINES

Supplementals feature **deeper citizen engagement** than regular editions. Each citizen voice should:

- Be a **named person** with age, neighborhood, and occupation
- React **specifically to the topic** — not generic sentiment
- Show a **distinct perspective** (support, skepticism, opposition, conditional support, adjacent concern)
- Include **direct quotes** — 2-4 sentences of authentic voice
- Connect to the citizen's **lived experience** — why this topic matters to them personally

Aim for **4-6 citizen voices** across the supplemental. Spread across neighborhoods. Include at least one skeptic and one advocate.

-----

## VOTE TRACKER FORMAT

For civic supplementals covering initiatives approaching a vote:

```
|Member         |District|Faction|Position      |Notes                       |
|---------------|--------|-------|--------------|----------------------------|
|Denise Carter  |D1      |OPP    |**YES**       |Champion, her district      |
|Rose Delgado   |D3      |OPP    |**YES**       |Bloc discipline             |
|Ramon Vega     |D4      |IND    |**Undecided** |Swing vote                  |
...

**Current count:** X YES, X Lean YES, X Undecided, X Lean NO, X Unknown
**Required:** [Simple majority 5-4 / Supermajority 6-3]
**Path to passage:** [Specific vote combination]
```

-----

## INTAKE FORMAT (ALWAYS PRESENT)

Every supplemental ends with the same engine-facing format as the Cycle Pulse. This is how supplemental canon integrates back into the simulation.

### Article Table

```
############################################################
ARTICLE TABLE — ENGINE INTAKE FORMAT
############################################################

|Reporter      |StoryType|SignalSource    |Headline                        |ArticleText                              |CulturalMentions|
|--------------|---------|---------------|--------------------------------|-----------------------------------------|----------------|
|Carmen Delaine|breaking |civic-initiative|Headline here                   |One-line summary of article content      |                |
```

**StoryType options:** breaking, feature, analysis, opinion, tracker, news, wire, social
**SignalSource options:** civic-initiative, civic-project, sports-roster, sports-game, culture-event, editorial, wire-report, social-media

### Storylines Updated

```
############################################################
STORYLINES UPDATED
############################################################

NEW INFORMATION:
— [Bullet list of new canon facts established]

PHASE CHANGES:
— [Initiative/storyline]: [OLD STATUS] → [NEW STATUS]
```

### Citizen Usage Log

```
############################################################
CITIZEN USAGE LOG
############################################################

CIVIC OFFICIALS:
— [Name] ([Role])

JOURNALISTS:
— [Name] ([N] articles)

CITIZENS QUOTED:
— [Name], [Age], [Neighborhood], [Occupation] ([context])
```

### Continuity Notes

```
############################################################
CONTINUITY NOTES
############################################################

[Key numbers, timeline milestones, political landscape, canon facts
that future editions and supplementals must respect]
```

### End Marker

```
# ================================================================================
END SUPPLEMENTAL EDITION — [TOPIC]
[Cycle/Timing] | Ready for Engine Integration
```

-----

## SUPPLEMENTAL TYPES — QUICK REFERENCE

### Breaking News Supplemental
**When:** Major development drops (initiative release, rendering, vote result)
**Team:** Carmen (news + analysis) + Jordan (numbers) + Luis (citizen voices) + Farrah or P Slayer (opinion)
**Sections:** Front Page → Analysis → By the Numbers → Citizen Voices → Opinion → Continuity
**Length:** 5-8 articles, 4,000-8,000 words

### Deep Dive Supplemental
**When:** A topic needs full canon treatment (Baylight details, health center proposal, offseason moves)
**Team:** Lead reporter + Maria (visual/cultural) + Jordan (numbers) + Hal (history) + P Slayer (reaction) + Luis (citizen voices)
**Sections:** Front Page → Rendering/Visual → Numbers → Workforce/Impact → Political Landscape → Opinion × 2 → Letters
**Length:** 7-10 articles, 6,000-12,000 words

### Color Supplemental
**When:** Oakland soul needs space (neighborhood profiles, food, faith, culture, seasonal texture)
**Team:** Maria Keen (lead) + Luis (voices) + P Slayer or Simon Leary (personal essay)
**Sections:** Feature → Neighborhood Texture → Citizen Voices → Personal Essay → Letters
**Length:** 3-5 articles, 3,000-6,000 words

### Sports Special
**When:** Major team event (trades, signings, roster overhaul, season preview, playoff moment)
**Team:** Anthony (analysis) + P Slayer (fan voice) + Hal (history) + Tanya Cruz (social/breaking) + Mint (if rumor/leak)
**Sections:** Breaking → Analysis → Fan Voice → History → Wire/Social → Continuity
**Length:** 4-6 articles, 4,000-8,000 words

### Wire Break
**When:** Mint or TWS Wire breaks a rumor/leak that needs immediate coverage
**Team:** Mint or Reed Thompson (wire report) + relevant beat reporter (reaction/analysis) + P Slayer (street take)
**Sections:** Wire Report → Analysis → Reaction → Continuity
**Length:** 2-4 articles, 2,000-4,000 words

-----

## PRODUCTION NOTES

- Supplementals are **not tied to the engine cycle**. They can drop anytime.
- They **do not require desk packets**. Data comes from Mags' topic brief, Supermemory archive, user-provided canon, or desk packets when relevant.
- Agent teams are **custom per supplemental**. Mags assigns the beats based on the story.
- Supplementals use the **same Supermemory ingest and Drive upload** pipeline as regular editions.
- File naming: `editions/supplemental_{topic_slug}_c{XX}.txt` (or `special_edition_{topic_slug}.txt` for non-cycle-tied specials)
