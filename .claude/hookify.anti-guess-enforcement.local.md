---
name: anti-guess-enforcement
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: .+
---

**ANTI-GUESS GATE (identity.md §Anti-Guess Rules).**

Before producing any factual claim about this codebase:
1. Cite the source — file path + line, tool call + result, or "I haven't checked yet."
2. Banned from factual claims about repo state: "probably," "likely," "I think," "should be," "I believe."
3. "I don't know — checking" is the correct response to uncertainty. Not a plausible answer.

Failure pattern to block: Mike asks → plausible answer produced → Mike corrects → repeat 4x. Verify first, answer second. Every turn.
