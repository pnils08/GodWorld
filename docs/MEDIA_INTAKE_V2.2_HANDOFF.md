# Media Intake v2.2 – Structure Handoff (Engine Intake)

This document defines the **expected structure** for Media Room output so it cleanly parses into the engine intake sheets. It is modeled on the **current Media Room format** with explicit rules that align to `parseMediaRoomMarkdown()` and `processMediaIntakeV2()`.

---

## 0) Required top-level sections (in this order)

Use these section labels exactly (case-insensitive):

1. **ARTICLE TABLE** (decorative suffix like "— ENGINE INTAKE FORMAT" is optional)
2. **STORYLINES UPDATED** (or **STORYLINES CARRIED FORWARD**)
3. **CITIZEN USAGE LOG**
4. **CONTINUITY NOTES** (decorative suffix like "— CYCLE ##" is optional)

Separator lines like `############################################################` or `-----` are okay.

---

## 1) ARTICLE TABLE — ENGINE INTAKE FORMAT

### Format
Markdown table with **exact columns** (in this order):

`Reporter | StoryType | SignalSource | Headline | ArticleText | CulturalMentions`

**Example (valid):**

```
############################################################
ARTICLE TABLE — ENGINE INTAKE FORMAT
############################################################

|Reporter          |StoryType|SignalSource     |Headline                                                      |ArticleText                                             |CulturalMentions|
|------------------|---------|-----------------|--------------------------------------------------------------|--------------------------------------------------------|----------------|
|Maria Keen        |feature  |holiday          |Juneteenth draws forty thousand across Oakland                |DeFremery celebration anchors citywide observance       |Juneteenth      |
|Carmen Delaine    |civic    |civic-project    |Stabilization Fund heads to committee next cycle              |Carter counting votes; supermajority uncertain          |                |
```

### Engine mapping
Parsed into **Media_Intake** (intake sheet) with columns:
`Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status`

### Valid StoryType values
`breaking, feature, profile, opinion, analysis, sports, culture, civic, health, recap, holiday, festival`

### Valid SignalSource values
`shock-flag, health-crisis, pattern-wave, crisis-arc, story-seed, world-event, citizen-event, cultural-entity, sports-season, weather, editorial, continuity, holiday, first-friday, creation-day, championship, playoffs`

---

## 2) STORYLINES UPDATED

This section is used to **update the tracker** and **validate continuity**.
Use the following category headers exactly (case-insensitive):

- **NEW THIS CYCLE:** (also accepts: `NEW THREAD`, `NEW:`)
- **PHASE CHANGES:**
- **STILL ACTIVE:** (also accepts: `ACTIVE`)
- **RESOLVED:**
- (Optional) **QUESTIONS:**

### Format
Each entry is a single bullet line prefixed by `—` or `-`.

**Example (valid):**
```
############################################################
STORYLINES UPDATED
############################################################

NEW THIS CYCLE:
— Juneteenth: 40,000 attendance citywide, up 25% from last year
— Stabilization Fund: Committee hearing set for Cycle 77

PHASE CHANGES:
— Stabilization Fund: PENDING → COMMITTEE HEARING (Cycle 77)

STILL ACTIVE:
— Health Center: Site selection ongoing, Vote Cycle 80 (5-4 required)

RESOLVED:
— Juneteenth celebration: Completed successfully
```

### Engine mapping
Each bullet becomes a row in **Storyline_Intake** with:

| Column | Description |
|--------|-------------|
| **StorylineType** | One of: `new`, `phase-change`, `active`, `resolved`, `question` |
| **Description** | Entire line (normalized as `Name: description` if a colon is present) |
| **Neighborhood** | Auto-detected if a known neighborhood appears in the text |
| **RelatedCitizens** | Auto-extracted citizen names (blank if none detected) |
| **Priority** | `high` for `new` and `phase-change`, otherwise `normal` |
| **Status** | Blank (set by engine) |

### Valid StorylineType values (in Storyline_Tracker output)
`arc, question, thread, mystery, developing, seasonal, festival, sports`

### Recognized neighborhoods
Temescal, Downtown, West Oakland, Fruitvale, Laurel, Jack London, Lake Merritt, Chinatown, Rockridge, Piedmont

---

## 3) CITIZEN USAGE LOG

This section is used for **emergence counts** and **attention tracking**.
The engine expects grouped blocks by category. The **category header sets context**.

### Accepted category headers (recommended)
- **CIVIC OFFICIALS:**
- **SPORTS — A'S:** / **SPORTS — BULLS:** / **SPORTS — [ANY]:**
- **JOURNALISTS:**
- **CITIZENS QUOTED IN ARTICLES (NEW):**
- **CITIZENS IN LETTERS (NEW):**
- **CULTURAL:**
- **OWNERSHIP / EXECUTIVES:**
- **OTHER CITIZENS:**

> **Note:** Category headers are detected via keywords:
> - `journalist`, `reporter` → Context `JOURNALIST`
> - `sports`, `player`, `a's`, `bulls`, `nba` → Context `UNI`
> - `civic`, `official` → Context `CIVIC`
> - `cultural` → Context `CULTURAL`
> - `owner`, `executive` → Context `EXECUTIVE`
> - `quoted` → Context `QUOTED`
> - `letters` → Context `LETTERS`
> - `citizen`, `other` → Context `CITIZEN`

### Format
Each entry is a bullet line prefixed by `—` or `-`.
Parenthetical context is optional but preserved.

**Example (valid):**
```
############################################################
CITIZEN USAGE LOG
############################################################

CIVIC OFFICIALS:
— Avery Santana (Mayor)
— Denise Carter (D1)

SPORTS — A'S:
— Vinnie Keane (3B)
— Benji Dillon (SP)

JOURNALISTS:
— Maria Keen (1 article)
— Selena Grant (2 articles)

CITIZENS QUOTED IN ARTICLES (NEW):
— Terrell Davis, Laurel, Cook (Juneteenth front page)

CITIZENS IN LETTERS (NEW):
— Colin Phillips, 30, Laurel, Bakery Worker
```

### Engine mapping
Each bullet becomes a row in **Citizen_Usage_Intake** with:

| Column | Description |
|--------|-------------|
| **CitizenName** | Parsed name |
| **UsageType** | Always `mentioned` (from parser) |
| **Context** | Derived from category header (UNI, CIVIC, JOURNALIST, QUOTED, LETTERS, etc.) |
| **Reporter** | Blank (not required for this use case) |
| **Status** | Blank (set by engine) |

### v2.2 Citizen Routing (Advanced)
When using `processRawCitizenUsageLog_()` directly, citizens are routed:
- **New citizens** → Intake sheet (for citizen creation)
- **Existing citizens** → Advancement_Intake (for tier/role updates)
- **Quoted citizens** → LifeHistory_Log (with context and quotes)

Category codes for routing: `CIV` (Civic), `MED` (Media/Journalists), `UNI` (Universe/Athletes)

---

## 4) CONTINUITY NOTES — CYCLE ##

This section is **reference-heavy** and is best treated as a narrative block.
The parser will ingest lines and label them with NoteType values.

### Format
Use readable subsections with headings in **ALL CAPS** or **Header:** format, then free-form bullets or lines.

**Example (valid):**
```
############################################################
CONTINUITY NOTES — CYCLE 76
############################################################

COUNCIL COMPOSITION
|District|Member|Faction|Status|
|--------|------|-------|------|
|D1|Denise Carter|OPP|Active|

MAJOR VOTES PENDING:
- Cycle 77: Stabilization Fund Committee Hearing
- Cycle 80: Temescal Health Center ($18M appropriation)

SPORTS RECORDS:
- Bulls: 33-14 (Best in East)
```

### Engine mapping
Each line is turned into a **Continuity_Intake** row with:

| Column | Description |
|--------|-------------|
| **NoteType** | Auto-detected (see below) |
| **Description** | Content with subsection prefix if applicable |
| **RelatedArc** | Extracted from `ARC:` line if present |
| **AffectedCitizens** | Auto-extracted citizen names |
| **Status** | Blank (set by engine) |

### NoteType detection logic
| Type | Triggers |
|------|----------|
| `introduced` | Timeline patterns (C##, Year #, Q#), subsection keywords (timeline, number, reference, target, key), Key: Value format |
| `builton` | "BUILT ON" subsection, "previous" coverage patterns, default |
| `question` | Lines ending with `?` |
| `resolved` | Contains "resolved" or "completed" |
| `callback` | Contains "callback" or "refer back" |
| `seasonal` | Calendar-related subsection headers |

---

## 5) Delivery checklist (Media Room)

Use this checklist before handoff:
- [ ] Section headers match the required labels
- [ ] Article table columns are exact (6 columns before Status)
- [ ] Storylines are categorized under the correct headers
- [ ] Citizen Usage is grouped by category, with bullet lines
- [ ] Continuity notes are readable and grouped by headings

---

## 6) Engine workflow (quick reference)

1. Paste Media Room output into `MediaRoom_Paste`
2. Run `parseMediaRoomMarkdown()` (writes intake sheets)
3. Run `processMediaIntakeV2()` (moves to ledgers + calendar context)

### Intake sheets (populated by parseMediaRoomMarkdown)
| Sheet | Columns |
|-------|---------|
| Media_Intake | Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status |
| Storyline_Intake | StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status |
| Citizen_Usage_Intake | CitizenName, UsageType, Context, Reporter, Status |
| Continuity_Intake | NoteType, Description, RelatedArc, AffectedCitizens, Status |

### Output ledgers (populated by processMediaIntakeV2 with calendar context)
| Sheet | Columns |
|-------|---------|
| Press_Drafts | 14 columns (8 core + 6 calendar) |
| Storyline_Tracker | 14 columns (8 core + 6 calendar) |
| Citizen_Media_Usage | 12 columns (6 core + 6 calendar) |
| Continuity_Loop | 13 columns (7 core + 6 calendar) |

### Calendar columns (added to all output ledgers)
`Season, Holiday, HolidayPriority, IsFirstFriday, IsCreationDay, SportsSeason`

---

## 7) Version history

| Version | Changes |
|---------|---------|
| v2.2 | Raw citizen usage log parsing, citizen existence check, routing (new → Intake, existing → Advancement_Intake), quote extraction to LifeHistory_Log |
| v2.1 | Calendar columns in all output sheets, calendar signal sources and story types |
| v2.0 | Initial structured intake with four streams |

---

## 8) Source files

- `phase07-evening-media/parseMediaRoomMarkdown.js` — Parser (v1.3)
- `phase07-evening-media/mediaRoomIntake.js` — Processor (v2.2)
