---
name: dispatch
description: Immersive scene piece — one reporter, one location, one moment. Editions report, supplementals explain, dispatches immerse.
effort: high
disable-model-invocation: true
argument-hint: "[scene description]"
---

# /dispatch — Scene Dispatch Production

## Usage
`/dispatch [scene]`
- Produces a single immersive article — one reporter embedded in one moment
- No analysis, no multi-angle coverage. You're *there*.
- Third publication format alongside editions and supplementals

## What a Dispatch Is

A dispatch is a scene piece. One reporter. One location. One moment in time. The reader is standing in the room.

Maria Keen at Heinold's when Horn's homer clears the wall and the whole bar loses its mind. Carmen riding shotgun with the OARI co-responder at 2am in D3 when the first call comes in. P Slayer in the bleachers during the streak, surrounded by fans who are scared to believe. Jordan Velez at Baylight watching the foundation crew pour concrete at dawn.

Editions report what happened. Supplementals explain what it means. Dispatches put you inside it.

## What a Dispatch Is NOT

- Not a profile piece (that's a supplemental)
- Not multi-source reporting (that's an edition article)
- Not analysis or opinion (that's a column)
- Not a scene *described*. A scene *inhabited*.

The difference: "The bar erupted when Horn's ball cleared the fence" is reporting. "The guy next to me spilled his beer on my jacket and neither of us cared" is a dispatch.

## Rules
- **One reporter only.** Pick the right one for the scene.
- **One location only.** Name it. Ground it. The reader can smell it.
- **One moment only.** Not "a day at the cafe." A specific 20 minutes.
- **Present tense energy.** Even if written in past tense, it reads like you're there now.
- **Citizen verification.** Every named person checked against ledger, truesource, bay-tribune, world-data. No exceptions.
- **World summary is your context.** Read `output/world_summary_c{XX}.md` — weather, mood, what's happening in the city. The dispatch lives in the same world as the edition.
- **No calendar dates.** Natural time references only.
- **Get user approval** on the scene concept and reporter before writing.

## Reporter Selection Guide

Match the reporter to the scene's emotional register:

| Reporter | Best for | Voice |
|----------|----------|-------|
| Maria Keen | Neighborhood texture, food, daily life | Warm, sensory, lived-in |
| Carmen Delaine | Civic moments, institutional scenes | Direct, observational, precise |
| P Slayer | Fan experiences, sports atmosphere | Personal, emotional, conscience |
| Jordan Velez | Business/development scenes, power spaces | Clean, analytical, present |
| Hal Richmond | Historical moments, legacy scenes | Atmospheric, literary, patient |
| Jax Caldera | Accountability moments, tension scenes | Sharp, restless, skeptical |
| Selena Cruz | Faith, community gatherings | Intimate, respectful, grounded |
| Sharon Okafor | Lifestyle, social scenes | Vivid, curious, contemporary |
| Kai Marston | Music, nightlife, arts scenes | Rhythmic, insider, electric |

---

## Step 0: Scene Concept

If the user provided a scene description, use it. If not, propose 2-3 scene concepts based on:
- Current cycle storylines (read `output/world_summary_c{XX}.md`)
- Active story arcs
- Locations that haven't been featured
- Moments that the edition mentioned but didn't inhabit

Present to the user:
- **Scene:** What's happening, where, when
- **Reporter:** Who's writing it and why
- **Citizens:** Who might appear (check against ledger)
- **Mood:** What the scene feels like

**Wait for user approval before proceeding.**

---

## Step 1: Scene Brief

Write a brief for the reporter at `output/reporters/{reporter}/c{XX}_dispatch_brief.md`:

```markdown
# Dispatch Brief — {reporter name}
## Cycle {XX}

### Scene
{One paragraph: location, moment, what's happening}

### You Are Here
{Sensory grounding: time of day, weather from world summary, sounds, smells, light}

### Citizens Present
{Each citizen with POPID, age, neighborhood, occupation, why they're in this scene}
{Canon history from bay-tribune for each — what do we already know about them?}

### What Just Happened
{The event or moment that makes this scene worth writing — the homer, the first call, the vote}

### What You're Watching For
{The human detail. Not the event itself — the reaction. The spilled beer. The held breath.}

### Tone
{One line: the emotional register of this piece}
```

---

## Step 2: Write the Dispatch

Launch the reporter agent with the brief. The agent writes to `output/reporters/{reporter}/articles/c{XX}_dispatch_{slug}.md`.

**Agent instructions (append to brief):**
- You are writing a dispatch. You are IN the scene, not observing from outside.
- 600-1000 words. No more. Dispatches are tight.
- Lead with a sensory detail, not a fact.
- One location. Don't leave the room.
- Name at least 2 citizens. They're people, not sources.
- End on an image, not a summary.
- No section headers. No byline mid-text. One continuous piece.

---

## Step 3: Editorial Review

Read the dispatch. Check:
- [ ] Does it feel like you're there?
- [ ] Is it one location, one moment?
- [ ] Are all citizen names verified?
- [ ] Does the ending land on an image?
- [ ] Is it under 1000 words?
- [ ] No calendar dates, no cycle references, no engine language?

If it needs revision, edit directly or re-brief the agent with specific notes.

---

## Step 4: File and Log

1. **Final article** stays at `output/reporters/{reporter}/articles/c{XX}_dispatch_{slug}.md`
2. **Append to production log** (`output/production_log_edition_c{XX}.md`):
   ```markdown
   ## Dispatch: {scene title}
   - Reporter: {name}
   - Location: {place}
   - Citizens: {names}
   - Filed: {filename}
   ```
3. **Print pipeline** — dispatches go through `/edition-print` like everything else

---

## Step 5: Post-Publish (same as edition/supplemental)

- Coverage ratings if applicable
- Wiki ingest: `node scripts/ingestEditionWiki.js`
- Canon notes to bay-tribune if new citizens or locations established
- Update NOTES_TO_SELF if the dispatch surfaced something worth tracking

---

## Examples of Good Dispatch Scenes

- Heinold's First and Last Chance during Game 14 of the streak
- The OARI co-responder van on its first overnight shift in D3
- Baylight construction site at 5:45am, before the crew arrives
- Westside Cafe on the morning Beverly Hayes' check arrives
- Lake Merritt at sunset during First Friday in October
- The press box when Vinnie Keane steps to the plate for the last time
- Fruitvale BART platform at 7:15am on a CBA vote day
