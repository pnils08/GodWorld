---
name: write-supplemental
description: Produce a supplemental edition — variety coverage that builds the world beyond the Cycle Pulse. Any topic, any reporter, any format.
---

# /write-supplemental — Supplemental Edition Production

## Usage
`/write-supplemental [topic]`
- Produces a supplemental edition on any topic
- Mags picks the reporters, designs the coverage, compiles the result
- One supplemental per cycle minimum — this is how the city gets built

## Philosophy

The Cycle Pulse is the engine's newspaper — it reports what the simulation produced. Same six desks, same format, same rotation. That's necessary but it's not sufficient. The city needs texture, variety, life.

Supplementals are where the world gets built. A restaurant review canonizes a restaurant. A neighborhood walk canonizes what that neighborhood feels like. A sports deep dive gives the dynasty texture beyond box scores. Every supplemental adds something to the world that the Cycle Pulse can't.

**Any reporter can lead a supplemental.** Not just Carmen and Jordan. There are 24 journalists on the roster and most of them have never gotten a supplemental assignment. Mason Ortega is a former sous chef — give him a food piece. Sharon Okafor covers lifestyle — let her cover lifestyle. Kai Marston was a music blogger — give him First Fridays. The voice files are built for this. Use them.

**The tone is not locked to civic drama.** Supplementals can be breaking news, but they can also be a farmers market, a restaurant opening, a neighborhood walk, a sports feature, a weather story, a school profile. The city should feel like a city, not a council chamber.

**GodWorld is a prosperity city.** Dynasty-era Oakland. People buying homes, opening businesses, enjoying life. Not every story is displacement, struggle, or crisis. Include wealth, aspiration, joy, normalcy.

## Rules
- Read SESSION_CONTEXT.md FIRST
- Show the user a coverage plan before launching agents
- Get user approval before proceeding to agent launch
- One story, many angles — or one story, one angle. Size fits the topic.
- Rotate reporters. Check who's been used recently and who hasn't.

---

## Step 0: Production Log

If `output/production_log_c{XX}.md` exists, read it — you may be resuming after compaction. If not, create one. Update it at every step. This is how you survive context loss mid-run. Same format as the edition production log (see write-edition SKILL.md Step 0.5).

## Step 0.5: Pick the Topic

Topics come from anywhere:
1. **User drops it** — "let's do a food piece" or "what's Temescal look like?"
2. **Trigger list** — check `output/supplemental-triggers/triggers_c{XX}.json` for auto-detected candidates (run `node scripts/checkSupplementalTriggers.js {cycle}` if it doesn't exist yet)
3. **Engine signal** — a citizen event, a new business, a neighborhood shift
4. **Editorial instinct** — Mags sees a gap in the world and fills it
5. **Journalist flag** — a reporter's voice suggests a feature
6. **Variety check** — if the last 3 supplementals were civic, do something else

Read whatever the user provides. If it's vague, that's fine — "what's the food scene like?" is a valid topic.

### Civic Supplemental Types (from triggers)

When the trigger list suggests civic content, use one of these formats:

| Type | What | Who Produces | Format |
|------|------|-------------|--------|
| **Civic Dispatch** | Official city communications — press releases, public notices, community alerts | Carmen Delaine + voice agent statements | In-world government output, not journalism. 1-3 short pieces. |
| **Neighborhood Report** | What life looks like in one neighborhood this cycle. Businesses, events, people, weather. | Maria Keen + culture desk reporters | World-texture, not news coverage. Walk-through format. |
| **Initiative Spotlight** | Deep dive on one initiative's progress. What happened, what's next, who's affected. | Carmen Delaine or Jordan Velez + civic desk | Feature-length, single-subject, investigative. |

These follow the same Step 1-5 pipeline as any supplemental — they just have a civic angle and draw from voice agent statements as source material.

## Step 1: Design the Coverage Plan

### 1a. Pick the Reporters

**Check the roster first.** Who hasn't had a supplemental? Who's perfect for this topic? The full roster is in `docs/media/voices/` — 24 journalists across every beat.

Reporters by specialty (not exhaustive — anyone can cover anything):

| Reporter | Specialty | Good For |
|----------|-----------|----------|
| Mason Ortega | Food & Hospitality | Restaurants, food culture, kitchen life, nightlife |
| Sharon Okafor | Lifestyle | Daily routines, behavior trends, how people live |
| Kai Marston | Arts & Entertainment | Galleries, music, First Fridays, cultural events |
| Angela Reyes | Education | Schools, youth, OUSD, after-school programs |
| Noah Tan | Weather & Environment | Climate, air quality, seasons, outdoor life |
| Dr. Lila Mezran | Health | Public health, clinics, medical stories |
| Sgt. Rachel Torres | Public Safety | Crime, safety, OPD, neighborhood security |
| Jax Caldera | Accountability | Street-level pressure, policy gaps |
| Maria Keen | Neighborhoods | Hyper-local culture, community pulse |
| Simon Leary | Long View | Essays, philosophy, contemplative pieces |
| Tanya Cruz | Sideline / Social | Behind-the-scenes, real-time dispatches |
| Selena Grant | Bulls Beat | Chicago basketball, roster analysis |
| Talia Finch | Chicago Ground | Chicago neighborhoods, street-level texture |
| MintConditionOakTown | Internet/Rumors | Speculative threads, chaotic truth-seeking |
| Carmen Delaine | Civic | Government, infrastructure, policy |
| Jordan Velez | Business/Labor | Economics, workforce, port, development |
| Luis Navarro | Investigations | Accountability, fact-checking, anomalies |
| Celeste Tran | Social Trends | Hashtags, streaming data, cultural temperature |
| Farrah Del Rio | Opinion | Policy critique, cultural commentary |
| Trevor Shimizu | Infrastructure | Transit, utilities, systems |
| P Slayer | Fan Voice | Sports opinion, emotional takes |
| Anthony | Sports Analytics | Data-driven sports, roster breakdowns |
| Hal Richmond | Sports History | Dynasty context, retrospectives |
| Reed Thompson | Wire | Neutral verification, quick reports |

### 1b. Match the Roster

**Design the stories first, then match reporters.** Don't pick reporters by habit — pick them by beat fit. For each story, ask: who on the 24-person roster is the natural match for this angle?

**Supplementals develop the bench.** Default to reporters with fewer than 5 edition appearances. The Cycle Pulse is the big stage for trusted voices. Supplementals build the next ones.

Check the reporter table above. If you're about to assign Carmen, Jordan, Maria, or P Slayer — stop and ask if someone else fits better.

### 1c. Plan the Coverage

Show the user something like:

```
SUPPLEMENTAL: [TOPIC]

COVERAGE PLAN:
1. Mason Ortega — [assignment, ~word count]
2. Maria Keen — [assignment, ~word count]
3. [Reporter] — [assignment, ~word count]

Team: [N] reporters, [N] articles
```

Keep it simple. The plan is a pitch, not a contract. Get user approval before proceeding.

### 1d. Size It Right

Not everything needs 7 articles and 10,000 words.

| Size | Articles | Words | When |
|------|----------|-------|------|
| Light | 1-2 | 1,500-3,000 | Neighborhood walk, single-topic color |
| Standard | 3-5 | 3,000-6,000 | Multi-angle feature, event coverage |
| Heavy | 5-8 | 5,000-10,000 | Breaking news, deep dive, major event |

A farmers market piece might be one article from Mason Ortega and one from Maria Keen. That's fine. Not everything is a five-reporter production.

---

## Step 1.5: Write the Topic Brief

The brief tells the reporters what they need to know. Save to:
```
output/supplemental-briefs/{topic_slug}_c{XX}_brief.md
```

### For color/variety pieces (lightweight brief):
- **The topic** — What are we covering?
- **Citizens available** — Pull from the ledger. Include citizens who live in the relevant neighborhood, work in the relevant industry, etc. Don't just use the usual names.
- **Canon to establish** — What new things does this piece create? (businesses, venues, cultural events, neighborhood texture)
- **Voice assignments** — Who writes what

### For news/investigative pieces (heavier brief):
- Add: **The news** (what happened), **The context** (timeline, stakes), **Civic voice statements** (if relevant)
- Add: **Archive context** from Supermemory or NEWSROOM_MEMORY.md

### Brief sources (check in order):
1. User-provided content
2. Dashboard API — `curl -s localhost:3001/api/search/articles?q=TOPIC` (256 articles, C1-C87, free)
3. Supermemory — `/super-search` for past coverage (searches `mags` + `bay-tribune` containers)
4. Simulation_Ledger — `curl -s localhost:3001/api/citizens?neighborhood=NAME&search=ROLE` (live, 509 ENGINE citizens)
5. Business_Ledger — businesses in the relevant sector
6. NEWSROOM_MEMORY.md — errata, character continuity
7. Archive articles — `archive/articles/c*_{desk}_*.txt` (199 curated articles, C1-C77)

### Enhanced data sources (use if available):

All of these are optional. If none exist, the brief works exactly as today. Check each path — if the file exists, add the corresponding section to the brief.

| Source | Path | When | Brief Section |
|--------|------|------|---------------|
| Errata | `output/errata.jsonl` | Always (if exists) | **GUARDIAN WARNINGS** — filter to topic's domain, list errors to avoid |
| Mara guidance | `output/mara-directives/mara_directive_c{XX}.txt` | Always (if exists) | **MARA GUIDANCE** — forward editorial direction from last audit |
| Cycle data | `output/desk-packets/{desk}_c{XX}.json` | If topic-relevant desk packet exists | **ENGINE CONTEXT** — neighborhood dynamics, crime, economics, migration from v3.9 |
| Voice statements | `output/civic-voice/{office}_c{XX}.json` | Civic pieces only | **CIVIC VOICE SOURCE MATERIAL** — official statements from voice agents |
| Truesource | `output/desk-packets/truesource_reference.json` | Always (if exists) | **CANON REFERENCE** — verified names/positions/neighborhoods |
| Grade history | `output/grades/grade_history.json` | Always (if exists) | Reporter grade context in assignments (1-line summary per reporter) |

**Data availability table** — include in the production log which of the 6 sources were found and loaded. Example:
```
Enhanced data loaded:
- Errata: YES (26 entries, 3 relevant to civic)
- Mara guidance: YES (c87 directive)
- Cycle data: NO (no c88 packets yet)
- Voice statements: YES (mayor, chief of staff)
- Truesource: YES (675 citizens)
- Grade history: YES (1 edition window)
```

### Key rules for the brief:
- **Don't prescribe tone.** Give the reporters the facts and let them write.
- **Don't default to struggle.** If the topic is a neighborhood, show what's good about it, not what's wrong with it.
- **Use fresh citizens.** Check the Citizen Usage Log — if a citizen has appeared in the last 3 editions, find someone else.
- **Authorize new canon.** Reporters can discover businesses, venues, cultural events. Specify how many new entities they can create.

---

## Step 2: Launch Agents

Launch 1-4 agents based on the coverage plan.

### Agent Configuration

Each agent gets:
- **The topic brief** (from Step 1.5)
- **Their voice file(s)** — `docs/media/voices/{reporter}.md`
- **The supplemental template** — `editions/SUPPLEMENTAL_TEMPLATE.md`
- **Their specific assignment** — which articles to write, what angle, target word count

### Model Tier Guidance

Use the `model` parameter when launching agents to match complexity to capability:

| Tier | Model | Use For |
|------|-------|---------|
| Sonnet | `claude-sonnet-4-6` | Civic, investigative, sports — reasoning-heavy, source verification |
| Haiku | `claude-haiku-4-5-20251001` | Neighborhood, food, culture, lifestyle — texture writing, atmosphere |

Default to Haiku unless the piece requires civic reasoning, investigative logic, or sports roster verification.

### Agent Prompt Pattern

```
You are [REPORTER NAME], writing for the Bay Tribune supplemental edition on [TOPIC].

Read your voice file at docs/media/voices/{name}.md — this is your writing identity.
Read the supplemental template at editions/SUPPLEMENTAL_TEMPLATE.md — formatting conventions.
Read the topic brief at output/supplemental-briefs/{topic_slug}_c{XX}_brief.md — your assignment and canon data.

[If truesource exists:]
Read output/desk-packets/truesource_reference.json — verify every citizen name, title, and neighborhood against this file before writing.

[If exemplar exists for this desk:]
Read output/desks/{desk}/current/exemplar.md — this is an A-grade example from this desk. Study the voice, structure, and sourcing.

[If grade history exists and reporter has grades:]
YOUR RECENT GRADE: [letter] ([trend]). [1-line note from grade_history.json]

[If brief contains GUARDIAN WARNINGS:]
GUARDIAN WARNINGS (from errata — do NOT repeat these errors):
[filtered warnings from brief]

YOUR ASSIGNMENT:
- Write [N] article(s):
  1. "[Headline idea]" — [description of angle, ~X words]

RULES:
- Stay in voice. Read the voice file carefully.
- Use ONLY canon names from the topic brief. Never invent citizens unless authorized.
- No engine metrics in article text.
- Verify all citizen names against truesource before using them.
- Include a Names Index after each article.
- End with an Article Table entry for each article you wrote.

Write now. Start with your first article.
```

### THINK BEFORE WRITING Blocks

Add a thinking block to the agent prompt based on supplemental type. These go BEFORE "Write now."

**Civic / Investigative:**
```
THINK BEFORE WRITING:
Before drafting, reason through:
1. What is the current status of each initiative/policy mentioned?
2. Which citizens have appeared in recent editions on this topic? (check brief)
3. Are there any Mara flags or errata warnings relevant to this piece?
4. What is the strongest angle — and what angle should be AVOIDED?
5. Which voice agent statements can be quoted vs. paraphrased?
```

**Neighborhood / Food / Culture:**
```
THINK BEFORE WRITING:
Before drafting, reason through:
1. What canon already exists for this neighborhood/venue/event?
2. Which citizens are FRESH (not in last 3 editions)?
3. What new canon am I authorized to establish?
4. Is this a prosperity story or a struggle story? (default: prosperity)
```

**Sports:**
```
THINK BEFORE WRITING:
Before drafting, reason through:
1. Verify every player name and position against the roster in truesource.
2. What is the dynasty context — where does this fit in the timeline?
3. Is this opinion or reporting? If opinion, mark [OPINION].
```

**Color / Variety:** No thinking block — keep lightweight.

### Parallel vs. Sequential
- Independent reporters — launch in parallel
- If one reporter's output feeds another — launch sequentially

---

## Step 3: Compile

After agents return, Mags compiles:

1. **Assemble articles** in editorial order (story logic)
2. **Add the header** (see template)
3. **Quality checks:**
   - Deck lines under every headline
   - Standardized bylines
   - Cross-references to past coverage where relevant
   - 1-2 photo credits
   - Opinion pieces marked `[OPINION]`
   - **Name verification** — check every quoted citizen against `output/desk-packets/truesource_reference.json` and `output/desk-packets/base_context.json`. Flag any name not in canon sources or not authorized as new in the Citizen Usage Log.
4. **Merge intake sections:**
   - Article Table
   - Storylines Updated (new canon established)
   - Citizen Usage Log
   - Continuity Notes
5. **Add end marker**

Show the compiled supplemental to the user.

## Step 3.5: Validation

**Always (all supplemental types):**
- Manual name check against `output/desk-packets/truesource_reference.json` — every quoted citizen must exist in canon or be authorized as new in the Citizen Usage Log.

**If civic content:**
```bash
node scripts/validateEdition.js editions/supplemental_{topic_slug}_c{XX}.txt
```

**If sports content:**
- Cross-check all player names and positions against the roster in truesource. Flag any player not on the A's 40-man, farm system, or coaching staff.

## Step 3.7: Optional Mara Audit

**For civic, investigative, or initiative supplementals only.** Skip for color, food, culture, neighborhood, sports, and lifestyle pieces.

**Decision guide:** If the supplemental changes initiative status, council positions, or faction dynamics — send to Mara. If it establishes texture canon (restaurants, neighborhood feel, cultural events) — skip.

```bash
node scripts/buildMaraPacket.js {cycle} editions/supplemental_{topic_slug}_c{XX}.txt
```

Upload the packet to claude.ai for Mara's review. Wait for her feedback before proceeding to Step 3.9.

## Step 3.9: USER REVIEW GATE (MANDATORY)

**STOP. Nothing gets saved until the user says yes.**

```
SUPPLEMENTAL [{topic}] — READY FOR REVIEW

Articles: {count}
Word count: ~{total}
New canon established: {key facts}

The supplemental is compiled. Nothing has been saved or published yet.
Ready to publish? (yes / hold for edits)
```

---

## Step 4: Save & Upload

After user approval:

1. **Save locally:**
   ```
   editions/supplemental_{topic_slug}_c{XX}.txt
   ```

2. **Upload to Google Drive:**
   ```bash
   node scripts/saveToDrive.js editions/supplemental_{topic_slug}_c{XX}.txt supplement
   ```

3. **Ingest into Supermemory:**
   ```bash
   node scripts/ingestEdition.js editions/supplemental_{topic_slug}_c{XX}.txt
   ```

## Step 4.05: Generate Newspaper Print Edition

### 1. Generate Photos
```bash
node scripts/generate-edition-photos.js editions/supplemental_{topic_slug}_c{XX}.txt
```

### 2. Generate PDF
```bash
node scripts/generate-edition-pdf.js editions/supplemental_{topic_slug}_c{XX}.txt
```

### 3. Upload Print Edition to Drive
```bash
node scripts/saveToDrive.js output/pdfs/bay_tribune_supplemental_c{XX}_{topic_slug}.pdf supplement
```

## Step 4.1: Update Edition Brief

**Read** existing `output/latest_edition_brief.md` first — don't overwrite.

**Append** a new section:
```
### Supplemental: {Topic} ({Reporter(s)})
- [Key facts, named citizens, new canon from this supplemental]
```

## Step 4.2: Refresh Live Services

```bash
echo '{"savedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","history":[]}' > logs/discord-conversation-history.json
pm2 reload mags-discord-bot
```

## Step 4.5: Update Newsroom Memory

Update `docs/mags-corliss/NEWSROOM_MEMORY.md`:
- New canon established
- Character continuity
- Coverage notes for future editions

## Step 5: Intake

Every supplemental creates canon. Intake sends it to the engine ledgers.

```bash
# 1. Dry run — verify what gets parsed
node -r dotenv/config scripts/editionIntake.js --dry-run editions/supplemental_{topic_slug}_c{XX}.txt {cycle}

# 2. Live write to final sheets (no staging step)
node -r dotenv/config scripts/editionIntake.js editions/supplemental_{topic_slug}_c{XX}.txt {cycle}
```

**Note:** `editionIntake.js` doesn't load dotenv — always use `node -r dotenv/config` prefix.

Intake v2.1 writes directly: new citizens + existing → Citizen_Usage_Intake, storylines → Storyline_Tracker, businesses → Storyline_Intake.

If new businesses were established, promote them:
```bash
node -r dotenv/config scripts/processBusinessIntake.js --dry-run
```

Then run enrichment to write edition quotes/appearances to LifeHistory:
```bash
node -r dotenv/config scripts/enrichCitizenProfiles.js --edition {cycle}
```

---

## File Locations

| File | Purpose |
|------|---------|
| `editions/SUPPLEMENTAL_TEMPLATE.md` | Formatting conventions |
| `output/supplemental-briefs/` | Topic briefs per supplemental |
| `editions/supplemental_*.txt` | Published supplementals |
| `editions/special_edition_*.txt` | Non-cycle-tied specials |
