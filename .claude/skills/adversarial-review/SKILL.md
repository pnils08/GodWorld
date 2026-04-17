---
name: adversarial-review
description: Adversarial edition review — actively tries to break the compiled edition before publish. Probes contradictions, unsourced claims, narrative gaps, and framing that only holds under one reading. Complements reward-hacking scans (39.8) which watch for evaluator gaming. This watches for content problems that normal review misses.
version: "1.0"
updated: 2026-04-17
tags: [media, active]
effort: medium
argument-hint: "[cycle-number]"
---

# /adversarial-review — Break the Edition

## Purpose

Normal review asks "is this good?" Adversarial review asks "how could this be wrong?"

Run this against a compiled edition after Step 3 (compile) and before Step 3.5 (capability review). It catches problems that survive three rounds of happy-path reading: contradictions between articles, claims no ledger source backs, civic stats that only hold under one framing, citizen quotes readable multiple ways, and narrative gaps the paper pretends don't exist.

Source: Fulton, "Agent Skills: The Cheat Codes for Claude Code" (April 2026) — adversarial review mode catches issues that pass normal review.

## When to Run

- **Before every publish** — after compile, before capability review
- **After major revisions** — when reporters rewrite after Rhea/Mara feedback
- **On demand** — when something feels off but you can't name it

## Inputs

1. **Compiled edition** — `editions/cycle_pulse_edition_{XX}.txt`
2. **Engine audit JSON** — `output/engine_audit_c${XX}.json` (for cross-checking claims against data)
3. **Previous edition** — `editions/cycle_pulse_edition_{XX-1}.txt` (for contradiction detection)

## The Five Probes

Run all five against the compiled edition. Each probe is a different adversarial lens.

### Probe 1: Cross-Article Contradictions

Read every article in the edition. For each factual claim (names, numbers, dates, roles, outcomes), check whether any other article in the same edition contradicts it.

**What to look for:**
- Same citizen described with different roles in two articles
- Approval ratings that don't match between civic and front page
- Initiative status described differently (e.g., "passed" in civic, "under review" in letters)
- Timeline conflicts (event happened "two cycles ago" in one article, "last cycle" in another)
- Score/stat conflicts between sports articles

**Output per finding:**
```
CONTRADICTION: [article A headline] says [claim A]. [article B headline] says [claim B].
  Severity: HIGH/MED
  Fix: [which is correct, or both need checking]
```

### Probe 2: Unsourced Claims

For every quantitative claim, approval rating, population stat, economic figure, or specific outcome:
- Can it be traced to the engine audit JSON?
- Can it be traced to a citizen lookup or canon search?
- Is it plausible given the simulation state?

Flag anything that reads like a reporter invented a number. Common failure modes:
- "85% of residents support X" — where does 85% come from?
- Revenue projections not in any ledger
- Crime stats that don't match Crime_Metrics
- Population numbers that don't match the ledger count

**Output per finding:**
```
UNSOURCED: [article headline] claims "[exact claim]".
  Source check: Not found in engine audit / ledger / canon.
  Severity: HIGH (if it could be fabricated) / MED (if plausible but unverified)
```

### Probe 3: One-Framing Civic Stats

For civic stories with numbers (vote counts, approval ratings, budget figures):
- Does the framing hold if you reverse the emphasis?
- Are there alternative readings the article doesn't acknowledge?
- Does it cherry-pick which council members to quote?

Example: "Council voted 6-3 to approve" could also be framed as "one-third of council opposed." If the article only tells the majority story without acknowledging the minority position, flag it.

**Output per finding:**
```
ONE-FRAMING: [article headline] presents [stat] as [framing].
  Alternative reading: [opposite framing that is equally valid]
  Severity: MED
  Fix: Acknowledge the alternative or justify the chosen frame.
```

### Probe 4: Ambiguous Citizen Quotes

Read every quoted citizen. Could the quote be read to mean something the reporter didn't intend?

**What to look for:**
- Quotes that could be read as sarcastic when the article reads them as sincere
- Quotes taken out of context (the preceding narrative frames the quote differently than the words suggest)
- Citizens quoted on topics they wouldn't plausibly know about (Port worker opining on NBA financing details)
- Same citizen quoted in two articles saying things that don't align

**Output per finding:**
```
AMBIGUOUS QUOTE: [citizen name] in [article headline] says "[quote]".
  Alternative reading: [how it could be misread]
  Severity: LOW/MED
```

### Probe 5: Narrative Gaps

What stories is this edition NOT telling that citizens would notice?

- Read the engine audit. Is there a high-severity ailment that got zero coverage?
- Read the previous edition. Did it promise a follow-up that this edition doesn't deliver?
- Are there civic decisions that affect specific neighborhoods with no neighborhood-level reporting?
- Is there a citizen who appeared in 3+ recent editions who's absent here without explanation?

**Output per finding:**
```
GAP: [what's missing]
  Evidence: [engine audit pattern / previous edition promise / citizen history]
  Severity: HIGH (if it's a live engine ailment) / MED (if it's a dropped thread) / LOW (if texture)
```

## Output Format

```
ADVERSARIAL REVIEW — Edition {XX}
==================================

SUMMARY: {total findings} findings ({high} HIGH, {med} MED, {low} LOW)
RECOMMENDATION: CLEAN / REVISE / HALT

CONTRADICTIONS ({count})
---
[findings]

UNSOURCED CLAIMS ({count})
---
[findings]

ONE-FRAMING ({count})
---
[findings]

AMBIGUOUS QUOTES ({count})
---
[findings]

NARRATIVE GAPS ({count})
---
[findings]
```

**Recommendation logic:**
- **CLEAN** — 0 HIGH findings. MED/LOW are logged but don't block.
- **REVISE** — 1-2 HIGH findings that are fixable (contradictions, unsourced claims).
- **HALT** — 3+ HIGH findings, or any finding that indicates systematic fabrication.

## What This Is NOT

- Not a style review — don't comment on prose quality, word choice, or voice.
- Not a capability review — that's 39.1, runs separately.
- Not a sourcing check — that's Rhea's lane.
- Not a completeness check — that's Mara's lane.

This is the devil's advocate. Its job is to find ways the edition could be wrong that the other reviewers are designed to miss.

## Pipeline Position

```
/sift → /write-edition Step 1-2 (launch reporters, collect)
  → Step 3 (compile)
  → /adversarial-review ← YOU ARE HERE
  → Step 3.5 (capability review)
  → Step 4 (Rhea) → Step 4.1 (cycle-review) → Step 5 (Mara)
  → Step 5.5 (Final Arbiter)
  → Step 6 (publish)
```

## Success Criteria

- Found at least one real problem in the edition (not a style nit)
- Every finding cites specific text from the edition and a specific reason it's wrong
- Recommendation is justified by the findings, not by vibes
- Ran in under 5 minutes
