---
name: dispatch
description: Immersive scene piece — one reporter, one location, one moment. Editions report, supplementals explain, dispatches immerse.
version: "1.1"
updated: 2026-04-26
tags: [media, active]
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
- **Citizen verification via MCP.** `lookup_citizen(name)` for citizens, `get_roster("as")` for A's players. For business / faith-org / cultural-figure context when the dispatch touches those domains, use `lookup_business` / `lookup_faith_org` / `lookup_cultural` (returns the structured wd-domain card). Full tool inventory: [[../../../docs/SUPERMEMORY|SUPERMEMORY]] §Search/save matrix. Read `docs/media/citizen_selection.md` for full criteria. No exceptions.
- **Read the brief, don't exhaust it.** The brief lists citizens available in the scene. The dispatch uses only the ones that serve the moment — usually 2-3, not all of them. Don't turn a dispatch into a roll call. Some citizens in the brief are there for color; some don't make the final piece.
- **Follow brief template for structure.** `docs/media/brief_template.md` — dispatch briefs are different from article briefs but citizen handling, canon rules, and verification standards are the same.
- **World summary is your context.** Read `output/world_summary_c{XX}.md` — weather, mood, what's happening in the city. The dispatch lives in the same world as the edition.
- **No calendar dates.** Natural time references only.
- **Get user approval** on the scene concept and reporter before writing.
- **Memory Fence (Phase 40.6 Layer 2).** Scene briefs assembled in Step 1 pull recalled citizen/canon context that the reporter agent reads. Wrap recalled excerpts via `require('/root/GodWorld/lib/memoryFence').wrap(text, 'bay-tribune')` before embedding. Full convention: [[SUPERMEMORY]] §Memory Fence.

## Reporter Selection Guide

Match the reporter to the scene's emotional register. Dispatches develop the bench — like supplementals, they're a chance for reporters who don't get frequent cycle pulse assignments. When multiple reporters could fit a scene, default to the one with fewer recent bylines.

| Reporter | Best for | Voice |
|----------|----------|-------|
| Maria Keen | Neighborhood texture, food, daily life | Warm, sensory, lived-in |
| Carmen Delaine | Civic moments, institutional scenes | Direct, observational, precise |
| P Slayer | Fan experiences, sports atmosphere | Personal, emotional, conscience |
| Jordan Velez | Business/development scenes, power spaces | Clean, analytical, present |
| Hal Richmond | Historical moments, legacy scenes | Atmospheric, literary, patient |
| Jax Caldera | Accountability moments, tension scenes | Sharp, restless, skeptical |
| Tanya Cruz | Sideline, behind-the-scenes, real-time dispatches | Intimate, immediate |
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
3. **Print pipeline** — dispatches go through `/edition-print --type dispatch` (after Step 4.5)

---

## Step 4.5: Compile to `.txt`

The reporter `.md` is intermediate. The `.txt` is canon. Compile per [[EDITION_PIPELINE]] §Published `.txt` Format Contract — Bay Tribune masthead + 5 structural sections (HEADER / BODY / NAMES INDEX / CITIZEN USAGE LOG / BUSINESSES NAMED / ARTICLE TABLE).

**Output:** `editions/cycle_pulse_dispatch_<cycle>_<slug>.txt`

- Body: the dispatch (one location, one moment)
- Article Table: single row (`<slug> | <reporter> | DISPATCH | <word count>`)
- Masthead `<TYPE>=DISPATCH`, descriptor = scene title

Slug rule: 1–3 words, lowercase, underscore-separated (e.g., `temescal_47th_dawn`). Editorial pick at authoring time. Once published, immutable.

Names Index, Citizen Usage Log, Businesses Named populated from the citizens/businesses cited in the body. Pure-atmosphere dispatches may emit empty NAMES INDEX / BUSINESSES NAMED — section headers always present, content lines may be zero.

`Y<n>C<m>` math: `n = floor((cycle-1) / 52) + 1`, `m = ((cycle-1) % 52) + 1`. No month names.

---

## Step 5: Post-Dispatch Pipeline

After Step 4.5 the `.txt` is on disk. Two skills converge here, run in parallel:

```
/post-publish --type dispatch --cycle <XX> --source editions/cycle_pulse_dispatch_<XX>_<slug>.txt
/edition-print --type dispatch --cycle <XX> --source editions/cycle_pulse_dispatch_<XX>_<slug>.txt
```

`/post-publish --type dispatch` handles canon ingest (bay-tribune wiki + text), citizen card refresh, newsroom memory update, production log finalize, mags-bot restart. Per-substep verification gates per the [[../post-publish/SKILL|post-publish]] matrix; the dispatch row of that matrix governs which substeps run (coverage ratings C93-gated, skip by default).

`/edition-print --type dispatch` handles DJ art direction (1–3 photos), PDF render, Drive upload.

**Trigger condition (T11):** Run `/edition-print` for dispatches at **editorial discretion** — invoke when the scene warrants a visual asset (a Heinold's-during-game-14 frame, a waterfront dusk, a Coliseum tunnel after a milestone). Skip when the dispatch is voice-only or the scene doesn't add image-layer signal. Default: invoke unless explicitly skipped.

**S188 photo-pipeline status:** `/edition-print` is currently edition-only for the photo step (DJ-direction pipeline rebuilt S188 — djDirect.js bundles edition+sift+world_summary; non-edition types await bundler extension). Dispatches will route through `/edition-print` for PDF + Drive but the photo step bails on missing `dj_direction.json`. Post-T11 follow-up will extend djDirect.js to handle dispatch source files.

Both skills append to the same dispatch section in `output/production_log_edition_c{XX}.md` with inline Supermemory doc IDs for direct query next cycle.

---

## Examples of Good Dispatch Scenes

- Heinold's First and Last Chance during Game 14 of the streak
- The OARI co-responder van on its first overnight shift in D3
- Baylight construction site at 5:45am, before the crew arrives
- Westside Cafe on the morning Beverly Hayes' check arrives
- Lake Merritt at sunset during First Friday in October
- The press box when Vinnie Keane steps to the plate for the last time
- Fruitvale BART platform at 7:15am on a CBA vote day

---

## Where This Sits

Runs within the current cycle, typically after `/write-edition` and `/post-publish` are complete. Dispatches extend coverage — same world, one scene. Can run multiple times per cycle.

Full chain: `/run-cycle` → `/city-hall-prep` → `/city-hall` → `/sift` → `/write-edition` → `/post-publish` → `/edition-print` → then supplementals, dispatches, podcasts as needed
