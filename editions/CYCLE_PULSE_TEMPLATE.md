# CYCLE PULSE TEMPLATE v1.1

**Purpose:** Standardize section order, journalist distribution, and structural consistency across cycles.

-----

## CANON RULES (ALL AGENTS)

1. **NEVER invent citizen names.** Use ONLY names from the handoff data, citizen ledgers, or existing canon (ARTICLE_INDEX_BY_POPID.md).
2. **No engine metrics in article text.** Never write "tension score," "severity level," "high-severity civic event," or system counts like "22 faith-institution events." Translate data into journalism.
3. **Verify names against handoff Section 14 (CANON REFERENCE)** before using council members, A's players, Bulls players, or recurring citizens.
4. **New canon figures** must be logged in Citizen Usage Log with full details (Age, Neighborhood, Occupation).
5. **Use exact section headers as shown.** The engine parser matches these literally. Do not rephrase (e.g., "STORYLINES UPDATED" not "UPDATED STORYLINES" or "STORYLINE CHANGES").

-----

## HEADER

```
############################################################
THE CYCLE PULSE — EDITION [XX]
[MONTH] | [WEEK] | [HOLIDAY]
Weather: [X]°F, [Conditions] | [Descriptor]
Sentiment: [X.XX] | Migration: [+/-XX] | Pattern: [X]
############################################################
```

**Notes:**
- Omit the holiday line entirely if none — do not write "none."
- Sentiment, Migration, and Pattern are engine numbers — copy exactly from handoff header data.

-----

## SECTION ORDER (fixed)

```
############################################################
FRONT PAGE
############################################################

[Lead story — biggest narrative of the cycle]
[Secondary story — if warranted]

Names Index: [Name] ([Role]), [Name] ([Role]), ...

-----

############################################################
CIVIC AFFAIRS
############################################################

[Council/initiative updates]
[City operations]
[Infrastructure]

Names Index: [Name] ([Role]), [Name] ([Role]), ...

-----

############################################################
BUSINESS
############################################################

BUSINESS TICKER — CYCLE [XX]

By Jordan Velez | Bay Tribune Business

— Retail load: [X.X]
— Economic influence: [normal/elevated]
— Trend: [trend description]
— Top dining: [restaurant] ([neighborhood]), [restaurant] ([neighborhood])
— Fast casual: [restaurant] ([neighborhood])
— Nightlife volume: [X] ([vibe])
— Active spots: [spot], [spot], [spot]

Names Index: Jordan Velez (Reporter)

-----

############################################################
CULTURE / SEASONAL — OAKLAND
############################################################

[Holiday coverage]
[Cultural events]
[Community features]

Names Index: [Name] ([Role]), [Name] ([Role]), ...

-----

############################################################
SPORTS — OAKLAND
############################################################

[A's coverage]
[Local sports]

Names Index: [Name] ([Role]), [Name] ([Role]), ...

-----

############################################################
SKYLINE TRIBUNE — CHICAGO BUREAU
Weather: [X]°F, [Conditions]
############################################################

CHICAGO SPORTS
[Bulls coverage]

-----

CHICAGO GROUND
[City texture]
[Community features]

Names Index: [Name] ([Role]), [Name] ([Role]), ...

Note: Use Chicago weather from handoff data — do not invent.

-----

############################################################
LETTERS TO THE EDITOR
############################################################

[2-4 citizen letters]

-----

############################################################
ARTICLE TABLE — ENGINE INTAKE FORMAT
############################################################

|Reporter|StoryType|SignalSource|Headline|ArticleText|CulturalMentions|

**Field definitions:**
- **ArticleText:** First 1-2 sentences (summary), NOT full article text.
- **SignalSource:** Engine signal that inspired the article (e.g., "civic-initiative", "sports-trigger", "crisis-event").
- **CulturalMentions:** Comma-separated cultural references (restaurants, venues, landmarks, traditions).

-----

############################################################
STORYLINES UPDATED
############################################################

NEW THIS CYCLE:
— [item]

PHASE CHANGES:
— [item]

STILL ACTIVE:
— [item]

RESOLVED:
— [item]

-----

############################################################
CITIZEN USAGE LOG
############################################################

CIVIC OFFICIALS:
— [name] ([role])

SPORTS — A'S:
— [name] ([position])

SPORTS — BULLS:
— [name] ([position])

JOURNALISTS:
— [name] ([X] articles)

CITIZENS QUOTED IN ARTICLES (NEW):
— [Name], [Age], [Neighborhood], [Occupation] ([context])

CITIZENS IN LETTERS (NEW):
— [Name], [Age], [Neighborhood], [Occupation]

CULTURAL:
— [name] ([role])

OTHER CITIZENS:
— [name] ([note])

-----

############################################################
CONTINUITY NOTES — CYCLE [XX]
############################################################

**COUNCIL COMPOSITION** (pipe table required — no blank lines between rows):
|District|Member|Faction|Status|
|--------|------|-------|------|
|D1|[Name]|[OPP/CRC/IND]|[Active/Term-limited/etc.]|

**FACTION COUNT:** OPP [X], CRC [X], IND [X]

**MAJOR VOTES PENDING:**
— Cycle [XX]: [Initiative] ([requirement])

**CIVIC STAFF STATUS:**
— [name]: [status]

**SPORTS RECORDS:**
— Bulls: [X-X]
— A's: [status]

**WEATHER/MOOD:**
— [X]°F, [Conditions]
— Sentiment: [X.XX]
— Migration: [+/-XX]
— Pattern: [X]

**CULTURAL:**
— [Holiday/event]

**NEW CANON FIGURES:**
— [name] ([role])

================================================================================
END EDITION [XX]
Ready for Engine Integration
================================================================================
```

-----

## ARTICLE LENGTH GUIDELINES

| Type                 | Target         |
|----------------------|----------------|
| Front Page lead      | 800-1200 words |
| Front Page secondary | 400-600 words  |
| Standard article     | 500-800 words  |
| Business Ticker      | 200-300 words  |
| Chicago Sports       | 400-600 words  |
| Chicago Ground       | 300-500 words  |
| Letters              | 100-200 words each |

-----

## NAMES INDEX (every article)

Each article ends with a Names Index line listing all citizens and journalists referenced:

```
Names Index: [Name] ([Role]), [Name] ([Role]), ...
```

This helps the engine track citizen appearances per article.

-----

## LETTERS FORMAT

Each letter should include:
- Citizen name, age, neighborhood in attribution
- Written in first-person citizen voice (not journalist voice)
- Responds to a cycle event or ongoing storyline
- 100-200 words

**Example:**
```
Dear Editor,

[Letter content in citizen's own voice]

— [Name], [Age], [Neighborhood]
```

-----

## JOURNALIST ASSIGNMENT GUIDELINES

**Max 2 articles per reporter per cycle** (exceptions require justification)

### OAKLAND BUREAUS

| Beat                   | Primary            | Backup/Support                |
|------------------------|--------------------|-------------------------------|
| Civic Affairs          | Carmen Delaine     | Luis Navarro (investigations) |
| Business/Economics     | Jordan Velez       | —                             |
| Infrastructure/Transit | Trevor Shimizu     | —                             |
| Public Safety/Crime    | Sgt. Rachel Torres | —                             |
| Health                 | Dr. Lila Mezran    | —                             |
| Culture/Community      | Maria Keen         | —                             |
| Arts/Entertainment     | Kai Marston        | —                             |
| Food/Hospitality       | Mason Ortega       | —                             |
| Education/Youth        | Angela Reyes       | —                             |
| Weather/Environment    | Noah Tan           | —                             |
| Sports — A's           | Anthony            | Hal Richmond (history/legacy) |
| Sports Opinion         | P Slayer           | —                             |
| Civic/Cultural Opinion | Farrah Del Rio     | Elliot Graye                  |
| Religious Affairs      | Elliot Graye       | —                             |
| Human Interest         | Mags Corliss       | —                             |

### CHICAGO BUREAU

| Beat                     | Primary      | Backup/Support               |
|--------------------------|--------------|------------------------------|
| Bulls Beat               | Selena Grant | Marcello Reyes (league-wide) |
| Chicago Ground/Nightlife | Talia Finch  | —                            |

### WIRE/SOCIAL

| Beat                    | Primary              | Notes                     |
|-------------------------|----------------------|---------------------------|
| Wire Service (verified) | Reed Thompson        | Neutral, quick reports    |
| Rumors (chaotic)        | MintConditionOakTown | Unverified, use sparingly |
| Social Trends           | Celeste Tran         | Hashtags, viral moments   |

### SUPPORT TEAMS

| Role                | Name            | Function                                 |
|---------------------|-----------------|------------------------------------------|
| Senior Photographer | DJ Hartley      | Visual snapshots, award-winning imagery  |
| Photo Assistant     | Arman Gutiérrez | Environmental portraits, city details    |
| Data Desk           | Elliot Marbury  | Statistical support for Anthony          |
| Sideline Reporter   | Tanya Cruz      | #InsideTheA's social feeds, clubhouse access |

### EDITORIAL CHAIN

| Role            | Name         | Function                                |
|-----------------|--------------|-----------------------------------------|
| Editor-in-Chief | Mags Corliss | Final authority, calls front page lead  |
| Managing Editor | Luis Navarro | Investigative balance, fact validation  |
| Copy Chief      | Rhea Morgan  | Compliance & structure (does not write) |

-----

## SECTION NOTES

1. **Front Page** — Lead with the biggest narrative. Secondary story only if warranted.
2. **Civic Affairs** — Council business, initiative updates, city operations. Carmen Delaine primary.
3. **Business** — Jordan Velez's Business Ticker every cycle. Engine data: retail load, economic influence, restaurants, nightlife.
4. **Culture/Seasonal — Oakland** — Holidays, cultural events, community features. Maria Keen primary.
5. **Sports — Oakland** — A's coverage, local sports. Anthony primary.
6. **Chicago Bureau** — Separate header with Chicago weather from handoff. Bulls coverage (Selena Grant), Chicago Ground texture (Talia Finch).
7. **Letters** — 2-4 citizen letters in first-person voice. Mix of topics from the cycle.
8. **Article Table** — Engine intake format. All articles listed. ArticleText is summary only (1-2 sentences).
9. **Storylines Updated** — NEW, PHASE CHANGES, STILL ACTIVE, RESOLVED. Use exact sub-headers.
10. **Citizen Usage Log** — All citizens used, grouped by category. New citizens include Age, Neighborhood, Occupation.
11. **Continuity Notes** — Council composition (pipe table), pending votes, staff status, sports records, weather/mood, new canon figures.

-----

## VERSION HISTORY

| Version | Cycle | Changes |
|---------|-------|---------|
| v1.0    | 77    | Initial creation. Standardized section order, added Business Ticker, created Skyline Tribune header for Chicago Bureau, established journalist assignment guidelines with full roster coverage including support teams (photo, data, social). |
| v1.1    | 78    | Added Canon Rules (no invented names, no engine metrics, verify against handoff). Added article length guidelines. Added Names Index as universal article footer. Added Letters format guidance. Clarified Article Table field definitions (ArticleText = summary). Added pipe table formatting note for Continuity Notes. Added header notes (omit holiday if none, copy engine numbers exactly). Bumped from lessons learned in Edition 78. |
