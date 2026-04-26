---
name: interview
description: Produce an interview — reporter agent interviews a civic voice or Mike as GM Paulson. Transcript + published article in one run. Interviews can spawn world-altering canon.
version: "1.3"
updated: 2026-04-26
tags: [media, active]
effort: high
disable-model-invocation: true
argument-hint: "[mode] [subject]"
---

# /interview — Interview Production

## Usage
`/interview [mode] [subject]`
- Modes: `voice` (agent-to-voice), `paulson` (agent-to-user as GM Paulson)
- Subject: who's being interviewed

## What an Interview Is

An interview has a theme — a reason this conversation is happening now. A reporter asks questions grounded in canon. The subject answers from their identity and recent decisions. Questions build on answers. The transcript becomes canon. The published article frames the conversation for readers.

Interviews are different from dispatches and supplementals:
- Dispatches put you IN a scene
- Supplementals EXPLAIN a topic with multi-angle coverage
- Interviews CAPTURE a conversation — the subject speaks, the reader listens

**Interviews can spawn world-altering moments.** A Mayor revealing she's considering vetoing a vote. Paulson hinting at a trade. A DA confirming an investigation. What gets said in an interview becomes canon.

## Two Modes

### Mode 1: Voice Interview (Agent-to-Voice)

Reporter agent interviews a civic voice agent. Both are agents. Used for:
- Mayor, Chief, council members, DA, project directors
- When you want structured civic canon deepening
- When a voice has unresolved tension from city-hall decisions

Setup is like city-hall — voice gets questions but not preset answers. Voice responds from their IDENTITY.md and recent decisions. They can go off-script — offer a revelation, push back on the question, change the subject.

Target length: 1200-1800 word transcript, 800-1200 word published article.

### Mode 2: Paulson Interview (Agent-to-Mike)

Reporter agent interviews Mike in character as GM Paulson. The reporter asks, Mike responds in character, reporter follows up. Runs in terminal or via Discord bot. Agents don't know Mike is Mike — they're interviewing GM Paulson.

This is where deep canon enters the world. Mike's answers can establish facts nobody else could — trades, stadium plans, front office tensions, feelings about specific players. What Paulson says becomes canon.

No length target. The conversation shapes itself. Mike decides when it ends.

## Rules

- **Every theme has a reason.** "Interview the Mayor" is not a theme. "Mayor, OARI just went live and Montez is raising routing concerns — what's your response?" is a theme.
- **Questions are scripted, follow-ups are organic.** 4-6 prepared questions per interview. Reporter uses them as starting points. They follow up based on answers.
- **Subjects don't get preset answers.** Voice agents respond from their identity and recent canon. Mike responds in character.
- **Off-script is allowed.** The subject can refuse a question, pivot, reveal something unprompted. That's where canon is made.
- **Citizen verification via MCP.** Anyone named in the interview checked via `lookup_citizen` (citizens) or `get_roster("as")` (A's players). Read `docs/media/citizen_selection.md`.
- **Follow brief template for the article.** `docs/media/brief_template.md` — interview articles are structured differently than standard briefs but citizen handling and canon rules apply.
- **No calendar dates.** Cycles and natural time references only.
- **Transcript saved incrementally during Paulson mode.** If interrupted, nothing's lost.
- **User approval gate before publishing.** Mike reviews the article before it goes to canon.

## Prerequisites

- `output/world_summary_c{XX}.md` — current cycle context
- `output/production_log_edition_c{XX}.md` — what was covered in the edition
- `output/production_log_city_hall_c{XX}.md` — recent civic decisions (for voice interviews)

## Step 0: Production Log

Append to `output/production_log_edition_c{XX}.md`:

```markdown
## Interview: {subject} ({mode})
**Started:** {timestamp}
**Reporter:** {name}
**Subject:** {subject + mode}
**Theme:** {one-line theme}
**Status:** IN PROGRESS
```

## Step 1: Theme + Reporter Selection

Define the theme — why this interview, why now. Read the world summary, production logs, newsroom memory for tension points.

Select reporter by beat fit:
- Civic/policy voices → Carmen Delaine, Luis Navarro, Jax Caldera
- Paulson (sports) → Anthony, P Slayer, Hal Richmond
- Community figures → Maria Keen, Sharon Okafor

Bench development applies — default to underused reporters when fit allows.

**Show Mike theme + reporter. Wait for approval.**

## Step 2: Prepare Questions

Write 4-6 scripted questions grounded in canon. Save to `output/interviews/c{XX}_{subject_slug}_brief.md`:

```markdown
# Interview Brief — {subject}
## Cycle {XX} | {mode}

### Theme
{one paragraph: why this interview, what's at stake}

### Subject Context (for reporter)
{identity file path, recent decisions/appearances from production logs, canon history from bay-tribune}

### Citizens Verified
{Any citizens that may come up — MCP lookup results}

### Questions (scripted — follow-ups organic)
1. {Question grounded in canon or recent event}
2. {Question}
3. {Question}
4. {Question}
5. {Question}
6. {Question}

### Follow-up Guidance
- If subject reveals X, follow with Y
- If subject deflects on Z, acknowledge and move on
- The subject CAN go off-script. Capture it.
```

**Show Mike the questions. Adjust before launching.**

## Step 3: Run the Interview

### Mode 1: Voice Interview

Mags mediates — she is the reporter's brain between exchanges. Sequential turns, one agent call per exchange.

1. Read the interview brief and reporter IDENTITY.md
2. Ask Q1 — write it in the reporter's voice, append to transcript file
3. Launch voice agent with just: their IDENTITY.md + the brief theme + the current transcript up to Q1
4. Voice responds. Append their answer to the transcript.
5. Read the answer. Decide: follow up or move to Q2?
   - If the answer opened a thread worth pulling, write a follow-up
   - If it was deflective or complete, move to next scripted question
6. Repeat until questions exhausted or conversation has natural ending
7. Final transcript at `output/interviews/c{XX}_{subject_slug}_transcript.md`

**Note:** True autonomous agent-to-agent interviews (both agents passing a transcript back and forth without Mags mediating) is a future build. For now Mags controls the pacing and follow-ups.

**Voice agents can go off-script** — they read their identity and recent canon but get no preset answers. They can refuse a question, pivot, reveal something unprompted. Capture everything they say.

### Mode 2: Paulson Interview

Runs in terminal. Mike responds as Paulson. (Discord bot interview mode is future work.)

- Launch reporter agent with their IDENTITY.md + brief
- Reporter asks Q1
- Mike responds in character as Paulson
- Mags captures the exchange to transcript
- Reporter reads the answer and follows up or moves to next scripted question
- Incremental save after each exchange to `output/interviews/c{XX}_paulson_{slug}_transcript.md`
- Mike ends when natural
- Reporter doesn't know Mike is Mike — they're interviewing GM Paulson

## Step 4: Write the Article

Reporter takes the transcript and writes the published piece:
- Setup: why this interview, context
- Key exchanges with quotes
- Moments that matter — revelations, pushback, refusals
- Closing — what the reader takes away

Save to `output/reporters/{reporter}/articles/c{XX}_interview_{subject_slug}.md`

Target: 800-1200 words (Voice mode). Mike-determined for Paulson mode.

## Step 4.5: Compile to `.txt`

The reporter `.md` is intermediate. The `.txt` is canon. Compile per [[EDITION_PIPELINE]] §Published `.txt` Format Contract — Bay Tribune masthead + 5 structural sections (HEADER / BODY / NAMES INDEX / CITIZEN USAGE LOG / BUSINESSES NAMED / ARTICLE TABLE).

Two `.txt` artifacts emit:

1. **Article `.txt`** — `editions/cycle_pulse_interview_<cycle>_<slug>.txt`
   - Body: the published article
   - Article Table: single row (`<slug> | <reporter> | INTERVIEW | <word count>`)
   - Masthead `<TYPE>=INTERVIEW`, descriptor = "Subject / Topic"

2. **Transcript `.txt`** — `editions/cycle_pulse_interview-transcript_<cycle>_<slug>.txt`
   - Body: the full transcript
   - Article Table: single row (`<slug> | <reporter> | INTERVIEW-TRANSCRIPT | <word count>`)
   - Masthead identical to the article except `<TYPE>=INTERVIEW-TRANSCRIPT`

Slug rule: 1–3 words, lowercase, underscore-separated. Editorial pick at authoring time. Once published, immutable. Replicated identically across filename, masthead descriptor, sift queries, MCP search, Mara, packets, production log, bay-tribune metadata.

Names Index, Citizen Usage Log, Businesses Named populated from the citizens/businesses cited in the body — separate sections after the body, never inline (S172 metadata-leak rule).

`Y<n>C<m>` math: `n = floor((cycle-1) / 52) + 1`, `m = ((cycle-1) % 52) + 1`. Cycle 92 = `Y2C40`. No month names.

## Step 5: Mara Audit (Paulson mode, optional for Voice)

**Paulson interviews always go to Mara** — they establish heavy canon (trades, org decisions, dynasty moves). Mara catches continuity issues before publication.

**Voice interviews go to Mara when** they establish initiative state changes, council positions, faction dynamics, or legal framework.

Upload the `.txt` artifacts (canon — not the `.md` intermediates) to Drive for Mara:
```bash
node scripts/saveToDrive.js editions/cycle_pulse_interview_<cycle>_<slug>.txt mara
node scripts/saveToDrive.js editions/cycle_pulse_interview-transcript_<cycle>_<slug>.txt mara
```

Mara audits the `.txt` (same format she audits everywhere else), returns corrections via Mike.

## Step 6: User Review Gate

**STOP. Nothing gets published until Mike approves.**

Show:
- Article `.txt` — `editions/cycle_pulse_interview_<cycle>_<slug>.txt` (canonical artifact)
- Transcript `.txt` — `editions/cycle_pulse_interview-transcript_<cycle>_<slug>.txt` (full record)
- Canon established: [list new facts, decisions, revelations]
- Mara corrections (if applicable)

Mike approves or adjusts. **If Mike spoke it to a reporter, it's canon.** No public/private split — the full transcript goes to bay-tribune. The article is the polished frame; the transcript is the record.

## Step 7: Save

Reporter `.md` files (intermediates) and the canonical `.txt` files (Step 4.5) are both on disk:

1. **Transcript intermediate:** `output/interviews/c{XX}_{subject_slug}_transcript.md`
2. **Article intermediate:** `output/reporters/{reporter}/articles/c{XX}_interview_{subject_slug}.md`
3. **Article canon `.txt`:** `editions/cycle_pulse_interview_{XX}_{slug}.txt`
4. **Transcript canon `.txt`:** `editions/cycle_pulse_interview-transcript_{XX}_{slug}.txt`

PDF rendering + Drive upload moves to `/edition-print --type interview --cycle <XX>` (runs in parallel with Step 8).

## Step 8: Post-Interview Pipeline

After Step 7 the `.txt` artifacts are on disk. Two skills converge here, run in parallel:

```
/post-publish --type interview --cycle <XX> --source editions/cycle_pulse_interview_<XX>_<slug>.txt
/edition-print --type interview --cycle <XX> --source editions/cycle_pulse_interview_<XX>_<slug>.txt
```

`/post-publish --type interview` handles canon ingest (bay-tribune wiki + article text + transcript text), citizen card refresh, newsroom memory update, production log finalization, mags-bot restart. Per-substep verification gates per the [[../post-publish/SKILL|post-publish]] matrix; the interview row of that matrix governs which substeps run.

`/edition-print --type interview` handles DJ art direction (1–3 photos), PDF render, Drive upload.

Both skills append to the same production log entry for this interview, with inline Supermemory doc IDs for direct query next cycle.

## Where This Sits

Runs within the current cycle, after `/write-edition` and `/post-publish`. Interviews extend coverage — a single conversation, deep signal.

Full chain: `/run-cycle` → `/city-hall-prep` → `/city-hall` → `/sift` → `/write-edition` → `/post-publish` → `/edition-print` → then supplementals, dispatches, interviews, podcasts as needed

## Examples of Good Interview Themes

**Voice mode:**
- Mayor Santana on OARI's first real calls — what's working, what isn't
- Chief Montez on the routing concerns he raised in C91
- Rivers and Tran both interviewed separately about D2 expansion (two interviews, contrasting takes)
- DA Dane when a legal dimension emerges from civic decisions

**Paulson mode:**
- Anthony interviews Paulson after a big trade rumor
- P Slayer asks Paulson about Keane's farewell season pressure
- Luis Navarro asks Paulson about the Baylight arena feasibility timeline
- Hal Richmond asks Paulson about dynasty-window decisions with long tails

## What This Skill Does NOT Do

- **Interview citizens or players** — that's a dispatch or supplemental with quotes, not an interview
- **Run without a theme** — every interview has a reason
- **Publish without user approval** — Paulson interviews especially need the review gate
- **Force answers** — subjects can refuse, pivot, or go off-script. That's the point.
