# CYCLE PULSE TEMPLATE v1.2

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
STORYLINES UPDATED — ENGINE INTAKE FORMAT
############################################################
FORMAT: This feeds Storyline_Intake. Use pipe-separated fields.
Only list NEW and RESOLVED. Do NOT re-list active storylines.

NEW THIS CYCLE:
— [type] | [description] | [neighborhood] | [citizens] | [priority]
  Types: arc, thread, question, mystery, developing, seasonal, sports
  Priority: urgent, high, normal, low, background
  Example: — arc | Stabilization Fund implementation begins | West Oakland | Denise Carter, Ramon Vega | high
  Example: — thread | Warriors identity shift post-Giannis trade | Oakland | Giannis Antetokounmpo | normal

RESOLVED THIS CYCLE:
— resolved | [description of storyline being closed]
  Example: — resolved | Stabilization Fund committee vote
  This CLOSES the matching storyline in the tracker.

Do NOT list "STILL ACTIVE" storylines — they are already tracked.
Do NOT list "PHASE CHANGES" — use RESOLVED when a storyline ends.

-----

############################################################
CITIZEN USAGE LOG
############################################################
FORMAT RULES — This section feeds directly into the intake
parser. Every entry MUST follow the exact format shown.
NO parentheses inside any field — parentheses are ONLY used
for the final field (role, position, context, or count).
Street addresses go after neighborhood with no parens.

CIVIC OFFICIALS:
— [Name] ([Title, Faction])
  Example: — Denise Carter (D1 Councilmember, OPP)

SPORTS — A'S:
— [Name] ([Position — note])
  Example: — Vinnie Keane (OF/DH — final season confirmed)

SPORTS — BULLS:
— [Name] ([Position — note])
  Example: — Hank Trepagnier (C, Rookie — ROY leader)

SPORTS — WARRIORS:
— [Name] ([Position — note])

JOURNALISTS (BYLINE TRACKING ONLY — NOT CITIZEN USAGE):
— [Name] ([N] articles)
  Example: — Carmen Delaine (3 articles)
  NOTE: This section tracks reporter output for editorial
  reference. Journalists writing articles are NOT citizens
  appearing in stories — do NOT count as citizen usage or
  advancement. A journalist is only citizen usage if they
  appear AS A CHARACTER in someone else's article (e.g.,
  Anthony quoted in a civic story about his brother).

CITIZENS QUOTED IN ARTICLES (NEW):
— [Name], [Age], [Neighborhood], [Occupation] ([article context])
  Example: — Gloria Meeks, 64, West Oakland, retired postal worker (Stabilization Fund reaction)
  WRONG: — Gloria Meeks, 64, West Oakland (Linden Street), retired postal worker (context)
  All four fields required. No parens except final context.

CITIZENS IN LETTERS (NEW):
— [Name], [Age], [Neighborhood], [Occupation]
  Example: — Carla Edmonds, 58, West Oakland, retired teacher
  All four fields required. No parentheses.

CULTURAL:
— [Name] ([Role, Location])
  Example: — Dante Reyes (Muralist, KONO)

OTHER CITIZENS:
— [Name] ([note])
  Example: — Marcus Wright (returning from Edition 78)

-----

############################################################
CONTINUITY NOTES — CYCLE [XX]
############################################################
AUDIT SECTION — stays in edition text for cycle-to-cycle reference.
NOT tracked in sheets (Continuity_Loop eliminated).
Exception: DIRECT QUOTES route to LifeHistory_Log automatically.
Do NOT repeat engine-tracked data (council, votes, weather, sentiment).

**SPORTS RECORDS** (game results — audit reference only):
— Bulls: [X-X], key result: [brief]
— A's: [status], key result: [brief]

**DIRECT QUOTES PRESERVED** (→ routes to LifeHistory_Log):
— [Name]: "[quote]"
  Only include quotes that reveal character or advance storylines.
  Format matters: dash, name, colon, quoted text.

**NEW CANON FIGURES** (introduced this edition):
— [Name] ([age, neighborhood, occupation or role])
  These must also appear in Citizen Usage Log above.

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
| Data Analyst    | Rhea Morgan  | Canon verification, stats checking, data accuracy (does not write) |

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
9. **Storylines Updated** — NEW and RESOLVED only. Pipe-separated fields matching Storyline_Intake columns. Do NOT re-list active storylines.
10. **Citizen Usage Log** — All citizens used, grouped by category. Exact formats required — feeds intake parser. No parentheses inside fields. JOURNALISTS section is byline tracking only — does not feed citizen intake or advancement.
11. **Continuity Notes** — Sports records, direct quotes, new canon figures ONLY. Do not repeat engine-tracked data (council, votes, weather).

-----

## VERSION HISTORY

| Version | Cycle | Changes |
|---------|-------|---------|
| v1.0    | 77    | Initial creation. Standardized section order, added Business Ticker, created Skyline Tribune header for Chicago Bureau, established journalist assignment guidelines with full roster coverage including support teams (photo, data, social). |
| v1.1    | 78    | Added Canon Rules (no invented names, no engine metrics, verify against handoff). Added article length guidelines. Added Names Index as universal article footer. Added Letters format guidance. Clarified Article Table field definitions (ArticleText = summary). Added pipe table formatting note for Continuity Notes. Added header notes (omit holiday if none, copy engine numbers exactly). Bumped from lessons learned in Edition 78. |
| v1.2    | 79    | Fixed Citizen Usage Log format with explicit examples and no-parens rule to match intake parser. Restructured Storylines Updated to pipe-separated NEW/RESOLVED only (no STILL ACTIVE re-listing). Simplified Continuity Notes to sports records, quotes, and new canon figures only (removed redundant engine-tracked data). Added Warriors sports category. |
| v1.3    | 79    | Clarified JOURNALISTS section is byline tracking only — not citizen usage or advancement. Journalists writing articles are reporters, not characters. Only counts as citizen usage if they appear AS A CHARACTER in someone else's story. |
