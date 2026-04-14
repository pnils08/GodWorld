---
name: write-supplemental
description: Produce a supplemental edition — variety coverage that builds the world beyond the Cycle Pulse. Any topic, any reporter, any format.
effort: high
disable-model-invocation: true
argument-hint: "[topic]"
---

# /write-supplemental — Supplemental Edition Production

## Usage
`/write-supplemental [topic]`
- Produces a supplemental edition on any topic
- Mags picks the reporters, designs the coverage, compiles the result
- One supplemental per cycle minimum — this is how the city gets built

## Live Status (auto-injected)

**Supplemental triggers:**
```
!`cat output/supplemental-triggers/triggers_c*.json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'{len(d)} triggers available'); [print(f'  - {t.get(\"topic\",\"?\")} ({t.get(\"type\",\"?\")})') for t in d[:5]]" 2>/dev/null || echo "No triggers file — pick a topic or run checkSupplementalTriggers.js"`
```

**Recent supplementals:**
```
!`ls -1t editions/*supplemental* 2>/dev/null | head -3 || echo "No supplementals yet"`
```

## Philosophy

The Cycle Pulse is the engine's newspaper — it reports what the simulation produced. Supplementals are where the world gets built. A restaurant review canonizes a restaurant. A neighborhood walk canonizes what that neighborhood feels like. A sports deep dive gives the dynasty texture beyond box scores. Every supplemental adds something to the world that the Cycle Pulse can't.

**Supplementals reflect the current state of the world.** Read the world summary (`output/world_summary_c{XX}.md`) before writing anything. If there's a health crisis in West Oakland, a food piece set there feels it. If the A's are 7-1, a Jack London walk has fans in jerseys. If Rosh Hashanah is happening across three neighborhoods, a culture piece acknowledges it. The supplemental lives in the same city as the edition — same weather, same nightlife, same mood. Different angle, same world.

**Any reporter can lead a supplemental.** Not just Carmen and Jordan. There are 24 journalists on the roster and most of them have never gotten a supplemental assignment. Mason Ortega is a former sous chef — give him a food piece. Sharon Okafor covers lifestyle — let her cover lifestyle. Kai Marston was a music blogger — give him First Fridays. The voice files are built for this. Use them.

**The tone is not locked to civic drama.** Supplementals can be breaking news, but they can also be a farmers market, a restaurant opening, a neighborhood walk, a sports feature, a weather story, a school profile. The city should feel like a city, not a council chamber.

**GodWorld is a prosperity city.** Dynasty-era Oakland. People buying homes, opening businesses, enjoying life. Not every story is displacement, struggle, or crisis. Include wealth, aspiration, joy, normalcy.

## Rules
- Show the user a coverage plan before launching agents
- Get user approval before proceeding to agent launch
- One story, many angles — or one story, one angle. Size fits the topic.
- Rotate reporters. Check who's been used recently and who hasn't.
- **Every citizen name gets verified via MCP.** `lookup_citizen(name)` for profile + canon. `search_canon(name)` for what's been published. No exceptions.
- **Read criteria files.** `docs/media/story_evaluation.md` for story quality, `docs/media/brief_template.md` for brief structure, `docs/media/citizen_selection.md` for citizen handling. Same standards as sift — supplementals are editions too.
- **No calendar dates.** Cycles only.
- **World summary is your context.** Read `output/world_summary_c{XX}.md` for cycle texture — food, nightlife, famous people, weather, events.
- **Photos, PDF, print — that's `/edition-print`.** Not part of this skill.

---

## Step 0: Production Log

Read the existing media production log: `output/production_log_edition_c{XX}.md`. This is the same log write-edition uses — all media work for this cycle lives in one document.

If the edition has already been produced, the log exists and has Steps 0-9 filled in. Append a new section:

```markdown
## Supplemental: {topic}
**Started:** {timestamp}
**Topic:** {topic}
**Reporters:** {who's assigned}
**Status:** IN PROGRESS

### Coverage Plan
[filled in at Step 1]

### Agent Results
[filled in at Step 2]

### Compile + Publish
[filled in at Steps 3-5]
```

If no production log exists yet (supplemental running before edition), create the log using the write-edition template and start with the supplemental section.

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

**Note:** Supplementals do **not** use `buildDecisionQueue`, `buildInitiativePackets`, `buildInitiativeWorkspaces`, or `applyTrackerUpdates`. Those pipelines are Cycle Pulse only. Civic supplementals can reference voice agent **output** from previous cycles as source material (e.g., mayor statements), but supplementals don't generate new voice decisions or advance initiative state.

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
2. World summary — `output/world_summary_c{XX}.md` — cycle texture, events, food, nightlife, famous people
3. Bay-tribune Supermemory — `npx supermemory search "TOPIC" --tag bay-tribune` — canon history
4. World-data Supermemory — `npx supermemory search "TOPIC" --tag world-data` — citizen state
5. Simulation_Ledger — query via service account for citizens by neighborhood
6. Truesource — `output/desk-packets/truesource_reference.json` — player data
7. NEWSROOM_MEMORY.md — errata, character continuity

### Enhanced data sources (use if available):

All of these are optional. If none exist, the brief works exactly as today. Check each path — if the file exists, add the corresponding section to the brief.

| Source | Path | When | Brief Section |
|--------|------|------|---------------|
| World summary | `output/world_summary_c{XX}.md` | Always | **WORLD CONTEXT** — cycle texture, events, food, nightlife, weather |
| Errata | `output/errata.jsonl` | Always (if exists) | **GUARDIAN WARNINGS** — filter to topic's domain, list errors to avoid |
| Mara guidance | `output/mara-directives/mara_directive_c{XX}.txt` | Always (if exists) | **MARA GUIDANCE** — forward editorial direction from last audit |
| Voice statements | `output/civic-voice/{office}_c{XX}.json` | Civic pieces only | **CIVIC VOICE SOURCE MATERIAL** — from city-hall production log |
| Civic production log | `output/production_log_city_hall_c{XX}.md` | Civic pieces only | **LOCKED CIVIC CANON** — what voices decided |
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

Upload edition to Drive for Mara: `node scripts/saveToDrive.js editions/supplemental_{topic_slug}_c{XX}.txt mara`

Mara has her own Supermemory access (mara + bay-tribune + world-data). She searches canon herself. No packet building needed. Mike takes it to her on claude.ai. Wait for her feedback before proceeding.

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

## Step 4.1: Refresh Live Services

Photos, PDF, print layout — run `/edition-print` in a separate terminal after publishing.

```bash
pm2 restart mags-bot
```
Discord Mags picks up updated production log and Supermemory canon.

## Step 4.5: Update Newsroom Memory

Update `docs/mags-corliss/NEWSROOM_MEMORY.md`:
- New canon established
- Character continuity
- Coverage notes for future editions

## Step 5: Post-Supplemental Ingest

Supplementals handle their own ingest — a lighter version of `/post-publish` with only the steps that apply.

**5a. Wiki ingest (PRIMARY)**
```bash
node scripts/ingestEditionWiki.js editions/supplemental_{topic_slug}_c{XX}.txt --apply
```
Per-entity records to bay-tribune. Log entity count.

**5b. Edition text ingest (BACKUP)**
```bash
node scripts/ingestEdition.js editions/supplemental_{topic_slug}_c{XX}.txt
```
Full text to bay-tribune. Log doc IDs.

**5c. Coverage ratings**
```bash
node scripts/rateEditionCoverage.js editions/supplemental_{topic_slug}_c{XX}.txt --apply
```
Per-domain ratings to sheet. A food piece affects CULTURE. A civic deep dive affects CIVIC. Every published piece feeds back.

**5d. Citizen cards refresh**
```bash
node scripts/buildCitizenCards.js
```
Citizens who appeared get updated profiles in world-data.

**5e. Citizen + business intake to sheets (NOT WIRED — needs engine session)**
New citizens and businesses from the supplemental need direct sheet writes to Simulation_Ledger and Business sheet. Same gap as post-publish Step 5.

**5f. Update newsroom memory**
Update `docs/mags-corliss/NEWSROOM_MEMORY.md` with new canon established, character continuity, coverage notes.

---

## File Locations

| File | Purpose |
|------|---------|
| `editions/SUPPLEMENTAL_TEMPLATE.md` | Formatting conventions |
| `output/supplemental-briefs/` | Topic briefs per supplemental |
| `editions/supplemental_*.txt` | Published supplementals |

## Where This Sits

Runs after `/write-edition` and `/post-publish` are complete. Supplementals extend coverage of the current cycle — same world, different angle. Can run multiple times per cycle.

The full 24-reporter roster is available (voice files at `docs/media/voices/`). Supplementals develop the bench — default to reporters with fewer edition appearances.

Full chain: `/run-cycle` → `/city-hall-prep` → `/city-hall` → `/sift` → `/write-edition` → `/post-publish` → `/edition-print` → then supplementals, dispatches, podcasts as needed
| `editions/special_edition_*.txt` | Non-cycle-tied specials |
