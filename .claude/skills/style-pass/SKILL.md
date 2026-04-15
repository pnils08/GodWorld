---
name: style-pass
description: On-demand per-article stylistic review — sentence variety, emotional range, opening/closing quality. Invoked by /sift or the editor when narrative voice needs a closer look. NOT part of the three-lane reviewer chain (Phase 39.4, S147).
effort: low
---

# /style-pass — Per-Article Stylistic Review

## Usage
`/style-pass {article-path-or-headline}` — Run on a single article.
`/style-pass --section civic` — Run on all articles in a section.
`/style-pass --edition 91` — Run on every article in an edition.

Output is advisory flags only. No verdict, no gate on publication.

## What This Is
This skill holds the stylistic checks that used to live in /cycle-review Pass 3.3–3.6.
Phase 39.4 narrowed cycle-review to the Reasoning Lane (internal consistency,
evidence-based deduction, argument quality). Stylistic flags don't belong in a
reviewer lane — they're editorial suggestions, not failures.

## Checks

### 1. Sentence Variety
- Flag articles where 5+ consecutive sentences start with the same word or pattern.
- Flag articles where every sentence is the same length (monotone rhythm).
- Flag excessive "According to…" / "Sources say…" (> 2 per article).

### 2. Emotional Range
- Across the edition: flag if 4+ articles share the same dominant tone.
- Within letters: flag unanimous agreement — citizens should disagree.

### 3. Opening Quality
- First paragraph should hook with a scene, person, or moment.
- Flag openings that start with abstractions or cycle-summary language.
- Good openings name a person, describe a place, or start with action.

### 4. Closing Quality
- Articles should end with forward motion — a question, next step, or person looking ahead.
- Flag articles that just stop or end with generic summary ("Time will tell").
- Flag circular closings that repeat the opening without adding.

## Output
Plain-text advisory list. No JSON, no score, no verdict.

```
STYLE PASS — [target]
- [article headline] — sentence variety: 6 consecutive sentences start with "The"
- [article headline] — opening: abstract ("Oakland faces…")
- [edition] — emotional range: 5 of 7 articles register as urgent
```

## When to Use
- Sift requests it on a specific article before compile.
- Editor notices voice drift and wants a focused review.
- Regression check after reporter voice updates.
- Never as a publication gate — style-pass does not block.

## What This Is NOT
- NOT a reviewer lane. The three lanes are Rhea (sourcing), cycle-review (reasoning), Mara (result validity).
- NOT a replacement for cycle-review. Cycle-review now handles reasoning only.
- NOT a scoring skill. No /100, no A/B/C/D/F grade.
