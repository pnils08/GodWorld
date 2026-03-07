---
name: cycle-review
description: Post-Rhea editorial quality gate. 3-pass review — structural, factual (defer to Rhea), editorial. Catches voice drift, genre bleed, tonal inconsistency, and narrative quality issues that data verification misses.
---

# /cycle-review — Edition Quality Gate

## Usage
`/cycle-review` — Run after Rhea verification, before publication approval.

Requires: A compiled edition file in `editions/` or pasted into the prompt.

## What This Is NOT

This is NOT Rhea. Rhea verifies facts — names, votes, records, engine language, canon compliance.
This skill checks **editorial quality** — does the edition read like a newspaper, not a data dump?

## Pass 1: Structural Scan

Quick checks on format and completeness. Flag issues, don't block on them.

### 1.1 Article Length Balance
- Read every article in the edition
- Flag any article under 200 words (too thin) or over 1200 words (too long for a section piece)
- Flag if one desk's output is 3x longer than another desk's (imbalance)

### 1.2 Names Index Completeness
- Every article must have a `Names Index:` footer
- Every name in the Names Index must appear in the article body
- Every quoted citizen in the article body should appear in the Names Index
- Flag orphan names (in index but not in body) and missing names (quoted but not indexed)

### 1.3 Headline Quality
- Headlines should be specific, not generic ("Council Votes on Transit" is weak; "Council Greenlights $230M Fruitvale Hub in 6-3 Vote" is strong)
- Flag headlines that could apply to any city or any cycle (no Oakland specificity)
- Flag headlines that are questions (except Jax Caldera — questions are his format)

### 1.4 Section Inventory
Check that the edition contains all expected sections:
- Civic Affairs (Carmen Delaine + civic reporters)
- Sports (P Slayer, Anthony, Hal Richmond)
- Culture / Community (Maria Keen + culture reporters)
- Business Ticker (Jordan Velez)
- Chicago Bureau (Selena Grant, Talia Finch)
- Letters to the Editor (citizen voices)
- Continuity Notes (storylines tracking)

Flag any missing section. A missing section is CRITICAL unless the cycle explicitly had nothing for that beat.

## Pass 2: Factual (Defer to Rhea)

Skip this pass if Rhea has already run. If Rhea hasn't run, flag that as CRITICAL — this skill does not replace data verification.

If Rhea's report is available at `output/rhea_report_c{XX}.txt`, read it and include her score in the final summary.

## Pass 3: Editorial Quality

This is the core value of this skill. Read every article and evaluate:

### 3.1 Voice Consistency
- Each reporter has a documented voice. Check against `schemas/bay_tribune_roster.json`:
  - P Slayer: Intense, urgent, declarative. Short sentences. Fan-first.
  - Anthony: Analytical, measured, statistical. Long-form breakdowns.
  - Hal Richmond: Historical, reverent, connecting past to present.
  - Carmen Delaine: Authoritative civic reporter. Process-focused.
  - Maria Keen: Warm, literary, neighborhood texture.
  - Jordan Velez: Sharp, numbers-driven, terse.
  - Selena Grant / Talia Finch: Chicago bureau — local Chicago voice.
- Flag articles where the reporter's voice sounds generic or interchangeable with another reporter
- Flag articles where a reporter sounds like a different reporter (P Slayer writing like Anthony = drift)

### 3.2 Genre Discipline
- **Beat reporting** (civic, sports scores, business ticker): Should be factual, attributed, structured. Flag opinion language ("This is what Oakland needs") in beat articles.
- **Columns** (P Slayer game reactions, Hal's historical pieces, Jax's accountability): Opinion voice is expected. Flag if a column reads like a press release instead.
- **Letters**: Should sound like distinct citizens, not like reporters. Flag letters that use journalist vocabulary or read like mini-articles.
- **Culture/Community**: Atmospheric allowed, but still needs specifics. Flag pure vibes with no concrete details.

### 3.3 Sentence Variety
- Flag articles where 5+ consecutive sentences start with the same word or pattern
- Flag articles where every sentence is the same length (monotone rhythm)
- Flag excessive use of "According to..." or "Sources say..." (more than 2 per article)

### 3.4 Emotional Range
- The edition as a whole should have tonal variety — not every article should be urgent, not every article should be reflective
- Flag if 4+ articles share the same dominant tone (all urgent, all celebratory, all somber)
- Letters should show a range of citizen perspectives, not unanimous agreement

### 3.5 Opening Quality
- First paragraph of each article should hook the reader with a specific scene, person, or moment
- Flag articles that open with abstractions ("The city faces challenges...") or engine-like summaries ("This cycle saw several developments...")
- Good openings name a person, describe a place, or start with action

### 3.6 Closing Quality
- Articles should end with forward motion — a question, a next step, a person looking ahead
- Flag articles that just stop or end with a generic summary ("Time will tell")
- Flag articles that end identically to how they opened (circular without purpose)

## Output Format

```
CYCLE REVIEW — Edition {XX}
Date: {date}
Rhea Score: {XX}/100 (or "Rhea not yet run — CRITICAL")

PASS 1: STRUCTURAL
- [OK/FLAG] Article lengths: {summary}
- [OK/FLAG] Names Index: {summary}
- [OK/FLAG] Headlines: {summary}
- [OK/FLAG] Section inventory: {summary}

PASS 3: EDITORIAL
Voice Drift: {count} articles flagged
Genre Bleed: {count} articles flagged
Sentence Variety: {count} articles flagged
Emotional Range: [OK/FLAG]
Opening Quality: {count} weak openings
Closing Quality: {count} weak closings

DETAILS:
{numbered list of specific findings with article title and reporter}

EDITORIAL SCORE: {A/B/C/D/F}
A = Publication ready, strong editorial quality
B = Minor issues, publishable with notes for next edition
C = Several issues, recommend desk rewrites before publication
D = Significant quality problems, hold for revision
F = Not publishable — structural or editorial failure

RECOMMENDATION: {PUBLISH / PUBLISH WITH NOTES / REVISE / HOLD}
```

## When to Use

- After Rhea runs and before the USER APPROVAL GATE
- On any edition where voice quality or tonal consistency is a concern
- After desk agent updates or new reporter additions (regression check)
- Optionally on supplementals (lighter check — skip section inventory)
