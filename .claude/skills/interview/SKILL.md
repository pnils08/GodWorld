---
name: interview
description: Capture-only — transcript becomes canon. Articles framed off interview transcripts move downstream to /write-edition (next cycle, via /sift) or /write-supplemental (any time, sports-desk subagent dispatch against the canon transcript).
version: "2.0"
updated: 2026-05-24
tags: [media, active]
effort: medium
disable-model-invocation: true
argument-hint: "[mode] [subject]"
---

## What's new in v2.0 (2026-05-24, S233 pipeline.30)

**Capture-only architecture.** v1.3 bundled transcript capture (Steps 0-3) with article generation (Steps 4-7) into one run. Same-session same-author production of transcript + article meant the article didn't represent a separate cognitive act (the S212 generation-vs-evaluation asymmetry collapsed). The S230 C94 Paulson run made the failure visible: all five Hal Richmond questions were written by Mags from EIC seat (G-I3), the 1,762-word "After A Parade" article was written by Mags in Hal voice attempt under Hal byline (G-I4), and "two files, one cognition" surfaced at artifact-comparison level (G-I5 — Mike caught at "So the interview transcript is the article? Huh.").

**What changed:**
- Steps 0-3 unchanged in purpose: production log entry + gap-log open + brief + live interview with sports-desk dispatch per turn.
- **Step 3 Mode 2 dispatch-per-turn made explicit + non-optional** with worked example (G-I3 text). Dispatch failure (quota kill per S231 G-S2 rule) stops the skill; no EIC-seat fallback.
- **Step 4 (article write) removed entirely** (G-I2 + G-I4 + G-I5 structural close).
- **Step 4.5 reduced to transcript-only `.txt` compile** (renumbered Step 4). Only one `.txt` artifact emits.
- Steps 5-7 cover transcript only (Mara audit, user gate, save).
- **Step 8 invokes `/post-publish` against transcript-only canon; `/edition-print` dropped entirely** (transcripts carry no photos — G-I13).
- **Step 0 now opens the gap log file as live-append target** (G-I8 text discipline).
- Filename retains `-transcript` suffix to preserve S230 canon artifact at `editions/cycle_pulse_interview-transcript_94_let_walks.txt` + the `<TYPE>=INTERVIEW-TRANSCRIPT` masthead (stewardship call per advisor S233 — no rename).

**Downstream:** articles framed off interview transcripts come from `/write-edition` (next cycle, via `/sift` surfacing the transcript as canon source) or `/write-supplemental` (any time, sports-desk subagent dispatch against the transcript). The article-generation cognitive act lives at the dispatch terminal, not at EIC.

**Companion row:** `pipeline.34` (gap-log path convention harmonization across 5 heavy skills — /sift / /write-edition / /post-publish / /edition-print / /interview / /write-supplemental) split out per advisor pass S233; **SETTLED S248** — canonical convention `output/production_log_c<XX>_interview_<subject-slug>_gaps.md` (`production_log_c{XX}_<skill>_<slug>_gaps.md`, slug-infixed since interviews can run multiple times per cycle).

**Source:** `output/production_log_interview_c94_gaps.md` (13 entries G-I1→G-I13, triage at bottom) + JOURNAL Entry 188 (S230 — "the plan was the work") + plan [[../../../docs/plans/2026-05-24-pipeline-30-interview-rewrite]].

---

# /interview — Interview Production (capture-only)

## Usage
`/interview [mode] [subject]`
- Modes: `voice` (agent-to-voice), `paulson` (agent-to-user as GM Paulson)
- Subject: who's being interviewed

## What an Interview Is

An interview has a theme — a reason this conversation is happening now. A reporter asks questions grounded in canon. The subject answers from their identity and recent decisions. Questions build on answers. The transcript becomes canon. Articles framed off the transcript are written downstream — `/write-edition` (next cycle, surfaced via `/sift` from the canon transcript) or `/write-supplemental` (any time, sports-desk subagent dispatch against the canon transcript). **This skill captures; downstream skills frame.**

Interviews are different from dispatches and supplementals:
- Dispatches put you IN a scene
- Supplementals EXPLAIN a topic with multi-angle coverage
- Interviews CAPTURE a conversation — the subject speaks, the reader (and downstream reporters) listen

**Interviews can spawn world-altering moments.** A Mayor revealing she's considering vetoing a vote. Paulson hinting at a trade. A DA confirming an investigation. What gets said in an interview becomes canon.

## Two Modes

### Mode 1: Voice Interview (Agent-to-Voice)

Reporter agent interviews a civic voice agent. Both are agents. Used for:
- Mayor, Chief, council members, DA, project directors
- When you want structured civic canon deepening
- When a voice has unresolved tension from city-hall decisions

Setup is like city-hall — voice gets questions but not preset answers. Voice responds from their IDENTITY.md and recent decisions. They can go off-script — offer a revelation, push back on the question, change the subject.

Target length: 1200-1800 word transcript. (Articles off this transcript get their own length targets at their downstream skill — `/write-supplemental` typically 800-1800 words per its spec; `/write-edition` per-desk-slot lengths per its spec.)

### Mode 2: Paulson Interview (Agent-to-Mike)

Reporter agent interviews Mike in character as GM Paulson. The reporter asks, Mike responds in character, reporter follows up. Runs in terminal or via Discord bot. Agents don't know Mike is Mike — they're interviewing GM Paulson.

This is where deep canon enters the world. Mike's answers can establish facts nobody else could — trades, stadium plans, front office tensions, feelings about specific players. What Paulson says becomes canon.

No length target. The conversation shapes itself. Mike decides when it ends.

## Rules

- **Every theme has a reason.** "Interview the Mayor" is not a theme. "Mayor, OARI just went live and Montez is raising routing concerns — what's your response?" is a theme.
- **Questions are scripted, follow-ups are organic.** 4-6 prepared questions per interview. Reporter uses them as starting points. They follow up based on answers.
- **Subjects don't get preset answers.** Voice agents respond from their identity and recent canon. Mike responds in character.
- **Off-script is allowed.** The subject can refuse a question, pivot, reveal something unprompted. That's where canon is made.
- **Citizen verification via MCP.** Anyone named in the interview checked via `lookup_citizen` (citizens) or `get_roster("as")` (A's players). For business / faith / cultural / neighborhood context when the interview touches those domains, use `lookup_business` / `lookup_faith_org` / `lookup_cultural` / `get_neighborhood_state`. Full tool inventory: [[../../../docs/SUPERMEMORY|SUPERMEMORY]] §Search/save matrix. Read `docs/media/citizen_selection.md`.
- **No calendar dates.** Cycles and natural time references only.
- **Transcript saved incrementally during Paulson mode.** If interrupted, nothing's lost.
- **User approval gate before the transcript is published to canon.** Mike reviews the transcript before /post-publish ingests it to bay-tribune.

## Prerequisites

- `output/world_summary_c{XX}.md` — current cycle context
- `output/production_log_c{XX}.md` — what was covered in the edition (unified per S230 governance.14 convention; falls back to `production_log_edition_c{XX}.md` legacy path if unified absent)
- `output/production_log_c{XX}.md` §/city-hall section — recent civic decisions (for voice interviews; legacy fallback `production_log_city_hall_c{XX}.md` if the unified log lacks a civic section)

## Step 0: Production Log + Open Gap Log

**A. Append to production log** at `output/production_log_c{XX}.md` (or `output/production_log_edition_c{XX}.md` legacy fallback):

```markdown
## Interview: {subject} ({mode})
**Started:** {timestamp}
**Reporter:** {name}
**Subject:** {subject + mode}
**Theme:** {one-line theme}
**Status:** IN PROGRESS
```

**B. Open gap-log file as live-append target** at `output/production_log_c<XX>_interview_<subject-slug>_gaps.md` (pipeline.34 convention `production_log_c{XX}_<skill>_<slug>_gaps.md`, settled S248 — slug-infixed since interviews can run multiple times per cycle). The file opens with §Run summary frontmatter from [[../../../docs/plans/GAP_LOG_TEMPLATE]] and stays open through Steps 1-8 as a live-append target.

```markdown
# Production Log — /interview Skill Run, C{XX} ({subject})

**Cycle:** {XX} | **Subject:** {subject} (POP-{NNNNN}) | **Slug:** {subject-slug} | **Reporter (intended):** {reporter} (POP-{NNNNN}) | **Session:** {SXXX} | **Run date:** {YYYY-MM-DD} | **Skill version run:** v2.0

## Gap entries (live append per S230 G-I8 discipline)

<!-- append G-I{N} entries here as friction emerges; do NOT hold in conversation context -->
```

Appending live (not at skill close) prevents context-held knowledge from being lost on compaction or session end. This was the G-I8 failure mode in S230 — gap log filed at close, several issues lost on the trip there.

## Step 1: Theme + Reporter Selection

Define the theme — why this interview, why now. Read the world summary, production logs, newsroom memory for tension points.

Select reporter by beat fit:
- Civic/policy voices → Carmen Delaine, Luis Navarro, Jax Caldera
- Paulson (sports) → Anthony Raines, P Slayer, Hal Richmond
- Community figures → Maria Keen, Sharon Okafor

Bench development applies — default to underused reporters when fit allows.

### Engine archetype-to-journalist match (T4.5)

For Mode 1 (Voice Interview) where the subject is a verified citizen, **call `matchCitizenToJournalist_(archetype, neighborhood, domain)`** from `utilities/rosterLookup.js:907` to get an engine-validated reporter suggestion. The function exists pre-T4.5 — it scores journalists against the citizen's archetype themes (Connector / Watcher / Striver / Anchor / Catalyst / Caretaker / Drifter), neighborhood weighting (CIVIC vs CULTURE neighborhoods), and story-domain affinity, returning `{ journalist, interviewAngle, voiceGuidance, confidence }`.

**Skill action:**

1. Look up the subject citizen's archetype + neighborhood from `Simulation_Ledger` (or `Generic_Citizens` / `Cultural_Ledger` / `Faith_Organizations` / `Chicago_Citizens` per their canonical home).
2. Call `matchCitizenToJournalist_(archetype, neighborhood, domain)` where `domain` is the interview's editorial domain (CIVIC / CULTURE / HEALTH / etc.).
3. Add the result to the briefing as `interviewerCandidate` field:
   ```json
   {
     "interviewerCandidate": {
       "journalist": "Dr. Lila Mezran",
       "interviewAngle": "human interest / who they look after",
       "voiceGuidance": "Calm, clinical, exact",
       "confidence": "high"
     }
   }
   ```
4. **Surface to Mike** alongside the manual beat-fit reporter recommendation. Mike picks the reporter; engine's `interviewerCandidate` is a transparency signal, not a pre-fill.

**For Mode 2 (Paulson interview)** the function still runs — Mike's archetype is `Anchor` and his neighborhood / domain context drives the match — but the editorial decision is more constrained (sports beat reporters are the canonical Paulson interlocutors). Use as confirmation, not direction.

**No archetype available?** When the subject's archetype field is empty, fall through to the beat-fit selection above. Engine signal is best-effort, not blocking.

**Show Mike theme + reporter (manual + engine `interviewerCandidate` if populated). Wait for approval.**

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

**Dispatch-per-turn is non-optional (G-I3 — non-negotiable since v2.0).** Mags writes NOTHING in reporter voice. Every Reporter question + every follow-up MUST come from a Task tool dispatch to the matched sports-desk subagent (Hal Richmond / Anthony Raines / P Slayer — per Step 1 reporter selection). The dispatch IS the architecture being tested; substituting EIC-seat writing collapses generator and editor into one cognition (the S230 G-I3/G-I4/G-I5 contamination failure mode) and the skill's purpose is defeated.

**Worked example — dispatch shape per turn:**

```
Task(
  subagent_type="sports-desk",
  description="Hal Q1 — let-walks lead-in",
  prompt="You are Hal Richmond. Read the brief at
    output/interviews/c{XX}_paulson_{slug}_brief.md. The transcript so far
    is at output/interviews/c{XX}_paulson_{slug}_transcript.md (empty for
    Q1). Write Q1 in Hal's voice grounded in the brief's first question
    prompt. Return only the question text — Mags will append to transcript."
)
```

**Quota-coupling clause (G-S2 — S231 MEMORY rule).** If a dispatch returns the session-limit signature (`status=completed` + `<result>` carrying "session limit" string + `<total_tokens>0</total_tokens>`), **STOP the skill immediately**. Do NOT fall back to EIC-seat question-writing. Log the infra failure to the gap log (G-S2 detection signature per MEMORY rule) and end the skill with disposition `INCOMPLETE — quota`; resume after the reset window.

**Run sequence:**
- Dispatch reporter agent for Q1 (per worked example above) — capture the returned question
- Append the question to transcript at `output/interviews/c{XX}_paulson_{slug}_transcript.md`
- Mike responds in character as Paulson; append response to transcript
- Mags reads the answer and dispatches reporter again for Q2 or follow-up (one Task per turn)
- Incremental save after each exchange
- Mike ends when natural
- Reporter doesn't know Mike is Mike — they're interviewing GM Paulson

## Step 4: Compile Transcript to .txt

The transcript `.md` is intermediate. The transcript `.txt` is canon. Compile per [[../../../docs/EDITION_PIPELINE|EDITION_PIPELINE]] §Published `.txt` Format Contract — Bay Tribune masthead + 5 structural sections (HEADER / BODY / NAMES INDEX / CITIZEN USAGE LOG / BUSINESSES NAMED / ARTICLE TABLE).

One `.txt` artifact emits:

**Transcript `.txt`** — `editions/cycle_pulse_interview-transcript_<cycle>_<slug>.txt`
- Body: the full transcript verbatim
- Article Table: single row (`<slug> | <reporter> | INTERVIEW-TRANSCRIPT | <word count>`)
- Masthead `<TYPE>=INTERVIEW-TRANSCRIPT`, descriptor = "Subject / Topic"

Slug rule: 1–3 words, lowercase, underscore-separated. Editorial pick at authoring time. Once published, immutable. Replicated identically across filename, masthead descriptor, sift queries, MCP search, Mara, packets, production log, bay-tribune metadata.

Names Index, Citizen Usage Log, Businesses Named populated from the citizens/businesses cited in the body — separate sections after the body, never inline (S172 metadata-leak rule).

`Y<n>C<m>` math: `n = floor((cycle-1) / 52) + 1`, `m = ((cycle-1) % 52) + 1`. Cycle 92 = `Y2C40`. No month names.

**Filename stewardship note (v2.0):** filename retains the `-transcript` suffix from v1.3 to preserve the canon S230 artifact at `editions/cycle_pulse_interview-transcript_94_let_walks.txt` + the `<TYPE>=INTERVIEW-TRANSCRIPT` masthead. The legacy bare `cycle_pulse_interview_<cycle>_<slug>.txt` (article path) is retired by v2.0 — articles framed off transcripts live under `cycle_pulse_supplemental_<cycle>_<slug>.txt` (write-supplemental output) or in the next edition's sports section (write-edition output).

## Step 5: Mara Audit (Paulson mode, optional for Voice)

**Paulson interviews always go to Mara** — they establish heavy canon (trades, org decisions, dynasty moves). Mara catches continuity issues before publication.

**Voice interviews go to Mara when** they establish initiative state changes, council positions, faction dynamics, or legal framework.

Upload the transcript `.txt` (canon — not the `.md` intermediate) to Drive for Mara:
```bash
node scripts/saveToDrive.js editions/cycle_pulse_interview-transcript_<cycle>_<slug>.txt mara
```

Mara audits the transcript `.txt` (same format she audits everywhere else), returns corrections via Mike.

## Step 6: User Review Gate

**STOP. Nothing gets published until Mike approves.**

Show:
- Transcript `.txt` — `editions/cycle_pulse_interview-transcript_<cycle>_<slug>.txt` (canonical artifact)
- Canon established: [list new facts, decisions, revelations]
- Mara corrections (if applicable)

Mike approves or adjusts. **If Mike spoke it to a reporter, it's canon.** No public/private split — the full transcript goes to bay-tribune. **The transcript IS the canon record.** Articles framed off this transcript come later via downstream skills (`/write-edition` next cycle via `/sift`, or `/write-supplemental` any time via sports-desk dispatch against the transcript).

## Step 7: Save

Transcript intermediate (`.md`) and canonical (`.txt`) are both on disk:

1. **Transcript intermediate:** `output/interviews/c{XX}_{subject_slug}_transcript.md`
2. **Transcript canon `.txt`:** `editions/cycle_pulse_interview-transcript_{XX}_{slug}.txt`

## Step 8: Post-Interview Pipeline

After Step 7 the transcript `.txt` is on disk. Run `/post-publish` against the transcript-only canon:

```
/post-publish --type interview --cycle <XX> --source editions/cycle_pulse_interview-transcript_<XX>_<slug>.txt
```

`/post-publish --type interview` handles canon ingest (bay-tribune wiki + transcript text — one doc ID, not two), citizen card refresh, newsroom memory update, production log finalization, mags-bot restart. Per-substep verification gates per the [[../post-publish/SKILL|post-publish]] matrix; the interview row of that matrix governs which substeps run.

**No `/edition-print` invocation.** Transcripts carry no photos — the canon artifact is text-only. Photos belong to downstream framed articles (`/write-edition` next cycle or `/write-supplemental` any time) which run their own `/edition-print` against the framed article's `.txt`.

`/post-publish` appends to the same production log entry for this interview, with inline Supermemory doc IDs for direct query next cycle.

## Gap log (S212 — see [[../../../docs/plans/GAP_LOG_TEMPLATE]])

Gap log opens at **Step 0** as live-append target (see Step 0 §B above); friction-during-skill goes there before it's lost to context. At skill close, append a §Disposition summary + close the file with patterns cited. /interview is a heavy skill at the **media generator terminal**; sidecar gap logs catch inefficiency the skill couldn't catch while running. Interviews can spawn world-altering canon — friction here is high-stakes.

**Output path:** `output/production_log_c<XX>_interview_<subject-slug>_gaps.md` (pipeline.34 convention `production_log_c{XX}_<skill>_<slug>_gaps.md`, settled S248 — slug-infixed since interviews can run multiple times per cycle).

**Gap prefix:** **G-I\*** (e.g., G-I1).

**Common categories for /interview gaps:**
- archetype-match (interviewerCandidate routing per `matchCitizenToJournalist_`)
- canon-creation-risk (transcript becomes canon — fabrication, drift, voice violations)
- dispatch-architecture (Step 3 Mode 2 dispatch-per-turn discipline; quota-coupling per G-S2)
- pipeline-step-coverage (Step 8 /post-publish per-type matrix interview row)

**Discipline:** write the gap log even on clean runs. File a ROLLOUT row in `pipeline.<n>` pointing at the gap log per ADR-0005 §How to add work. Interviews benefit especially from this discipline because canon stakes are higher than other heavy skills.

## Where This Sits

Runs within the current cycle, after `/write-edition` and `/post-publish`. Interviews extend coverage — a single conversation, deep signal.

**Capture-only since v2.0 (S233 pipeline.30):** interviews establish canon as transcripts; articles framed off transcripts come downstream via `/write-edition` (next cycle's sports section, surfaced via `/sift` from the canon transcript) or `/write-supplemental` (any time, sports-desk subagent dispatch against the canon transcript). The article-generation cognitive act lives at the dispatch terminal, not at EIC.

Full chain: `/run-cycle` → `/city-hall-prep` → `/city-hall` → `/sift` → `/write-edition` → `/post-publish` → `/edition-print` → then supplementals, dispatches, interviews, podcasts as needed → next cycle's `/sift` surfaces interview transcripts as canon source for downstream coverage.

## Examples of Good Interview Themes

**Voice mode:**
- Mayor Santana on OARI's first real calls — what's working, what isn't
- Chief Montez on the routing concerns he raised in C91
- Rivers and Tran both interviewed separately about D2 expansion (two interviews, contrasting takes)
- DA Dane when a legal dimension emerges from civic decisions

**Paulson mode:**
- Anthony Raines interviews Paulson after a big trade rumor
- P Slayer asks Paulson about Keane's farewell season pressure
- Luis Navarro asks Paulson about the Baylight arena feasibility timeline
- Hal Richmond asks Paulson about dynasty-window decisions with long tails

## What This Skill Does NOT Do

- **Write articles.** Articles framed off interview transcripts come from `/write-edition` (next cycle via `/sift`) or `/write-supplemental` (sports-desk dispatch against the canon transcript). The S230 Mags-in-Hal article failure (G-I4) is why this skill is capture-only since v2.0.
- **Substitute EIC-seat writing for sports-desk dispatch in Mode 2.** Every question + follow-up MUST come from a Task tool dispatch. Dispatch dies (quota kill per G-S2), the skill stops; no fallback writing from EIC seat. This is the non-negotiable G-I3 rule.
- **Render PDFs or invoke `/edition-print`.** Transcript is canonical text; photos and PDF render belong to downstream framed articles, which run their own `/edition-print` against the framed article's `.txt`.
- **Interview citizens or players** — that's a dispatch or supplemental with quotes, not an interview
- **Run without a theme** — every interview has a reason
- **Publish without user approval** — Paulson interviews especially need the review gate
- **Force answers** — subjects can refuse, pivot, or go off-script. That's the point.
