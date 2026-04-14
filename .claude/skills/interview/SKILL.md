---
name: interview
description: Produce an interview — reporter agent interviews a civic voice or Mike as GM Paulson. Transcript + published article in one run. Interviews can spawn world-altering canon.
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

Launch both agents. Structure:
1. Reporter reads IDENTITY.md + brief
2. Voice reads their IDENTITY.md + recent decisions (no preset answers)
3. Reporter asks Q1, voice responds
4. Reporter follows up or moves to Q2
5. Continue until questions exhausted or conversation has natural ending
6. Transcript saved to `output/interviews/c{XX}_{subject_slug}_transcript.md`

### Mode 2: Paulson Interview

Launch reporter agent in conversation mode. Mike responds as Paulson in terminal or Discord.

- Reporter asks Q1
- Mike responds as Paulson
- Reporter follows up or moves to next scripted question
- Incremental save after each exchange to `output/interviews/c{XX}_paulson_{slug}_transcript.md`
- Mike ends when natural
- Reporter doesn't know Mike is Mike

## Step 4: Write the Article

Reporter takes the transcript and writes the published piece:
- Setup: why this interview, context
- Key exchanges with quotes
- Moments that matter — revelations, pushback, refusals
- Closing — what the reader takes away

Save to `output/reporters/{reporter}/articles/c{XX}_interview_{subject_slug}.md`

Target: 800-1200 words (Voice mode). Mike-determined for Paulson mode.

## Step 5: User Review Gate

**STOP. Nothing gets published until Mike approves.**

Show:
- Transcript
- Published article
- Canon established: [list new facts, decisions, revelations]

Mike approves or adjusts. For Paulson interviews, this is where Mike locks what becomes canon — some things said may be kept private, not published.

## Step 6: Save + Upload

1. **Transcript:** `output/interviews/c{XX}_{subject_slug}_transcript.md`
2. **Article:** `output/reporters/{reporter}/articles/c{XX}_interview_{subject_slug}.md`
3. **Drive upload:**
   ```bash
   node scripts/saveToDrive.js output/reporters/{reporter}/articles/c{XX}_interview_{subject_slug}.md interview
   ```
   Drive destination: https://drive.google.com/drive/folders/1aK9wOSBmglS5YdgnwdQMic1q4PF_pEji

## Step 7: Post-Interview Ingest

Same lighter pattern as dispatch and supplemental.

**7a. Wiki ingest (PRIMARY)**
```bash
node scripts/ingestEditionWiki.js output/reporters/{reporter}/articles/c{XX}_interview_{subject_slug}.md --apply
```

**7b. Article text ingest**
```bash
node scripts/ingestEdition.js output/reporters/{reporter}/articles/c{XX}_interview_{subject_slug}.md
```

**7c. Transcript ingest (separate canon record)**
Transcript goes to bay-tribune as a distinct record — readers can find the full conversation alongside the article.

**7d. Coverage ratings (if applicable)**
If the interview establishes civic canon that affects a domain.

**7e. Citizen cards refresh**
```bash
node scripts/buildCitizenCards.js
```

**7f. Update newsroom memory**
- New canon established (especially from Paulson interviews)
- Character continuity — what the subject revealed about themselves
- Active arcs — what opened, closed, shifted
- Coverage notes — this interview may carry into next cycle's sift

**7g. Update production log**
Add to the interview section: transcript path, article path, canon established, Drive link. Key details carry forward for next cycle.

**7h. Refresh Discord bot**
```bash
pm2 restart mags-bot
```

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
