---
name: write-supplemental
description: Produce a supplemental edition — deep-dive, single-topic coverage with custom reporter teams. Breaking news, canon deep dives, color journalism, sports specials, wire breaks.
---

# /write-supplemental — Supplemental Edition Production

## Usage
`/write-supplemental [topic]`
- Produces a single-topic supplemental edition
- Mags designs the coverage, assigns the team, compiles the result

## Rules
- Read SESSION_CONTEXT.md FIRST
- This is Mags' editorial playground — custom teams, flexible structure
- Show the user a coverage plan before launching agents
- One story, many angles, deep canon

## Step 0: Understand the Topic

The topic comes from one of these sources:
1. **User drops it** — "here's the Fruitvale plans" or "NBA leak incoming"
2. **Engine signal** — a major event in the cycle data that deserves deeper treatment
3. **Mags' editorial instinct** — a storyline that needs space, a color piece the Cycle Pulse can't hold
4. **Journalist flag** — a reporter's voice file or NOTES_TO_SELF entry suggests a feature

Read whatever the user provides. If it's a Drive link, use the service account (`node scripts/downloadDriveFile.js`). If it's a Mara briefing, read the file. If it's raw canon, absorb it.

## Step 1: Design the Coverage Plan

This is where editorial judgment matters. Based on the topic, decide:

### 1a. Classify the Supplemental Type

| Type | Trigger | Typical Size |
|------|---------|--------------|
| **Breaking News** | Major development drops | 5-8 articles |
| **Deep Dive** | Full canon treatment needed | 7-10 articles |
| **Color** | Neighborhood/culture/texture feature | 3-5 articles |
| **Sports Special** | Major team event | 4-6 articles |
| **Wire Break** | Mint or TWS breaks a rumor/leak | 2-4 articles |

### 1b. Assign the Team

Pick reporters based on the story, not the desk. Any reporter can appear in any supplemental. Examples:

- **Civic breaking:** Carmen (news + analysis), Jordan (numbers), Luis (citizen voices), Farrah (opinion)
- **Sports special:** Anthony (analysis), P Slayer (fan voice), Hal (history), Mint (if leak)
- **Color feature:** Maria (lead), Luis (voices), Simon Leary (cultural essay)
- **Wire break:** Mint (thread), Reed Thompson (wire), beat reporter (analysis)

### 1c. Plan the Sections

Design the article lineup. Show the user something like:

```
SUPPLEMENTAL: [TOPIC]
Type: [Breaking News / Deep Dive / Color / Sports Special / Wire Break]

COVERAGE PLAN:
1. [FRONT PAGE] Carmen Delaine — The news: what happened, what it means
2. [BY THE NUMBERS] Jordan Velez — Full financial/data breakdown
3. [ANALYSIS] Carmen Delaine — Political landscape, vote math
4. [CITIZEN VOICES] Luis Navarro — 4-5 named citizen reactions
5. [OPINION] Farrah Del Rio — Accountability take
6. [OPINION] P Slayer — Street-level emotional reaction

Team: 4 reporters, 6 articles
Estimated length: ~5,000 words

Ready to launch?
```

Get user approval before proceeding.

## Step 1.5: Compile the Topic Brief

Before launching agents, Mags writes the topic brief — the editorial equivalent of desk briefings but focused on one story.

### What goes in the topic brief:

1. **The news** — What happened. Raw facts. Canon data from user, Mara, engine, or Supermemory.
2. **The context** — Where this fits in the simulation timeline. What led to this moment.
3. **The angle** — What Mags wants covered. Not just "write about X" but "I want the reader to understand Y."
4. **Canon facts** — Use `ESTABLISHED CANON:` prefix for non-negotiable data.
5. **Citizen cards** — For any citizens the agents will write about. Same format as edition briefings.
6. **Archive context** — Past coverage from Supermemory, Drive archive, or NEWSROOM_MEMORY.
7. **Voice assignments** — Which reporter writes which piece, and what voice file to reference.

### Topic brief sources (check in order):
1. **User-provided content** — Drive files, raw text, Mara briefings
2. **Supermemory** — `/super-search` for relevant past coverage and character history
3. **Local Drive archive** — `output/drive-files/` for past articles, player cards, stats
4. **Desk packets** — If a current cycle is loaded, relevant sections may apply
5. **NEWSROOM_MEMORY.md** — Errata, character continuity, editorial notes

### Save the brief:
```
output/supplemental-briefs/{topic_slug}_brief.md
```

## Step 2: Launch Agents

Launch 2-4 agents based on the coverage plan. Unlike edition production (6 desk agents), supplementals use fewer, more focused agents.

### Agent Configuration

Each agent gets:
- **The topic brief** (from Step 1.5)
- **Their voice file(s)** — `docs/media/voices/{reporter}.md`
- **The supplemental template** — `editions/SUPPLEMENTAL_TEMPLATE.md` (for formatting reference)
- **Their specific assignment** — which articles to write, what angle, target word count

### Agent Prompt Pattern

```
You are [REPORTER NAME], writing for the Bay Tribune supplemental edition on [TOPIC].

Read your voice file at docs/media/voices/{name}.md — this is your writing identity.
Read the supplemental template at editions/SUPPLEMENTAL_TEMPLATE.md — formatting conventions.
Read the topic brief at output/supplemental-briefs/{topic_slug}_brief.md — your assignment and canon data.

YOUR ASSIGNMENT:
- Write [N] article(s):
  1. "[Headline idea]" — [description of angle, ~X words]
  2. "[Headline idea]" — [description of angle, ~X words]

RULES:
- Stay in voice. Read the voice file carefully.
- Use ONLY canon names from the topic brief. Never invent citizens.
- No engine metrics in article text.
- Include a Names Index after each article.
- End with an Article Table entry for each article you wrote.

Write now. Start with your first article.
```

### Parallel vs. Sequential

- **2-3 independent agents** — launch in parallel (e.g., news + numbers + opinion)
- **If one agent's output feeds another** — launch sequentially (e.g., wire break → reaction)

### Agent Types

Use `subagent_type` based on the reporter's desk:
- Civic reporters (Carmen, Luis, Farrah) → `civic-desk`
- Sports reporters (P Slayer, Anthony, Hal) → `sports-desk`
- Culture reporters (Maria, Simon) → `culture-desk`
- Business reporters (Jordan) → `business-desk`
- Chicago reporters (Selena, Talia) → `chicago-desk`
- Letters / citizen voices → `letters-desk`
- Mixed / general → `general-purpose`

**Note:** The agent type gives the agent access to the right tools and search pools. The voice file and topic brief control the actual writing.

## Step 3: Compile

After agents return, Mags compiles the supplemental:

1. **Assemble articles** in editorial order (story logic, not template order)
2. **Add the header** (see template for format)
3. **Quality checks:**
   - Every article has a deck line
   - Every article has a standardized byline
   - Cross-references to past or upcoming Cycle Pulse coverage where relevant
   - 1-2 photo credits for atmospheric moments
   - Opinion pieces marked with `[OPINION]`
   - Countdown clocks on any initiative with active deadline
4. **Merge intake sections:**
   - Article Table (all articles)
   - Storylines Updated (new canon established)
   - Citizen Usage Log (all citizens used, grouped)
   - Continuity Notes (key numbers, timeline, political landscape)
5. **Add end marker**

Show the compiled supplemental to the user for review.

## Step 3.5: Validation (If Civic)

If the supplemental covers civic content (council members, initiatives, votes):
```bash
node scripts/validateEdition.js editions/supplemental_{topic_slug}_c{XX}.txt
```
Fix any CRITICAL issues before proceeding.

## Step 4: Save & Upload

After user approval:

1. **Save locally:**
   ```
   editions/supplemental_{topic_slug}_c{XX}.txt
   ```
   Or for non-cycle-tied specials:
   ```
   editions/special_edition_{topic_slug}.txt
   ```

2. **Upload to Google Drive:**
   ```bash
   node scripts/saveToDrive.js editions/supplemental_{topic_slug}_c{XX}.txt supplement
   ```

3. **Ingest into Supermemory:**
   ```bash
   node scripts/ingestEdition.js editions/supplemental_{topic_slug}_c{XX}.txt
   ```

4. **Show stats:**
   - Article count
   - Total word count
   - New canon figures introduced
   - Citizen usage count

## Step 4.5: Update Newsroom Memory

After a supplemental, update `docs/mags-corliss/NEWSROOM_MEMORY.md`:
- New canon established (numbers, timelines, political positions)
- Character continuity (new citizens introduced, returning citizens developed)
- Coverage notes for future editions (what to follow up on)

## Step 5: Intake (Optional)

If the supplemental contains canon that should flow back into the engine:
```bash
node scripts/editionIntake.js editions/supplemental_{topic_slug}_c{XX}.txt --dry-run
```

---

## Quick Reference — Supplemental Types

| Type | Team Size | Articles | Words | Agents |
|------|-----------|----------|-------|--------|
| Breaking News | 3-4 reporters | 5-8 | 4,000-8,000 | 2-3 |
| Deep Dive | 4-6 reporters | 7-10 | 6,000-12,000 | 3-4 |
| Color | 2-3 reporters | 3-5 | 3,000-6,000 | 2 |
| Sports Special | 3-5 reporters | 4-6 | 4,000-8,000 | 2-3 |
| Wire Break | 2-3 reporters | 2-4 | 2,000-4,000 | 1-2 |

## File Locations

| File | Purpose |
|------|---------|
| `editions/SUPPLEMENTAL_TEMPLATE.md` | Template — formatting, sections, intake format |
| `output/supplemental-briefs/` | Topic briefs per supplemental |
| `editions/supplemental_*.txt` | Published supplementals |
| `editions/special_edition_*.txt` | Non-cycle-tied specials |
| `output/drive-files/_Supplementals_Reference/` | Reference supplementals from Cycles 73-76 |
