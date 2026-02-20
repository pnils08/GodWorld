# CYCLE PULSE TEMPLATE v1.4

**Purpose:** Standardize section order, journalist distribution, article formatting, and structural consistency across cycles. This template defines both the editorial voice and the engine-facing intake formats.

-----

## CANON RULES (ALL AGENTS)

1. **NEVER invent citizen names.** Use ONLY names from the handoff data, citizen ledgers, or existing canon (ARTICLE_INDEX_BY_POPID.md).
2. **No engine metrics in article text.** Never write "tension score," "severity level," "high-severity civic event," or system counts like "22 faith-institution events." Translate data into journalism.
3. **Verify names against handoff Section 14 (CANON REFERENCE)** before using council members, A's players, Bulls players, or recurring citizens.
4. **New canon figures** must be logged in Citizen Usage Log with full details (Age, Neighborhood, Occupation).
5. **Use exact section headers as shown.** The engine parser matches these literally. Do not rephrase (e.g., "STORYLINES UPDATED" not "UPDATED STORYLINES" or "STORYLINE CHANGES").

-----

## FORMATTING CONVENTIONS

These apply to ALL articles in ALL sections unless noted otherwise.

### Deck Lines
Every article gets a **deck line** — a one-sentence subtitle under the headline that adds context, tension, or stakes. The deck is not a summary; it's the reason someone keeps reading.

```
**Oakland Alternative Response Initiative Passes 5-4**

**Vega breaks from Stabilization Fund pattern; Tran crosses to support**

By Carmen Delaine | Bay Tribune Civic Ledger
```

### Byline Format
All bylines follow this standard:
```
By [Name] | Bay Tribune [Beat]
```
Examples:
- `By Carmen Delaine | Bay Tribune Civic Ledger`
- `By Anthony | Bay Tribune Sports`
- `By Maria Keen | Bay Tribune Culture`
- `By Selena Grant | Bay Tribune Chicago Bureau`

### Opinion Marker
Opinion pieces by P Slayer, Farrah Del Rio, and Elliot Graye get an `[OPINION]` tag:
```
By P Slayer | Bay Tribune Sports [OPINION]
```

### Photo Credits
When a scene description evokes visual imagery (street scenes, crowd shots, atmospheric moments), add a photo credit:
```
[Photo: DJ Hartley / Bay Tribune]
```
Use sparingly — 2-3 per edition, placed after atmospheric paragraphs. Arman Gutiérrez for environmental portraits.

### Cross-References
When stories in different sections connect, add a cross-reference at the end of the article (before Names Index):
```
→ See also: Civic Affairs, "Baylight Bond Vote Set for Next Week"
```

### Countdown Clocks
Any initiative with a regulatory deadline, implementation window, or policy clock gets a countdown line in every edition until resolved:
```
**OARI Implementation Clock: Day 12 of 45.** No pilot districts named. No hiring criteria released.
```
Place the countdown at the top of the relevant article, before the body text. Update the day count each edition. This builds tension across cycles and creates natural follow-up pressure. Active countdowns as of E83: OARI (45-day implementation window), Baylight TIF language (unresolved), Baylight remediation bonding (unresolved).

### Dividers
- `---` between articles within a section
- `===` between major sections (the `############` headers serve this purpose)

-----

## SECTION ORDER (fixed)

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

```
############################################################
FRONT PAGE
############################################################

[Lead story — biggest narrative of the cycle]
[Deck line]
[Byline]

---

[Secondary story — if warranted]
[Deck line]
[Byline]

Names Index: [Name] ([Role]), [Name] ([Role]), ...

############################################################
EDITOR'S DESK
############################################################

By Mags Corliss | Bay Tribune

[150-250 words. First-person. Frames the edition's theme —
what connects the stories, what the city is feeling, what
the paper is watching. Reflective, not summarizing. This is
the editor's voice setting the tone for the whole paper.]

############################################################
CIVIC AFFAIRS
############################################################

[Council/initiative updates]
[City operations]
[Infrastructure]
[Health — if public health story this cycle]
[Public safety — if crime/safety story this cycle]

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

[Community features]
[Cultural events]
[Holiday coverage]
[Weather/environment — if notable]

Names Index: [Name] ([Role]), [Name] ([Role]), ...

-----

############################################################
OPINION
############################################################

[P Slayer sports opinion — when A's or Warriors storyline warrants]
[Farrah Del Rio civic/cultural opinion — when social issue warrants]
[Elliot Graye religious/moral perspective — when faith angle exists]

Not every edition needs all three. At least 1 opinion piece per edition.
Opinion pieces get [OPINION] tag in byline.

Names Index: [Name] ([Role]), [Name] ([Role]), ...

-----

############################################################
SPORTS — OAKLAND
############################################################

[A's coverage]
[Warriors coverage — if applicable]
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
QUICK TAKES
############################################################

Short items — stories too small for full articles but worth noting.
3-5 items, ~50 words each. Any desk can contribute. Compiled by
Mags during edition assembly from leftover desk signals.

— [BEAT]: [Quick take headline] — [2-3 sentence summary]
— [BEAT]: [Quick take headline] — [2-3 sentence summary]
— [BEAT]: [Quick take headline] — [2-3 sentence summary]

-----

############################################################
WIRE / SIGNALS
############################################################

(OPTIONAL — include only when wire-worthy items exist)

Short verified wire items from Reed Thompson or social trend
observations from Celeste Tran. 2-3 items, factual, no analysis.

— [Source]: [Wire item]
— [Source]: [Wire item]

-----

############################################################
LETTERS TO THE EDITOR
############################################################

[2-4 citizen letters]

-----

############################################################
ACCOUNTABILITY
############################################################

(CONDITIONAL — include only when a stink signal exists)

[Jax Caldera investigative/accountability piece — 1 max per edition]
[Only deployed when Mags identifies: silence patterns, implementation
gaps, contradictions, or missing follow-up on major policy actions]

Names Index: [Name] ([Role]), [Name] ([Role]), ...

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

-----

############################################################
COMING NEXT CYCLE
############################################################

3-5 teaser lines previewing what the Tribune is watching.
Compiled by Mags from active storylines, pending votes, and
upcoming events. Gives readers (and agents) forward momentum.

— [Teaser line — what's coming and why it matters]
— [Teaser line]
— [Teaser line]

================================================================================
END EDITION [XX]
Ready for Engine Integration
================================================================================
```

-----

## ARTICLE LENGTH GUIDELINES

| Type                 | Target             |
|----------------------|--------------------|
| Front Page lead      | 800-1200 words     |
| Front Page secondary | 400-600 words      |
| Editor's Desk        | 150-250 words      |
| Standard article     | 500-800 words      |
| Opinion piece        | 400-700 words      |
| Business Ticker      | 200-300 words      |
| Chicago Sports       | 400-600 words      |
| Chicago Ground       | 300-500 words      |
| Quick Take item      | ~50 words          |
| Wire item            | ~30 words          |
| Letters              | 100-200 words each |
| Accountability       | 500-800 words      |

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
| Accountability         | Jax Caldera        | (freelance — conditional)     |

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

1. **Front Page** — Lead with the biggest narrative. Secondary story only if warranted. Deck lines required.
2. **Editor's Desk** — Mags Corliss, first-person. Frames the edition's theme. Not a summary — a reflection on what connects the stories. Written during compilation.
3. **Civic Affairs** — Council business, initiative updates, city operations, health, safety. Carmen Delaine primary, with beat reporters for health (Dr. Mezran), safety (Sgt. Torres), infrastructure (Shimizu), investigations (Navarro).
4. **Business** — Jordan Velez's Business Ticker every cycle. Engine data: retail load, economic influence, restaurants, nightlife.
5. **Culture/Seasonal — Oakland** — Community features, cultural events, holidays. Maria Keen leads, with Kai Marston (arts), Mason Ortega (food), Angela Reyes (education), Noah Tan (weather), Sharon Okafor (lifestyle).
6. **Opinion** — Dedicated section for opinion pieces. P Slayer (sports), Farrah Del Rio (civic/cultural), Elliot Graye (faith/moral). At least 1 per edition. All get `[OPINION]` tag.
7. **Sports — Oakland** — A's coverage, Warriors, local sports. Anthony primary, Hal Richmond for legacy/history.
8. **Chicago Bureau** — Separate header with Chicago weather from handoff. Bulls coverage (Selena Grant), Chicago Ground texture (Talia Finch).
9. **Quick Takes** — 3-5 short items compiled by Mags from leftover desk signals. Stories too small for full articles but worth noting.
10. **Wire / Signals** — Optional. 2-3 verified wire items (Reed Thompson) or social observations (Celeste Tran). Skip if nothing warrants it.
11. **Letters** — 2-4 citizen letters in first-person voice. At least 1 from a returning citizen.
12. **Accountability** — Conditional. Jax Caldera only when Mags identifies a stink signal. One piece max per edition.
13. **Article Table** — Engine intake format. All articles listed. ArticleText is summary only (1-2 sentences).
14. **Storylines Updated** — NEW and RESOLVED only. Pipe-separated fields matching Storyline_Intake columns. Do NOT re-list active storylines.
15. **Citizen Usage Log** — All citizens used, grouped by category. Exact formats required — feeds intake parser. No parentheses inside fields. JOURNALISTS section is byline tracking only — does not feed citizen intake or advancement.
16. **Continuity Notes** — Sports records, direct quotes, new canon figures ONLY. Do not repeat engine-tracked data.
17. **Coming Next Cycle** — 3-5 forward-looking teasers compiled by Mags. What the paper is watching next.

-----

## VERSION HISTORY

| Version | Cycle | Changes |
|---------|-------|---------|
| v1.0    | 77    | Initial creation. Standardized section order, added Business Ticker, created Skyline Tribune header for Chicago Bureau, established journalist assignment guidelines with full roster coverage including support teams (photo, data, social). |
| v1.1    | 78    | Added Canon Rules (no invented names, no engine metrics, verify against handoff). Added article length guidelines. Added Names Index as universal article footer. Added Letters format guidance. Clarified Article Table field definitions (ArticleText = summary). Added pipe table formatting note for Continuity Notes. Added header notes (omit holiday if none, copy engine numbers exactly). Bumped from lessons learned in Edition 78. |
| v1.2    | 79    | Fixed Citizen Usage Log format with explicit examples and no-parens rule to match intake parser. Restructured Storylines Updated to pipe-separated NEW/RESOLVED only (no STILL ACTIVE re-listing). Simplified Continuity Notes to sports records, quotes, and new canon figures only (removed redundant engine-tracked data). Added Warriors sports category. |
| v1.3    | 79    | Clarified JOURNALISTS section is byline tracking only — not citizen usage or advancement. Journalists writing articles are reporters, not characters. Only counts as citizen usage if they appear AS A CHARACTER in someone else's story. |
| v1.4    | 83    | Phase 3 journalism enhancements. Added: Formatting Conventions section (deck lines, byline standard, opinion markers, photo credits, cross-references). New sections: Editor's Desk (Mags column), Opinion (dedicated section for P Slayer/Del Rio/Graye), Quick Takes (3-5 short items), Wire/Signals (optional verified items), Accountability (conditional Jax Caldera), Coming Next Cycle (forward teasers). Added Jax Caldera to journalist roster. Updated article length guidelines for new section types. Expanded Section Notes to cover all 17 sections. |
