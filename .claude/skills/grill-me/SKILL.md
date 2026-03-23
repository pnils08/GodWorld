---
name: grill-me
description: Force deep interrogation of a plan before any code gets written.
effort: medium
---

# /grill-me — Discovery Before Building

**Purpose:** Force deep interrogation of a plan before any code gets written. Multiple sessions have been burned building the wrong thing because we didn't ask enough questions first.

---

## What To Do

Interview the user relentlessly about every aspect of their plan until you reach a shared understanding. Use a design tree methodology — explore dependencies and branches systematically.

**Rules:**
1. Do NOT propose solutions until the interview is complete.
2. Ask 16-50+ questions depending on complexity.
3. Cover: inputs, outputs, dependencies, failure modes, edge cases, what "done" looks like, what happens if it doesn't work.
4. Push back on assumptions. Ask "why" at least three times on the core idea.
5. When you think you understand, summarize the plan back to the user in plain English. If they say yes, THEN propose implementation.

**When the user says `/grill-me`:** Start immediately. No preamble. First question.
